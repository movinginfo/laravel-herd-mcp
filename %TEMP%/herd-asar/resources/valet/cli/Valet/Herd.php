<?php

namespace Valet;

use Illuminate\Support\Collection;
use PhpFpm;
use BeyondCode\HerdConfiguration\HerdConfiguration;
use Exception;

class Herd
{

    const SUPPORTED_PHP_VERSIONS = [
        'php',
        '8.5',
        '8.4',
        '8.3',
        '8.2',
        '8.1',
        '8.0',
        '7.4',
    ];

    const AVAILABLE_TLDS = [
        'test',
        'wip',
        'herd',
        'local',
        'localhost',
    ];

    const LATEST_PHP_VERSION = '8.3';

    protected $usedPHPVersion;

    public function __construct(public CommandLine $cli, public Filesystem $files, public Configuration $config)
    {
    }

    public function getBasePhpPort()
    {
        return trim($this->makeAppRequest('base-port'));
    }

    public function tinker($site): void
    {
        $server = new Server($this->config->read());
        if (str_contains($site, '.'.$this->config->read()['tld'])) {
            $site = str_replace('.'.$this->config->read()['tld'], '', $site);
        }
        $path = realpath($server->sitePath($site));

        $this->makeAppRequest('tinker', [
            'path' => $path,
        ]);
    }

    public function openDatabase($site): void
    {
        $server = new Server($this->config->read());
        if (str_contains($site, '.'.$this->config->read()['tld'])) {
            $site = str_replace('.'.$this->config->read()['tld'], '', $site);
        }

        $sitePath = $server->sitePath($site);

        if(!$sitePath) {
            return;
        }

        $path = realpath($sitePath);

        $this->makeAppRequest('open-database', [
            'path' => $path,
        ]);
    }

    public function stopService($services): void
    {
        $services = is_array($services) ? $services : func_get_args();

        foreach ($services as $service) {
            info("Stopping {$service}...");

            $this->makeAppRequest("stop-service/{$service}");
        }
    }

    public function stopAllServices(): void
    {
        $this->makeAppRequest("stop-all-services");
    }

    public function restartAllServices(): void
    {
        $this->makeAppRequest("restart-all-services");
    }

    public function startAllServices(): void
    {
        $this->makeAppRequest("start-all-services");
    }

    public function stopAndRemoveService($services): void
    {
        $services = is_array($services) ? $services : func_get_args();

        foreach ($services as $service) {
            info("Removing {$service}...");

            $this->makeAppRequest("remove-service/{$service}");
        }
    }

    public function valetPath(): string
    {
        return trim($this->makeAppRequest('valet-path'));
    }

    public function proxiesPath(): string
    {
        return trim($this->makeAppRequest('proxies-path'));
    }

    public function version(): string
    {
        return trim($this->makeAppRequest('version'));
    }

    public function restartService($services): void
    {
        $services = is_array($services) ? $services : func_get_args();

        foreach ($services as $service) {
            info("Restarting {$service}...");

            $this->makeAppRequest("restart-service/{$service}");
        }
    }

    public function restartHostsWatcher()
    {
        $this->makeAppRequest("restart-watcher");
    }

    public function restartPhpService($versions): void
    {
        $versions = is_array($versions) ? $versions : func_get_args();
        foreach ($versions as $version) {
            info("Restarting PHP {$version}...");

            $this->makeAppRequest("restart-php/{$version}");
        }
    }

    public function usePHP($version): void
    {
        $this->makeAppRequest("use-php/{$version}");
    }

    protected function runAppleScript($script): string
    {
        $script = 'tell application "Herd"'."\n".$script."\n".'end tell';
        return $this->cli->run('osascript -e \''.$script.'\'');
    }

    protected function makeAppRequest($endpoint, $payload = []): string
    {
        $apiPort = HerdConfiguration::load()->apiPort();
        $url = "http://127.0.0.1:{$apiPort}/{$endpoint}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        if (!empty($payload)) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        }
        $response = curl_exec($ch);

        return $response;
    }

    /**
     * Determine which version of PHP is used in Herd.
     */
    public function usedPhp(): string
    {
        if (!$this->usedPHPVersion) {
            $this->usedPHPVersion = $this->makeAppRequest('php-version');
        }
        return $this->usedPHPVersion;
    }


    /**
     * Returns all available services from Herd including their latest
     * versions (either installed or on the server).
     */
    public function hasPro(): bool
    {
        $response = json_decode(trim($this->makeAppRequest("has-pro")), true);

        return ($response['hasPro'] ?? false) === true;
    }

    public function availableServices(): array
    {
        return json_decode(trim($this->makeAppRequest("available-extra-services")), true);
    }

    public function serviceVersions(string $type): array
    {
        $response = json_decode(trim($this->makeAppRequest("service-versions/{$type}")), true);

        return $response['services'] ?? [];
    }

    public function isExtraServiceInstalled($service, $port, $version): HerdApiResponse
    {
        $service = json_decode(trim($this->makeAppRequest("extra-service-installed/{$service}/{$version}/{$port}")), true);

        return HerdApiResponse::fromResponse($service, 'installationStatus', 'installed');
    }

    public function isExtraServiceRunning($service, $port, $version): HerdApiResponse
    {
        $service = json_decode(trim($this->makeAppRequest("extra-service-running/{$service}/{$version}/{$port}")), true);

        return HerdApiResponse::fromResponse($service, 'status', 'active');
    }

    public function installExtraService($service, $port, $version, $name = null): HerdApiResponse
    {
        $response = $this->makeAppRequest("install-extra-service", [
            "name" => $name ?? ucfirst($service),
            "service" => $service,
            "port" => $port,
            "version" => $version
        ]);

        $serviceInfo = json_decode(trim($response), true);

        return HerdApiResponse::fromResponse($serviceInfo, 'installationStatus', 'installed');
    }

    public function startExtraService($service, $port, $version): HerdApiResponse
    {
        $service = json_decode(trim($this->makeAppRequest("start-extra-service/{$service}/{$version}/{$port}")), true);

        return HerdApiResponse::fromResponse($service, 'status', 'active');
    }

    public function listInstalledServices(): array
    {
        $response = json_decode(trim($this->makeAppRequest("installed-extra-services")), true);

        if (!is_array($response)) {
            return [];
        }

        return collect($response)->sortBy('name')->values()->toArray();
    }

    public function cloneExtraService(string $identifier, ?string $name = null, ?string $port = null, bool $autoStart = true): array
    {
        $payload = [
            'identifier' => $identifier,
            'autoStart' => $autoStart ? '1' : '0',
        ];

        if ($name !== null) {
            $payload['name'] = $name;
        }

        if ($port !== null) {
            $payload['port'] = $port;
        }

        $response = json_decode(trim($this->makeAppRequest("clone-extra-service", $payload)), true);

        if (!is_array($response)) {
            return ['status' => 'error'];
        }

        return $response;
    }

    public function deleteExtraService(string $identifier): array
    {
        $response = json_decode(trim($this->makeAppRequest("delete-extra-service/{$identifier}")), true);

        if (!is_array($response)) {
            return ['status' => 'error'];
        }

        return $response;
    }

    public function startExtraServiceByIdentifier(string $identifier): array
    {
        $response = json_decode(trim($this->makeAppRequest("start-extra-service-by-id/{$identifier}")), true);

        if (!is_array($response)) {
            return ['status' => 'error'];
        }

        return $response;
    }

    public function stopExtraService(string $identifier): array
    {
        $response = json_decode(trim($this->makeAppRequest("stop-extra-service-by-id/{$identifier}")), true);

        if (!is_array($response)) {
            return ['status' => 'error'];
        }

        return $response;
    }

    public function phpVersions(): array
    {
        $response = json_decode(trim($this->makeAppRequest("php-versions")), true);

        if (!is_array($response)) {
            return [];
        }

        return $response;
    }

    public function updatePHP($version)
    {
        $status = trim($this->makeAppRequest("update-php/{$version}"));

        return $status === 'success';
    }

    public function allSites(): array
    {
        $response = json_decode(trim($this->makeAppRequest("sites")), true);

        if (!is_array($response)) {
            return [];
        }

        return array_map(function ($site) {
            $site['secured'] = ($site['secured'] ?? '') === 'X';
            return $site;
        }, $response);
    }

    public function startDebugSession(): void
    {
        $this->makeAppRequest("debug/start");
    }

    public function stopDebugSession(): array
    {
        $response = json_decode(trim($this->makeAppRequest("debug/stop")), true);

        return is_array($response) ? $response : [];
    }

    public function isPHPInstalled($version): bool
    {
        $status = trim($this->makeAppRequest("php-installed/{$version}"));

        return $status === 'installed';
    }

    public function installPHP($version)
    {
        $status = trim($this->makeAppRequest("install-php/{$version}"));

        return $status === 'success';
    }

    public function ensurePHPIsInstalled($version): void
    {
        if ($this->isPHPInstalled($version)) {
            return;
        }

        info(sprintf('PHP %s is not installed. Installing now, please wait...', $version));
        $this->installPHP($version);
        info(sprintf('PHP %s is now installed!', $version));
    }

    /**
     * Extract PHP executable path from PHP Version.
     *
     * @param  string|null  $phpVersion  For example, "php@8.1"
     */
    public function getPhpExecutablePath(?string $phpVersion = null): string
    {
        if (! $phpVersion) {
            $phpVersion = $this->usedPhp();
        }

        $phpVersion = PhpFpm::normalizePhpVersion($phpVersion);

        $phpVersion = "php".str_replace(['@', '.'], '', $phpVersion); // php@8.1 to php81
        if ($this->files->exists(HERD_HOME_PATH."/bin/{$phpVersion}/php.exe")) {
            return HERD_HOME_PATH."/bin/{$phpVersion}/php.exe";
        }

        return HERD_HOME_PATH.'/bin/php';
    }

    public function getPhpExecutableVersion(string $phpExecutablePath): string
    {
        $phpVersion = $this->cli->run('"'.$phpExecutablePath.'" -v');
        // Don't return the patch version
        return preg_match('/PHP ([0-9]+\.[0-9]+)/', $phpVersion, $matches) ? $matches[1] : 'unknown';
    }

    /**
     * Get a list of supported PHP versions.
     */
    public function supportedPhpVersions(): Collection
    {
        return collect(static::SUPPORTED_PHP_VERSIONS);
    }

    /**
     * Open the default IDE with the given path.
     */
    public function openDefaultIde($path): void
    {
        $response =  $this->makeAppRequest('open-ide', [
            'path' => $path,
        ]);

        if($response !== "success") {
            throw new Exception($response);
        }
    }

    /**
     * Get the available TLDs.
     */
    public function availableTlds(): Collection
    {
        return collect(static::AVAILABLE_TLDS);
    }

    /**
     * Update the Laravel Installer via Herd.
     */
    public function updateLaravelInstaller(): void
    {
        $this->makeAppRequest('update-laravel-installer');
    }
}
