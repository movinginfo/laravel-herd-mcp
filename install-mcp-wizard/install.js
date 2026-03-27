#!/usr/bin/env node
/**
 * laravel-herd-mcp — MCP Installation Wizard
 *
 * Automatically detects installed AI IDEs / MCP clients and adds the
 * laravel-herd MCP server entry to each one's config file.
 *
 * Usage:
 *   node install-mcp-wizard/install.js            — interactive (recommended)
 *   node install-mcp-wizard/install.js --yes      — auto-install all detected
 *   node install-mcp-wizard/install.js --list     — list detected IDEs only
 *   node install-mcp-wizard/install.js --dry-run  — show what would change
 *
 * Source: https://github.com/movinginfo/laravel-herd-mcp
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const readline = require('readline');
const { execSync } = require('child_process');

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_NAME = 'laravel-herd';
const PACKAGE     = 'laravel-herd-mcp';
const REPO        = 'https://github.com/movinginfo/laravel-herd-mcp';

const isWin  = process.platform === 'win32';
const isMac  = process.platform === 'darwin';

const args     = process.argv.slice(2);
const YES      = args.includes('--yes');
const LIST     = args.includes('--list');
const DRY_RUN  = args.includes('--dry-run');

// ─── Path helpers ─────────────────────────────────────────────────────────────

function expandPath(p) {
  // Expand ~ and %APPDATA%-style Windows env vars
  p = p.replace(/^~/, os.homedir());
  p = p.replace(/%(\w+)%/gi, (_, k) => process.env[k] || '');
  return path.resolve(p);
}

function dirExists(p) {
  try { return fs.statSync(expandPath(p)).isDirectory(); } catch { return false; }
}

function fileExists(p) {
  try { return fs.statSync(expandPath(p)).isFile(); } catch { return false; }
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function backupAndWrite(filePath, data) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.mcp-wizard.bak');
  }
  writeJson(filePath, data);
}

// ─── IDE definitions ──────────────────────────────────────────────────────────

/**
 * Format types:
 *   vscode      — settings.json under mcp.servers.<name>
 *   mcpServers  — standard { mcpServers: { name: { command, args } } }
 *   zed         — context_servers.<name>.command.{ path, args }
 *   toml        — append [[mcp_servers]] block (Codex CLI)
 *   phpstorm    — manual only (XML, version-dependent)
 */

const IDES = [
  // ── Claude Desktop ──────────────────────────────────────────────────────────
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    icon: '🤖',
    format: 'mcpServers',
    configPath: isWin
      ? '%APPDATA%\\Claude\\claude_desktop_config.json'
      : isMac
      ? '~/Library/Application Support/Claude/claude_desktop_config.json'
      : '~/.config/Claude/claude_desktop_config.json',
    detectDir: isWin
      ? '%APPDATA%\\Claude'
      : isMac
      ? '~/Library/Application Support/Claude'
      : '~/.config/Claude',
    afterInstall: 'Restart Claude Desktop to apply.',
  },

  // ── Claude Code ─────────────────────────────────────────────────────────────
  {
    id: 'claude-code',
    name: 'Claude Code (CLI)',
    icon: '💻',
    format: 'mcpServers',
    configPath: isWin
      ? '%USERPROFILE%\\.claude\\settings.json'
      : '~/.claude/settings.json',
    detectDir: isWin ? '%USERPROFILE%\\.claude' : '~/.claude',
    afterInstall: 'Run: claude mcp list — to verify. Or restart Claude Code.',
  },

  // ── VS Code ──────────────────────────────────────────────────────────────────
  {
    id: 'vscode',
    name: 'VS Code',
    icon: '🔷',
    format: 'vscode',
    configPath: isWin
      ? '%APPDATA%\\Code\\User\\settings.json'
      : isMac
      ? '~/Library/Application Support/Code/User/settings.json'
      : '~/.config/Code/User/settings.json',
    detectDir: isWin
      ? '%APPDATA%\\Code'
      : isMac
      ? '~/Library/Application Support/Code'
      : '~/.config/Code',
    afterInstall: 'Press Ctrl+Shift+P → Developer: Reload Window. Requires VS Code 1.99+ and GitHub Copilot.',
  },

  // ── VS Code Insiders ─────────────────────────────────────────────────────────
  {
    id: 'vscode-insiders',
    name: 'VS Code Insiders',
    icon: '🔷',
    format: 'vscode',
    configPath: isWin
      ? '%APPDATA%\\Code - Insiders\\User\\settings.json'
      : isMac
      ? '~/Library/Application Support/Code - Insiders/User/settings.json'
      : '~/.config/Code - Insiders/User/settings.json',
    detectDir: isWin
      ? '%APPDATA%\\Code - Insiders'
      : isMac
      ? '~/Library/Application Support/Code - Insiders'
      : '~/.config/Code - Insiders',
    afterInstall: 'Press Ctrl+Shift+P → Developer: Reload Window.',
  },

  // ── Cursor ───────────────────────────────────────────────────────────────────
  {
    id: 'cursor',
    name: 'Cursor',
    icon: '⚡',
    format: 'mcpServers',
    configPath: isWin
      ? '%USERPROFILE%\\.cursor\\mcp.json'
      : '~/.cursor/mcp.json',
    detectDir: isWin ? '%USERPROFILE%\\.cursor' : '~/.cursor',
    afterInstall: 'Restart Cursor. Check Cursor Settings → MCP.',
  },

  // ── Windsurf (Codeium) ───────────────────────────────────────────────────────
  {
    id: 'windsurf',
    name: 'Windsurf (Codeium)',
    icon: '🌊',
    format: 'mcpServers',
    configPath: isWin
      ? '%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json'
      : '~/.codeium/windsurf/mcp_config.json',
    detectDir: isWin
      ? '%USERPROFILE%\\.codeium\\windsurf'
      : '~/.codeium/windsurf',
    afterInstall: 'Restart Windsurf.',
  },

  // ── Zed ──────────────────────────────────────────────────────────────────────
  {
    id: 'zed',
    name: 'Zed',
    icon: '⚡',
    format: 'zed',
    configPath: isWin
      ? '%APPDATA%\\Zed\\settings.json'
      : '~/.config/zed/settings.json',
    detectDir: isWin ? '%APPDATA%\\Zed' : '~/.config/zed',
    afterInstall: 'Restart Zed or reload settings.',
  },

  // ── OpenAI Codex CLI ─────────────────────────────────────────────────────────
  {
    id: 'codex',
    name: 'OpenAI Codex CLI',
    icon: '🤖',
    format: 'toml',
    configPath: isWin
      ? '%USERPROFILE%\\.codex\\config.toml'
      : '~/.codex/config.toml',
    detectDir: isWin ? '%USERPROFILE%\\.codex' : '~/.codex',
    afterInstall: 'Restart the Codex CLI agent.',
  },

  // ── Antigravity ──────────────────────────────────────────────────────────────
  {
    id: 'antigravity',
    name: 'Antigravity',
    icon: '🚀',
    format: 'mcpServers',
    configPath: isWin
      ? '%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json'
      : '~/.gemini/antigravity/mcp_config.json',
    detectDir: isWin
      ? '%USERPROFILE%\\.gemini\\antigravity'
      : '~/.gemini/antigravity',
    afterInstall: 'Restart Antigravity.',
  },

  // ── PhpStorm ─────────────────────────────────────────────────────────────────
  {
    id: 'phpstorm',
    name: 'PhpStorm / JetBrains',
    icon: '🐘',
    format: 'phpstorm',  // manual — XML is version-specific
    configPath: null,
    detectDir: isWin
      ? '%APPDATA%\\JetBrains'
      : isMac
      ? '~/Library/Application Support/JetBrains'
      : '~/.config/JetBrains',
    afterInstall: null,
  },
];

// ─── Config mergers ───────────────────────────────────────────────────────────

function mergeVscode(configPath) {
  const cfg = readJson(configPath);
  if (!cfg.mcp)               cfg.mcp = {};
  if (!cfg.mcp.servers)       cfg.mcp.servers = {};
  const already = !!cfg.mcp.servers[SERVER_NAME];
  cfg.mcp.servers[SERVER_NAME] = { type: 'stdio', command: 'npx', args: ['-y', PACKAGE] };
  return { cfg, already };
}

function mergeMcpServers(configPath) {
  const cfg = readJson(configPath);
  if (!cfg.mcpServers)  cfg.mcpServers = {};
  const already = !!cfg.mcpServers[SERVER_NAME];
  cfg.mcpServers[SERVER_NAME] = { command: 'npx', args: ['-y', PACKAGE] };
  return { cfg, already };
}

function mergeZed(configPath) {
  const cfg = readJson(configPath);
  if (!cfg.context_servers) cfg.context_servers = {};
  const already = !!cfg.context_servers[SERVER_NAME];
  cfg.context_servers[SERVER_NAME] = { command: { path: 'npx', args: ['-y', PACKAGE] } };
  return { cfg, already };
}

function mergeToml(configPath) {
  const block = `\n[[mcp_servers]]\nname = "${SERVER_NAME}"\ncommand = "npx"\nargs = ["-y", "${PACKAGE}"]\n`;
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let existing = '';
  if (fs.existsSync(configPath)) {
    existing = fs.readFileSync(configPath, 'utf8');
    if (existing.includes(`name = "${SERVER_NAME}"`)) return { already: true };
    fs.copyFileSync(configPath, configPath + '.mcp-wizard.bak');
  }
  if (!DRY_RUN) fs.writeFileSync(configPath, existing + block, 'utf8');
  return { already: false };
}

// ─── Install dispatcher ───────────────────────────────────────────────────────

function install(ide) {
  const cfgPath = ide.configPath ? expandPath(ide.configPath) : null;

  if (ide.format === 'phpstorm') {
    return { ok: false, reason: 'manual', cfgPath: null };
  }

  if (ide.format === 'toml') {
    const { already } = mergeToml(cfgPath);
    if (already) return { ok: true, already: true, cfgPath };
    return { ok: true, already: false, cfgPath };
  }

  let result;
  if      (ide.format === 'vscode')     result = mergeVscode(cfgPath);
  else if (ide.format === 'mcpServers') result = mergeMcpServers(cfgPath);
  else if (ide.format === 'zed')        result = mergeZed(cfgPath);
  else return { ok: false, reason: `Unknown format: ${ide.format}`, cfgPath };

  if (!DRY_RUN) backupAndWrite(cfgPath, result.cfg);
  return { ok: true, already: result.already, cfgPath };
}

// ─── Detection ────────────────────────────────────────────────────────────────

function detect(ide) {
  if (ide.detectDir) return dirExists(ide.detectDir);
  if (ide.configPath) return fileExists(ide.configPath);
  return false;
}

function isAlreadyConfigured(ide) {
  if (!ide.configPath) return false;
  const p = expandPath(ide.configPath);
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(SERVER_NAME);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
  red:    '\x1b[31m',
};

function c(color, text) { return C[color] + text + C.reset; }

function printPhpStormInstructions() {
  console.log('');
  console.log(c('bold', '  PhpStorm / JetBrains — Manual steps:'));
  console.log('  1. Open PhpStorm → Settings (Ctrl+Alt+S)');
  console.log('  2. Navigate to: Tools → AI Assistant → Model Context Protocol (MCP)');
  console.log('  3. Click + → As Process');
  console.log('  4. Command:   npx');
  console.log('     Arguments: -y laravel-herd-mcp');
  console.log('  5. Click Apply → restart the IDE');
  console.log('');
  console.log('  ' + c('grey', 'Or auto-configure via XML:'));
  console.log('  ' + c('grey', 'See install-mcp-wizard/configs/phpstorm.xml for the snippet.'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(c('bold', '  laravel-herd-mcp — MCP Installation Wizard'));
  console.log('  ' + c('grey', REPO));
  console.log('');

  // Detect installed IDEs
  const detected = IDES.filter(ide => detect(ide));

  if (detected.length === 0) {
    console.log(c('yellow', '  No supported IDEs detected.'));
    console.log('');
    console.log('  Supported IDEs: Claude Desktop, Claude Code, VS Code,');
    console.log('  Cursor, Windsurf, Zed, OpenAI Codex CLI, Antigravity, PhpStorm.');
    console.log('');
    console.log('  For manual setup see: install-mcp-wizard/README.md');
    console.log('  Or: ' + REPO + '#setup');
    console.log('');
    process.exit(0);
  }

  console.log(c('bold', `  Detected ${detected.length} IDE(s):`));
  console.log('');
  detected.forEach((ide, i) => {
    const configured = isAlreadyConfigured(ide);
    const status = configured
      ? c('green', '✓ already configured')
      : c('yellow', '○ not configured');
    console.log(`  ${i + 1}. ${ide.icon} ${c('bold', ide.name)}  ${status}`);
    if (ide.configPath) {
      console.log('     ' + c('grey', expandPath(ide.configPath)));
    }
  });
  console.log('');

  if (LIST) process.exit(0);
  if (DRY_RUN) {
    console.log(c('yellow', '  --dry-run: no files will be written.'));
    console.log('');
  }

  // Ask for confirmation (unless --yes)
  let toInstall = detected;
  if (!YES) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(resolve => rl.question(q, resolve));

    const answer = await ask(
      `  Install ${c('bold', 'laravel-herd')} to ${c('bold', 'all ' + detected.length + ' IDE(s)')}? ` +
      `[${c('green', 'Y')}es / ${c('cyan', 'n')}o / ${c('cyan', 's')}elect]: `
    );
    console.log('');

    if (answer.toLowerCase() === 'n') {
      rl.close();
      console.log('  Aborted.');
      console.log('');
      process.exit(0);
    }

    if (answer.toLowerCase() === 's') {
      const sel = await ask(
        '  Enter numbers to install (e.g. 1,3,4): '
      );
      console.log('');
      rl.close();
      const nums = sel.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => n >= 0 && n < detected.length);
      toInstall = nums.map(n => detected[n]);
    } else {
      rl.close();
    }
  }

  if (toInstall.length === 0) {
    console.log('  Nothing selected. Done.');
    console.log('');
    process.exit(0);
  }

  // Install
  console.log(c('bold', '  Installing...'));
  console.log('');

  let successCount = 0;
  for (const ide of toInstall) {
    process.stdout.write(`  ${ide.icon} ${c('bold', ide.name)}... `);
    const result = install(ide);

    if (!result.ok && result.reason === 'manual') {
      console.log(c('yellow', 'manual setup required'));
      printPhpStormInstructions();
      continue;
    }

    if (!result.ok) {
      console.log(c('red', 'failed: ' + result.reason));
      continue;
    }

    if (result.already) {
      console.log(c('green', 'already installed ✓'));
    } else {
      console.log(c('green', DRY_RUN ? 'would install ✓' : 'installed ✓'));
      if (ide.afterInstall) {
        console.log('     ' + c('grey', ide.afterInstall));
      }
      if (result.cfgPath && !DRY_RUN) {
        console.log('     ' + c('grey', result.cfgPath));
        console.log('     ' + c('grey', 'Backup saved: ' + result.cfgPath + '.mcp-wizard.bak'));
      }
    }
    console.log('');
    successCount++;
  }

  console.log(c('bold', '  Done.'));
  console.log('  ' + successCount + ' IDE(s) configured.');
  console.log('');
  console.log('  Verify: ' + c('cyan', REPO + '#setup'));
  console.log('');
}

main().catch(err => {
  console.error(C.red + 'Error: ' + err.message + C.reset);
  process.exit(1);
});
