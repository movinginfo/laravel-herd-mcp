import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerDebugTools(server: McpServer, runner: CliRunner): void {
  server.tool('run_php_with_debug', 'Execute a PHP script with Xdebug enabled (sets XDEBUG_SESSION=1)', {
    script: z.string().describe('PHP script path to execute'),
    cwd: z.string().optional().describe('Working directory'),
  }, async ({ script, cwd }) => {
    try {
      const result = runner.phpWithDebug(script, cwd);
      return textResult(result.stdout || result.stderr || 'No output.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('run_php_with_coverage', 'Execute a PHP script with Xdebug coverage mode (sets XDEBUG_MODE=coverage)', {
    script: z.string().describe('PHP script path to execute with coverage'),
    cwd: z.string().optional().describe('Working directory'),
  }, async ({ script, cwd }) => {
    try {
      const result = runner.phpWithCoverage(script, cwd);
      return textResult(result.stdout || result.stderr || 'No output.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('run_tinker', 'Launch a Laravel Tinker REPL session for a site', {
    cwd: z.string().describe('Site directory path'),
  }, async ({ cwd }) => {
    try {
      const result = runner.herd(['tinker'], cwd);
      return textResult(result.stdout || result.stderr || 'Tinker session ended.');
    } catch (e) { return errorResult(e); }
  });
}
