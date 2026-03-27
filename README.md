# laravel-herd-mcp

> **218 MCP tools** — Give Claude full control over your [Laravel Herd](https://herd.laravel.com) development environment on Windows.

[![npm version](https://img.shields.io/npm/v/laravel-herd-mcp.svg)](https://www.npmjs.com/package/laravel-herd-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Laravel Herd](https://img.shields.io/badge/Laravel%20Herd-1.27%2B-red.svg)](https://herd.laravel.com)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)
[![Tools](https://img.shields.io/badge/tools-218-brightgreen.svg)](tools.md)

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

- **218 MCP tools** across 20 categories — [see full list →](tools.md)
- **Multi-IDE** — Claude Desktop, Claude Code, VS Code (Copilot/Continue), Cursor, Windsurf, PhpStorm, and any MCP-compatible client
- **Cross-platform** — Windows and macOS both supported; Herd paths auto-detected on both
- **Dual transport** — stdio for local clients, HTTP/SSE for remote or multi-client setups
- **Auto-detects** your Herd installation, no manual path configuration needed
- **Herd Free + Pro** — all Pro-only features degrade gracefully with clear messages
- **Non-ASCII paths** — works correctly even if your Windows username contains Cyrillic or other non-ASCII characters
- **Structured output** — clean JSON from the Herd API, ANSI codes stripped from CLI output

---

## Requirements

| | |
|--|--|
| [Laravel Herd](https://herd.laravel.com) | v1.27+ for Windows · v1.0+ for macOS |
| Node.js | 18+ |
| MCP client | [Claude Desktop](https://claude.ai/download) or any MCP-compatible client |

> **macOS:** Fully supported. Laravel Herd stores its config at `~/.config/herd/` and `~/Library/Application Support/Herd/` — both paths are auto-detected.

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

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

### VS Code

Requires **VS Code 1.99+** and the **GitHub Copilot** extension (agent mode). Node.js 18+ must be on your PATH.

**Step 1 — Install the GitHub Copilot extension**

Open VS Code → Extensions (`Ctrl+Shift+X`) → search **GitHub Copilot** → Install.
Sign in with your GitHub account when prompted.

**Step 2 — Enable agent mode**

Open VS Code Settings (`Ctrl+,`) → search `chat.agent.enabled` → tick **Enable agent mode**.

**Step 3 — Add the MCP server**

Open the Command Palette (`Ctrl+Shift+P`) → type **Open User Settings (JSON)** → Enter.

Add the `mcp` block (merge with any existing content — do not replace the whole file):

```json
{
  "mcp": {
    "servers": {
      "laravel-herd": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "laravel-herd-mcp"]
      }
    }
  }
}
```

Save the file (`Ctrl+S`).

**Step 4 — Reload VS Code**

Press `Ctrl+Shift+P` → **Developer: Reload Window**.

**Step 5 — Verify**

Open Copilot Chat (`Ctrl+Alt+I`) → click the **Agent** tab (or type `@laravel-herd`) → click the **Tools** icon (plug symbol).
You should see **laravel-herd** listed with all 218 tools available.

> **macOS paths**
> Settings JSON: `~/Library/Application Support/Code/User/settings.json`
> Or open via Command Palette as shown above — same on all platforms.

> **Alternative: Continue extension**
> Install [Continue](https://marketplace.visualstudio.com/items?itemName=Continue.continue) → open `~/.continue/config.json` → add under `"mcpServers"`:
> ```json
> { "name": "laravel-herd", "command": "npx", "args": ["-y", "laravel-herd-mcp"] }
> ```

### Cursor

Add to `~/.cursor/mcp.json` (create if it doesn't exist):

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["-y", "laravel-herd-mcp"]
    }
  }
}
```

Restart Cursor. Tools appear in **Cursor Settings → MCP**.

### Windsurf (Codeium)

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["-y", "laravel-herd-mcp"]
    }
  }
}
```

### PhpStorm / JetBrains IDEs

1. Install the **JetBrains AI Assistant** plugin
2. Go to **Settings → Tools → AI Assistant → Model Context Protocol (MCP)**
3. Click **+** → **As Process**
4. Command: `npx`, Arguments: `-y laravel-herd-mcp`
5. Apply and restart the IDE

### Other MCP clients (Antigravity, Zed, etc.)

Any client that supports MCP stdio transport works. Use:

```json
{
  "command": "npx",
  "args": ["-y", "laravel-herd-mcp"]
}
```

Check your client's documentation for the config file location and format.

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

> **218 tools** in a single `laravel-herd` MCP server.
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
| **Laravel Pulse** | 14 | Install, enable/disable, server metrics, slow requests/queries/jobs, exceptions, cache, queues, users *(laravel/pulse)* |
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
                             └──► pulse_* DB tables              — Pulse performance metrics
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
| Laravel Pulse / Nightwatch | ❌ | ✅ |
| Laravel Boost integration | ❌ | ✅ |
| Non-ASCII user profile paths | ❌ | ✅ |

---

## Herd UI Patching (`patch_herd_ui`)

> **As of v0.1.22 you no longer need `patch_herd_ui`.**

The `patch_herd_ui` tool patches Herd's `app.asar` to add a *Claude Code* row in the Integrations tab. This was needed in early versions to get the MCP entry visible inside Herd's UI. Since v0.1.22:

- The `setup_integrations` tool writes the correct config to Claude Desktop and Claude Code directly — no UI patching needed.
- Herd's own integration support has improved and the entry is visible without patching.

`patch_herd_ui` is kept in the plugin **for educational purposes only** — it demonstrates how Electron `app.asar` files can be extracted and repackaged. Do not run it on production Herd installations as it must be re-applied after every Herd update.

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

### Core

| Repo / Project | Role |
|---|---|
| [laravel/herd](https://herd.laravel.com) | The PHP development environment this server controls |
| [modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) · [modelcontextprotocol.io](https://modelcontextprotocol.io) | MCP SDK and protocol spec powering the integration |
| [Claude Desktop](https://claude.ai/download) · [Claude Code](https://claude.ai/claude-code) | AI clients that connect to this MCP server |

### Laravel packages integrated

| Package | Tools |
|---|---|
| [laravel/telescope](https://github.com/laravel/telescope) | `telescope_*` — 19 tools: requests, queries, exceptions, jobs, mail, events… |
| [laravel/pulse](https://github.com/laravel/pulse) | `pulse_*` — 16 tools: slow requests/queries/jobs, exceptions, cache, servers… |
| [laravel/nightwatch](https://github.com/laravel/nightwatch) | `nightwatch_*` — 7 tools: install, agent start/stop, enable/disable, configure |
| [laravel/horizon](https://github.com/laravel/horizon) | `horizon_*` — status, pause, continue, terminate |
| [laravel/boost](https://github.com/laravel/boost) | `boost_*` — AI coding guidelines, MCP config |
| [laravel/forge-cli](https://github.com/laravel/forge-cli) | `forge_*` — 25 tools: deploy, env, daemons, nginx, php-fpm |
| [fruitcake/laravel-debugbar](https://github.com/barryvdh/laravel-debugbar) | `debugbar_*` — 9 tools: requests, queries, exceptions, timeline |
| [spatie/laravel-ray](https://github.com/spatie/laravel-ray) | `ray_*` — install, configure |
| [itsgoingd/clockwork](https://github.com/itsgoingd/clockwork) | `clockwork_install` |

### Node.js drivers (direct DB access)

| Package | Purpose |
|---|---|
| [mysql2](https://github.com/sidorares/node-mysql2) | MySQL / MariaDB native driver — no PHP needed |
| [pg](https://github.com/brianc/node-postgres) | PostgreSQL native driver |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite native driver (optional) |

### Transport & schema

| Package | Purpose |
|---|---|
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) | MCP server SDK (stdio + SSE) |
| [express](https://github.com/expressjs/express) | HTTP server for `--http` / SSE mode |
| [zod](https://github.com/colinhacks/zod) | Runtime schema validation for all tool inputs |

### Tools reference

- [tools.md](tools.md) — Complete reference of all 218 tools across 20 categories
