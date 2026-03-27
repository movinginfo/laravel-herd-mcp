/**
 * Active project state — persists the user's currently selected Laravel site
 * to ~/.config/laravel-herd-mcp/state.json so all tools can default to it
 * without requiring an explicit `cwd` on every call.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ActiveProject {
  name: string;
  path: string;
}

function stateFile(): string {
  const dir = path.join(os.homedir(), '.config', 'laravel-herd-mcp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'state.json');
}

function readState(): Record<string, unknown> {
  try {
    const f = stateFile();
    if (!fs.existsSync(f)) return {};
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(data: Record<string, unknown>): void {
  fs.writeFileSync(stateFile(), JSON.stringify(data, null, 2), 'utf8');
}

/** Return the currently active project, or null if none selected. */
export function getActiveProject(): ActiveProject | null {
  const state = readState();
  const p = state.activeProject as ActiveProject | undefined;
  if (p?.path && p?.name) return p;
  return null;
}

/** Persist a new active project selection. */
export function setActiveProject(name: string, projectPath: string): void {
  const state = readState();
  state.activeProject = { name, path: projectPath };
  writeState(state);
}

/** Clear the active project selection. */
export function clearActiveProject(): void {
  const state = readState();
  delete state.activeProject;
  writeState(state);
}

/**
 * Resolve the working directory for a tool call.
 *  - If an explicit `cwd` was provided, use it.
 *  - Otherwise fall back to the active project path.
 *  - Returns null if neither is available.
 */
export function resolveCwd(cwd?: string): string | null {
  if (cwd) return cwd;
  return getActiveProject()?.path ?? null;
}

/** Error message shown when no cwd and no active project. */
export const NO_PROJECT_MSG =
  'No active project selected. Run project_select to choose a site, or provide the cwd parameter.';
