/**
 * Claude Code, VS Code, and Claude Desktop deep integration tools.
 *
 * Covers:
 *  - Claude Code CLI (terminal): install check, MCP registration (~/.claude.json),
 *    CLAUDE.md generation, hooks setup (.claude/settings.json), rules, settings inspect
 *  - VS Code: MCP registration (settings.json / .vscode/mcp.json)
 *  - Claude Desktop: MCP registration (claude_desktop_config.json)
 *
 * Docs: https://code.claude.com/docs/en/settings
 *       https://code.claude.com/docs/en/hooks
 *       https://code.claude.com/docs/en/memory
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

// ── Path helpers ──────────────────────────────────────────────────────────────

const HOME = os.homedir();

/** ~/.claude.json  — user-scope MCP servers (official Claude Code location) */
function claudeJsonPath(): string {
  return path.join(HOME, '.claude.json');
}

/** ~/.claude/settings.json — user-scope hooks, permissions, env */
function claudeSettingsPath(): string {
  return path.join(HOME, '.claude', 'settings.json');
}

/** Project-scope MCP: .mcp.json (checked into git) */
function projectMcpPath(cwd: string): string {
  return path.join(cwd, '.mcp.json');
}

/** Project-scope settings: .claude/settings.json */
function projectSettingsPath(cwd: string): string {
  return path.join(cwd, '.claude', 'settings.json');
}

/** Claude Desktop config */
function claudeDesktopConfigPath(): string {
  if (process.platform === 'darwin') {
    return path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  const appData = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming');
  return path.join(appData, 'Claude', 'claude_desktop_config.json');
}

/** VS Code user settings.json */
function vsCodeSettingsPath(): string {
  if (process.platform === 'darwin') {
    return path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  }
  if (process.platform === 'linux') {
    return path.join(HOME, '.config', 'Code', 'User', 'settings.json');
  }
  const appData = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming');
  return path.join(appData, 'Code', 'User', 'settings.json');
}

// ── JSON merge helpers ────────────────────────────────────────────────────────

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function mergeJson(filePath: string, merge: (obj: Record<string, unknown>) => Record<string, unknown>): void {
  writeJson(filePath, merge(readJson(filePath)));
}

/** Our own server path */
function ownServerPath(): string {
  return path.resolve(__dirname, '..', 'index.js');
}

/** MCP entry for this server */
function herdMcpEntry(group?: string): Record<string, unknown> {
  const args = [ownServerPath()];
  if (group) args.push(`--group=${group}`);
  return { command: 'node', args };
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerClaudeCodeTools(server: McpServer): void {

  // ── claudecode_status ─────────────────────────────────────────────────────

  server.tool(
    'claudecode_status',
    'Check Claude Code CLI installation status: version, config file paths, registered MCP servers, CLAUDE.md presence, and settings.',
    {
      cwd: z.string().optional().describe('Project directory to also check project-level config'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = _cwd ?? process.cwd();
      const lines: string[] = ['## Claude Code Integration Status', ''];

      // ── CLI version ──
      const cli = spawnSync('claude', ['--version'], { encoding: 'utf8', shell: true });
      if (cli.status === 0) {
        lines.push(`Claude Code CLI: ✓ installed (${cli.stdout.trim()})`);
      } else {
        lines.push('Claude Code CLI: ✗ not found');
        lines.push('  Install: curl -fsSL https://claude.ai/install.sh | bash');
        lines.push('  Windows: irm https://claude.ai/install.ps1 | iex');
      }

      // ── MCP config (~/.claude.json) ──
      lines.push('');
      const mcpJson = readJson(claudeJsonPath());
      const userMcp = (mcpJson.mcpServers ?? {}) as Record<string, unknown>;
      const userMcpCount = Object.keys(userMcp).length;
      lines.push(`User MCP servers (~/.claude.json): ${userMcpCount} registered`);
      for (const [name] of Object.entries(userMcp)) {
        const isHerd = name.startsWith('laravel-herd');
        lines.push(`  ${isHerd ? '★' : '•'} ${name}`);
      }
      if (userMcpCount === 0) {
        lines.push('  (none — run claudecode_register_mcp to add laravel-herd-mcp)');
      }

      // ── Project .mcp.json ──
      const projectMcp = readJson(projectMcpPath(cwd));
      const projMcpServers = (projectMcp.mcpServers ?? {}) as Record<string, unknown>;
      const projMcpCount = Object.keys(projMcpServers).length;
      lines.push('');
      lines.push(`Project MCP servers (.mcp.json): ${projMcpCount} registered`);
      for (const [name] of Object.entries(projMcpServers)) {
        lines.push(`  • ${name}`);
      }

      // ── User settings ──
      lines.push('');
      const settings = readJson(claudeSettingsPath());
      const hooksCount = Object.keys((settings.hooks ?? {}) as object).length;
      const permsCount = (((settings.permissions as any)?.allow ?? []) as unknown[]).length
        + (((settings.permissions as any)?.deny ?? []) as unknown[]).length;
      lines.push(`User settings (~/.claude/settings.json):`);
      lines.push(`  Hooks configured: ${hooksCount} event(s)`);
      lines.push(`  Permission rules: ${permsCount}`);

      // ── CLAUDE.md ──
      lines.push('');
      const claudeMdPaths = [
        path.join(cwd, 'CLAUDE.md'),
        path.join(cwd, '.claude', 'CLAUDE.md'),
        path.join(HOME, '.claude', 'CLAUDE.md'),
      ];
      for (const p of claudeMdPaths) {
        const exists = fs.existsSync(p);
        const label = p.startsWith(HOME + path.sep + '.claude') ? 'User' : 'Project';
        lines.push(`  ${label} CLAUDE.md [${p.replace(HOME, '~')}]: ${exists ? '✓ exists' : '✗ missing'}`);
      }

      // ── .claude/rules/ ──
      const rulesDir = path.join(cwd, '.claude', 'rules');
      const userRulesDir = path.join(HOME, '.claude', 'rules');
      lines.push('');
      lines.push(`Rules:`);
      lines.push(`  Project .claude/rules/: ${fs.existsSync(rulesDir) ? fs.readdirSync(rulesDir).length + ' file(s)' : 'not set up'}`);
      lines.push(`  User ~/.claude/rules/: ${fs.existsSync(userRulesDir) ? fs.readdirSync(userRulesDir).length + ' file(s)' : 'not set up'}`);

      lines.push('');
      lines.push('Quick setup: claudecode_setup  (runs all setup steps at once)');

      return textResult(lines.join('\n'));
    }
  );

  // ── claudecode_setup ──────────────────────────────────────────────────────

  server.tool(
    'claudecode_setup',
    'One-command full setup: register laravel-herd-mcp in Claude Code (~/.claude.json), generate CLAUDE.md for the project, and set up Laravel-specific hooks in .claude/settings.json. Use this for a new Laravel project.',
    {
      cwd:    z.string().optional().describe('Laravel project root — defaults to active project'),
      scope:  z.enum(['user', 'project']).optional().describe('Where to register MCP: "user" (~/.claude.json, default) or "project" (.mcp.json, committed to git)'),
    },
    async ({ cwd: _cwd, scope = 'user' }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);

      const lines: string[] = ['## Laravel Herd MCP — Claude Code Setup', ''];
      const projectName = path.basename(cwd);

      // 1. Register MCP
      if (scope === 'user') {
        mergeJson(claudeJsonPath(), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = herdMcpEntry();
          return cfg;
        });
        lines.push(`✓ MCP registered in ~/.claude.json (user scope)`);
      } else {
        mergeJson(projectMcpPath(cwd), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = herdMcpEntry();
          return cfg;
        });
        lines.push(`✓ MCP registered in .mcp.json (project scope — commit this file)`);
      }

      // 2. Generate CLAUDE.md
      const claudeMd = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(claudeMd)) {
        fs.writeFileSync(claudeMd, buildLaravelClaudeMd(projectName, cwd), 'utf8');
        lines.push(`✓ CLAUDE.md generated at ${claudeMd}`);
      } else {
        lines.push(`  CLAUDE.md already exists — skipped (run claudecode_generate_claude_md to regenerate)`);
      }

      // 3. Set up hooks
      setupLaravelHooks(cwd);
      lines.push(`✓ Laravel hooks configured in .claude/settings.json`);

      // 4. Set up rules
      const rulesSetup = setupLaravelRules(cwd);
      lines.push(`✓ Laravel rules created in .claude/rules/ (${rulesSetup} files)`);

      lines.push('');
      lines.push('Restart Claude Code to activate the MCP server.');
      lines.push('Run /mcp in Claude Code to verify the connection.');
      lines.push('Run claudecode_status to inspect the full configuration.');

      return textResult(lines.join('\n'));
    }
  );

  // ── claudecode_register_mcp ───────────────────────────────────────────────

  server.tool(
    'claudecode_register_mcp',
    'Register laravel-herd-mcp in Claude Code. User scope writes to ~/.claude.json (applies to all projects). Project scope writes to .mcp.json (committed to git, shared with team). Supports --group flag for 100-tool-limit clients.',
    {
      cwd:    z.string().optional().describe('Laravel project root (needed for project scope)'),
      scope:  z.enum(['user', 'project']).optional().describe('"user" = ~/.claude.json (default), "project" = .mcp.json in project'),
      group:  z.enum(['all', 'herd', 'laravel', 'monitoring']).optional().describe('Tool group — omit for all 218 tools, or set for focused group'),
      name:   z.string().optional().describe('Custom MCP server name (default: "laravel-herd")'),
    },
    async ({ cwd: _cwd, scope = 'user', group, name = 'laravel-herd' }) => {
      try {
        const entry = herdMcpEntry(group);

        if (scope === 'user') {
          mergeJson(claudeJsonPath(), (cfg) => {
            cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
            (cfg.mcpServers as Record<string, unknown>)[name] = entry;
            return cfg;
          });
          return textResult([
            `✓ "${name}" registered in ~/.claude.json`,
            `  Command: node ${ownServerPath()}${group ? ` --group=${group}` : ''}`,
            '',
            'Restart Claude Code (or reload MCP) to activate.',
            'Verify with: /mcp in Claude Code terminal',
            '',
            'Tip: run claudecode_register_mcp again with a different --group to add multiple instances.',
          ].join('\n'));
        }

        // Project scope
        const cwd = resolveCwd(_cwd);
        if (!cwd) return errorResult('Project scope requires a cwd or active project.');
        mergeJson(projectMcpPath(cwd), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)[name] = entry;
          return cfg;
        });
        return textResult([
          `✓ "${name}" registered in ${cwd}/.mcp.json`,
          `  Command: node ${ownServerPath()}${group ? ` --group=${group}` : ''}`,
          '',
          'Commit .mcp.json to share this MCP config with your team.',
          'Claude Code will prompt team members to approve it on first use.',
          'To auto-approve: add "enableAllProjectMcpServers": true to ~/.claude/settings.json',
        ].join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── claudecode_mcp_list ───────────────────────────────────────────────────

  server.tool(
    'claudecode_mcp_list',
    'List all MCP servers registered in Claude Code: user-scope (~/.claude.json) and project-scope (.mcp.json).',
    {
      cwd: z.string().optional().describe('Project directory to also check .mcp.json'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = _cwd ?? process.cwd();
      const lines: string[] = [];

      // User scope
      const userCfg = readJson(claudeJsonPath());
      const userServers = (userCfg.mcpServers ?? {}) as Record<string, unknown>;
      lines.push(`## User MCP Servers (~/.claude.json) — ${Object.keys(userServers).length} registered`);
      if (Object.keys(userServers).length === 0) {
        lines.push('  (none)');
      } else {
        for (const [name, entry] of Object.entries(userServers)) {
          const e = entry as any;
          lines.push(`  • ${name}`);
          lines.push(`    ${e.command} ${(e.args ?? []).join(' ')}`);
        }
      }

      // Project scope
      lines.push('');
      const projCfg = readJson(projectMcpPath(cwd));
      const projServers = (projCfg.mcpServers ?? {}) as Record<string, unknown>;
      lines.push(`## Project MCP Servers (.mcp.json) — ${Object.keys(projServers).length} registered`);
      if (Object.keys(projServers).length === 0) {
        lines.push('  (none)');
      } else {
        for (const [name, entry] of Object.entries(projServers)) {
          const e = entry as any;
          lines.push(`  • ${name}`);
          lines.push(`    ${e.command} ${(e.args ?? []).join(' ')}`);
        }
      }

      lines.push('');
      lines.push('To add: claudecode_register_mcp');
      lines.push('To verify in CLI: run /mcp in Claude Code terminal');

      return textResult(lines.join('\n'));
    }
  );

  // ── claudecode_generate_claude_md ─────────────────────────────────────────

  server.tool(
    'claudecode_generate_claude_md',
    'Generate or update a CLAUDE.md for a Laravel project. Includes build commands, testing, code style, Laravel conventions, Herd MCP tools available, and project-specific notes. CLAUDE.md is loaded into every Claude Code session.',
    {
      cwd:      z.string().optional().describe('Laravel project root — defaults to active project'),
      overwrite: z.boolean().optional().describe('Overwrite existing CLAUDE.md (default: false — only creates if missing)'),
      scope:    z.enum(['project', 'user']).optional().describe('"project" = CLAUDE.md in project root (default), "user" = ~/.claude/CLAUDE.md'),
      extra:    z.string().optional().describe('Extra notes to append to CLAUDE.md (architecture decisions, special workflows, etc.)'),
    },
    async ({ cwd: _cwd, overwrite = false, scope = 'project', extra }) => {
      const cwd = scope === 'project' ? resolveCwd(_cwd) : null;
      if (scope === 'project' && !cwd) return errorResult(NO_PROJECT_MSG);

      const targetPath = scope === 'project'
        ? path.join(cwd!, 'CLAUDE.md')
        : path.join(HOME, '.claude', 'CLAUDE.md');

      if (fs.existsSync(targetPath) && !overwrite) {
        return textResult([
          `CLAUDE.md already exists at ${targetPath}`,
          'Pass overwrite=true to regenerate.',
          '',
          'Current content preview:',
          fs.readFileSync(targetPath, 'utf8').split('\n').slice(0, 20).join('\n'),
          '...',
        ].join('\n'));
      }

      const projectName = scope === 'project' ? path.basename(cwd!) : 'All Laravel Projects';
      let content = buildLaravelClaudeMd(projectName, cwd ?? HOME);
      if (extra) content += `\n\n## Project Notes\n\n${extra}\n`;

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');

      return textResult([
        `✓ CLAUDE.md ${fs.existsSync(targetPath) ? 'updated' : 'created'}: ${targetPath}`,
        '',
        'This file is loaded into every Claude Code session for this project.',
        'Edit it to add project-specific architecture decisions, conventions, or workflows.',
        '',
        '--- Preview ---',
        content.split('\n').slice(0, 30).join('\n'),
        '...',
      ].join('\n'));
    }
  );

  // ── claudecode_hooks_setup ────────────────────────────────────────────────

  server.tool(
    'claudecode_hooks_setup',
    'Set up Claude Code hooks for a Laravel project in .claude/settings.json. Includes: auto-run Pint formatter after file edits, test hint after migration files, and session-start Herd status check. Hooks run automatically during Claude Code sessions.',
    {
      cwd:          z.string().optional().describe('Laravel project root — defaults to active project'),
      pint:         z.boolean().optional().describe('Auto-run Laravel Pint formatter after PHP file edits (default: true)'),
      test_hint:    z.boolean().optional().describe('Hint to run tests after editing test files (default: true)'),
      herd_check:   z.boolean().optional().describe('Check Herd is running at session start (default: true)'),
      scope:        z.enum(['project', 'user']).optional().describe('"project" = .claude/settings.json (default), "user" = ~/.claude/settings.json'),
    },
    async ({ cwd: _cwd, pint = true, test_hint = true, herd_check = true, scope = 'project' }) => {
      const cwd = scope === 'project' ? resolveCwd(_cwd) : null;
      if (scope === 'project' && !cwd) return errorResult(NO_PROJECT_MSG);

      const settingsFile = scope === 'project'
        ? projectSettingsPath(cwd!)
        : claudeSettingsPath();

      // Create hooks directory if needed
      const hooksDir = scope === 'project'
        ? path.join(cwd!, '.claude', 'hooks')
        : path.join(HOME, '.claude', 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      const hookScripts: { name: string; content: string; registered: boolean }[] = [];

      // ── Pint hook script ────────────────────────────────────────────────
      if (pint) {
        const pintScript = path.join(hooksDir, 'pint.sh');
        if (process.platform === 'win32') {
          // Windows: use PowerShell
          const ps1 = path.join(hooksDir, 'pint.ps1');
          fs.writeFileSync(ps1, [
            '# Auto-run Laravel Pint formatter after PHP file edits',
            '$input_json = $input | ConvertFrom-Json',
            '$file = $input_json.tool_input.file_path',
            'if ($file -and $file -match "\\.php$") {',
            '  $pint = ".\\vendor\\bin\\pint.bat"',
            '  if (Test-Path $pint) {',
            '    & $pint $file --quiet 2>$null',
            '  }',
            '}',
            'exit 0',
          ].join('\n'), 'utf8');
          hookScripts.push({ name: 'pint.ps1', content: ps1, registered: true });
        } else {
          fs.writeFileSync(pintScript, [
            '#!/bin/bash',
            '# Auto-run Laravel Pint formatter after PHP file edits',
            'FILE=$(cat /dev/stdin | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\'tool_input\',{}).get(\'file_path\',\'\'))" 2>/dev/null)',
            'if [[ "$FILE" == *.php ]] && [ -f "vendor/bin/pint" ]; then',
            '  ./vendor/bin/pint "$FILE" --quiet 2>/dev/null || true',
            'fi',
            'exit 0',
          ].join('\n'), 'utf8');
          fs.chmodSync(pintScript, '755');
          hookScripts.push({ name: 'pint.sh', content: pintScript, registered: true });
        }
      }

      // ── Test hint script ────────────────────────────────────────────────
      if (test_hint) {
        const testHintScript = path.join(hooksDir, 'test-hint.sh');
        if (process.platform !== 'win32') {
          fs.writeFileSync(testHintScript, [
            '#!/bin/bash',
            '# Suggest running tests after editing test files',
            'FILE=$(cat /dev/stdin | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\'tool_input\',{}).get(\'file_path\',\'\'))" 2>/dev/null)',
            'if [[ "$FILE" == *Test.php ]] || [[ "$FILE" == *.test.php ]] || [[ "$FILE" == */tests/* ]]; then',
            '  echo \'{"systemMessage": "Tip: run php artisan test to verify your changes."}\' ',
            'fi',
            'exit 0',
          ].join('\n'), 'utf8');
          fs.chmodSync(testHintScript, '755');
          hookScripts.push({ name: 'test-hint.sh', content: testHintScript, registered: true });
        }
      }

      // ── Build hooks config ───────────────────────────────────────────────
      const hooksConfig: Record<string, unknown[]> = {};

      if (pint) {
        const pintCmd = process.platform === 'win32'
          ? `powershell -File "${path.join(hooksDir, 'pint.ps1')}"`
          : path.join(hooksDir, 'pint.sh');
        hooksConfig['PostToolUse'] = [
          {
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: pintCmd, async: true }],
          },
        ];
      }

      if (herd_check) {
        const isWin = process.platform === 'win32';
        const checkCmd = isWin
          ? 'herd status 2>nul && echo OK || echo "Herd not running — start with: herd start"'
          : 'herd status 2>/dev/null && echo OK || echo "Herd not running — start with: herd start"';
        hooksConfig['SessionStart'] = [
          {
            hooks: [{ type: 'command', command: checkCmd, async: true }],
          },
        ];
      }

      if (test_hint && process.platform !== 'win32') {
        const testHintCmd = path.join(hooksDir, 'test-hint.sh');
        const existing = (hooksConfig['PostToolUse'] ?? []) as unknown[];
        existing.push({
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: testHintCmd, async: true }],
        });
        hooksConfig['PostToolUse'] = existing;
      }

      // Merge into settings file
      mergeJson(settingsFile, (cfg) => {
        cfg.hooks = hooksConfig;
        return cfg;
      });

      const lines = [
        `✓ Hooks configured in ${settingsFile.replace(HOME, '~')}`,
        '',
        `Hooks registered:`,
        pint     ? `  • PostToolUse (Edit|Write → PHP) — run Pint formatter` : '',
        test_hint ? `  • PostToolUse (Edit|Write → test files) — suggest running tests` : '',
        herd_check ? `  • SessionStart — verify Herd is running` : '',
        '',
        'Hook scripts:',
        ...hookScripts.map(s => `  ${s.name} → ${s.content}`),
        '',
        'View all hooks: run /hooks in Claude Code terminal',
        'Disable all hooks: add "disableAllHooks": true to settings.json',
      ].filter(Boolean);

      return textResult(lines.join('\n'));
    }
  );

  // ── claudecode_rules_setup ────────────────────────────────────────────────

  server.tool(
    'claudecode_rules_setup',
    'Create .claude/rules/ directory with Laravel-specific rule files that load on demand. Rules are scoped to file patterns (e.g. PHP files, migrations, tests) and save context window space vs CLAUDE.md.',
    {
      cwd:   z.string().optional().describe('Laravel project root — defaults to active project'),
      scope: z.enum(['project', 'user']).optional().describe('"project" (default) or "user" (~/.claude/rules/)'),
    },
    async ({ cwd: _cwd, scope = 'project' }) => {
      const cwd = scope === 'project' ? resolveCwd(_cwd) : null;
      if (scope === 'project' && !cwd) return errorResult(NO_PROJECT_MSG);

      const rulesDir = scope === 'project'
        ? path.join(cwd!, '.claude', 'rules')
        : path.join(HOME, '.claude', 'rules');

      const created = setupLaravelRules(scope === 'project' ? cwd! : HOME, rulesDir);

      return textResult([
        `✓ Created ${created} rule files in ${rulesDir.replace(HOME, '~')}`,
        '',
        'Rule files created:',
        '  • laravel.md        — Laravel conventions (always loaded)',
        '  • php-files.md      — PHP coding standards (loads for *.php files)',
        '  • migrations.md     — Migration best practices (loads for database/migrations/**)',
        '  • tests.md          — Testing patterns with Pest/PHPUnit (loads for tests/**)',
        '  • blade.md          — Blade template conventions (loads for *.blade.php)',
        '',
        'Rules are loaded on demand — only when Claude works with matching files.',
        'Edit any file in .claude/rules/ to customize for your project.',
        'View loaded rules: run /memory in Claude Code terminal',
      ].join('\n'));
    }
  );

  // ── claudecode_settings_show ──────────────────────────────────────────────

  server.tool(
    'claudecode_settings_show',
    'Display current Claude Code settings: user (~/.claude/settings.json) and project (.claude/settings.json) scopes.',
    {
      cwd:   z.string().optional().describe('Project directory for project settings'),
      scope: z.enum(['user', 'project', 'both']).optional().describe('Which settings to show (default: both)'),
    },
    async ({ cwd: _cwd, scope = 'both' }) => {
      const cwd = _cwd ?? process.cwd();
      const lines: string[] = [];

      if (scope === 'user' || scope === 'both') {
        const p = claudeSettingsPath();
        lines.push(`## User Settings (~/.claude/settings.json)`);
        if (fs.existsSync(p)) {
          lines.push(fs.readFileSync(p, 'utf8'));
        } else {
          lines.push('(file not found)');
        }
      }

      if (scope === 'project' || scope === 'both') {
        const p = projectSettingsPath(cwd);
        lines.push(`\n## Project Settings (.claude/settings.json)`);
        if (fs.existsSync(p)) {
          lines.push(fs.readFileSync(p, 'utf8'));
        } else {
          lines.push('(file not found — run claudecode_hooks_setup to create)');
        }
      }

      return textResult(lines.join('\n'));
    }
  );

  // ── claudecode_settings_set ───────────────────────────────────────────────

  server.tool(
    'claudecode_settings_set',
    'Set a value in Claude Code settings.json. Supports nested keys with dot notation (e.g. "permissions.allow"). Use for enabling auto mode, setting default shell, model overrides, etc.',
    {
      key:   z.string().describe('Setting key, e.g. "model", "defaultShell", "autoMemoryEnabled", "enableAllProjectMcpServers"'),
      value: z.string().describe('JSON value, e.g. "claude-sonnet-4-6", "powershell", "true", "false"'),
      scope: z.enum(['user', 'project']).optional().describe('"user" = ~/.claude/settings.json (default), "project" = .claude/settings.json'),
      cwd:   z.string().optional().describe('Project directory (needed for project scope)'),
    },
    async ({ key, value, scope = 'user', cwd: _cwd }) => {
      const cwd = scope === 'project' ? (resolveCwd(_cwd) ?? process.cwd()) : process.cwd();
      const settingsFile = scope === 'user' ? claudeSettingsPath() : projectSettingsPath(cwd);

      try {
        const parsed = JSON.parse(value);
        mergeJson(settingsFile, (cfg) => {
          // Support dot notation
          const keys = key.split('.');
          let obj: any = cfg;
          for (let i = 0; i < keys.length - 1; i++) {
            if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) {
              obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
          }
          obj[keys[keys.length - 1]] = parsed;
          return cfg;
        });

        return textResult([
          `✓ Set ${key} = ${value}`,
          `  in ${settingsFile.replace(HOME, '~')}`,
        ].join('\n'));
      } catch {
        return errorResult(`Invalid JSON value: ${value}\nExamples: "true", "false", '"claude-sonnet-4-6"', '["rule1","rule2"]'`);
      }
    }
  );

  // ── vscode_setup_mcp ──────────────────────────────────────────────────────

  server.tool(
    'vscode_setup_mcp',
    'Register laravel-herd-mcp in VS Code. Writes to the user settings.json (Copilot/Continue MCP format). Also shows how to add a .vscode/mcp.json for workspace-scoped config.',
    {
      cwd:   z.string().optional().describe('Workspace root (optional — for .vscode/mcp.json snippet)'),
      group: z.enum(['all', 'herd', 'laravel', 'monitoring']).optional().describe('Tool group (default: all)'),
    },
    async ({ cwd: _cwd, group }) => {
      try {
        const settingsFile = vsCodeSettingsPath();
        const entry = herdMcpEntry(group);

        mergeJson(settingsFile, (cfg) => {
          if (!cfg.mcp || typeof cfg.mcp !== 'object') cfg.mcp = {};
          const mcp = cfg.mcp as any;
          if (!mcp.servers) mcp.servers = {};
          mcp.servers['laravel-herd'] = { type: 'stdio', ...entry };
          return cfg;
        });

        const vscodeMcpSnippet = JSON.stringify({
          servers: {
            'laravel-herd': { type: 'stdio', ...entry },
          },
        }, null, 2);

        const lines = [
          `✓ laravel-herd registered in VS Code settings`,
          `  File: ${settingsFile.replace(HOME, '~')}`,
          '',
          'Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window") to activate.',
          '',
          '## Workspace-scoped alternative',
          'Create .vscode/mcp.json in your project for team sharing:',
          '',
          vscodeMcpSnippet,
          '',
          '## Verify',
          'Open Command Palette → "MCP: List Servers" to see registered servers.',
          'The Details + Manifest tabs appear after the first tool call (lazy startup).',
        ];

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── claude_desktop_setup_mcp ──────────────────────────────────────────────

  server.tool(
    'claude_desktop_setup_mcp',
    'Register laravel-herd-mcp in Claude Desktop app (claude_desktop_config.json). Works on Windows and macOS.',
    {
      group: z.enum(['all', 'herd', 'laravel', 'monitoring']).optional().describe('Tool group (default: all 218 tools)'),
    },
    async ({ group }) => {
      try {
        const configFile = claudeDesktopConfigPath();
        const entry = herdMcpEntry(group);

        mergeJson(configFile, (cfg) => {
          if (!cfg.mcpServers) cfg.mcpServers = {};
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = entry;
          return cfg;
        });

        const lines = [
          `✓ laravel-herd registered in Claude Desktop`,
          `  File: ${configFile.replace(HOME, '~')}`,
          '',
          'Restart Claude Desktop to activate the MCP server.',
          '',
          '## Config file location',
          process.platform === 'darwin'
            ? '  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json'
            : `  Windows: %APPDATA%\\Claude\\claude_desktop_config.json`,
          '',
          '## Current config',
          JSON.stringify(readJson(configFile), null, 2),
        ];

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}

// ── CLAUDE.md template ────────────────────────────────────────────────────────

function buildLaravelClaudeMd(projectName: string, cwd: string): string {
  const hasPest   = fs.existsSync(path.join(cwd, 'vendor', 'bin', 'pest'));
  const hasPint   = fs.existsSync(path.join(cwd, 'vendor', 'bin', 'pint'));
  const hasArtisan = fs.existsSync(path.join(cwd, 'artisan'));
  const hasBun    = fs.existsSync(path.join(cwd, 'bun.lock')) || fs.existsSync(path.join(cwd, 'bun.lockb'));
  const hasNode   = fs.existsSync(path.join(cwd, 'package.json'));
  const testCmd   = hasPest ? './vendor/bin/pest' : 'php artisan test';
  const pkgMgr    = hasBun ? 'bun' : 'npm';

  return `# ${projectName}

## Build & Test Commands

${hasArtisan ? '- Migrate: `php artisan migrate`' : ''}
${hasArtisan ? '- Seed: `php artisan db:seed`' : ''}
${hasArtisan ? '- Tinker: `php artisan tinker`' : ''}
${hasArtisan ? '- Routes: `php artisan route:list`' : ''}
${hasArtisan ? '- Clear all: `php artisan optimize:clear`' : ''}
- Test: \`${testCmd}\`
${hasPint ? '- Format: `./vendor/bin/pint`' : ''}
${hasNode ? `- Install frontend: \`${pkgMgr} install\`` : ''}
${hasNode ? `- Build frontend: \`${pkgMgr} run build\`` : ''}

## Laravel Conventions

- Models: singular PascalCase (User, Post, Order)
- Controllers: plural + Controller (UsersController, PostsController)
- Use Form Requests for validation logic
- Prefer Eloquent over raw DB queries; use eager loading to avoid N+1
- API resources live in \`app/Http/Resources/\`
- Jobs in \`app/Jobs/\`, Events in \`app/Events/\`, Listeners in \`app/Listeners/\`
- Policies in \`app/Policies/\` for authorization
- Follow PSR-12 coding standards${hasPint ? ' — enforced by Pint' : ''}

## Testing

- Framework: ${hasPest ? 'Pest (preferred)' : 'PHPUnit'}
- Use \`RefreshDatabase\` trait for database tests
- Use factories (\`User::factory()->create()\`) for test data
- Test files: \`tests/Unit/\` and \`tests/Feature/\`
- Never use real external services in tests — use fakes/mocks

## Code Style

- PHP 8.x — use typed properties, match expressions, named arguments, enums
- Return types and parameter types required everywhere
- Docblocks only when type cannot be inferred
- No trailing whitespace, Unix line endings
${hasPint ? '- Run `./vendor/bin/pint` before committing' : ''}

## Herd MCP Tools Available

The following tool categories are available via laravel-herd-mcp:
- **artisan** — run artisan commands, manage migrations, routes, schedule
- **composer** — manage packages, autoload, scripts
- **database** — db:show, db:table, direct SQL queries, seeding
- **telescope** — debug: requests, queries, exceptions, jobs (if installed)
- **pulse** — APM: servers, slow requests/queries/jobs (if installed)
- **debugbar** — request profiling (if installed)
- **nightwatch** — cloud monitoring (if installed)
- **forge** — deploy to Laravel Forge (if configured)
- **queue** — manage jobs, failed jobs, Horizon
- **cache** — clear app/config/view/route cache
- **skills** — browse skills.laravel.cloud, install AI agent skills

Run \`project_select\` to set this as the active project for all tools.
`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ── Rules setup ───────────────────────────────────────────────────────────────

function setupLaravelRules(cwd: string, rulesDir?: string): number {
  const dir = rulesDir ?? path.join(cwd, '.claude', 'rules');
  fs.mkdirSync(dir, { recursive: true });

  const rules: { file: string; content: string }[] = [
    {
      file: 'laravel.md',
      content: `# Laravel Project Rules

Always follow Laravel conventions:
- Prefer Eloquent ORM over raw DB queries
- Use eager loading (\`->with()\`) to prevent N+1 query problems
- Put business logic in Service classes, not Controllers
- Use Repository pattern for complex data access
- Validate with Form Requests (\`php artisan make:request\`)
- Use Laravel's built-in auth helpers — never roll custom auth
- Jobs should be queued for long-running tasks (\`ShouldQueue\`)
- Use Events and Listeners for decoupled communication
- Cache expensive operations with \`Cache::remember()\`
`,
    },
    {
      file: 'php-files.md',
      content: `---
paths:
  - "**/*.php"
---

# PHP Coding Standards

- PHP 8.x minimum — use typed properties, constructor promotion, match, enums, fibers
- All functions and methods must have return types
- All parameters must have types
- Use \`readonly\` properties where possible
- Prefer \`array\` type hints with generics in docblocks
- No unused imports or variables
- String interpolation: use \`"Hello {$name}"\` not concatenation
- Null safety: use \`?\` types and null coalescing \`??\`
- Run \`./vendor/bin/pint\` to auto-format after editing
`,
    },
    {
      file: 'migrations.md',
      content: `---
paths:
  - "database/migrations/**"
---

# Migration Rules

- Never modify existing migrations — create new ones
- Always add down() method to reverse the migration
- Use appropriate column types (foreignId, unsignedBigInteger, etc.)
- Add indexes for columns used in WHERE/JOIN clauses
- Foreign keys: use \`->constrained()->cascadeOnDelete()\`
- After creating: run \`php artisan migrate\`
- After reverting: run \`php artisan migrate:rollback\`
`,
    },
    {
      file: 'tests.md',
      content: `---
paths:
  - "tests/**"
  - "**/*Test.php"
  - "**/*.test.php"
---

# Testing Rules

- Use \`RefreshDatabase\` for DB tests; \`DatabaseTransactions\` for faster tests
- Use factories for all test data — never insert raw DB rows
- Each test should test ONE thing (arrange, act, assert)
- Use \`Http::fake()\`, \`Mail::fake()\`, \`Queue::fake()\` for isolation
- Test file naming: \`UserTest.php\`, \`CreateUserTest.php\`
- Test method naming: \`test_it_creates_a_user()\` or describe/it with Pest
- Run tests: \`php artisan test\` or \`./vendor/bin/pest\`
- Run single test: \`php artisan test --filter=UserTest\`
`,
    },
    {
      file: 'blade.md',
      content: `---
paths:
  - "**/*.blade.php"
---

# Blade Template Rules

- Use \`{{ $var }}\` (escaped) not \`{!! $var !!}\` unless you trust the source
- Prefer components (\`<x-button>\`) over @include for reusability
- Keep logic minimal in views — use View Composers for complex data
- Use \`@csrf\` in every form
- Translate user-facing strings with \`{{ __('key') }}\`
- Tailwind/CSS class strings: keep in template, not PHP
`,
    },
  ];

  let count = 0;
  for (const { file, content } of rules) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf8');
      count++;
    }
  }

  return count;
}

// ── Hooks setup (re-used by claudecode_setup) ─────────────────────────────────

function setupLaravelHooks(cwd: string): void {
  const hooksDir = path.join(cwd, '.claude', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const isWin = process.platform === 'win32';

  // Pint hook
  if (isWin) {
    fs.writeFileSync(path.join(hooksDir, 'pint.ps1'), [
      '# Auto-format PHP files with Pint',
      '$input_json = $input | ConvertFrom-Json',
      '$file = $input_json.tool_input.file_path',
      'if ($file -and $file -match "\\.php$") {',
      '  if (Test-Path ".\\vendor\\bin\\pint.bat") {',
      '    & ".\\vendor\\bin\\pint.bat" $file --quiet 2>$null',
      '  }',
      '}',
      'exit 0',
    ].join('\n'), 'utf8');
  } else {
    const sh = path.join(hooksDir, 'pint.sh');
    fs.writeFileSync(sh, [
      '#!/bin/bash',
      'FILE=$(cat /dev/stdin | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\'tool_input\',{}).get(\'file_path\',\'\'))" 2>/dev/null)',
      'if [[ "$FILE" == *.php ]] && [ -f "vendor/bin/pint" ]; then',
      '  ./vendor/bin/pint "$FILE" --quiet 2>/dev/null || true',
      'fi',
      'exit 0',
    ].join('\n'), 'utf8');
    fs.chmodSync(sh, '755');
  }

  // Settings
  const settingsFile = projectSettingsPath(cwd);
  const pintCmd = isWin
    ? `powershell -File "${path.join(hooksDir, 'pint.ps1')}"`
    : path.join(hooksDir, 'pint.sh');

  mergeJson(settingsFile, (cfg) => {
    cfg.hooks = {
      PostToolUse: [
        { matcher: 'Edit|Write', hooks: [{ type: 'command', command: pintCmd, async: true }] },
      ],
      SessionStart: [
        { hooks: [{ type: 'command', command: isWin ? 'herd status 2>nul' : 'herd status 2>/dev/null', async: true }] },
      ],
    };
    return cfg;
  });
}
