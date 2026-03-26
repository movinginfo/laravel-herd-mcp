#!/usr/bin/env node
/**
 * patch-herd-ui.js
 * Patches Herd's app.asar to add a "Claude Code / Claude Desktop" row
 * to the Integrations tab, alongside the existing "Laravel Forge" entry.
 *
 * Usage:
 *   node patch-herd-ui.js          # auto-detect Herd path
 *   node patch-herd-ui.js restore  # restore original backup
 *
 * Requires admin privileges (writes to C:\Program Files\Herd\resources\).
 * NOTE: This patch will be overwritten when Herd auto-updates.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Paths ────────────────────────────────────────────────────────────────────

const HERD_RESOURCES = 'C:\\Program Files\\Herd\\resources';
const ASAR_PATH = path.join(HERD_RESOURCES, 'app.asar');
const ASAR_BACKUP = path.join(HERD_RESOURCES, 'app.asar.orig');
const EXTRACT_DIR = path.join(require('os').tmpdir(), 'herd-asar-patch');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findAsarTool() {
  try { execSync('npx @electron/asar --version', { stdio: 'pipe' }); return 'npx @electron/asar'; } catch {}
  try { execSync('asar --version', { stdio: 'pipe' }); return 'asar'; } catch {}
  // Install it
  console.log('Installing @electron/asar...');
  execSync('npm install -g @electron/asar', { stdio: 'inherit' });
  return 'asar';
}

function findRendererJs(dir) {
  const assetsDir = path.join(dir, 'out', 'renderer', 'assets');
  if (!fs.existsSync(assetsDir)) throw new Error('Renderer assets dir not found: ' + assetsDir);
  const files = fs.readdirSync(assetsDir).filter(f => f.startsWith('settings-') && f.endsWith('.js'));
  if (!files.length) throw new Error('settings-*.js not found in renderer assets');
  return path.join(assetsDir, files[0]);
}

// ─── Patch logic ──────────────────────────────────────────────────────────────

const FORGE_ROW_MARKER = 'title:"Laravel Forge"';

/**
 * Claude Code integration row — added right after the Laravel Forge row.
 * Uses a simple inline SVG (Claude logo C) instead of importing a component.
 */
function buildClaudeRow(isConnected) {
  // We inject a new IntegrationRow-equivalent for Claude Code.
  // The _sfc_main$2 component renders: icon | title | status badge
  // We replicate its structure inline since we can't import a new SVG component easily.
  return `
,createVNode(_sfc_main$2,{title:"Claude Code / Claude Desktop","is-connected":${isConnected},onClick:()=>{}},null,8,["is-connected"])`;
}

const CLAUDE_CONNECTED_CHECK = `
// laravel-herd-mcp patch: check Claude Code connection
const hasClaudeConnections=ref(false);
const checkClaudeConnections=async()=>{
  try{
    const r=await fetch("http://127.0.0.1:4422/health").catch(()=>null);
    hasClaudeConnections.value=r&&r.ok||false;
  }catch{hasClaudeConnections.value=false;}
};`;

function applyPatch(jsContent) {
  if (jsContent.includes('Claude Code / Claude Desktop')) {
    console.log('Patch already applied.');
    return jsContent;
  }

  // 1) Find the checkForIntegrations function and append our check
  const initFnPattern = /const checkForIntegrations=async\(\)=>\{/;
  if (!initFnPattern.test(jsContent)) {
    throw new Error('Could not find checkForIntegrations function. Herd version may have changed.');
  }

  jsContent = jsContent.replace(
    initFnPattern,
    `${CLAUDE_CONNECTED_CHECK}\nconst checkForIntegrations=async()=>{checkClaudeConnections();`
  );

  // 2) Add Claude row after the Forge IntegrationRow
  // Pattern: createVNode(_sfc_main$2,{title:"Laravel Forge","is-connected":hasForgeConnections.value,...
  const forgeRowPattern = /(createVNode\(_sfc_main\$2,\{title:"Laravel Forge","is-connected":hasForgeConnections\.value[^}]*\}[^)]*\))/;
  const match = jsContent.match(forgeRowPattern);
  if (!match) {
    throw new Error('Could not find Laravel Forge IntegrationRow. Herd version may have changed.');
  }

  jsContent = jsContent.replace(
    forgeRowPattern,
    `$1,createVNode(_sfc_main$2,{title:"Claude Code / Claude Desktop","is-connected":hasClaudeConnections.value,onClick:()=>{}},null,8,["is-connected"])`
  );

  return jsContent;
}

// ─── Restore ──────────────────────────────────────────────────────────────────

function restore() {
  if (!fs.existsSync(ASAR_BACKUP)) {
    console.error('No backup found at:', ASAR_BACKUP);
    process.exit(1);
  }
  fs.copyFileSync(ASAR_BACKUP, ASAR_PATH);
  console.log('✅ Restored original app.asar from backup.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (process.argv[2] === 'restore') return restore();

  if (!fs.existsSync(ASAR_PATH)) {
    console.error('Herd app.asar not found at:', ASAR_PATH);
    console.error('Make sure Herd is installed at C:\\Program Files\\Herd');
    process.exit(1);
  }

  const asar = findAsarTool();
  console.log('Using asar tool:', asar);

  // 1. Backup original
  if (!fs.existsSync(ASAR_BACKUP)) {
    fs.copyFileSync(ASAR_PATH, ASAR_BACKUP);
    console.log('✅ Backed up app.asar →', ASAR_BACKUP);
  } else {
    console.log('ℹ  Backup already exists, skipping backup.');
  }

  // 2. Extract
  if (fs.existsSync(EXTRACT_DIR)) fs.rmSync(EXTRACT_DIR, { recursive: true });
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  console.log('Extracting app.asar...');
  execSync(`${asar} extract "${ASAR_PATH}" "${EXTRACT_DIR}"`, { stdio: 'inherit' });

  // 3. Find and patch renderer JS
  const rendererJs = findRendererJs(EXTRACT_DIR);
  console.log('Patching:', path.basename(rendererJs));
  let content = fs.readFileSync(rendererJs, 'utf8');
  content = applyPatch(content);
  fs.writeFileSync(rendererJs, content, 'utf8');

  // 4. Repack
  console.log('Repacking app.asar...');
  execSync(`${asar} pack "${EXTRACT_DIR}" "${ASAR_PATH}"`, { stdio: 'inherit' });

  // 5. Cleanup
  fs.rmSync(EXTRACT_DIR, { recursive: true });

  console.log('\n✅ Herd UI patched successfully!');
  console.log('   Restart Herd to see the Claude Code / Claude Desktop row in the Integrations tab.');
  console.log('\n   To restore original: node patch-herd-ui.js restore');
}

main();
