import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerIsolationTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('isolate_site_php', 'Pin a site to a specific PHP version (overrides global)', {
    site: z.string().describe('Site name without .test suffix'),
    version: z.string().describe('PHP version e.g. "8.3"'),
  }, async ({ site, version }) => {
    try {
      await client.post(`/sites/isolate/${site}`, { phpVersion: version });
      return textResult(`Site "${site}" isolated to PHP ${version}.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('unisolate_site_php', 'Remove PHP isolation from a site (reverts to global version)', {
    site: z.string().describe('Site name without .test suffix'),
  }, async ({ site }) => {
    try {
      await client.post(`/sites/unisolate/${site}`);
      return textResult(`Site "${site}" unisolated — using global PHP version.`);
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });

  server.tool('list_isolated_sites', 'List all sites using isolated PHP versions', {}, async () => {
    try {
      const result = runner.herd(['isolated']);
      return textResult(result.stdout ? runner.toMarkdownTable(result.stdout) : 'No isolated sites.');
    } catch (e) { return errorResult(e instanceof Error ? e.message : String(e)); }
  });
}
