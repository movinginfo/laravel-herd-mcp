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

### Auto-installer (all IDEs in one command)

Detect and configure every supported IDE automatically:

```bash
node install-mcp-wizard/install.js
```

The wizard detects Claude Desktop, Claude Code, VS Code, Cursor, Windsurf, Zed, Codex CLI, Antigravity, and PhpStorm — backs up existing configs and merges the MCP entry.

```
# Options:
node install-mcp-wizard/install.js --yes      # skip confirmation
node install-mcp-wizard/install.js --list     # show detected IDEs only
node install-mcp-wizard/install.js --dry-run  # preview changes, write nothing
```

📄 **[Full per-IDE instructions → install-mcp-wizard/README.md](install-mcp-wizard/README.md)**

---

### Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add laravel-herd -- npx -y laravel-herd-mcp
```

Or edit `~/.claude/settings.json` directly with the same `mcpServers` block above.

### VS Code

Requires **VS Code 1.99+** and the **GitHub Copilot** extension.

**1 — Install Copilot:** `Ctrl+Shift+X` → search **GitHub Copilot** → Install → sign in.

**2 — Enable agent mode:** `Ctrl+,` → search `chat.agent.enabled` → tick checkbox.

**3 — Open `settings.json`:**
- `Ctrl+Shift+P` → **`Preferences: Open User Settings (JSON)`** *(include the `Preferences:` prefix)*
- Or navigate directly:
  - Windows: `%APPDATA%\Code\User\settings.json`
  - macOS: `~/Library/Application Support/Code/User/settings.json`
  - Linux: `~/.config/Code/User/settings.json`

**4 — Add the MCP block** (merge — do not replace the whole file):

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

**5 — Reload:** `Ctrl+Shift+P` → **Developer: Reload Window**

**6 — Verify:** `Ctrl+Alt+I` → Copilot Chat → **Agent** tab → **Tools** icon (🔌) → `laravel-herd` should appear.

**7 — MCP Servers panel tabs** *(Configuration / Details / Manifest)*

VS Code starts MCP servers **lazily** — it only connects on the first tool call. Until then the panel shows only the **Configuration** tab.

- **Configuration** — always visible (your settings.json snippet)
- **Details** — appears after first connection: server name `Laravel Herd`, version, description, homepage
- **Manifest** — appears after first connection: all 218 tools with names and descriptions

To unlock Details + Manifest immediately: open Copilot Chat → Agent mode → use any `laravel-herd` tool (e.g. *"list herd sites"*) → accept the permission prompt → return to the MCP panel.

**Alternative — SSE mode (all tabs visible immediately, no tool use required)**

```bash
# Step 1: start the server persistently (add to startup / Task Scheduler)
npx laravel-herd-mcp --http --port 3333
```

```json
// Step 2: use SSE transport in settings.json instead of stdio
{
  "mcp": {
    "servers": {
      "laravel-herd": {
        "type": "sse",
        "url": "http://localhost:3333/sse"
      }
    }
  }
}
```

VS Code connects to the SSE endpoint on startup — all three tabs are populated immediately.

### Cursor

Create or edit `~/.cursor/mcp.json`:

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

Restart Cursor → check **Cursor Settings → MCP**.

### Windsurf (Codeium)

Create or edit `~/.codeium/windsurf/mcp_config.json`:

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

### Zed

Edit `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "laravel-herd": {
      "command": {
        "path": "npx",
        "args": ["-y", "laravel-herd-mcp"]
      }
    }
  }
}
```

### OpenAI Codex CLI

Append to `~/.codex/config.toml`:

```toml
[[mcp_servers]]
name = "laravel-herd"
command = "npx"
args = ["-y", "laravel-herd-mcp"]
```

### Antigravity

Create or edit `~/.antigravity/mcp.json`:

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

1. Open **Settings** (`Ctrl+Alt+S`)
2. Navigate to **Tools → AI Assistant → Model Context Protocol (MCP)**
3. Click **+** → **As Process**
4. **Command:** `npx` — **Arguments:** `-y laravel-herd-mcp`
5. Click **Apply** → restart the IDE

See [`install-mcp-wizard/configs/phpstorm.xml`](install-mcp-wizard/configs/phpstorm.xml) for the XML snippet.

### Other MCP clients

Any client that supports MCP stdio transport:

```json
{
  "command": "npx",
  "args": ["-y", "laravel-herd-mcp"]
}
```

Check your client's documentation for the config file location and format.
See [`install-mcp-wizard/configs/generic.json`](install-mcp-wizard/configs/generic.json).

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

### This project

| Resource | Link |
|---|---|
| **GitHub repository** | [github.com/movinginfo/laravel-herd-mcp](https://github.com/movinginfo/laravel-herd-mcp) |
| **npm package** | [npmjs.com/package/laravel-herd-mcp](https://www.npmjs.com/package/laravel-herd-mcp) |
| **Tool reference** | [tools.md](tools.md) — all 218 tools across 20 categories |
| **MCP install wizard** | [install-mcp-wizard/README.md](install-mcp-wizard/README.md) |

### Core

| Repo / Project | Role |
|---|---|
| [laravel/herd](https://herd.laravel.com) | The PHP development environment this server controls |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) · [modelcontextprotocol.io](https://modelcontextprotocol.io) | MCP SDK and protocol spec |

### Supported AI clients

| Client | Docs |
|---|---|
| [Claude Desktop](https://claude.ai/download) | Anthropic desktop app — stdio MCP |
| [Claude Code](https://claude.ai/claude-code) | Anthropic CLI — `claude mcp add` |
| [VS Code](https://code.visualstudio.com) + [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) | settings.json `mcp.servers` |
| [Cursor](https://cursor.sh) | `~/.cursor/mcp.json` |
| [Windsurf (Codeium)](https://codeium.com/windsurf) | `~/.codeium/windsurf/mcp_config.json` |
| [Zed](https://zed.dev) | `~/.config/zed/settings.json` `context_servers` |
| [PhpStorm / JetBrains](https://www.jetbrains.com/phpstorm/) | Settings → AI Assistant → MCP |
| [Antigravity](https://antigravity.dev) | `~/.antigravity/mcp.json` |
| [OpenAI Codex CLI](https://github.com/openai/codex) | `~/.codex/config.toml` |

### Laravel packages integrated

| Package | Tools |
|---|---|
| [laravel/telescope](https://github.com/laravel/telescope) | `telescope_*` — 19 tools: requests, queries, exceptions, jobs, mail, events… |
| [laravel/pulse](https://github.com/laravel/pulse) | `pulse_*` — 14 tools: slow requests/queries/jobs, exceptions, cache, servers… |
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
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) | MCP server SDK (stdio + HTTP/SSE) |
| [express](https://github.com/expressjs/express) | HTTP server for `--http` / SSE mode |
| [zod](https://github.com/colinhacks/zod) | Runtime schema validation for all tool inputs |
