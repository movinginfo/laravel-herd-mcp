import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text' as const, text }] };
}

export function errorResult(message: unknown): CallToolResult {
  const text = message instanceof Error ? message.message : String(message);
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }], isError: true };
}
