import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

vi.mock('fs');

describe('detectHerd', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    delete process.env.HERD_PATH;
  });

  it('uses HERD_PATH env var when set', async () => {
    process.env.HERD_PATH = 'C:/custom/herd/bin';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiPort: 9001 }));
    const { detectHerd } = await import('../src/herd-detector');
    const result = detectHerd();
    expect(result.binDir).toBe('C:/custom/herd/bin');
  });

  it('reads apiPort from config.json', async () => {
    process.env.HERD_PATH = 'C:/custom/herd/bin';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiPort: 9001 }));
    const { detectHerd } = await import('../src/herd-detector');
    const result = detectHerd();
    expect(result.apiPort).toBe(9001);
  });

  it('defaults apiPort to 2304 when config.json has no apiPort key', async () => {
    process.env.HERD_PATH = 'C:/custom/herd/bin';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    const { detectHerd } = await import('../src/herd-detector');
    const result = detectHerd();
    expect(result.apiPort).toBe(2304);
  });

  it('throws when Herd cannot be found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const { detectHerd } = await import('../src/herd-detector');
    expect(() => detectHerd()).toThrow('Laravel Herd not found');
  });

  it('exposes correct bat/exe paths', async () => {
    process.env.HERD_PATH = 'C:/herd/bin';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ apiPort: 9001 }));
    const { detectHerd } = await import('../src/herd-detector');
    const r = detectHerd();
    expect(r.herdBat).toContain('herd.bat');
    expect(r.phpBat).toContain('php.bat');
    expect(r.composerBat).toContain('composer.bat');
    expect(r.laravelBat).toContain('laravel.bat');
    expect(r.nvmExe).toContain('nvm.exe');
  });
});
