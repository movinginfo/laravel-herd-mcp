# Design: laravel-herd-mcp

**Date:** 2026-03-26
**Status:** Approved
**Target:** Laravel Herd v1.27 (Windows)

---

## Overview

A TypeScript/Node.js MCP server that gives Claude (and any MCP client) full programmatic control over a Laravel Herd development environment. It complements Herd's built-in `herd-mcp.phar` (PHP/stdio only) by adding the full CLI surface, HTTP/SSE transport, and missing tool categories.

---

## Architecture

### Transport Layer

- **Stdio** (default) — for Claude Desktop, zero config, process lifecycle managed by host
- **HTTP/SSE** (`--http --port <n>`) — persistent server for multi-client or custom integrations

### Communication Layer

| Source | Used For |
|--------|----------|
| Herd HTTP API `127.0.0.1:9001` | Structured reads: sites list, PHP versions, services, debug sessions |
| `herd.bat` CLI | Management ops not in the API: park, link, proxy, TLD, start/stop, sharing |
| `php.bat` | PHP proxy commands |
| `composer.bat` | Composer proxy commands |
| `laravel.bat` | New project creation |
| `nvm.exe` (full path: `%USERPROFILE%\.config\herd\bin\nvm\nvm.exe`) | Node.js version management — not on PATH, must construct full path from detected Herd install |

### Herd HTTP API Endpoints (discovered from herd-mcp.phar source)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/sites` | List all sites with full metadata |
| POST | `/sites/secure/{name}` | Enable HTTPS |
| POST | `/sites/unsecure/{name}` | Disable HTTPS |
| POST | `/sites/isolate/{name}` + `phpVersion` | Isolate PHP version |
| POST | `/sites/unisolate/{name}` | Remove PHP isolation |
| GET | `/php-versions` | List all PHP versions + status |
| POST | `/install-php/{version}` | Install/update PHP version |
| GET | `/available-extra-services` | List services (Pro) |
| POST | `/install-extra-service` | Install service (Pro) |
| POST | `/start-extra-service/{type}/{version}/{port}` | Start service (Pro) — URL order: type, version, port |
| POST | `/stop-extra-service/{type}/{version}/{port}` | Stop service (Pro) — URL order: type, version, port |
| POST | `/debug/start` | Start debug capture (Pro) |
| POST | `/debug/stop` | Stop debug + return captured data (Pro) |

### Herd Detection

1. Check `HERD_PATH` env var — use if set
2. Check `--herd-path` CLI flag — use if provided
3. Auto-detect: scan `%USERPROFILE%\.config\herd\bin\herd.bat`
4. Fall back to `herd.bat` on PATH
5. Read `apiPort` from `%USERPROFILE%\.config\herd\config\config.json` (default: `2304` if key absent)

---

## Project Structure

```
laravel-herd-mcp/
├── src/
│   ├── index.ts              # CLI entry: parse --http/--port/--herd-path flags
│   ├── server.ts             # MCP server factory, register all tools
│   ├── herd-detector.ts      # Auto-detect Herd paths and API port
│   ├── http-client.ts        # HTTP requests to Herd API on port 9001
│   ├── cli-runner.ts         # Spawn herd.bat / php.bat / composer.bat / nvm
│   └── tools/
│       ├── sites.ts          # list_all_sites, get_site_info, open_site, which_driver
│       ├── parks.ts          # park_directory, unpark_directory, list_parked_paths
│       ├── links.ts          # link_site, unlink_site, list_links
│       ├── php.ts            # list_php_versions, install_php, use_php_globally, which_php
│       ├── isolation.ts      # isolate_site_php, unisolate_site_php, list_isolated_sites
│       ├── ssl.ts            # secure_site, unsecure_site, list_secured_sites
│       ├── proxies.ts        # create_proxy, remove_proxy, list_proxies
│       ├── services.ts       # list_services, install_service, start_service, stop_service (Pro)
│       ├── debug.ts          # start_debug_session, stop_debug_session (Pro)
│       ├── core.ts           # start_herd, stop_herd, restart_herd, get/set_tld, get/set_loopback, set_directory_listing
│       ├── sharing.ts        # share_site, get_share_url
│       ├── logs.ts           # tail_log
│       ├── nvm.ts            # nvm_list, nvm_install, nvm_use
│       ├── forge.ts          # get_forge_deployment_info, get_forge_env_vars
│       └── proxy-commands.ts # run_php_command, run_composer, create_laravel_project
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tool Inventory (37 tools)

### Sites & Parks (10)
| Tool | Method | Description |
|------|--------|-------------|
| `list_all_sites` | HTTP API | All sites with URL, PHP, SSL, path |
| `get_site_info` | HTTP API | Info for a named or current site |
| `park_directory` | CLI | Register directory as parked path (`herd park`) |
| `unpark_directory` | CLI | Remove parked path — calls `herd forget`, not `herd unpark` |
| `list_parked_dirs` | CLI | List registered parent park directories — calls `herd paths` |
| `list_parked_sites` | CLI | List all sites resolving from parked dirs — calls `herd parked` |
| `link_site` | CLI | Link directory as named site |
| `unlink_site` | CLI | Remove named link |
| `list_links` | CLI | All linked sites |
| `open_site` | CLI | Open site in browser |
| `which_driver` | CLI | Which Herd driver serves current dir |

### PHP Management (7)
| Tool | Method | Description |
|------|--------|-------------|
| `list_php_versions` | HTTP API | All versions + installed/active status |
| `install_php_version` | HTTP API | Install/update a PHP version |
| `use_php_globally` | CLI | Set global default PHP version |
| `isolate_site_php` | HTTP API | Pin site to specific PHP version |
| `unisolate_site_php` | HTTP API | Remove PHP pin from site |
| `list_isolated_sites` | CLI | Sites with isolated PHP versions |
| `which_php` | CLI | PHP binary path for a site |

### SSL (3)
| Tool | Method | Description |
|------|--------|-------------|
| `secure_site` | HTTP API | Enable HTTPS with trusted cert |
| `unsecure_site` | HTTP API | Remove HTTPS from site |
| `list_secured_sites` | CLI | All sites with active certs |

### Proxies (3)
| Tool | Method | Description |
|------|--------|-------------|
| `create_proxy` | CLI | Proxy hostname to local port (Docker, Reverb, etc.) |
| `remove_proxy` | CLI | Delete proxy config |
| `list_proxies` | CLI | All configured proxies |

### Services — Pro (6)
| Tool | Method | Description |
|------|--------|-------------|
| `list_available_services` | HTTP API | Service types that *can* be installed (`GET /available-extra-services`) — returns type catalog, not running instances |
| `list_installed_services` | CLI | Actually installed service instances with running status + env vars — calls `herd services:list` |
| `install_service` | CLI | Install a service: `mysql`, `redis`, `meilisearch`, `minio`, `reverb`, `postgresql`, `rustfs`, `mongodb`, `mariadb` — use `herd services:create` for `--name` and `--service-version` support |
| `start_service` | HTTP API | Start a service — URL: `POST /start-extra-service/{type}/{version}/{port}` (order: type, version, port) |
| `stop_service` | HTTP API | Stop a service — URL: `POST /stop-extra-service/{type}/{version}/{port}` (order: type, version, port) |
| `delete_service` | CLI | Delete service and all its data — calls `herd services:delete` |

### Debug — Pro (2)
| Tool | Method | Description |
|------|--------|-------------|
| `start_debug_session` | HTTP API | Start query/log/dump capture |
| `stop_debug_session` | HTTP API | Stop capture + return all data |

### Core Herd (8)
| Tool | Method | Description |
|------|--------|-------------|
| `start_herd` | CLI | Start nginx + PHP + all services |
| `stop_herd` | CLI | Stop all Herd services |
| `restart_herd` | CLI | Restart all services |
| `get_tld` | CLI | Get current TLD (default: test) |
| `set_tld` | CLI | Change TLD |
| `get_loopback` | CLI | Get loopback address |
| `set_loopback` | CLI | Set loopback address |
| `set_directory_listing` | CLI | Enable/disable directory listing |

### Sharing (2)
| Tool | Method | Description |
|------|--------|-------------|
| `share_site` | CLI | Share via Expose tunnel — `herd share` is a **blocking long-running process**; must be spawned detached (fire-and-forget), capture initial stdout for tunnel URL, return immediately |
| `get_share_url` | CLI | Get current tunnel URL — calls `herd fetch-share-url` |

### Logs (1)
| Tool | Method | Description |
|------|--------|-------------|
| `tail_log` | CLI | Tail nginx/php/app logs |

### Node.js / NVM (3)
| Tool | Method | Description |
|------|--------|-------------|
| `nvm_list` | CLI | List installed Node versions |
| `nvm_install` | CLI | Install a Node version |
| `nvm_use` | CLI | Switch Node version |

### Forge Integration (2)

> **Preconditions:** `forge.bat` must be in Herd bin or on PATH; user must have run `forge login`; current site must be a Forge-linked project (contains `server-id:` in `herd.yml`). Return a clear actionable error if any precondition fails.

| Tool | Method | Description |
|------|--------|-------------|
| `get_forge_deployment_info` | CLI (`forge deploy:logs`) | Latest deployment logs |
| `get_forge_env_vars` | CLI (`forge env:pull`) | Pull remote env vars to temp file, read content, delete file, return vars |

### Additional CLI Tools (6)
| Tool | Method | Description |
|------|--------|-------------|
| `get_site_db_info` | CLI (`herd db`) | Get database connection details for a site |
| `init_herd_manifest` | CLI (`herd init`) | Initialise a `herd.yml` manifest from wizard or existing config |
| `create_fresh_manifest` | CLI (`herd init:fresh`) | Create a blank `herd.yml` manifest |
| `update_php_version` | CLI (`herd php:update`) | Update installed PHP version to latest patch |
| `list_service_versions` | CLI (`herd services:versions`) | List available versions for a given service type |
| `set_directory_listing` | CLI (`herd directory-listing on|off`) | Enable/disable directory listing for a site |

### Proxy Commands (3)
| Tool | Method | Description |
|------|--------|-------------|
| `run_php_command` | `php.bat` | Run PHP using site-isolated version |
| `run_composer` | `composer.bat` | Run Composer using site-isolated PHP |
| `create_laravel_project` | `laravel.bat` | Create new Laravel project |

---

## Error Handling

- Pro-only tools return a clear `{ error: "Herd Pro required" }` response when Pro is not installed
- CLI commands strip ANSI codes from output before returning
- HTTP API errors are surfaced with status code + message
- Herd-not-found returns actionable setup instructions

## Configuration

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["laravel-herd-mcp"],
      "env": {
        "HERD_PATH": "optional override"
      }
    }
  }
}
```

```bash
# HTTP/SSE mode
npx laravel-herd-mcp --http --port 3333
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server framework
- `zod` — Tool parameter validation
- `strip-ansi` — Clean CLI output

---

## What This Adds Over herd-mcp.phar

| Capability | herd-mcp.phar | laravel-herd-mcp |
|-----------|---------------|------------------|
| Stdio transport | ✅ | ✅ |
| HTTP/SSE transport | ❌ | ✅ |
| Park/unpark directories | ❌ | ✅ |
| Link/unlink sites | ❌ | ✅ |
| Proxy management | ❌ | ✅ |
| TLD / loopback config | ❌ | ✅ |
| Herd start/stop/restart | ❌ | ✅ |
| Site sharing (Expose) | ❌ | ✅ |
| Log tailing | ❌ | ✅ |
| Node.js / NVM | ❌ | ✅ |
| Run PHP/Composer proxy | ❌ | ✅ |
| Create Laravel project | ❌ | ✅ |
| List secured sites | ❌ | ✅ |
| List isolated sites | ❌ | ✅ |
| Sites, PHP, Services, Debug | ✅ | ✅ |
| Forge integration | ✅ | ✅ |
