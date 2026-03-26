# laravel-herd-mcp

> A Model Context Protocol (MCP) server that gives Claude full control over your [Laravel Herd](https://herd.laravel.com) development environment on Windows.

[![npm version](https://img.shields.io/npm/v/laravel-herd-mcp.svg)](https://www.npmjs.com/package/laravel-herd-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Laravel Herd](https://img.shields.io/badge/Laravel%20Herd-1.27%2B-red.svg)](https://herd.laravel.com)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)

---

## What is this?

`laravel-herd-mcp` connects Claude Desktop (or any MCP client) to your local Laravel Herd installation. Once configured, you can manage your entire PHP development environment through natural language — no terminal required.

```
"Create a new Laravel project called blog, park it, secure it with HTTPS, and isolate it to PHP 8.3"
"Start MySQL on port 3306 and show me the connection details"
"Which sites are currently running? Switch my-app to PHP 8.2"
"Tail the nginx error log for the last 50 lines"
```

This server complements Herd's built-in `herd-mcp.phar` by adding **HTTP/SSE transport**, full **CLI coverage**, Node.js management, proxy management, and more.

---

## Features

- **65 MCP tools** covering every Herd feature + Laravel Boost integration
- **Dual transport** — stdio for Claude Desktop, HTTP/SSE for other clients
- **Auto-detects** your Herd installation, no manual path config needed
- **Herd Free + Pro** — Pro features degrade gracefully on Free
- **Structured responses** — clean JSON from the Herd API, no raw ANSI terminal output

---

## Requirements

- [Laravel Herd](https://herd.laravel.com) v1.27+ for Windows
- Node.js 18+
- [Claude Desktop](https://claude.ai/download) or any MCP-compatible client

---

## Installation

### Option 1 — npx (no install)

```bash
npx laravel-herd-mcp
```

### Option 2 — Global install

```bash
npm install -g laravel-herd-mcp
laravel-herd-mcp
```

---

## Claude Desktop Setup

Add to your `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["laravel-herd-mcp"]
    }
  }
}
```

Restart Claude Desktop. You should see **laravel-herd** in the MCP tools list.

### With custom Herd path

If Herd is installed in a non-default location:

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["laravel-herd-mcp"],
      "env": {
        "HERD_PATH": "C:\\Users\\YourUser\\.config\\herd\\bin"
      }
    }
  }
}
```

---

## HTTP/SSE Mode

For multi-client setups or custom integrations, run as a persistent HTTP server:

```bash
npx laravel-herd-mcp --http --port 3333
```

Connect your MCP client to `http://localhost:3333/sse`.

---

## Available Tools

> All 42 tools are provided by a single **`laravel-herd`** MCP server.

### Sites

| Tool | Description |
|------|-------------|
| `list_all_sites` | List all sites with URL, PHP version, SSL, path |
| `list_parked_sites` | List sites from parked directories |
| `list_parked_paths` | List registered park directories |
| `get_site_info_artisan` | Run `artisan about` for a Laravel site |
| `get_site_driver` | Show which Herd driver serves a directory |
| `open_site_in_browser` | Open site in default browser |

### Links & Proxies

| Tool | Description |
|------|-------------|
| `link_site` | Create a named link for a directory |
| `unlink_site` | Remove a named link |
| `list_links` | List all linked sites |
| `create_proxy` | Proxy a hostname to a local port/URL |
| `remove_proxy` | Remove a proxy |
| `list_proxies` | List all proxies |

### Parks

| Tool | Description |
|------|-------------|
| `park_directory` | Register a directory so subdirs become `.test` sites |
| `unpark_directory` | Unregister a parked directory |

### SSL / HTTPS

| Tool | Description |
|------|-------------|
| `secure_site` | Enable HTTPS (generate trusted TLS cert) |
| `unsecure_site` | Disable HTTPS |
| `list_secured_sites` | List secured sites with cert expiry dates |

### PHP

| Tool | Description |
|------|-------------|
| `list_php_versions` | List all PHP versions with install/active status |
| `install_php_version` | Install a PHP version (e.g. `"8.3"`) |
| `update_php_version` | Update a PHP version to latest patch |
| `use_php_globally` | Set global default PHP version |
| `which_php` | Show PHP binary path for a site |
| `edit_php_ini` | Open `php.ini` for a version in IDE |

### PHP Isolation

| Tool | Description |
|------|-------------|
| `isolate_site_php` | Pin a site to a specific PHP version |
| `unisolate_site_php` | Remove isolation, revert to global PHP |
| `list_isolated_sites` | List all isolated sites |

### Node / NVM

| Tool | Description |
|------|-------------|
| `list_node_versions` | List installed Node versions |
| `install_node_version` | Install a Node version |
| `use_node_version` | Switch active Node version |

### Services (MySQL, Redis, etc.)

| Tool | Description |
|------|-------------|
| `list_available_service_types` | List available service types |
| `get_service_versions` | Get versions for a service type |
| `clone_service` | Install/clone a service |
| `delete_service` | Remove a service |

### Core / Control

| Tool | Description |
|------|-------------|
| `start_herd` | Start all Herd services |
| `stop_herd` | Stop all Herd services |
| `restart_herd` | Restart all Herd services |
| `get_loopback_address` | Get current loopback IP |
| `set_loopback_address` | Change loopback IP |
| `open_site_in_ide` | Open site directory in configured IDE |

### Sharing

| Tool | Description |
|------|-------------|
| `share_site` | Share a site via Expose tunnel |
| `get_share_url` | Get current tunnel URL |

### Logs & Debug

| Tool | Description |
|------|-------------|
| `tail_log` | Read Herd log output (nginx, php, herd…) |
| `run_php_with_debug` | Run PHP script with Xdebug |
| `run_php_with_coverage` | Run PHP script with coverage mode |
| `run_tinker` | Launch Laravel Tinker REPL |

### Dev Tools

| Tool | Description |
|------|-------------|
| `run_composer` | Run any Composer command (generic) |
| `create_laravel_project` | Create new Laravel project via `laravel new` |

### Artisan (php artisan)

| Tool | Description |
|------|-------------|
| `artisan` | Run any `php artisan` command in a Laravel project |
| `artisan_make` | Scaffold classes: model, controller, migration, seeder, factory, middleware, command, event, listener, job, mail, notification, policy, request, resource, rule, cast, scope, channel, provider |
| `artisan_migrate` | Run migrations: migrate, fresh, rollback, status, db:seed |
| `artisan_route_list` | List all registered routes (with filter and JSON output) |
| `artisan_optimize` | Cache or clear: optimize, optimize:clear, config:cache/clear, route:cache/clear, view:clear, cache:clear, event:cache/clear |
| `artisan_about` | Display Laravel app info (version, environment, drivers) |
| `artisan_db_seed` | Seed the database (specific seeder or all) |
| `artisan_queue` | Manage queues: list failed jobs, retry (single/all), flush |
| `artisan_setup` | Run key:generate or storage:link |

### Composer

| Tool | Description |
|------|-------------|
| `composer_require` | Add packages (`--dev` supported, version constraints) |
| `composer_remove` | Remove packages |
| `composer_install` | Install from composer.lock (`--no-dev`, `--no-scripts`, `--optimize`) |
| `composer_update` | Update packages (all or specific) |
| `composer_outdated` | List packages with available updates |
| `composer_show` | Show installed packages or details for one package |
| `composer_dump_autoload` | Regenerate autoloader (`--classmap-authoritative`) |
| `composer_validate` | Validate composer.json integrity |
| `composer_search` | Search Packagist for packages |
| `composer_scripts` | List or run scripts defined in composer.json |

### Setup

| Tool | Description |
|------|-------------|
| `setup_integrations` | Auto-configure Claude Desktop + Claude Code + Herd |

### Laravel Boost (laravel/boost)

[Laravel Boost](https://github.com/laravel/boost) is Laravel's official MCP server + AI coding guidelines package.

| Tool | Description |
|------|-------------|
| `boost_install` | `composer require laravel/boost --dev` + `php artisan boost:install` in one step |
| `boost_register_mcp` | Register the project's `boost:mcp` server in `~/.claude/settings.json` |
| `boost_list_guidelines` | List AI guidelines in `.ai/guidelines/` |
| `boost_add_guideline` | Add or overwrite a custom guideline file |
| `boost_mcp_config` | Show the JSON snippet to register Boost MCP in any editor |

**Total: 65 tools**

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `HERD_PATH` | auto-detected | Path to Herd's `bin` directory |

| CLI Flag | Default | Description |
|----------|---------|-------------|
| `--http` | off | Run as HTTP/SSE server instead of stdio |
| `--port` | `3333` | Port for HTTP/SSE mode |
| `--herd-path` | auto-detected | Override Herd bin directory path |

### Auto-detection order

1. `--herd-path` CLI flag
2. `HERD_PATH` environment variable
3. `%USERPROFILE%\.config\herd\bin\herd.bat`
4. `herd.bat` on `PATH`

---

## Git Bash / MINGW Setup

If using Git Bash, add these aliases to your `.bash_profile`:

```bash
alias php="php.bat"
alias herd="herd.bat"
alias laravel="laravel.bat"
alias composer="composer.bat"
```

---

## How It Works

`laravel-herd-mcp` communicates with Herd through two channels:

1. **Herd's internal HTTP API** (`127.0.0.1:9001`) — used for structured data: sites list, PHP versions, Pro services, debug sessions. Returns clean JSON.

2. **Herd CLI** (`herd.bat`, `php.bat`, `composer.bat`, `laravel.bat`, `nvm`) — used for management operations not exposed by the API: park, link, proxy, TLD, start/stop, sharing.

ANSI color codes are automatically stripped from all CLI output.

---

## Comparison with herd-mcp.phar

Laravel Herd ships a built-in `herd-mcp.phar` (PHP, stdio only). `laravel-herd-mcp` extends and complements it:

| Feature | herd-mcp.phar | laravel-herd-mcp |
|---------|:-------------:|:----------------:|
| Stdio transport | ✅ | ✅ |
| HTTP/SSE transport | ❌ | ✅ |
| Sites, PHP versions, Services | ✅ | ✅ |
| Debug sessions (Pro) | ✅ | ✅ |
| Forge integration | ✅ | ✅ |
| Park / unpark / list sites | ❌ | ✅ |
| Link / unlink sites | ❌ | ✅ |
| Proxy management | ❌ | ✅ |
| TLD / loopback config | ❌ | ✅ |
| Herd start / stop / restart | ❌ | ✅ |
| Site sharing (Expose) | ❌ | ✅ |
| Log tailing | ❌ | ✅ |
| Node.js / NVM management | ❌ | ✅ |
| Run PHP / Composer proxy | ❌ | ✅ |
| Create Laravel project | ❌ | ✅ |
| List secured / isolated sites | ❌ | ✅ |

---

## Contributing

Contributions are welcome! Please open an issue or pull request.

```bash
git clone https://github.com/your-username/laravel-herd-mcp
cd laravel-herd-mcp
npm install
npm run dev
```

---

## License

MIT — see [LICENSE](LICENSE)

---

## Related

- [Laravel Herd](https://herd.laravel.com) — The PHP development environment this server controls
- [Model Context Protocol](https://modelcontextprotocol.io) — The open protocol powering this integration
- [Claude Desktop](https://claude.ai/download) — The AI assistant that uses this server
- [laravel-herd-worktree](https://github.com/harris21/laravel-herd-worktree) — Claude skill for Herd git worktrees
