import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';

export function registerComposerTools(server: McpServer, runner: CliRunner): void {

  server.tool('composer_require', 'Add packages to a project (composer require)', {
    packages: z.string().describe('Package(s) to require e.g. "laravel/pint" or "spatie/laravel-permission:^6.0 livewire/livewire"'),
    dev: z.boolean().optional().describe('Install as dev dependency (--dev)'),
    no_interaction: z.boolean().optional().default(true).describe('Non-interactive mode'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ packages, dev, no_interaction, cwd }) => {
    try {
      const args = ['require', ...packages.split(/\s+/).filter(Boolean)];
      if (dev) args.push('--dev');
      if (no_interaction) args.push('--no-interaction');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'Packages required.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_remove', 'Remove packages from a project (composer remove)', {
    packages: z.string().describe('Package(s) to remove e.g. "laravel/pint" or "vendor/a vendor/b"'),
    dev: z.boolean().optional().describe('Remove from dev dependencies only'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ packages, dev, cwd }) => {
    try {
      const args = ['remove', ...packages.split(/\s+/).filter(Boolean)];
      if (dev) args.push('--dev');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'Packages removed.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_install', 'Install dependencies from composer.lock (composer install)', {
    no_dev: z.boolean().optional().describe('Skip dev dependencies'),
    no_scripts: z.boolean().optional().describe('Skip post-install scripts'),
    optimize: z.boolean().optional().describe('Optimize autoloader (--classmap-authoritative)'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ no_dev, no_scripts, optimize, cwd }) => {
    try {
      const args = ['install', '--no-interaction'];
      if (no_dev) args.push('--no-dev');
      if (no_scripts) args.push('--no-scripts');
      if (optimize) args.push('--classmap-authoritative');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'Dependencies installed.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_update', 'Update packages to latest compatible versions (composer update)', {
    packages: z.string().optional().describe('Specific package(s) to update e.g. "laravel/framework" (omit for all)'),
    no_dev: z.boolean().optional().describe('Skip dev dependencies'),
    no_scripts: z.boolean().optional().describe('Skip post-update scripts'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ packages, no_dev, no_scripts, cwd }) => {
    try {
      const args = ['update', '--no-interaction'];
      if (packages) args.push(...packages.split(/\s+/).filter(Boolean));
      if (no_dev) args.push('--no-dev');
      if (no_scripts) args.push('--no-scripts');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'Packages updated.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_outdated', 'List packages with available updates (composer outdated)', {
    direct: z.boolean().optional().describe('Show only directly required packages'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ direct, cwd }) => {
    try {
      const args = ['outdated', '--no-interaction', '--format=text'];
      if (direct) args.push('--direct');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'All packages are up to date.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_show', 'Show installed packages and their details (composer show)', {
    package: z.string().optional().describe('Specific package name for detailed info e.g. "laravel/framework"'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ package: pkg, cwd }) => {
    try {
      const args = ['show', '--no-interaction'];
      if (pkg) args.push(pkg);
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'No packages found.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_dump_autoload', 'Regenerate the Composer autoloader (composer dump-autoload)', {
    optimize: z.boolean().optional().describe('Optimize with classmap-authoritative'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ optimize, cwd }) => {
    try {
      const args = ['dump-autoload'];
      if (optimize) args.push('--classmap-authoritative');
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'Autoloader regenerated.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_validate', 'Validate composer.json and composer.lock (composer validate)', {
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ cwd }) => {
    try {
      const result = runner.composer(['validate', '--no-interaction'], cwd);
      return textResult(result.stdout || result.stderr || 'composer.json is valid.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_search', 'Search for packages on Packagist (composer search)', {
    query: z.string().describe('Search term e.g. "laravel excel"'),
    cwd: z.string().optional().describe('Project directory (optional)'),
  }, async ({ query, cwd }) => {
    try {
      const args = ['search', '--no-interaction', ...query.split(/\s+/).filter(Boolean)];
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'No results found.');
    } catch (e) { return errorResult(e); }
  });

  server.tool('composer_scripts', 'List or run Composer scripts defined in composer.json', {
    run: z.string().optional().describe('Script name to run e.g. "test", "lint" (omit to list all scripts)'),
    cwd: z.string().describe('Project directory containing composer.json'),
  }, async ({ run, cwd }) => {
    try {
      const args = run ? ['run-script', run, '--no-interaction'] : ['run-script', '--list'];
      const result = runner.composer(args, cwd);
      return textResult(result.stdout || result.stderr || 'No scripts defined.');
    } catch (e) { return errorResult(e); }
  });
}
