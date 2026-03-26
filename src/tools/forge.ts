import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerForgeTools(server: McpServer, runner: CliRunner): void {

  // ── Installation ───────────────────────────────────────────────────────────

  server.tool('forge_install',
    'Install the Laravel Forge CLI globally (composer global require laravel/forge-cli)',
    {},
    async () => {
      try {
        const result = runner.composer(['global', 'require', 'laravel/forge-cli', '--no-interaction']);
        return textResult(
          (result.stdout || result.stderr || 'Laravel Forge CLI installed.') +
          '\n\nRun forge_login to authenticate with your Forge account.'
        );
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Authentication ─────────────────────────────────────────────────────────

  server.tool('forge_login',
    'Authenticate the Forge CLI with your Laravel Forge account (forge login)',
    {
      token: z.string().describe('Forge API token from forge.laravel.com/user/profile'),
    },
    async ({ token }) => {
      try {
        // forge login accepts token via stdin or --token flag
        const result = runner.forge(['login', '--token=' + token]);
        return textResult(result.stdout || result.stderr || 'Logged in to Laravel Forge.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Servers ────────────────────────────────────────────────────────────────

  server.tool('forge_server_list',
    'List all servers on your Forge account (forge server:list)',
    {},
    async () => {
      try {
        const result = runner.forge(['server:list']);
        return textResult(result.stdout || result.stderr || 'No servers found.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_server_current',
    'Show the currently active Forge server (forge server:current)',
    {},
    async () => {
      try {
        const result = runner.forge(['server:current']);
        return textResult(result.stdout || result.stderr || 'No active server.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_server_switch',
    'Switch the active Forge server (forge server:switch)',
    {
      server_id: z.string().optional().describe('Server ID to switch to (interactive selection if omitted)'),
    },
    async ({ server_id }) => {
      try {
        const args = server_id ? ['server:switch', server_id] : ['server:switch'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'Server switched.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_ssh',
    'Show the SSH command to connect to a Forge server (forge ssh)',
    {
      site: z.string().optional().describe('Site name (uses current server\'s first site if omitted)'),
    },
    async ({ site }) => {
      try {
        const args = site ? ['ssh', site] : ['ssh'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'SSH info retrieved.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Sites ──────────────────────────────────────────────────────────────────

  server.tool('forge_site_list',
    'List all sites on the active Forge server (forge site:list)',
    {},
    async () => {
      try {
        const result = runner.forge(['site:list']);
        return textResult(result.stdout || result.stderr || 'No sites found.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_site_logs',
    'View recent logs for a Forge site (forge site:logs)',
    {
      site: z.string().optional().describe('Site name (interactive selection if omitted)'),
    },
    async ({ site }) => {
      try {
        const args = site ? ['site:logs', site] : ['site:logs'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'No logs.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_command',
    'Run a shell command on a Forge site (forge command)',
    {
      site: z.string().optional().describe('Site name (interactive selection if omitted)'),
      command: z.string().optional().describe('Command to run (e.g. "php artisan migrate")'),
    },
    async ({ site, command }) => {
      try {
        const args: string[] = ['command'];
        if (site) args.push(site);
        if (command) args.push('--command=' + command);
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'Command executed.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Environment ────────────────────────────────────────────────────────────

  server.tool('forge_env_pull',
    'Pull the .env file from a Forge site (forge env:pull)',
    {
      site: z.string().optional().describe('Site name (interactive selection if omitted)'),
      filename: z.string().optional().describe('Local filename to save as (default: .env)'),
      cwd: z.string().optional().describe('Directory to save the file in'),
    },
    async ({ site, filename, cwd }) => {
      try {
        const args: string[] = ['env:pull'];
        if (site) args.push(site);
        if (filename) args.push(filename);
        const result = runner.forge(args, cwd);
        return textResult(result.stdout || result.stderr || '.env pulled.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_env_push',
    'Push the local .env file to a Forge site (forge env:push)',
    {
      site: z.string().optional().describe('Site name (interactive selection if omitted)'),
      filename: z.string().optional().describe('Local filename to push (default: .env)'),
      cwd: z.string().optional().describe('Directory containing the .env file'),
    },
    async ({ site, filename, cwd }) => {
      try {
        const args: string[] = ['env:push'];
        if (site) args.push(site);
        if (filename) args.push(filename);
        const result = runner.forge(args, cwd);
        return textResult(result.stdout || result.stderr || '.env pushed.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Deployments ────────────────────────────────────────────────────────────

  server.tool('forge_deploy',
    'Trigger a deployment for a Forge site (forge deploy)',
    {
      site: z.string().optional().describe('Site name (interactive selection if omitted)'),
    },
    async ({ site }) => {
      try {
        const args = site ? ['deploy', site] : ['deploy'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'Deployment triggered.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_deploy_logs',
    'View deployment logs for a Forge site (forge deploy:logs)',
    {
      deployment_id: z.string().optional().describe('Deployment ID (latest if omitted)'),
    },
    async ({ deployment_id }) => {
      try {
        const args = deployment_id ? ['deploy:logs', deployment_id] : ['deploy:logs'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'No deployment logs.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_deploy_monitor',
    'Monitor ongoing deployments on a Forge server (forge deploy:monitor)',
    {},
    async () => {
      try {
        const result = runner.forge(['deploy:monitor']);
        return textResult(result.stdout || result.stderr || 'No active deployments.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Daemons ────────────────────────────────────────────────────────────────

  server.tool('forge_daemon_status',
    'Show status of all Supervisor daemons on the active Forge server (forge daemon:status)',
    {},
    async () => {
      try {
        const result = runner.forge(['daemon:status']);
        return textResult(result.stdout || result.stderr || 'No daemons found.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_daemon_restart',
    'Restart a Supervisor daemon on the active Forge server (forge daemon:restart)',
    {
      daemon_id: z.string().optional().describe('Daemon ID (interactive selection if omitted)'),
    },
    async ({ daemon_id }) => {
      try {
        const args = daemon_id ? ['daemon:restart', daemon_id] : ['daemon:restart'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'Daemon restarted.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_daemon_logs',
    'View daemon logs on the active Forge server (forge daemon:logs)',
    {
      daemon_id: z.string().optional().describe('Daemon ID (interactive selection if omitted)'),
    },
    async ({ daemon_id }) => {
      try {
        const args = daemon_id ? ['daemon:logs', daemon_id] : ['daemon:logs'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'No daemon logs.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Database ───────────────────────────────────────────────────────────────

  server.tool('forge_database_status',
    'Show database service status on the active Forge server (forge database:status)',
    {},
    async () => {
      try {
        const result = runner.forge(['database:status']);
        return textResult(result.stdout || result.stderr || 'Database status retrieved.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_database_restart',
    'Restart the database service on the active Forge server (forge database:restart)',
    {},
    async () => {
      try {
        const result = runner.forge(['database:restart']);
        return textResult(result.stdout || result.stderr || 'Database restarted.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_database_logs',
    'View database logs on the active Forge server (forge database:logs)',
    {},
    async () => {
      try {
        const result = runner.forge(['database:logs']);
        return textResult(result.stdout || result.stderr || 'No database logs.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Nginx ──────────────────────────────────────────────────────────────────

  server.tool('forge_nginx_status',
    'Show Nginx status on the active Forge server (forge nginx:status)',
    {},
    async () => {
      try {
        const result = runner.forge(['nginx:status']);
        return textResult(result.stdout || result.stderr || 'Nginx status retrieved.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_nginx_restart',
    'Restart Nginx on the active Forge server (forge nginx:restart)',
    {},
    async () => {
      try {
        const result = runner.forge(['nginx:restart']);
        return textResult(result.stdout || result.stderr || 'Nginx restarted.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_nginx_logs',
    'View Nginx logs on the active Forge server (forge nginx:logs)',
    {
      type: z.enum(['access', 'error']).optional().describe('Log type: access or error (default: error)'),
    },
    async ({ type }) => {
      try {
        const args = type ? ['nginx:logs', type] : ['nginx:logs'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'No Nginx logs.');
      } catch (e) { return errorResult(e); }
    }
  );

  // ── PHP ────────────────────────────────────────────────────────────────────

  server.tool('forge_php_status',
    'Show PHP-FPM status on the active Forge server (forge php:status)',
    {
      version: z.string().optional().describe('PHP version e.g. "8.3" (default PHP version if omitted)'),
    },
    async ({ version }) => {
      try {
        const args = version ? ['php:status', version] : ['php:status'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'PHP status retrieved.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_php_restart',
    'Restart PHP-FPM on the active Forge server (forge php:restart)',
    {
      version: z.string().optional().describe('PHP version e.g. "8.3" (default PHP version if omitted)'),
    },
    async ({ version }) => {
      try {
        const args = version ? ['php:restart', version] : ['php:restart'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'PHP-FPM restarted.');
      } catch (e) { return errorResult(e); }
    }
  );

  server.tool('forge_php_logs',
    'View PHP-FPM logs on the active Forge server (forge php:logs)',
    {
      version: z.string().optional().describe('PHP version e.g. "8.3" (default PHP version if omitted)'),
    },
    async ({ version }) => {
      try {
        const args = version ? ['php:logs', version] : ['php:logs'];
        const result = runner.forge(args);
        return textResult(result.stdout || result.stderr || 'No PHP logs.');
      } catch (e) { return errorResult(e); }
    }
  );
}
