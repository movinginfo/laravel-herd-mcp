/**
 * Laravel Nightwatch integration tools.
 *
 * Nightwatch is a cloud monitoring service (nightwatch.laravel.com) that
 * captures exceptions, slow queries, failed jobs, logs, requests and more.
 * A local agent (php artisan nightwatch:agent) runs continuously and forwards
 * events to the cloud dashboard.
 *
 * Tools here handle: install, enable/disable, configure, agent start/stop,
 * status check, and MCP server setup.
 *
 * Docs: https://nightwatch.laravel.com/docs/start-guide
 * Env:  https://nightwatch.laravel.com/docs/environment-variables
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

// ── .env helpers ──────────────────────────────────────────────────────────────

function setEnvValue(cwd: string, key: string, value: string): void {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) throw new Error(`.env not found in ${cwd}`);
  let content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

function getEnvValue(cwd: string, key: string): string | null {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '').trim() : null;
}

function isInstalled(cwd: string): boolean {
  const lockPath = path.join(cwd, 'composer.lock');
  if (!fs.existsSync(lockPath)) return false;
  return fs.readFileSync(lockPath, 'utf8').includes('"laravel/nightwatch"');
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerNightwatchTools(server: McpServer, runner: CliRunner): void {

  // ── nightwatch_install ────────────────────────────────────────────────────

  server.tool(
    'nightwatch_install',
    'Install Laravel Nightwatch cloud monitoring in one step: composer require, .env config (token, log channel, sampling, server name), and optional agent start. Get your token from nightwatch.laravel.com.',
    {
      cwd:                  z.string().optional().describe('Laravel project root'),
      token:                z.string().describe('NIGHTWATCH_TOKEN from nightwatch.laravel.com (create a new application there first)'),
      log_channel:          z.enum(['nightwatch', 'stack']).optional().describe('LOG_CHANNEL — "nightwatch" for dedicated channel or "stack" to add to existing stack (default: nightwatch)'),
      request_sample_rate:  z.number().min(0).max(1).optional().describe('NIGHTWATCH_REQUEST_SAMPLE_RATE — fraction of requests to capture 0.0–1.0 (default: 1.0 = 100%; use 0.1 for high-traffic apps)'),
      server_name:          z.string().optional().describe('NIGHTWATCH_SERVER — label shown in Nightwatch dashboard (default: hostname)'),
      deploy:               z.string().optional().describe('NIGHTWATCH_DEPLOY — deployment/release identifier, e.g. git SHA or version tag (default: auto-detected)'),
      start_agent:          z.boolean().optional().describe('Start the Nightwatch agent immediately after install (default: true)'),
      listen_on:            z.string().optional().describe('Agent listen address for --listen-on flag, e.g. "127.0.0.1:2408" — only needed when running multiple apps on one server (default: 127.0.0.1:2407)'),
    },
    async ({ cwd: _cwd, token, log_channel, request_sample_rate, server_name, deploy, start_agent, listen_on }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const lines: string[] = [];
        const alreadyInstalled = isInstalled(cwd);

        // ── 1. Composer install (skip if already installed) ──────────────────
        if (alreadyInstalled) {
          lines.push('Package: laravel/nightwatch already installed — skipping composer require.');
        } else {
          lines.push('Installing laravel/nightwatch via composer...');
          const install = runner.composer(['require', 'laravel/nightwatch'], cwd);
          // Check composer.lock instead of exit code — post-install scripts (e.g. boost:update)
          // may fail with non-zero exit even when Nightwatch itself installed correctly.
          const nowInstalled = isInstalled(cwd);
          if (!nowInstalled) {
            return errorResult(`composer require failed:\n${install.stderr || install.stdout}`);
          }
          lines.push('Package: laravel/nightwatch installed successfully.');
        }

        // ── 2. Configure .env ────────────────────────────────────────────────
        const channel = log_channel ?? 'nightwatch';
        setEnvValue(cwd, 'NIGHTWATCH_TOKEN', token);
        setEnvValue(cwd, 'NIGHTWATCH_ENABLED', 'true');
        setEnvValue(cwd, 'LOG_CHANNEL', channel);
        if (request_sample_rate !== undefined) {
          setEnvValue(cwd, 'NIGHTWATCH_REQUEST_SAMPLE_RATE', String(request_sample_rate));
        }
        if (server_name) setEnvValue(cwd, 'NIGHTWATCH_SERVER', server_name);
        if (deploy)      setEnvValue(cwd, 'NIGHTWATCH_DEPLOY', deploy);
        if (listen_on)   setEnvValue(cwd, 'NIGHTWATCH_INGEST_URI', listen_on);

        lines.push('');
        lines.push('Env configured:');
        lines.push(`  NIGHTWATCH_TOKEN=${token.slice(0, 8)}...${token.slice(-4)}`);
        lines.push(`  NIGHTWATCH_ENABLED=true`);
        lines.push(`  LOG_CHANNEL=${channel}`);
        if (request_sample_rate !== undefined) {
          lines.push(`  NIGHTWATCH_REQUEST_SAMPLE_RATE=${request_sample_rate} (${request_sample_rate * 100}% of requests)`);
        }
        if (server_name) lines.push(`  NIGHTWATCH_SERVER=${server_name}`);
        if (deploy)      lines.push(`  NIGHTWATCH_DEPLOY=${deploy}`);
        if (listen_on)   lines.push(`  NIGHTWATCH_INGEST_URI=${listen_on}`);

        // ── 3. Start agent (default: true) ───────────────────────────────────
        const shouldStart = start_agent !== false;
        if (shouldStart) {
          try {
            const artisan    = path.join(cwd, 'artisan');
            const agentArgs  = [artisan, 'nightwatch:agent'];
            if (listen_on) agentArgs.push(`--listen-on=${listen_on}`);
            const pid = runner.phpDetached(agentArgs, cwd);
            lines.push('');
            lines.push(`Agent: started in background (PID: ${pid}) on ${listen_on ?? '127.0.0.1:2407'}`);
          } catch {
            lines.push('');
            lines.push('Agent: could not start automatically — run nightwatch_agent_start manually.');
          }
        } else {
          lines.push('');
          lines.push('Agent: not started — run nightwatch_agent_start when ready.');
        }

        lines.push('');
        lines.push('Nightwatch is ready. Visit https://nightwatch.laravel.com to view your dashboard.');
        lines.push('Tip: run nightwatch_mcp_setup to connect your AI assistant to the Nightwatch cloud MCP.');

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_status ─────────────────────────────────────────────────────

  server.tool(
    'nightwatch_status',
    'Check Laravel Nightwatch installation status, .env configuration, and run php artisan nightwatch:status to test agent connectivity and cloud ingest.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const installed    = isInstalled(cwd);
        const enabled      = getEnvValue(cwd, 'NIGHTWATCH_ENABLED') ?? 'true';
        const token        = getEnvValue(cwd, 'NIGHTWATCH_TOKEN');
        const logCh        = getEnvValue(cwd, 'LOG_CHANNEL');
        const sampleReq    = getEnvValue(cwd, 'NIGHTWATCH_REQUEST_SAMPLE_RATE');
        const sampleCmd    = getEnvValue(cwd, 'NIGHTWATCH_COMMAND_SAMPLE_RATE');
        const sampleExc    = getEnvValue(cwd, 'NIGHTWATCH_EXCEPTION_SAMPLE_RATE');
        const ingestUri    = getEnvValue(cwd, 'NIGHTWATCH_INGEST_URI') ?? '127.0.0.1:2407 (default)';
        const serverName   = getEnvValue(cwd, 'NIGHTWATCH_SERVER');
        const deploy       = getEnvValue(cwd, 'NIGHTWATCH_DEPLOY');
        const agentLogLvl  = getEnvValue(cwd, 'NIGHTWATCH_AGENT_LOG_LEVEL');

        const lines: string[] = [
          `Installed:        ${installed ? 'Yes (laravel/nightwatch in composer.lock)' : 'No — run nightwatch_install'}`,
          `Monitoring:       ${enabled !== 'false' ? 'Enabled' : 'Disabled'}`,
          `Token:            ${token ? token.slice(0, 8) + '...' + token.slice(-4) : 'NOT SET — required'}`,
          `LOG_CHANNEL:      ${logCh ?? 'not set'}`,
          `Request sample:   ${sampleReq ?? '1.0 (default — 100%)'}`,
          `Command sample:   ${sampleCmd ?? '1.0 (default)'}`,
          `Exception sample: ${sampleExc ?? '1.0 (default)'}`,
          `Agent address:    ${ingestUri}`,
          ...(serverName   ? [`Server name:      ${serverName}`]  : []),
          ...(deploy       ? [`Deploy:           ${deploy}`]      : []),
          ...(agentLogLvl  ? [`Agent log level:  ${agentLogLvl}`] : []),
          '',
        ];

        if (installed) {
          const result = runner.php(['artisan', 'nightwatch:status'], cwd);
          lines.push('--- php artisan nightwatch:status ---');
          lines.push(result.stdout || result.stderr || '(no output)');
        } else {
          lines.push('Run nightwatch_install to get started.');
        }

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_enable ─────────────────────────────────────────────────────

  server.tool(
    'nightwatch_enable',
    'Enable Laravel Nightwatch monitoring by setting NIGHTWATCH_ENABLED=true in .env.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        setEnvValue(cwd, 'NIGHTWATCH_ENABLED', 'true');
        return textResult('Nightwatch enabled (NIGHTWATCH_ENABLED=true). Make sure the agent is running — use nightwatch_agent_start if needed.');
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_disable ────────────────────────────────────────────────────

  server.tool(
    'nightwatch_disable',
    'Disable Laravel Nightwatch monitoring by setting NIGHTWATCH_ENABLED=false in .env. The agent process (if running) can be left as-is or stopped with nightwatch_agent_stop.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        setEnvValue(cwd, 'NIGHTWATCH_ENABLED', 'false');
        return textResult('Nightwatch disabled (NIGHTWATCH_ENABLED=false). No events will be sent. Use nightwatch_enable to re-enable.');
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_configure ──────────────────────────────────────────────────

  server.tool(
    'nightwatch_configure',
    'Configure Laravel Nightwatch .env settings. Covers all official env vars: sampling rates, redaction, capture flags, ignore filters, ingest timeouts, agent settings. Only provided fields are updated.',
    {
      cwd:                             z.string().optional().describe('Laravel project root'),
      // Core
      token:                           z.string().optional().describe('NIGHTWATCH_TOKEN — API token from nightwatch.laravel.com'),
      deploy:                          z.string().optional().describe('NIGHTWATCH_DEPLOY — deployment/release identifier, e.g. git SHA or version tag (default: auto-detected)'),
      server_name:                     z.string().optional().describe('NIGHTWATCH_SERVER — server label shown in dashboard (default: hostname)'),
      log_channel:                     z.string().optional().describe('LOG_CHANNEL — "nightwatch" or "stack"'),
      // Sampling
      request_sample_rate:             z.number().min(0).max(1).optional().describe('NIGHTWATCH_REQUEST_SAMPLE_RATE — fraction of HTTP requests to capture (0.0–1.0, default: 1.0)'),
      command_sample_rate:             z.number().min(0).max(1).optional().describe('NIGHTWATCH_COMMAND_SAMPLE_RATE — fraction of Artisan commands to capture (default: 1.0)'),
      scheduled_task_sample_rate:      z.number().min(0).max(1).optional().describe('NIGHTWATCH_SCHEDULED_TASK_SAMPLE_RATE — fraction of scheduled tasks to capture (default: 1.0)'),
      exception_sample_rate:           z.number().min(0).max(1).optional().describe('NIGHTWATCH_EXCEPTION_SAMPLE_RATE — fraction of exceptions to capture (default: 1.0)'),
      // Capture flags
      capture_exception_source_code:   z.boolean().optional().describe('NIGHTWATCH_CAPTURE_EXCEPTION_SOURCE_CODE — include source snippets in stack traces (default: true)'),
      capture_request_payload:         z.boolean().optional().describe('NIGHTWATCH_CAPTURE_REQUEST_PAYLOAD — capture request body for exceptions (default: false)'),
      // Redaction
      redact_headers:                  z.string().optional().describe('NIGHTWATCH_REDACT_HEADERS — comma-separated headers to redact (default: Authorization,Cookie,Proxy-Authorization,X-XSRF-TOKEN)'),
      redact_payload_fields:           z.string().optional().describe('NIGHTWATCH_REDACT_PAYLOAD_FIELDS — comma-separated payload fields to redact (default: _token,password,password_confirmation)'),
      // Ignore filters
      ignore_queries:                  z.boolean().optional().describe('NIGHTWATCH_IGNORE_QUERIES — exclude database queries'),
      ignore_cache_events:             z.boolean().optional().describe('NIGHTWATCH_IGNORE_CACHE_EVENTS — exclude cache events'),
      ignore_mail:                     z.boolean().optional().describe('NIGHTWATCH_IGNORE_MAIL — exclude mail events'),
      ignore_notifications:            z.boolean().optional().describe('NIGHTWATCH_IGNORE_NOTIFICATIONS — exclude notifications'),
      ignore_outgoing_requests:        z.boolean().optional().describe('NIGHTWATCH_IGNORE_OUTGOING_REQUESTS — exclude outgoing HTTP requests'),
      log_level:                       z.string().optional().describe('NIGHTWATCH_LOG_LEVEL — minimum log level to capture: error/warning/info/debug (default: LOG_LEVEL env or "debug")'),
      // Ingest / transport
      ingest_uri:                      z.string().optional().describe('NIGHTWATCH_INGEST_URI — agent address:port (default: 127.0.0.1:2407; use 0.0.0.0:2407 for Docker)'),
      ingest_timeout:                  z.number().optional().describe('NIGHTWATCH_INGEST_TIMEOUT — send operation timeout in seconds (default: 0.5)'),
      ingest_connection_timeout:       z.number().optional().describe('NIGHTWATCH_INGEST_CONNECTION_TIMEOUT — connection establishment timeout in seconds (default: 0.5)'),
      ingest_event_buffer:             z.number().int().optional().describe('NIGHTWATCH_INGEST_EVENT_BUFFER — max events to buffer before flushing (default: 500)'),
      // Agent
      agent_log_level:                 z.string().optional().describe('NIGHTWATCH_AGENT_LOG_LEVEL — agent verbosity: critical/error/info/verbose (default: info)'),
    },
    async ({ cwd: _cwd, token, deploy, server_name, log_channel,
             request_sample_rate, command_sample_rate, scheduled_task_sample_rate, exception_sample_rate,
             capture_exception_source_code, capture_request_payload,
             redact_headers, redact_payload_fields,
             ignore_queries, ignore_cache_events, ignore_mail, ignore_notifications, ignore_outgoing_requests,
             log_level, ingest_uri, ingest_timeout, ingest_connection_timeout, ingest_event_buffer,
             agent_log_level }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const changed: string[] = [];

        const setStr  = (key: string, val: string | undefined)  => { if (val !== undefined) { setEnvValue(cwd, key, val);          changed.push(`${key}=${val}`); } };
        const setNum  = (key: string, val: number | undefined)  => { if (val !== undefined) { setEnvValue(cwd, key, String(val));   changed.push(`${key}=${val}`); } };
        const setBool = (key: string, val: boolean | undefined) => { if (val !== undefined) { setEnvValue(cwd, key, val ? 'true' : 'false'); changed.push(`${key}=${val}`); } };

        // Core
        setStr('NIGHTWATCH_TOKEN',  token);
        setStr('NIGHTWATCH_DEPLOY', deploy);
        setStr('NIGHTWATCH_SERVER', server_name);
        setStr('LOG_CHANNEL',       log_channel);
        // Sampling
        setNum('NIGHTWATCH_REQUEST_SAMPLE_RATE',        request_sample_rate);
        setNum('NIGHTWATCH_COMMAND_SAMPLE_RATE',         command_sample_rate);
        setNum('NIGHTWATCH_SCHEDULED_TASK_SAMPLE_RATE', scheduled_task_sample_rate);
        setNum('NIGHTWATCH_EXCEPTION_SAMPLE_RATE',       exception_sample_rate);
        // Capture
        setBool('NIGHTWATCH_CAPTURE_EXCEPTION_SOURCE_CODE', capture_exception_source_code);
        setBool('NIGHTWATCH_CAPTURE_REQUEST_PAYLOAD',        capture_request_payload);
        // Redaction
        setStr('NIGHTWATCH_REDACT_HEADERS',        redact_headers);
        setStr('NIGHTWATCH_REDACT_PAYLOAD_FIELDS', redact_payload_fields);
        // Ignore
        setBool('NIGHTWATCH_IGNORE_QUERIES',           ignore_queries);
        setBool('NIGHTWATCH_IGNORE_CACHE_EVENTS',      ignore_cache_events);
        setBool('NIGHTWATCH_IGNORE_MAIL',              ignore_mail);
        setBool('NIGHTWATCH_IGNORE_NOTIFICATIONS',     ignore_notifications);
        setBool('NIGHTWATCH_IGNORE_OUTGOING_REQUESTS', ignore_outgoing_requests);
        setStr('NIGHTWATCH_LOG_LEVEL', log_level);
        // Ingest
        setStr('NIGHTWATCH_INGEST_URI',                ingest_uri);
        setNum('NIGHTWATCH_INGEST_TIMEOUT',            ingest_timeout);
        setNum('NIGHTWATCH_INGEST_CONNECTION_TIMEOUT', ingest_connection_timeout);
        setNum('NIGHTWATCH_INGEST_EVENT_BUFFER',       ingest_event_buffer);
        // Agent
        setStr('NIGHTWATCH_AGENT_LOG_LEVEL', agent_log_level);

        if (changed.length === 0) {
          return textResult('No changes — provide at least one option to configure.');
        }
        return textResult(`Updated ${changed.length} env var(s):\n${changed.map(c => `  ${c}`).join('\n')}`);
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_agent_start ────────────────────────────────────────────────

  server.tool(
    'nightwatch_agent_start',
    'Start the Laravel Nightwatch agent in the background (php artisan nightwatch:agent). The agent must run continuously to buffer and forward events to nightwatch.laravel.com. Listens on 127.0.0.1:2407 by default. Use listen_on when running multiple apps on one server.',
    {
      cwd:       z.string().optional().describe('Laravel project root'),
      listen_on: z.string().optional().describe('Custom listen address, e.g. "127.0.0.1:2408" — required when running multiple Nightwatch apps on one server. Set NIGHTWATCH_INGEST_URI to the same value in .env.'),
    },
    async ({ cwd: _cwd, listen_on }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        if (!isInstalled(cwd)) {
          return errorResult('Nightwatch is not installed. Run nightwatch_install first.');
        }
        const artisan   = path.join(cwd, 'artisan');
        const agentArgs = [artisan, 'nightwatch:agent'];
        if (listen_on) agentArgs.push(`--listen-on=${listen_on}`);
        const pid     = runner.phpDetached(agentArgs, cwd);
        const address = listen_on ?? '127.0.0.1:2407';

        return textResult([
          `Nightwatch agent started (PID: ${pid}).`,
          '',
          `The agent runs in the background on ${address}`,
          'and forwards captured events to nightwatch.laravel.com.',
          ...(listen_on ? [``, `Note: set NIGHTWATCH_INGEST_URI=${listen_on} in .env so the app sends to this address.`] : []),
          '',
          'Check connectivity:  nightwatch_status',
          'Stop the agent:      nightwatch_agent_stop',
          'View your data:      https://nightwatch.laravel.com',
        ].join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_agent_stop ─────────────────────────────────────────────────

  server.tool(
    'nightwatch_agent_stop',
    'Stop all running Laravel Nightwatch agent processes (finds and kills php.exe processes running nightwatch:agent on Windows).',
    {
      cwd: z.string().optional().describe('Laravel project root (used to confirm project context)'),
    },
    async ({ cwd: _cwd }) => {
      try {
        // Find php.exe processes running nightwatch:agent
        const find = spawnSync(
          'wmic',
          ['process', 'where', `"name='php.exe' and commandline like '%nightwatch:agent%'"`, 'get', 'processid', '/format:value'],
          { encoding: 'utf8', shell: true }
        );

        const pids = (find.stdout ?? '')
          .split('\n')
          .map((l: string) => l.match(/ProcessId=(\d+)/i)?.[1])
          .filter(Boolean) as string[];

        if (pids.length === 0) {
          return textResult('No running Nightwatch agent processes found.');
        }

        for (const pid of pids) {
          spawnSync('taskkill', ['/F', '/PID', pid], { shell: true });
        }

        return textResult(`Stopped ${pids.length} Nightwatch agent process(es) (PIDs: ${pids.join(', ')}).`);
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── nightwatch_mcp_setup ──────────────────────────────────────────────────

  server.tool(
    'nightwatch_mcp_setup',
    'Register the official Nightwatch cloud MCP server into your IDE. This connects AI assistants directly to your Nightwatch dashboard — browse issues, view stack traces, update status, add comments. Uses OAuth for authentication.',
    {
      ide: z.enum(['claude-code', 'cursor', 'vscode', 'gemini', 'codex', 'other'])
           .optional()
           .describe('IDE to configure (default: claude-code). claude-code runs the command automatically; others receive manual instructions.'),
    },
    async ({ ide = 'claude-code' }) => {
      const MCP_URL = 'https://nightwatch.laravel.com/mcp';

      if (ide === 'claude-code') {
        // Run `claude mcp add` directly
        const result = spawnSync(
          'claude',
          ['mcp', 'add', '--transport', 'http', 'nightwatch', MCP_URL],
          { encoding: 'utf8', shell: true }
        );

        if (result.status === 0) {
          return textResult([
            'Nightwatch MCP server registered in Claude Code.',
            '',
            'Run /mcp in a Claude Code session to complete OAuth authentication.',
            'A browser window will open for you to authorize access.',
            '',
            'Once connected, your AI assistant can:',
            '  • List your Nightwatch applications',
            '  • Browse and investigate issues',
            '  • View full stack traces and source context',
            '  • Update issue status (resolve, ignore, etc.)',
            '  • Add comments to issues',
          ].join('\n'));
        }

        // claude CLI not found or failed — return manual instructions
        return textResult([
          'Could not run `claude mcp add` automatically.',
          '',
          'Run this command manually in your terminal:',
          '',
          `  claude mcp add --transport http nightwatch ${MCP_URL}`,
          '',
          'Then run /mcp in a Claude Code session to complete OAuth authentication.',
        ].join('\n'));
      }

      const configs: Record<string, string> = {
        cursor: [
          'Add to .cursor/mcp.json:',
          '',
          '{',
          '  "mcpServers": {',
          '    "nightwatch": {',
          '      "command": "npx",',
          '      "args": ["-y", "mcp-remote", "' + MCP_URL + '"]',
          '    }',
          '  }',
          '}',
        ].join('\n'),

        vscode: [
          'Open Command Palette (Ctrl/Cmd+Shift+P) → MCP: Add Server',
          `Enter URL: ${MCP_URL}`,
        ].join('\n'),

        gemini: [
          'Add to .gemini/settings.json:',
          '',
          '{',
          '  "mcpServers": {',
          '    "nightwatch": {',
          '      "command": "npx",',
          '      "args": ["-y", "mcp-remote", "' + MCP_URL + '"]',
          '    }',
          '  }',
          '}',
        ].join('\n'),

        codex: [
          'Run in your terminal:',
          '',
          `  codex mcp add nightwatch --url ${MCP_URL}`,
        ].join('\n'),

        other: [
          `MCP server URL: ${MCP_URL}`,
          '',
          'If your client does not support remote servers natively, use mcp-remote:',
          '',
          `  npx -y mcp-remote ${MCP_URL}`,
        ].join('\n'),
      };

      const instructions = configs[ide] ?? configs.other;
      return textResult([
        `Nightwatch MCP setup for ${ide}:`,
        '',
        instructions,
        '',
        'After connecting, authenticate via OAuth — a browser window will open.',
        'Once authorized, your AI assistant can browse issues, view stack traces, update status, and more.',
      ].join('\n'));
    }
  );
}
