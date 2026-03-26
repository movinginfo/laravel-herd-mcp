# Herd UI Patcher — Claude Code Integration

Adds a **Claude Code** row to the **Integrations** tab inside Laravel Herd's settings window, displayed alongside the built-in Laravel Forge row.

## Before vs After

| Before | After |
|--------|-------|
| Only "Laravel Forge" visible | "Laravel Forge" + "Claude Code" visible |

The Claude Code row shows:
- **Connected** (green dot) — when `laravel-herd-mcp` HTTP server is reachable on `localhost:3000`
- **Connected** (green dot) — when running in stdio mode (plugin is installed)
- **Not connected** (grey dot) — when the plugin is not configured

---

## Requirements

- **Laravel Herd for Windows** installed at `C:\Program Files\Herd`
- **Node.js** (for `npx @electron/asar`) — [nodejs.org](https://nodejs.org)
- **PowerShell 5.1+** (ships with Windows 10/11)
- **Admin rights** (UAC prompt will appear once)

---

## Usage

### Option A — Double-click (easiest)

```
patch-claude\patch.bat
```

Double-click `patch.bat`. A UAC prompt will appear to replace `app.asar`. Herd restarts automatically.

### Option B — PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File patch-claude\patch.ps1
```

### Option C — MCP tool (from Claude Code)

If `laravel-herd-mcp` is already configured in Claude Code, run:

```
patch_herd_ui
```

---

## What the patch does

Herd's UI is an Electron app. The Integrations tab is **hardcoded** to show only Laravel Forge — there is no plugin system. The patch modifies a single compiled renderer JS file inside `app.asar` to add a Claude Code row.

**Three changes are made to `out/renderer/assets/settings-*.js`:**

1. Adds a `hasClaudeConnections` Vue ref (reactive state)
2. Extends `checkForIntegrations()` to probe `http://127.0.0.1:3000/status` — if it responds the dot goes green; if not (stdio mode) it defaults to green since the plugin is installed
3. Inserts a Claude Code `<div>` row after the Laravel Forge `IntegrationRow` component

**Files modified:**

| File | Action |
|------|--------|
| `C:\Program Files\Herd\resources\app.asar` | Replaced with patched version |
| `C:\Program Files\Herd\resources\app.asar.bak` | Backup of original (created once) |

---

## After a Herd update

Herd auto-updates will overwrite `app.asar` and remove the patch. Re-run the patcher:

```
patch-claude\patch.bat
```

Or use the MCP tool `patch_herd_ui` in Claude Code.

The script detects if the patch is already present and skips re-patching (safe to run multiple times).

---

## Uninstall / Restore original

To restore the original Herd UI:

```powershell
# Run as Administrator
Copy-Item "C:\Program Files\Herd\resources\app.asar.bak" `
          "C:\Program Files\Herd\resources\app.asar" -Force
```

Then restart Herd.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Herd not found` | Herd is installed in a non-standard location. Edit `$herdAsar` in `patch.ps1` |
| `@electron/asar not available` | Install Node.js from [nodejs.org](https://nodejs.org) |
| `Patch target not found` | Herd version changed the JS filename/structure. Open a GitHub issue with your Herd version |
| UAC cancelled | Re-run as Administrator or approve the UAC prompt |
| Row shows "Not connected" | Run `setup_integrations` in Claude Code first |

---

## Compatibility

| Herd version | Status |
|-------------|--------|
| 1.27.x | ✅ Tested |
| 1.28.x+ | ⚠ Re-run patcher after update |
