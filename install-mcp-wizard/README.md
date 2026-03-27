# laravel-herd-mcp — MCP Installation Wizard

Auto-configure [laravel-herd-mcp](https://github.com/movinginfo/laravel-herd-mcp) for every supported AI IDE in one command.

---

## Quick start (auto-installer)

```bash
# From the repo root — or anywhere with Node.js 18+:
node install-mcp-wizard/install.js
```

The wizard will:
1. Detect which IDEs are installed on your machine
2. Show you a numbered list with current status
3. Ask which to install to (All / Select / Cancel)
4. Merge the `laravel-herd` entry into each config file
5. Back up any modified files to `<file>.mcp-wizard.bak`

**Flags:**
| Flag | Effect |
|------|--------|
| `--yes` | Skip confirmation — install to all detected IDEs |
| `--list` | Only list detected IDEs, don't install |
| `--dry-run` | Show what would change, write nothing |

---

## Supported IDEs

| IDE | Config file | Format |
|-----|-------------|--------|
| [Claude Desktop](#claude-desktop) | `%APPDATA%\Claude\claude_desktop_config.json` | JSON `mcpServers` |
| [Claude Code](#claude-code) | `~/.claude/settings.json` | JSON `mcpServers` |
| [VS Code 1.99+](#vs-code) | `%APPDATA%\Code\User\settings.json` | JSON `mcp.servers` |
| [VS Code Insiders](#vs-code) | `%APPDATA%\Code - Insiders\User\settings.json` | JSON `mcp.servers` |
| [Cursor](#cursor) | `~/.cursor/mcp.json` | JSON `mcpServers` |
| [Windsurf (Codeium)](#windsurf) | `~/.codeium/windsurf/mcp_config.json` | JSON `mcpServers` |
| [Zed](#zed) | `~/.config/zed/settings.json` | JSON `context_servers` |
| [OpenAI Codex CLI](#openai-codex-cli) | `~/.codex/config.toml` | TOML `[[mcp_servers]]` |
| [Antigravity](#antigravity) | `~/.antigravity/mcp.json` | JSON `mcpServers` |
| [PhpStorm / JetBrains](#phpstorm--jetbrains) | Settings UI | Manual / XML |
| [Other](#other-generic-stdio) | varies | Generic stdio |

---

## Manual setup per IDE

### Claude Desktop

Edit (or create) the file below. Merge with existing content — don't replace the whole file.

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

---

### Claude Code

**One-liner:**

```bash
claude mcp add laravel-herd -- npx -y laravel-herd-mcp
```

**Or edit `~/.claude/settings.json`:**

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

---

### VS Code

Requires **VS Code 1.99+** and the **GitHub Copilot** extension.

**Step 1 — Install the GitHub Copilot extension**

`Ctrl+Shift+X` → search **GitHub Copilot** → Install → sign in.

**Step 2 — Enable agent mode**

`Ctrl+,` → search `chat.agent.enabled` → tick the checkbox.

**Step 3 — Open `settings.json`**

Two ways to open it:
- `Ctrl+Shift+P` → type **`Preferences: Open User Settings (JSON)`** → Enter *(note the `Preferences:` prefix)*
- Or navigate directly to the file:
  - **Windows:** `%APPDATA%\Code\User\settings.json`
  - **macOS:** `~/Library/Application Support/Code/User/settings.json`
  - **Linux:** `~/.config/Code/User/settings.json`

**Step 4 — Add the MCP block**

Merge into the existing JSON (do not overwrite the whole file):

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

**Step 5 — Reload**

`Ctrl+Shift+P` → **Developer: Reload Window**

**Step 6 — Verify**

`Ctrl+Alt+I` → Copilot Chat → **Agent** tab → click the **Tools** icon (🔌) → confirm `laravel-herd` is listed.

**Step 7 — Unlock Details + Manifest tabs**

VS Code starts MCP servers **lazily** — it connects only when you first use a tool. Until then, the MCP Servers panel shows only the **Configuration** tab. After the first tool call, VS Code connects, reads the server metadata, and all three tabs appear:

| Tab | Content | When it appears |
|-----|---------|-----------------|
| **Configuration** | Your `settings.json` snippet | Always |
| **Details** | Server name, version, description, homepage | After first connection |
| **Manifest** | All 218 tools with descriptions | After first connection |

To trigger the connection immediately:

1. Open Copilot Chat (`Ctrl+Alt+I`) → switch to **Agent** mode
2. Type any request like `laravel-herd list sites` or click the 🔌 Tools icon
3. Accept the permission prompt if shown
4. Go back to the MCP Servers panel — **Details** and **Manifest** tabs are now populated

**Alternative: SSE mode (all tabs visible without using a tool first)**

Start the server as an HTTP/SSE service once (e.g. via a startup script or Task Scheduler):

```bash
npx laravel-herd-mcp --http --port 3333
```

Then use this config in `settings.json` instead:

```json
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

VS Code connects to the SSE endpoint immediately on startup, so all three tabs show without any tool use first.

Config snippet: [`configs/vscode.json`](configs/vscode.json)

---

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

Config snippet: [`configs/cursor.json`](configs/cursor.json)

---

### Windsurf

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

Restart Windsurf.

Config snippet: [`configs/windsurf.json`](configs/windsurf.json)

---

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

Config snippet: [`configs/zed.json`](configs/zed.json)

---

### OpenAI Codex CLI

Append to `~/.codex/config.toml`:

```toml
[[mcp_servers]]
name = "laravel-herd"
command = "npx"
args = ["-y", "laravel-herd-mcp"]
```

Config snippet: [`configs/codex.toml`](configs/codex.toml)

---

### Antigravity

Config file: `%USERPROFILE%\.gemini\antigravity\mcp_config.json` (Windows) / `~/.gemini/antigravity/mcp_config.json` (macOS)

Config snippet: [`configs/antigravity.json`](configs/antigravity.json)

> ⚠️ **Antigravity has a 100-tool limit per MCP server.** laravel-herd-mcp has 218 tools total.
> Use the `--group` flag to split into instances that each stay under the limit.

| Group flag | Tools | What's included |
|-----------|------:|-----------------|
| `--group=herd` | ~70 | Herd control, sites, PHP, SSL, NVM, services, setup |
| `--group=laravel` | ~78 | artisan, composer, database, SQL, cache, queues, Boost |
| `--group=monitoring` | ~89 | Telescope, Pulse, Debugbar, Nightwatch, Forge CLI, Ray |

Register **two** server instances in `mcp_config.json` — one for Laravel dev, one for monitoring — for full coverage under the limit.

**Option A — local build** (use this until the package is published to npm):

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "node",
      "args": ["C:\\Work\\Laravel Herd MCP Plugin for Claude Code\\dist\\index.js", "--group=laravel"]
    },
    "laravel-herd-monitoring": {
      "command": "node",
      "args": ["C:\\Work\\Laravel Herd MCP Plugin for Claude Code\\dist\\index.js", "--group=monitoring"]
    }
  }
}
```

**Option B — npm** (once `laravel-herd-mcp` is published):

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["-y", "laravel-herd-mcp", "--group=laravel"]
    },
    "laravel-herd-monitoring": {
      "command": "npx",
      "args": ["-y", "laravel-herd-mcp", "--group=monitoring"]
    }
  }
}
```

> ⚠️ **Critical:** if the file already has other servers (e.g. `context7`), merge all entries **inside the existing `mcpServers` object**. Never add a second `{ "mcpServers": ... }` block — that produces invalid JSON and breaks all servers.

```json
{
  "mcpServers": {
    "context7": {
      "serverUrl": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "your-key" }
    },
    "laravel-herd": {
      "command": "node",
      "args": ["C:\\Work\\Laravel Herd MCP Plugin for Claude Code\\dist\\index.js", "--group=laravel"]
    },
    "laravel-herd-monitoring": {
      "command": "node",
      "args": ["C:\\Work\\Laravel Herd MCP Plugin for Claude Code\\dist\\index.js", "--group=monitoring"]
    }
  }
}
```

Config snippet: [`configs/antigravity.json`](configs/antigravity.json)

---

### PhpStorm / JetBrains

**Via the IDE UI (recommended):**

1. Open **Settings** (`Ctrl+Alt+S`)
2. Navigate to **Tools → AI Assistant → Model Context Protocol (MCP)**
3. Click **+** → **As Process**
4. **Command:** `npx`  **Arguments:** `-y laravel-herd-mcp`
5. Click **Apply** → restart the IDE

**Via XML (advanced):**

Locate your IDE options directory:
- **Windows:** `%APPDATA%\JetBrains\PhpStorm<version>\options\`
- **macOS:** `~/Library/Application Support/JetBrains/PhpStorm<version>/options/`

Add or merge: [`configs/phpstorm.xml`](configs/phpstorm.xml)

---

### Other (generic stdio)

Any MCP-compatible client that supports stdio transport:

```json
{
  "command": "npx",
  "args": ["-y", "laravel-herd-mcp"]
}
```

Check your client's documentation for the exact config key and file location.

Config snippet: [`configs/generic.json`](configs/generic.json)

---

## Custom Herd path

If Herd is installed in a non-default location, add an `env` block:

```json
{
  "mcpServers": {
    "laravel-herd": {
      "command": "npx",
      "args": ["-y", "laravel-herd-mcp"],
      "env": {
        "HERD_PATH": "C:\\Users\\YourUser\\.config\\herd\\bin"
      }
    }
  }
}
```

---

[← Back to main README](../README.md)
