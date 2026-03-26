import { spawnSync, spawn, SpawnSyncOptions } from 'child_process';
import type { HerdConfig } from './herd-detector';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class CliRunner {
  constructor(private config: HerdConfig) {}

  run(exe: string, args: string[] = [], cwd?: string): CliResult {
    const result = spawnSync(exe, args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      shell: true,
      timeout: 30000,
    } as SpawnSyncOptions);

    return {
      stdout: this.stripAnsi((result.stdout as string) ?? '').trim(),
      stderr: this.stripAnsi((result.stderr as string) ?? '').trim(),
      exitCode: result.status ?? 1,
    };
  }

  herd(args: string[], cwd?: string): CliResult {
    return this.run(this.config.herdBat, ['--no-ansi', ...args], cwd);
  }

  php(args: string[], cwd?: string): CliResult {
    return this.run(this.config.phpBat, args, cwd);
  }

  composer(args: string[], cwd?: string): CliResult {
    return this.run(this.config.composerBat, args, cwd);
  }

  laravel(args: string[], cwd?: string): CliResult {
    return this.run(this.config.laravelBat, args, cwd);
  }

  nvm(args: string[]): CliResult {
    return this.run(this.config.nvmExe, args);
  }

  spawnDetached(exe: string, args: string[], cwd?: string): number {
    const child = spawn(exe, args, {
      cwd,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    child.unref();
    return child.pid ?? -1;
  }

  stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-9;]*[mGKHFJA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '');
  }

  parseTableOutput(raw: string): Record<string, string>[] {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const dataLines = lines.filter(l => l.startsWith('|') && !l.startsWith('+'));
    if (dataLines.length < 2) return [];

    const headers = dataLines[0]
      .split('|')
      .map(h => h.trim())
      .filter(Boolean);

    return dataLines.slice(1).map(line => {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
    });
  }

  assertSuccess(result: CliResult, context: string): void {
    if (result.exitCode !== 0) {
      throw new Error(`${context} failed: ${result.stderr || result.stdout}`);
    }
  }
}
