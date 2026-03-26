import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerPhpTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('list_php_versions', 'List all PHP versions with install/active status', {}, async () => {
    try {
      const versions = await client.get('/php-versions');
      return textResult(JSON.stringify(versions, null, 2));
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('install_php_version', 'Install a PHP version (e.g. "8.3", "8.4")', {
    version: z.string().describe('PHP version e.g. "8.3"'),
  }, async ({ version }) => {
    try {
      await client.post(`/install-php/${version}`);
      return textResult(`PHP ${version} installation started.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('update_php_version', 'Update a PHP version to its latest patch release', {
    version: z.string().describe('PHP version to update e.g. "8.4"'),
  }, async ({ version }) => {
    try {
      const result = runner.herd(['php:update', version]);
      runner.assertSuccess(result, 'update_php_version');
      return textResult(result.stdout || `PHP ${version} updated.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('use_php_globally', 'Set the global default PHP version for all Herd sites', {
    version: z.string().describe('PHP version e.g. "8.4"'),
  }, async ({ version }) => {
    try {
      const result = runner.herd(['use', version]);
      runner.assertSuccess(result, 'use_php_globally');
      return textResult(result.stdout || `Global PHP set to ${version}.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('which_php', 'Show the PHP binary path for a site or current directory', {
    site: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ site }) => {
    try {
      const args = site ? ['which-php', `--site=${site}`] : ['which-php'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'which_php');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });
}
