<?php

namespace Valet;

use DomainException;
use Illuminate\Support\Collection;

class Nginx
{
    const NGINX_CONF = BREW_PREFIX.'/etc/nginx/nginx.conf';

    public function __construct(public Herd $herd, public CommandLine $cli, public Filesystem $files,
                         public Configuration $configuration, public Site $site)
    {
    }

    /**
     * Install the configuration files for Nginx.
     */
    public function install(): void
    {

    }

    /**
     * Install the Nginx configuration file.
     */
    public function installConfiguration(): void
    {

    }

    /**
     * Install the Valet Nginx server configuration file.
     */
    public function installServer(): void
    {

    }

    /**
     * Install the Nginx configuration directory to the ~/.config/valet directory.
     *
     * This directory contains all site-specific Nginx servers.
     */
    public function installNginxDirectory(): void
    {

    }

    /**
     * Check nginx.conf for errors.
     */
    private function lint(): void
    {
        // Todo: implement
    }

    /**
     * Generate fresh Nginx servers for existing secure sites.
     */
    public function rewriteSecureNginxFiles(): void
    {
        $tld = $this->configuration->read()['tld'];
        $loopback = $this->configuration->read()['loopback'];

        if ($loopback !== VALET_LOOPBACK) {
            $this->site->aliasLoopback(VALET_LOOPBACK, $loopback);
        }

        $config = compact('tld', 'loopback');

        $this->site->resecureForNewConfiguration($config, $config);
    }

    /**
     * Restart the Nginx service.
     */
    public function restart(): void
    {
//        $this->lint();

        $this->herd->restartService('NGINX');
    }

    /**
     * Stop the Nginx service.
     */
    public function stop(): void
    {
        $this->herd->stopService('Nginx');
    }

    /**
     * Forcefully uninstall Nginx.
     */
    public function uninstall(): void
    {

    }

    /**
     * Return a list of all sites with explicit Nginx configurations.
     */
    public function configuredSites(): Collection
    {
        return collect($this->files->scandir(VALET_HOME_PATH.'/Nginx'))
            ->reject(function ($file) {
                return starts_with($file, '.');
            });
    }
}
