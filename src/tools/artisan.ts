import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

/**
 * Run `php artisan <args>` in the given project directory.
 * The artisan file must exist in cwd (Laravel project root).
 */
function artisan(runner: CliRunner, args: string[], cwd: string): ReturnType<CliRunner['php']> {
  return runner.php(['artisan', ...args], cwd);
}

export function registerArtisanTools(server: McpServer, runner: CliRunner): void {

  // ── Generic ────────────────────────────────────────────────────────────────

  server.tool('artisan', 'Run any php artisan command in a Laravel project', {
    command: z.string().describe('Artisan command and arguments e.g. "migrate", "make:model Post -m", "route:list --json"'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ command, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = command.split(/\s+/).filter(Boolean);
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || 'Done.');
    } catch (e) { return errorResult(e); }
  });

  // ── Code Generation (make:*) ───────────────────────────────────────────────

  server.tool('artisan_make', 'Scaffold a Laravel class with php artisan make:<type>', {
    type: z.enum([
      'model', 'controller', 'migration', 'seeder', 'factory',
      'middleware', 'command', 'event', 'listener', 'job',
      'mail', 'notification', 'policy', 'request', 'resource',
      'rule', 'cast', 'scope', 'channel', 'provider',
    ]).describe('Class type to generate'),
    name: z.string().describe('Class name e.g. "Post", "UserController", "create_posts_table"'),
    flags: z.string().optional().describe('Extra flags e.g. "-m" (migration), "--api", "--resource", "--invokable"'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ type, name, flags, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = [`make:${type}`, name, ...(flags ? flags.split(/\s+/).filter(Boolean) : [])];
      const result = artisan(runner, args, cwd);
      runner.assertSuccess(result, `artisan make:${type}`);
      return textResult(result.stdout || `${type} "${name}" created.`);
    } catch (e) { return errorResult(e); }
  });

  // ── Migrations ─────────────────────────────────────────────────────────────

  server.tool('artisan_migrate', 'Run database migrations (migrate, fresh, rollback, status, db:seed)', {
    action: z.enum(['migrate', 'fresh', 'rollback', 'status', 'db:seed']).default('migrate')
      .describe('Migration action'),
    seed: z.boolean().optional().describe('Run seeders after migration (migrate and fresh only)'),
    step: z.number().optional().describe('Number of batches to rollback (rollback only)'),
    force: z.boolean().optional().describe('Force run in production without confirmation'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ action, seed, step, force, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args: string[] = [action];
      if (seed && (action === 'migrate' || action === 'fresh')) args.push('--seed');
      if (step && action === 'rollback') args.push(`--step=${step}`);
      if (force) args.push('--force');
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || 'Migration complete.');
    } catch (e) { return errorResult(e); }
  });

  // ── Routes ─────────────────────────────────────────────────────────────────

  server.tool('artisan_route_list', 'List all registered routes (php artisan route:list)', {
    filter: z.string().optional().describe('Filter routes by name, URI, or method e.g. "api", "POST"'),
    json: z.boolean().optional().describe('Output as JSON (default: formatted table)'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ filter, json, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = ['route:list'];
      if (json) args.push('--json');
      if (filter) args.push(`--filter=${filter}`);
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || 'No routes found.');
    } catch (e) { return errorResult(e); }
  });

  // ── Cache & Optimization ───────────────────────────────────────────────────

  server.tool('artisan_optimize', 'Cache or clear Laravel caches (config, routes, views, events)', {
    action: z.enum(['optimize', 'optimize:clear', 'config:cache', 'config:clear', 'route:cache', 'route:clear', 'view:clear', 'cache:clear', 'event:cache', 'event:clear'])
      .default('optimize:clear')
      .describe('Optimization action'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ action, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const result = artisan(runner, [action], cwd);
      return textResult(result.stdout || result.stderr || `${action} complete.`);
    } catch (e) { return errorResult(e); }
  });

  // ── App Info ───────────────────────────────────────────────────────────────

  server.tool('artisan_about', 'Display Laravel application information (php artisan about)', {
    cwd: z.string().optional().describe('Laravel project root directory'),
    json: z.boolean().optional().describe('Output as JSON'),
  }, async ({ cwd: _cwd, json }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = ['about', ...(json ? ['--json'] : [])];
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || 'No output.');
    } catch (e) { return errorResult(e); }
  });

  // ── Database Seeding ───────────────────────────────────────────────────────

  server.tool('artisan_db_seed', 'Seed the database (php artisan db:seed)', {
    seeder: z.string().optional().describe('Specific seeder class to run e.g. "UserSeeder"'),
    force: z.boolean().optional().describe('Force run in production'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ seeder, force, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = ['db:seed'];
      if (seeder) args.push(`--class=${seeder}`);
      if (force) args.push('--force');
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || 'Database seeded.');
    } catch (e) { return errorResult(e); }
  });

  // ── Queue ──────────────────────────────────────────────────────────────────

  server.tool('artisan_queue', 'Manage queues — list failed jobs, retry, or flush', {
    action: z.enum(['failed', 'retry', 'flush', 'monitor']).describe('Queue action'),
    id: z.string().optional().describe('Job UUID to retry (or "all" to retry all failed jobs)'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ action, id, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = action === 'retry'
        ? ['queue:retry', id ?? 'all']
        : [`queue:${action}`];
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || `queue:${action} complete.`);
    } catch (e) { return errorResult(e); }
  });

  // ── Key & Storage ──────────────────────────────────────────────────────────

  server.tool('artisan_setup', 'Run common Laravel setup commands (key:generate, storage:link)', {
    action: z.enum(['key:generate', 'storage:link']).describe('Setup action'),
    force: z.boolean().optional().describe('Overwrite existing key (key:generate only)'),
    cwd: z.string().optional().describe('Laravel project root directory'),
  }, async ({ action, force, cwd: _cwd }) => {
    const cwd = resolveCwd(_cwd);
    if (!cwd) return errorResult(NO_PROJECT_MSG);
    try {
      const args = [action, ...(force && action === 'key:generate' ? ['--force'] : [])];
      const result = artisan(runner, args, cwd);
      return textResult(result.stdout || result.stderr || `${action} complete.`);
    } catch (e) { return errorResult(e); }
  });
}
