# laravel-herd-mcp — All MCP Tools

> **170 tools** across 16 categories. All tools are available in the single `laravel-herd` MCP server.
>
> Legend: ⚠️ Pro = requires Herd Pro license · 📦 Pkg = requires optional Laravel package

---

## Herd Control

| Tool | Description |
|------|-------------|
| `start_herd` | Start all Herd services (Nginx, PHP-FPM, DNS) |
| `stop_herd` | Stop all Herd services |
| `restart_herd` | Restart all Herd services |
| `get_loopback_address` | Get the current loopback IP address |
| `set_loopback_address` | Change the loopback IP address |
| `open_site_in_ide` | Open a site directory in the configured IDE |
| `herd_init` | Apply the Herd manifest file (herd.yml) — start services and apply config |
| `herd_init_fresh` | Generate a fresh Herd manifest file (herd.yml) for the current project |

---

## Sites

| Tool | Description |
|------|-------------|
| `list_all_sites` | List all sites with URL, PHP version, SSL status, path |
| `list_parked_sites` | List all sites served from parked directories |
| `list_parked_paths` | List registered park directories |
| `get_site_info_artisan` | Display detailed site info (runs `artisan about` for Laravel sites) |
| `get_site_driver` | Show which Herd driver serves a directory |
| `open_site_in_browser` | Open a site in the default browser |
| `park_directory` | Register a directory so all subdirectories become `.test` sites |
| `unpark_directory` | Unregister a parked directory |
| `link_site` | Create a named link for a directory |
| `unlink_site` | Remove a named link |
| `list_links` | List all linked sites |
| `create_proxy` | Create an Nginx proxy to a local port or URL |
| `remove_proxy` | Remove a proxy configuration |
| `list_proxies` | List all configured proxies |
| `share_site` | Share a local site via Expose tunnel |
| `get_share_url` | Get the current Expose tunnel URL |

---

## SSL / HTTPS

| Tool | Description |
|------|-------------|
| `secure_site` | Enable HTTPS — generate and trust a TLS certificate |
| `unsecure_site` | Disable HTTPS for a site |
| `list_secured_sites` | List all secured sites with certificate expiry dates |

---

## PHP

| Tool | Description |
|------|-------------|
| `list_php_versions` | List all PHP versions with install/active status |
| `install_php_version` | Install a PHP version e.g. `"8.3"` |
| `update_php_version` | Update a PHP version to its latest patch release |
| `use_php_globally` | Set the global default PHP version for all sites |
| `which_php` | Show the PHP binary path for a site |
| `edit_php_ini` | Open `php.ini` for a PHP version in the IDE |
| `isolate_site_php` | Pin a site to a specific PHP version |
| `unisolate_site_php` | Remove PHP isolation — revert site to global version |
| `list_isolated_sites` | List all sites with isolated PHP versions |

---

## Node / NVM

| Tool | Description |
|------|-------------|
| `list_node_versions` | List installed Node.js versions managed by Herd NVM |
| `install_node_version` | Install a Node.js version |
| `use_node_version` | Switch the active Node.js version |

---

## Services ⚠️ Pro

> All service tools require a **Herd Pro** licence.

| Tool | Description |
|------|-------------|
| `services_list` | List all installed service instances |
| `services_available` | List all available service types (MySQL, Redis, PostgreSQL, Minio…) |
| `services_versions` | List available versions for a service type |
| `services_create` | Create a new service instance (with `--name`, `--port`, `--version`) |
| `services_start` | Start an installed service |
| `services_stop` | Stop a running service |
| `services_clone` | Clone a service instance with its data |
| `services_delete` | Delete a service instance and ALL its data |

---

## Database

| Tool | Description |
|------|-------------|
| `db_info` | Read connection details from `.env` (driver, host, port, database, username) |
| `db_open` | Open the site database in GUI client (TablePlus, DBngin…) |
| `db_show` | `artisan db:show` — tables, size, engine, connection info |
| `db_table` | `artisan db:table <table>` — columns, indexes, foreign keys |
| `db_wipe` | `artisan db:wipe` — drop all tables, views and types |
| `db_seed` | `artisan db:seed` with `--class` and `--database` |
| `db_monitor` | `artisan db:monitor` — connection count alerts |

---

## Cache

| Tool | Description |
|------|-------------|
| `cache_clear` | Clear the entire application cache |
| `cache_forget` | Remove a specific cache key (with store selector) |
| `cache_prune_stale_tags` | Prune stale Redis tag entries |
| `cache_table` | Create the database cache table migration |
| `config_cache` | Cache framework config files for faster bootstrap |
| `config_clear` | Clear the config cache |
| `config_show` | Show all resolved config values or a specific key |
| `view_cache` | Compile all Blade templates |
| `view_clear` | Clear compiled Blade view files |
| `route_cache` | Cache route registrations |
| `route_clear` | Clear the route cache |
| `event_cache` | Cache all events and listeners |
| `event_clear` | Clear the event cache |
| `event_list` | List all events and their listeners |

---

## Queue & Schedule

### Failed Jobs
| Tool | Description |
|------|-------------|
| `queue_failed` | List all failed queue jobs |
| `queue_retry` | Retry one job by UUID or all failed jobs |
| `queue_forget` | Delete a single failed job by UUID |
| `queue_flush` | Delete all failed jobs (with optional `--hours` filter) |
| `queue_prune_failed` | Prune old entries from the `failed_jobs` table |
| `queue_failed_table` | Create the `failed_jobs` table migration |

### Active Queue
| Tool | Description |
|------|-------------|
| `queue_clear` | Clear all pending jobs from a queue |
| `queue_restart` | Signal all workers to restart after the current job |
| `queue_monitor` | Check queue sizes against thresholds |

### Batches
| Tool | Description |
|------|-------------|
| `queue_batches_table` | Create the `job_batches` table migration |
| `queue_prune_batches` | Prune old entries from the `job_batches` table |

### Schedule
| Tool | Description |
|------|-------------|
| `schedule_list` | List all scheduled tasks with next run time (`--timezone`, `--json`) |
| `schedule_run` | Run all due scheduled tasks immediately |
| `schedule_test` | Test a specific scheduled command by name |
| `schedule_clear_cache` | Clear all schedule mutex locks |

### Horizon 📦 `laravel/horizon`
| Tool | Description |
|------|-------------|
| `horizon_status` | Show Horizon status and queue metrics |
| `horizon_pause` | Pause all Horizon workers |
| `horizon_continue` | Resume paused Horizon workers |
| `horizon_terminate` | Gracefully terminate Horizon after current jobs |

---

## Dumps & Debugging

### Herd Dump Interceptor
| Tool | Description |
|------|-------------|
| `dumps_status` | Show all dump interception and watcher settings |
| `dumps_toggle` | Enable or disable dump interception (`dump()`, `dd()`, `var_dump()`) |
| `dumps_configure` | Set font size, ordering, color, CLI watch mode |
| `watchers_get` | Show state of all 7 Herd watchers |
| `watchers_set` | Toggle any watcher: `dumps`, `views`, `logs`, `queries`, `events`, `http_client` |

### Debug Sessions ⚠️ Pro
| Tool | Description |
|------|-------------|
| `debug_session_start` | Start an Xdebug debug session |
| `debug_session_stop` | Stop the session and display captured data |

### PHP Execution
| Tool | Description |
|------|-------------|
| `run_php_with_debug` | Run a PHP script with Xdebug enabled (`XDEBUG_SESSION=1`) |
| `run_php_with_coverage` | Run a PHP script with Xdebug coverage mode |

### Logs
| Tool | Description |
|------|-------------|
| `tail_log` | Tail Herd log files: `nginx`, `php-fpm`, `redis`, `mailhog` |

### Optional Packages
| Tool | Package | Description |
|------|---------|-------------|
| `ray_install` | `spatie/laravel-ray` | Install Ray + publish config |
| `ray_configure` | — | Show current Ray config |
| `clockwork_install` | `itsgoingd/clockwork` | Install Clockwork browser toolbar |
| `telescope_install` | `laravel/telescope` | Full install: require + artisan setup + migrate |
| `telescope_status` | — | Show Telescope recording status |
| `telescope_clear` | — | Clear all Telescope entries |
| `telescope_prune` | — | Delete entries older than N hours |

---

## Artisan (`php artisan`)

| Tool | Description |
|------|-------------|
| `artisan` | Run **any** `php artisan` command |
| `artisan_make` | Scaffold 20 class types: `model`, `controller`, `migration`, `seeder`, `factory`, `middleware`, `command`, `event`, `listener`, `job`, `mail`, `notification`, `policy`, `request`, `resource`, `rule`, `cast`, `scope`, `channel`, `provider` |
| `artisan_migrate` | `migrate` / `fresh` / `rollback` / `status` with `--seed`, `--step`, `--force` |
| `artisan_route_list` | `route:list` with `--filter` and `--json` |
| `artisan_optimize` | `optimize`, `optimize:clear`, config/route/view/cache/event cache or clear |
| `artisan_about` | `php artisan about` — app name, Laravel version, PHP, env, drivers |
| `artisan_db_seed` | `db:seed` with seeder class selector |
| `artisan_queue` | `queue:failed` / `queue:retry` / `queue:flush` |
| `artisan_setup` | `key:generate`, `storage:link` |
| `run_tinker` | Launch Laravel Tinker REPL |

---

## Composer

| Tool | Description |
|------|-------------|
| `run_composer` | Run any Composer command (generic) |
| `composer_require` | `composer require` with `--dev`, version constraints |
| `composer_remove` | `composer remove` |
| `composer_install` | `composer install` with `--no-dev`, `--no-scripts`, `--optimize` |
| `composer_update` | `composer update` all or specific packages |
| `composer_outdated` | List packages with updates available |
| `composer_show` | Show installed packages or details for one package |
| `composer_dump_autoload` | Regenerate autoloader (`--classmap-authoritative`) |
| `composer_validate` | Validate `composer.json` integrity |
| `composer_search` | Search Packagist for packages |
| `composer_scripts` | List or run scripts defined in `composer.json` |
| `create_laravel_project` | Create a new Laravel project via `laravel new` |

---

## Laravel Boost 📦 `laravel/boost`

> Laravel's official per-project MCP server + AI coding guidelines.

| Tool | Description |
|------|-------------|
| `boost_install` | `composer require laravel/boost --dev` + `artisan boost:install` |
| `boost_register_mcp` | Register the project's `boost:mcp` server in `~/.claude/settings.json` |
| `boost_list_guidelines` | List AI guideline files in `.ai/guidelines/` |
| `boost_add_guideline` | Add or overwrite a custom guideline (Markdown or Blade) |
| `boost_mcp_config` | Show the JSON snippet to register Boost MCP in any editor |

---

## Direct Database Client

> Native database access for **MySQL, MariaDB, PostgreSQL, and SQLite** — both local Herd databases and remote servers.
>
> Supply `cwd` to auto-read connection details from a Laravel `.env`, or provide explicit `driver`/`host`/`port`/`database`/`username`/`password`.
>
> **Dependencies bundled:** `mysql2` (MySQL/MariaDB), `pg` (PostgreSQL).
> **SQLite:** requires `better-sqlite3` (optional — install with `npm install -g better-sqlite3`).

| Tool | Description |
|------|-------------|
| `sql_connect_test` | Test a connection and return server version, current database, and user |
| `sql_query` | Execute a SELECT query — returns JSON rows, auto-adds LIMIT if absent |
| `sql_execute` | Execute INSERT / UPDATE / DELETE / CREATE TABLE / ALTER — returns affected rows. DROP/TRUNCATE require `confirm_destructive=true` |
| `sql_list_tables` | List all tables and views with row estimates and size |
| `sql_describe_table` | Full table schema: columns, types, nullability, defaults, indexes, foreign keys |
| `sql_list_databases` | List all databases with size (MySQL/PostgreSQL) or file info (SQLite) |
| `sql_export` | Export a SELECT result to a local CSV or JSON file |

---

## Laravel Forge CLI

> Requires `laravel/forge-cli` installed globally (`forge_install` or `composer global require laravel/forge-cli`).
> Authenticate once with `forge_login`.

### Installation & Auth
| Tool | Description |
|------|-------------|
| `forge_install` | Install Laravel Forge CLI globally via `composer global require laravel/forge-cli` |
| `forge_login` | Authenticate with your Forge API token |

### Servers
| Tool | Description |
|------|-------------|
| `forge_server_list` | List all servers on your Forge account |
| `forge_server_current` | Show the currently active server |
| `forge_server_switch` | Switch the active server |
| `forge_ssh` | Show SSH connection info for a server/site |

### Sites
| Tool | Description |
|------|-------------|
| `forge_site_list` | List all sites on the active server |
| `forge_site_logs` | View recent logs for a site |
| `forge_command` | Run a shell command on a Forge site |

### Environment
| Tool | Description |
|------|-------------|
| `forge_env_pull` | Pull `.env` from a Forge site to a local file |
| `forge_env_push` | Push a local `.env` to a Forge site |

### Deployments
| Tool | Description |
|------|-------------|
| `forge_deploy` | Trigger a deployment for a site |
| `forge_deploy_logs` | View deployment logs |
| `forge_deploy_monitor` | Monitor ongoing deployments |

### Daemons (Supervisor)
| Tool | Description |
|------|-------------|
| `forge_daemon_status` | Show status of all Supervisor daemons |
| `forge_daemon_restart` | Restart a daemon |
| `forge_daemon_logs` | View daemon logs |

### Database Service
| Tool | Description |
|------|-------------|
| `forge_database_status` | Show database service status |
| `forge_database_restart` | Restart the database service |
| `forge_database_logs` | View database service logs |

### Nginx
| Tool | Description |
|------|-------------|
| `forge_nginx_status` | Show Nginx status |
| `forge_nginx_restart` | Restart Nginx |
| `forge_nginx_logs` | View Nginx access or error logs |

### PHP-FPM
| Tool | Description |
|------|-------------|
| `forge_php_status` | Show PHP-FPM status (by version) |
| `forge_php_restart` | Restart PHP-FPM (by version) |
| `forge_php_logs` | View PHP-FPM logs (by version) |

---

## Setup & Integration

| Tool | Description |
|------|-------------|
| `setup_integrations` | Auto-configure Claude Desktop + Claude Code + Herd `integrations.json` |
| `patch_herd_ui` | Patch Herd's `app.asar` to show Claude Code in the Integrations tab (admin required, re-run after Herd updates) |
| `open_integration_status` | Open the integration status dashboard in the browser (requires `--http` mode) |

---

## Summary

| Category | Tools | Notes |
|----------|------:|-------|
| Herd Control | 8 | Start/stop/restart Herd, loopback, manifest |
| Sites | 16 | Park, link, proxy, share, browser, IDE |
| SSL / HTTPS | 3 | Secure, unsecure, list |
| PHP | 9 | Versions, isolation, ini |
| Node / NVM | 3 | Install, list, switch |
| Services | 8 | ⚠️ Herd Pro required |
| Database (artisan) | 7 | .env info, GUI client, artisan db:* |
| Cache | 14 | Application, config, view, route, event |
| Queue & Schedule | 19 | Failed jobs, active queue, batches, schedule, Horizon |
| Dumps & Debugging | 16 | Herd interceptor, watchers, Xdebug, Ray, Telescope |
| Artisan | 10 | Generic + common workflows |
| Composer | 12 | Full dependency management |
| Laravel Boost | 5 | 📦 AI coding guidelines |
| Direct Database Client | 7 | Native SQL for MySQL/MariaDB/PostgreSQL/SQLite |
| Laravel Forge CLI | 25 | Remote server management via forge CLI |
| Setup & Integration | 3 | Claude Desktop/Code/Herd config |
| **Total** | **170** | |
