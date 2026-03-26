import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerLogsTools(server: McpServer, runner: CliRunner): void {
  server.tool('tail_log', 'Read recent Herd log output (lists available logs if no service specified)', {
    service: z.string().optional().describe('Log service name e.g. "nginx", "php", "herd" (omit to list available logs)'),
    lines: z.number().optional().describe('Number of lines to retrieve (default 50)'),
  }, async ({ service, lines }) => {
    try {
      const args = service ? ['log', service] : ['log'];
      const result = runner.herd(args);
      const output = result.stdout || result.stderr || 'No log output.';
      const allLines = output.split('\n');
      const limit = lines ?? 50;
      const tail = allLines.slice(-limit).join('\n');
      return textResult(tail);
    } catch (e) { return errorResult(e); }
  });
}
