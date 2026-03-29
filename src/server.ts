import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { detectHerd } from './herd-detector.js';
import { HerdHttpClientImpl } from './http-client.js';
import { CliRunner } from './cli-runner.js';

// Tool registrars
import { registerSitesTools } from './tools/sites.js';
import { registerParksTools } from './tools/parks.js';
import { registerLinksTools } from './tools/links.js';
import { registerPhpTools } from './tools/php.js';
import { registerIsolationTools } from './tools/isolation.js';
import { registerSslTools } from './tools/ssl.js';
import { registerProxiesTools } from './tools/proxies.js';
import { registerNvmTools } from './tools/nvm.js';
import { registerServicesTools } from './tools/services.js';
import { registerCoreTools } from './tools/core.js';
import { registerSharingTools } from './tools/sharing.js';
import { registerLogsTools } from './tools/logs.js';
import { registerDebugTools } from './tools/debug.js';
import { registerDevtoolsTools } from './tools/devtools.js';
import { registerArtisanTools } from './tools/artisan.js';
import { registerComposerTools } from './tools/composer.js';
import { registerDatabaseTools } from './tools/database.js';
import { registerCacheTools } from './tools/cache.js';
import { registerQueueTools } from './tools/queue.js';
import { registerDumpsTools } from './tools/dumps.js';
import { registerBoostTools } from './tools/boost.js';
import { registerSkillsTools } from './tools/skills.js';
import { registerDbClientTools } from './tools/db-client.js';
import { registerDebugbarTools } from './tools/debugbar.js';
import { registerTelescopeTools } from './tools/telescope.js';
import { registerNightwatchTools } from './tools/nightwatch.js';
import { registerPulseTools } from './tools/pulse.js';
import { registerForgeTools } from './tools/forge.js';
import { registerSetupTools, registerStatusTools, registerPatchHerdUiTool } from './tools/setup.js';
import { registerProjectTools } from './tools/project.js';
import { registerClaudeCodeTools } from './tools/claude-code.js';

/**
 * Tool groups for clients that enforce a per-server tool limit (e.g. Antigravity max=100).
 *
 *  --group=herd        Herd infrastructure: sites, PHP, SSL, NVM, services, setup   (~70 tools)
 *  --group=laravel     Laravel dev: artisan, composer, DB, cache, queue, boost       (~78 tools)
 *  --group=monitoring  Debug packages: Telescope, Pulse, Debugbar, Nightwatch, Forge (~89 tools)
 *  --group=all         Everything — 218 tools (default, for Claude Desktop/Code)
 *
 * Usage: npx laravel-herd-mcp --group=herd
 */
export type ToolGroup = 'all' | 'herd' | 'laravel' | 'monitoring';

export interface ServerOptions {
  herdPath?: string;
  group?: ToolGroup;
}

/** Human-friendly titles and descriptions per group (shown in VS Code Details tab). */
const GROUP_META: Record<ToolGroup, { title: string; description: string }> = {
  all: {
    title: 'Laravel Herd',
    description: '218 MCP tools for full Laravel Herd control — sites, PHP, SSL, artisan, composer, ' +
                 'Telescope, Pulse, Nightwatch, Debugbar, Forge CLI, direct DB queries and more.',
  },
  herd: {
    title: 'Laravel Herd — Infrastructure',
    description: '~70 tools for Herd control, sites, PHP versions, SSL, NVM, services, proxies, logs and setup. ' +
                 'Use with --group=laravel and --group=monitoring for full coverage.',
  },
  laravel: {
    title: 'Laravel Herd — Development',
    description: '~78 tools for Laravel development: artisan, composer, database, direct SQL, cache, queues, schedule and Boost.',
  },
  monitoring: {
    title: 'Laravel Herd — Monitoring',
    description: '~89 tools for debugging and monitoring: Telescope, Pulse, Debugbar, Nightwatch, Forge CLI, Xdebug, Ray, Clockwork.',
  },
};

export function createServer(options: ServerOptions = {}): McpServer {
  const herdConfig = detectHerd(options.herdPath);
  const client = new HerdHttpClientImpl(herdConfig.apiPort);
  const runner = new CliRunner(herdConfig);
  const group: ToolGroup = options.group ?? 'all';
  const meta = GROUP_META[group];

  /** Returns true when the registrar belongs to one of the given groups (or group=all). */
  const in_ = (...groups: ToolGroup[]): boolean =>
    group === 'all' || (groups as string[]).includes(group);

  const server = new McpServer({
    name:        'laravel-herd-mcp',
    title:       meta.title,
    version:     '0.1.31',
    description: meta.description,
    websiteUrl:  'https://github.com/movinginfo/laravel-herd-mcp',
  });

  // ── Active project (all groups — needed everywhere for cwd resolution) ───────
  registerProjectTools(server, runner);

  // ── GROUP: herd ───────────────────────────────────────────────────────────────
  // Herd control, sites, PHP, SSL, NVM, services, sharing, logs, setup
  if (in_('herd')) {
    registerCoreTools(server, runner);         // start/stop/restart herd, loopback, manifest
    registerSitesTools(server, client, runner);// list, info, driver, browser, IDE, create project
    registerParksTools(server, runner);        // park/unpark directories
    registerLinksTools(server, runner);        // link/unlink named sites
    registerPhpTools(server, client, runner);  // versions, install, update, global, which, php.ini
    registerIsolationTools(server, client, runner); // isolate/unisolate per-site PHP
    registerSslTools(server, client, runner);  // secure/unsecure/list certs
    registerProxiesTools(server, runner);      // create/remove/list proxies
    registerNvmTools(server, runner);          // node versions
    registerServicesTools(server, runner);     // MySQL, Redis, PostgreSQL, Minio
    registerSharingTools(server, runner);      // share via Expose tunnel
    registerLogsTools(server, runner);         // tail site/php/nginx logs
    registerSetupTools(server, herdConfig, runner); // setup_integrations, auto-configure
    registerStatusTools(server, herdConfig);   // integration status
    registerPatchHerdUiTool(server);           // patch Herd UI (educational)
  }

  // ── GROUP: laravel ────────────────────────────────────────────────────────────
  // Artisan, composer, database, cache, queues, boost, skills
  if (in_('laravel')) {
    registerArtisanTools(server, runner);      // generic artisan + make:*, migrate, routes, optimize
    registerComposerTools(server, runner);     // require, remove, install, update, search, scripts
    registerDatabaseTools(server, runner);     // db:info, db:show, db:table, wipe, seed, monitor, db_cli
    registerDbClientTools(server);             // native SQL: mysql2, pg, better-sqlite3
    registerCacheTools(server, runner);        // app/config/view/route/event cache
    registerQueueTools(server, runner);        // failed jobs, batches, schedule, Horizon
    registerBoostTools(server, runner);        // AI coding guidelines
    registerSkillsTools(server, runner);       // skills.laravel.cloud directory
    registerClaudeCodeTools(server);           // Claude Code / VS Code / Desktop integration
    registerDebugTools(server, runner);        // Xdebug debug sessions
    registerDevtoolsTools(server, runner);     // run_tinker, run_php_with_debug/coverage
  }

  // ── GROUP: monitoring ─────────────────────────────────────────────────────────
  // Debugbar, Telescope, Pulse, Nightwatch, Forge, Dumps/watchers
  if (in_('monitoring')) {
    registerDumpsTools(server, herdConfig, runner); // Herd dump interceptor, watchers, Ray, Clockwork
    registerDebugbarTools(server, runner);     // fruitcake/laravel-debugbar
    registerTelescopeTools(server, runner);    // laravel/telescope (19 tools)
    registerPulseTools(server, runner);        // laravel/pulse (14 tools)
    registerNightwatchTools(server, runner);   // laravel/nightwatch (7 tools)
    registerForgeTools(server, runner);        // laravel/forge-cli (25 tools)
  }

  return server;
}
