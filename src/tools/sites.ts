import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSitesTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('list_all_sites', 'List all Herd sites (name, URL, PHP version, SSL status, path)', {}, async () => {
    try {
      const result = runner.herd(['sites']);
      return textResult(result.stdout ? runner.toMarkdownTable(result.stdout) : 'No sites found.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_site_info_artisan', 'Display detailed site information (runs artisan about for Laravel sites)', {
    path: z.string().optional().describe('Site directory path (defaults to current directory)'),
  }, async ({ path: cwd }) => {
    try {
      const result = runner.herd(['site-information'], cwd);
      return textResult(result.stdout || result.stderr || 'No site information available.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('open_site_in_browser', 'Open a Herd site in the default browser', {
    name: z.string().optional().describe('Site name without .test suffix (omit for current directory)'),
  }, async ({ name }) => {
    try {
      const args = name ? ['open', name] : ['open'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'open_site_in_browser');
      return textResult(result.stdout || `Opened in browser.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_site_driver', 'Show which Herd driver serves a site directory', {
    path: z.string().optional().describe('Directory path (defaults to current working directory)'),
  }, async ({ path: cwd }) => {
    try {
      const result = runner.herd(['which'], cwd);
      runner.assertSuccess(result, 'get_site_driver');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });
}
