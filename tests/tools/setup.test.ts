import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

vi.mock('fs');

// We need to test the setup logic. Import after mocking.
describe('setupIntegrations', () => {
  const mockHerdConfig = {
    binDir: 'C:/Users/user/.config/herd/bin',
    apiPort: 9001,
    herdBat: 'C:/Users/user/.config/herd/bin/herd.bat',
    phpBat: 'C:/Users/user/.config/herd/bin/php.bat',
    composerBat: 'C:/Users/user/.config/herd/bin/composer.bat',
    laravelBat: 'C:/Users/user/.config/herd/bin/laravel.bat',
    nvmExe: 'C:/Users/user/.config/herd/bin/nvm/nvm.exe',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});
  });

  it('writes mcpServers entries to a new claude_desktop_config.json', async () => {
    const { setupIntegrations } = await import('../../src/tools/setup-logic');
    setupIntegrations(mockHerdConfig, '/path/to/laravel-herd-mcp/dist/index.js', 'C:/Users/user/.config/herd/bin/php84/php.exe');

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const claudeDesktopWrite = writeCalls.find(call => String(call[0]).includes('claude_desktop_config'));
    expect(claudeDesktopWrite).toBeDefined();

    const written = JSON.parse(String(claudeDesktopWrite![1]));
    expect(written.mcpServers['laravel-herd']).toBeDefined();
    expect(written.mcpServers['laravel-herd-phar']).toBeDefined();
  });

  it('writes mcpServers entries to claude code settings.json', async () => {
    const { setupIntegrations } = await import('../../src/tools/setup-logic');
    setupIntegrations(mockHerdConfig, '/path/to/laravel-herd-mcp/dist/index.js', 'C:/Users/user/.config/herd/bin/php84/php.exe');

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const claudeCodeWrite = writeCalls.find(call => String(call[0]).includes('settings.json'));
    expect(claudeCodeWrite).toBeDefined();

    const written = JSON.parse(String(claudeCodeWrite![1]));
    expect(written.mcpServers['laravel-herd']).toBeDefined();
  });

  it('writes claude_code entry to herd integrations.json', async () => {
    const { setupIntegrations } = await import('../../src/tools/setup-logic');
    setupIntegrations(mockHerdConfig, '/path/to/laravel-herd-mcp/dist/index.js', 'C:/Users/user/.config/herd/bin/php84/php.exe');

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const herdWrite = writeCalls.find(call => String(call[0]).includes('integrations.json'));
    expect(herdWrite).toBeDefined();

    const written = JSON.parse(String(herdWrite![1]));
    expect(written.savedIntegrations[0].type).toBe('claude_code');
    expect(written.openIntegrations).toContain('claude_code');
  });

  it('merges with existing valid claude_desktop_config.json preserving other servers', async () => {
    const existing = { mcpServers: { 'other-server': { command: 'node', args: ['other.js'] } } };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existing));

    const { setupIntegrations } = await import('../../src/tools/setup-logic');
    setupIntegrations(mockHerdConfig, '/path/to/dist/index.js', 'php.exe');

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const claudeDesktopWrite = writeCalls.find(call => String(call[0]).includes('claude_desktop_config'));
    const written = JSON.parse(String(claudeDesktopWrite![1]));

    // Must preserve existing server
    expect(written.mcpServers['other-server']).toBeDefined();
    // Must add our servers
    expect(written.mcpServers['laravel-herd']).toBeDefined();
  });

  it('backs up malformed config file before overwriting', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json ');

    const { setupIntegrations } = await import('../../src/tools/setup-logic');
    setupIntegrations(mockHerdConfig, '/path/to/dist/index.js', 'php.exe');

    expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalled();
  });
});
