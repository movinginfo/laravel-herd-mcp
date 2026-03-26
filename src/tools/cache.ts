import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerCacheTools(server: McpServer, runner: CliRunner): void {

  // ── Application Cache ──────────────────────────────────────────────────────

  server.tool('cache_clear',
    'Clear the entire application cache (php artisan cache:clear)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'cache:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Cache cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('cache_forget',
    'Remove a specific key from the application cache (php artisan cache:forget)',
    {
      key: z.string().describe('Cache key to remove e.g. "user.1.profile"'),
      store: z.string().optional().describe('Cache store e.g. "redis", "file", "database" (uses default if omitted)'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ key, store, cwd }) => {
      try {
        const args = ['cache:forget', key];
        if (store) args.push(store);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || `Key "${key}" removed from cache.`);
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('cache_prune_stale_tags',
    'Remove stale cache tag entries from Redis (php artisan cache:prune-stale-tags)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'cache:prune-stale-tags'], cwd);
        return textResult(result.stdout || result.stderr || 'Stale tags pruned.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('cache_table',
    'Create the database cache table migration (php artisan cache:table)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'cache:table'], cwd);
        return textResult(result.stdout || result.stderr || 'Cache table migration created.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Config Cache ───────────────────────────────────────────────────────────

  server.tool('config_cache',
    'Cache the framework config files for faster bootstrap (php artisan config:cache)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'config:cache'], cwd);
        return textResult(result.stdout || result.stderr || 'Config cached.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('config_clear',
    'Clear the config cache (php artisan config:clear)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'config:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Config cache cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('config_show',
    'Show all resolved configuration values or a specific key (php artisan config:show)',
    {
      config: z.string().optional().describe('Config key or file e.g. "app", "database.default", "cache.stores"'),
      cwd: z.string().describe('Laravel project root directory'),
      json: z.boolean().optional().describe('Output as JSON'),
    },
    async ({ config, cwd, json }) => {
      try {
        const args = ['config:show'];
        if (config) args.push(config);
        if (json) args.push('--json');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'No config found.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── View Cache ─────────────────────────────────────────────────────────────

  server.tool('view_cache',
    'Compile all Blade templates (php artisan view:cache)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'view:cache'], cwd);
        return textResult(result.stdout || result.stderr || 'Views cached.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('view_clear',
    'Clear compiled Blade view files (php artisan view:clear)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'view:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Compiled views cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Route Cache ────────────────────────────────────────────────────────────

  server.tool('route_cache',
    'Create a route cache for faster route registration (php artisan route:cache)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'route:cache'], cwd);
        return textResult(result.stdout || result.stderr || 'Routes cached.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('route_clear',
    'Clear the route cache (php artisan route:clear)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'route:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Route cache cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Event Cache ────────────────────────────────────────────────────────────

  server.tool('event_cache',
    'Discover and cache all application events and listeners (php artisan event:cache)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'event:cache'], cwd);
        return textResult(result.stdout || result.stderr || 'Events cached.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('event_clear',
    'Clear all cached events and listeners (php artisan event:clear)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'event:clear'], cwd);
        return textResult(result.stdout || result.stderr || 'Event cache cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('event_list',
    'List all application events and their listeners (php artisan event:list)',
    {
      cwd: z.string().describe('Laravel project root directory'),
      event: z.string().optional().describe('Filter by event name'),
    },
    async ({ cwd, event }) => {
      try {
        const args = ['event:list'];
        if (event) args.push('--event=' + event);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'No events found.');
      } catch (e) { return errorResult(e); }
    }
  );
}
