<?php

namespace Valet;

class DnsMasq
{
    public $dnsmasqMasterConfigFile = BREW_PREFIX.'/etc/dnsmasq.conf';

    public $dnsmasqSystemConfDir = BREW_PREFIX.'/etc/dnsmasq.d';

    public $resolverPath = '/etc/resolver';

    public function __construct(public Herd $herd, public CommandLine $cli, public Filesystem $files, public Configuration $configuration)
    {
    }

    /**
     * Install and configure DnsMasq.
     */
    public function install(string $tld = 'test'): void
    {

    }

    /**
     * Forcefully uninstall dnsmasq.
     */
    public function uninstall(): void
    {

    }

    /**
     * Tell Homebrew to restart dnsmasq.
     */
    public function restart(): void
    {
        $this->herd->restartService('DNSMasq');
    }

    /**
     * Stop the dnsmasq service.
     */
    public function stop(): void
    {
        $this->herd->stopService('DNSMasq');
    }

    /**
     * Ensure the DnsMasq configuration primary config is set to read custom configs.
     */
    public function ensureUsingDnsmasqDForConfigs(): void
    {
        info('Updating Dnsmasq configuration...');

        // set primary config to look for configs in /usr/local/etc/dnsmasq.d/*.conf
        $contents = $this->files->get($this->dnsmasqMasterConfigFile);
        // ensure the line we need to use is present, and uncomment it if needed
        if (false === strpos($contents, 'conf-dir='.BREW_PREFIX.'/etc/dnsmasq.d/,*.conf')) {
            $contents .= PHP_EOL.'conf-dir='.BREW_PREFIX.'/etc/dnsmasq.d/,*.conf'.PHP_EOL;
        }
        $contents = str_replace('#conf-dir='.BREW_PREFIX.'/etc/dnsmasq.d/,*.conf', 'conf-dir='.BREW_PREFIX.'/etc/dnsmasq.d/,*.conf', $contents);

        // remove entries used by older Valet versions:
        $contents = preg_replace('/^conf-file.*valet.*$/m', '', $contents);

        // save the updated config file
        $this->files->put($this->dnsmasqMasterConfigFile, $contents);

        // remove old ~/.config/valet/dnsmasq.conf file because things are moved to the ~/.config/valet/dnsmasq.d/ folder now
        if (file_exists($file = dirname($this->dnsmasqUserConfigDir()).'/dnsmasq.conf')) {
            unlink($file);
        }

        // add a valet-specific config file to point to user's home directory valet config
        $contents = $this->files->getStub('etc-dnsmasq-valet.conf');
        $contents = str_replace('VALET_HOME_PATH', VALET_HOME_PATH, $contents);
        $this->files->ensureDirExists($this->dnsmasqSystemConfDir, user());
        $this->files->putAsUser($this->dnsmasqSystemConfDir.'/dnsmasq-valet.conf', $contents);

        $this->files->ensureDirExists(VALET_HOME_PATH.'/dnsmasq.d', user());
    }

    /**
     * Create the TLD-specific dnsmasq config file.
     */
    public function createDnsmasqTldConfigFile(string $tld): void
    {
        $tldConfigFile = $this->dnsmasqUserConfigDir().'tld-'.$tld.'.conf';
        $loopback = $this->configuration->read()['loopback'];

        $this->files->putAsUser($tldConfigFile, 'address=/.'.$tld.'/'.$loopback.PHP_EOL.'listen-address='.$loopback.PHP_EOL);
    }

    /**
     * Create the resolver file to point the configured TLD to configured loopback address.
     */
    public function createTldResolver(string $tld): void
    {
        $this->files->ensureDirExists($this->resolverPath);
        $loopback = $this->configuration->read()['loopback'];

        $this->files->put($this->resolverPath.'/'.$tld, 'nameserver '.$loopback.PHP_EOL);
    }

    /**
     * Update the TLD/domain resolved by DnsMasq.
     */
    public function updateTld(string $oldTld, string $newTld): void
    {
        $this->files->unlink($this->resolverPath.'/'.$oldTld);
        $this->files->unlink($this->dnsmasqUserConfigDir().'tld-'.$oldTld.'.conf');

        $this->install($newTld);
    }

    /**
     * Refresh the DnsMasq configuration.
     */
    public function refreshConfiguration(): void
    {
        $tld = $this->configuration->read()['tld'];

        $this->updateTld($tld, $tld);
    }

    /**
     * Get the custom configuration path.
     */
    public function dnsmasqUserConfigDir(): string
    {
        return $_SERVER['HOME'].'/.config/valet/dnsmasq.d/';
    }
}
