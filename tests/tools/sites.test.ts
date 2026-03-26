import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSitesTools } from '../../src/tools/sites';

const mockClient = { get: vi.fn(), post: vi.fn() };
const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() };
const mockServer = { tool: vi.fn() };

describe('sites tools', () => {
  beforeEach(() => { vi.resetAllMocks(); mockServer.tool.mockReset(); });

  it('registers 4 tools', () => {
    registerSitesTools(mockServer as any, mockClient as any, mockRunner as any);
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
  });

  it('list_all_sites calls herd sites and returns output', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockRunner.herd.mockReturnValue({ stdout: 'Site list output', stderr: '', exitCode: 0 });
    registerSitesTools(mockServer as any, mockClient as any, mockRunner as any);
    const result = await tools['list_all_sites']({});
    expect(mockRunner.herd).toHaveBeenCalledWith(['sites']);
    expect(result.content[0].text).toContain('Site list output');
  });

  it('open_site_in_browser calls herd open with site name', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockRunner.herd.mockReturnValue({ stdout: '', stderr: '', exitCode: 0 });
    registerSitesTools(mockServer as any, mockClient as any, mockRunner as any);
    await tools['open_site_in_browser']({ name: 'myapp' });
    expect(mockRunner.herd).toHaveBeenCalledWith(['open', 'myapp']);
  });
});
