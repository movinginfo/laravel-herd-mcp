# laravel-herd-mcp

> **204 MCP tools** — Give Claude full control over your [Laravel Herd](https://herd.laravel.com) development environment on Windows.

[![npm version](https://img.shields.io/npm/v/laravel-herd-mcp.svg)](https://www.npmjs.com/package/laravel-herd-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Laravel Herd](https://img.shields.io/badge/Laravel%20Herd-1.27%2B-red.svg)](https://herd.laravel.com)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)
[![Tools](https://img.shields.io/badge/tools-204-brightgreen.svg)](tools.md)

---

## What is this?

`laravel-herd-mcp` connects Claude Desktop (or any MCP client) to your local Laravel Herd installation. Once configured, you can manage your entire PHP development environment through natural language — no terminal required.

```
"Create a new Laravel project called blog, park it, secure it with HTTPS, and isolate it to PHP 8.3"
"Show me failed queue jobs and retry them all"
"Run the database migrations and seed the users table"
"Which sites are running? Switch my-app to PHP 8.2 and restart Herd"
"Install Laravel Telescope and clear its entries older than 24 hours"
"Enable the queries and events watchers in Herd"
```

This server complements Herd's built-in `herd-mcp.phar` by adding **HTTP/SSE transport**, full **CLI tool coverage**, artisan commands, composer management, debugging tools, and more.

---

## Features

- **204 MCP tools** across 19 categories — [see full list →](tools.md)
- **Dual transport** — stdio for Claude Desktop, HTTP/SSE for other MCP clients
- **Auto-detects** your Herd installation, no manual path configuration needed
- **Herd Free + Pro** — all Pro-only features degrade gracefully with clear messages
- **Non-ASCII paths** — works correctly even if your Windows username contains Cyrillic or other non-ASCII characters
- **Structured output** — clean JSON from the Herd API, ANSI codes stripped from CLI output

---

## Requirements

| | |
|--|--|
| [Laravel Herd](https://herd.laravel.com) | v1.27+ for Windows |
| Node.js | 18+ |
| MCP client | [Claude Desktop](https://claude.ai/download) or any MCP-compatible client |

---

## Installation

### Option A — npx (no install required)

```bash
npx laravel-herd-mcp
```

### Option B — Global install

```bash
npm install -g laravel-herd-mcp
laravel-herd-mcp
```

### Option C — Local build from source

```bash
git clone https://github.com/movinginfo/laravel-herd-mcp
cd laravel-herd-mcp
npm install && npm run build
node dist/index.js
```

---

## Setup

### Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

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

### Claude Code

```bash
claude mcp add laravel-herd -- npx laravel-herd-mcp
```

Or add to `~/.claude/settings.json` manually:

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

### Custom Herd path

If Herd is installed in a non-default location, pass `HERD_PATH`:

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

### Auto-configure (using the tool itself)

Once running, ask Claude to run `setup_integrations` — it will write the correct config to Claude Desktop, Claude Code, and Herd's `integrations.json` automatically.

---

## HTTP / SSE Mode

Run as a persistent HTTP server for multi-client or custom integrations:

```bash
npx laravel-herd-mcp --http --port 3333
```

Connect your MCP client to `http://localhost:3333/sse`.

---

## Available Tools

> **204 tools** in a single `laravel-herd` MCP server.
> 📄 **[Full tool reference → tools.md](tools.md)**

| Category | Tools | Description |
|----------|------:|-------------|
| **Active Project** | 3 | Select active site — all tools default to it without explicit cwd |
| **Herd Control** | 8 | Start/stop/restart, loopback, Herd manifest |
| **Sites** | 16 | Park, link, proxy, share, browser, IDE |
| **SSL / HTTPS** | 3 | Secure, unsecure, list certs |
| **PHP** | 9 | Versions, isolation, `php.ini` |
| **Node / NVM** | 3 | Install, list, switch Node versions |
| **Services** | 8 | MySQL, Redis, PostgreSQL, Minio *(Herd Pro)* |
| **Database (artisan)** | 8 | `.env` info, GUI client, `db:show`, `db:table`, wipe, seed, monitor, db CLI |
| **Laravel Debugbar** | 9 | Install, enable/disable, read queries/exceptions/timeline *(fruitcake/laravel-debugbar)* |
| **Direct Database Client** | 7 | Native SQL queries for MySQL, MariaDB, PostgreSQL, SQLite — local or remote |
| **Cache** | 14 | App cache, config, view, route, event cache |
| **Queue & Schedule** | 19 | Failed jobs, active queue, batches, schedule, Horizon |
| **Dumps & Debugging** | 12 | Herd interceptor, watchers, Xdebug, Ray, Clockwork |
| **Laravel Telescope** | 19 | Install, enable/disable, watchers, all 18 entry-type browsers *(laravel/telescope)* |
| **Laravel Nightwatch** | 7 | Install, enable/disable, agent start/stop, configure sampling *(laravel/nightwatch)* |
| **Artisan** | 10 | Generic + `make:*`, migrate, routes, optimize, seed |
| **Composer** | 12 | require, remove, install, update, search, scripts |
| **Laravel Boost** | 5 | AI coding guidelines *(laravel/boost)* |
| **Laravel Forge CLI** | 25 | Remote server management: deploy, env, daemons, nginx, php *(forge CLI)* |
| **Setup & Integration** | 3 | Auto-configure Claude Desktop + Claude Code + Herd |

---

## Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HERD_PATH` | auto-detected | Path to Herd's `bin` directory |

### CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--http` | off | Run as HTTP/SSE server |
| `--port N` | `3333` | Port for HTTP/SSE mode |
| `--herd-path PATH` | auto-detected | Override Herd bin directory |

### Herd path auto-detection order

1. `--herd-path` CLI flag
2. `HERD_PATH` environment variable
3. `%USERPROFILE%\.config\herd\bin\herd.bat`
4. `herd.bat` on system `PATH`

---

## Git Bash / MINGW

Add these aliases to `~/.bash_profile`:

```bash
alias php="php.bat"
alias herd="herd.bat"
alias laravel="laravel.bat"
alias composer="composer.bat"
```

---

## How It Works

`laravel-herd-mcp` talks to Herd through two channels:

```
Claude ──► laravel-herd-mcp ──► Herd HTTP API (127.0.0.1:9001)   — structured JSON
                             └──► PHP CLI (php.exe herd.phar …)   — park, link, proxy, share…
                             └──► php artisan                     — migrate, queue, cache…
                             └──► composer                        — require, install, update…
                             └──► Herd config.json                — dumps, watchers, settings
                             └──► Native DB drivers               — mysql2, pg, better-sqlite3
                             └──► storage/debugbar/*.json         — Debugbar request profiling
                             └──► telescope_entries DB table      — Telescope watcher data
```

> **Non-ASCII path fix:** `herd.bat` calls bare `php` which breaks when the Windows user profile path contains non-ASCII characters (e.g. Cyrillic). This package bypasses `herd.bat` entirely and calls `php.exe herd.phar` directly, resolving the PHP executable from Herd's own `config.json`.

---

## Comparison with herd-mcp.phar

Laravel Herd ships a built-in `herd-mcp.phar` (PHP, stdio only). `laravel-herd-mcp` extends and complements it:

| Feature | `herd-mcp.phar` | `laravel-herd-mcp` |
|---------|:---:|:---:|
| Stdio transport | ✅ | ✅ |
| HTTP / SSE transport | ❌ | ✅ |
| Sites, PHP versions | ✅ | ✅ |
| Debug sessions (Pro) | ✅ | ✅ |
| Forge integration | ✅ | ❌ |
| Park / unpark / link | ❌ | ✅ |
| Proxy management | ❌ | ✅ |
| SSL management | ❌ | ✅ |
| Herd start / stop / restart | ❌ | ✅ |
| Site sharing (Expose) | ❌ | ✅ |
| Log tailing | ❌ | ✅ |
| Node.js / NVM | ❌ | ✅ |
| `php artisan` commands | ❌ | ✅ |
| Composer commands | ❌ | ✅ |
| Database tools | ❌ | ✅ |
| Cache management | ❌ | ✅ |
| Queue & Schedule | ❌ | ✅ |
| Dump interceptor / watchers | ❌ | ✅ |
| Ray / Telescope / Clockwork | ❌ | ✅ |
| Laravel Boost integration | ❌ | ✅ |
| Non-ASCII user profile paths | ❌ | ✅ |

---

## Contributing

Contributions welcome! Open an issue or pull request.

```bash
git clone https://github.com/movinginfo/laravel-herd-mcp
cd laravel-herd-mcp
npm install
npm run build
node dist/index.js
```

---

## License

MIT — see [LICENSE](LICENSE)

---

## Related

- [Laravel Herd](https://herd.laravel.com) — The PHP development environment this server controls
- [tools.md](tools.md) — Complete reference of all 138 tools
- [Model Context Protocol](https://modelcontextprotocol.io) — The open protocol powering this integration
- [Claude Desktop](https://claude.ai/download) — AI assistant that uses this server
- [Laravel Boost](https://github.com/laravel/boost) — Official Laravel AI coding guidelines
- [laravel-herd-worktree](https://github.com/harris21/laravel-herd-worktree) — Claude skill for Herd git worktrees
