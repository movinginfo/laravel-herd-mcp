# patch-claude — Herd UI Integration Patch

Patches **Laravel Herd's Electron UI** (`app.asar`) to display a
**"Claude Code / Claude Desktop"** row in the Integrations tab,
alongside the existing "Laravel Forge" entry.

> ⚠️ **Important**: This patch modifies a third-party application.
> It will be overwritten when Herd auto-updates.
> The script always backs up the original before patching.

---

## Before / After

| Before | After |
|--------|-------|
| Laravel Forge — Not connected | Laravel Forge — Not connected |
| *(nothing)* | **Claude Code / Claude Desktop — Connected** |

---

## Requirements

- **Node.js** 18+
- **Admin / elevated terminal** (writes to `C:\Program Files\Herd\resources\`)
- **Herd installed** at `C:\Program Files\Herd`
- `@electron/asar` (auto-installed if missing)

---

## Usage

### Apply the patch

```bat
# Run as Administrator
node patch-herd-ui.js
```

Then **restart Herd** (quit from system tray → reopen).

### Restore original

```bat
node patch-herd-ui.js restore
```

---

## What it does

1. **Backs up** `C:\Program Files\Herd\resources\app.asar` → `app.asar.orig`
2. **Extracts** the asar archive to a temp directory
3. **Patches** `out/renderer/assets/settings-*.js`:
   - Adds a `hasClaudeConnections` Vue ref
   - Checks `http://127.0.0.1:4422/health` (our MCP HTTP server) to determine connection status
   - Inserts a `Claude Code / Claude Desktop` `IntegrationRow` component after the Forge row
4. **Repacks** the asar and replaces the original
5. **Cleans up** temp files

---

## Connection status detection

The patch checks `http://127.0.0.1:4422/health` — the health endpoint
of our MCP HTTP server. If the server is running, the badge shows
**Connected**; otherwise **Not connected**.

Start the MCP server in HTTP mode to show as connected:

```bat
laravel-herd-mcp --http --port 4422
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Access denied` | Run terminal as Administrator |
| `app.asar not found` | Herd not at `C:\Program Files\Herd` |
| `Could not find checkForIntegrations` | Herd was updated, patch needs revision for new version |
| Row appears but shows "Not connected" | Start `laravel-herd-mcp --http --port 4422` |

---

## After a Herd update

Re-run the patch script. The backup is preserved, so you'll need to
manually restore and re-patch, or just run:

```bat
node patch-herd-ui.js restore
node patch-herd-ui.js
```
