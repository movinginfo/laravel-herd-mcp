/**
 * Active project selection tools.
 *
 * These tools let the user pick a site from Laravel Herd as the "active project".
 * Once selected, all other tools (artisan, composer, telescope, etc.) default to
 * that project's path without requiring an explicit `cwd` on every call.
 *
 * State is persisted to ~/.config/laravel-herd-mcp/state.json.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import {
  getActiveProject,
  setActiveProject,
  clearActiveProject,
} from '../active-project.js';

/** Parse the Herd `herd sites` table and return a map of name → path. */
function parseSitesTable(output: string): Array<{ name: string; path: string; url: string }> {
  const sites: Array<{ name: string; path: string; url: string }> = [];
  for (const line of output.split('\n')) {
    // Only process data rows (start and end with |, not separator rows with +---)
    if (!line.trim().startsWith('|') || line.includes('---') || line.includes('Site')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    // Expected columns: Site | URL | Path | Secured | PHP Version
    if (cols.length >= 3) {
      sites.push({ name: cols[0], url: cols[1], path: cols[2] });
    }
  }
  return sites;
}

export function registerProjectTools(server: McpServer, runner: CliRunner): void {

  // ── project_select ──────────────────────────────────────────────────────────

  server.tool(
    'project_select',
    'Select the active Laravel project. All tools (artisan, composer, telescope, etc.) will then default to this project without needing an explicit cwd. Pass a site name from Herd (e.g. "laravel-13vue") and the path will be resolved automatically, or provide a direct path.',
    {
      site:  z.string().optional().describe('Site name from Herd (e.g. "laravel-13vue") — path is auto-resolved'),
      path:  z.string().optional().describe('Direct path to Laravel project root — use when the project is not a Herd site'),
    },
    async ({ site, path: directPath }) => {
      try {
        if (!site && !directPath) {
          // List available sites so the user can choose
          const result = runner.herd(['sites']);
          const sites = parseSitesTable(result.stdout ?? '');
          if (sites.length === 0) {
            return textResult('No Herd sites found. Provide a direct path instead:\n  project_select path="C:\\herd\\my-project"');
          }
          const list = sites.map((s, i) => `${i + 1}. ${s.name}  →  ${s.path}`).join('\n');
          return textResult(`Available sites — call project_select with the site name:\n\n${list}\n\nExample: project_select site="laravel-13vue"`);
        }

        if (directPath) {
          // Use the path directly, derive name from the last path segment
          const name = directPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? directPath;
          setActiveProject(name, directPath);
          return textResult(`Active project set to: ${name}\nPath: ${directPath}\n\nAll tools will now default to this project.`);
        }

        // Look up site in Herd sites list
        const result = runner.herd(['sites']);
        const sites = parseSitesTable(result.stdout ?? '');
        const match = sites.find(s => s.name.toLowerCase() === site!.toLowerCase());

        if (!match) {
          const available = sites.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
          return errorResult(`Site "${site}" not found in Herd.\n\nAvailable sites:\n${available}`);
        }

        setActiveProject(match.name, match.path);
        return textResult(`Active project set to: ${match.name}\nPath: ${match.path}\nURL:  ${match.url}\n\nAll tools will now default to this project.`);
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── project_current ─────────────────────────────────────────────────────────

  server.tool(
    'project_current',
    'Show the currently active Laravel project. All tools default to this project when no explicit cwd is given.',
    {},
    async () => {
      const p = getActiveProject();
      if (!p) {
        return textResult('No active project selected.\n\nRun project_select to choose a site, or list available sites by calling project_select with no arguments.');
      }
      return textResult(`Active project: ${p.name}\nPath: ${p.path}`);
    }
  );

  // ── project_clear ───────────────────────────────────────────────────────────

  server.tool(
    'project_clear',
    'Clear the active project selection. After this, tools that require a project directory will ask for an explicit cwd again.',
    {},
    async () => {
      const prev = getActiveProject();
      clearActiveProject();
      if (prev) {
        return textResult(`Active project cleared (was: ${prev.name}).`);
      }
      return textResult('No active project was set.');
    }
  );
}
