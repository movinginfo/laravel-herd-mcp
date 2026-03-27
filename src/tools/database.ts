import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

/** Parse a .env file into a key→value map (handles quoted values, comments). */
function parseEnv(envPath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function registerDatabaseTools(server: McpServer, runner: CliRunner): void {

  // ── .env / Connection Info ─────────────────────────────────────────────────

  server.tool('db_info',
    'Read database connection details from a Laravel project .env file (driver, host, port, database, username)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const envPath = path.join(cwd, '.env');
        if (!fs.existsSync(envPath)) {
          return textResult('.env file not found. Copy .env.example and configure your database.');
        }
        const env = parseEnv(envPath);
        const info = {
          driver:   env.DB_CONNECTION ?? 'mysql',
          host:     env.DB_HOST ?? '127.0.0.1',
          port:     env.DB_PORT ?? '3306',
          database: env.DB_DATABASE ?? '',
          username: env.DB_USERNAME ?? '',
          password: env.DB_PASSWORD ? '(set)' : '(empty)',
          url:      env.DATABASE_URL ?? '',
        };
        return textResult(JSON.stringify(info, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Open DB GUI ────────────────────────────────────────────────────────────

  server.tool('db_open',
    'Open the database for a site in the configured GUI client (TablePlus, DBngin, etc.) via `herd db`',
    {
      site: z.string().optional().describe('Site name (omit to open current directory site)'),
    },
    async ({ site }) => {
      try {
        const args = site ? ['db', site] : ['db'];
        // herd db opens a GUI — spawn detached, no stdout
        runner.spawnDetached(runner['config'].phpExe, [runner['config'].herdPhar, '--no-ansi', ...args]);
        return textResult(`Opening database${site ? ` for "${site}"` : ''} in GUI client…`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Artisan DB commands (Laravel 10+) ──────────────────────────────────────

  server.tool('db_show',
    'Show database summary: tables, size, engine, connection info (php artisan db:show)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      connection: z.string().optional().describe('Database connection name e.g. "mysql", "sqlite" (uses default if omitted)'),
      json: z.boolean().optional().describe('Output as JSON'),
    },
    async ({ cwd: _cwd, connection, json }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['db:show'];
        if (connection) args.push('--database=' + connection);
        if (json) args.push('--json');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'No database info.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('db_table',
    'Show detailed info about a database table — columns, indexes, foreign keys (php artisan db:table)',
    {
      table: z.string().describe('Table name e.g. "users", "orders"'),
      cwd: z.string().optional().describe('Laravel project root directory'),
      connection: z.string().optional().describe('Database connection name'),
      json: z.boolean().optional().describe('Output as JSON'),
    },
    async ({ table, cwd: _cwd, connection, json }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['db:table', table];
        if (connection) args.push('--database=' + connection);
        if (json) args.push('--json');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || `No info for table "${table}".`);
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('db_wipe',
    'Drop all tables, views and types from the database (php artisan db:wipe)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      connection: z.string().optional().describe('Database connection to wipe'),
      force: z.boolean().optional().describe('Force wipe in production'),
    },
    async ({ cwd: _cwd, connection, force }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['db:wipe', '--no-interaction'];
        if (connection) args.push('--database=' + connection);
        if (force) args.push('--force');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Database wiped.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('db_seed',
    'Seed the database with records (php artisan db:seed) — alias for artisan_db_seed with connection support',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      seeder: z.string().optional().describe('Specific seeder class e.g. "UserSeeder"'),
      connection: z.string().optional().describe('Database connection to use'),
      force: z.boolean().optional().describe('Force seed in production'),
    },
    async ({ cwd: _cwd, seeder, connection, force }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['db:seed'];
        if (seeder) args.push('--class=' + seeder);
        if (connection) args.push('--database=' + connection);
        if (force) args.push('--force');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Database seeded.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('db_monitor',
    'Monitor database connection counts and alert when thresholds are exceeded (php artisan db:monitor)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      databases: z.string().optional().describe('Comma-separated connection names to monitor e.g. "mysql,sqlite"'),
      max: z.number().optional().describe('Max connections before alert (default: 100)'),
    },
    async ({ cwd: _cwd, databases, max }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['db:monitor'];
        if (databases) args.push('--databases=' + databases);
        if (max) args.push('--max=' + max);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'No alerts.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Herd Manifest (init) ───────────────────────────────────────────────────

  // ── Database CLI (php artisan db) ─────────────────────────────────────────

  server.tool('db_cli',
    'Run SQL via the Laravel database CLI (php artisan db). Uses Laravel\'s own connection config — supports named connections, complex multi-DB setups, no credentials needed.',
    {
      sql:        z.string().describe('SQL statement(s) to execute — piped to php artisan db as stdin'),
      connection: z.string().optional().describe('Named connection from config/database.php e.g. "mysql", "pgsql", "sqlite", "tenant" (uses default if omitted)'),
      cwd:        z.string().optional().describe('Laravel project root directory'),
    },
    async ({ sql, connection, cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const args = ['artisan', 'db'];
        if (connection) args.push(connection);
        // Pipe SQL via stdin — artisan db reads from stdin when not in a TTY
        const result = runner.php(args, cwd, sql);
        const out = result.stdout || result.stderr || 'No output.';
        return textResult(out);
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('herd_init',
    'Start the services defined in the Herd manifest file (herd.yml) and apply its configuration',
    {
      cwd: z.string().optional().describe('Project directory containing herd.yml'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const result = runner.herd(['init', '--no-interaction'], cwd);
        return textResult(result.stdout || result.stderr || 'Herd manifest applied.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('herd_init_fresh',
    'Generate a fresh Herd manifest file (herd.yml) for the current project with services and PHP version',
    {
      cwd: z.string().optional().describe('Project directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const result = runner.herd(['init:fresh', '--no-interaction'], cwd);
        return textResult(result.stdout || result.stderr || 'Herd manifest created.');
      } catch (e) { return errorResult(e); }
    }
  );
}
