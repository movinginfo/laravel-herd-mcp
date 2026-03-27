import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

function mergeJson(filePath: string, merge: (existing: Record<string, unknown>) => Record<string, unknown>): void {
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { /* overwrite */ }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(merge(existing), null, 2), 'utf8');
}

export function registerBoostTools(server: McpServer, runner: CliRunner): void {

  // ── Install ────────────────────────────────────────────────────────────────

  server.tool('boost_install',
    'Install Laravel Boost in a project: composer require laravel/boost --dev + php artisan boost:install. ' +
    'Sets up AI coding guidelines in .ai/guidelines/ and registers the project MCP server.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      const lines: string[] = [];
      try {
        // Step 1: composer require
        lines.push('=== composer require laravel/boost --dev ===');
        const req = runner.composer(['require', 'laravel/boost', '--dev', '--no-interaction'], cwd);
        lines.push(req.stdout || req.stderr || '(no output)');
        if (req.exitCode !== 0) {
          return textResult(lines.join('\n') + '\n\nFailed at composer require.');
        }

        // Step 2: php artisan boost:install
        lines.push('\n=== php artisan boost:install ===');
        const install = runner.php(['artisan', 'boost:install'], cwd);
        lines.push(install.stdout || install.stderr || '(no output)');

        lines.push('\nLaravel Boost installed. Run boost_register_mcp to add it to Claude settings.');
        return textResult(lines.join('\n'));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Register project MCP server in Claude Code settings ───────────────────

  server.tool('boost_register_mcp',
    'Register this project\'s Laravel Boost MCP server (php artisan boost:mcp) in Claude Code ~/.claude/settings.json. ' +
    'Each Laravel project gets its own Boost MCP server with project-specific AI guidelines.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      name: z.string().optional().describe('MCP server name (defaults to the project folder name)'),
    },
    async ({ cwd: _cwd, name }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const projectName = name ?? path.basename(cwd);
        const serverName = `boost-${projectName}`;
        const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

        mergeJson(settingsPath, (existing) => {
          const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
          mcpServers[serverName] = {
            command: runner['config'].phpExe,
            args: [path.join(cwd, 'artisan'), 'boost:mcp'],
            env: {},
          };
          return { ...existing, mcpServers };
        });

        return textResult(
          `Registered "${serverName}" in ~/.claude/settings.json\n` +
          `Command: ${runner['config'].phpExe} ${path.join(cwd, 'artisan')} boost:mcp\n\n` +
          `Restart Claude Code to activate the Boost MCP server for "${projectName}".`
        );
      } catch (e) { return errorResult(e); }
    }
  );

  // ── List guidelines ────────────────────────────────────────────────────────

  server.tool('boost_list_guidelines',
    'List AI guidelines installed by Laravel Boost (.ai/guidelines/) for a project.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const guidelinesDir = path.join(cwd, '.ai', 'guidelines');
        if (!fs.existsSync(guidelinesDir)) {
          return textResult('No .ai/guidelines/ directory found. Run boost_install first.');
        }
        const files = walkDir(guidelinesDir).map(f => f.replace(guidelinesDir + path.sep, ''));
        if (files.length === 0) return textResult('No guidelines found in .ai/guidelines/.');
        return textResult('AI guidelines:\n' + files.map(f => `  ${f}`).join('\n'));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Add custom guideline ───────────────────────────────────────────────────

  server.tool('boost_add_guideline',
    'Add or overwrite a custom AI guideline file in .ai/guidelines/. ' +
    'Guidelines are Blade/Markdown files that teach Claude project-specific patterns.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      file: z.string().describe('Relative path inside .ai/guidelines/ e.g. "my-patterns/auth.md"'),
      content: z.string().describe('Guideline content (Markdown or Blade with overview + examples)'),
    },
    async ({ cwd: _cwd, file, content }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const target = path.join(cwd, '.ai', 'guidelines', file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, 'utf8');
        return textResult(`Guideline saved: .ai/guidelines/${file}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Show project MCP config snippet ───────────────────────────────────────

  server.tool('boost_mcp_config',
    'Show the JSON snippet needed to register this project\'s Boost MCP server manually in any editor.',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
      name: z.string().optional().describe('MCP server name (defaults to folder name)'),
    },
    async ({ cwd: _cwd, name }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const projectName = name ?? path.basename(cwd);
        const serverName = `boost-${projectName}`;
        const snippet = {
          mcpServers: {
            [serverName]: {
              command: runner['config'].phpExe,
              args: [path.join(cwd, 'artisan'), 'boost:mcp'],
              env: {},
            },
          },
        };
        return textResult(
          `Add this to your Claude settings (claude_desktop_config.json or ~/.claude/settings.json):\n\n` +
          JSON.stringify(snippet, null, 2)
        );
      } catch (e) { return errorResult(e); }
    }
  );
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else results.push(full);
  }
  return results;
}
