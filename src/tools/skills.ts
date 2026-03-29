/**
 * Laravel Skills directory tools — skills.laravel.cloud
 *
 * An open directory of reusable AI agent skills for Laravel and PHP.
 * Skills are installed via `php artisan boost:add-skill <owner/repo> --skill <name>`
 * and require Laravel Boost (laravel/boost) to be installed in the project.
 *
 * API: https://skills.laravel.cloud/api/v1/skills
 * Docs: https://skills.laravel.cloud
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import type { CliRunner } from '../cli-runner';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd, NO_PROJECT_MSG } from '../active-project.js';

const API_BASE = 'https://skills.laravel.cloud/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SkillAuthor {
  name: string;
  github_username: string;
  avatar_url: string;
}

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  install_command: string;
  source_url: string;
  is_official: boolean;
  is_featured: boolean;
  install_count: number;
  tags: string[];
  author: SkillAuthor;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: Skill[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    next: string | null;
    prev: string | null;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

async function apiGet(params: Record<string, string | number>): Promise<ApiResponse> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const url = `${API_BASE}/skills${qs ? '?' + qs : ''}`;
  const res = await (globalThis.fetch as typeof fetch)(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`skills.laravel.cloud API error: HTTP ${res.status}`);
  return res.json() as Promise<ApiResponse>;
}

function buildMarkdownTable(skills: Skill[]): string {
  const rows = skills.map((s, i) => {
    const desc = s.description.length > 80
      ? s.description.slice(0, 77) + '...'
      : s.description;
    return `| ${i + 1} | **${s.name}** | ${s.author.name} | ${fmtCount(s.install_count)} | ${desc} |`;
  });
  return [
    '| # | Skill | Author | Installs | Description |',
    '|---|-------|--------|----------|-------------|',
    ...rows,
  ].join('\n');
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerSkillsTools(server: McpServer, runner: CliRunner): void {

  // ── skills_browse ─────────────────────────────────────────────────────────

  server.tool(
    'skills_browse',
    'Browse the Laravel Skills directory (skills.laravel.cloud) — 149+ reusable AI agent skills for Laravel and PHP. Returns a paginated list sorted by most installed or newest. Skills are installed into your project with boost:add-skill.',
    {
      sort:  z.enum(['installs', 'newest']).optional().describe('Sort order: "installs" (most popular, default) or "newest"'),
      page:  z.number().int().min(1).optional().describe('Page number (12 skills per page, default: 1)'),
    },
    async ({ sort = 'installs', page = 1 }) => {
      try {
        const data = await apiGet({ sort, page });
        const { meta } = data;

        const table = buildMarkdownTable(data.data);
        const lines = [
          `## Laravel Skills Directory — Page ${meta.current_page} of ${meta.last_page} (${meta.total} total skills)`,
          `Sorted by: ${sort === 'installs' ? 'Most Installed' : 'Newest'} | ${meta.per_page} per page`,
          '',
          table,
          '',
          meta.current_page < meta.last_page
            ? `Next page: skills_browse page=${meta.current_page + 1}`
            : '(last page)',
          '',
          'To install a skill: skills_install slug="<skill-name>"',
          'To search: skills_search query="<keyword>"',
        ];

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── skills_search ─────────────────────────────────────────────────────────

  server.tool(
    'skills_search',
    'Search the Laravel Skills directory for skills matching a keyword (name, description, tag). Returns matching skills with install commands ready to use.',
    {
      query: z.string().describe('Search keyword, e.g. "eloquent", "security", "tdd", "pest", "docker"'),
      page:  z.number().int().min(1).optional().describe('Page number (default: 1)'),
    },
    async ({ query, page = 1 }) => {
      try {
        const data = await apiGet({ q: query, page });
        const { meta } = data;

        if (data.data.length === 0) {
          return textResult(`No skills found for "${query}". Try a broader term or browse all skills with skills_browse.`);
        }

        const table = buildMarkdownTable(data.data);
        const lines = [
          `## Skills matching "${query}" — Page ${meta.current_page} of ${meta.last_page} (${meta.total} results)`,
          '',
          table,
          '',
          meta.current_page < meta.last_page
            ? `Next page: skills_search query="${query}" page=${meta.current_page + 1}`
            : '',
          '',
          'To install: skills_install slug="<skill-name>"',
        ];

        return textResult(lines.filter(l => l !== undefined).join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── skills_info ───────────────────────────────────────────────────────────

  server.tool(
    'skills_info',
    'Get full details for a specific skill from skills.laravel.cloud — description, install command, source URL, author, and install count.',
    {
      slug: z.string().describe('Skill slug, e.g. "laravel-specialist", "php-pro", "eloquent-best-practices"'),
    },
    async ({ slug }) => {
      try {
        // Search by name for exact match
        const data = await apiGet({ q: slug, sort: 'installs' });
        const skill = data.data.find(
          s => s.slug === slug || s.name === slug
        );

        if (!skill) {
          return errorResult(
            `Skill "${slug}" not found. Use skills_search or skills_browse to discover available skills.`
          );
        }

        const lines = [
          `## ${skill.name}`,
          `by @${skill.author.github_username} | ${fmtCount(skill.install_count)} installs`,
          '',
          `**Description:**`,
          skill.description,
          '',
          `**Install command:**`,
          `\`\`\``,
          skill.install_command,
          `\`\`\``,
          '',
          `**Source:** ${skill.source_url}`,
          `**Tags:** ${skill.tags.join(', ') || 'none'}`,
          `**Added:** ${skill.created_at.split('T')[0]}`,
          '',
          `Run: skills_install slug="${skill.slug}" to install this skill in your project.`,
        ];

        return textResult(lines.join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── skills_install ────────────────────────────────────────────────────────

  server.tool(
    'skills_install',
    'Install a skill from skills.laravel.cloud into a Laravel project via `php artisan boost:add-skill`. Requires Laravel Boost (run boost_install first if not set up).',
    {
      cwd:  z.string().optional().describe('Laravel project root — defaults to active project'),
      slug: z.string().describe('Skill slug from skills.laravel.cloud, e.g. "laravel-specialist", "php-pro", "eloquent-best-practices"'),
    },
    async ({ cwd: _cwd, slug }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);

      try {
        // Resolve the install_command from the API
        const data = await apiGet({ q: slug, sort: 'installs' });
        const skill = data.data.find(s => s.slug === slug || s.name === slug);

        if (!skill) {
          return errorResult(
            `Skill "${slug}" not found on skills.laravel.cloud.\n` +
            `Use skills_search to find the correct slug.`
          );
        }

        // Parse install_command: "php artisan boost:add-skill <owner/repo> --skill <name>"
        // We extract the args after "php artisan"
        const cmdParts = skill.install_command
          .replace(/^php\s+artisan\s+/, '')
          .split(/\s+/);
        // cmdParts[0] = "boost:add-skill", cmdParts[1] = "owner/repo", cmdParts[2] = "--skill", cmdParts[3] = "name"

        const result = runner.php(['artisan', ...cmdParts], cwd);
        const output = result.stdout || result.stderr || '(no output)';

        if (result.exitCode !== 0) {
          // Boost may not be installed
          if (output.includes('not found') || output.includes('boost:add-skill')) {
            return errorResult(
              `Command failed — is Laravel Boost installed?\n` +
              `Run boost_install first, then retry.\n\n` +
              `Error: ${output}`
            );
          }
          return errorResult(`Install failed:\n${output}`);
        }

        return textResult([
          `✓ Skill installed: ${skill.name}`,
          `  Author: @${skill.author.github_username}`,
          `  Source: ${skill.source_url}`,
          '',
          output,
          '',
          `The skill's guidelines are now active in your project's .ai/ directory.`,
          `Use skills_installed to see all installed skills.`,
        ].join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ── skills_installed ──────────────────────────────────────────────────────

  server.tool(
    'skills_installed',
    'List AI agent skills installed in a Laravel project via Laravel Boost. Shows all skill files in .ai/skills/ and .ai/guidelines/ directories.',
    {
      cwd: z.string().optional().describe('Laravel project root — defaults to active project'),
    },
    async ({ cwd: _cwd }) => {
      const cwd = resolveCwd(_cwd);
      if (!cwd) return errorResult(NO_PROJECT_MSG);

      try {
        const aiDir = path.join(cwd, '.ai');
        if (!fs.existsSync(aiDir)) {
          return textResult(
            'No .ai/ directory found. Run boost_install first to set up Laravel Boost.'
          );
        }

        const sections: string[] = [];

        // Skills directory
        const skillsDir = path.join(aiDir, 'skills');
        if (fs.existsSync(skillsDir)) {
          const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name);
          if (skillDirs.length > 0) {
            sections.push(`## Installed Skills (${skillDirs.length})\n` +
              skillDirs.map(d => `  • ${d}`).join('\n'));
          } else {
            sections.push('## Installed Skills\n  (none — use skills_install to add skills)');
          }
        } else {
          sections.push('## Installed Skills\n  (no .ai/skills/ directory)');
        }

        // Guidelines directory
        const guidelinesDir = path.join(aiDir, 'guidelines');
        if (fs.existsSync(guidelinesDir)) {
          const guideFiles = walkDir(guidelinesDir)
            .map(f => f.replace(guidelinesDir + path.sep, '').replace(guidelinesDir + '/', ''));
          if (guideFiles.length > 0) {
            sections.push(`\n## Custom Guidelines (${guideFiles.length})\n` +
              guideFiles.map(f => `  • ${f}`).join('\n'));
          }
        }

        if (sections.length === 0) {
          return textResult('No skills or guidelines found in .ai/');
        }

        return textResult([
          `Project: ${cwd}`,
          '',
          ...sections,
          '',
          'Browse more skills: skills_browse',
          'Install a skill:   skills_install slug="<skill-name>"',
        ].join('\n'));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else results.push(full);
  }
  return results;
}
