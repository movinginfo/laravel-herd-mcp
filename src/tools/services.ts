import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HerdHttpClient } from '../http-client';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerServicesTools(server: McpServer, client: HerdHttpClient, runner: CliRunner): void {
  server.tool('list_available_service_types', 'List available Herd service types (MySQL, Redis, etc.) and installed instances', {}, async () => {
    try {
      const result = runner.herd(['services:available']);
      return textResult(result.stdout || 'No services available.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('get_service_versions', 'List available versions for a Herd service type', {
    type: z.string().describe('Service type e.g. "mysql", "redis", "postgresql"'),
  }, async ({ type }) => {
    try {
      const result = runner.herd(['services:versions', type]);
      return textResult(result.stdout || `No versions found for ${type}.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('clone_service', 'Clone a Herd service instance with its data', {
    service: z.string().describe('Service name to clone'),
  }, async ({ service }) => {
    try {
      const result = runner.herd(['services:clone', service]);
      runner.assertSuccess(result, 'clone_service');
      return textResult(result.stdout || `Service "${service}" cloned.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('delete_service', 'Delete a Herd service instance and its data', {
    service: z.string().describe('Service name to delete'),
  }, async ({ service }) => {
    try {
      const result = runner.herd(['services:delete', service]);
      runner.assertSuccess(result, 'delete_service');
      return textResult(result.stdout || `Service "${service}" deleted.`);
    } catch (e) { return errorResult(e); }
  });
}
