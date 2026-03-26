import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerDevtoolsTools(server: McpServer, runner: CliRunner): void {
  server.tool('run_composer', 'Run a Composer command using Herd\'s isolated PHP', {
    args: z.string().describe('Composer arguments e.g. "install", "require laravel/pint --dev"'),
    cwd: z.string().optional().describe('Project directory'),
  }, async ({ args, cwd }) => {
    try {
      const argList = args.split(' ').filter(Boolean);
      const result = runner.composer(argList, cwd);
      return textResult(result.stdout || result.stderr || 'Done.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('create_laravel_project', 'Create a new Laravel project using the Laravel installer', {
    name: z.string().describe('Project name (becomes the directory name)'),
    cwd: z.string().optional().describe('Parent directory to create project in'),
    flags: z.string().optional().describe('Additional flags e.g. "--git --pest"'),
  }, async ({ name, cwd, flags }) => {
    try {
      const args = ['new', name, ...(flags ? flags.split(' ').filter(Boolean) : [])];
      const result = runner.laravel(args, cwd);
      runner.assertSuccess(result, 'create_laravel_project');
      return textResult(result.stdout || `Project "${name}" created.`);
    } catch (e) { return errorResult(e); }
  });

  server.tool('edit_php_ini', 'Open php.ini for a PHP version in the configured IDE', {
    version: z.string().optional().describe('PHP version e.g. "8.4" (omit for current version)'),
  }, async ({ version }) => {
    try {
      const args = version ? ['ini', version] : ['ini'];
      const result = runner.herd(args);
      runner.assertSuccess(result, 'edit_php_ini');
      return textResult(result.stdout || 'php.ini opened in IDE.');
    } catch (e) { return errorResult(e); }
  });
}
