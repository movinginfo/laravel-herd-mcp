import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import type { HerdConfig } from '../herd-detector';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { setupIntegrations } from './setup-logic';

export function registerSetupTools(server: McpServer, herdConfig: HerdConfig, runner: CliRunner): void {
  server.tool(
    'setup_integrations',
    'Configure Claude Desktop and Claude Code to use laravel-herd-mcp. Also registers Claude Code in Herd\'s integrations panel.',
    {},
    async () => {
      try {
        // Resolve PHP binary path dynamically
        const phpExePath = resolvePhpExePath(herdConfig, runner);

        // Resolve our own server path (dist/index.js)
        const mcpServerPath = path.resolve(__dirname, '..', 'index.js');

        const result = setupIntegrations(herdConfig, mcpServerPath, phpExePath);

        const lines = [
          '✅ Laravel Herd MCP integration configured successfully!',
          '',
          `Claude Desktop (${result.claudeDesktop.status}):`,
          `  ${result.claudeDesktop.path}`,
          '',
          `Claude Code (${result.claudeCode.status}):`,
          `  ${result.claudeCode.path}`,
          '',
          `VS Code (${result.vsCode.status}):`,
          `  ${result.vsCode.path}`,
          '',
          `Herd integrations (${result.herdIntegrations.status}):`,
          `  ${result.herdIntegrations.path}`,
          '',
          'Registered:',
          '  • laravel-herd — 218 tools (this server)',
          '  • laravel-herd-phar — Herd built-in HTTP-API tools',
          '',
          'Restart Claude Desktop / VS Code and reload Claude Code to activate.',
          '',
          'For Cursor: add to ~/.cursor/mcp.json',
          'For PhpStorm: Settings > AI Assistant > MCP Servers',
          'For Windsurf: add to ~/.codeium/windsurf/mcp_config.json',
        ];

        return textResult(lines.join('\n'));
      } catch (e) {
        return errorResult(e);
      }
    }
  );
}

export function registerPatchHerdUiTool(server: McpServer): void {
  server.tool(
    'patch_herd_ui',
    'Patches Herd\'s app.asar to add a "Claude Code" row in the Integrations tab. Must be re-run after each Herd update. Requires admin/UAC elevation on Windows. Backs up original app.asar.bak first.',
    {},
    async () => {
      try {
        const herdAsar = 'C:\\Program Files\\Herd\\resources\\app.asar';
        const settingsJsPattern = 'settings-';

        if (!fs.existsSync(herdAsar)) {
          return errorResult(new Error(`Herd not found at ${herdAsar}`));
        }

        // Check if npx asar is available
        try {
          execSync('npx @electron/asar --version', { shell: true, timeout: 10000 } as any);
        } catch {
          return errorResult(new Error('npx @electron/asar not available. Run: npm install -g @electron/asar'));
        }

        const tmpExtract = path.join(os.tmpdir(), 'herd-asar-patch-' + Date.now());
        const tmpRepack = path.join(os.tmpdir(), 'app-patched-' + Date.now() + '.asar');

        // Step 1: Extract
        execSync(`npx @electron/asar extract "${herdAsar}" "${tmpExtract}"`, { shell: true, timeout: 120000 } as any);

        // Step 2: Find and patch the settings renderer JS
        const assetsDir = path.join(tmpExtract, 'out', 'renderer', 'assets');
        if (!fs.existsSync(assetsDir)) {
          return errorResult(new Error('Could not find renderer assets in app.asar'));
        }

        const jsFiles = fs.readdirSync(assetsDir).filter(f => f.startsWith(settingsJsPattern) && f.endsWith('.js'));
        if (jsFiles.length === 0) {
          return errorResult(new Error('settings JS file not found in app.asar — Herd version may have changed'));
        }

        const jsPath = path.join(assetsDir, jsFiles[0]);
        let content = fs.readFileSync(jsPath, 'utf8');

        // Check if already patched
        if (content.includes('hasClaudeConnections')) {
          fs.rmSync(tmpExtract, { recursive: true, force: true });
          return textResult('✅ Herd UI is already patched — Claude Code row is present in Integrations tab.');
        }

        // Verify patch targets exist
        if (!content.includes('const hasForgeConnections = ref(false);')) {
          fs.rmSync(tmpExtract, { recursive: true, force: true });
          return errorResult(new Error('Patch target not found — Herd version may have changed. Manual patching required.'));
        }

        // Apply patches
        content = content.replace(
          'const hasForgeConnections = ref(false);',
          'const hasForgeConnections = ref(false);\n    const hasClaudeConnections = ref(false);'
        );

        content = content.replace(
          'const checkForIntegrations = async () => {\n      hasForgeConnections.value = await window.api.integrations.forge.exists();\n    };',
          'const checkForIntegrations = async () => {\n      hasForgeConnections.value = await window.api.integrations.forge.exists();\n      try { const ctrl = new AbortController(); const _t = setTimeout(() => ctrl.abort(), 800); const _r = await fetch("http://127.0.0.1:3000/status", { signal: ctrl.signal }); clearTimeout(_t); hasClaudeConnections.value = _r.ok; } catch { hasClaudeConnections.value = true; }\n    };'
        );

        const claudeRow = 'createBaseVNode("div", { style: "display:flex;align-items:center;justify-content:space-between;padding:20px;border:1px solid;border-color:rgb(55 65 81/1);border-radius:8px;background:rgb(31 41 55/1);margin-top:8px" }, [createBaseVNode("div", { style: "display:flex;align-items:center;gap:20px" }, [createBaseVNode("div", { style: "width:20px;height:20px;background:#CC785C;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:sans-serif;flex-shrink:0" }, "C"), createBaseVNode("div", { style: "color:rgb(255 255 255/1)" }, [createBaseVNode("div", null, "Claude Code"), hasClaudeConnections.value ? createBaseVNode("div", { style: "display:flex;align-items:center;gap:6px;font-size:11px;color:rgb(16 185 129/1)" }, [createBaseVNode("div", { style: "width:6px;height:6px;border-radius:50%;background:rgb(16 185 129/1);flex-shrink:0" }), createBaseVNode("div", null, "Connected")]) : createBaseVNode("div", { style: "display:flex;align-items:center;gap:6px;font-size:11px;color:rgb(156 163 175/1)" }, [createBaseVNode("div", { style: "width:6px;height:6px;border-radius:50%;background:rgb(209 213 219/1);flex-shrink:0" }), createBaseVNode("div", null, "Not connected")])])]), createBaseVNode("div", { style: "color:rgb(107 114 128/1)" }, ">")])';

        content = content.replace(
          '}, null, 8, ["is-connected"])\n          ], 64))',
          `}, null, 8, ["is-connected"]),\n            ${claudeRow}\n          ], 64))`
        );

        fs.writeFileSync(jsPath, content, 'utf8');

        // Step 3: Repack
        execSync(`npx @electron/asar pack "${tmpExtract}" "${tmpRepack}"`, { shell: true, timeout: 180000 } as any);

        // Step 4: Backup + replace (elevated via PowerShell)
        const psScript = `
\$backup = "C:\\\\Program Files\\\\Herd\\\\resources\\\\app.asar.bak"
\$orig = "C:\\\\Program Files\\\\Herd\\\\resources\\\\app.asar"
if (-not (Test-Path \$backup)) { Copy-Item \$orig \$backup }
Copy-Item "${tmpRepack}" \$orig -Force
"patched" | Out-File "${os.tmpdir()}\\\\herd-patch-done.txt"
`;
        const psFile = path.join(os.tmpdir(), 'herd-patch.ps1');
        fs.writeFileSync(psFile, psScript, 'utf8');

        execSync(`powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-File','${psFile}' -Wait"`, { shell: true, timeout: 30000 } as any);

        // Cleanup
        fs.rmSync(tmpExtract, { recursive: true, force: true });
        fs.rmSync(tmpRepack, { force: true });

        const lines = [
          '✅ Herd UI patched successfully!',
          '',
          `Patched file: ${jsFiles[0]}`,
          'Backup saved: C:\\Program Files\\Herd\\resources\\app.asar.bak',
          '',
          'Restart Herd to see the Claude Code row in the Integrations tab.',
          'Note: This patch will need to be re-run after each Herd update.',
          'Run patch_herd_ui again after updating Herd.',
        ];

        return textResult(lines.join('\n'));
      } catch (e) {
        return errorResult(e);
      }
    }
  );
}

export function registerStatusTools(server: McpServer, herdConfig: HerdConfig): void {
  server.tool(
    'open_integration_status',
    'Open the laravel-herd-mcp integration status dashboard in the browser. Shows all configured integrations (Claude Desktop, Claude Code, Laravel Forge) in a Herd-styled UI. Requires the server to be running in --http mode.',
    {},
    async () => {
      try {
        // Check if HTTP server is likely running by reading its port from env
        const port = process.env.HERD_MCP_HTTP_PORT ?? '3000';
        const url = `http://localhost:${port}/dashboard`;

        // Open in default browser (Windows)
        try {
          execSync(`start "" "${url}"`, { shell: true, timeout: 5000 } as any);
        } catch {
          // Fall through — just report the URL
        }

        const lines = [
          '🖥  Integration Status Dashboard',
          '',
          `URL: ${url}`,
          '',
          'The dashboard shows all integration connections:',
          '  • Laravel Forge (Herd built-in)',
          '  • Claude Code / Claude Desktop (laravel-herd-mcp)',
          '',
          'Note: requires laravel-herd-mcp running in --http mode.',
          'To start: laravel-herd-mcp --http --port=3000',
          '',
          'Run setup_integrations first if Claude Desktop/Code are not yet configured.',
        ];

        return textResult(lines.join('\n'));
      } catch (e) {
        return errorResult(e);
      }
    }
  );
}

function resolvePhpExePath(herdConfig: HerdConfig, runner: CliRunner): string {
  // Try herd which-php first
  try {
    const result = runner.herd(['which-php']);
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch { /* fall through */ }

  // Fall back: scan for php*/php(.exe) in bin dir
  const phpBin = process.platform === 'win32' ? 'php.exe' : 'php';
  try {
    const entries = fs.readdirSync(herdConfig.binDir);
    const phpDirs = entries.filter(e => /^php\d/.test(e));
    for (const dir of phpDirs.reverse()) { // highest version first
      const exePath = path.join(herdConfig.binDir, dir, phpBin);
      if (fs.existsSync(exePath)) {
        return exePath;
      }
    }
  } catch { /* fall through */ }

  // Last resort: use wrapper script
  return herdConfig.phpBat;
}
