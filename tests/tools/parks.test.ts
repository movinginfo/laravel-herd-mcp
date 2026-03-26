import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerParksTools } from '../../src/tools/parks';

const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() };
const mockServer = { tool: vi.fn() };

describe('parks tools', () => {
  beforeEach(() => { vi.resetAllMocks(); mockServer.tool.mockReset(); });

  it('registers 4 tools', () => {
    registerParksTools(mockServer as any, mockRunner as any);
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
  });

  it('unpark_directory calls herd forget with path', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockRunner.herd.mockReturnValue({ stdout: '', stderr: '', exitCode: 0 });
    registerParksTools(mockServer as any, mockRunner as any);
    await tools['unpark_directory']({ path: 'C:/myprojects' });
    expect(mockRunner.herd).toHaveBeenCalledWith(['forget', 'C:/myprojects']);
  });
});
