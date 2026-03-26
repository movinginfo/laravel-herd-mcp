import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HerdConfig {
  binDir: string;
  apiPort: number;
  phpExe: string;   // absolute path to php.exe — bypasses herd.bat's find-usable-php.php
  herdPhar: string; // absolute path to herd.phar
  herdBat: string;
  phpBat: string;
  composerBat: string;
  laravelBat: string;
  nvmExe: string;
}

export function detectHerd(overridePath?: string): HerdConfig {
  const binDir = resolveBinDir(overridePath);
  const { apiPort, phpExe } = resolveConfig(binDir);

  return {
    binDir,
    apiPort,
    phpExe,
    herdPhar:    path.join(binDir, 'herd.phar'),
    herdBat:     path.join(binDir, 'herd.bat'),
    phpBat:      path.join(binDir, 'php.bat'),
    composerBat: path.join(binDir, 'composer.bat'),
    laravelBat:  path.join(binDir, 'laravel.bat'),
    nvmExe:      path.join(binDir, 'nvm', 'nvm.exe'),
  };
}

function resolveBinDir(override?: string): string {
  const candidates = [
    override,
    process.env.HERD_PATH,
    path.join(os.homedir(), '.config', 'herd', 'bin'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'herd.bat'))) {
      return candidate;
    }
  }

  throw new Error(
    'Laravel Herd not found. Install Herd from https://herd.laravel.com ' +
    'or set the HERD_PATH environment variable to your Herd bin directory.'
  );
}

function resolveConfig(binDir: string): { apiPort: number; phpExe: string } {
  // binDir is e.g. C:\Users\<user>\.config\herd\bin
  // config.json is at  C:\Users\<user>\.config\herd\config\config.json
  const configPath = path.join(path.dirname(binDir), 'config', 'config.json');
  let apiPort = 2304;
  let activeVersion = '';

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(raw);
    if (typeof cfg.apiPort === 'number') apiPort = cfg.apiPort;
    if (typeof cfg.activeVersion === 'string') activeVersion = cfg.activeVersion;
  } catch {
    // defaults
  }

  const phpExe = resolvePhpExe(binDir, activeVersion);
  return { apiPort, phpExe };
}

function resolvePhpExe(binDir: string, activeVersion: string): string {
  // Try the version from config.json first (e.g. "8.4" → "php84")
  if (activeVersion) {
    const key = activeVersion.replace('.', '');
    const candidate = path.join(binDir, `php${key}`, 'php.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  // Scan in preferred order
  for (const ver of ['85', '84', '83', '82', '81', '80']) {
    const candidate = path.join(binDir, `php${ver}`, 'php.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  // Last resort: the php.bat wrapper (will work but slower)
  return path.join(binDir, 'php.bat');
}
