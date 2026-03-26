import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerCoreTools(server: McpServer, runner: CliRunner): void {
  server.tool('start_herd', 'Start all Herd services (Nginx, PHP-FPM, DNS)', {}, async () => {
    try {
      const result = runner.herd(['start']);
      runner.assertSuccess(result, 'start_herd');
      return textResult(result.stdout || 'Herd started.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('stop_herd', 'Stop all Herd services', {}, async () => {
    try {
      const result = runner.herd(['stop']);
      runner.assertSuccess(result, 'stop_herd');
      return textResult(result.stdout || 'Herd stopped.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('restart_herd', 'Restart all Herd services', {}, async () => {
    try {
      const result = runner.herd(['restart']);
      runner.assertSuccess(result, 'restart_herd');
      return textResult(result.stdout || 'Herd restarted.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_loopback_address', 'Get the current Herd loopback address', {}, async () => {
    try {
      const result = runner.herd(['loopback']);
      runner.assertSuccess(result, 'get_loopback_address');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });

  server.tool('set_loopback_address', 'Set the Herd loopback address', {
    address: z.string().describe('IP address e.g. "127.0.0.1"'),
  }, async ({ address }) => {
    try {
      const result = runner.herd(['loopback', address]);
      runner.assertSuccess(result, 'set_loopback_address');
      return textResult(result.stdout || `Loopback set to ${address}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('open_site_in_ide', 'Open a site directory in the configured IDE', {
    name: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ name }) => {
    try {
      const args = name ? ['edit', name] : ['edit'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'open_site_in_ide');
      return textResult(result.stdout || 'Opened in IDE.');
    } catch (e) { return errorResult(e); }
  });
}
