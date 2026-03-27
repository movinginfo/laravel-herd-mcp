import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerParksTools(server: McpServer, runner: CliRunner): void {
  server.tool('park_directory', 'Register a directory so all subdirectories become .test sites', {
    path: z.string().optional().describe('Directory to park (defaults to current directory)'),
  }, async ({ path: dir }) => {
    try {
      const args = dir ? ['park', dir] : ['park'];
      const result = runner.herd(args, dir);
      runner.assertSuccess(result, 'park_directory');
      return textResult(result.stdout || 'Directory parked successfully.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('unpark_directory', "Remove a directory from Herd's parked paths", {
    path: z.string().optional().describe('Directory to unpark (defaults to current directory)'),
  }, async ({ path: dir }) => {
    try {
      const args = dir ? ['forget', dir] : ['forget'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'unpark_directory');
      return textResult(result.stdout || 'Directory removed from parked paths.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_parked_paths', 'List registered parent park directories', {}, async () => {
    try {
      const result = runner.herd(['paths']);
      return textResult(result.stdout || 'No parked paths found.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_parked_sites', 'List all sites resolving from parked directories', {}, async () => {
    try {
      const result = runner.herd(['parked']);
      return textResult(result.stdout ? runner.toMarkdownTable(result.stdout) : 'No parked sites found.');
    } catch (e) { return errorResult(e); }
  });
}
