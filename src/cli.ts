/**
 * Laravel Herd MCP — Terminal CLI
 *
 * Runs when a CLI command is passed instead of starting the MCP stdio server.
 *
 *   laravel-herd-mcp status
 *   laravel-herd-mcp setup [path]
 *   laravel-herd-mcp register [--ide=...] [--scope=...] [--group=...]
 *   laravel-herd-mcp claude-md [path] [--overwrite]
 *   laravel-herd-mcp hooks [path]
 *   laravel-herd-mcp rules [path]
 *   laravel-herd-mcp sites
 *   laravel-herd-mcp help
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

// ── ANSI colours (no external deps) ──────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  blue:   (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta:(s: string) => `\x1b[35m${s}\x1b[0m`,
  white:  (s: string) => `\x1b[97m${s}\x1b[0m`,
};

const ok   = (s: string) => c.green(`✓  ${s}`);
const fail = (s: string) => c.red(`✗  ${s}`);
const warn = (s: string) => c.yellow(`⚠  ${s}`);
const info = (s: string) => c.dim(`   ${s}`);
const step = (s: string) => c.cyan(`→  ${s}`);

function print(s: string = '') { process.stdout.write(s + '\n'); }
function hr(char = '─', width = 58) { return char.repeat(width); }
function box(title: string, width = 58) {
  const pad = Math.max(0, width - title.length - 4);
  return [
    `╭─ ${c.bold(c.white(title))} ${'─'.repeat(pad)}╮`,
    `╰${'─'.repeat(width)}╯`,
  ];
}

// ── Path helpers (mirrors claude-code.ts) ────────────────────────────────────

const HOME = os.homedir();

function claudeJsonPath()       { return path.join(HOME, '.claude.json'); }
function claudeSettingsPath()   { return path.join(HOME, '.claude', 'settings.json'); }
function claudeDesktopPath() {
  if (process.platform === 'darwin')
    return path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  const ad = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming');
  return path.join(ad, 'Claude', 'claude_desktop_config.json');
}
function vsCodeSettingsPath() {
  if (process.platform === 'darwin')
    return path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  if (process.platform === 'linux')
    return path.join(HOME, '.config', 'Code', 'User', 'settings.json');
  const ad = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming');
  return path.join(ad, 'Code', 'User', 'settings.json');
}
function cursorSettingsPath()  { return path.join(HOME, '.cursor', 'mcp.json'); }
function windsurfSettingsPath(){
  const ad = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming');
  return path.join(ad, 'Codeium', 'windsurf', 'mcp_config.json');
}
function ownServerPath()        { return path.resolve(__dirname, 'index.js'); }

function readJson(p: string): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function writeJson(p: string, d: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8');
}
function mergeJson(p: string, fn: (o: Record<string, unknown>) => Record<string, unknown>) {
  writeJson(p, fn(readJson(p)));
}

function herdMcpEntry(group?: string): Record<string, unknown> {
  const args: string[] = [ownServerPath()];
  if (group && group !== 'all') args.push(`--group=${group}`);
  return { command: 'node', args };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

export const CLI_COMMANDS = ['status','setup','register','claude-md','hooks','rules','sites','help','init'];

export async function runCli(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  const flags = parseFlags(rest);

  switch (cmd) {
    case 'status':     return cmdStatus(flags);
    case 'setup':      return cmdSetup(flags);
    case 'register':   return cmdRegister(flags);
    case 'claude-md':  return cmdClaudeMd(flags);
    case 'hooks':      return cmdHooks(flags);
    case 'rules':      return cmdRules(flags);
    case 'sites':      return cmdSites(flags);
    case 'init':       return cmdSetup({ ...flags, init: true });
    case 'help':
    default:           return cmdHelp();
  }
}

// ── Flag parser ───────────────────────────────────────────────────────────────

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (const a of args) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else        flags[a.slice(2)] = true;
    } else if (!a.startsWith('-') && !flags['path']) {
      flags['path'] = a;
    }
  }
  return flags;
}

// ── cmd: status ───────────────────────────────────────────────────────────────

async function cmdStatus(flags: Record<string, string | boolean>) {
  const cwd = (flags['path'] as string) || process.cwd();

  printHeader();
  print(c.bold('  STATUS\n'));

  // ── Claude Code CLI ──────────────────────────────────────────────────────
  const cli = spawnSync('claude --version', { encoding: 'utf8', shell: true } as any);
  const cliOk = cli.status === 0;
  print(cliOk
    ? ok(`Claude Code CLI   ${c.dim(cli.stdout.trim())}`)
    : fail(`Claude Code CLI   ${c.dim('not installed')}`));
  if (!cliOk) {
    print(info('Install: curl -fsSL https://claude.ai/install.sh | bash'));
    print(info('Windows: irm https://claude.ai/install.ps1 | iex'));
  }

  // ── MCP: ~/.claude.json ──────────────────────────────────────────────────
  print('');
  const ucfg = readJson(claudeJsonPath());
  const uMcp = (ucfg.mcpServers ?? {}) as Record<string, unknown>;
  const herdInUser = 'laravel-herd' in uMcp;
  print(herdInUser
    ? ok(`User MCP (~/.claude.json)  ${c.dim('laravel-herd registered')}`)
    : warn(`User MCP (~/.claude.json)  ${c.dim('laravel-herd NOT registered')}`));
  for (const [name] of Object.entries(uMcp)) {
    const mark = name.startsWith('laravel-herd') ? c.green('★') : c.dim('•');
    print(`  ${mark}  ${name}`);
  }

  // ── MCP: .mcp.json (project) ─────────────────────────────────────────────
  const projMcpFile = path.join(cwd, '.mcp.json');
  const projMcp = (readJson(projMcpFile).mcpServers ?? {}) as Record<string, unknown>;
  const herdInProj = 'laravel-herd' in projMcp;
  print(herdInProj
    ? ok(`Project MCP (.mcp.json)    ${c.dim('laravel-herd registered')}`)
    : info(`Project MCP (.mcp.json)    ${c.dim('not set (optional)')}`));

  // ── VS Code ──────────────────────────────────────────────────────────────
  print('');
  const vsCfg = readJson(vsCodeSettingsPath());
  const vsOk  = !!((vsCfg as any)?.mcp?.servers?.['laravel-herd']);
  print(vsOk
    ? ok(`VS Code settings.json      ${c.dim('laravel-herd registered')}`)
    : warn(`VS Code settings.json      ${c.dim('not configured')}`));

  // ── Claude Desktop ───────────────────────────────────────────────────────
  const dtCfg = readJson(claudeDesktopPath());
  const dtOk  = !!((dtCfg as any)?.mcpServers?.['laravel-herd']);
  print(dtOk
    ? ok(`Claude Desktop             ${c.dim('laravel-herd registered')}`)
    : warn(`Claude Desktop             ${c.dim('not configured')}`));

  // ── Cursor ───────────────────────────────────────────────────────────────
  const curCfg = readJson(cursorSettingsPath());
  const curOk  = !!((curCfg as any)?.mcpServers?.['laravel-herd']);
  print(curOk
    ? ok(`Cursor                     ${c.dim('laravel-herd registered')}`)
    : info(`Cursor                     ${c.dim('not configured (optional)')}`));

  // ── CLAUDE.md ────────────────────────────────────────────────────────────
  print('');
  const claudeMd = fs.existsSync(path.join(cwd, 'CLAUDE.md'));
  const dotClaudeMd = fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.md'));
  const userMd = fs.existsSync(path.join(HOME, '.claude', 'CLAUDE.md'));
  print(claudeMd || dotClaudeMd
    ? ok(`CLAUDE.md                  ${c.dim(claudeMd ? 'CLAUDE.md' : '.claude/CLAUDE.md')}`)
    : warn(`CLAUDE.md                  ${c.dim('not found — run: laravel-herd-mcp claude-md')}`));
  print(userMd
    ? ok(`User CLAUDE.md             ${c.dim('~/.claude/CLAUDE.md')}`)
    : info(`User CLAUDE.md             ${c.dim('not set (optional)')}`));

  // ── Hooks ────────────────────────────────────────────────────────────────
  print('');
  const projSettings = readJson(path.join(cwd, '.claude', 'settings.json'));
  const hooksCount = Object.keys((projSettings.hooks ?? {}) as object).length;
  const userSettings = readJson(claudeSettingsPath());
  const userHooks = Object.keys((userSettings.hooks ?? {}) as object).length;
  print(hooksCount > 0
    ? ok(`Project hooks              ${c.dim(`${hooksCount} event(s) in .claude/settings.json`)}`)
    : info(`Project hooks              ${c.dim('none — run: laravel-herd-mcp hooks')}`));
  print(userHooks > 0
    ? ok(`User hooks                 ${c.dim(`${userHooks} event(s) in ~/.claude/settings.json`)}`)
    : info(`User hooks                 ${c.dim('none')}`));

  // ── Rules ────────────────────────────────────────────────────────────────
  print('');
  const rulesDir = path.join(cwd, '.claude', 'rules');
  const ruleCount = fs.existsSync(rulesDir) ? fs.readdirSync(rulesDir).length : 0;
  print(ruleCount > 0
    ? ok(`Rules (.claude/rules/)     ${c.dim(`${ruleCount} file(s)`)}`)
    : info(`Rules (.claude/rules/)     ${c.dim('none — run: laravel-herd-mcp rules')}`));

  // ── Quick actions ────────────────────────────────────────────────────────
  print(`\n${c.dim(hr())}`);
  if (!herdInUser || !claudeMd || !hooksCount) {
    print(c.bold('\n  Quick fix:'));
    print(step(`laravel-herd-mcp setup ${cwd !== process.cwd() ? cwd : ''}`));
  } else {
    print(c.green('\n  All integrations look good! 🎉'));
  }
  print('');
}

// ── cmd: setup ────────────────────────────────────────────────────────────────

async function cmdSetup(flags: Record<string, string | boolean>) {
  const cwd = (flags['path'] as string) || process.cwd();
  const projectName = path.basename(cwd);

  printHeader();
  print(c.bold(`  SETUP — ${projectName}\n`));
  print(`  Project: ${c.cyan(cwd)}`);
  print('');

  // 1. Register MCP (user scope)
  print(step('Registering MCP server in ~/.claude.json …'));
  mergeJson(claudeJsonPath(), (cfg) => {
    cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
    (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = herdMcpEntry();
    return cfg;
  });
  print(ok('laravel-herd registered in ~/.claude.json'));

  // 2. VS Code
  print('');
  print(step('Registering in VS Code …'));
  try {
    mergeJson(vsCodeSettingsPath(), (cfg) => {
      const mcp = (cfg.mcp ?? {}) as any;
      mcp.servers = mcp.servers ?? {};
      mcp.servers['laravel-herd'] = { type: 'stdio', ...herdMcpEntry() };
      cfg.mcp = mcp;
      return cfg;
    });
    print(ok(`VS Code settings.json updated`));
  } catch {
    print(warn('VS Code settings.json not found — skipped'));
  }

  // 3. Claude Desktop
  print('');
  print(step('Registering in Claude Desktop …'));
  try {
    mergeJson(claudeDesktopPath(), (cfg) => {
      cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
      (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = herdMcpEntry();
      return cfg;
    });
    print(ok('Claude Desktop claude_desktop_config.json updated'));
  } catch {
    print(warn('Claude Desktop config not found — skipped'));
  }

  // 4. CLAUDE.md
  print('');
  print(step('Generating CLAUDE.md …'));
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath) || flags['overwrite']) {
    const content = buildLaravelClaudeMd(projectName, cwd);
    fs.writeFileSync(claudeMdPath, content, 'utf8');
    print(ok(`CLAUDE.md created at ${claudeMdPath}`));
  } else {
    print(info(`CLAUDE.md already exists — skipped (--overwrite to regenerate)`));
  }

  // 5. Hooks
  print('');
  print(step('Setting up Claude Code hooks …'));
  setupLaravelHooks(cwd);
  print(ok('.claude/settings.json — Pint formatter + Herd status hooks'));

  // 6. Rules
  print('');
  print(step('Creating .claude/rules/ …'));
  const ruleCount = setupLaravelRules(cwd);
  print(ok(`.claude/rules/ — ${ruleCount} rule files created`));

  // Done
  print(`\n${c.dim(hr())}`);
  print(c.green(c.bold('\n  Setup complete! 🎉\n')));
  print('  Next steps:');
  print(step('Restart Claude Desktop and reload VS Code'));
  print(step('Run /mcp in Claude Code to verify the connection'));
  print(step('Run: claude in your terminal to start Claude Code'));
  print('');
}

// ── cmd: register ─────────────────────────────────────────────────────────────

async function cmdRegister(flags: Record<string, string | boolean>) {
  const ide   = (flags['ide']   as string) || 'all';
  const scope = (flags['scope'] as string) || 'user';
  const group = (flags['group'] as string) || undefined;
  const cwd   = (flags['path']  as string) || process.cwd();

  printHeader();
  print(c.bold(`  REGISTER MCP\n`));

  const entry = herdMcpEntry(group);
  const targets = ide === 'all'
    ? ['claude-code', 'vscode', 'desktop', 'cursor']
    : [ide];

  for (const target of targets) {
    switch (target) {
      case 'claude-code': {
        const file = scope === 'project' ? path.join(cwd, '.mcp.json') : claudeJsonPath();
        mergeJson(file, (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = entry;
          return cfg;
        });
        const where = scope === 'project' ? '.mcp.json' : '~/.claude.json';
        print(ok(`Claude Code — ${where}`));
        if (scope === 'project') print(info('Commit .mcp.json to share with your team'));
        break;
      }
      case 'vscode': {
        mergeJson(vsCodeSettingsPath(), (cfg) => {
          const mcp = (cfg.mcp ?? {}) as any;
          mcp.servers = mcp.servers ?? {};
          mcp.servers['laravel-herd'] = { type: 'stdio', ...entry };
          cfg.mcp = mcp;
          return cfg;
        });
        print(ok(`VS Code — settings.json`));
        print(info('Reload VS Code window to activate (Ctrl+Shift+P → Reload Window)'));
        break;
      }
      case 'desktop': {
        mergeJson(claudeDesktopPath(), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = entry;
          return cfg;
        });
        print(ok(`Claude Desktop — claude_desktop_config.json`));
        print(info('Restart Claude Desktop to activate'));
        break;
      }
      case 'cursor': {
        mergeJson(cursorSettingsPath(), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = entry;
          return cfg;
        });
        print(ok(`Cursor — ~/.cursor/mcp.json`));
        break;
      }
      case 'windsurf': {
        mergeJson(windsurfSettingsPath(), (cfg) => {
          cfg.mcpServers = (cfg.mcpServers ?? {}) as Record<string, unknown>;
          (cfg.mcpServers as Record<string, unknown>)['laravel-herd'] = entry;
          return cfg;
        });
        print(ok(`Windsurf — mcp_config.json`));
        break;
      }
      default:
        print(warn(`Unknown IDE: ${target}`));
    }
  }

  print('');
  print(info(`Server path: ${ownServerPath()}`));
  if (group) print(info(`Group: --group=${group}`));
  print('');
}

// ── cmd: claude-md ────────────────────────────────────────────────────────────

async function cmdClaudeMd(flags: Record<string, string | boolean>) {
  const cwd = (flags['path'] as string) || process.cwd();
  const overwrite = !!flags['overwrite'];
  const projectName = path.basename(cwd);
  const target = path.join(cwd, 'CLAUDE.md');

  printHeader();
  print(c.bold('  CLAUDE.md GENERATOR\n'));

  if (fs.existsSync(target) && !overwrite) {
    print(warn(`CLAUDE.md already exists: ${target}`));
    print(info('Add --overwrite to regenerate'));
    print('');
    return;
  }

  const content = buildLaravelClaudeMd(projectName, cwd);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');

  print(ok(`CLAUDE.md written: ${target}`));
  print('');
  print(c.bold('  Preview:'));
  print(c.dim('  ' + hr('─', 54)));
  content.split('\n').slice(0, 20).forEach(l => print(`  ${c.dim(l)}`));
  print(`  ${c.dim('...')}`);
  print('');
}

// ── cmd: hooks ────────────────────────────────────────────────────────────────

async function cmdHooks(flags: Record<string, string | boolean>) {
  const cwd = (flags['path'] as string) || process.cwd();

  printHeader();
  print(c.bold('  HOOKS SETUP\n'));

  setupLaravelHooks(cwd);

  const settingsFile = path.join(cwd, '.claude', 'settings.json');
  print(ok(`.claude/settings.json updated`));
  print('');
  print('  Hooks registered:');
  print(info(`PostToolUse (Edit|Write → *.php)   Auto-run Pint formatter`));
  print(info(`SessionStart                       Check Herd is running`));
  print('');
  print(c.dim(`  Settings file: ${settingsFile}`));
  print(c.dim('  View hooks: run /hooks in Claude Code terminal'));
  print('');
}

// ── cmd: rules ────────────────────────────────────────────────────────────────

async function cmdRules(flags: Record<string, string | boolean>) {
  const cwd = (flags['path'] as string) || process.cwd();

  printHeader();
  print(c.bold('  RULES SETUP\n'));

  const rulesDir = path.join(cwd, '.claude', 'rules');
  const count = setupLaravelRules(cwd, rulesDir);

  if (count === 0) {
    print(info(`All rule files already exist in ${rulesDir}`));
  } else {
    print(ok(`${count} rule files created in .claude/rules/`));
  }

  print('');
  print('  Rule files:');

  const rules = [
    ['laravel.md',     'Always loaded', 'Eloquent, Services, Jobs, Events, caching'],
    ['php-files.md',   '**/*.php',      'PHP 8.x types, readonly, null safety, Pint'],
    ['migrations.md',  'database/migrations/**', 'Never modify existing, indexes, FKs'],
    ['tests.md',       'tests/**',      'Factories, fakes, Pest patterns, coverage'],
    ['blade.md',       '**/*.blade.php','XSS safety, components, @csrf, i18n'],
  ];

  for (const [file, scope, desc] of rules) {
    const exists = fs.existsSync(path.join(rulesDir, file));
    const mark = exists ? c.green('✓') : c.yellow('+');
    print(`  ${mark}  ${c.bold(file.padEnd(20))} ${c.dim(scope.padEnd(26))} ${c.dim(desc)}`);
  }

  print('');
  print(c.dim(`  Rules dir: ${rulesDir}`));
  print(c.dim('  View in Claude Code: run /memory'));
  print('');
}

// ── cmd: sites ────────────────────────────────────────────────────────────────

async function cmdSites(_flags: Record<string, string | boolean>) {
  printHeader();
  print(c.bold('  HERD SITES\n'));

  const r = spawnSync('herd sites', { encoding: 'utf8', shell: true } as any);
  if (r.status !== 0) {
    print(fail('Could not run herd sites — is Herd installed and running?'));
    print(info('Start Herd: herd start'));
    print('');
    return;
  }

  // Parse the ASCII table output and re-render as clean table
  const rows: string[][] = [];
  for (const line of (r.stdout ?? '').split('\n')) {
    if (!line.trim().startsWith('|') || line.includes('---') || line.toLowerCase().includes('site')) continue;
    const cols = line.split('|').map(s => s.trim()).filter(Boolean);
    if (cols.length >= 3) rows.push(cols);
  }

  if (rows.length === 0) {
    print(info('No sites found. Park a directory with: herd park <path>'));
    print('');
    return;
  }

  // Header row
  print(`  ${'Site'.padEnd(26)} ${'URL'.padEnd(34)} ${'PHP'.padEnd(6)} SSL`);
  print(`  ${c.dim(hr('─', 72))}`);

  for (const [name, url, , secured, php] of rows) {
    const sslMark = secured ? c.green('✓') : c.dim('—');
    const phpVer  = php ?? '—';
    print(`  ${c.cyan(name.padEnd(26))} ${c.dim(url.padEnd(34))} ${phpVer.padEnd(6)} ${sslMark}`);
  }

  print('');
  print(c.dim(`  ${rows.length} site(s) found`));
  print(c.dim('  Manage: herd link / herd park / herd secure'));
  print('');
}

// ── cmd: help ─────────────────────────────────────────────────────────────────

function cmdHelp() {
  printHeader();

  const cmds: [string, string, string?][] = [
    ['status', 'Show integration status (Claude Code, VS Code, Desktop, hooks, rules)'],
    ['setup [path]', 'Full one-command setup for a Laravel project', '--overwrite'],
    ['register', 'Register MCP server in IDEs', '--ide=all|claude-code|vscode|desktop|cursor|windsurf\n' +
      '                                         --scope=user|project  --group=all|herd|laravel|monitoring'],
    ['claude-md [path]', 'Generate CLAUDE.md tailored to the project', '--overwrite'],
    ['hooks [path]', 'Set up Pint formatter + Herd status hooks in .claude/settings.json'],
    ['rules [path]', 'Create .claude/rules/ with Laravel/PHP/migration/test/Blade rules'],
    ['sites', 'List all Laravel Herd sites'],
    ['help', 'Show this help'],
  ];

  print(c.bold('  COMMANDS\n'));
  for (const [cmd, desc, flags] of cmds) {
    print(`  ${c.cyan(c.bold(('laravel-herd-mcp ' + cmd).padEnd(30)))} ${desc}`);
    if (flags) print(`  ${''.padEnd(30)} ${c.dim('Flags: ' + flags)}`);
    print('');
  }

  print(c.bold('  EXAMPLES\n'));
  const examples: [string, string][] = [
    ['laravel-herd-mcp status', 'Check what is and isn\'t configured'],
    ['laravel-herd-mcp setup', 'Full setup for current directory'],
    ['laravel-herd-mcp setup C:\\herd\\myapp', 'Setup for a specific project'],
    ['laravel-herd-mcp register --ide=vscode', 'Register only in VS Code'],
    ['laravel-herd-mcp register --scope=project', 'Write .mcp.json (share with team)'],
    ['laravel-herd-mcp register --ide=all --group=herd', 'Register with tool group limit'],
    ['laravel-herd-mcp claude-md --overwrite', 'Regenerate CLAUDE.md'],
    ['laravel-herd-mcp sites', 'List all Herd sites'],
  ];
  for (const [cmd, desc] of examples) {
    print(`  ${c.dim('$')} ${c.cyan(cmd)}`);
    print(`  ${c.dim('  ' + desc)}\n`);
  }

  print(c.bold('  MCP SERVER (default when no command given)\n'));
  print(`  ${c.dim('$')} ${c.cyan('laravel-herd-mcp')}`);
  print(c.dim('    Start the MCP stdio server (for AI clients)\n'));
  print(`  ${c.dim('$')} ${c.cyan('laravel-herd-mcp --group=laravel')}`);
  print(c.dim('    Start with a specific tool group\n'));
  print(`  ${c.dim('$')} ${c.cyan('laravel-herd-mcp --http --port=3000')}`);
  print(c.dim('    Start in HTTP/SSE mode\n'));

  print(c.dim('  Docs: https://github.com/movinginfo/laravel-herd-mcp'));
  print('');
}

// ── Header ────────────────────────────────────────────────────────────────────

function printHeader() {
  const pkg = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
    } catch {
      return { version: '?' };
    }
  })();

  print('');
  print(`  ${c.bold(c.white('Laravel Herd MCP'))}  ${c.dim('v' + pkg.version)}`);
  print(`  ${c.dim(hr('─', 54))}`);
  print('');
}

// ── Shared logic (mirrors claude-code.ts) ────────────────────────────────────

function buildLaravelClaudeMd(projectName: string, cwd: string): string {
  const hasPest    = fs.existsSync(path.join(cwd, 'vendor', 'bin', 'pest'));
  const hasPint    = fs.existsSync(path.join(cwd, 'vendor', 'bin', 'pint'));
  const hasArtisan = fs.existsSync(path.join(cwd, 'artisan'));
  const hasBun     = fs.existsSync(path.join(cwd, 'bun.lock')) || fs.existsSync(path.join(cwd, 'bun.lockb'));
  const hasNode    = fs.existsSync(path.join(cwd, 'package.json'));
  const testCmd    = hasPest ? './vendor/bin/pest' : 'php artisan test';
  const pkgMgr     = hasBun ? 'bun' : 'npm';

  return `# ${projectName}

## Build & Test Commands
${hasArtisan ? '\n- Migrate: `php artisan migrate`' : ''}
${hasArtisan ? '- Seed: `php artisan db:seed`' : ''}
${hasArtisan ? '- Tinker: `php artisan tinker`' : ''}
${hasArtisan ? '- Routes: `php artisan route:list`' : ''}
${hasArtisan ? '- Clear all: `php artisan optimize:clear`' : ''}
- Test: \`${testCmd}\`
${hasPint ? '- Format: `./vendor/bin/pint`' : ''}
${hasNode ? `- Frontend: \`${pkgMgr} run build\`` : ''}

## Laravel Conventions
- Models: singular PascalCase (User, Post, Order)
- Controllers: plural + Controller (UsersController)
- Use Form Requests for validation logic
- Prefer Eloquent over raw DB queries; use eager loading to prevent N+1
- Jobs in \`app/Jobs/\`, Events in \`app/Events/\`, Policies in \`app/Policies/\`
- Follow PSR-12${hasPint ? ' — enforced by Pint' : ''}

## Testing
- Framework: ${hasPest ? 'Pest (preferred)' : 'PHPUnit'}
- Use \`RefreshDatabase\` trait for database tests
- Use factories for test data, never raw DB inserts
- Use fakes: \`Http::fake()\`, \`Mail::fake()\`, \`Queue::fake()\`

## Code Style
- PHP 8.x — typed properties, constructor promotion, match, enums
- Return types and parameter types required everywhere
${hasPint ? '- Run `./vendor/bin/pint` before committing' : ''}

## Herd MCP Tools Available
Run \`project_select\` to set this as the active project.
Tools: artisan, composer, database, sql, telescope, pulse, debugbar, nightwatch, forge, queue, cache, skills
`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function setupLaravelHooks(cwd: string): void {
  const hooksDir = path.join(cwd, '.claude', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const isWin = process.platform === 'win32';

  if (isWin) {
    fs.writeFileSync(path.join(hooksDir, 'pint.ps1'), [
      '# Auto-format PHP files with Pint after edits',
      '$j = [Console]::In.ReadToEnd() | ConvertFrom-Json',
      '$f = $j.tool_input.file_path',
      'if ($f -and $f -match "\\.php$" -and (Test-Path ".\\vendor\\bin\\pint.bat")) {',
      '  & ".\\vendor\\bin\\pint.bat" $f --quiet 2>$null',
      '}',
      'exit 0',
    ].join('\n'), 'utf8');
  } else {
    const sh = path.join(hooksDir, 'pint.sh');
    fs.writeFileSync(sh, [
      '#!/bin/bash',
      'FILE=$(python3 -c "import sys,json; print(json.load(sys.stdin).get(\'tool_input\',{}).get(\'file_path\',\'\'))" 2>/dev/null)',
      '[[ "$FILE" == *.php && -f "vendor/bin/pint" ]] && ./vendor/bin/pint "$FILE" --quiet 2>/dev/null',
      'exit 0',
    ].join('\n'), 'utf8');
    fs.chmodSync(sh, '755');
  }

  const pintCmd = isWin
    ? `powershell -File "${path.join(hooksDir, 'pint.ps1')}"`
    : path.join(hooksDir, 'pint.sh');

  mergeJson(path.join(cwd, '.claude', 'settings.json'), (cfg) => ({
    ...cfg,
    hooks: {
      PostToolUse: [
        { matcher: 'Edit|Write', hooks: [{ type: 'command', command: pintCmd, async: true }] },
      ],
      SessionStart: [
        { hooks: [{ type: 'command', command: isWin ? 'herd status 2>nul' : 'herd status 2>/dev/null', async: true }] },
      ],
    },
  }));
}

function setupLaravelRules(cwd: string, rulesDir?: string): number {
  const dir = rulesDir ?? path.join(cwd, '.claude', 'rules');
  fs.mkdirSync(dir, { recursive: true });

  const rules = [
    { file: 'laravel.md', content: `# Laravel Rules\n\n- Use Eloquent ORM, eager loading to prevent N+1\n- Business logic in Service classes, not Controllers\n- Validate with Form Requests\n- Jobs should implement ShouldQueue\n- Use Events/Listeners for decoupled communication\n- Cache expensive operations with Cache::remember()\n` },
    { file: 'php-files.md', content: `---\npaths:\n  - "**/*.php"\n---\n\n# PHP Standards\n\n- PHP 8.x: typed properties, constructor promotion, match, enums\n- All functions must have return types and typed parameters\n- Use readonly properties where possible\n- No unused imports or variables\n- Run ./vendor/bin/pint to auto-format\n` },
    { file: 'migrations.md', content: `---\npaths:\n  - "database/migrations/**"\n---\n\n# Migration Rules\n\n- Never modify existing migrations — create new ones\n- Always add down() method\n- Add indexes for WHERE/JOIN columns\n- Use ->constrained()->cascadeOnDelete() for foreign keys\n- After creating: php artisan migrate\n` },
    { file: 'tests.md', content: `---\npaths:\n  - "tests/**"\n  - "**/*Test.php"\n---\n\n# Testing Rules\n\n- Use RefreshDatabase for DB tests\n- Use factories for all test data\n- Use Http::fake(), Mail::fake(), Queue::fake() for isolation\n- Each test should test ONE thing\n- Run: php artisan test --filter=ClassName\n` },
    { file: 'blade.md', content: `---\npaths:\n  - "**/*.blade.php"\n---\n\n# Blade Rules\n\n- Use {{ $var }} (escaped) not {!! $var !!} unless trusted\n- Prefer components (<x-button>) over @include\n- Always use @csrf in forms\n- Translate with {{ __('key') }}\n` },
  ];

  let count = 0;
  for (const { file, content } of rules) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { fs.writeFileSync(p, content, 'utf8'); count++; }
  }
  return count;
}
