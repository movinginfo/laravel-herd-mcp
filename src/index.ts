#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const httpFlag = args.includes('--http');
  const portFlag = args.find(a => a.startsWith('--port='));
  const herdPathFlag = args.find(a => a.startsWith('--herd-path='));

  const port = portFlag ? parseInt(portFlag.split('=')[1], 10) : 3000;
  const herdPath = herdPathFlag ? herdPathFlag.split('=')[1] : undefined;

  const server = createServer({ herdPath });

  if (httpFlag) {
    // HTTP/SSE mode
    const express = await import('express');
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');

    const app = express.default();
    app.use(express.default.json());

    let transport: InstanceType<typeof SSEServerTransport> | null = null;

    app.get('/sse', async (req, res) => {
      transport = new SSEServerTransport('/messages', res);
      await server.connect(transport);
    });

    app.post('/messages', async (req, res) => {
      if (!transport) {
        res.status(400).json({ error: 'No SSE connection established' });
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      process.stderr.write(`laravel-herd-mcp HTTP/SSE server running on http://localhost:${port}\n`);
      process.stderr.write(`SSE endpoint: http://localhost:${port}/sse\n`);
    });
  } else {
    // Stdio mode (default) — for Claude Desktop and Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
