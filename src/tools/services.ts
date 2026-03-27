import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerServicesTools(server: McpServer, runner: CliRunner): void {

  server.tool('services_list', 'List all installed Herd services (MySQL, Redis, etc.) — requires Herd Pro', {}, async () => {
    try {
      const result = runner.herd(['services:list']);
      const out = result.stdout || result.stderr;
      return textResult(out ? runner.toMarkdownTable(out) : 'No services installed.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_available', 'List all available Herd service types that can be created — requires Herd Pro', {}, async () => {
    try {
      const result = runner.herd(['services:available']);
      const out = result.stdout || result.stderr;
      return textResult(out ? runner.toMarkdownTable(out) : 'No service types available.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_versions', 'List available versions for a service type (e.g. mysql, redis, postgresql) — requires Herd Pro', {
    type: z.string().describe('Service type e.g. "mysql", "redis", "postgresql", "minio"'),
  }, async ({ type }) => {
    try {
      const result = runner.herd(['services:versions', type]);
      const out = result.stdout || result.stderr;
      return textResult(out ? runner.toMarkdownTable(out) : `No versions found for ${type}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_create', 'Create a new Herd service instance — requires Herd Pro', {
    type: z.string().describe('Service type e.g. "mysql", "redis", "postgresql", "minio"'),
    name: z.string().optional().describe('Instance name e.g. "mysql84" (defaults to type)'),
    port: z.number().optional().describe('Custom port number'),
    version: z.string().optional().describe('Version e.g. "8.4", "7.4"'),
  }, async ({ type, name, port, version }) => {
    try {
      const args = ['services:create', '--no-interaction'];
      if (name) args.push('--name', name);
      if (port) args.push('--port', String(port));
      if (version) args.push('--version', version);
      args.push(type);
      const result = runner.herd(args);
      return textResult(result.stdout || result.stderr || `Service "${name ?? type}" created.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_start', 'Start an installed Herd service — requires Herd Pro', {
    name: z.string().describe('Service name to start e.g. "mysql84", "redis"'),
  }, async ({ name }) => {
    try {
      const result = runner.herd(['services:start', name]);
      return textResult(result.stdout || result.stderr || `Service "${name}" started.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_stop', 'Stop a running Herd service — requires Herd Pro', {
    name: z.string().describe('Service name to stop e.g. "mysql84", "redis"'),
  }, async ({ name }) => {
    try {
      const result = runner.herd(['services:stop', name]);
      return textResult(result.stdout || result.stderr || `Service "${name}" stopped.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_clone', 'Clone an existing Herd service instance with its data — requires Herd Pro', {
    name: z.string().describe('Service instance name to clone'),
  }, async ({ name }) => {
    try {
      const result = runner.herd(['services:clone', name]);
      return textResult(result.stdout || result.stderr || `Service "${name}" cloned.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('services_delete', 'Delete a Herd service instance and ALL its data — requires Herd Pro', {
    name: z.string().describe('Service instance name to delete'),
  }, async ({ name }) => {
    try {
      const result = runner.herd(['services:delete', '--no-interaction', name]);
      return textResult(result.stdout || result.stderr || `Service "${name}" deleted.`);
    } catch (e) { return errorResult(e); }
  });
}
