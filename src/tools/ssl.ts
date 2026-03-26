import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSslTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('secure_site', 'Enable HTTPS for a Herd site (generates trusted TLS certificate)', {
    name: z.string().describe('Site name without .test suffix'),
  }, async ({ name }) => {
    try {
      await client.post(`/sites/secure/${name}`);
      return textResult(`Site "${name}" secured with HTTPS.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('unsecure_site', 'Disable HTTPS for a Herd site', {
    name: z.string().describe('Site name without .test suffix'),
  }, async ({ name }) => {
    try {
      await client.post(`/sites/unsecure/${name}`);
      return textResult(`HTTPS disabled for site "${name}".`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('list_secured_sites', 'List all HTTPS-secured sites with certificate expiry dates', {}, async () => {
    try {
      const result = runner.herd(['secured']);
      return textResult(result.stdout || 'No secured sites.');
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });
}
