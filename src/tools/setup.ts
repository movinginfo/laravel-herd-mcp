import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { HerdConfig } from '../herd-detector';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { setupIntegrations } from './setup-logic';

export function registerSetupTools(server: McpServer, herdConfig: HerdConfig, runner: CliRunner): void {
  server.tool(
    'setup_integrations',
    'Configure Claude Desktop and Claude Code to use laravel-herd-mcp. Also registers Claude Code in Herd\'s integrations panel.',
    {},
    async () => {
      try {
        // Resolve PHP binary path dynamically
        const phpExePath = resolvePhpExePath(herdConfig, runner);

        // Resolve our own server path (dist/index.js)
        const mcpServerPath = path.resolve(__dirname, '..', 'index.js');

        const result = setupIntegrations(herdConfig, mcpServerPath, phpExePath);

        const lines = [
          '✅ Laravel Herd MCP integration configured successfully!',
          '',
          `Claude Desktop (${result.claudeDesktop.status}):`,
          `  ${result.claudeDesktop.path}`,
          '',
          `Claude Code (${result.claudeCode.status}):`,
          `  ${result.claudeCode.path}`,
          '',
          `Herd integrations (${result.herdIntegrations.status}):`,
          `  ${result.herdIntegrations.path}`,
          '',
          'Two MCP servers registered:',
          '  • laravel-herd-mcp — 42 CLI tools (this server)',
          '  • laravel-herd-phar — 13 HTTP-API tools (Herd built-in)',
          '',
          'Restart Claude Desktop and reload Claude Code to activate.',
        ];

        return textResult(lines.join('\n'));
      } catch (e) {
        return errorResult(e);
      }
    }
  );
}

function resolvePhpExePath(herdConfig: HerdConfig, runner: CliRunner): string {
  // Try herd which-php first
  try {
    const result = runner.herd(['which-php']);
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch { /* fall through */ }

  // Fall back: scan for php*/php.exe in bin dir
  try {
    const entries = fs.readdirSync(herdConfig.binDir);
    const phpDirs = entries.filter(e => /^php\d/.test(e));
    for (const dir of phpDirs.reverse()) { // highest version first
      const exePath = path.join(herdConfig.binDir, dir, 'php.exe');
      if (fs.existsSync(exePath)) {
        return exePath;
      }
    }
  } catch { /* fall through */ }

  // Last resort: use php.bat path (will still work for running the phar)
  return herdConfig.phpBat;
}
