import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HerdConfig {
  binDir: string;
  apiPort: number;
  herdBat: string;
  phpBat: string;
  composerBat: string;
  laravelBat: string;
  nvmExe: string;
}

export function detectHerd(overridePath?: string): HerdConfig {
  const binDir = resolveBinDir(overridePath);
  const apiPort = resolveApiPort(binDir);

  return {
    binDir,
    apiPort,
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

function resolveApiPort(binDir: string): number {
  // binDir is e.g. C:\Users\<user>\.config\herd\bin
  // config.json is at  C:\Users\<user>\.config\herd\config\config.json
  const configPath = path.join(path.dirname(binDir), 'config', 'config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    return typeof config.apiPort === 'number' ? config.apiPort : 2304;
  } catch {
    return 2304;
  }
}
