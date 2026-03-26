import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'child_process';

vi.mock('child_process');

import { CliRunner } from '../src/cli-runner';

const mockConfig = {
  binDir: 'C:/herd/bin',
  apiPort: 9001,
  herdBat: 'C:/herd/bin/herd.bat',
  phpBat: 'C:/herd/bin/php.bat',
  composerBat: 'C:/herd/bin/composer.bat',
  laravelBat: 'C:/herd/bin/laravel.bat',
  nvmExe: 'C:/herd/bin/nvm/nvm.exe',
};

describe('CliRunner', () => {
  beforeEach(() => vi.resetAllMocks());

  it('strips ANSI escape codes from output', () => {
    const runner = new CliRunner(mockConfig as any);
    expect(runner.stripAnsi('\u001b[32mHello\u001b[39m world\u001b[0m')).toBe('Hello world');
  });

  it('parseTableOutput extracts rows from ASCII table', () => {
    const runner = new CliRunner(mockConfig as any);
    const raw = '\n+------+-----+\n| Site | SSL |\n+------+-----+\n| app  | Yes |\n| api  | No  |\n+------+-----+\n';
    const rows = runner.parseTableOutput(raw);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Site: 'app', SSL: 'Yes' });
    expect(rows[1]).toEqual({ Site: 'api', SSL: 'No' });
  });

  it('parseTableOutput returns empty array for non-table output', () => {
    const runner = new CliRunner(mockConfig as any);
    expect(runner.parseTableOutput('No sites found')).toEqual([]);
  });

  it('run calls spawnSync with shell:true and returns result', () => {
    vi.mocked(childProcess.spawnSync).mockReturnValue({ stdout: 'ok\n', stderr: '', status: 0, pid: 1, output: [], signal: null });
    const runner = new CliRunner(mockConfig as any);
    const result = runner.run('herd.bat', ['sites']);
    expect(childProcess.spawnSync).toHaveBeenCalledWith('herd.bat', ['sites'], expect.objectContaining({ shell: true }));
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
  });

  it('assertSuccess throws on non-zero exit', () => {
    const runner = new CliRunner(mockConfig as any);
    expect(() => runner.assertSuccess({ stdout: '', stderr: 'boom', exitCode: 1 }, 'mycmd')).toThrow('mycmd failed: boom');
  });
});
