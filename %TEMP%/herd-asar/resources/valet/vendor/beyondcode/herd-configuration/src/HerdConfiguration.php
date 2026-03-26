<?php

namespace BeyondCode\HerdConfiguration;

class HerdConfiguration
{
    protected string $operatingSystem = '';

    /**
     * @var bool
     * Whether or not the dumps are enabled by the user.
     */
    protected bool $dumpsEnabled = false;

    /**
     * @var bool
     * Whether or not the mail service is enabled.
     * As soon as the license is pro, this is always true.
     */
    protected bool $mailsEnabled = false;

    /**
     * @var int
     * The port on which the SMTP server for
     * the mail service is running.
     */
    protected int $smtpPort = 2525;

    /**
     * @var int
     * The port for the API server which serves as a bridge for the CLI on Windows.
     *
     * Windows only.
     */
    protected int $apiPort = 2304;

    protected bool $watchViaCLI = false;
    protected bool $watchEvents = false;
    protected bool $watchLogs = true;
    protected bool $watchQueries = true;
    protected bool $watchHttpClient = true;
    protected bool $watchViews = true;
    protected bool $watchCache = true;

    public static function load(): self
    {
        if(array_key_exists('HERD_CONFIG_TEST', $_SERVER) && array_key_exists('HERD_CONFIG_JSON', $_SERVER) && $_SERVER['HERD_CONFIG_TEST'] === true) {
            return self::fromJson($_SERVER['HERD_CONFIG_JSON']);
        }

        $config = new self();
        $config->detectOperatingSystem();

        $file = $config->loadConfigFile();

        $config->fill($file);

        return $config;
    }

    public function isWindows(): bool
    {
        return $this->operatingSystem === 'windows';
    }

    public function isMac(): bool
    {
        return $this->operatingSystem === 'mac';
    }

    public function isPro(): bool
    {
        // so far, we can detect a pro license by checking if the mails are active
        return $this->mailsEnabled();
    }

    public function dumpsEnabled(): bool
    {
        return $this->dumpsEnabled;
    }

    public function mailsEnabled(): bool
    {
        return $this->mailsEnabled;
    }

    public function watchViaCLI(): bool
    {
        return $this->watchViaCLI();
    }

    public function watchLogs(): bool
    {
        return $this->watchLogs;
    }

    public function watchEvents(): bool
    {
        return $this->watchEvents;
    }

    public function watchQueries(): bool
    {
        return $this->watchQueries;
    }

    public function watchHttpClient(): bool
    {
        return $this->watchHttpClient;
    }

    public function watchViews(): bool
    {
        return $this->watchViews;
    }

    public function watchCache(): bool
    {
        return $this->watchCache;
    }

    public function smtpPort(): int
    {
        return $this->smtpPort;
    }

    public function apiPort(): int
    {
        return $this->apiPort;
    }

    protected function fill(string $json): self
    {
        $config = json_decode($json, true);
        
        if (!is_array($config)) {
            $config = [];
        }

        $this->dumpsEnabled = array_key_exists('dumps', $config) && $config['dumps'] === true;
        $this->mailsEnabled = array_key_exists('mails', $config) && $config['mails'] === true;

        $this->smtpPort = (array_key_exists('smtpPort', $config) && $config['smtpPort']) ? $config['smtpPort'] : 2525;
        $this->apiPort = (array_key_exists('apiPort', $config) && $config['apiPort']) ? $config['apiPort'] : 2304;

        $this->watchViaCLI = array_key_exists('watchViaCLI', $config) && $config['watchViaCLI'] === true;

        $this->watchLogs = array_key_exists('watchLogs', $config) && $config['watchLogs'] === true;
        $this->watchEvents = array_key_exists('watchEvents', $config) && $config['watchEvents'] === true;
        $this->watchQueries = array_key_exists('watchQueries', $config) && $config['watchQueries'] === true;
        $this->watchHttpClient = array_key_exists('watchHttpClient', $config) && $config['watchHttpClient'] === true;
        $this->watchViews = array_key_exists('watchViews', $config) && $config['watchViews'] === true;
        $this->watchCache = array_key_exists('watchCache', $config) && $config['watchCache'] === true;

        return $this;
    }

    protected function detectOperatingSystem() {
        if(strpos(php_uname('s'), 'Windows') !== false) {
            $this->operatingSystem = 'windows';
        }
        else {
            $this->operatingSystem = 'mac';
        }
    }



    public static function fromJson(string $json): self
    {
        $config = new self();

        $config->detectOperatingSystem();

        $config->fill($json);

        return $config;
    }


    protected function loadConfigFile(?string $path = null)
    {
        if ($path === null) {
            $path = $this->getConfigPath();
        }

        if (!file_exists($path)) {
            throw new \Exception("Herd configuration file not found at {$path}");
        }

        $herdConfig = file_get_contents($path);

        return $herdConfig;
    }

    protected function getConfigPath()
    {
        if($this->operatingSystem === null) return;
        
        $configPath = '';

        if (array_key_exists('HOME', $_SERVER)) {
            if ($this->isWindows()) {
                $configPath = $_SERVER['HOME'] . '\.config\herd\config\config.json';
            } else {
                $configPath = $_SERVER['HOME'] . '/Library/Application Support/Herd/config/herd.json';
            }
        } else if (array_key_exists('HOMEPATH', $_SERVER) && array_key_exists('HOMEDRIVE', $_SERVER)) {
            $configPath = $_SERVER['HOMEDRIVE'] . $_SERVER['HOMEPATH'] . '\.config\herd\config\config.json';
        }

        return $configPath;
    }

    public static function getIniValues()
    {
        if (strpos(php_uname('s'), 'Windows') !== false) {
            $operatingSystem = 'windows';
        } else {
            $operatingSystem = 'mac';
        }

        $configPath = '';
        if (array_key_exists('HOME', $_SERVER)) {
            if ($operatingSystem === 'windows') {
                $configPath = $_SERVER['HOME'] . '\.config\herd\bin\\';
            } else {
                $configPath = $_SERVER['HOME'] . '/Library/Application Support/Herd/config/php/';
            }
        } else if (array_key_exists('HOMEPATH', $_SERVER) && array_key_exists('HOMEDRIVE', $_SERVER)) {
            $configPath = $_SERVER['HOMEDRIVE'] . $_SERVER['HOMEPATH'] . '\.config\herd\bin\\';
        }

        if ($operatingSystem === 'mac') {
            $filename = $configPath . PHP_MAJOR_VERSION . PHP_MINOR_VERSION . '/php.ini';
        } else {
            $filename = $configPath . "php" . PHP_MAJOR_VERSION . PHP_MINOR_VERSION . '\php.ini';
        }

        if (!file_exists($filename)) {
            return [];
        }

        return parse_ini_file($filename) ?: [];
    }
}
