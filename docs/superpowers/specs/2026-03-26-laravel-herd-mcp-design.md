# Design: laravel-herd-mcp

**Date:** 2026-03-26
**Status:** Approved
**Target:** Laravel Herd v1.27 (Windows)
**Package:** `laravel-herd-mcp`

---

## Overview

A TypeScript/Node.js MCP server that gives Claude Desktop and Claude Code full programmatic control over a Laravel Herd development environment on Windows.

It uses a **Hybrid** architecture: our TS server owns all CLI-based tools (38+), while Herd's built-in `herd-mcp.phar` is registered as a second MCP server covering the 13 HTTP-API tools. A `setup_integrations` tool auto-configures both Claude Desktop and Claude Code, and writes a Claude Code entry into Herd's `integrations.json`.

---

## Architecture

### Transport Layer

| Mode | Flag | Use case |
|------|------|----------|
| **stdio** | default | Claude Desktop — process lifecycle managed by host |
| **HTTP/SSE** | `--http --port <n>` | Claude Code CLI, multi-client, custom integrations |

### Two-Server Split

```
Claude Desktop / Claude Code
        │
        ├── MCP Server 1: laravel-herd-mcp (Node.js/TS)   ← this project
        │     ├── Transport: stdio OR HTTP/SSE
        │     ├── 42 tools → herd.bat / php.bat / composer.bat / laravel.bat / nvm.exe
        │     └── 1 setup tool → writes all 3 config targets
        │
        └── MCP Server 2: herd-mcp.phar (PHP/stdio)        ← shipped with Herd
              └── 13 tools → Herd HTTP API on port 9001
```

### herd-mcp.phar (existing, do not replace)

Discovered by reverse-engineering the phar. Uses `symfony/mcp-sdk`, namespace `BeyondCode\HerdMCP`. Communicates with Herd app via `curl` to `http://127.0.0.1:{apiPort}` (default 9001, read from `config.json`).

**Tools it provides:**
- `get_all_sites`, `get_site_information`
- `secure_or_unsecure_site`, `isolate_or_unisolate_site`
- `get_all_php_versions`, `install_php_version`
- `find_available_services`, `install_service`, `start_or_stop_service` (Pro)
- `start_debug_session`, `stop_debug_session` (Pro)
- `get_last_deployment_information`, `get_forge_environment_variables` (Forge-linked)

**Prompts it provides:**
- `debug_site` (site-aware + Pro)

**Resources it provides:**
- `herd://sites/information` (site-aware)

### CLI Runner (`src/cli-runner.ts`)

All CLI tools spawn Windows `.bat` wrappers:

```ts
const BINS = {
  herd:     path.join(herdBin, 'herd.bat'),
  php:      path.join(herdBin, 'php.bat'),
  composer: path.join(herdBin, 'composer.bat'),
  laravel:  path.join(herdBin, 'laravel.bat'),
  nvm:      path.join(herdBin, 'nvm', 'nvm.exe'),
}
```

Execution: `child_process.execFile` with `shell: true` (required for `.bat`), `timeout: 30000ms`, stdout/stderr captured and returned as tool result text.

### Herd Detection (`src/herd-detector.ts`)

1. Check `HERD_PATH` env var — use if set
2. Check `--herd-path` CLI flag
3. Auto-detect: `%USERPROFILE%\.config\herd\bin\herd.bat`
4. Fall back to `herd.bat` on PATH
5. Read `apiPort` from `%USERPROFILE%\.config\herd\config\config.json` (default `9001`)

### Setup Tool (`src/tools/setup.ts`)

`setup_integrations` tool writes to **3 targets**:

#### Target 1 — Claude Desktop
File: `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:/path/to/laravel-herd-mcp/dist/index.js"]
    },
    "laravel-herd-phar": {
      "command": "C:/Users/.../herd/bin/php84/php.exe",
      "args": ["C:/Users/.../herd/bin/herd-mcp.phar"],
      "env": { "SITE_PATH": "${workspaceFolder}" }
    }
  }
}
```

#### Target 2 — Claude Code
File: `%USERPROFILE%\.claude\settings.json`
```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:/path/to/laravel-herd-mcp/dist/index.js"],
      "type": "stdio"
    },
    "laravel-herd-phar": {
      "command": "C:/Users/.../herd/bin/php84/php.exe",
      "args": ["C:/Users/.../herd/bin/herd-mcp.phar"],
      "type": "stdio"
    }
  }
}
```

#### Target 3 — Herd integrations.json
File: `%USERPROFILE%\.config\herd\config\integrations.json`
```json
{
  "savedIntegrations": [
    {
      "type": "claude_code",
      "name": "Claude Code",
      "status": "connected",
      "mcpServer": "laravel-herd-mcp",
      "version": "1.0.0",
      "configuredAt": "2026-03-26T00:00:00.000Z"
    }
  ],
  "openIntegrations": ["claude_code"]
}
```

---

## Project Structure

```
laravel-herd-mcp/
├── src/
│   ├── index.ts                    # CLI entry: parse --http/--port/--herd-path flags
│   ├── server.ts                   # MCP server factory, register all tools
│   ├── herd-detector.ts            # Auto-detect Herd paths and API port
│   ├── cli-runner.ts               # Spawn herd.bat / php.bat / composer.bat / nvm
│   └── tools/
│       ├── sites.ts                # list_parked_sites, list_all_sites, park, unpark, list_parked_paths
│       ├── links.ts                # link_site, unlink_site, list_links
│       ├── ssl.ts                  # list_secured_sites
│       ├── proxies.ts              # create_proxy, remove_proxy, list_proxies
│       ├── php.ts                  # switch_php_version, which_php, update_php_version, edit_php_ini, list_isolated_sites
│       ├── services.ts             # list_available_service_types, get_service_versions, clone_service, delete_service (Pro)
│       ├── core.ts                 # start_herd, stop_herd, restart_herd
│       ├── debug.ts                # run_php_with_debug, run_php_with_coverage, tail_log
│       ├── sharing.ts              # share_site, get_share_url
│       ├── devtools.ts             # run_tinker, run_composer, create_laravel_project
│       ├── node.ts                 # list_node_versions, install_node_version, use_node_version
│       ├── config.ts               # get_loopback_address, set_loopback_address, get_site_driver, get_site_info_artisan, open_site_in_browser, open_site_in_ide
│       └── setup.ts                # setup_integrations
├── tests/
│   ├── herd-detector.test.ts
│   ├── cli-runner.test.ts
│   └── tools/
│       ├── sites.test.ts
│       ├── php.test.ts
│       └── setup.test.ts
├── dist/                           # compiled output
├── package.json
├── tsconfig.json
└── README.md
```

---

## Complete Tool List (42 tools)

### Sites (12)

| Tool | Command | Description |
|------|---------|-------------|
| `list_parked_sites` | `herd parked` | List all sites within parked paths |
| `list_all_sites` | `herd sites` | List all sites Herd is serving |
| `park_directory` | `herd park [dir]` | Register a directory so subdirs become .test sites |
| `unpark_directory` | `herd forget [dir]` | Remove a directory from parked paths |
| `list_parked_paths` | `herd paths` | Display all registered parked directories |
| `link_site` | `herd link [name]` | Register a site outside parked paths |
| `unlink_site` | `herd unlink [name]` | Remove a linked site |
| `list_links` | `herd links` | Display all linked sites |
| `open_site_in_browser` | `herd open [site]` | Open site in default browser |
| `open_site_in_ide` | `herd edit [site]` | Open site directory in configured IDE |
| `get_site_driver` | `herd which` | Show which Herd driver serves current directory |
| `get_site_info_artisan` | `herd site-information` | Display site details (runs artisan about for Laravel) |

### SSL (1)

| Tool | Command | Description |
|------|---------|-------------|
| `list_secured_sites` | `herd secured` | List all secured sites with certificate expiry dates |

### Proxies (3)

| Tool | Command | Description |
|------|---------|-------------|
| `create_proxy` | `herd proxy [name] [url]` | Create an Nginx proxy (e.g. to localhost:8080) |
| `remove_proxy` | `herd unproxy [name]` | Remove a proxy configuration |
| `list_proxies` | `herd proxies` | Display all configured proxies |

### PHP (5)

| Tool | Command | Description |
|------|---------|-------------|
| `switch_php_version` | `herd use [version]` | Change global PHP version |
| `which_php` | `herd which-php` | Display current PHP binary path |
| `update_php_version` | `herd php:update [version]` | Update PHP to latest patch release |
| `edit_php_ini` | `herd ini [version]` | Open php.ini in configured IDE |
| `list_isolated_sites` | `herd isolated` | List all sites using isolated PHP versions |

### Services — Pro (4)

| Tool | Command | Description |
|------|---------|-------------|
| `list_available_service_types` | `herd services:available` | Show available service types |
| `get_service_versions` | `herd services:versions [type]` | List versions for a service type |
| `clone_service` | `herd services:clone [service]` | Clone a service instance with its data |
| `delete_service` | `herd services:delete [service]` | Delete a service and its data |

### Core (3)

| Tool | Command | Description |
|------|---------|-------------|
| `start_herd` | `herd start` | Start all Herd services |
| `stop_herd` | `herd stop` | Stop all Herd services |
| `restart_herd` | `herd restart` | Restart all Herd services |

### Debug & Logs (3)

| Tool | Command | Description |
|------|---------|-------------|
| `run_php_with_debug` | `herd debug [script]` | Execute PHP with Xdebug enabled |
| `run_php_with_coverage` | `herd coverage [script]` | Run PHP with Xdebug coverage mode |
| `tail_log` | `herd log [service]` | Tail Herd log files |

### Sharing (2)

| Tool | Command | Description |
|------|---------|-------------|
| `share_site` | `herd share [options]` | Share local site via Expose tunnel |
| `get_share_url` | `herd fetch-share-url` | Retrieve current Expose tunnel URL |

### Dev Tools (3)

| Tool | Command | Description |
|------|---------|-------------|
| `run_tinker` | `herd tinker` | Launch Laravel Tinker session |
| `run_composer` | `composer.bat [args]` | Run Composer with Herd's isolated PHP |
| `create_laravel_project` | `laravel.bat new [name]` | Create a new Laravel project |

### Node.js / NVM (3)

| Tool | Command | Description |
|------|---------|-------------|
| `list_node_versions` | `nvm list` | List installed Node.js versions |
| `install_node_version` | `nvm install [version]` | Install a Node.js version |
| `use_node_version` | `nvm use [version]` | Switch active Node.js version |

### Config (2)

| Tool | Command | Description |
|------|---------|-------------|
| `get_loopback_address` | `herd loopback` | Get current loopback address |
| `set_loopback_address` | `herd loopback [addr]` | Set loopback address |

### Setup (1)

| Tool | Command | Description |
|------|---------|-------------|
| `setup_integrations` | internal | Configure Claude Desktop, Claude Code, and Herd integrations.json |

---

## Data Flow

```
Claude (tool call)
    │
    ▼
MCP Server (stdio/HTTP)
    │
    ├── CLI tools ──► cli-runner.ts ──► execFile(herd.bat / php.bat / ...)
    │                                         │
    │                                         ▼
    │                                   stdout/stderr
    │                                         │
    │                                         ▼
    │                                   ToolResult (text)
    │
    └── setup tool ──► writes JSON to 3 config files
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Herd not found | Clear error: "Herd not found at `<path>`. Set HERD_PATH env var or use --herd-path." |
| Command timeout (30s) | Error: "Command timed out after 30s" |
| Non-zero exit code | Return stderr as error text (not throw) |
| Pro feature on Free | herd.bat output returned as-is (Herd prints its own "Pro required" message) |
| Config file missing | `setup_integrations` creates file from scratch with correct defaults |
| Config file malformed | `setup_integrations` backs up existing file then overwrites |

---

## Testing Strategy

- **Unit tests** (Vitest): mock `child_process.execFile`, test each tool's argument construction
- **Integration tests**: run against real `herd.bat` in CI (skipped if `HERD_BIN` not set)
- **Setup tests**: mock filesystem, verify correct JSON written to all 3 config targets

---

## package.json Key Fields

```json
{
  "name": "laravel-herd-mcp",
  "version": "1.0.0",
  "bin": { "laravel-herd-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.18.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
```

---

## Claude Desktop Config (after setup)

`%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:/path/to/laravel-herd-mcp/dist/index.js"]
    },
    "laravel-herd-phar": {
      "command": "C:/Users/<user>/.config/herd/bin/php84/php.exe",
      "args": ["C:/Users/<user>/.config/herd/bin/herd-mcp.phar"],
      "env": {}
    }
  }
}
```

## Claude Code Config (after setup)

`%USERPROFILE%\.claude\settings.json`:
```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:/path/to/laravel-herd-mcp/dist/index.js"],
      "type": "stdio"
    },
    "laravel-herd-phar": {
      "command": "C:/Users/<user>/.config/herd/bin/php84/php.exe",
      "args": ["C:/Users/<user>/.config/herd/bin/herd-mcp.phar"],
      "type": "stdio"
    }
  }
}
```

## Herd integrations.json (after setup)

`%USERPROFILE%\.config\herd\config\integrations.json`:
```json
{
  "savedIntegrations": [
    {
      "type": "claude_code",
      "name": "Claude Code",
      "status": "connected",
      "mcpServer": "laravel-herd-mcp",
      "version": "1.0.0",
      "configuredAt": "2026-03-26T00:00:00.000Z"
    }
  ],
  "openIntegrations": ["claude_code"]
}
```
