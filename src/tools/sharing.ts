import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSharingTools(server: McpServer, runner: CliRunner): void {
  server.tool('share_site', 'Share a local Herd site via Expose tunnel', {
    site: z.string().describe('Site hostname to share e.g. "myapp.test"'),
    subdomain: z.string().optional().describe('Custom subdomain for the tunnel'),
  }, async ({ site, subdomain }) => {
    try {
      const args = ['share', site, ...(subdomain ? [`--subdomain=${subdomain}`] : [])];
      const result = runner.expose(args);
      return textResult(result.stdout || result.stderr || 'Sharing started.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_share_url', 'Retrieve the current Expose tunnel URL', {}, async () => {
    try {
      const result = runner.herd(['fetch-share-url']);
      runner.assertSuccess(result, 'get_share_url');
      return textResult(result.stdout || 'No active share URL found.');
    } catch (e) { return errorResult(e); }
  });
}
