/**
 * Laravel Pulse integration tools.
 *
 * Pulse is a real-time application performance monitoring dashboard built into
 * Laravel. It records server stats, slow requests/queries/jobs, exceptions,
 * cache hit rates, queue throughput, and active users — all stored locally in
 * pulse_entries, pulse_aggregates, and pulse_values DB tables.
 *
 * Tools here handle: install, enable/disable, pulse:check agent start/stop,
 * purge, and direct readers for every recorder type.
 *
 * Data is read directly from the pulse_* database tables using the same
 * connection auto-detection as db-client.ts (.env DB_* keys).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

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

function isInstalled(cwd: string): boolean {
  const p = path.join(cwd, 'composer.lock');
  return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('"laravel/pulse"');
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
  if (cfg.driver === 'sqlite') {
    const Database = require('better-sqlite3');
    const db = new Database(cfg.database, { readonly: true });
    const stmt = db.prepare(sql);
    const rows = params.length ? stmt.all(...params) : stmt.all();
    db.close();
    return rows as Row[];
  }
  if (cfg.driver === 'pgsql') {
    const { Client } = require('pg') as any;
    const client = new Client({ host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.username, password: cfg.password });
    await client.connect();
    // Convert ? placeholders to $N for PostgreSQL
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const res = await client.query(pgSql, params);
    await client.end();
    return res.rows as Row[];
  }
  // MySQL / MariaDB
  const mysql = require('mysql2/promise') as any;
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.username, password: cfg.password });
  const [rows] = await conn.execute(sql, params);
  await conn.end();
  return (Array.isArray(rows) ? rows : [rows]) as Row[];
}

/** Timestamp column: unix epoch in pulse tables. Convert to readable format. */
function tsExpr(cfg: DbCfg): string {
  if (cfg.driver === 'sqlite') return "datetime(timestamp, 'unixepoch')";
  if (cfg.driver === 'pgsql')  return "to_timestamp(timestamp)::text";
  return 'FROM_UNIXTIME(timestamp)';
}

/** Safe query — returns rows or empty array with error string on failure. */
async function safeQuery(cfg: DbCfg, sql: string, params: unknown[] = []): Promise<{ rows: Row[]; error?: string }> {
  try {
    return { rows: await dbQuery(cfg, sql, params) };
  } catch (e: unknown) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Format duration in ms nicely. */
function ms(val: unknown): string {
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerPulseTools(server: McpServer, runner: CliRunner): void {

  // ── pulse_install ──────────────────────────────────────────────────────────

  server.tool(
    'pulse_install',
    'Install Laravel Pulse: composer require, publish config + migrations, run migrate, and optionally enable PULSE_ENABLED in .env.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const lines: string[] = [];

        // 1. Composer require
        if (isInstalled(cwd)) {
          lines.push('Package: laravel/pulse already installed — skipping composer require.');
        } else {
          lines.push('Installing laravel/pulse via composer...');
          runner.composer(['require', 'laravel/pulse'], cwd);
          if (!isInstalled(cwd)) return errorResult('composer require laravel/pulse failed — check composer output.');
          lines.push('Package: laravel/pulse installed.');
        }

        // 2. Publish config + migrations
        const publish = runner.php(['artisan', 'vendor:publish', '--provider=Laravel\\Pulse\\PulseServiceProvider', '--tag=pulse-config', '--tag=pulse-migrations', '--force'], cwd);
        lines.push(`Published: config/pulse.php + database/migrations/pulse_*.php`);
        if (publish.stderr) lines.push(`  ${publish.stderr.trim()}`);

        // 3. Migrate
        const migrate = runner.php(['artisan', 'migrate', '--force'], cwd);
        lines.push('Migrated: pulse_entries, pulse_aggregates, pulse_values tables created.');
        if (migrate.stdout) lines.push(migrate.stdout.trim().split('\n').slice(-3).join('\n'));

        // 4. Enable
        setEnv(cwd, 'PULSE_ENABLED', 'true');
        lines.push('');
        lines.push('Pulse is ready.');
        lines.push('  Dashboard: https://your-app.test/pulse  (requires auth — see config/pulse.php)');
        lines.push('  Start recorder: pulse_check_start');
        lines.push('  View data:       pulse_servers / pulse_slow_requests / pulse_exceptions / …');

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── pulse_status ───────────────────────────────────────────────────────────

  server.tool(
    'pulse_status',
    'Check Laravel Pulse installation status: package installed, DB tables present, enabled state, configured recorders, and entry counts per type.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const installed = isInstalled(cwd);
        const enabled   = getEnv(cwd, 'PULSE_ENABLED') ?? 'true';
        const lines: string[] = [
          `Installed:  ${installed ? 'Yes (laravel/pulse in composer.lock)' : 'No — run pulse_install'}`,
          `Monitoring: ${enabled !== 'false' ? 'Enabled' : 'Disabled'}`,
        ];

        if (!installed) return textResult(lines.join('\n'));

        // Check config file
        const cfgPath = path.join(cwd, 'config', 'pulse.php');
        lines.push(`Config:     ${fs.existsSync(cfgPath) ? 'config/pulse.php present' : 'NOT published — run pulse_install'}`);

        // Entry counts from DB
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          'SELECT type, COUNT(*) as cnt FROM pulse_entries GROUP BY type ORDER BY cnt DESC'
        );

        if (error) {
          lines.push(`DB tables:  Error — ${error}`);
          lines.push('           Run pulse_install to create pulse_* tables.');
        } else if (rows.length === 0) {
          lines.push('DB tables:  pulse_entries exists but empty — make some requests then run pulse_check_start.');
        } else {
          lines.push('');
          lines.push('Entry counts (pulse_entries):');
          rows.forEach(r => lines.push(`  ${String(r.type).padEnd(28)} ${r.cnt}`));
        }

        // Server values count
        const { rows: svRows } = await safeQuery(cfg,
          "SELECT COUNT(*) as cnt FROM pulse_values WHERE type = 'servers'"
        );
        if (svRows.length > 0) lines.push(`\nServer snapshots (pulse_values): ${svRows[0].cnt}`);

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── pulse_enable / pulse_disable ───────────────────────────────────────────

  server.tool(
    'pulse_enable',
    'Enable Laravel Pulse recording by setting PULSE_ENABLED=true in .env.',
    { cwd: z.string().optional().describe('Laravel project root') },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try { setEnv(cwd, 'PULSE_ENABLED', 'true'); return textResult('Pulse enabled (PULSE_ENABLED=true). Start the recorder with pulse_check_start if not running.'); }
      catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  server.tool(
    'pulse_disable',
    'Disable Laravel Pulse recording by setting PULSE_ENABLED=false in .env.',
    { cwd: z.string().optional().describe('Laravel project root') },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try { setEnv(cwd, 'PULSE_ENABLED', 'false'); return textResult('Pulse disabled (PULSE_ENABLED=false). Use pulse_enable to re-enable.'); }
      catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_check_start ──────────────────────────────────────────────────────

  server.tool(
    'pulse_check_start',
    'Start php artisan pulse:check in the background. This records server CPU, memory, and storage metrics continuously. Required for the Servers card on the Pulse dashboard.',
    { cwd: z.string().optional().describe('Laravel project root') },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        if (!isInstalled(cwd)) return errorResult('Pulse is not installed. Run pulse_install first.');
        const artisan = path.join(cwd, 'artisan');
        const pid = runner.phpDetached([artisan, 'pulse:check'], cwd);
        return textResult([
          `Pulse check started (PID: ${pid}).`,
          '',
          'Records server CPU / memory / storage to pulse_values.',
          'Stop with: pulse_check_stop',
          'View data:  pulse_servers',
        ].join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_check_stop ───────────────────────────────────────────────────────

  server.tool(
    'pulse_check_stop',
    'Stop all running php artisan pulse:check background processes on Windows.',
    { cwd: z.string().optional().describe('Laravel project root') },
    async () => {
      try {
        const find = spawnSync(
          'wmic',
          ['process', 'where', `"name='php.exe' and commandline like '%pulse:check%'"`, 'get', 'processid', '/format:value'],
          { encoding: 'utf8', shell: true }
        );
        const pids = (find.stdout ?? '').split('\n')
          .map((l: string) => l.match(/ProcessId=(\d+)/i)?.[1]).filter(Boolean) as string[];
        if (pids.length === 0) return textResult('No running pulse:check processes found.');
        for (const pid of pids) spawnSync('taskkill', ['/F', '/PID', pid], { shell: true });
        return textResult(`Stopped ${pids.length} pulse:check process(es) (PIDs: ${pids.join(', ')}).`);
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_purge ────────────────────────────────────────────────────────────

  server.tool(
    'pulse_purge',
    'Clear all or specific Laravel Pulse data via php artisan pulse:purge. Optionally filter by type (slow_request, slow_query, slow_job, exception, cache_hit, cache_miss, servers, queue_key_usage, user_request).',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      type: z.string().optional().describe('Entry type to purge (omit to purge all)'),
    },
    async ({ cwd: _cwd, type }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['artisan', 'pulse:purge'];
        if (type) args.push('--type', type);
        const result = runner.php(args, cwd);
        return textResult(result.stdout || result.stderr || 'Purge complete.');
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_servers ──────────────────────────────────────────────────────────

  server.tool(
    'pulse_servers',
    'Show server performance metrics from Laravel Pulse: CPU usage, memory used/total, storage per mount. Requires pulse:check to be running.',
    { cwd: z.string().optional().describe('Laravel project root') },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const ts  = tsExpr(cfg);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as server, value, ${ts} as updated FROM pulse_values WHERE type = 'servers' ORDER BY timestamp DESC`
        );
        if (error) return errorResult(`DB error: ${error}\nMake sure Pulse is installed and migrated.`);
        if (rows.length === 0) return textResult('No server data yet. Start pulse:check with pulse_check_start and wait a few seconds.');

        const lines: string[] = ['Server Metrics (from pulse_values):', ''];
        rows.forEach(r => {
          lines.push(`Server: ${r.server}  (updated: ${r.updated})`);
          try {
            const v = JSON.parse(String(r.value));
            if (v.cpu_usage !== undefined)   lines.push(`  CPU:     ${v.cpu_usage}%`);
            if (v.memory_used !== undefined)  lines.push(`  Memory:  ${Math.round(Number(v.memory_used) / 1024 / 1024)}MB / ${Math.round(Number(v.memory_total) / 1024 / 1024)}MB`);
            if (Array.isArray(v.storage)) {
              v.storage.forEach((s: any) => lines.push(`  Disk ${s.directory}: ${s.used} / ${s.total}`));
            }
          } catch { lines.push(`  Raw: ${r.value}`); }
          lines.push('');
        });
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_slow_requests ────────────────────────────────────────────────────

  server.tool(
    'pulse_slow_requests',
    'List slow HTTP requests recorded by Laravel Pulse. Shows route, response time, and occurrence count. Default threshold: 1000ms.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max rows (default 30)'),
      min_ms: z.number().optional().describe('Minimum duration in ms to show (default 0 = all slow_request entries)'),
    },
    async ({ cwd: _cwd, limit = 30, min_ms = 0 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as route, value as duration_ms, COUNT(*) as occurrences
           FROM pulse_entries WHERE type = 'slow_request' AND value >= ?
           GROUP BY \`key\`, value ORDER BY value DESC LIMIT ?`,
          [min_ms, limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No slow requests recorded yet. Pulse records requests exceeding the threshold set in config/pulse.php (default 1000ms).');

        const lines = ['Slow Requests:', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. ${r.route}  ${ms(r.duration_ms)}  (${r.occurrences}x)`));
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_slow_queries ─────────────────────────────────────────────────────

  server.tool(
    'pulse_slow_queries',
    'List slow SQL queries recorded by Laravel Pulse. Shows query, duration, and occurrence count. Default threshold: 1000ms.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max rows (default 30)'),
      min_ms: z.number().optional().describe('Minimum duration in ms (default 0)'),
    },
    async ({ cwd: _cwd, limit = 30, min_ms = 0 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as query_sql, value as duration_ms, COUNT(*) as occurrences
           FROM pulse_entries WHERE type = 'slow_query' AND value >= ?
           GROUP BY \`key\`, value ORDER BY value DESC LIMIT ?`,
          [min_ms, limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No slow queries recorded yet.');

        const lines = ['Slow Queries:', ''];
        rows.forEach((r, i) => {
          const sql = String(r.query_sql).slice(0, 120);
          lines.push(`${i + 1}. [${ms(r.duration_ms)}] (${r.occurrences}x)\n   ${sql}`);
        });
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_slow_jobs ────────────────────────────────────────────────────────

  server.tool(
    'pulse_slow_jobs',
    'List slow queue jobs recorded by Laravel Pulse. Shows job class, duration, and occurrence count.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max rows (default 30)'),
    },
    async ({ cwd: _cwd, limit = 30 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as job, value as duration_ms, COUNT(*) as occurrences
           FROM pulse_entries WHERE type = 'slow_job'
           GROUP BY \`key\`, value ORDER BY value DESC LIMIT ?`,
          [limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No slow jobs recorded yet.');

        const lines = ['Slow Jobs:', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. ${r.job}  ${ms(r.duration_ms)}  (${r.occurrences}x)`));
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_slow_outgoing ────────────────────────────────────────────────────

  server.tool(
    'pulse_slow_outgoing',
    'List slow outgoing HTTP requests (via Laravel HTTP client) recorded by Pulse.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max rows (default 30)'),
    },
    async ({ cwd: _cwd, limit = 30 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as url, value as duration_ms, COUNT(*) as occurrences
           FROM pulse_entries WHERE type = 'slow_outgoing_request'
           GROUP BY \`key\`, value ORDER BY value DESC LIMIT ?`,
          [limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No slow outgoing requests recorded yet.');

        const lines = ['Slow Outgoing Requests:', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. ${r.url}  ${ms(r.duration_ms)}  (${r.occurrences}x)`));
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_exceptions ───────────────────────────────────────────────────────

  server.tool(
    'pulse_exceptions',
    'List exceptions recorded by Laravel Pulse, grouped by class and message with occurrence counts.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max rows (default 30)'),
    },
    async ({ cwd: _cwd, limit = 30 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as exception, COUNT(*) as occurrences
           FROM pulse_entries WHERE type = 'exception'
           GROUP BY \`key\` ORDER BY occurrences DESC LIMIT ?`,
          [limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No exceptions recorded by Pulse yet.');

        const lines = ['Exceptions:', ''];
        rows.forEach((r, i) => {
          // key format: "ExceptionClass|message" or just class
          const parts = String(r.exception).split('|');
          lines.push(`${i + 1}. [${r.occurrences}x] ${parts[0]}`);
          if (parts[1]) lines.push(`   ${parts[1].slice(0, 120)}`);
        });
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_queues ───────────────────────────────────────────────────────────

  server.tool(
    'pulse_queues',
    'Show queue throughput metrics from Laravel Pulse: queued, processing, processed, released, and failed counts per queue.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max queues (default 20)'),
    },
    async ({ cwd: _cwd, limit = 20 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as queue_info, COUNT(*) as total
           FROM pulse_entries WHERE type = 'queue_key_usage'
           GROUP BY \`key\` ORDER BY total DESC LIMIT ?`,
          [limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No queue data recorded by Pulse yet.');

        const lines = ['Queue Activity:', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. ${r.queue_info}  (${r.total} events)`));
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_cache ────────────────────────────────────────────────────────────

  server.tool(
    'pulse_cache',
    'Show cache hit/miss statistics from Laravel Pulse, grouped by cache key prefix.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max key prefixes (default 30)'),
    },
    async ({ cwd: _cwd, limit = 30 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);

        // Overall hit/miss totals
        const { rows: totals, error: totErr } = await safeQuery(cfg,
          `SELECT type, COUNT(*) as cnt FROM pulse_entries WHERE type IN ('cache_hit','cache_miss') GROUP BY type`
        );
        if (totErr) return errorResult(`DB error: ${totErr}`);

        // Per-key breakdown
        const { rows: byKey } = await safeQuery(cfg,
          `SELECT type, \`key\` as cache_key, COUNT(*) as cnt
           FROM pulse_entries WHERE type IN ('cache_hit','cache_miss')
           GROUP BY type, \`key\` ORDER BY cnt DESC LIMIT ?`,
          [limit]
        );

        if (totals.length === 0) return textResult('No cache data recorded by Pulse yet.');

        const hits   = totals.find(r => r.type === 'cache_hit')?.cnt  ?? 0;
        const misses = totals.find(r => r.type === 'cache_miss')?.cnt ?? 0;
        const total  = Number(hits) + Number(misses);
        const hitRate = total > 0 ? ((Number(hits) / total) * 100).toFixed(1) : '0';

        const lines = [
          `Cache Hit Rate: ${hitRate}%  (${hits} hits / ${misses} misses / ${total} total)`,
          '',
          'By Key Prefix:',
        ];
        // Group hits and misses per key
        const keyMap: Record<string, { hit: number; miss: number }> = {};
        byKey.forEach(r => {
          const k = String(r.cache_key);
          if (!keyMap[k]) keyMap[k] = { hit: 0, miss: 0 };
          if (r.type === 'cache_hit')  keyMap[k].hit  += Number(r.cnt);
          if (r.type === 'cache_miss') keyMap[k].miss += Number(r.cnt);
        });
        Object.entries(keyMap).slice(0, limit).forEach(([k, v], i) => {
          lines.push(`${i + 1}. ${k}  hit:${v.hit} miss:${v.miss}`);
        });
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );

  // ── pulse_users ────────────────────────────────────────────────────────────

  server.tool(
    'pulse_users',
    'Show most active users from Laravel Pulse based on request count.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      limit: z.number().optional().describe('Max users (default 20)'),
    },
    async ({ cwd: _cwd, limit = 20 }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const cfg = dbCfgFromEnv(cwd);
        const { rows, error } = await safeQuery(cfg,
          `SELECT \`key\` as user_id, COUNT(*) as requests
           FROM pulse_entries WHERE type = 'user_request'
           GROUP BY \`key\` ORDER BY requests DESC LIMIT ?`,
          [limit]
        );
        if (error) return errorResult(`DB error: ${error}`);
        if (rows.length === 0) return textResult('No user activity recorded by Pulse yet.');

        const lines = ['Active Users:', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. User ${r.user_id}  — ${r.requests} requests`));
        return textResult(lines.join('\n'));
      } catch (e: unknown) { return errorResult(e instanceof Error ? e.message : String(e)); }
    }
  );
}
