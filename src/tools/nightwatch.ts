/**
 * Laravel Nightwatch integration tools.
 *
 * Nightwatch is a cloud monitoring service (nightwatch.laravel.com) that
 * captures exceptions, slow queries, failed jobs, logs, requests and more.
 * A local agent (php artisan nightwatch:agent) runs continuously and forwards
 * events to the cloud dashboard.
 *
 * Tools here handle: install, enable/disable, configure, agent start/stop,
 * status check. Data is viewed on the Nightwatch cloud dashboard.
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
    'Install Laravel Nightwatch cloud monitoring. Runs composer require laravel/nightwatch, sets NIGHTWATCH_TOKEN, configures LOG_CHANNEL and request sampling rate in .env. Get your token from nightwatch.laravel.com.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      token: z.string().describe('NIGHTWATCH_TOKEN from nightwatch.laravel.com (create a new application there first)'),
      log_channel: z.enum(['nightwatch', 'stack']).optional().describe('LOG_CHANNEL — use "nightwatch" for dedicated channel or "stack" to add to existing stack (default: nightwatch)'),
      request_sample_rate: z.number().min(0).max(1).optional().describe('NIGHTWATCH_REQUEST_SAMPLE_RATE — fraction of requests to capture (default: 0.1 = 10%)'),
    },
    async ({ cwd: _cwd, token, log_channel, request_sample_rate }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const install = runner.composer(['require', 'laravel/nightwatch'], cwd);
        if (install.exitCode !== 0) {
          return errorResult(`composer require failed:\n${install.stderr || install.stdout}`);
        }

        setEnvValue(cwd, 'NIGHTWATCH_TOKEN', token);
        setEnvValue(cwd, 'LOG_CHANNEL', log_channel ?? 'nightwatch');
        setEnvValue(cwd, 'NIGHTWATCH_REQUEST_SAMPLE_RATE', String(request_sample_rate ?? 0.1));
        setEnvValue(cwd, 'NIGHTWATCH_ENABLED', 'true');

        return textResult([
          'Nightwatch installed successfully.',
          '',
          'Env configured:',
          `  NIGHTWATCH_TOKEN=${token.slice(0, 8)}...`,
          `  LOG_CHANNEL=${log_channel ?? 'nightwatch'}`,
          `  NIGHTWATCH_REQUEST_SAMPLE_RATE=${request_sample_rate ?? 0.1}`,
          `  NIGHTWATCH_ENABLED=true`,
          '',
          'Next step: start the agent with nightwatch_agent_start',
          'Then visit https://nightwatch.laravel.com to view your dashboard.',
        ].join('\n'));
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
        const installed = isInstalled(cwd);
        const enabled   = getEnvValue(cwd, 'NIGHTWATCH_ENABLED') ?? 'true';
        const token     = getEnvValue(cwd, 'NIGHTWATCH_TOKEN');
        const logCh     = getEnvValue(cwd, 'LOG_CHANNEL');
        const sampleReq = getEnvValue(cwd, 'NIGHTWATCH_REQUEST_SAMPLE_RATE');
        const ingestUri = getEnvValue(cwd, 'NIGHTWATCH_INGEST_URI') ?? '127.0.0.1:2407 (default)';

        const lines: string[] = [
          `Installed:       ${installed ? 'Yes (laravel/nightwatch in composer.lock)' : 'No — run nightwatch_install'}`,
          `Monitoring:      ${enabled !== 'false' ? 'Enabled' : 'Disabled'}`,
          `Token:           ${token ? token.slice(0, 8) + '...' + token.slice(-4) : 'NOT SET — required'}`,
          `LOG_CHANNEL:     ${logCh ?? 'not set'}`,
          `Request sample:  ${sampleReq ?? '1.0 (default — consider lowering to 0.1)'}`,
          `Agent address:   ${ingestUri}`,
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
    'Configure Laravel Nightwatch .env settings: token, log channel, sampling rates for requests/commands/jobs/exceptions, capture flags, ignore filters, agent address. Only provided fields are updated.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
      token: z.string().optional().describe('NIGHTWATCH_TOKEN from nightwatch.laravel.com'),
      log_channel: z.string().optional().describe('LOG_CHANNEL (nightwatch or stack)'),
      request_sample_rate: z.number().min(0).max(1).optional().describe('NIGHTWATCH_REQUEST_SAMPLE_RATE (0.0–1.0) — fraction of requests to sample'),
      command_sample_rate: z.number().min(0).max(1).optional().describe('NIGHTWATCH_COMMAND_SAMPLE_RATE (0.0–1.0)'),
      scheduled_task_sample_rate: z.number().min(0).max(1).optional().describe('NIGHTWATCH_SCHEDULED_TASK_SAMPLE_RATE (0.0–1.0)'),
      exception_sample_rate: z.number().min(0).max(1).optional().describe('NIGHTWATCH_EXCEPTION_SAMPLE_RATE (0.0–1.0)'),
      capture_exception_source_code: z.boolean().optional().describe('NIGHTWATCH_CAPTURE_EXCEPTION_SOURCE_CODE — include source snippets in stack traces (default true)'),
      capture_request_payload: z.boolean().optional().describe('NIGHTWATCH_CAPTURE_REQUEST_PAYLOAD — capture request body (default false)'),
      ignore_queries: z.boolean().optional().describe('NIGHTWATCH_IGNORE_QUERIES — exclude database queries'),
      ignore_cache_events: z.boolean().optional().describe('NIGHTWATCH_IGNORE_CACHE_EVENTS — exclude cache events'),
      ignore_mail: z.boolean().optional().describe('NIGHTWATCH_IGNORE_MAIL — exclude mail events'),
      ignore_notifications: z.boolean().optional().describe('NIGHTWATCH_IGNORE_NOTIFICATIONS — exclude notifications'),
      ignore_outgoing_requests: z.boolean().optional().describe('NIGHTWATCH_IGNORE_OUTGOING_REQUESTS — exclude outgoing HTTP requests'),
      log_level: z.string().optional().describe('NIGHTWATCH_LOG_LEVEL — minimum level to capture (error/warning/info/debug)'),
      ingest_uri: z.string().optional().describe('NIGHTWATCH_INGEST_URI — agent address:port (default 127.0.0.1:2407)'),
      server_name: z.string().optional().describe('NIGHTWATCH_SERVER — server label shown in dashboard (default: hostname)'),
    },
    async ({ cwd: _cwd, token, log_channel, request_sample_rate, command_sample_rate,
             scheduled_task_sample_rate, exception_sample_rate,
             capture_exception_source_code, capture_request_payload,
             ignore_queries, ignore_cache_events, ignore_mail,
             ignore_notifications, ignore_outgoing_requests,
             log_level, ingest_uri, server_name }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        const changed: string[] = [];

        const setStr = (key: string, val: string | undefined) => {
          if (val !== undefined) { setEnvValue(cwd, key, val); changed.push(`${key}=${val}`); }
        };
        const setNum = (key: string, val: number | undefined) => {
          if (val !== undefined) { setEnvValue(cwd, key, String(val)); changed.push(`${key}=${val}`); }
        };
        const setBool = (key: string, val: boolean | undefined) => {
          if (val !== undefined) { setEnvValue(cwd, key, val ? 'true' : 'false'); changed.push(`${key}=${val}`); }
        };

        setStr('NIGHTWATCH_TOKEN', token);
        setStr('LOG_CHANNEL', log_channel);
        setNum('NIGHTWATCH_REQUEST_SAMPLE_RATE', request_sample_rate);
        setNum('NIGHTWATCH_COMMAND_SAMPLE_RATE', command_sample_rate);
        setNum('NIGHTWATCH_SCHEDULED_TASK_SAMPLE_RATE', scheduled_task_sample_rate);
        setNum('NIGHTWATCH_EXCEPTION_SAMPLE_RATE', exception_sample_rate);
        setBool('NIGHTWATCH_CAPTURE_EXCEPTION_SOURCE_CODE', capture_exception_source_code);
        setBool('NIGHTWATCH_CAPTURE_REQUEST_PAYLOAD', capture_request_payload);
        setBool('NIGHTWATCH_IGNORE_QUERIES', ignore_queries);
        setBool('NIGHTWATCH_IGNORE_CACHE_EVENTS', ignore_cache_events);
        setBool('NIGHTWATCH_IGNORE_MAIL', ignore_mail);
        setBool('NIGHTWATCH_IGNORE_NOTIFICATIONS', ignore_notifications);
        setBool('NIGHTWATCH_IGNORE_OUTGOING_REQUESTS', ignore_outgoing_requests);
        setStr('NIGHTWATCH_LOG_LEVEL', log_level);
        setStr('NIGHTWATCH_INGEST_URI', ingest_uri);
        setStr('NIGHTWATCH_SERVER', server_name);

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
    'Start the Laravel Nightwatch agent in the background (php artisan nightwatch:agent). The agent must run continuously to buffer and forward events to nightwatch.laravel.com. Listens on port 2407 by default.',
    {
      cwd: z.string().optional().describe('Laravel project root'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);
      try {
        if (!isInstalled(cwd)) {
          return errorResult('Nightwatch is not installed. Run nightwatch_install first.');
        }
        const artisan = path.join(cwd, 'artisan');
        const pid = runner.phpDetached([artisan, 'nightwatch:agent'], cwd);

        return textResult([
          `Nightwatch agent started (PID: ${pid}).`,
          '',
          'The agent runs in the background on 127.0.0.1:2407',
          'and forwards captured events to nightwatch.laravel.com.',
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
}
