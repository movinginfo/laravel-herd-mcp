import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerNvmTools(server: McpServer, runner: CliRunner): void {
  server.tool('list_node_versions', 'List installed Node.js versions managed by Herd NVM', {}, async () => {
    try {
      const result = runner.nvm(['list']);
      return textResult(result.stdout || 'No Node.js versions installed.');
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('install_node_version', 'Install a Node.js version via Herd NVM', {
    version: z.string().describe('Node.js version e.g. "20", "22", "lts"'),
  }, async ({ version }) => {
    try {
      const result = runner.nvm(['install', version]);
      runner.assertSuccess(result, 'install_node_version');
      return textResult(result.stdout || `Node.js ${version} installed.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('use_node_version', 'Switch active Node.js version via Herd NVM', {
    version: z.string().describe('Node.js version to activate'),
  }, async ({ version }) => {
    try {
      const result = runner.nvm(['use', version]);
      runner.assertSuccess(result, 'use_node_version');
      return textResult(result.stdout || `Now using Node.js ${version}.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });
}
