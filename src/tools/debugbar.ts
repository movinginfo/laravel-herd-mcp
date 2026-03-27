/**
 * Laravel Debugbar integration tools.
 *
 * Installs fruitcake/laravel-debugbar, toggles it via .env,
 * and reads the JSON storage files from storage/debugbar/ to surface
 * queries, exceptions, timeline, views, auth and more — without a browser.
 *
 * Storage files: storage/debugbar/<id>.json  (one per HTTP request)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

// ── .env helpers ─────────────────────────────────────────────────────────────

function setEnvValue(cwd: string, key: string, value: string): void {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) throw new Error(`.env not found in ${cwd}`);
  let content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

function getEnvValue(cwd: string, key: string): string | null {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '').trim() : null;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function storagePath(cwd: string): string {
  return path.join(cwd, 'storage', 'debugbar');
}

interface RequestMeta {
  id: string;
  datetime: string;
  method: string;
  uri: string;
  ip: string;
  queryCount: number;
  duration: string;
  memory: string;
  hasExceptions: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMeta(id: string, data: Record<string, any>): RequestMeta {
  const meta = data.__meta ?? {};
  const queries = data.queries ?? data.db ?? {};
  const time = data.time ?? {};
  const memory = data.memory ?? {};
  const exceptions = data.exceptions ?? {};
  return {
    id,
    datetime: meta.datetime ?? meta.utime ?? '',
    method:   meta.method ?? '?',
    uri:      meta.uri    ?? '?',
    ip:       meta.ip     ?? '',
    queryCount:    queries.nb_statements ?? queries.count ?? 0,
    duration:      time.duration_str  ?? (time.duration  ? `${Math.round(time.duration)}ms`  : '?'),
    memory:        memory.peak_usage_str ?? (memory.peak_usage ? `${(memory.peak_usage / 1024 / 1024).toFixed(1)}MB` : '?'),
    hasExceptions: Array.isArray(exceptions.exceptions) ? exceptions.exceptions.length > 0 : false,
  };
}

function listStorageFiles(cwd: string, limit: number): Array<{ id: string; file: string; mtime: Date }> {
  const dir = storagePath(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ id: f.replace('.json', ''), file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readStorageFile(cwd: string, id: string): Record<string, any> {
  const file = path.join(storagePath(cwd), `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`Debugbar request not found: ${id}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerDebugbarTools(server: McpServer, runner: CliRunner): void {

  // ── Install ────────────────────────────────────────────────────────────────

  server.tool('debugbar_install',
    'Install Laravel Debugbar (fruitcake/laravel-debugbar --dev), publish config, and enable it in .env',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const lines: string[] = [];

        const req = runner.composer(['require', 'fruitcake/laravel-debugbar', '--dev', '--no-interaction'], cwd);
        lines.push('=== composer require ===\n' + (req.stdout || req.stderr));
        if (req.exitCode !== 0) return textResult(lines.join('\n'));

        const pub = runner.php(['artisan', 'vendor:publish',
          '--provider=Fruitcake\\LaravelDebugbar\\ServiceProvider', '--no-interaction'], cwd);
        lines.push('\n=== vendor:publish ===\n' + (pub.stdout || pub.stderr));

        // Enable in .env
        setEnvValue(cwd, 'DEBUGBAR_ENABLED', 'true');
        lines.push('\n✓ DEBUGBAR_ENABLED=true set in .env');
        lines.push('\nDebugbar installed. Visit any page — debug data appears in storage/debugbar/.');
        lines.push('Use debugbar_requests to read captured request data.');
        lines.push('\n⚠  Debugbar is a DEV-only tool. Disable before deploying to production.');

        return textResult(lines.join('\n'));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Enable / Disable ───────────────────────────────────────────────────────

  server.tool('debugbar_enable',
    'Enable Laravel Debugbar by setting DEBUGBAR_ENABLED=true in .env',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        setEnvValue(cwd, 'DEBUGBAR_ENABLED', 'true');
        return textResult('Debugbar ENABLED (DEBUGBAR_ENABLED=true).\nMake an HTTP request to your site — data will appear in storage/debugbar/.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('debugbar_disable',
    'Disable Laravel Debugbar by setting DEBUGBAR_ENABLED=false in .env',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        setEnvValue(cwd, 'DEBUGBAR_ENABLED', 'false');
        return textResult('Debugbar DISABLED (DEBUGBAR_ENABLED=false).\nNo new data will be collected. Existing storage files are kept.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Status ─────────────────────────────────────────────────────────────────

  server.tool('debugbar_status',
    'Show Laravel Debugbar status: installed, enabled, number of stored requests, storage size',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const composerLock = path.join(cwd, 'composer.lock');
        const installed = fs.existsSync(composerLock) &&
          fs.readFileSync(composerLock, 'utf8').includes('fruitcake/laravel-debugbar');
        const configPublished = fs.existsSync(path.join(cwd, 'config', 'debugbar.php'));
        const enabled = getEnvValue(cwd, 'DEBUGBAR_ENABLED');
        const appDebug = getEnvValue(cwd, 'APP_DEBUG');

        const dir = storagePath(cwd);
        let storedRequests = 0;
        let storageSizeKb = 0;
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
          storedRequests = files.length;
          storageSizeKb = Math.round(files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0) / 1024);
        }

        const activeStatus = enabled === 'true' ? 'ENABLED' :
          enabled === 'false' ? 'DISABLED' :
          appDebug === 'true' ? 'ENABLED (via APP_DEBUG=true)' : 'DISABLED (APP_DEBUG is not true)';

        return textResult(JSON.stringify({
          installed,
          config_published: configPublished,
          status: activeStatus,
          DEBUGBAR_ENABLED: enabled ?? '(not set)',
          APP_DEBUG: appDebug ?? '(not set)',
          stored_requests: storedRequests,
          storage_size_kb: storageSizeKb,
          storage_path: dir,
        }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── List recent requests ───────────────────────────────────────────────────

  server.tool('debugbar_requests',
    'List recent HTTP requests captured by Laravel Debugbar (from storage/debugbar/). Shows method, URL, duration, query count, memory, exceptions.',
    {
      cwd:   z.string().optional().describe('Laravel project root directory'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Number of recent requests to show (default: 20)'),
    },
    async ({ cwd: _cwd, limit }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const files = listStorageFiles(cwd, limit ?? 20);
        if (files.length === 0) {
          return textResult(
            'No debugbar requests found in storage/debugbar/.\n' +
            'Make sure DEBUGBAR_ENABLED=true and visit a page in your browser.'
          );
        }
        const requests = files.map(({ id, file }) => {
          try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            return parseMeta(id, data);
          } catch { return null; }
        }).filter(Boolean) as RequestMeta[];

        const summary = requests.map((r, i) =>
          `${i + 1}. [${r.method}] ${r.uri}\n` +
          `   ID: ${r.id}  Time: ${r.datetime}  Duration: ${r.duration}  Memory: ${r.memory}  Queries: ${r.queryCount}${r.hasExceptions ? '  ⚠ EXCEPTION' : ''}`
        ).join('\n');

        return textResult(`${requests.length} recent requests:\n\n${summary}\n\nUse debugbar_request_detail with an ID for full details.`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Request detail ─────────────────────────────────────────────────────────

  server.tool('debugbar_request_detail',
    'Show full Debugbar data for a specific request: route, queries, timeline, views, auth, exceptions, cache, events.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      id:  z.string().describe('Request ID from debugbar_requests (the filename without .json)'),
    },
    async ({ cwd: _cwd, id }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const data = readStorageFile(cwd, id);
        const meta = data.__meta ?? {};

        // Route
        const route = data.route ?? {};
        // Queries
        const queries = data.queries ?? data.db ?? {};
        const stmts = (queries.statements ?? []).map((s: Record<string, unknown>) => ({
          sql:      s.sql,
          bindings: s.params ?? s.bindings,
          duration: s.duration_str ?? s.duration,
          slow:     s.slow ?? false,
          source:   s.source,
        }));
        // Timeline
        const time = data.time ?? {};
        // Memory
        const memory = data.memory ?? {};
        // Views
        const views = data.views ?? {};
        // Auth
        const auth = data.auth ?? {};
        // Exceptions
        const exceptions = (data.exceptions?.exceptions ?? []).map((e: Record<string, unknown>) => ({
          type:    e.type,
          message: e.message,
          file:    e.file,
          line:    e.line,
        }));
        // Cache
        const cache = data.cache ?? {};
        // Events
        const events = data.events ?? {};
        // Models
        const models = data.models ?? {};

        const result = {
          request: {
            id,
            datetime: meta.datetime,
            method:   meta.method,
            uri:      meta.uri,
            ip:       meta.ip,
          },
          route: {
            uri:        route.uri,
            action:     route.currentRouteAction ?? route.action,
            middleware: route.middleware,
            name:       route.routeName ?? route.name,
          },
          performance: {
            duration:    time.duration_str ?? time.duration,
            memory_peak: memory.peak_usage_str ?? memory.peak_usage,
          },
          queries: {
            count:       queries.nb_statements ?? queries.count ?? 0,
            total_time:  queries.accumulated_duration_str ?? queries.accumulated_duration,
            slow_count:  stmts.filter((s: {slow: boolean}) => s.slow).length,
            statements:  stmts,
          },
          views: {
            count:     views.nb_templates ?? 0,
            templates: (views.templates ?? []).map((t: Record<string, unknown>) => ({ name: t.name, render_time: t.render_time })),
          },
          auth,
          exceptions,
          cache: {
            count: cache.count ?? (cache.measures ?? []).length,
            hits:  cache.hits,
            misses: cache.misses,
          },
          events: {
            count:  events.count ?? (events.measures ?? []).length,
          },
          models: {
            count: models.count ?? Object.keys(models).length,
          },
        };

        return textResult(JSON.stringify(result, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── SQL queries across requests ────────────────────────────────────────────

  server.tool('debugbar_queries',
    'Show all SQL queries from recent Debugbar requests. Highlights slow queries. Great for N+1 detection.',
    {
      cwd:        z.string().optional().describe('Laravel project root directory'),
      limit:      z.number().min(1).max(50).optional().default(10).describe('Number of recent requests to scan (default: 10)'),
      slow_only:  z.boolean().optional().describe('Show only slow queries'),
    },
    async ({ cwd: _cwd, limit, slow_only }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const files = listStorageFiles(cwd, limit ?? 10);
        if (files.length === 0) return textResult('No debugbar data found. Enable debugbar and make some requests first.');

        const output: string[] = [];
        let totalQueries = 0;

        for (const { id, file } of files) {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          const meta  = data.__meta ?? {};
          const queries = data.queries ?? data.db ?? {};
          const stmts: Array<Record<string, unknown>> = queries.statements ?? [];
          const filtered = slow_only ? stmts.filter(s => s.slow) : stmts;
          if (filtered.length === 0) continue;

          output.push(`\n[${meta.method ?? '?'}] ${meta.uri ?? id} — ${filtered.length} ${slow_only ? 'slow ' : ''}queries`);
          filtered.forEach((s, i) => {
            output.push(`  ${i + 1}. ${s.slow ? '🐌 SLOW ' : ''}[${s.duration_str ?? s.duration}] ${s.sql}`);
            if (s.params && Array.isArray(s.params) && s.params.length) {
              output.push(`     bindings: ${JSON.stringify(s.params)}`);
            }
          });
          totalQueries += filtered.length;
        }

        if (output.length === 0) return textResult(slow_only ? 'No slow queries found.' : 'No queries found in recent requests.');
        return textResult(`${totalQueries} queries across ${files.length} requests:\n${output.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Exceptions ─────────────────────────────────────────────────────────────

  server.tool('debugbar_exceptions',
    'Show all exceptions captured by Laravel Debugbar across recent requests.',
    {
      cwd:   z.string().optional().describe('Laravel project root directory'),
      limit: z.number().min(1).max(50).optional().default(20).describe('Number of recent requests to scan (default: 20)'),
    },
    async ({ cwd: _cwd, limit }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const files = listStorageFiles(cwd, limit ?? 20);
        if (files.length === 0) return textResult('No debugbar data found.');

        const found: string[] = [];

        for (const { id, file } of files) {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          const meta = data.__meta ?? {};
          const exceptions: Array<Record<string, unknown>> = data.exceptions?.exceptions ?? [];
          if (exceptions.length === 0) continue;

          found.push(`\n[${meta.method ?? '?'}] ${meta.uri ?? id}  (${meta.datetime ?? id})`);
          exceptions.forEach((e, i) => {
            found.push(`  ${i + 1}. ${e.type}: ${e.message}`);
            if (e.file) found.push(`     at ${e.file}:${e.line}`);
          });
        }

        if (found.length === 0) return textResult('No exceptions found in recent requests.');
        return textResult(`Exceptions found:\n${found.join('\n')}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Clear storage ──────────────────────────────────────────────────────────

  server.tool('debugbar_clear',
    'Delete all stored Debugbar request files from storage/debugbar/',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const dir = storagePath(cwd);
        if (!fs.existsSync(dir)) return textResult('storage/debugbar/ does not exist — nothing to clear.');
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        files.forEach(f => fs.unlinkSync(path.join(dir, f)));
        return textResult(`Cleared ${files.length} debugbar request file${files.length !== 1 ? 's' : ''} from storage/debugbar/.`);
      } catch (e) { return errorResult(e); }
    }
  );
}
