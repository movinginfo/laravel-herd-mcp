/**
 * Direct database client tools for MySQL, MariaDB, PostgreSQL, and SQLite.
 *
 * Each tool accepts a `connection` object. Supply `cwd` to auto-read DB_* from
 * the Laravel project's .env, or provide explicit driver/host/port/database/
 * username/password. Explicit values override .env values when both are given.
 *
 * Dependencies:
 *   mysql2   — bundled (pure JS, MySQL + MariaDB)
 *   pg       — bundled (pure JS, PostgreSQL)
 *   better-sqlite3 — optional; install with: npm install -g better-sqlite3
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { textResult, errorResult } from '../tool-result';
import { resolveCwd } from '../active-project.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface DbConfig {
  driver: 'mysql' | 'mariadb' | 'pgsql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

type Row = Record<string, unknown>;

// ── .env parser ──────────────────────────────────────────────────────────────

function parseEnvFile(cwd: string): Record<string, string> {
  const out: Record<string, string> = {};
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// ── Connection resolver ───────────────────────────────────────────────────────

function resolveConfig(conn: {
  cwd?: string;
  driver?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}): DbConfig {
  let cfg: DbConfig = { driver: 'mysql', host: '127.0.0.1', port: 3306, database: '', username: 'root', password: '' };

  const resolvedCwd = resolveCwd(conn.cwd);
  if (resolvedCwd) {
    const env = parseEnvFile(resolvedCwd);
    const d = (env.DB_CONNECTION ?? 'mysql') as DbConfig['driver'];
    const defaultPort = d === 'pgsql' ? 5432 : d === 'sqlite' ? 0 : 3306;
    cfg = {
      driver:   d,
      host:     env.DB_HOST     ?? '127.0.0.1',
      port:     parseInt(env.DB_PORT ?? String(defaultPort), 10) || defaultPort,
      database: env.DB_DATABASE ?? '',
      username: env.DB_USERNAME ?? 'root',
      password: env.DB_PASSWORD ?? '',
    };
  }

  if (conn.driver)             cfg.driver   = conn.driver as DbConfig['driver'];
  if (conn.host)               cfg.host     = conn.host;
  if (conn.port !== undefined) cfg.port     = conn.port;
  if (conn.database)           cfg.database = conn.database;
  if (conn.username)           cfg.username = conn.username;
  if (conn.password !== undefined) cfg.password = conn.password;

  return cfg;
}

// ── Shared Zod schema for connection params ───────────────────────────────────

const connFields = {
  cwd:      z.string().optional().describe('Laravel project root — auto-reads DB_* from .env'),
  driver:   z.enum(['mysql', 'mariadb', 'pgsql', 'sqlite']).optional().describe('Database driver (overrides .env)'),
  host:     z.string().optional().describe('Database host (default: 127.0.0.1)'),
  port:     z.number().optional().describe('Database port (MySQL: 3306, PostgreSQL: 5432)'),
  database: z.string().optional().describe('Database name or absolute SQLite file path'),
  username: z.string().optional().describe('Database username'),
  password: z.string().optional().describe('Database password'),
};

// ── MySQL / MariaDB ──────────────────────────────────────────────────────────

async function mysqlRun(cfg: DbConfig, sql: string, params: unknown[] = []): Promise<Row[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const mysql2 = require('mysql2/promise') as any;
  const conn = await mysql2.createConnection({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database || undefined,
    user: cfg.username,
    password: cfg.password,
    connectTimeout: 15000,
    multipleStatements: false,
  });
  try {
    const [rows] = await conn.execute(sql, params);
    return (Array.isArray(rows) ? rows : [rows]) as Row[];
  } finally {
    await conn.end();
  }
}

// ── PostgreSQL ───────────────────────────────────────────────────────────────

async function pgRun(cfg: DbConfig, sql: string, params: unknown[] = []): Promise<Row[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { Client } = require('pg') as any;
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database || undefined,
    user: cfg.username,
    password: cfg.password,
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    const result = await client.query(sql, params as unknown[]);
    return result.rows as Row[];
  } finally {
    await client.end();
  }
}

// ── SQLite ───────────────────────────────────────────────────────────────────

function sqliteRun(cfg: DbConfig, sql: string): Row[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let Database: new (p: string) => unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Database = require('better-sqlite3') as new (p: string) => unknown;
  } catch {
    throw new Error(
      'better-sqlite3 is not installed. Install it with:\n' +
      '  npm install -g better-sqlite3\n' +
      'Then restart your MCP server.'
    );
  }
  const db = new Database(cfg.database) as {
    prepare(s: string): { all(): Row[]; run(): { changes: number; lastInsertRowid: number } };
    close(): void;
  };
  try {
    const upper = sql.trim().toUpperCase();
    const stmt = db.prepare(sql);
    if (/^(SELECT|WITH|EXPLAIN|PRAGMA|ATTACH)/.test(upper)) {
      return stmt.all();
    }
    const info = stmt.run();
    return [{ affectedRows: info.changes, insertId: info.lastInsertRowid }];
  } finally {
    db.close();
  }
}

// ── Unified executor ─────────────────────────────────────────────────────────

async function runSql(cfg: DbConfig, sql: string, params: unknown[] = []): Promise<Row[]> {
  switch (cfg.driver) {
    case 'mysql':
    case 'mariadb': return mysqlRun(cfg, sql, params);
    case 'pgsql':   return pgRun(cfg, sql, params);
    case 'sqlite':  return sqliteRun(cfg, sql);
    default: throw new Error(`Unsupported driver: ${(cfg as DbConfig).driver}`);
  }
}

// ── CSV formatter ────────────────────────────────────────────────────────────

function toCSV(rows: Row[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerDbClientTools(server: McpServer): void {

  // ── Test connection ────────────────────────────────────────────────────────

  server.tool('sql_connect_test',
    'Test a database connection and return server version, current database, and user info. Supports MySQL, MariaDB, PostgreSQL, SQLite.',
    connFields,
    async (params) => {
      try {
        const cfg = resolveConfig(params);
        if (!cfg.database && cfg.driver !== 'mysql' && cfg.driver !== 'mariadb') {
          return textResult('Warning: no database specified. Provide `database` or `cwd` pointing to a Laravel project.');
        }
        let rows: Row[];
        switch (cfg.driver) {
          case 'mysql':
          case 'mariadb':
            rows = await mysqlRun(cfg, 'SELECT VERSION() AS version, DATABASE() AS current_db, USER() AS db_user, NOW() AS server_time');
            break;
          case 'pgsql':
            rows = await pgRun(cfg, 'SELECT version() AS version, current_database() AS current_db, current_user AS db_user, now() AS server_time');
            break;
          case 'sqlite': {
            const v = sqliteRun(cfg, 'SELECT sqlite_version() AS version');
            rows = [{ ...v[0], driver: 'sqlite', database: cfg.database }];
            break;
          }
          default:
            throw new Error(`Unknown driver: ${cfg.driver}`);
        }
        return textResult(`Connection OK!\n${JSON.stringify({ driver: cfg.driver, host: cfg.host, port: cfg.port, ...rows[0] }, null, 2)}`);
      } catch (e) { return errorResult(e); }
    }
  );

  // ── SELECT queries ─────────────────────────────────────────────────────────

  server.tool('sql_query',
    'Execute a SELECT query and return results as JSON. Supports MySQL, MariaDB, PostgreSQL, SQLite. Auto-adds LIMIT if missing.',
    {
      sql:    z.string().describe('SQL SELECT (or SHOW / PRAGMA / EXPLAIN) statement'),
      params: z.array(z.unknown()).optional().describe('Parameterized values — ? for MySQL/SQLite, $1 $2 … for PostgreSQL'),
      limit:  z.number().min(1).max(5000).optional().default(200).describe('Max rows to return when no LIMIT clause present (default: 200)'),
      ...connFields,
    },
    async ({ sql, params, limit, ...conn }) => {
      try {
        const cfg = resolveConfig(conn);
        const trimmed = sql.trim();
        if (!/^(SELECT|WITH|SHOW|PRAGMA|EXPLAIN|DESC)/i.test(trimmed)) {
          return textResult('sql_query only accepts read-only statements (SELECT/SHOW/PRAGMA/EXPLAIN). Use sql_execute for writes.');
        }
        // Auto-add LIMIT when absent
        const finalSql = /\bLIMIT\s+\d+/i.test(trimmed)
          ? trimmed
          : `${trimmed.replace(/;?\s*$/, '')} LIMIT ${limit ?? 200}`;
        const rows = await runSql(cfg, finalSql, params ?? []);
        return textResult(JSON.stringify({ rowCount: rows.length, rows }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Write queries ──────────────────────────────────────────────────────────

  server.tool('sql_execute',
    'Execute a write SQL statement (INSERT, UPDATE, DELETE, CREATE TABLE, ALTER, etc.). Returns affected row count. DROP/TRUNCATE require confirm_destructive=true.',
    {
      sql:                  z.string().describe('SQL statement to execute'),
      params:               z.array(z.unknown()).optional().describe('Parameterized values'),
      confirm_destructive:  z.boolean().optional().describe('Set true to allow DROP or TRUNCATE statements'),
      ...connFields,
    },
    async ({ sql, params, confirm_destructive, ...conn }) => {
      try {
        const cfg  = resolveConfig(conn);
        const upper = sql.trim().toUpperCase();
        if (/^(DROP|TRUNCATE)/.test(upper) && !confirm_destructive) {
          return textResult(
            'This statement is destructive (DROP/TRUNCATE).\n' +
            'Set confirm_destructive=true to proceed, or use sql_execute with extreme caution.'
          );
        }
        const rows = await runSql(cfg, sql.trim(), params ?? []);
        return textResult(JSON.stringify(rows[0] ?? { success: true }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── List tables ────────────────────────────────────────────────────────────

  server.tool('sql_list_tables',
    'List all tables (and views) in a database with estimated row counts. Supports MySQL, MariaDB, PostgreSQL, SQLite.',
    connFields,
    async (params) => {
      try {
        const cfg = resolveConfig(params);
        let rows: Row[];
        switch (cfg.driver) {
          case 'mysql':
          case 'mariadb':
            rows = await mysqlRun(cfg,
              `SELECT TABLE_NAME AS \`table\`, TABLE_TYPE AS type,
                      TABLE_ROWS AS row_estimate,
                      ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1) AS size_kb,
                      ENGINE AS engine, TABLE_COLLATION AS collation
               FROM information_schema.TABLES
               WHERE TABLE_SCHEMA = DATABASE()
               ORDER BY TABLE_NAME`);
            break;
          case 'pgsql':
            rows = await pgRun(cfg,
              `SELECT t.tablename AS table,
                      'BASE TABLE' AS type,
                      s.n_live_tup AS row_estimate,
                      pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename))) AS total_size
               FROM pg_tables t
               LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename
               WHERE t.schemaname = 'public'
               UNION ALL
               SELECT viewname AS table, 'VIEW' AS type, NULL, NULL
               FROM pg_views WHERE schemaname = 'public'
               ORDER BY table`);
            break;
          case 'sqlite':
            rows = sqliteRun(cfg,
              `SELECT name AS "table", type, 0 AS row_estimate
               FROM sqlite_master WHERE type IN ('table','view') ORDER BY name`);
            break;
          default:
            throw new Error(`Unknown driver: ${cfg.driver}`);
        }
        return textResult(JSON.stringify({ tableCount: rows.length, tables: rows }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Describe table ─────────────────────────────────────────────────────────

  server.tool('sql_describe_table',
    'Show full schema for a table: columns with types, nullability, defaults, keys, plus indexes and foreign keys. Supports MySQL, MariaDB, PostgreSQL, SQLite.',
    {
      table: z.string().describe('Table name'),
      ...connFields,
    },
    async ({ table, ...conn }) => {
      try {
        const cfg = resolveConfig(conn);
        let columns: Row[], indexes: Row[] = [], foreignKeys: Row[] = [];

        switch (cfg.driver) {
          case 'mysql':
          case 'mariadb': {
            columns = await mysqlRun(cfg,
              `SELECT COLUMN_NAME AS column_name,
                      COLUMN_TYPE AS column_type,
                      IS_NULLABLE AS nullable,
                      COLUMN_DEFAULT AS default_value,
                      COLUMN_KEY AS key,
                      EXTRA AS extra,
                      COLUMN_COMMENT AS comment
               FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
               ORDER BY ORDINAL_POSITION`, [table]);
            indexes = await mysqlRun(cfg,
              `SELECT INDEX_NAME AS index_name,
                      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
                      IF(NON_UNIQUE=0,'UNIQUE','INDEX') AS type,
                      INDEX_TYPE AS method
               FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
               GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
               ORDER BY INDEX_NAME`, [table]);
            foreignKeys = await mysqlRun(cfg,
              `SELECT CONSTRAINT_NAME AS fk_name,
                      COLUMN_NAME AS column_name,
                      REFERENCED_TABLE_NAME AS ref_table,
                      REFERENCED_COLUMN_NAME AS ref_column
               FROM information_schema.KEY_COLUMN_USAGE
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
               AND REFERENCED_TABLE_NAME IS NOT NULL`, [table]);
            break;
          }
          case 'pgsql': {
            columns = await pgRun(cfg,
              `SELECT c.column_name,
                      c.data_type || COALESCE('(' || c.character_maximum_length || ')', '') AS column_type,
                      c.is_nullable AS nullable,
                      c.column_default AS default_value,
                      (SELECT string_agg(tc.constraint_type, ', ')
                       FROM information_schema.constraint_column_usage ccu
                       JOIN information_schema.table_constraints tc
                         ON tc.constraint_name = ccu.constraint_name
                        AND tc.table_name = c.table_name
                       WHERE ccu.column_name = c.column_name
                         AND ccu.table_name = c.table_name) AS keys
               FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.table_name = $1
               ORDER BY c.ordinal_position`, [table]);
            indexes = await pgRun(cfg,
              `SELECT indexname AS index_name, indexdef AS definition
               FROM pg_indexes WHERE tablename = $1`, [table]);
            foreignKeys = await pgRun(cfg,
              `SELECT rc.constraint_name AS fk_name,
                      kcu.column_name,
                      ccu.table_name AS ref_table,
                      ccu.column_name AS ref_column,
                      rc.update_rule, rc.delete_rule
               FROM information_schema.referential_constraints rc
               JOIN information_schema.key_column_usage kcu
                 ON kcu.constraint_name = rc.constraint_name
               JOIN information_schema.constraint_column_usage ccu
                 ON ccu.constraint_name = rc.unique_constraint_name
               WHERE kcu.table_name = $1`, [table]);
            break;
          }
          case 'sqlite': {
            // Sanitise table name for PRAGMA (no params in PRAGMA)
            const safe = table.replace(/[^a-zA-Z0-9_]/g, '');
            columns     = sqliteRun(cfg, `PRAGMA table_info(${safe})`);
            indexes     = sqliteRun(cfg, `PRAGMA index_list(${safe})`);
            foreignKeys = sqliteRun(cfg, `PRAGMA foreign_key_list(${safe})`);
            break;
          }
          default:
            throw new Error(`Unknown driver: ${cfg.driver}`);
        }

        return textResult(JSON.stringify({ table, columns, indexes, foreignKeys }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── List databases ─────────────────────────────────────────────────────────

  server.tool('sql_list_databases',
    'List all databases on a MySQL, MariaDB, or PostgreSQL server with size info. For SQLite, describe the file instead.',
    connFields,
    async (params) => {
      try {
        const cfg = resolveConfig(params);
        let rows: Row[];
        switch (cfg.driver) {
          case 'mysql':
          case 'mariadb':
            rows = await mysqlRun(cfg,
              `SELECT SCHEMA_NAME AS database_name,
                      DEFAULT_CHARACTER_SET_NAME AS charset,
                      DEFAULT_COLLATION_NAME AS collation,
                      ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb
               FROM information_schema.SCHEMATA s
               LEFT JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = s.SCHEMA_NAME
               GROUP BY SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
               ORDER BY SCHEMA_NAME`);
            break;
          case 'pgsql':
            rows = await pgRun(cfg,
              `SELECT datname AS database_name,
                      pg_encoding_to_char(encoding) AS encoding,
                      pg_size_pretty(pg_database_size(datname)) AS size
               FROM pg_database WHERE datistemplate = false ORDER BY datname`);
            break;
          case 'sqlite': {
            // For SQLite, show file info
            const stat = fs.existsSync(cfg.database) ? fs.statSync(cfg.database) : null;
            rows = [{
              file: cfg.database,
              size_bytes: stat?.size ?? 'file not found',
              modified: stat?.mtime?.toISOString() ?? null,
            }];
            break;
          }
          default:
            throw new Error(`Unknown driver: ${cfg.driver}`);
        }
        return textResult(JSON.stringify({ databases: rows }, null, 2));
      } catch (e) { return errorResult(e); }
    }
  );

  // ── Export query ───────────────────────────────────────────────────────────

  server.tool('sql_export',
    'Run a SELECT query and write the results to a local CSV or JSON file.',
    {
      sql:         z.string().describe('SELECT query to export'),
      output_path: z.string().describe('Absolute path for the output file (e.g. C:\\exports\\users.csv or /tmp/users.json)'),
      format:      z.enum(['csv', 'json']).optional().default('csv').describe('Output format — csv (default) or json'),
      ...connFields,
    },
    async ({ sql, output_path, format, ...conn }) => {
      try {
        const cfg = resolveConfig(conn);
        if (!/^SELECT/i.test(sql.trim())) {
          return textResult('sql_export only accepts SELECT queries.');
        }
        const rows = await runSql(cfg, sql.trim());
        const content = (format ?? 'csv') === 'json'
          ? JSON.stringify(rows, null, 2)
          : toCSV(rows);
        // Ensure parent directory exists
        const dir = path.dirname(output_path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(output_path, content, 'utf8');
        return textResult(`Exported ${rows.length} rows to ${output_path} (${(format ?? 'csv').toUpperCase()}).`);
      } catch (e) { return errorResult(e); }
    }
  );
}
