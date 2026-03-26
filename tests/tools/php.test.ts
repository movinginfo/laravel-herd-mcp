import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPhpTools } from '../../src/tools/php';

const mockClient = { get: vi.fn(), post: vi.fn() };
const mockRunner = { herd: vi.fn(), assertSuccess: vi.fn() };
const mockServer = { tool: vi.fn() };

describe('php tools', () => {
  beforeEach(() => { vi.resetAllMocks(); mockServer.tool.mockReset(); });

  it('registers 5 tools', () => {
    registerPhpTools(mockServer as any, mockClient as any, mockRunner as any);
    expect(mockServer.tool).toHaveBeenCalledTimes(5);
  });

  it('list_php_versions calls GET /php-versions', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockClient.get.mockResolvedValue([{ version: '8.4', installed: true }]);
    registerPhpTools(mockServer as any, mockClient as any, mockRunner as any);
    const result = await tools['list_php_versions']({});
    expect(mockClient.get).toHaveBeenCalledWith('/php-versions');
    expect(result.content[0].text).toContain('8.4');
  });

  it('use_php_globally calls herd use <version>', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockRunner.herd.mockReturnValue({ stdout: 'Now using PHP 8.3', stderr: '', exitCode: 0 });
    registerPhpTools(mockServer as any, mockClient as any, mockRunner as any);
    await tools['use_php_globally']({ version: '8.3' });
    expect(mockRunner.herd).toHaveBeenCalledWith(['use', '8.3']);
  });
});
