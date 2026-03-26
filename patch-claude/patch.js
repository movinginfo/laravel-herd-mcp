#!/usr/bin/env node
/**
 * patch.js — patches Herd's settings renderer JS to add a Claude Code row
 * in the Integrations tab.
 *
 * Usage (called by patch.ps1, which handles extraction/repacking/elevation):
 *   node patch.js <path-to-settings-*.js>
 *
 * Exit codes:
 *   0  patched successfully
 *   2  already patched (idempotent)
 *   1  error
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const jsFile = process.argv[2];
if (!jsFile) {
  console.error('Usage: node patch.js <path-to-settings-*.js>');
  process.exit(1);
}

if (!fs.existsSync(jsFile)) {
  console.error('File not found: ' + jsFile);
  process.exit(1);
}

let content = fs.readFileSync(jsFile, 'utf8');

// ── already patched? ─────────────────────────────────────────────────────────
if (content.includes('hasClaudeConnections')) {
  console.log('ALREADY_PATCHED');
  process.exit(2);
}

// ── validate targets ─────────────────────────────────────────────────────────
const T1 = 'const hasForgeConnections = ref(false);';
const T2 = [
  'const checkForIntegrations = async () => {',
  '      hasForgeConnections.value = await window.api.integrations.forge.exists();',
  '    };',
].join('\n');
const T3 = '}, null, 8, ["is-connected"])\n          ], 64))';

if (!content.includes(T1)) { console.error('TARGET1_NOT_FOUND'); process.exit(1); }
if (!content.includes(T2)) { console.error('TARGET2_NOT_FOUND'); process.exit(1); }
if (!content.includes(T3)) { console.error('TARGET3_NOT_FOUND'); process.exit(1); }

// ── patch 1 — add hasClaudeConnections ref ────────────────────────────────────
content = content.replace(
  T1,
  T1 + '\n    const hasClaudeConnections = ref(false);'
);

// ── patch 2 — probe our HTTP status endpoint ──────────────────────────────────
const newCheckFn = [
  'const checkForIntegrations = async () => {',
  '      hasForgeConnections.value = await window.api.integrations.forge.exists();',
  '      try {',
  '        const ctrl = new AbortController();',
  '        const _t = setTimeout(() => ctrl.abort(), 800);',
  '        const _r = await fetch("http://127.0.0.1:3000/status", { signal: ctrl.signal });',
  '        clearTimeout(_t);',
  '        hasClaudeConnections.value = _r.ok;',
  '      } catch {',
  '        // stdio mode or server not running — plugin is still installed',
  '        hasClaudeConnections.value = true;',
  '      }',
  '    };',
].join('\n');

content = content.replace(T2, newCheckFn);

// ── patch 3 — insert Claude Code row after Forge row ──────────────────────────
const claudeRow = [
  'createBaseVNode("div", {',
  '  style: "display:flex;align-items:center;justify-content:space-between;',
  'padding:20px;border:1px solid;border-color:rgb(55 65 81/1);border-radius:8px;',
  'background:rgb(31 41 55/1);margin-top:8px"',
  '}, [',
  '  createBaseVNode("div", { style: "display:flex;align-items:center;gap:20px" }, [',
  '    createBaseVNode("div", {',
  '      style: "width:20px;height:20px;background:#CC785C;border-radius:4px;',
  'display:flex;align-items:center;justify-content:center;',
  'color:white;font-weight:700;font-size:11px;font-family:sans-serif;flex-shrink:0"',
  '    }, "C"),',
  '    createBaseVNode("div", { style: "color:rgb(255 255 255/1)" }, [',
  '      createBaseVNode("div", null, "Claude Code"),',
  '      hasClaudeConnections.value',
  '        ? createBaseVNode("div", {',
  '            style: "display:flex;align-items:center;gap:6px;font-size:11px;color:rgb(16 185 129/1)"',
  '          }, [',
  '            createBaseVNode("div", {',
  '              style: "width:6px;height:6px;border-radius:50%;background:rgb(16 185 129/1);flex-shrink:0"',
  '            }),',
  '            createBaseVNode("div", null, "Connected")',
  '          ])',
  '        : createBaseVNode("div", {',
  '            style: "display:flex;align-items:center;gap:6px;font-size:11px;color:rgb(156 163 175/1)"',
  '          }, [',
  '            createBaseVNode("div", {',
  '              style: "width:6px;height:6px;border-radius:50%;background:rgb(209 213 219/1);flex-shrink:0"',
  '            }),',
  '            createBaseVNode("div", null, "Not connected")',
  '          ])',
  '    ])',
  '  ]),',
  '  createBaseVNode("div", { style: "color:rgb(107 114 128/1)" }, ">")',
'])',
].join('');

content = content.replace(
  T3,
  '}, null, 8, ["is-connected"]),\n            ' + claudeRow + '\n          ], 64))'
);

// ── write ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(jsFile, content, 'utf8');
console.log('PATCHED:' + path.basename(jsFile));
process.exit(0);
