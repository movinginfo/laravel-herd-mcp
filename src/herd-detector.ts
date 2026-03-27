import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const IS_WIN   = process.platform === 'win32';
const IS_MAC   = process.platform === 'darwin';
const HERD_BIN = IS_WIN ? 'herd.bat' : 'herd';  // macOS/Linux: no extension

export interface HerdConfig {
  binDir: string;
  apiPort: number;
  phpExe: string;   // absolute path to php binary
  herdPhar: string; // absolute path to herd.phar
  herdBat: string;  // herd wrapper script (herd.bat on Windows, herd on macOS)
  phpBat: string;   // php wrapper script
  composerBat: string;
  laravelBat: string;
  nvmExe: string;
}

export function detectHerd(overridePath?: string): HerdConfig {
  const binDir = resolveBinDir(overridePath);
  const { apiPort, phpExe } = resolveConfig(binDir);
  const ext = IS_WIN ? '.bat' : '';

  return {
    binDir,
    apiPort,
    phpExe,
    herdPhar:    path.join(binDir, 'herd.phar'),
    herdBat:     path.join(binDir, `herd${ext}`),
    phpBat:      path.join(binDir, `php${ext}`),
    composerBat: path.join(binDir, `composer${ext}`),
    laravelBat:  path.join(binDir, `laravel${ext}`),
    nvmExe:      IS_WIN
      ? path.join(binDir, 'nvm', 'nvm.exe')
      : path.join(binDir, 'nvm', 'nvm'),
  };
}

function resolveBinDir(override?: string): string {
  const xdgHerd = path.join(os.homedir(), '.config', 'herd', 'bin');
  // macOS: Herd stores config in ~/Library/Application Support/Herd/
  const macHerd = IS_MAC
    ? path.join(os.homedir(), 'Library', 'Application Support', 'Herd', 'bin')
    : null;

  const candidates = [
    override,
    process.env.HERD_PATH,
    xdgHerd,
    macHerd,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, HERD_BIN))) {
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
  const phpBin = IS_WIN ? 'php.exe' : 'php';

  // Try the version from config.json first (e.g. "8.4" → "php84")
  if (activeVersion) {
    const key = activeVersion.replace('.', '');
    const candidate = path.join(binDir, `php${key}`, phpBin);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Scan in preferred order
  for (const ver of ['85', '84', '83', '82', '81', '80']) {
    const candidate = path.join(binDir, `php${ver}`, phpBin);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Last resort: the wrapper script
  return path.join(binDir, IS_WIN ? 'php.bat' : 'php');
}
