import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { HerdConfig } from '../herd-detector';

type MergeStatus = 'created' | 'merged' | 'backed_up_and_overwritten' | 'skipped';

export interface SetupResult {
  claudeDesktop: { path: string; status: MergeStatus };
  claudeCode: { path: string; status: MergeStatus };
  vsCode: { path: string; status: MergeStatus };
  herdIntegrations: { path: string; status: MergeStatus };
}

export function setupIntegrations(
  herdConfig: HerdConfig,
  mcpServerPath: string,
  phpExePath: string,
): SetupResult {
  const pharPath = path.join(herdConfig.binDir, 'herd-mcp.phar');

  const herdEntry = {
    command: 'node',
    args: [mcpServerPath],
  };

  const pharEntry = {
    command: phpExePath,
    args: [pharPath],
    env: {},
  };

  // Target 1: Claude Desktop
  const claudeDesktopPath = getClaudeDesktopConfigPath();
  const claudeDesktopStatus = mergeJsonFile(claudeDesktopPath, (existing) => {
    const config = existing ?? {};
    config.mcpServers = config.mcpServers ?? {};
    config.mcpServers['laravel-herd'] = herdEntry;
    config.mcpServers['laravel-herd-phar'] = pharEntry;
    return config;
  });

  // Target 2: Claude Code
  const claudeCodePath = getClaudeCodeConfigPath();
  const claudeCodeStatus = mergeJsonFile(claudeCodePath, (existing) => {
    const config = existing ?? {};
    config.mcpServers = config.mcpServers ?? {};
    config.mcpServers['laravel-herd'] = { ...herdEntry, type: 'stdio' };
    config.mcpServers['laravel-herd-phar'] = { ...pharEntry, type: 'stdio' };
    return config;
  });

  // Target 3: VS Code user settings.json (GitHub Copilot agent / Continue MCP)
  const vsCodePath = getVsCodeConfigPath();
  const vsCodeStatus = mergeJsonFile(vsCodePath, (existing) => {
    const config = existing ?? {};
    config.mcp = config.mcp ?? {};
    config.mcp.servers = config.mcp.servers ?? {};
    config.mcp.servers['laravel-herd'] = { type: 'stdio', ...herdEntry };
    return config;
  });

  // Target 4: Herd integrations.json
  const herdIntegrationsPath = path.join(
    path.dirname(herdConfig.binDir), 'config', 'integrations.json'
  );
  const herdStatus = mergeJsonFile(herdIntegrationsPath, (existing) => {
    const config = existing ?? { savedIntegrations: [], openIntegrations: [] };
    config.savedIntegrations = config.savedIntegrations ?? [];
    config.openIntegrations = config.openIntegrations ?? [];

    // Remove any existing claude_code entry
    config.savedIntegrations = config.savedIntegrations.filter(
      (i: any) => i.type !== 'claude_code'
    );

    config.savedIntegrations.push({
      type: 'claude_code',
      name: 'Claude Code',
      status: 'connected',
      mcpServer: 'laravel-herd-mcp',
      version: '1.0.0',
      configuredAt: new Date().toISOString(),
    });

    if (!config.openIntegrations.includes('claude_code')) {
      config.openIntegrations.push('claude_code');
    }

    return config;
  });

  return {
    claudeDesktop: { path: claudeDesktopPath, status: claudeDesktopStatus },
    claudeCode: { path: claudeCodePath, status: claudeCodeStatus },
    vsCode: { path: vsCodePath, status: vsCodeStatus },
    herdIntegrations: { path: herdIntegrationsPath, status: herdStatus },
  };
}

function getClaudeDesktopConfigPath(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Claude', 'claude_desktop_config.json');
}

function getClaudeCodeConfigPath(): string {
  // User-scope MCP servers live in ~/.claude.json (NOT ~/.claude/settings.json)
  // https://code.claude.com/docs/en/settings — "MCP servers | ~/.claude.json"
  return path.join(os.homedir(), '.claude.json');
}

function getVsCodeConfigPath(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  }
  if (process.platform === 'linux') {
    return path.join(os.homedir(), '.config', 'Code', 'User', 'settings.json');
  }
  const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Code', 'User', 'settings.json');
}

function mergeJsonFile(
  filePath: string,
  merge: (existing: any) => any,
): MergeStatus {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing: any = null;
  let status: MergeStatus = 'created';

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      existing = JSON.parse(raw);
      status = 'merged';
    } catch {
      // Malformed — back up and overwrite
      const backup = `${filePath}.bak.${Date.now()}`;
      fs.copyFileSync(filePath, backup);
      status = 'backed_up_and_overwritten';
    }
  }

  const result = merge(existing);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
  return status;
}
