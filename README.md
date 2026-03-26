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

- **37 MCP tools** covering every Herd feature
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

### Sites & Directory Management

| Tool | Description |
|------|-------------|
| `list_all_sites` | List all sites with URL, PHP version, SSL status, and path |
| `get_site_info` | Get detailed information about a specific site |
| `park_directory` | Register a directory so all subdirectories become `.test` sites |
| `unpark_directory` | Remove a directory from Herd's parked paths |
| `list_parked_dirs` | List registered parent park directories |
| `list_parked_sites` | List all sites resolving from parked directories |
| `link_site` | Register a single directory as a named site |
| `unlink_site` | Remove a named site link |
| `list_links` | List all linked sites |
| `open_site` | Open a site in the default browser |
| `which_driver` | Show which Herd driver is serving the current directory |

### PHP Version Management

| Tool | Description |
|------|-------------|
| `list_php_versions` | List all PHP versions with install and active status |
| `install_php_version` | Install or update a PHP version (e.g., `8.3`, `8.4`) |
| `use_php_globally` | Set the global default PHP version |
| `isolate_site_php` | Pin a site to a specific PHP version |
| `unisolate_site_php` | Remove PHP isolation from a site |
| `list_isolated_sites` | List all sites using an isolated PHP version |
| `which_php` | Show the PHP binary path used for a site |

### SSL / HTTPS

| Tool | Description |
|------|-------------|
| `secure_site` | Enable HTTPS with a trusted TLS certificate |
| `unsecure_site` | Remove HTTPS from a site |
| `list_secured_sites` | List all secured sites with certificate expiry |

### Proxies

| Tool | Description |
|------|-------------|
| `create_proxy` | Create an Nginx proxy to a local port (Docker, Reverb, Mailhog, etc.) |
| `remove_proxy` | Remove a proxy configuration |
| `list_proxies` | List all configured proxies |

### Services — Herd Pro

> Requires [Herd Pro](https://herd.laravel.com/checkout). Returns a clear error on Herd Free.

| Tool | Description |
|------|-------------|
| `list_available_services` | List service types that can be installed (MySQL, Redis, etc.) |
| `list_installed_services` | List installed service instances with running status and connection env vars |
| `install_service` | Install a service: `mysql`, `redis`, `postgresql`, `mariadb`, `meilisearch`, `minio`, `reverb`, `rustfs`, `mongodb` |
| `start_service` | Start a service instance |
| `stop_service` | Stop a service instance |
| `delete_service` | Delete a service and all its data |

### Debug Sessions — Herd Pro

> Captures queries, logs, dumps, jobs, HTTP requests, and performance data.

| Tool | Description |
|------|-------------|
| `start_debug_session` | Begin capturing debug data for the current site |
| `stop_debug_session` | Stop capture and return all collected data |

### Core Herd Services

| Tool | Description |
|------|-------------|
| `start_herd` | Start all Herd services (nginx, PHP, etc.) |
| `stop_herd` | Stop all Herd services |
| `restart_herd` | Restart all Herd services |
| `get_tld` | Get the current TLD (default: `test`) |
| `set_tld` | Change the TLD for all sites |
| `get_loopback` | Get the loopback address |
| `set_loopback` | Set a custom loopback address |
| `set_directory_listing` | Enable or disable directory listing for a site |

### Sharing

| Tool | Description |
|------|-------------|
| `share_site` | Share the current site publicly via an Expose tunnel (starts background process, returns tunnel URL) |
| `get_share_url` | Get the URL of a running share tunnel |

### Logs

| Tool | Description |
|------|-------------|
| `tail_log` | Tail a log file (nginx, php, app logs) |

### Node.js / NVM

| Tool | Description |
|------|-------------|
| `nvm_list` | List installed Node.js versions |
| `nvm_install` | Install a Node.js version |
| `nvm_use` | Switch to a Node.js version |

### Forge Integration

> Requires [Laravel Forge CLI](https://forge.laravel.com/docs/cli.html) installed, `forge login` completed, and the current project linked to Forge (via `herd.yml`). Returns a clear error if any precondition is missing.

| Tool | Description |
|------|-------------|
| `get_forge_deployment_info` | Get the latest deployment logs from Forge |
| `get_forge_env_vars` | Pull environment variables from the remote Forge server |

### Additional Tools

| Tool | Description |
|------|-------------|
| `get_site_db_info` | Get database connection details for a site |
| `init_herd_manifest` | Initialise a `herd.yml` manifest file |
| `create_fresh_manifest` | Create a blank `herd.yml` manifest |
| `update_php_version` | Update an installed PHP version to its latest patch |
| `list_service_versions` | List available versions for a service type |
| `run_php_command` | Run a PHP command using the site-isolated PHP version |
| `run_composer` | Run a Composer command using the correct PHP version |
| `create_laravel_project` | Create a new Laravel project via `laravel new` |

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
