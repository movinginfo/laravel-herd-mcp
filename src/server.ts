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
import { registerDbClientTools } from './tools/db-client.js';
import { registerDebugbarTools } from './tools/debugbar.js';
import { registerTelescopeTools } from './tools/telescope.js';
import { registerNightwatchTools } from './tools/nightwatch.js';
import { registerForgeTools } from './tools/forge.js';
import { registerSetupTools, registerStatusTools, registerPatchHerdUiTool } from './tools/setup.js';
import { registerProjectTools } from './tools/project.js';

export interface ServerOptions {
  herdPath?: string;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const herdConfig = detectHerd(options.herdPath);
  const client = new HerdHttpClientImpl(herdConfig.apiPort);
  const runner = new CliRunner(herdConfig);

  const server = new McpServer({
    name: 'laravel-herd-mcp',
    version: '0.1.21',
  });

  // Register all tool groups
  registerProjectTools(server, runner);
  registerSitesTools(server, client, runner);
  registerParksTools(server, runner);
  registerLinksTools(server, runner);
  registerPhpTools(server, client, runner);
  registerIsolationTools(server, client, runner);
  registerSslTools(server, client, runner);
  registerProxiesTools(server, runner);
  registerNvmTools(server, runner);
  registerServicesTools(server, runner);
  registerCoreTools(server, runner);
  registerSharingTools(server, runner);
  registerLogsTools(server, runner);
  registerDebugTools(server, runner);
  registerDevtoolsTools(server, runner);
  registerArtisanTools(server, runner);
  registerComposerTools(server, runner);
  registerDatabaseTools(server, runner);
  registerCacheTools(server, runner);
  registerQueueTools(server, runner);
  registerDumpsTools(server, herdConfig, runner);
  registerBoostTools(server, runner);
  registerDbClientTools(server);
  registerDebugbarTools(server, runner);
  registerTelescopeTools(server, runner);
  registerNightwatchTools(server, runner);
  registerForgeTools(server, runner);
  registerSetupTools(server, herdConfig, runner);
  registerStatusTools(server, herdConfig);
  registerPatchHerdUiTool(server);

  return server;
}
