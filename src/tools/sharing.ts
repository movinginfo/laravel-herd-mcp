import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSharingTools(server: McpServer, runner: CliRunner): void {
  server.tool('share_site', 'Share a local site via Expose tunnel (starts sharing in background)', {
    site: z.string().optional().describe('Site name or URL to share (omit for current directory)'),
    subdomain: z.string().optional().describe('Custom subdomain'),
  }, async ({ site, subdomain }) => {
    try {
      const args = ['share', ...(site ? [site] : []), ...(subdomain ? [`--subdomain=${subdomain}`] : [])];
      const result = runner.herd(args);
      return textResult(result.stdout || 'Sharing started. Use get_share_url to retrieve the public URL.');
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
