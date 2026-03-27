import { spawnSync, spawn, SpawnSyncOptions } from 'child_process';
import * as path from 'path';
import type { HerdConfig } from './herd-detector';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class CliRunner {
  constructor(private config: HerdConfig) {}

  run(exe: string, args: string[] = [], cwd?: string, stdin?: string): CliResult {
    // Prepend Herd's bin dir to PATH so any sub-scripts can resolve php/composer/etc.
    const pathSep = process.platform === 'win32' ? ';' : ':';
    const augmentedPath = `${this.config.binDir}${pathSep}${path.dirname(this.config.phpExe)}${pathSep}${process.env.PATH ?? ''}`;

    const result = spawnSync(exe, args, {
      cwd,
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, PATH: augmentedPath, NO_COLOR: '1', FORCE_COLOR: '0' },
      shell: true,
      timeout: 30000,
    } as SpawnSyncOptions);

    return {
      stdout: this.stripAnsi((result.stdout as string) ?? '').trim(),
      stderr: this.stripAnsi((result.stderr as string) ?? '').trim(),
      exitCode: result.status ?? 1,
    };
  }

  /**
   * Run a herd.phar command directly via php.exe, bypassing herd.bat's
   * find-usable-php.php dance which breaks when the user profile path
   * contains non-ASCII (Cyrillic) characters.
   */
  herd(args: string[], cwd?: string): CliResult {
    return this.run(this.config.phpExe, [this.config.herdPhar, '--no-ansi', ...args], cwd);
  }

  php(args: string[], cwd?: string, stdin?: string): CliResult {
    return this.run(this.config.phpExe, args, cwd, stdin);
  }

  composer(args: string[], cwd?: string): CliResult {
    return this.run(this.config.phpExe, [
      path.join(this.config.binDir, 'composer.phar'),
      ...args,
    ], cwd);
  }

  laravel(args: string[], cwd?: string): CliResult {
    return this.run(this.config.phpExe, [
      path.join(this.config.binDir, 'laravel.phar'),
      ...args,
    ], cwd);
  }

  expose(args: string[], cwd?: string): CliResult {
    return this.run(this.config.phpExe, [
      path.join(this.config.binDir, 'expose.phar'),
      ...args,
    ], cwd);
  }

  phpWithDebug(script: string, cwd?: string): CliResult {
    const pathSep = process.platform === 'win32' ? ';' : ':';
    const augmentedPath = `${this.config.binDir}${pathSep}${path.dirname(this.config.phpExe)}${pathSep}${process.env.PATH ?? ''}`;
    const result = spawnSync(this.config.phpExe, [script], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, PATH: augmentedPath, NO_COLOR: '1', FORCE_COLOR: '0', XDEBUG_SESSION: '1' },
      shell: true,
      timeout: 30000,
    } as SpawnSyncOptions);
    return {
      stdout: this.stripAnsi((result.stdout as string) ?? '').trim(),
      stderr: this.stripAnsi((result.stderr as string) ?? '').trim(),
      exitCode: result.status ?? 1,
    };
  }

  phpWithCoverage(script: string, cwd?: string): CliResult {
    const pathSep = process.platform === 'win32' ? ';' : ':';
    const augmentedPath = `${this.config.binDir}${pathSep}${path.dirname(this.config.phpExe)}${pathSep}${process.env.PATH ?? ''}`;
    const result = spawnSync(this.config.phpExe, [script], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, PATH: augmentedPath, NO_COLOR: '1', FORCE_COLOR: '0', XDEBUG_MODE: 'coverage' },
      shell: true,
      timeout: 30000,
    } as SpawnSyncOptions);
    return {
      stdout: this.stripAnsi((result.stdout as string) ?? '').trim(),
      stderr: this.stripAnsi((result.stderr as string) ?? '').trim(),
      exitCode: result.status ?? 1,
    };
  }

  nvm(args: string[]): CliResult {
    return this.run(this.config.nvmExe, args);
  }

  /**
   * Run a Laravel Forge CLI command.
   * Forge is installed globally via `composer global require laravel/forge-cli`.
   * We look for forge.bat in APPDATA\Composer\vendor\bin, then fall back to PATH.
   */
  forge(args: string[], cwd?: string): CliResult {
    const forgeBat = this.detectForge();
    return this.run(forgeBat, args, cwd);
  }

  detectForge(): string {
    const os = require('os');
    const fs = require('fs');
    // Try Composer global bin on Windows
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    const composerBin = path.join(appData, 'Composer', 'vendor', 'bin', 'forge.bat');
    if (fs.existsSync(composerBin)) return composerBin;
    // Try Composer global bin (non-Windows or alternate location)
    const composerBinUnix = path.join(os.homedir(), '.composer', 'vendor', 'bin', 'forge');
    if (fs.existsSync(composerBinUnix)) return composerBinUnix;
    // Fall back to PATH
    return 'forge';
  }

  phpDetached(args: string[], cwd?: string): number {
    return this.spawnDetached(this.config.phpExe, args, cwd);
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

  /**
   * Convert ASCII CLI table output (+---+---+ / | ... |) to a Markdown table.
   * Falls back to the original text if the output is not a recognised table.
   */
  toMarkdownTable(raw: string): string {
    const rows = this.parseTableOutput(raw);
    if (rows.length === 0) return raw;

    const headers = Object.keys(rows[0]);
    const header    = '| ' + headers.join(' | ') + ' |';
    const separator = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const body      = rows.map(row =>
      '| ' + headers.map(h => row[h] ?? '').join(' | ') + ' |'
    ).join('\n');

    return [header, separator, body].join('\n');
  }

  assertSuccess(result: CliResult, context: string): void {
    if (result.exitCode !== 0) {
      throw new Error(`${context} failed: ${result.stderr || result.stdout}`);
    }
  }
}
