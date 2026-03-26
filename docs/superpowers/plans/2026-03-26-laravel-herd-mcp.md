# laravel-herd-mcp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript/Node.js MCP server (`laravel-herd-mcp`) that gives Claude full control over Laravel Herd v1.27 on Windows via 43 tools across stdio and HTTP/SSE transports.

**Architecture:** Two communication channels — Herd's internal HTTP API (port read from `config.json`, default `2304`) for structured JSON responses, and Herd's `.bat` CLI wrappers for operations not exposed by the API. All tools return clean structured objects; ANSI codes are stripped from CLI output.

**Tech Stack:** TypeScript, Node.js 18+, `@modelcontextprotocol/sdk`, `zod`, `strip-ansi`, `express` (HTTP/SSE mode), `vitest` (tests)

---

## File Map

```
laravel-herd-mcp/
├── src/
│   ├── index.ts              # CLI entry: parse --http/--port/--herd-path flags, start server
│   ├── server.ts             # MCP server factory: registers all tools on McpServer instance
│   ├── herd-detector.ts      # Resolve Herd bin dir + API port from env/flag/auto-detect
│   ├── http-client.ts        # fetch() wrapper for Herd API calls at 127.0.0.1:{port}
│   ├── cli-runner.ts         # spawn herd.bat/php.bat/etc., strip ANSI, return stdout/stderr
│   ├── tool-result.ts        # Shared helpers: textResult() and errorResult() used by all tools
│   └── tools/
│       ├── sites.ts          # list_all_sites, get_site_info, open_site, which_driver
│       ├── parks.ts          # park_directory, unpark_directory, list_parked_dirs, list_parked_sites
│       ├── links.ts          # link_site, unlink_site, list_links
│       ├── php.ts            # list_php_versions, install_php_version, update_php_version, use_php_globally, which_php
│       ├── isolation.ts      # isolate_site_php, unisolate_site_php, list_isolated_sites
│       ├── ssl.ts            # secure_site, unsecure_site, list_secured_sites
│       ├── proxies.ts        # create_proxy, remove_proxy, list_proxies
│       ├── services.ts       # list_available_services, list_installed_services, install_service, start_service, stop_service, delete_service, list_service_versions
│       ├── debug.ts          # start_debug_session, stop_debug_session
│       ├── core.ts           # start_herd, stop_herd, restart_herd, get_tld, set_tld, get_loopback, set_loopback, set_directory_listing
│       ├── sharing.ts        # share_site (detached spawn), get_share_url
│       ├── logs.ts           # tail_log
│       ├── nvm.ts            # nvm_list, nvm_install, nvm_use
│       ├── forge.ts          # get_forge_deployment_info, get_forge_env_vars
│       ├── db.ts             # get_site_db_info
│       ├── manifest.ts       # init_herd_manifest, create_fresh_manifest
│       └── proxy-commands.ts # run_php_command, run_composer, create_laravel_project
├── tests/
│   ├── herd-detector.test.ts
│   ├── http-client.test.ts
│   ├── cli-runner.test.ts
│   └── tools/
│       ├── sites.test.ts
│       ├── parks.test.ts
│       ├── php.test.ts
│       ├── ssl.test.ts
│       ├── services.test.ts
│       └── core.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                 # already created
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialise npm project**

```bash
cd "C:/Work/Laravel Herd MCP Plugin for Claude Code"
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod strip-ansi express
npm install --save-dev typescript @types/node @types/express vitest tsx
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 5: Update `package.json` scripts and bin**

Replace the scripts section and add bin/main fields:

```json
{
  "name": "laravel-herd-mcp",
  "version": "0.1.0",
  "description": "MCP server for full Laravel Herd control on Windows",
  "main": "dist/index.js",
  "bin": {
    "laravel-herd-mcp": "dist/index.js"
  },
  "type": "commonjs",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "laravel", "herd", "claude"],
  "license": "MIT"
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
*.js.map
.env
```

- [ ] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: project scaffold"
```

---

## Task 2: Herd Detector

**Files:**
- Create: `src/herd-detector.ts`
- Create: `tests/herd-detector.test.ts`

The detector resolves: Herd bin dir (for `.bat` files), API port (from `config.json`), and NVM exe path.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/herd-detector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');

describe('HerdDetector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.HERD_PATH;
  });

  it('uses HERD_PATH env var when set', async () => {
    process.env.HERD_PATH = 'C:/custom/herd/bin';
    vi.mocked(fs.existsSync).mockReturnValue(true);
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

  it('defaults apiPort to 2304 when config.json missing apiPort key', async () => {
    process.env.HERD_PATH = 'C:/custom/herd/bin';
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).includes('herd.bat')
    );
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
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
npx vitest run tests/herd-detector.test.ts
```

Expected: FAIL — `Cannot find module '../src/herd-detector'`

- [ ] **Step 3: Implement `src/herd-detector.ts`**

```typescript
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
  const binDir = resolveBindDir(overridePath);
  const apiPort = resolveApiPort(binDir);

  return {
    binDir,
    apiPort,
    herdBat: path.join(binDir, 'herd.bat'),
    phpBat: path.join(binDir, 'php.bat'),
    composerBat: path.join(binDir, 'composer.bat'),
    laravelBat: path.join(binDir, 'laravel.bat'),
    nvmExe: path.join(binDir, 'nvm', 'nvm.exe'),
  };
}

function resolveBindDir(override?: string): string {
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
  const configPath = path.join(
    path.dirname(binDir), // .config/herd
    'config',
    'config.json'
  );

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    return typeof config.apiPort === 'number' ? config.apiPort : 2304;
  } catch {
    return 2304;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/herd-detector.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/herd-detector.ts tests/herd-detector.test.ts
git commit -m "feat: herd path and port detector"
```

---

## Task 3: HTTP Client

**Files:**
- Create: `src/http-client.ts`
- Create: `tests/http-client.test.ts`

Thin wrapper around Node's `fetch` targeting `http://127.0.0.1:{port}`.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/http-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();

describe('HerdHttpClient', () => {
  beforeEach(() => vi.resetAllMocks());

  it('GET returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: 'myapp' }]),
    } as Response);

    const { HerdHttpClient } = await import('../src/http-client');
    const client = new HerdHttpClient(9001);
    const result = await client.get('/sites');
    expect(result).toEqual([{ name: 'myapp' }]);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:9001/sites', expect.objectContaining({ method: 'GET' }));
  });

  it('POST sends form-encoded body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const { HerdHttpClient } = await import('../src/http-client');
    const client = new HerdHttpClient(9001);
    await client.post('/sites/secure/myapp');
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]?.method).toBe('POST');
  });

  it('throws HerdApiError with status on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Unprocessable'),
    } as Response);

    const { HerdHttpClient, HerdApiError } = await import('../src/http-client');
    const client = new HerdHttpClient(9001);
    await expect(client.get('/sites')).rejects.toBeInstanceOf(HerdApiError);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/http-client.test.ts
```

- [ ] **Step 3: Implement `src/http-client.ts`**

```typescript
export class HerdApiError extends Error {
  constructor(public status: number, message: string) {
    super(`Herd API error ${status}: ${message}`);
    this.name = 'HerdApiError';
  }
}

export class HerdHttpClient {
  private base: string;

  constructor(port: number) {
    this.base = `http://127.0.0.1:${port}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.base}${endpoint}`, { method: 'GET' });
    return this.parse<T>(res);
  }

  async post<T>(endpoint: string, body?: Record<string, string | number>): Promise<T> {
    const res = await fetch(`${this.base}${endpoint}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
      body: body ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])) : undefined,
    });
    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const text = await res.text();
      throw new HerdApiError(res.status, text);
    }
    return res.json() as Promise<T>;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/http-client.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/http-client.ts tests/http-client.test.ts
git commit -m "feat: herd HTTP API client"
```

---

## Task 4: CLI Runner

**Files:**
- Create: `src/cli-runner.ts`
- Create: `tests/cli-runner.test.ts`

Spawns `.bat` files, strips ANSI, returns `{ stdout, stderr, exitCode }`.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/cli-runner.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CliRunner } from '../src/cli-runner';
import type { HerdConfig } from '../src/herd-detector';

const mockConfig: HerdConfig = {
  binDir: 'C:/herd/bin',
  apiPort: 9001,
  herdBat: 'C:/herd/bin/herd.bat',
  phpBat: 'C:/herd/bin/php.bat',
  composerBat: 'C:/herd/bin/composer.bat',
  laravelBat: 'C:/herd/bin/laravel.bat',
  nvmExe: 'C:/herd/bin/nvm/nvm.exe',
};

describe('CliRunner', () => {
  it('strips ANSI escape codes from output', async () => {
    const runner = new CliRunner(mockConfig);
    // Use a command that produces ANSI output on Windows
    // We test the stripping logic directly
    const cleaned = runner.stripAnsi('\u001b[32mHello\u001b[39m');
    expect(cleaned).toBe('Hello');
  });

  it('parseTableOutput extracts rows from herd table format', () => {
    const runner = new CliRunner(mockConfig);
    const raw = `
+------+-----+
| Site | SSL |
+------+-----+
| app  | Yes |
+------+-----+
`;
    const rows = runner.parseTableOutput(raw);
    expect(rows).toEqual([{ Site: 'app', SSL: 'Yes' }]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/cli-runner.test.ts
```

- [ ] **Step 3: Implement `src/cli-runner.ts`**

```typescript
import { spawnSync, spawn, SpawnOptions } from 'child_process';
import type { HerdConfig } from './herd-detector';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class CliRunner {
  constructor(private config: HerdConfig) {}

  run(bat: string, args: string[] = [], cwd?: string): CliResult {
    const result = spawnSync(bat, args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      shell: true,
    });

    return {
      stdout: this.stripAnsi(result.stdout ?? '').trim(),
      stderr: this.stripAnsi(result.stderr ?? '').trim(),
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

  /**
   * Spawn a long-running process detached (fire-and-forget).
   * Returns the spawned child PID.
   */
  spawnDetached(bat: string, args: string[], cwd?: string): number {
    const child = spawn(bat, args, {
      cwd,
      detached: true,
      stdio: 'ignore',
      shell: true,
    } as SpawnOptions);
    child.unref();
    return child.pid ?? -1;
  }

  stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
  }

  /**
   * Parse herd's ASCII table output into array of objects.
   * Table format: | col1 | col2 | with +---+---+ separator rows.
   */
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/cli-runner.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/cli-runner.ts tests/cli-runner.test.ts
git commit -m "feat: CLI runner with ANSI stripping and table parsing"
```

---

## Task 5: Sites Tools

**Files:**
- Create: `src/tool-result.ts`
- Create: `src/tools/sites.ts`
- Create: `tests/tools/sites.test.ts`

Tools: `list_all_sites`, `get_site_info`, `open_site`, `which_driver`

- [ ] **Step 1: Create `src/tool-result.ts` first** — imported by every tool file

```typescript
// src/tool-result.ts
export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function errorResult(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/tools/sites.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerSitesTools } from '../../src/tools/sites';
import type { HerdHttpClient } from '../../src/http-client';
import type { CliRunner } from '../../src/cli-runner';

const mockClient = { get: vi.fn(), post: vi.fn() } as unknown as HerdHttpClient;
const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn() } as unknown as CliRunner;
const mockServer = { tool: vi.fn() };

describe('sites tools', () => {
  it('registers 4 tools', () => {
    registerSitesTools(mockServer as any, mockClient, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
  });

  it('list_all_sites calls GET /sites', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((name: string, _desc: any, _schema: any, handler: Function) => {
      tools[name] = handler;
    });
    mockClient.get = vi.fn().mockResolvedValue([{ name: 'myapp', secured: false }]);

    registerSitesTools(mockServer as any, mockClient, mockRunner);
    const result = await tools['list_all_sites']({});
    expect(mockClient.get).toHaveBeenCalledWith('/sites');
    expect(result.content[0].text).toContain('myapp');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/tools/sites.test.ts
```

- [ ] **Step 3: Implement `src/tools/sites.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSitesTools(
  server: McpServer,
  client: HerdHttpClient,
  runner: CliRunner
): void {
  server.tool('list_all_sites', 'List all Laravel Herd sites with URL, PHP version, SSL status and path', {}, async () => {
    try {
      const sites = await client.get<any[]>('/sites');
      return textResult(JSON.stringify(sites, null, 2));
    } catch (e) {
      return errorResult(e);
    }
  });

  server.tool('get_site_info', 'Get detailed information about a named Herd site', {
    name: z.string().describe('Site name without .test suffix'),
  }, async ({ name }) => {
    try {
      const sites = await client.get<any[]>('/sites');
      const site = sites.find((s: any) => s.name === name || s.site === name);
      if (!site) return textResult(`Site "${name}" not found.`);
      return textResult(JSON.stringify(site, null, 2));
    } catch (e) {
      return errorResult(e);
    }
  });

  server.tool('open_site', 'Open a Herd site in the default browser', {
    name: z.string().optional().describe('Site name (defaults to current directory)'),
  }, async ({ name }) => {
    try {
      const args = name ? ['open', name] : ['open'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'open_site');
      return textResult(result.stdout || `Opened ${name ?? 'current site'} in browser.`);
    } catch (e) {
      return errorResult(e);
    }
  });

  server.tool('which_driver', 'Show which Herd driver serves the current directory', {
    path: z.string().optional().describe('Directory path (defaults to current working directory)'),
  }, async ({ path: cwd }) => {
    try {
      const result = runner.herd(['which'], cwd);
      runner.assertSuccess(result, 'which_driver');
      return textResult(result.stdout);
    } catch (e) {
      return errorResult(e);
    }
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/tools/sites.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/tool-result.ts src/tools/sites.ts tests/tools/sites.test.ts
git commit -m "feat: tool-result helper + sites tools"
```

---

## Task 6: Parks & Links Tools

**Files:**
- Create: `src/tools/parks.ts`
- Create: `src/tools/links.ts`
- Create: `tests/tools/parks.test.ts`

- [ ] **Step 1: Write failing test for parks**

```typescript
// tests/tools/parks.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerParksTools } from '../../src/tools/parks';

const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() } as any;
const mockServer = { tool: vi.fn() };

describe('parks tools', () => {
  it('registers 4 tools', () => {
    registerParksTools(mockServer as any, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
  });

  it('unpark calls herd forget', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((name: string, _d: any, _s: any, h: Function) => { tools[name] = h; });
    mockRunner.herd.mockReturnValue({ stdout: '', stderr: '', exitCode: 0 });

    registerParksTools(mockServer as any, mockRunner);
    await tools['unpark_directory']({ path: 'C:/myprojects' });
    expect(mockRunner.herd).toHaveBeenCalledWith(['forget', 'C:/myprojects']);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/tools/parks.test.ts
```

- [ ] **Step 3: Implement `src/tools/parks.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerParksTools(server: McpServer, runner: CliRunner): void {
  server.tool('park_directory', 'Register a directory so all subdirectories become .test sites', {
    path: z.string().optional().describe('Directory to park (defaults to current directory)'),
  }, async ({ path: dir }) => {
    try {
      const args = dir ? ['park', dir] : ['park'];
      const result = runner.herd(args, dir);
      runner.assertSuccess(result, 'park_directory');
      return textResult(result.stdout || 'Directory parked successfully.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('unpark_directory', 'Remove a directory from Herd\'s parked paths', {
    path: z.string().optional().describe('Directory to unpark (defaults to current directory)'),
  }, async ({ path: dir }) => {
    try {
      const args = dir ? ['forget', dir] : ['forget'];
      const result = runner.herd(args, dir);
      runner.assertSuccess(result, 'unpark_directory');
      return textResult(result.stdout || 'Directory removed from parked paths.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_parked_dirs', 'List registered parent park directories (herd paths)', {}, async () => {
    try {
      const result = runner.herd(['paths']);
      runner.assertSuccess(result, 'list_parked_dirs');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_parked_sites', 'List all sites resolving from parked directories (herd parked)', {}, async () => {
    try {
      const result = runner.herd(['parked']);
      const rows = runner.parseTableOutput(result.stdout);
      return textResult(JSON.stringify(rows, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/links.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerLinksTools(server: McpServer, runner: CliRunner): void {
  server.tool('link_site', 'Register current directory as a named Herd site', {
    name: z.string().optional().describe('Site name (defaults to directory name)'),
    secure: z.boolean().optional().describe('Also secure with HTTPS'),
    isolate: z.string().optional().describe('PHP version to isolate (e.g. "8.3")'),
  }, async ({ name, secure, isolate }) => {
    try {
      const args = ['link', ...(name ? [name] : []),
        ...(secure ? ['--secure'] : []),
        ...(isolate ? [`--isolate=${isolate}`] : [])];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'link_site');
      return textResult(result.stdout || 'Site linked.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('unlink_site', 'Remove a named Herd site link', {
    name: z.string().optional().describe('Site name to unlink (defaults to current directory name)'),
  }, async ({ name }) => {
    try {
      const args = name ? ['unlink', name] : ['unlink'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'unlink_site');
      return textResult(result.stdout || 'Site unlinked.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_links', 'List all linked Herd sites', {}, async () => {
    try {
      const result = runner.herd(['links']);
      const rows = runner.parseTableOutput(result.stdout);
      return textResult(JSON.stringify(rows, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/tools/parks.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/parks.ts src/tools/links.ts tests/tools/parks.test.ts
git commit -m "feat: parks and links tools"
```

---

## Task 7: PHP Tools

**Files:**
- Create: `src/tools/php.ts`
- Create: `src/tools/isolation.ts`
- Create: `tests/tools/php.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/tools/php.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerPhpTools } from '../../src/tools/php';

const mockClient = { get: vi.fn(), post: vi.fn() } as any;
const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() } as any;
const mockServer = { tool: vi.fn() };

describe('php tools', () => {
  it('registers 5 tools', () => {
    registerPhpTools(mockServer as any, mockClient, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(5);
  });

  it('list_php_versions calls GET /php-versions', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockClient.get.mockResolvedValue([{ version: '8.4', installed: true, active: true }]);

    registerPhpTools(mockServer as any, mockClient, mockRunner);
    const result = await tools['list_php_versions']({});
    expect(mockClient.get).toHaveBeenCalledWith('/php-versions');
    expect(result.content[0].text).toContain('8.4');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/tools/php.test.ts
```

- [ ] **Step 3: Implement `src/tools/php.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerPhpTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('list_php_versions', 'List all PHP versions with install and active status', {}, async () => {
    try {
      const versions = await client.get('/php-versions');
      return textResult(JSON.stringify(versions, null, 2));
    } catch (e) { return errorResult(e); }
  });

  server.tool('install_php_version', 'Install a PHP version (e.g. "8.3", "8.4")', {
    version: z.string().describe('PHP version, e.g. "8.3"'),
  }, async ({ version }) => {
    try {
      await client.post(`/install-php/${version}`);
      return textResult(`PHP ${version} installation started.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('update_php_version', 'Update an installed PHP version to its latest patch release', {
    version: z.string().describe('PHP version to update, e.g. "8.4"'),
  }, async ({ version }) => {
    try {
      const result = runner.herd(['php:update', version]);
      runner.assertSuccess(result, 'update_php_version');
      return textResult(result.stdout || `PHP ${version} updated.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('use_php_globally', 'Set the global default PHP version for all non-isolated sites', {
    version: z.string().describe('PHP version to use globally, e.g. "8.4"'),
  }, async ({ version }) => {
    try {
      const result = runner.herd(['use', version]);
      runner.assertSuccess(result, 'use_php_globally');
      return textResult(result.stdout || `Global PHP set to ${version}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('which_php', 'Show the PHP binary path used for a site or current directory', {
    site: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ site }) => {
    try {
      const args = site ? ['which-php', `--site=${site}`] : ['which-php'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'which_php');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/isolation.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerIsolationTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('isolate_site_php', 'Pin a site to a specific PHP version', {
    site: z.string().describe('Site name without .test suffix'),
    phpVersion: z.string().describe('PHP version, e.g. "8.3"'),
  }, async ({ site, phpVersion }) => {
    try {
      await client.post(`/sites/isolate/${site}`, { phpVersion });
      return textResult(`Site "${site}" isolated to PHP ${phpVersion}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('unisolate_site_php', 'Remove PHP isolation from a site (uses global PHP version)', {
    site: z.string().describe('Site name without .test suffix'),
  }, async ({ site }) => {
    try {
      await client.post(`/sites/unisolate/${site}`);
      return textResult(`Site "${site}" now uses the global PHP version.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_isolated_sites', 'List all sites using an isolated PHP version', {}, async () => {
    try {
      const result = runner.herd(['isolated']);
      const rows = runner.parseTableOutput(result.stdout);
      return textResult(JSON.stringify(rows, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/tools/php.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/php.ts src/tools/isolation.ts tests/tools/php.test.ts
git commit -m "feat: PHP version and isolation tools"
```

---

## Task 8: SSL & Proxies Tools

**Files:**
- Create: `src/tools/ssl.ts`
- Create: `src/tools/proxies.ts`
- Create: `tests/tools/ssl.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/tools/ssl.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerSslTools } from '../../src/tools/ssl';

const mockClient = { get: vi.fn(), post: vi.fn() } as any;
const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() } as any;
const mockServer = { tool: vi.fn() };

describe('ssl tools', () => {
  it('registers 3 tools', () => {
    registerSslTools(mockServer as any, mockClient, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(3);
  });

  it('secure_site calls POST /sites/secure/{name}', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockClient.post.mockResolvedValue({});
    registerSslTools(mockServer as any, mockClient, mockRunner);
    await tools['secure_site']({ name: 'myapp' });
    expect(mockClient.post).toHaveBeenCalledWith('/sites/secure/myapp');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/tools/ssl.test.ts
```

- [ ] **Step 3: Implement `src/tools/ssl.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSslTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('secure_site', 'Enable HTTPS with a trusted TLS certificate for a site', {
    name: z.string().describe('Site name without .test suffix'),
  }, async ({ name }) => {
    try {
      await client.post(`/sites/secure/${name}`);
      return textResult(`Site "${name}" is now secured with HTTPS.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('unsecure_site', 'Remove HTTPS from a site', {
    name: z.string().describe('Site name without .test suffix'),
  }, async ({ name }) => {
    try {
      await client.post(`/sites/unsecure/${name}`);
      return textResult(`HTTPS removed from site "${name}".`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_secured_sites', 'List all sites with active TLS certificates and expiry dates', {
    expiring: z.boolean().optional().describe('Only show sites with expiring certificates'),
    days: z.number().optional().describe('Days threshold for expiry warning'),
  }, async ({ expiring, days }) => {
    try {
      const args = ['secured', ...(expiring ? ['--expiring'] : []), ...(days ? [`--days=${days}`] : [])];
      const result = runner.herd(args);
      const rows = runner.parseTableOutput(result.stdout);
      return textResult(JSON.stringify(rows, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/proxies.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerProxiesTools(server: McpServer, runner: CliRunner): void {
  server.tool('create_proxy', 'Create an Nginx proxy to a local port (for Docker, Reverb, Mailhog, etc.)', {
    domain: z.string().describe('Domain name for the proxy, e.g. "reverb"'),
    target: z.string().describe('Target URL, e.g. "http://127.0.0.1:8080"'),
    secure: z.boolean().optional().describe('Also secure proxy with HTTPS'),
  }, async ({ domain, target, secure }) => {
    try {
      const args = ['proxy', domain, target, ...(secure ? ['--secure'] : [])];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'create_proxy');
      return textResult(result.stdout || `Proxy created: ${domain}.test → ${target}`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('remove_proxy', 'Remove a proxy configuration', {
    domain: z.string().describe('Proxy domain to remove'),
  }, async ({ domain }) => {
    try {
      const result = runner.herd(['unproxy', domain]);
      runner.assertSuccess(result, 'remove_proxy');
      return textResult(result.stdout || `Proxy "${domain}" removed.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_proxies', 'List all configured Nginx proxies', {}, async () => {
    try {
      const result = runner.herd(['proxies']);
      const rows = runner.parseTableOutput(result.stdout);
      return textResult(JSON.stringify(rows, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/tools/ssl.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/ssl.ts src/tools/proxies.ts tests/tools/ssl.test.ts
git commit -m "feat: SSL and proxy tools"
```

---

## Task 9: Services & Debug Tools (Pro)

**Files:**
- Create: `src/tools/services.ts`
- Create: `src/tools/debug.ts`
- Create: `tests/tools/services.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/tools/services.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerServicesTools } from '../../src/tools/services';

const mockClient = { get: vi.fn(), post: vi.fn() } as any;
const mockRunner = { herd: vi.fn(), parseTableOutput: vi.fn(), assertSuccess: vi.fn() } as any;
const mockServer = { tool: vi.fn() };

describe('services tools', () => {
  it('registers 7 tools', () => {
    registerServicesTools(mockServer as any, mockClient, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(7);
  });

  it('list_available_services calls GET /available-extra-services', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockClient.get.mockResolvedValue([{ type: 'mysql' }]);
    registerServicesTools(mockServer as any, mockClient, mockRunner);
    await tools['list_available_services']({});
    expect(mockClient.get).toHaveBeenCalledWith('/available-extra-services');
  });

  it('start_service uses URL order type/version/port', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockClient.post.mockResolvedValue({});
    registerServicesTools(mockServer as any, mockClient, mockRunner);
    await tools['start_service']({ type: 'mysql', version: '8.0.36', port: 3306 });
    expect(mockClient.post).toHaveBeenCalledWith('/start-extra-service/mysql/8.0.36/3306');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/tools/services.test.ts
```

- [ ] **Step 3: Implement `src/tools/services.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

const SERVICE_TYPES = ['mysql', 'redis', 'meilisearch', 'minio', 'reverb', 'postgresql', 'rustfs', 'mongodb', 'mariadb'] as const;

export function registerServicesTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('list_available_services', 'List service types that can be installed (mysql, redis, postgresql, etc.)', {}, async () => {
    try {
      const services = await client.get('/available-extra-services');
      return textResult(JSON.stringify(services, null, 2));
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_installed_services', 'List installed service instances with running status and connection env vars', {}, async () => {
    try {
      const result = runner.herd(['services:list']);
      return textResult(result.stdout || 'No services installed. (Herd Pro required)');
    } catch (e) { return errorResult(e); }
  });

  server.tool('install_service', 'Install a Herd Pro service (mysql, redis, postgresql, mariadb, meilisearch, minio, reverb, rustfs, mongodb)', {
    type: z.enum(SERVICE_TYPES).describe('Service type'),
    port: z.number().describe('Port number, e.g. 3306 for MySQL'),
    name: z.string().optional().describe('Custom instance name'),
    version: z.string().optional().describe('Specific version, e.g. "8.0.36"'),
  }, async ({ type, port, name, version }) => {
    try {
      const args = ['services:create', type,
        `--port=${port}`,
        ...(name ? [`--name=${name}`] : []),
        ...(version ? [`--service-version=${version}`] : [])];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'install_service');
      return textResult(result.stdout || `Service ${type} installed on port ${port}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('start_service', 'Start a Herd Pro service instance', {
    type: z.enum(SERVICE_TYPES).describe('Service type'),
    version: z.string().describe('Service version, e.g. "8.0.36"'),
    port: z.number().describe('Port number'),
  }, async ({ type, version, port }) => {
    try {
      // URL order: type / version / port
      await client.post(`/start-extra-service/${type}/${version}/${port}`);
      return textResult(`Service ${type} ${version} started on port ${port}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('stop_service', 'Stop a Herd Pro service instance', {
    type: z.enum(SERVICE_TYPES).describe('Service type'),
    version: z.string().describe('Service version, e.g. "8.0.36"'),
    port: z.number().describe('Port number'),
  }, async ({ type, version, port }) => {
    try {
      // URL order: type / version / port
      await client.post(`/stop-extra-service/${type}/${version}/${port}`);
      return textResult(`Service ${type} ${version} stopped.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('delete_service', 'Delete a Herd Pro service and all its data (irreversible)', {
    identifier: z.string().describe('Service identifier as shown in services:list'),
  }, async ({ identifier }) => {
    try {
      const result = runner.herd(['services:delete', identifier]);
      runner.assertSuccess(result, 'delete_service');
      return textResult(result.stdout || `Service "${identifier}" deleted.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('list_service_versions', 'List available versions for a service type', {
    type: z.enum(SERVICE_TYPES).describe('Service type'),
  }, async ({ type }) => {
    try {
      const result = runner.herd(['services:versions', type]);
      runner.assertSuccess(result, 'list_service_versions');
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/debug.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { HerdHttpClient } from '../http-client';
import { textResult, errorResult } from '../tool-result';

export function registerDebugTools(server: McpServer, client: HerdHttpClient): void {
  server.tool('start_debug_session', 'Start a Herd Pro debug capture session (queries, logs, dumps, jobs, HTTP requests)', {}, async () => {
    try {
      await client.post('/debug/start');
      return textResult('Debug session started. Make requests to your site, then call stop_debug_session.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('stop_debug_session', 'Stop the active debug session and return all captured data', {}, async () => {
    try {
      const data = await client.post<any>('/debug/stop');
      return textResult(JSON.stringify(data, null, 2));
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/tools/services.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/services.ts src/tools/debug.ts tests/tools/services.test.ts
git commit -m "feat: services and debug tools (Pro)"
```

---

## Task 10: Core, Sharing, Logs, NVM Tools

**Files:**
- Create: `src/tools/core.ts`
- Create: `src/tools/sharing.ts`
- Create: `src/tools/logs.ts`
- Create: `src/tools/nvm.ts`
- Create: `tests/tools/core.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/tools/core.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerCoreTools } from '../../src/tools/core';

const mockRunner = { herd: vi.fn(), assertSuccess: vi.fn() } as any;
const mockServer = { tool: vi.fn() };

describe('core tools', () => {
  it('registers 8 tools', () => {
    registerCoreTools(mockServer as any, mockRunner);
    expect(mockServer.tool).toHaveBeenCalledTimes(8);
  });

  it('restart_herd calls herd restart', async () => {
    const tools: Record<string, Function> = {};
    mockServer.tool.mockImplementation((n: string, _d: any, _s: any, h: Function) => { tools[n] = h; });
    mockRunner.herd.mockReturnValue({ stdout: 'Herd restarted.', stderr: '', exitCode: 0 });
    registerCoreTools(mockServer as any, mockRunner);
    await tools['restart_herd']({});
    expect(mockRunner.herd).toHaveBeenCalledWith(['restart']);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/tools/core.test.ts
```

- [ ] **Step 3: Implement `src/tools/core.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerCoreTools(server: McpServer, runner: CliRunner): void {
  server.tool('start_herd', 'Start all Herd services (nginx, PHP, Pro services)', {}, async () => {
    try {
      const result = runner.herd(['start']);
      runner.assertSuccess(result, 'start_herd');
      return textResult(result.stdout || 'Herd started.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('stop_herd', 'Stop all Herd services', {}, async () => {
    try {
      const result = runner.herd(['stop']);
      runner.assertSuccess(result, 'stop_herd');
      return textResult(result.stdout || 'Herd stopped.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('restart_herd', 'Restart all Herd services', {}, async () => {
    try {
      const result = runner.herd(['restart']);
      runner.assertSuccess(result, 'restart_herd');
      return textResult(result.stdout || 'Herd restarted.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_tld', 'Get the current TLD for Herd sites (default: test)', {}, async () => {
    try {
      const result = runner.herd(['tld']);
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });

  server.tool('set_tld', 'Change the TLD for all Herd sites', {
    tld: z.string().describe('New TLD, e.g. "local" (sites become name.local)'),
  }, async ({ tld }) => {
    try {
      const result = runner.herd(['tld', tld]);
      runner.assertSuccess(result, 'set_tld');
      return textResult(result.stdout || `TLD changed to .${tld}`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_loopback', 'Get the loopback address used for Herd sites', {}, async () => {
    try {
      const result = runner.herd(['loopback']);
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });

  server.tool('set_loopback', 'Set a custom loopback address for Herd sites', {
    address: z.string().describe('IP address, e.g. "127.0.0.1"'),
  }, async ({ address }) => {
    try {
      const result = runner.herd(['loopback', address]);
      runner.assertSuccess(result, 'set_loopback');
      return textResult(result.stdout || `Loopback set to ${address}`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('set_directory_listing', 'Enable or disable directory listing for a site', {
    mode: z.enum(['on', 'off']).describe('on to enable, off to disable'),
    site: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ mode, site }) => {
    try {
      const args = ['directory-listing', mode, ...(site ? [site] : [])];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'set_directory_listing');
      return textResult(result.stdout || `Directory listing ${mode}.`);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/sharing.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerSharingTools(server: McpServer, runner: CliRunner): void {
  server.tool('share_site', 'Share the current site publicly via an Expose tunnel (starts background process)', {
    site: z.string().optional().describe('Site name to share (omit for current directory)'),
  }, async ({ site }) => {
    try {
      // herd share is a blocking long-running process — spawn detached
      const args = [runner['config'].herdBat, ['share', ...(site ? [site] : [])]] as [string, string[]];
      const pid = runner.spawnDetached(args[0], args[1]);
      // Give the process 2 seconds to print the tunnel URL, then fetch it
      await new Promise(r => setTimeout(r, 2000));
      const urlResult = runner.herd(['fetch-share-url', ...(site ? [site] : [])]);
      const url = urlResult.stdout || 'Tunnel starting, call get_share_url in a moment.';
      return textResult(`Share tunnel started (PID: ${pid}).\nURL: ${url}`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_share_url', 'Get the URL of the current running share tunnel', {
    site: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ site }) => {
    try {
      const args = ['fetch-share-url', ...(site ? [site] : [])];
      const result = runner.herd(args);
      return textResult(result.stdout || 'No active share tunnel found.');
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Implement `src/tools/logs.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerLogsTools(server: McpServer, runner: CliRunner): void {
  server.tool('tail_log', 'Read recent log entries (one-shot, not streaming)', {
    service: z.enum(['nginx', 'php', 'app']).optional().describe('Log source (omit for all)'),
    lines: z.number().default(50).describe('Number of lines to return'),
  }, async ({ service, lines }) => {
    try {
      const args = ['log', ...(service ? [service] : []), `--lines=${lines}`];
      const result = runner.herd(args);
      return textResult(result.stdout || 'No log output.');
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 6: Implement `src/tools/nvm.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerNvmTools(server: McpServer, runner: CliRunner): void {
  server.tool('nvm_list', 'List installed Node.js versions', {}, async () => {
    try {
      const result = runner.nvm(['list']);
      return textResult(result.stdout || 'No Node.js versions installed.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('nvm_install', 'Install a Node.js version', {
    version: z.string().describe('Node.js version, e.g. "20", "22.1.0"'),
  }, async ({ version }) => {
    try {
      const result = runner.nvm(['install', version]);
      runner.assertSuccess(result, 'nvm_install');
      return textResult(result.stdout || `Node.js ${version} installed.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('nvm_use', 'Switch to a Node.js version', {
    version: z.string().describe('Node.js version to switch to'),
  }, async ({ version }) => {
    try {
      const result = runner.nvm(['use', version]);
      runner.assertSuccess(result, 'nvm_use');
      return textResult(result.stdout || `Switched to Node.js ${version}.`);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
npx vitest run tests/tools/core.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/tools/core.ts src/tools/sharing.ts src/tools/logs.ts src/tools/nvm.ts tests/tools/core.test.ts
git commit -m "feat: core, sharing, logs, and NVM tools"
```

---

## Task 11: Forge, DB, Manifest & Proxy-Commands Tools

**Files:**
- Create: `src/tools/forge.ts`
- Create: `src/tools/db.ts`
- Create: `src/tools/manifest.ts`
- Create: `src/tools/proxy-commands.ts`

- [ ] **Step 1: Implement `src/tools/forge.ts`**

> Preconditions checked at runtime: `forge.bat` reachable, user logged in, site has `server-id` in `herd.yml`.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import type { HerdConfig } from '../herd-detector';
import { textResult, errorResult } from '../tool-result';
import * as fs from 'fs';
import * as path from 'path';

export function registerForgeTools(server: McpServer, runner: CliRunner, config: HerdConfig): void {
  const forgeBat = path.join(config.binDir, 'forge.bat');

  function checkForge(cwd?: string): string | null {
    if (!fs.existsSync(forgeBat)) {
      return 'forge.bat not found. Install the Forge CLI: https://forge.laravel.com/docs/cli.html';
    }
    if (cwd) {
      const herdYml = path.join(cwd, 'herd.yml');
      if (fs.existsSync(herdYml) && !fs.readFileSync(herdYml, 'utf8').includes('server-id:')) {
        return 'This project is not linked to a Forge server. Add server-id to herd.yml.';
      }
    }
    return null;
  }

  server.tool('get_forge_deployment_info', 'Get the latest deployment logs from Laravel Forge', {
    cwd: z.string().optional().describe('Project directory (must contain herd.yml with server-id)'),
  }, async ({ cwd }) => {
    try {
      const err = checkForge(cwd);
      if (err) return textResult(err);
      const result = runner.run(forgeBat, ['deploy:logs'], cwd);
      return textResult(result.stdout || 'No deployment information available.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_forge_env_vars', 'Pull environment variables from the remote Forge server', {
    cwd: z.string().optional().describe('Project directory (must contain herd.yml with server-id)'),
  }, async ({ cwd }) => {
    try {
      const err = checkForge(cwd);
      if (err) return textResult(err);
      const result = runner.run(forgeBat, ['env:pull']);
      runner.assertSuccess(result, 'get_forge_env_vars');
      // forge env:pull writes to a temp file; extract its name and read it
      const match = result.stdout.match(/Environment Variables Written To \[(.+)\]/);
      if (match) {
        const envFile = match[1];
        if (fs.existsSync(envFile)) {
          const content = fs.readFileSync(envFile, 'utf8');
          fs.unlinkSync(envFile);
          return textResult(content);
        }
      }
      return textResult(result.stdout);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 2: Implement `src/tools/db.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerDbTools(server: McpServer, runner: CliRunner): void {
  server.tool('get_site_db_info', 'Get database connection details for a Herd site', {
    site: z.string().optional().describe('Site name (omit for current directory)'),
  }, async ({ site }) => {
    try {
      const args = ['db', ...(site ? [site] : [])];
      const result = runner.herd(args);
      return textResult(result.stdout || 'No database configuration found for this site.');
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 3: Implement `src/tools/manifest.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerManifestTools(server: McpServer, runner: CliRunner): void {
  server.tool('init_herd_manifest', 'Initialise a herd.yml manifest file in a project directory', {
    path: z.string().optional().describe('Project directory (defaults to current directory)'),
  }, async ({ path: cwd }) => {
    try {
      const result = runner.herd(['init', '--no-interaction'], cwd);
      return textResult(result.stdout || 'herd.yml initialised.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('create_fresh_manifest', 'Create a blank herd.yml manifest file', {
    path: z.string().optional().describe('Project directory (defaults to current directory)'),
  }, async ({ path: cwd }) => {
    try {
      const result = runner.herd(['init:fresh', '--no-interaction'], cwd);
      return textResult(result.stdout || 'Fresh herd.yml created.');
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 4: Implement `src/tools/proxy-commands.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerProxyCommandTools(server: McpServer, runner: CliRunner): void {
  server.tool('run_php_command', 'Run a PHP command using the site-isolated PHP version', {
    args: z.array(z.string()).describe('PHP command arguments, e.g. ["artisan", "migrate"]'),
    cwd: z.string().optional().describe('Working directory'),
  }, async ({ args, cwd }) => {
    try {
      const result = runner.php(args, cwd);
      return textResult([result.stdout, result.stderr].filter(Boolean).join('\n'));
    } catch (e) { return errorResult(e); }
  });

  server.tool('run_composer', 'Run a Composer command using the correct site PHP version', {
    args: z.array(z.string()).describe('Composer arguments, e.g. ["install", "--no-dev"]'),
    cwd: z.string().optional().describe('Working directory'),
  }, async ({ args, cwd }) => {
    try {
      const result = runner.composer(args, cwd);
      return textResult([result.stdout, result.stderr].filter(Boolean).join('\n'));
    } catch (e) { return errorResult(e); }
  });

  server.tool('create_laravel_project', 'Create a new Laravel project using the Herd Laravel installer', {
    name: z.string().describe('Project name / directory name'),
    cwd: z.string().optional().describe('Parent directory where project is created'),
  }, async ({ name, cwd }) => {
    try {
      const result = runner.laravel(['new', name, '--no-interaction'], cwd);
      return textResult(result.stdout || `Laravel project "${name}" created.`);
    } catch (e) { return errorResult(e); }
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/forge.ts src/tools/db.ts src/tools/manifest.ts src/tools/proxy-commands.ts
git commit -m "feat: forge, db, manifest, and proxy command tools"
```

---

## Task 12: Server Assembly

**Files:**
- Create: `src/server.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Implement `src/server.ts`**

Imports all tool registrars and wires them to a single `McpServer` instance.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerdHttpClient } from './http-client';
import { CliRunner } from './cli-runner';
import type { HerdConfig } from './herd-detector';
import { registerSitesTools } from './tools/sites';
import { registerParksTools } from './tools/parks';
import { registerLinksTools } from './tools/links';
import { registerPhpTools } from './tools/php';
import { registerIsolationTools } from './tools/isolation';
import { registerSslTools } from './tools/ssl';
import { registerProxiesTools } from './tools/proxies';
import { registerServicesTools } from './tools/services';
import { registerDebugTools } from './tools/debug';
import { registerCoreTools } from './tools/core';
import { registerSharingTools } from './tools/sharing';
import { registerLogsTools } from './tools/logs';
import { registerNvmTools } from './tools/nvm';
import { registerForgeTools } from './tools/forge';
import { registerDbTools } from './tools/db';
import { registerManifestTools } from './tools/manifest';
import { registerProxyCommandTools } from './tools/proxy-commands';

export function buildServer(config: HerdConfig): McpServer {
  const server = new McpServer({
    name: 'laravel-herd-mcp',
    version: '0.1.0',
  });

  const client = new HerdHttpClient(config.apiPort);
  const runner = new CliRunner(config);

  registerSitesTools(server, client, runner);
  registerParksTools(server, runner);
  registerLinksTools(server, runner);
  registerPhpTools(server, client, runner);
  registerIsolationTools(server, client, runner);
  registerSslTools(server, client, runner);
  registerProxiesTools(server, runner);
  registerServicesTools(server, client, runner);
  registerDebugTools(server, client);
  registerCoreTools(server, runner);
  registerSharingTools(server, runner);
  registerLogsTools(server, runner);
  registerNvmTools(server, runner);
  registerForgeTools(server, runner, config);
  registerDbTools(server, runner);
  registerManifestTools(server, runner);
  registerProxyCommandTools(server, runner);

  return server;
}
```

- [ ] **Step 2: Implement `src/index.ts`**

```typescript
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { detectHerd } from './herd-detector';
import { buildServer } from './server';

const args = process.argv.slice(2);
const httpMode = args.includes('--http');
const portArg = args.find(a => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1]) : 3333;
const pathArg = args.find(a => a.startsWith('--herd-path='));
const herdPath = pathArg ? pathArg.split('=')[1] : undefined;

async function main() {
  const config = detectHerd(herdPath);
  const server = buildServer(config);

  if (httpMode) {
    // HTTP/SSE transport
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
    const express = (await import('express')).default;
    const app = express();
    const transports: Record<string, InstanceType<typeof SSEServerTransport>> = {};

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => delete transports[transport.sessionId]);
      await server.connect(transport);
    });

    app.post('/messages', express.json(), async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (!transport) { res.status(404).send('Session not found'); return; }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.error(`laravel-herd-mcp HTTP/SSE server listening on http://localhost:${port}`);
      console.error(`  SSE endpoint: http://localhost:${port}/sse`);
      console.error(`  Herd bin: ${config.binDir}`);
      console.error(`  Herd API port: ${config.apiPort}`);
    });
  } else {
    // Stdio transport (Claude Desktop)
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.ts src/index.ts
git commit -m "feat: MCP server assembly with stdio and HTTP/SSE transports"
```

---

## Task 13: Smoke Test with Claude Desktop

**Goal:** Verify the MCP server registers correctly and Claude can call tools.

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: `dist/` directory created with compiled JS

- [ ] **Step 2: Test stdio mode manually**

```bash
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | node dist/index.js
```

Expected: JSON response with `serverInfo.name: "laravel-herd-mcp"` and `capabilities.tools`

- [ ] **Step 3: Test HTTP mode**

```bash
node dist/index.js --http --port 3333 &
curl http://localhost:3333/sse
```

Expected: SSE stream opens (200 response with `text/event-stream` content-type)

Kill the background process after testing.

- [ ] **Step 4: Add to Claude Desktop config**

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:/Work/Laravel Herd MCP Plugin for Claude Code/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. Open a new conversation and ask:
> "List all my Herd sites"

Expected: Claude calls `list_all_sites` and returns results.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: complete laravel-herd-mcp v0.1.0"
```

---

## Task 14: npm Publish Preparation

**Files:**
- Create: `.npmignore`

- [ ] **Step 1: Add shebang and make entry executable**

Ensure `src/index.ts` first line is `#!/usr/bin/env node` (already included above).

After build, on Windows you may need to add execute permission in `package.json` using `bin` field — already configured in Task 1.

- [ ] **Step 2: Write `.npmignore`**

```
src/
tests/
*.test.ts
tsconfig.json
vitest.config.ts
docs/
.gitignore
```

- [ ] **Step 3: Dry-run publish**

```bash
npm pack --dry-run
```

Expected: lists only `dist/`, `README.md`, `package.json`, `LICENSE`

- [ ] **Step 4: Commit**

```bash
git add .npmignore
git commit -m "chore: npm publish preparation"
```

---

## Running All Tests

```bash
npx vitest run
```

## Build

```bash
npm run build
```

## Quick Dev Start

```bash
npm run dev
```
