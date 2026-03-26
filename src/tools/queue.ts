import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerQueueTools(server: McpServer, runner: CliRunner): void {

  // ── Failed Jobs ────────────────────────────────────────────────────────────

  server.tool('queue_failed',
    'List all failed queue jobs (php artisan queue:failed)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:failed'], cwd);
        return textResult(result.stdout || result.stderr || 'No failed jobs.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_retry',
    'Retry one or all failed queue jobs (php artisan queue:retry)',
    {
      id: z.string().optional().describe('Job UUID to retry, or "all" to retry all failed jobs (default: all)'),
      queue: z.string().optional().describe('Retry only jobs from this queue name'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ id, queue, cwd }) => {
      try {
        const args = ['queue:retry', id ?? 'all'];
        if (queue) args.push('--queue=' + queue);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Jobs queued for retry.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_forget',
    'Delete a single failed queue job by ID (php artisan queue:forget)',
    {
      id: z.string().describe('Failed job UUID'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ id, cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:forget', id], cwd);
        return textResult(result.stdout || result.stderr || `Failed job ${id} deleted.`);
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_flush',
    'Delete all failed queue jobs (php artisan queue:flush)',
    {
      hours: z.number().optional().describe('Only delete jobs older than N hours'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ hours, cwd }) => {
      try {
        const args = ['queue:flush'];
        if (hours) args.push('--hours=' + hours);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'All failed jobs deleted.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_prune_failed',
    'Prune stale entries from the failed jobs table (php artisan queue:prune-failed)',
    {
      hours: z.number().optional().describe('Delete entries older than N hours (default: 24)'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ hours, cwd }) => {
      try {
        const args = ['queue:prune-failed'];
        if (hours) args.push('--hours=' + hours);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Failed jobs pruned.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Active Queue ───────────────────────────────────────────────────────────

  server.tool('queue_clear',
    'Clear all pending jobs from a queue (php artisan queue:clear)',
    {
      queue: z.string().optional().describe('Queue name to clear (default: "default")'),
      connection: z.string().optional().describe('Connection name e.g. "redis", "database"'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ queue, connection, cwd }) => {
      try {
        const args = ['queue:clear', '--force'];
        if (queue) args.push('--queue=' + queue);
        if (connection) args.push(connection);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Queue cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_restart',
    'Signal all queue workers to restart after current job (php artisan queue:restart)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:restart'], cwd);
        return textResult(result.stdout || result.stderr || 'Queue restart signal sent.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_monitor',
    'Check queue sizes and alert when thresholds are exceeded (php artisan queue:monitor)',
    {
      queues: z.string().describe('Comma-separated queue:max pairs e.g. "default:50,emails:25" or just "default,emails"'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ queues, cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:monitor', queues], cwd);
        return textResult(result.stdout || result.stderr || 'Queue sizes OK.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Migrations ─────────────────────────────────────────────────────────────

  server.tool('queue_failed_table',
    'Create the failed_jobs table migration (php artisan queue:failed-table)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:failed-table'], cwd);
        return textResult(result.stdout || result.stderr || 'failed_jobs migration created.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_batches_table',
    'Create the job_batches table migration for Bus::batch() support (php artisan queue:batches-table)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'queue:batches-table'], cwd);
        return textResult(result.stdout || result.stderr || 'job_batches migration created.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('queue_prune_batches',
    'Prune stale entries from the job_batches table (php artisan queue:prune-batches)',
    {
      hours: z.number().optional().describe('Delete batches older than N hours (default: 24)'),
      unfinished: z.number().optional().describe('Delete unfinished batches older than N hours'),
      cancelled: z.number().optional().describe('Delete cancelled batches older than N hours'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ hours, unfinished, cancelled, cwd }) => {
      try {
        const args = ['queue:prune-batches'];
        if (hours) args.push('--hours=' + hours);
        if (unfinished) args.push('--unfinished=' + unfinished);
        if (cancelled) args.push('--cancelled=' + cancelled);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Job batches pruned.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Schedule ───────────────────────────────────────────────────────────────

  server.tool('schedule_list',
    'List all scheduled tasks with next run time (php artisan schedule:list)',
    {
      cwd: z.string().describe('Laravel project root directory'),
      timezone: z.string().optional().describe('Timezone for displaying run times e.g. "UTC", "Europe/London"'),
      json: z.boolean().optional().describe('Output as JSON'),
    },
    async ({ cwd, timezone, json }) => {
      try {
        const args = ['schedule:list'];
        if (timezone) args.push('--timezone=' + timezone);
        if (json) args.push('--json');
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'No scheduled tasks defined.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('schedule_run',
    'Run due scheduled tasks immediately (php artisan schedule:run)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'schedule:run'], cwd);
        return textResult(result.stdout || result.stderr || 'Schedule run complete.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('schedule_test',
    'Test a scheduled command by name (php artisan schedule:test)',
    {
      name: z.string().optional().describe('Command to test e.g. "emails:send" (interactive selector if omitted)'),
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ name, cwd }) => {
      try {
        const args = ['schedule:test', '--no-interaction'];
        if (name) args.push('--name=' + name);
        const result = runner.php(['artisan', ...args], cwd);
        return textResult(result.stdout || result.stderr || 'Schedule test complete.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('schedule_clear_cache',
    'Clear all schedule mutex cache locks (php artisan schedule:clear-cache)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'schedule:clear-cache'], cwd);
        return textResult(result.stdout || result.stderr || 'Schedule cache cleared.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Horizon (optional package) ─────────────────────────────────────────────

  server.tool('horizon_status',
    'Show Laravel Horizon status and queue metrics (requires laravel/horizon)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'horizon:status'], cwd);
        return textResult(result.stdout || result.stderr || 'Horizon not installed or not running.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('horizon_pause',
    'Pause Horizon workers (php artisan horizon:pause)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'horizon:pause'], cwd);
        return textResult(result.stdout || result.stderr || 'Horizon paused.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('horizon_continue',
    'Resume paused Horizon workers (php artisan horizon:continue)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'horizon:continue'], cwd);
        return textResult(result.stdout || result.stderr || 'Horizon resumed.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('horizon_terminate',
    'Terminate Horizon master process after current jobs finish (php artisan horizon:terminate)',
    {
      cwd: z.string().describe('Laravel project root directory'),
    },
    async ({ cwd }) => {
      try {
        const result = runner.php(['artisan', 'horizon:terminate'], cwd);
        return textResult(result.stdout || result.stderr || 'Horizon terminating.');
      } catch (e) { return errorResult(e); }
    }
  );
}
