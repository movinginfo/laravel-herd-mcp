import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerProxiesTools(server: McpServer, runner: CliRunner): void {
  server.tool('create_proxy', 'Create an Nginx proxy to a local port (e.g. http://localhost:8080)', {
    name: z.string().describe('Proxy site name'),
    url: z.string().describe('Target URL e.g. http://localhost:8080'),
  }, async ({ name, url }) => {
    try {
      const result = runner.herd(['proxy', name, url]);
      runner.assertSuccess(result, 'create_proxy');
      return textResult(result.stdout || `Proxy "${name}" → ${url} created.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('remove_proxy', 'Remove an Nginx proxy configuration', {
    name: z.string().describe('Proxy site name to remove'),
  }, async ({ name }) => {
    try {
      const result = runner.herd(['unproxy', name]);
      runner.assertSuccess(result, 'remove_proxy');
      return textResult(result.stdout || `Proxy "${name}" removed.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('list_proxies', 'List all configured Nginx proxies', {}, async () => {
    try {
      const result = runner.herd(['proxies']);
      return textResult(result.stdout || 'No proxies configured.');
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });
}
