import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import type { HerdConfig } from '../herd-detector';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

function readHerdConfig(herdConfig: HerdConfig): Record<string, unknown> {
  const cfgPath = path.join(path.dirname(herdConfig.binDir), 'config', 'config.json');
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function writeHerdConfig(herdConfig: HerdConfig, updated: Record<string, unknown>): void {
  const cfgPath = path.join(path.dirname(herdConfig.binDir), 'config', 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(updated, null, 2), 'utf8');
}

export function registerDumpsTools(server: McpServer, herdConfig: HerdConfig, runner: CliRunner): void {

  // ── Status ─────────────────────────────────────────────────────────────────

  server.tool('dumps_status',
    'Show all Herd dump interception and watcher settings from config.json',
    {},
    async () => {
      try {
        const cfg = readHerdConfig(herdConfig);
        const status = {
          dump_interception: {
            enabled:       cfg.dumps,
            watch_mode:    cfg.watchViaCLI,
            show_new_on_top: cfg.showNewDumpsOnTop,
            font_size:     cfg.dumpFontSize,
            color:         cfg.dumpsColor || '(default)',
          },
          watchers: {
            dumps:       cfg.watchDumps,
            views:       cfg.watchViews,
            logs:        cfg.watchLogs,
            queries:     cfg.watchQueries,
            events:      cfg.watchEvents,
            http_client: cfg.watchHttpClient,
          },
          debug: {
            base_php_port:    cfg.basePhpPort,
            base_debug_port:  (cfg.basePhpPort as number) + (cfg.baseDebugAddition as number),
          },
          shortcuts: {
            open:      cfg.openDumpsShortcut,
            clear:     cfg.clearDumpsShortcut,
            intercept: cfg.interceptDumpsShortcut,
          },
        };
        return textResult(JSON.stringify(status, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Toggle Dump Interception ───────────────────────────────────────────────

  server.tool('dumps_toggle',
    'Enable or disable Herd dump interception (intercepts dump(), dd(), var_dump() from PHP)',
    {
      enabled: z.boolean().describe('true to enable dump interception, false to disable'),
    },
    async ({ enabled }) => {
      try {
        const cfg = readHerdConfig(herdConfig);
        cfg.dumps = enabled;
        writeHerdConfig(herdConfig, cfg);
        return textResult(`Dump interception ${enabled ? 'enabled' : 'disabled'}.\nRestart Herd for changes to take effect.`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Configure Dump Display ─────────────────────────────────────────────────

  server.tool('dumps_configure',
    'Configure Herd dump display settings (font size, ordering, color, CLI watch mode)',
    {
      show_new_on_top:  z.boolean().optional().describe('Show newest dumps at the top'),
      font_size:        z.number().min(8).max(32).optional().describe('Dump panel font size (8–32, default 14)'),
      color:            z.string().optional().describe('Dumps category color hex e.g. "#FF6B6B" (empty for default)'),
      watch_via_cli:    z.boolean().optional().describe('Output dumps to CLI instead of Herd GUI'),
    },
    async ({ show_new_on_top, font_size, color, watch_via_cli }) => {
      try {
        const cfg = readHerdConfig(herdConfig);
        const changes: string[] = [];
        if (show_new_on_top !== undefined) { cfg.showNewDumpsOnTop = show_new_on_top; changes.push(`showNewDumpsOnTop = ${show_new_on_top}`); }
        if (font_size !== undefined)       { cfg.dumpFontSize = font_size;            changes.push(`dumpFontSize = ${font_size}`); }
        if (color !== undefined)           { cfg.dumpsColor = color;                  changes.push(`dumpsColor = "${color}"`); }
        if (watch_via_cli !== undefined)   { cfg.watchViaCLI = watch_via_cli;         changes.push(`watchViaCLI = ${watch_via_cli}`); }
        if (changes.length === 0) return textResult('No changes specified.');
        writeHerdConfig(herdConfig, cfg);
        return textResult('Dump settings updated:\n' + changes.map(c => '  • ' + c).join('\n') + '\nRestart Herd UI to apply.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Watchers ───────────────────────────────────────────────────────────────

  server.tool('watchers_get',
    'Show current state of all Herd watchers (dumps, views, logs, queries, events, http_client)',
    {},
    async () => {
      try {
        const cfg = readHerdConfig(herdConfig);
        return textResult(JSON.stringify({
          dumps:       cfg.watchDumps,
          views:       cfg.watchViews,
          logs:        cfg.watchLogs,
          queries:     cfg.watchQueries,
          events:      cfg.watchEvents,
          http_client: cfg.watchHttpClient,
        }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('watchers_set',
    'Enable or disable individual Herd watchers. Watchers stream live data to the Herd UI.',
    {
      dumps:       z.boolean().optional().describe('Watch dump() calls'),
      views:       z.boolean().optional().describe('Watch Blade view renders'),
      logs:        z.boolean().optional().describe('Watch application log entries'),
      queries:     z.boolean().optional().describe('Watch database queries with timing'),
      events:      z.boolean().optional().describe('Watch dispatched events'),
      http_client: z.boolean().optional().describe('Watch outgoing HTTP client requests'),
    },
    async ({ dumps, views, logs, queries, events, http_client }) => {
      try {
        const cfg = readHerdConfig(herdConfig);
        const changes: string[] = [];
        if (dumps       !== undefined) { cfg.watchDumps       = dumps;       changes.push(`watchDumps = ${dumps}`); }
        if (views       !== undefined) { cfg.watchViews       = views;       changes.push(`watchViews = ${views}`); }
        if (logs        !== undefined) { cfg.watchLogs        = logs;        changes.push(`watchLogs = ${logs}`); }
        if (queries     !== undefined) { cfg.watchQueries     = queries;     changes.push(`watchQueries = ${queries}`); }
        if (events      !== undefined) { cfg.watchEvents      = events;      changes.push(`watchEvents = ${events}`); }
        if (http_client !== undefined) { cfg.watchHttpClient  = http_client; changes.push(`watchHttpClient = ${http_client}`); }
        if (changes.length === 0) return textResult('No watcher changes specified.');
        writeHerdConfig(herdConfig, cfg);
        return textResult('Watchers updated:\n' + changes.map(c => '  • ' + c).join('\n') + '\nRestart Herd UI to apply.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Debug Sessions (Pro) ───────────────────────────────────────────────────

  server.tool('debug_session_start',
    'Start an Xdebug debug session to capture dumps and stack traces — requires Herd Pro',
    {},
    async () => {
      try {
        const result = runner.herd(['debug:start']);
        return textResult(result.stdout || result.stderr || 'Debug session started.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('debug_session_stop',
    'Stop the active Xdebug debug session and display captured data — requires Herd Pro',
    {},
    async () => {
      try {
        const result = runner.herd(['debug:stop']);
        return textResult(result.stdout || result.stderr || 'Debug session stopped.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Spatie Ray (optional package) ─────────────────────────────────────────

  server.tool('ray_install',
    'Install Spatie Ray debug package in a Laravel project (composer require spatie/laravel-ray --dev)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const req = runner.composer(['require', 'spatie/laravel-ray', '--dev', '--no-interaction'], cwd);
        if (req.exitCode !== 0) return textResult('composer require failed:\n' + (req.stdout || req.stderr));
        const pub = runner.php(['artisan', 'vendor:publish', '--provider=Spatie\\LaravelRay\\RayServiceProvider', '--no-interaction'], cwd);
        return textResult(
          '=== composer require ===\n' + req.stdout +
          '\n\n=== vendor:publish ===\n' + (pub.stdout || pub.stderr) +
          '\n\nRay installed. Configure config/ray.php and open the Ray app to see dumps.'
        );
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('ray_configure',
    'Show or update Spatie Ray configuration (config/ray.php) for a Laravel project',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const result = runner.php(['artisan', 'config:show', 'ray'], cwd);
        return textResult(result.stdout || result.stderr || 'Ray config not found. Run ray_install first.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Clockwork (optional package) ──────────────────────────────────────────

  server.tool('clockwork_install',
    'Install Clockwork debug toolbar in a Laravel project (itsgoingd/clockwork)',
    {
      cwd: z.string().optional().describe('Laravel project root directory'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const req = runner.composer(['require', 'itsgoingd/clockwork', '--dev', '--no-interaction'], cwd);
        if (req.exitCode !== 0) return textResult('composer require failed:\n' + (req.stdout || req.stderr));
        return textResult(
          req.stdout +
          '\n\nClockwork installed. Install the browser extension at https://underground.works/clockwork\n' +
          'Then open your site in browser to see timeline, queries, events.'
        );
      } catch (e) { return errorResult(e); }
    }
  );

  // Telescope tools are in tools/telescope.ts (registerTelescopeTools)
}
