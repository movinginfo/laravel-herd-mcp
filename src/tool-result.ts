import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text' as const, text }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}
