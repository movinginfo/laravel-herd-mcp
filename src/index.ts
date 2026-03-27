#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { renderDashboard } from './dashboard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const httpFlag = args.includes('--http');
  const portFlag = args.find(a => a.startsWith('--port='));
  const herdPathFlag = args.find(a => a.startsWith('--herd-path='));

  const port = portFlag ? parseInt(portFlag.split('=')[1], 10) : 3000;
  const herdPath = herdPathFlag ? herdPathFlag.split('=')[1] : undefined;

  const groupFlag = args.find(a => a.startsWith('--group='));
  const group = (groupFlag ? groupFlag.split('=')[1] : 'all') as import('./server.js').ToolGroup;

  const server = createServer({ herdPath, group });

  if (httpFlag) {
    // HTTP/SSE mode — expose port for tools that need to construct URLs
    process.env['HERD_MCP_HTTP_PORT'] = String(port);

    const express = await import('express');
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');

    const app = express.default();
    app.use(express.default.json());

    let transport: InstanceType<typeof SSEServerTransport> | null = null;

    // Dashboard — Herd Integrations-style status page
    app.get('/dashboard', (_req, res) => {
      const integrations = buildIntegrationStatus(herdPath);
      const html = renderDashboard(integrations, port);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });

    // JSON status endpoint
    app.get('/status', (_req, res) => {
      res.json({
        server: 'laravel-herd-mcp',
        version: '0.1.8',
        transport: 'HTTP/SSE',
        port,
        integrations: buildIntegrationStatus(herdPath),
        endpoints: {
          dashboard: `/dashboard`,
          sse: `/sse`,
          messages: `/messages`,
          status: `/status`,
        },
      });
    });

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
      process.stderr.write(`Dashboard:    http://localhost:${port}/dashboard\n`);
      process.stderr.write(`SSE endpoint: http://localhost:${port}/sse\n`);
    });
  } else {
    // Stdio mode (default) — for Claude Desktop and Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

function buildIntegrationStatus(herdPath?: string): any[] {
  // Detect Herd bin dir to find herd-mcp.phar
  let binDir: string;
  try {
    const { detectHerd } = require('./herd-detector.js');
    const cfg = detectHerd(herdPath);
    binDir = cfg.binDir;
  } catch {
    binDir = path.join(os.homedir(), '.config', 'herd', 'bin');
  }

  const pharExists = fs.existsSync(path.join(binDir, 'herd-mcp.phar'));

  // Check Claude Desktop config
  const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  const claudeDesktopPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  let claudeDesktopConnected = false;
  try {
    const cfg = JSON.parse(fs.readFileSync(claudeDesktopPath, 'utf8'));
    claudeDesktopConnected = !!(cfg?.mcpServers?.['laravel-herd']);
  } catch { /* not configured */ }

  // Check Claude Code config
  const claudeCodePath = path.join(os.homedir(), '.claude', 'settings.json');
  let claudeCodeConnected = false;
  try {
    const cfg = JSON.parse(fs.readFileSync(claudeCodePath, 'utf8'));
    claudeCodeConnected = !!(cfg?.mcpServers?.['laravel-herd']);
  } catch { /* not configured */ }

  // Check Herd integrations
  const integrationsPath = path.join(os.homedir(), '.config', 'herd', 'config', 'integrations.json');
  let forgeConnected = false;
  try {
    const cfg = JSON.parse(fs.readFileSync(integrationsPath, 'utf8'));
    forgeConnected = !!(cfg?.savedIntegrations?.some((i: any) => i.type === 'forge' && i.status === 'connected'));
  } catch { /* not configured */ }

  return [
    {
      title: 'Laravel Forge',
      subtitle: 'Deploy remote sites to your local applications',
      isConnected: forgeConnected,
      icon: 'forge',
    },
    {
      title: 'Claude Code / Claude Desktop',
      subtitle: '42 CLI tools + 13 HTTP-API tools via laravel-herd-mcp',
      isConnected: claudeDesktopConnected || claudeCodeConnected,
      details: [
        claudeDesktopConnected ? 'Claude Desktop ✓' : 'Claude Desktop —',
        claudeCodeConnected ? 'Claude Code ✓' : 'Claude Code —',
        pharExists ? 'herd-mcp.phar ✓' : 'herd-mcp.phar —',
      ],
      icon: 'claude',
    },
  ];
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
