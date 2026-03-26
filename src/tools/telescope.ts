/**
 * Laravel Telescope integration tools.
 *
 * Covers install, enable/disable, entry browsing for all 12 watcher types,
 * individual entry detail, watcher status, clear, and prune.
 *
 * Entry data is read directly from the telescope_entries database table
 * using the same connection auto-detection as db-client.ts (.env DB_* keys).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

// ── Types ─────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface DbCfg {
  driver: 'mysql' | 'mariadb' | 'pgsql' | 'sqlite';
  host: string; port: number;
  database: string; username: string; password: string;
}

// ── .env helpers ──────────────────────────────────────────────────────────────

function parseEnv(cwd: string): Record<string, string> {
  const out: Record<string, string> = {};
  const p = path.join(cwd, '.env');
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

function setEnv(cwd: string, key: string, value: string): void {
  const p = path.join(cwd, '.env');
  if (!fs.existsSync(p)) throw new Error(`.env not found in ${cwd}`);
  let content = fs.readFileSync(p, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  content = regex.test(content) ? content.replace(regex, `${key}=${value}`) : content.trimEnd() + `\n${key}=${value}\n`;
  fs.writeFileSync(p, content, 'utf8');
}

function getEnv(cwd: string, key: string): string | null {
  const m = fs.existsSync(path.join(cwd, '.env'))
    ? fs.readFileSync(path.join(cwd, '.env'), 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
    : null;
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : null;
}

// ── DB connection ─────────────────────────────────────────────────────────────

function dbCfgFromEnv(cwd: string): DbCfg {
  const env = parseEnv(cwd);
  const d = (env.DB_CONNECTION ?? 'mysql') as DbCfg['driver'];
  const defaultPort = d === 'pgsql' ? 5432 : d === 'sqlite' ? 0 : 3306;
  return {
    driver: d,
    host:     env.DB_HOST     ?? '127.0.0.1',
    port:     parseInt(env.DB_PORT ?? String(defaultPort), 10) || defaultPort,
    database: env.DB_DATABASE ?? '',
    username: env.DB_USERNAME ?? 'root',
    password: env.DB_PASSWORD ?? '',
  };
}

async function dbQuery(cfg: DbCfg, sql: string, params: unknown[] = []): Promise<Row[]> {
  switch (cfg.driver) {
    case 'mysql':
    case 'mariadb': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
      const m = require('mysql2/promise') as any;
      const conn = await m.createConnection({ host: cfg.host, port: cfg.port, database: cfg.database || undefined, user: cfg.username, password: cfg.password, connectTimeout: 10000 });
      try { const [rows] = await conn.execute(sql, params); return (Array.isArray(rows) ? rows : [rows]) as Row[]; }
      finally { await conn.end(); }
    }
    case 'pgsql': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
      const { Client } = require('pg') as any;
      const client = new Client({ host: cfg.host, port: cfg.port, database: cfg.database || undefined, user: cfg.username, password: cfg.password, connectionTimeoutMillis: 10000 });
      await client.connect();
      try { const r = await client.query(sql, params as unknown[]); return r.rows as Row[]; }
      finally { await client.end(); }
    }
    case 'sqlite': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
      const DB = require('better-sqlite3') as any;
      const db = new DB(cfg.database);
      try { return db.prepare(sql).all() as Row[]; }
      finally { db.close(); }
    }
    default: throw new Error(`Unsupported driver: ${cfg.driver}`);
  }
}

// ── Shared entry query ────────────────────────────────────────────────────────

const PLACEHOLDER = (driver: DbCfg['driver'], n: number) => driver === 'pgsql' ? `$${n}` : '?';

async function queryEntries(cwd: string, type: string, limit: number, extraWhere = ''): Promise<Row[]> {
  const cfg = dbCfgFromEnv(cwd);
  const p1 = PLACEHOLDER(cfg.driver, 1);
  const p2 = PLACEHOLDER(cfg.driver, 2);
  const sql = `SELECT uuid, batch_id, family_hash, type, content, created_at
               FROM telescope_entries
               WHERE type = ${p1} ${extraWhere}
               ORDER BY created_at DESC
               LIMIT ${p2}`;
  return dbQuery(cfg, sql, [type, limit]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContent(row: Row): any {
  try { return typeof row.content === 'string' ? JSON.parse(row.content) : row.content; }
  catch { return {}; }
}

// ── Watcher list ──────────────────────────────────────────────────────────────

const WATCHERS: Array<{ key: string; label: string; type: string; envVar?: string }> = [
  { key: 'requests',       label: 'Requests',       type: 'request',        envVar: undefined },
  { key: 'queries',        label: 'Queries',         type: 'query',          envVar: 'TELESCOPE_QUERY_WATCHER' },
  { key: 'exceptions',     label: 'Exceptions',      type: 'exception',      envVar: undefined },
  { key: 'logs',           label: 'Logs',            type: 'log',            envVar: 'TELESCOPE_LOG_WATCHER' },
  { key: 'commands',       label: 'Commands',        type: 'command',        envVar: 'TELESCOPE_COMMAND_WATCHER' },
  { key: 'jobs',           label: 'Jobs',            type: 'job',            envVar: undefined },
  { key: 'models',         label: 'Models',          type: 'model',          envVar: 'TELESCOPE_MODEL_WATCHER' },
  { key: 'events',         label: 'Events',          type: 'event',          envVar: undefined },
  { key: 'mail',           label: 'Mail',            type: 'mail',           envVar: undefined },
  { key: 'notifications',  label: 'Notifications',   type: 'notification',   envVar: undefined },
  { key: 'schedule',       label: 'Scheduled Tasks', type: 'scheduled_task', envVar: undefined },
  { key: 'cache',          label: 'Cache',           type: 'cache',          envVar: 'TELESCOPE_CACHE_WATCHER' },
  { key: 'redis',          label: 'Redis',           type: 'redis',          envVar: undefined },
  { key: 'gates',          label: 'Gates',           type: 'gate',           envVar: 'TELESCOPE_GATE_WATCHER' },
  { key: 'views',          label: 'Views',           type: 'view',           envVar: undefined },
  { key: 'dumps',          label: 'Dumps',           type: 'dump',           envVar: undefined },
  { key: 'client_requests',label: 'HTTP Client',     type: 'client_request', envVar: undefined },
  { key: 'batches',        label: 'Batches',         type: 'batch',          envVar: undefined },
];

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerTelescopeTools(server: McpServer, runner: CliRunner): void {

  // ── Install ────────────────────────────────────────────────────────────────

  server.tool('telescope_install',
    'Install Laravel Telescope (composer require laravel/telescope --dev), publish assets, run migrations, enable in .env',
    { cwd: z.string().describe('Laravel project root directory') },
    async ({ cwd }) => {
      try {
        const lines: string[] = [];
        const req = runner.composer(['require', 'laravel/telescope', '--dev', '--no-interaction'], cwd);
        lines.push('=== composer require ===\n' + (req.stdout || req.stderr));
        if (req.exitCode !== 0) return textResult(lines.join('\n'));

        const install = runner.php(['artisan', 'telescope:install', '--no-interaction'], cwd);
        lines.push('=== telescope:install ===\n' + (install.stdout || install.stderr));

        const migrate = runner.php(['artisan', 'migrate', '--no-interaction'], cwd);
        lines.push('=== migrate ===\n' + (migrate.stdout || migrate.stderr));

        setEnv(cwd, 'TELESCOPE_ENABLED', 'true');
        lines.push('\n✓ TELESCOPE_ENABLED=true set in .env');
        lines.push('\nTelescope installed. Visit /telescope on your site to view the dashboard.');
        lines.push('Use telescope_requests, telescope_queries, telescope_exceptions etc. to read data.');
        lines.push('\n⚠  Restrict access in production via config/telescope.php gate.');
        return textResult(lines.join('\n\n'));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Enable / Disable ───────────────────────────────────────────────────────

  server.tool('telescope_enable',
    'Enable Laravel Telescope by setting TELESCOPE_ENABLED=true in .env',
    { cwd: z.string().describe('Laravel project root directory') },
    async ({ cwd }) => {
      try {
        setEnv(cwd, 'TELESCOPE_ENABLED', 'true');
        return textResult('Telescope ENABLED (TELESCOPE_ENABLED=true).\nMake requests to your site — data will be recorded in telescope_entries.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('telescope_disable',
    'Disable Laravel Telescope by setting TELESCOPE_ENABLED=false in .env',
    { cwd: z.string().describe('Laravel project root directory') },
    async ({ cwd }) => {
      try {
        setEnv(cwd, 'TELESCOPE_ENABLED', 'false');
        return textResult('Telescope DISABLED (TELESCOPE_ENABLED=false).\nExisting entries are kept. Use telescope_clear to wipe them.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Status ─────────────────────────────────────────────────────────────────

  server.tool('telescope_status',
    'Show Telescope status: installed, enabled, total entry counts per watcher type',
    { cwd: z.string().describe('Laravel project root directory') },
    async ({ cwd }) => {
      try {
        const lock = path.join(cwd, 'composer.lock');
        const installed = fs.existsSync(lock) && fs.readFileSync(lock, 'utf8').includes('laravel/telescope');
        const enabled = getEnv(cwd, 'TELESCOPE_ENABLED');
        const appEnv = getEnv(cwd, 'APP_ENV');

        let entryCounts: Row[] = [];
        if (installed) {
          try {
            const cfg = dbCfgFromEnv(cwd);
            entryCounts = await dbQuery(cfg,
              `SELECT type, COUNT(*) as count FROM telescope_entries GROUP BY type ORDER BY count DESC`);
          } catch { /* DB not yet migrated or unreachable */ }
        }

        const watchers = WATCHERS.map(w => ({
          watcher: w.label,
          env_var: w.envVar ?? '(always on)',
          enabled: w.envVar ? (getEnv(cwd, w.envVar) ?? 'true (default)') : 'true',
        }));

        return textResult(JSON.stringify({
          installed,
          TELESCOPE_ENABLED: enabled ?? '(not set — follows APP_DEBUG)',
          APP_ENV: appEnv,
          entry_counts: entryCounts,
          watchers,
        }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Watchers ───────────────────────────────────────────────────────────────

  server.tool('telescope_watchers',
    'Show or toggle individual Telescope watchers in .env (queries, logs, commands, gate, models, cache)',
    {
      cwd:     z.string().describe('Laravel project root directory'),
      queries: z.boolean().optional().describe('Toggle query watcher (TELESCOPE_QUERY_WATCHER)'),
      logs:    z.boolean().optional().describe('Toggle log watcher (TELESCOPE_LOG_WATCHER)'),
      commands:z.boolean().optional().describe('Toggle command watcher (TELESCOPE_COMMAND_WATCHER)'),
      gate:    z.boolean().optional().describe('Toggle gate watcher (TELESCOPE_GATE_WATCHER)'),
      models:  z.boolean().optional().describe('Toggle model watcher (TELESCOPE_MODEL_WATCHER)'),
      cache:   z.boolean().optional().describe('Toggle cache watcher (TELESCOPE_CACHE_WATCHER)'),
    },
    async ({ cwd, queries, logs, commands, gate, models, cache }) => {
      try {
        const changes: string[] = [];
        const map = [
          ['TELESCOPE_QUERY_WATCHER',   queries],
          ['TELESCOPE_LOG_WATCHER',     logs],
          ['TELESCOPE_COMMAND_WATCHER', commands],
          ['TELESCOPE_GATE_WATCHER',    gate],
          ['TELESCOPE_MODEL_WATCHER',   models],
          ['TELESCOPE_CACHE_WATCHER',   cache],
        ] as [string, boolean | undefined][];

        for (const [key, val] of map) {
          if (val !== undefined) { setEnv(cwd, key, String(val)); changes.push(`${key}=${val}`); }
        }

        // Show current state
        const current = map.map(([key]) => `${key}=${getEnv(cwd, key) ?? '(not set, default: true)'}`);
        const msg = changes.length > 0
          ? `Updated:\n${changes.map(c => '  • ' + c).join('\n')}\n\nCurrent state:\n${current.map(c => '  ' + c).join('\n')}`
          : `Current watcher state:\n${current.map(c => '  ' + c).join('\n')}`;
        return textResult(msg);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── HTTP Requests ──────────────────────────────────────────────────────────

  server.tool('telescope_requests',
    'Browse HTTP requests captured by Telescope. Shows method, URI, status, duration, memory, middleware.',
    {
      cwd:        z.string().describe('Laravel project root directory'),
      limit:      z.number().min(1).max(200).optional().default(20).describe('Number of entries (default: 20)'),
      status:     z.number().optional().describe('Filter by HTTP status code e.g. 500, 404'),
      slow_only:  z.boolean().optional().describe('Show only slow requests (>1000ms)'),
    },
    async ({ cwd, limit, status, slow_only }) => {
      try {
        const rows = await queryEntries(cwd, 'request', (limit ?? 20) * 3); // over-fetch to allow filtering
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !status || e.response_status === status)
          .filter(e => !slow_only || (e.duration ?? 0) > 1000)
          .slice(0, limit ?? 20);

        if (entries.length === 0) return textResult('No request entries found. Make sure Telescope is enabled and you have visited some pages.');

        const lines = entries.map((e, i) =>
          `${i + 1}. [${e.method ?? '?'}] ${e.uri ?? '?'} → ${e.response_status ?? '?'} | ${e.duration ?? '?'}ms | ${e.memory ?? '?'}\n` +
          `   uuid: ${e.uuid}  time: ${e.created_at}`
        );
        return textResult(`${entries.length} requests:\n\n${lines.join('\n')}\n\nUse telescope_entry with a uuid for full details.`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── SQL Queries ────────────────────────────────────────────────────────────

  server.tool('telescope_queries',
    'Browse database queries captured by Telescope. Supports slow_only filter for N+1 detection.',
    {
      cwd:       z.string().describe('Laravel project root directory'),
      limit:     z.number().min(1).max(200).optional().default(30).describe('Number of entries (default: 30)'),
      slow_only: z.boolean().optional().describe('Show only slow queries (above Telescope slow threshold)'),
      min_ms:    z.number().optional().describe('Show only queries slower than N ms'),
    },
    async ({ cwd, limit, slow_only, min_ms }) => {
      try {
        const rows = await queryEntries(cwd, 'query', (limit ?? 30) * 3);
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !slow_only || e.slow === true)
          .filter(e => !min_ms || (e.time ?? 0) >= min_ms)
          .slice(0, limit ?? 30);

        if (entries.length === 0) return textResult('No query entries found.');

        const lines = entries.map((e, i) =>
          `${i + 1}. ${e.slow ? '🐌 SLOW ' : ''}[${e.time ?? '?'}ms] ${e.sql ?? '?'}` +
          (Array.isArray(e.bindings) && e.bindings.length ? `\n   bindings: ${JSON.stringify(e.bindings)}` : '')
        );
        return textResult(`${entries.length} queries:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Exceptions ─────────────────────────────────────────────────────────────

  server.tool('telescope_exceptions',
    'Browse exceptions captured by Telescope with class, message, file, line, and stack trace preview.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Number of entries (default: 20)'),
    },
    async ({ cwd, limit }) => {
      try {
        const rows = await queryEntries(cwd, 'exception', limit ?? 20);
        if (rows.length === 0) return textResult('No exceptions recorded.');

        const lines = rows.map((r, i) => {
          const c = parseContent(r);
          return `${i + 1}. ${c.class ?? 'Exception'}: ${c.message ?? '?'}\n` +
                 `   at ${c.file ?? '?'}:${c.line ?? '?'}\n` +
                 `   uuid: ${r.uuid}  time: ${r.created_at}`;
        });
        return textResult(`${rows.length} exceptions:\n\n${lines.join('\n\n')}\n\nUse telescope_entry for full stack trace.`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Logs ───────────────────────────────────────────────────────────────────

  server.tool('telescope_logs',
    'Browse log entries captured by Telescope. Filter by level (emergency/alert/critical/error/warning/notice/info/debug).',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(200).optional().default(30).describe('Number of entries (default: 30)'),
      level: z.enum(['emergency','alert','critical','error','warning','notice','info','debug']).optional().describe('Filter by log level'),
    },
    async ({ cwd, limit, level }) => {
      try {
        const rows = await queryEntries(cwd, 'log', (limit ?? 30) * 2);
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !level || e.level === level)
          .slice(0, limit ?? 30);

        if (entries.length === 0) return textResult('No log entries found.');

        const lines = entries.map((e, i) =>
          `${i + 1}. [${String(e.level ?? '?').toUpperCase()}] ${e.message ?? '?'}\n   time: ${e.created_at}`
        );
        return textResult(`${entries.length} log entries:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Artisan Commands ───────────────────────────────────────────────────────

  server.tool('telescope_commands',
    'Browse Artisan commands captured by Telescope.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Number of entries (default: 20)'),
    },
    async ({ cwd, limit }) => {
      try {
        const rows = await queryEntries(cwd, 'command', limit ?? 20);
        if (rows.length === 0) return textResult('No command entries found.');

        const lines = rows.map((r, i) => {
          const c = parseContent(r);
          return `${i + 1}. ${c.command ?? '?'} → exit ${c.exit_code ?? '?'}\n   time: ${r.created_at}`;
        });
        return textResult(`${rows.length} commands:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Jobs ───────────────────────────────────────────────────────────────────

  server.tool('telescope_jobs',
    'Browse queued jobs captured by Telescope (pending, processed, failed).',
    {
      cwd:    z.string().describe('Laravel project root directory'),
      limit:  z.number().min(1).max(100).optional().default(20).describe('Number of entries (default: 20)'),
      status: z.enum(['pending','processed','failed']).optional().describe('Filter by job status'),
    },
    async ({ cwd, limit, status }) => {
      try {
        const rows = await queryEntries(cwd, 'job', (limit ?? 20) * 2);
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !status || e.status === status)
          .slice(0, limit ?? 20);

        if (entries.length === 0) return textResult('No job entries found.');

        const lines = entries.map((e, i) =>
          `${i + 1}. ${e.name ?? e.job ?? '?'} [${e.status ?? '?'}] | queue: ${e.queue ?? 'default'}\n   time: ${e.created_at}`
        );
        return textResult(`${entries.length} jobs:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Models ─────────────────────────────────────────────────────────────────

  server.tool('telescope_models',
    'Browse Eloquent model operations (created, updated, deleted) captured by Telescope.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(200).optional().default(30).describe('Number of entries (default: 30)'),
      model: z.string().optional().describe('Filter by model class name e.g. "User", "Post"'),
    },
    async ({ cwd, limit, model }) => {
      try {
        const rows = await queryEntries(cwd, 'model', (limit ?? 30) * 3);
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !model || String(e.model ?? '').includes(model))
          .slice(0, limit ?? 30);

        if (entries.length === 0) return textResult('No model entries found.');

        const lines = entries.map((e, i) =>
          `${i + 1}. ${e.model ?? '?'} #${e.key ?? '?'} [${e.action ?? '?'}]\n   time: ${e.created_at}`
        );
        return textResult(`${entries.length} model operations:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Events ─────────────────────────────────────────────────────────────────

  server.tool('telescope_events',
    'Browse dispatched events captured by Telescope.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(200).optional().default(30).describe('Number of entries (default: 30)'),
    },
    async ({ cwd, limit }) => {
      try {
        const rows = await queryEntries(cwd, 'event', limit ?? 30);
        if (rows.length === 0) return textResult('No event entries found.');

        const lines = rows.map((r, i) => {
          const c = parseContent(r);
          const listeners = Array.isArray(c.listeners) ? ` | listeners: ${c.listeners.length}` : '';
          return `${i + 1}. ${c.name ?? '?'}${listeners}\n   time: ${r.created_at}`;
        });
        return textResult(`${rows.length} events:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Mail ───────────────────────────────────────────────────────────────────

  server.tool('telescope_mail',
    'Browse emails sent and captured by Telescope.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Number of entries (default: 20)'),
    },
    async ({ cwd, limit }) => {
      try {
        const rows = await queryEntries(cwd, 'mail', limit ?? 20);
        if (rows.length === 0) return textResult('No mail entries found.');

        const lines = rows.map((r, i) => {
          const c = parseContent(r);
          const to = Array.isArray(c.to) ? c.to.map((t: Record<string,string>) => t.address ?? t).join(', ') : c.to ?? '?';
          return `${i + 1}. "${c.subject ?? '?'}" → ${to}\n   mailable: ${c.mailable ?? '?'}  time: ${r.created_at}`;
        });
        return textResult(`${rows.length} mail entries:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Scheduled Tasks ────────────────────────────────────────────────────────

  server.tool('telescope_schedule',
    'Browse scheduled task runs captured by Telescope.',
    {
      cwd:   z.string().describe('Laravel project root directory'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Number of entries (default: 20)'),
    },
    async ({ cwd, limit }) => {
      try {
        const rows = await queryEntries(cwd, 'scheduled_task', limit ?? 20);
        if (rows.length === 0) return textResult('No scheduled task entries found.');

        const lines = rows.map((r, i) => {
          const c = parseContent(r);
          return `${i + 1}. ${c.command ?? c.description ?? '?'} → ${c.exit_code === 0 ? 'OK' : `exit ${c.exit_code}`}\n   time: ${r.created_at}`;
        });
        return textResult(`${rows.length} scheduled tasks:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Cache ──────────────────────────────────────────────────────────────────

  server.tool('telescope_cache',
    'Browse cache operations (hit, miss, set, forget) captured by Telescope.',
    {
      cwd:    z.string().describe('Laravel project root directory'),
      limit:  z.number().min(1).max(200).optional().default(30).describe('Number of entries (default: 30)'),
      type:   z.enum(['hit','miss','set','forget']).optional().describe('Filter by cache operation type'),
    },
    async ({ cwd, limit, type }) => {
      try {
        const rows = await queryEntries(cwd, 'cache', (limit ?? 30) * 2);
        const entries = rows.map(r => ({ uuid: r.uuid, created_at: r.created_at, ...parseContent(r) }))
          .filter(e => !type || e.type === type)
          .slice(0, limit ?? 30);

        if (entries.length === 0) return textResult('No cache entries found.');

        const lines = entries.map((e, i) =>
          `${i + 1}. [${e.type ?? '?'}] ${e.key ?? '?'}\n   time: ${e.created_at}`
        );
        return textResult(`${entries.length} cache operations:\n\n${lines.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Single entry detail ────────────────────────────────────────────────────

  server.tool('telescope_entry',
    'Get full details for a single Telescope entry by UUID. Returns complete content including stack traces, payloads, headers, etc.',
    {
      uuid: z.string().describe('Entry UUID from any telescope_* listing tool'),
      cwd:  z.string().describe('Laravel project root directory'),
    },
    async ({ uuid, cwd }) => {
      try {
        const cfg = dbCfgFromEnv(cwd);
        const p1 = PLACEHOLDER(cfg.driver, 1);
        const rows = await dbQuery(cfg, `SELECT * FROM telescope_entries WHERE uuid = ${p1} LIMIT 1`, [uuid]);
        if (rows.length === 0) return textResult(`Entry not found: ${uuid}`);

        const row = rows[0];
        const content = parseContent(row);

        // Also fetch tags
        const p2 = PLACEHOLDER(cfg.driver, 1);
        let tags: string[] = [];
        try {
          const tagRows = await dbQuery(cfg, `SELECT tag FROM telescope_entries_tags WHERE entry_uuid = ${p2}`, [uuid]);
          tags = tagRows.map(t => String(t.tag));
        } catch { /* tags table may not exist */ }

        return textResult(JSON.stringify({ uuid, type: row.type, created_at: row.created_at, tags, ...content }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Clear & Prune ──────────────────────────────────────────────────────────

  server.tool('telescope_clear',
    'Clear all Telescope entries from the database (php artisan telescope:clear)',
    { cwd: z.string().describe('Laravel project root directory') },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'telescope:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Telescope entries cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('telescope_prune',
    'Delete old Telescope entries (php artisan telescope:prune --hours=N)',
    {
      hours: z.number().optional().describe('Delete entries older than N hours (default: 48)'),
      cwd:   z.string().describe('Laravel project root directory'),
    },
    async ({ hours, cwd }) => {
      try {
        const args = ['artisan', 'telescope:prune'];
        if (hours) args.push('--hours=' + hours);
        const result = runner.php(args, cwd);
        return textResult(result.stdout || result.stderr || 'Telescope entries pruned.');
      } catch (e) { return errorResult(e); }
    }
  );
}
