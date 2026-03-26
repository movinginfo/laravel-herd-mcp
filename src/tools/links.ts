import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerLinksTools(server: McpServer, runner: CliRunner): void {
  server.tool('link_site', 'Register current directory as a named Herd site', {
    name: z.string().optional().describe('Site name (defaults to directory name)'),
    secure: z.boolean().optional().describe('Also enable HTTPS'),
  }, async ({ name, secure }) => {
    try {
      const args = ['link', ...(name ? [name] : []), ...(secure ? ['--secure'] : [])];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'link_site');
      return textResult(result.stdout || 'Site linked.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('unlink_site', 'Remove a named Herd site link', {
    name: z.string().optional().describe('Site name to unlink (defaults to current directory name)'),
  }, async ({ name }) => {
    try {
      const args = name ? ['unlink', name] : ['unlink'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'unlink_site');
      return textResult(result.stdout || 'Site unlinked.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_links', 'List all linked Herd sites', {}, async () => {
    try {
      const result = runner.herd(['links']);
      return textResult(result.stdout || 'No linked sites found.');
    } catch (e) { return errorResult(e); }
  });
}
