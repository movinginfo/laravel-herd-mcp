<?php

namespace Valet;

use DomainException;
use Illuminate\Support\Collection;

class PhpFpm
{

    public function __construct(public Herd $herd, public CommandLine $cli, public Filesystem $files, public Configuration $config, public Site $site, public Nginx $nginx)
    {
    }

    /**
     * Install and configure PhpFpm.
     */
    public function install(): void
    {

    }

    /**
     * Forcefully uninstall all of Valet's supported PHP versions and configurations.
     */
    public function uninstall(): void
    {

    }

    /**
     * Restart the PHP FPM process (if one specified) or processes (if none specified).
     */
    public function restart(?string $phpVersion = null): void
    {
        $this->herd->restartPhpService($phpVersion ?: $this->utilizedPhpVersions());
    }

    /**
     * Stop the PHP FPM process.
     */
    public function stop(): void
    {
        call_user_func_array(
            [$this->herd, 'stopService'],
            Brew::SUPPORTED_PHP_VERSIONS
        );
    }

    /**
     * Stop only the running php services.
     */
    public function stopRunning(): void
    {
        $this->herd->stopService('php');
    }

    /**
     * Stop a given PHP version, if that specific version isn't being used globally or by any sites.
     */
    public function stopIfUnused(?string $phpVersion = null): void
    {
        if (! $phpVersion) {
            return;
        }

        $phpVersion = $this->normalizePhpVersion($phpVersion);

        if (! in_array($phpVersion, $this->utilizedPhpVersions())) {
            $this->herd->stopAndRemoveService($phpVersion);
        }
    }

    /**
     * Isolate a given directory to use a specific version of PHP.
     */
    public function isolateDirectory(string $directory, string $version): void
    {
        $site = $this->site->getSiteUrl($directory);

        $version = $this->validateRequestedVersion($version);

        $this->herd->ensurePHPIsInstalled($version);

        $oldCustomPhpVersion = $this->site->customPhpVersion($site); // Example output: "74"

        $this->site->isolate($site, $version);

        $this->stopIfUnused($oldCustomPhpVersion);
        $this->restart($version);
        $this->nginx->restart();

        info(sprintf('The site [%s] is now using %s.', $site, $version));
    }

    /**
     * Remove PHP version isolation for a given directory.
     */
    public function unIsolateDirectory(string $directory): void
    {
        $site = $this->site->getSiteUrl($directory);

        $oldCustomPhpVersion = $this->site->customPhpVersion($site); // Example output: "74"

        $this->site->removeIsolation($site);
        $this->stopIfUnused($oldCustomPhpVersion);
        $this->nginx->restart();

        info(sprintf('The site [%s] is now using the default PHP version.', $site));
    }

    /**
     * List all directories with PHP isolation configured.
     */
    public function isolatedDirectories(): Collection
    {
        return $this->nginx->configuredSites()->filter(function ($item) {
            return strpos($this->files->get(VALET_HOME_PATH.'/Nginx/'.$item), ISOLATED_PHP_VERSION) !== false;
        })->map(function ($item) {
            $site = str_replace(".conf", "", $item);
            return ['url' => $site, 'version' => $this->normalizePhpVersion($this->site->customPhpVersion($site))];
        });
    }

    /**
     * Use a specific version of PHP globally.
     */
    public function useVersion(string $version): ?string
    {
        $version = $this->validateRequestedVersion($version);

        info(sprintf('Using new version: %s', $version));

        $this->herd->ensurePHPIsInstalled($version);
        
        $this->herd->usePHP($version);

        info(sprintf('Herd is now using %s.', $version).PHP_EOL);
        info('Note that you might need to run <comment>composer global update</comment> if your PHP version change affects the dependencies of global packages required by Composer.');

        return $version;
    }

    /**
     * If passed php7.4, or php74, 7.4, or 74 formats, normalize to php@7.4 format.
     */
    public function normalizePhpVersion(?string $version): string
    {
        return preg_replace('/(?:php@?)?([0-9+])(?:.)?([0-9+])/i', '$1.$2', (string) $version);
    }

    /**
     * Validate the requested version to be sure we can support it.
     */
    public function validateRequestedVersion(string $version): string
    {
        if (is_null($version)) {
            throw new DomainException("Please specify a PHP version (try something like 'php@8.1')");
        }

        $version = explode('@', $version)[1] ?? $version;

        if (! $this->herd->supportedPhpVersions()->contains($version)) {
            throw new DomainException("Herd doesn't support PHP version: {$version} (try something like '8.1' instead)");
        }

        return $version;
    }
    
    /**
     * Get FPM sock file name for a given PHP version.
     */
    public static function nginxSockName(?string $phpVersion = null): string
    {
        $versionInteger = preg_replace('~[^\d]~', '', $phpVersion);

        return "\$herd_sock_{$versionInteger}";
    }

    /**
     * Get FPM sock file name for a given PHP version.
     */
    public static function cgiPortNumber(?string $phpVersion = null): int
    {
        $versionInteger = preg_replace('~[^\d]~', '', $phpVersion);

        return \Herd::getBasePhpPort() + (int) $versionInteger;
    }

    /**
     * Get FPM log file name for a given PHP version.
     */
    public static function fpmLogName(?string $phpVersion = null): string
    {
        $versionInteger = preg_replace('~[^\d]~', '', $phpVersion);

        return "php-fpm-{$versionInteger}.log";
    }

    /**
     * Get a list including the global PHP version and allPHP versions currently serving "isolated sites" (sites with
     * custom Nginx configs pointing them to a specific PHP version).
     */
    public function utilizedPhpVersions(): array
    {
        $fpmSockFiles = $this->herd->supportedPhpVersions()->reject(function ($version) {
            return $version == 'php';
        })->map(function ($version) {
            return self::nginxSockName($this->normalizePhpVersion($version));
        })->unique();

        return $this->nginx->configuredSites()->map(function ($file) use ($fpmSockFiles) {
            $content = $this->files->get(VALET_HOME_PATH.'/Nginx/'.$file);

            // Get the normalized PHP version for this config file, if it's defined
            foreach ($fpmSockFiles as $sock) {
                if (strpos($content, $sock) !== false) {
                    // Extract the PHP version number from a custom .sock path and normalize it to, e.g., "php@7.4"
                    return $this->normalizePhpVersion(str_replace(['$herd_sock_'], '', $sock));
                }
            }
        })->merge([$this->herd->usedPhp()])->filter()->unique()->values()->toArray();
    }
}
