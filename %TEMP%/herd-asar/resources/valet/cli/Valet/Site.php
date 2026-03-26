<?php

namespace Valet;

use DateTime;

use DomainException;
use Illuminate\Support\Collection;
use PhpFpm;
use phpseclib3\Crypt\RSA;
use phpseclib3\File\X509;

class Site
{
    public function __construct(public Brew $brew, public Herd $herd, public Configuration $config, public CommandLine $cli, public Filesystem $files)
    {
        RSA::setOpenSSLConfigPath(HERD_HOME_PATH . '/openssl.cnf');
    }

    /**
     * Get the name of the site.
     */
    public function getSiteLinkName(?string $name): string
    {
        if (! is_null($name)) {
            return $name;
        }

        if (is_string($link = $this->getLinkNameByCurrentDir())) {
            return $link;
        }

        throw new DomainException(basename(getcwd()).' is not linked.');
    }

    /**
     * Get link name based on the current directory.
     */
    private function getLinkNameByCurrentDir(): ?string
    {
        $count = count($links = $this->links()->where('path', getcwd()));

        if ($count == 1) {
            return $links->shift()['site'];
        }

        if ($count > 1) {
            throw new DomainException("There are {$count} links related to the current directory, please specify the name: valet unlink <name>.");
        }

        return null;
    }

    /**
     * Get the real hostname for the given path, checking links.
     */
    public function host(string $path): ?string
    {
        foreach ($this->files->scandir($this->sitesPath()) as $link) {
            if (realpath($this->sitesPath($link)) === $path) {
                return $link;
            }
        }

        return basename($path);
    }

    /**
     * Link the current working directory with the given name.
     */
    public function link(string $target, string $link): string
    {
        $this->files->ensureDirExists(
            $linkPath = $this->sitesPath(), user()
        );

        $linkPath = str_replace('/', '\\', $linkPath);
        $link = str_replace(' ', '-', $link);

        $this->config->prependPath($linkPath);

        $this->files->symlink($target, $linkPath.'/'.$link);

        $this->herd->restartHostsWatcher();

        return $linkPath.'/'.$link;
    }

    /**
     * Pretty print out all links in Valet.
     */
    public function links(): Collection
    {
        $certsPath = $this->certificatesPath();

        $this->files->ensureDirExists($certsPath, user());

        $certs = $this->getCertificates($certsPath);

        return $this->getSites($this->sitesPath(), $certs);
    }

    /**
     * Pretty print out all parked links in Valet.
     */
    public function parked(): Collection
    {
        $certs = $this->getCertificates();

        $links = $this->getSites($this->sitesPath(), $certs);

        $config = $this->config->read();
        $parkedLinks = collect();
        foreach (array_reverse($config['paths']) as $path) {
            if ($path === $this->sitesPath()) {
                continue;
            }

            // Only merge on the parked sites that don't interfere with the linked sites
            $sites = $this->getSites($path, $certs)->filter(function ($site, $key) use ($links) {
                return ! $links->has($key);
            });

            $parkedLinks = $parkedLinks->merge($sites);
        }

        return $parkedLinks;
    }

    /**
     * Get all sites which are proxies (not Links, and contain proxy_pass directive).
     */
    public function proxies(): Collection
    {
        $dir = $this->nginxPath();
        $tld = $this->config->read()['tld'];
        $links = $this->links();
        $certs = $this->getCertificates();

        if (! $this->files->exists($dir)) {
            return collect();
        }

        $proxies = collect($this->files->scandir($dir))
            ->filter(function ($site, $key) use ($tld) {
                // keep sites that match our TLD
                return ends_with($site, '.'.$tld.'.conf');
            })
            ->map(function ($site, $key) use ($tld) {
                // remove the TLD suffix for consistency
                return str_replace('.'.$tld.'.conf', '', $site);
            })
            ->mapWithKeys(function ($site) {
                $host = $this->getProxyHostForSite($site) ?: '(other)';
                return [$site => $host];
            })->reject(function ($host, $site) {
                // If proxy host is null, it may be just a normal SSL stub, or something else; either way we exclude it from the list
                return $host === '(other)';
            })->map(function ($host, $site) use ($certs, $tld) {
                $secured = $certs->has($site);
                $url = ($secured ? 'https' : 'http').'://'.$site.'.'.$tld;

                return [
                    'site' => $site,
                    'secured' => $secured ? ' X' : '',
                    'url' => $url,
                    'path' => $host,
                ];
            });

        return $proxies;
    }

    /**
     * Get the site URL from a directory if it's a valid Valet site.
     */
    public function getSiteUrl(string $directory): string
    {
        $tld = $this->config->read()['tld'];

        if ($directory == '.' || $directory == './') { // Allow user to use dot as current dir's site `--site=.`
            $directory = $this->host(getcwd());
        }

        // Remove .tld from the end of sitename if it was provided
        if (ends_with($directory, '.'.$tld)) {
            $directory = substr($directory, 0, -(strlen('.'.$tld)));
        }

        if (! $this->parked()->merge($this->links())->where('site', $directory)->count() > 0) {
            throw new DomainException("The [{$directory}] site could not be found in Valet's site list.");
        }

        return $directory.'.'.$tld;
    }

    /**
     * Identify whether a site is for a proxy by reading the host name from its config file.
     */
    public function getProxyHostForSite(string $site, ?string $configContents = null): ?string
    {
        $siteConf = $configContents ?: $this->getSiteConfigFileContents($site);

        if (empty($siteConf)) {
            return null;
        }

        $host = null;
        if (preg_match('~proxy_pass\s+(?<host>https?://.*)\s*;~', $siteConf, $patterns)) {
            $host = trim($patterns['host']);
        }

        return $host;
    }

    /**
     * Get the contents of the configuration for the given site.
     */
    public function getSiteConfigFileContents(string $site, ?string $suffix = null): ?string
    {
        $config = $this->config->read();
        $suffix = $suffix ?: '.'.$config['tld'];
        $file = str_replace($suffix, '', $site).$suffix;

        return $this->files->exists($this->nginxPath($file)) ? $this->files->get($this->nginxPath($file)) : null;
    }

    /**
     * Get all certificates from config folder.
     */
    public function getCertificates(?string $path = null): Collection
    {
        $path = $path ?: $this->certificatesPath();

        $this->files->ensureDirExists($path, user());

        $config = $this->config->read();

        return collect($this->files->scandir($path))->filter(function ($value, $key) {
            return ends_with($value, '.crt');
        })->map(function ($cert) use ($config) {
            $certWithoutSuffix = substr($cert, 0, -4);
            $trimToString = '.';

            // If we have the cert ending in our tld strip that tld specifically
            // if not then just strip the last segment for  backwards compatibility.
            if (ends_with($certWithoutSuffix, $config['tld'])) {
                $trimToString .= $config['tld'];
            }

            return substr($certWithoutSuffix, 0, strrpos($certWithoutSuffix, $trimToString));
        })->flip();
    }

    /**
     * Get list of sites and return them formatted
     * Will work for symlink and normal site paths.
     */
    public function getSites(string $path, Collection $certs): Collection
    {
        $config = $this->config->read();

        $this->files->ensureDirExists($path, user());

        return collect($this->files->scandir($path))->mapWithKeys(function ($site) use ($path) {
            $sitePath = $path.'/'.$site;

            if ($this->files->isLink($sitePath)) {
                $realPath = $this->files->readLink($sitePath);
            } else {
                $realPath = $this->files->realpath($sitePath);
            }

            return [$site => $realPath];
        })->filter(function ($path) {
            return $this->files->isDir($path);
        })->map(function ($path, $site) use ($certs, $config) {
            $secured = $certs->has($site);
            $url = ($secured ? 'https' : 'http').'://'.$site.'.'.$config['tld'];
            $phpVersion = $this->getPhpVersion($site.'.'.$config['tld']);

            return [
                'site' => (string)$site,
                'secured' => $secured ? ' X' : '',
                'url' => $url,
                'path' => $path,
                'phpVersion' => $phpVersion,
            ];
        });
    }

    /**
     * Unlink the given symbolic link.
     */
    public function unlink(?string $name = null): string
    {
        $name = $this->getSiteLinkName($name);

        if ($this->files->exists($path = $this->sitesPath($name))) {
            $this->files->unlink($path);
        }

        return $name;
    }

    /**
     * Remove all broken symbolic links.
     */
    public function pruneLinks(): void
    {
        if (! $this->files->isDir(VALET_HOME_PATH)) {
            return;
        }

        $this->files->ensureDirExists($this->sitesPath(), user());

        $this->files->removeBrokenLinksAt($this->sitesPath());
    }

    /**
     * Get the PHP version for the given site.
     */
    public function getPhpVersion(string $url): string
    {
        $defaultPhpVersion = $this->herd->usedPhp();
        $phpVersion = PhpFpm::normalizePhpVersion($this->customPhpVersion($url));
        if (empty($phpVersion)) {
            $phpVersion = PhpFpm::normalizePhpVersion($defaultPhpVersion);
        }

        return $phpVersion;
    }

    /**
     * Resecure all currently secured sites with a fresh configuration.
     *
     * There are only two supported values: tld and loopback
     * And those must be submitted in pairs else unexpected results may occur.
     * eg: both $old and $new should contain the same indexes.
     */
    public function resecureForNewConfiguration(array $old, array $new): void
    {
        if (! $this->files->exists($this->certificatesPath())) {
            return;
        }

        $secured = $this->secured();

        $defaultTld = $this->config->read()['tld'];
        $oldTld = ! empty($old['tld']) ? $old['tld'] : $defaultTld;
        $tld = ! empty($new['tld']) ? $new['tld'] : $defaultTld;

        $defaultLoopback = $this->config->read()['loopback'];
        $oldLoopback = ! empty($old['loopback']) ? $old['loopback'] : $defaultLoopback;
        $loopback = ! empty($new['loopback']) ? $new['loopback'] : $defaultLoopback;

        foreach ($secured as $url) {
            $newUrl = str_replace('.'.$oldTld, '.'.$tld, $url);
            $siteConf = $this->getSiteConfigFileContents($url, '.'.$oldTld);

            if (! empty($siteConf) && strpos($siteConf, '# valet stub: secure.proxy.valet.conf') === 0) {
                // proxy config
                $this->unsecure($url);
                $this->secure(
                    $newUrl,
                    $this->replaceOldLoopbackWithNew(
                        $this->replaceOldDomainWithNew($siteConf, $url, $newUrl),
                        $oldLoopback,
                        $loopback
                    )
                );
            } else {
                // normal config
                $this->unsecure($url);
                $this->secure($newUrl);
            }
        }
    }

    /**
     * Parse Nginx site config file contents to swap old domain to new.
     */
    public function replaceOldDomainWithNew(string $siteConf, string $old, string $new): string
    {
        $lookups = [];
        $lookups[] = '~server_name .*;~';
        $lookups[] = '~error_log .*;~';
        $lookups[] = '~ssl_certificate_key .*;~';
        $lookups[] = '~ssl_certificate .*;~';

        foreach ($lookups as $lookup) {
            preg_match($lookup, $siteConf, $matches);
            foreach ($matches as $match) {
                $replaced = str_replace($old, $new, $match);
                $siteConf = str_replace($match, $replaced, $siteConf);
            }
        }

        return $siteConf;
    }

    /**
     * Parse Nginx site config file contents to swap old loopback address to new.
     */
    public function replaceOldLoopbackWithNew(string $siteConf, string $old, string $new): string
    {
        $shouldComment = $new === VALET_LOOPBACK;

        $lookups = [];
        $lookups[] = '~#?listen .*:80; # valet loopback~';
        $lookups[] = '~#?listen .*:443 ssl http2; # valet loopback~';
        $lookups[] = '~#?listen .*:60; # valet loopback~';

        foreach ($lookups as $lookup) {
            preg_match($lookup, $siteConf, $matches);
            foreach ($matches as $match) {
                $replaced = str_replace($old, $new, $match);

                if ($shouldComment && strpos($replaced, '#') !== 0) {
                    $replaced = '#'.$replaced;
                }

                if (! $shouldComment) {
                    $replaced = ltrim($replaced, '#');
                }

                $siteConf = str_replace($match, $replaced, $siteConf);
            }
        }

        return $siteConf;
    }

    /**
     * Get all of the URLs that are currently secured.
     */
    public function secured(): array
    {
        return collect($this->files->scandir($this->certificatesPath()))
                    ->filter(function ($file) {
                        return ends_with($file, ['.key', '.csr', '.crt', '.conf']);
                    })->map(function ($file) {
                        return str_replace(['.key', '.csr', '.crt', '.conf'], '', $file);
                    })->unique()->values()->all();
    }

    /**
     * Get all of the URLs with expiration dates that are currently secured.
     */
    public function securedWithDates(): array
    {
        return collect($this->secured())->map(function ($site) {

            $filePath = $this->certificatesPath() . DIRECTORY_SEPARATOR . $site . '.crt';

            $fileContent = file_get_contents($filePath);
            $certificate = openssl_x509_read($fileContent);
            $information = openssl_x509_parse($certificate);

            $expiration = (new DateTime())->setTimestamp($information["validTo_time_t"]);

            return [
                'site' => $site,
                'exp' => $expiration
            ];
        })->unique()->values()->all();
    }

    public function isSecured(string $site): bool
    {
        $tld = $this->config->read()['tld'];

        return in_array($site.'.'.$tld, $this->secured());
    }

    public function usedPhpVersion($sitePath)
    {
        $phpVersion = Site::customPhpVersion(
            Site::host($sitePath).'.'.$this->config->read()['tld']
        );

        if (! $phpVersion) {
            $phpVersion = Site::phpRcVersion(basename($sitePath));
        }

        if (! $phpVersion) {
            $phpVersion = $this->herd->getPhpExecutableVersion($this->herd->getPhpExecutablePath($phpVersion));
        }

        if (!str_contains($phpVersion, '.')) {
            $phpVersion = $phpVersion[0].'.'.$phpVersion[1];
        }

        return $phpVersion;
    }

    public function usedServices(string $sitePath): array
    {
        if (! $this->files->exists($sitePath.'/.env')) {
            return [];
        }

        $env = $this->files->get($sitePath.'/.env');
        $services = [];
        $database = preg_match('/DB_CONNECTION=(.*)/', $env, $matches) ? $matches[1] : null;
        $usesRedis = strstr($env, 'QUEUE_CONNECTION=redis') || strstr($env, 'BROADCAST_DRIVER=redis') || strstr($env, 'CACHE_DRIVER=redis');
        if ($usesRedis) {
            $services[] = 'redis';
        }

        $scoutDriver = preg_match('/SCOUT_DRIVER=(.*)/', $env, $matches) ? $matches[1] : null;
        if ($scoutDriver === 'typesense') {
            $services[] = 'typesense';
        } elseif ($scoutDriver === 'meilisearch') {
            $services[] = 'meilisearch';
        }

        if ($database === 'pgsql') {
            $services[] = 'postgresql:16';
        }
        if ($database === 'mysql') {
            $services[] = 'mysql';
        }

        return array_filter($services);
    }

    public function usesRedis(string $sitePath): bool
    {
        if (! $this->files->exists($sitePath.'/.env')) {
            return false;
        }

        $env = $this->files->get($sitePath.'/.env');
        return strstr($env, 'QUEUE_CONNECTION=redis') || strstr($env, 'BROADCAST_DRIVER=redis') || strstr($env, 'CACHE_DRIVER=redis');
    }

    /**
     * Secure the given host with TLS.
     *
     * @param  string|null  $siteConf  pregenerated Nginx config file contents
     * @param  int  $certificateExpireInDays  The number of days the self signed certificate is valid.
     *                                        Certificates SHOULD NOT have a validity period greater than 397 days.
     * @param  int  $caExpireInYears  The number of years the self signed certificate authority is valid.
     *
     * @see https://github.com/cabforum/servercert/blob/main/docs/BR.md
     */
    public function secure(string $url, ?string $siteConf = null, int $certificateExpireInDays = 396, int $caExpireInYears = 20): void
    {
        // Extract in order to later preserve custom PHP version config when securing
        $phpVersion = $this->customPhpVersion($url);

        $this->unsecure($url);

        $this->files->ensureDirExists($this->caPath(), user());

        $this->files->ensureDirExists($this->certificatesPath(), user());

        $this->files->ensureDirExists($this->nginxPath(), user());

        $caExpireInDate = (new \DateTime())->diff(new \DateTime("+{$caExpireInYears} years"));

        $this->createCa($caExpireInDate->format('%a'));

        $this->createCertificate($url, $certificateExpireInDays);

        $siteConf = $this->buildSecureNginxServer($url, $siteConf);

        // If the user had isolated the PHP version for this site, swap out .sock file
        if ($phpVersion) {
            $siteConf = $this->replaceSockFile($siteConf, $phpVersion);
        }

        $this->files->putAsUser($this->nginxPath($url), $siteConf);
    }

    private function removeCertScript()
    {
        $script = '$storeType = $args[0]  # "Root" or "CA"' . "\r\n";
        $script .= '$certPath = $args[1]   # Path to the certificate file' . "\r\n\r\n";
        $script .= 'certutil -delstore "$storeType" "$certPath"';

        $filename = tempnam(sys_get_temp_dir(), 'remove-cert.ps1').'.ps1';

        $this->files->put($filename, $script);

        return $filename;
    }

    private function trustCertScript()
    {
        $script = '$storeType = $args[0]  # "Root" or "CA"' . "\r\n";
        $script .= '$certPath = $args[1]   # Path to the certificate file' . "\r\n\r\n";
        $script .= 'certutil -addstore "$storeType" "$certPath"';

        $filename = tempnam(sys_get_temp_dir(), 'trust-cert.ps1').'.ps1';

        $this->files->put($filename, $script);

        return $filename;
    }

    private function checkTrustCertScript()
    {
        $script = <<<'POWERSHELL'
param (
    [string]$certPath
)
# Check if the file exists
if (-Not (Test-Path $certPath)) {
    Write-Output $false
    exit 1
}
# Import the certificate from the file
try {
    $cert = Get-PfxCertificate -FilePath $certPath -ErrorAction Stop
} catch {
    try {
        $cert = Get-PfxCertificate -FilePath $certPath -Password (ConvertTo-SecureString -String "" -AsPlainText -Force) -ErrorAction Stop
    } catch {
        Write-Output $false
        exit 1
    }
}
# Get all certificates in the Root store
$rootCerts = Get-ChildItem Cert:\LocalMachine\Root -ErrorAction SilentlyContinue
$rootCerts += Get-ChildItem Cert:\CurrentUser\Root -ErrorAction SilentlyContinue
# Check if the certificate's thumbprint exists in the Root store
$found = $rootCerts | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if ($found) {
    Write-Output $true
} else {
    Write-Output $false
}
exit
POWERSHELL;

        $filename = tempnam(sys_get_temp_dir(), 'check-trust-cert') . '.ps1';

        $this->files->put($filename, $script);

        return $filename;
    }

    /**
     * Check if the CA certificate is trusted.
     *
     * @param string $caPemPath Path to the CA certificate file
     */
    public function checkCaTrust($caPemPath)
    {
        $script = $this->checkTrustCertScript();

        $escapedScriptPath = escapeshellarg($script);
        $escapedCertPath = escapeshellarg($caPemPath);

        $command = "PowerShell -NoProfile -ExecutionPolicy Bypass -File $escapedScriptPath $escapedCertPath";

        $output = $this->cli->powershellReturns($command);

        unlink($script);

        if (str_contains($output, "True")) {
            return true;
        }

        return false;
    }

    /**
     * Check if the CA certificate is expired.
     *
     * @param string $caPemPath Path to the CA certificate file
     * @return bool True if the CA certificate is valid, false otherwise
     */
    public function checkCaExpiration(string $caPemPath)
    {
        $ca = new X509();
        $ca->loadX509(file_get_contents($caPemPath));
        return $ca->validateDate();
    }


    /**
     * If CA and root certificates are nonexistent, crete them and trust the root cert.
     *
     * @return void
     */
    public function createCa(int $caExpireInDays)
    {
        $caPemPath = $this->caPath('LaravelValetCASelfSigned.crt');
        $caKeyPath = $this->caPath('LaravelValetCASelfSigned.key');

        if ($this->files->exists($caKeyPath) && $this->files->exists($caPemPath)) {
            $result = $this->checkCaTrust($caPemPath);

            if ($result === false) {
                $this->trustCa($caPemPath);
            }

            $isValid = $this->checkCaExpiration($caPemPath);
            if ($isValid) {
                return;
            } else {
                info('Your root certificate is expired. Generating a new one...');
                info('You will need to re-secure your existing secured sites using `herd secure`.');
            }
        }

        $oName = 'Laravel Valet CA Self Signed Organization';
        $cName = 'Laravel Valet CA Self Signed CN';

        if ($this->files->exists($caKeyPath)) {
            $this->files->unlink($caKeyPath);
        }
        if ($this->files->exists($caPemPath)) {
            $this->files->unlink($caPemPath);
        }

        $script = $this->removeCertScript();
        $script = str_replace('/', '\\', $script);

        $command = sprintf('Start-Process PowerShell -ArgumentList \'-NoProfile -ExecutionPolicy Bypass -File "%s" "%s" "%s"\' -Verb RunAs -WindowStyle Hidden', $script, 'Root', $cName);
        $this->cli->powershell($command, function ($output) {
            error("Failed to trust certificate: $output");
        });

        $CAPrivKey = RSA::createKey()->withPadding(RSA::ENCRYPTION_PKCS1 | RSA::SIGNATURE_PKCS1);
        $CAPubKey = $CAPrivKey->getPublicKey();

        $CASubject = new X509;
        $CASubject->setDNProp('emailaddress', 'rootcertificate@laravel.valet');
        $CASubject->setDNProp('ou', 'Developers');
        $CASubject->setDNProp('cn', $cName);
        $CASubject->setDNProp('o', $oName);
        $CASubject->setPublicKey($CAPubKey);
        $CASubject->setEndDate(new DateTime('+'.$caExpireInDays.' days'));

        $CAIssuer = new X509;
        $CAIssuer->setPrivateKey($CAPrivKey);
        $CAIssuer->setDN($CASubject->getDN());
        $CAIssuer->setEndDate(new DateTime('+'.$caExpireInDays.' days'));

        $x509 = new X509;
        $x509->makeCA();
        $x509->setEndDate(new DateTime('+'.$caExpireInDays.' days'));
        $result = $x509->sign($CAIssuer, $CASubject);

        $CAPem = $x509->saveX509($result);

        $this->files->putAsUser($caPemPath, $CAPem);
        $this->files->putAsUser($caKeyPath, $CAPrivKey);

        $this->trustCa($caPemPath);
    }


    /**
     * If CA and root certificates exist, remove them.
     */
    public function removeCa(): void
    {
        foreach (['pem', 'key', 'srl'] as $ending) {
            $path = $this->caPath('LaravelValetCASelfSigned.'.$ending);

            if ($this->files->exists($path)) {
                $this->files->unlink($path);
            }
        }

        $cName = 'Laravel Valet CA Self Signed CN';

        $this->cli->run(sprintf(
            'sudo /usr/bin/security delete-certificate -c "%s" /Library/Keychains/System.keychain',
            $cName
        ));
    }

    /**
     * Create and trust a certificate for the given URL.
     *
     * @param  int  $caExpireInDays  The number of days the self signed certificate is valid.
     */
    public function createCertificate(string $url, int $caExpireInDays): void
    {
        $keyPath = $this->certificatesPath($url, 'key');
        $csrPath = $this->certificatesPath($url, 'csr');
        $crtPath = $this->certificatesPath($url, 'crt');
        $caPemPath = $this->caPath('LaravelValetCASelfSigned.crt');
        $caKeyPath = $this->caPath('LaravelValetCASelfSigned.key');

        $this->createPrivateKey($keyPath);
        $this->createSigningRequest($url, $keyPath, $csrPath);
        $this->createSignedCertificate($keyPath, $csrPath, $crtPath, $caPemPath, $caKeyPath);


        // $this->trustCertificate($crtPath);
        $this->appendCertificateToCaCerts($crtPath, $url);
    }

    /**
     * Create the private key for the TLS certificate.
     */
    public function createPrivateKey(string $keyPath): void
    {
        /** @var \phpseclib3\Crypt\RSA\PrivateKey */
        $key = RSA::createKey();

        $this->files->putAsUser($keyPath, $key->toString('PKCS1'));
    }

    /**
     * Create the signing request for the TLS certificate.
     */
    public function createSigningRequest(string $url, string $keyPath, string $csrPath): void
    {
        /** @var \phpseclib3\Crypt\RSA\PrivateKey */
        $privKey = RSA::load($this->files->get($keyPath));

        $x509 = new X509();
        $x509->setPrivateKey($privKey);
        $x509->setDNProp('commonname', $url);

        $x509->loadCSR($x509->saveCSR($x509->signCSR()));

        $x509->setExtension('id-ce-subjectAltName', [
            ['dNSName' => $url],
            ['dNSName' => "*.$url"],
        ]);

        $x509->setExtension('id-ce-keyUsage', [
            'digitalSignature',
            'nonRepudiation',
            'keyEncipherment',
        ]);

        $csr = $x509->saveCSR($x509->signCSR());

        $this->files->putAsUser($csrPath, $csr);
    }

    /**
     * Create the signed TLS certificate.
     *
     * @param  string  $keyPath
     * @param  string  $csrPath
     * @param  string  $crtPath
     * @param  string  $caPemPath
     * @param  string  $caKeyPath
     * @return void
     */
    public function createSignedCertificate(string $keyPath, string $csrPath, string $crtPath, string $caPemPath, string $caKeyPath)
    {
        /** @var \phpseclib3\Crypt\RSA\PrivateKey */
        $privKey = RSA::load($this->files->get($keyPath));
        $privKey = $privKey->withPadding(RSA::SIGNATURE_PKCS1);

        $subject = new X509();
        $subject->loadCSR($this->files->get($csrPath));
        $subject->setPublicKey($privKey->getPublicKey());

        $subject->setDNProp('emailaddress', 'valet');
        $subject->setDNProp('ou', 'Valet');
        $subject->setDNProp('l', 'Valet');
        $subject->setDNProp('o', 'Valet');
        $subject->setDNProp('st', 'MN');
        $subject->setDNProp('c', 'US');

        $ca = new X509();
        $ca->loadX509($this->files->get($caPemPath));

        $caPrivKey = RSA::load($this->files->get($caKeyPath))->withPadding(RSA::ENCRYPTION_PKCS1 | RSA::SIGNATURE_PKCS1);

        $issuer = new X509();
        $issuer->setPrivateKey($caPrivKey);
        $issuer->setDN($ca->getIssuerDN());

        $x509 = new X509();

        $result = $x509->sign($issuer, $subject);
        $certificate = $x509->saveX509($result);

        $this->files->putAsUser($crtPath, $certificate);
    }

    /**
     * Trust the given root certificate file in the Windows Certmgr.
     *
     * @param  string  $pemPath
     * @return void
     */
    public function trustCa($caPemPath)
    {
        $script = $this->trustCertScript();
        $script = str_replace('/', '\\', $script);
        $command = sprintf('Start-Process PowerShell -ArgumentList \'-NoProfile -ExecutionPolicy Bypass -File "%s" "%s" "%s"\' -Verb RunAs -WindowStyle Hidden', $script, 'Root', $caPemPath);

        $this->cli->powershell($command, function ($code, $output) {
            error("Failed to trust certificate: $output");
        });
    }

    /**
     * Trust the given certificate file in the Windows Certmgr.
     *
     * @param  string  $crtPath
     * @return void
     */
    public function trustCertificate(string $crtPath)
    {
        $script = $this->trustCertScript();
        $script = str_replace('/', '\\', $script);

        $command = sprintf('Start-Process PowerShell -ArgumentList \'-NoProfile -ExecutionPolicy Bypass -File "%s" "%s" "%s"\' -Verb RunAs -WindowStyle Hidden', $script, 'CA', $crtPath);

        $this->cli->powershell($command, function ($code, $output) {
            error("Failed to trust certificate: $output");
        });
    }

    public function appendCertificateToCaCerts(string $crtPath, string $url): void
    {
        $caCerts = HERD_HOME_PATH.'/config/php/cacert.pem';
        $certificate = file_get_contents($crtPath);
        $certificate = PHP_EOL . "Herd {$url}".PHP_EOL."==================================".PHP_EOL.$certificate;

        file_put_contents($caCerts, $certificate, FILE_APPEND);
    }

    /**
     * Build the SSL config for the given URL.
     */
    public function buildCertificateConf(string $path, string $url): void
    {
        $config = str_replace('VALET_DOMAIN', $url, $this->files->getStub('openssl.conf'));
        $this->files->putAsUser($path, $config);
    }

    /**
     * Build the TLS secured Nginx server for the given URL.
     */
    public function buildSecureNginxServer(string $url, ?string $siteConf = null): string
    {
        if ($siteConf === null) {
            $siteConf = $this->replaceOldLoopbackWithNew(
                $this->files->getStub('secure.valet.conf'),
                'VALET_LOOPBACK',
                $this->valetLoopback()
            );
        }

        return str_replace(
            ['HERD_HOME_PATH', 'HERD_VALET_PATH', 'VALET_STATIC_PREFIX', 'VALET_SITE', 'VALET_CERT', 'VALET_KEY'],
            [
                HERD_HOME_PATH,
                $this->herd->valetPath(),
                VALET_STATIC_PREFIX,
                $url,
                $this->certificatesPath($url, 'crt'),
                $this->certificatesPath($url, 'key'),
            ],
            $siteConf
        );
    }

    /**
     * Create new nginx config or modify existing nginx config to isolate this site
     * to a custom version of PHP.
     */
    public function isolate(string $valetSite, string $phpVersion): void
    {
        if ($this->files->exists($this->nginxPath($valetSite))) {
            // Modify the existing config if it exists (likely because it's secured)
            $siteConf = $this->files->get($this->nginxPath($valetSite));
            $siteConf = $this->replaceSockFile($siteConf, $phpVersion);
        } else {
            $siteConf = str_replace(
                ['HERD_HOME_PATH', 'HERD_VALET_PATH', 'VALET_STATIC_PREFIX', 'VALET_SITE', 'VALET_PHP_FPM_SOCKET', 'VALET_ISOLATED_PHP_VERSION'],
                [HERD_HOME_PATH, $this->herd->valetPath(), VALET_STATIC_PREFIX, $valetSite, PhpFpm::nginxSockName($phpVersion), $phpVersion],
                $this->replaceLoopback($this->files->getStub('site.valet.conf'))
            );
        }

        $this->files->ensureDirExists(dirname($this->nginxPath($valetSite)));
        $this->files->putAsUser($this->nginxPath($valetSite), $siteConf);
    }

    public function isIsolated(string $valetSite): bool
    {
        $tld = $this->config->read()['tld'];

        try {
            $siteLink = $valetSite.'.'.$tld;
            if(! $this->files->exists($this->nginxPath($siteLink))) {
                return false;
            }
            $siteConf = $this->files->get($this->nginxPath($siteLink));
            return strpos($siteConf, 'ISOLATED_PHP_VERSION') !== false;
        }
        catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Remove PHP Version isolation from a specific site.
     */
    public function removeIsolation(string $valetSite): void
    {
        // If a site has an SSL certificate, we need to keep its custom config file, but we can
        // just re-generate it without defining a custom `valet.sock` file
        if ($this->files->exists($this->certificatesPath($valetSite, 'crt'))) {
            $siteConf = $this->buildSecureNginxServer($valetSite);
            $this->files->putAsUser($this->nginxPath($valetSite), $siteConf);
        } else {
            // When site doesn't have SSL, we can remove the custom nginx config file to remove isolation
            $this->files->unlink($this->nginxPath($valetSite));
        }
    }

    /**
     * Unsecure the given URL so that it will use HTTP again.
     */
    public function unsecure(string $url): void
    {
        // Extract in order to later preserve custom PHP version config when unsecuring. Example output: "74"
        $phpVersion = $this->customPhpVersion($url);

        if ($this->files->exists($this->certificatesPath($url, 'crt'))) {
            $this->files->unlink($this->nginxPath($url));

            $this->files->unlink($this->certificatesPath($url, 'key'));
            $this->files->unlink($this->certificatesPath($url, 'csr'));
            $this->files->unlink($this->certificatesPath($url, 'crt'));
        }

        // If the user had isolated the PHP version for this site, swap out .sock file
        if ($phpVersion) {
            $this->isolate($url, $phpVersion);
        }
    }

    /**
     * Un-secure all sites.
     */
    public function unsecureAll(): void
    {
        $tld = $this->config->read()['tld'];

        $secured = $this->parked()
            ->merge($this->links())
            ->sort()
            ->where('secured', ' X');

        if ($secured->count() === 0) {
            info('No sites to unsecure. You may list all servable sites or links by running <comment>valet parked</comment> or <comment>valet links</comment>.');

            return;
        }

        info('Attempting to unsecure the following sites:');
        table(['Site', 'SSL', 'URL', 'Path'], $secured->toArray());

        foreach ($secured->pluck('site') as $url) {
            $this->unsecure($url.'.'.$tld);
        }

        $remaining = $this->parked()
            ->merge($this->links())
            ->sort()
            ->where('secured', ' X');
        if ($remaining->count() > 0) {
            warning('We were not succesful in unsecuring the following sites:');
            table(['Site', 'SSL', 'URL', 'Path'], $remaining->toArray());
        }
        info('unsecure --all was successful.');
    }

    /**
     * Build the Nginx proxy config for the specified domain.
     *
     * @param  string  $url  The domain name to serve
     * @param  string  $host  The URL to proxy to, eg: http://127.0.0.1:8080
     */
    public function proxyCreate(string $url, string $host, bool $secure = false): void
    {
        if (! preg_match('~^https?://.*$~', $host)) {
            throw new \InvalidArgumentException(sprintf('"%s" is not a valid URL', $host));
        }

        $tld = $this->config->read()['tld'];
        if (! ends_with($url, '.'.$tld)) {
            $url .= '.'.$tld;
        }

        $siteConf = $this->replaceOldLoopbackWithNew(
            $this->files->getStub($secure ? 'secure.proxy.valet.conf' : 'proxy.valet.conf'),
            'VALET_LOOPBACK',
            $this->valetLoopback()
        );

        if($secure) {
            $siteConf = str_replace(
                ['HERD_HOME_PATH', 'HERD_VALET_PATH', 'VALET_STATIC_PREFIX', 'VALET_SITE', 'VALET_CERT', 'VALET_KEY', 'VALET_PROXY_HOST'],
                [
                    HERD_HOME_PATH,
                    $this->herd->valetPath(),
                    VALET_STATIC_PREFIX,
                    $url,
                    $this->certificatesPath($url, 'crt'),
                    $this->certificatesPath($url, 'key'),
                    $host
                ],
                $siteConf
            );
        }
        else {
            $siteConf = str_replace(
                ['HERD_HOME_PATH', 'HERD_VALET_PATH', 'VALET_STATIC_PREFIX', 'VALET_SITE', 'VALET_PROXY_HOST'],
                [HERD_HOME_PATH, $this->herd->valetPath(), VALET_STATIC_PREFIX, $url, $host],
                $siteConf
            );
        }


        if ($secure) {
            $this->secure($url, $siteConf);
        } else {
            $this->put($url, $siteConf);
        }

        $protocol = $secure ? 'https' : 'http';

        $folderName = str_replace('.'.$tld, '', $url);
        $proxyFolder = $this->herd->proxiesPath();
        mkdir($proxyFolder . DIRECTORY_SEPARATOR . $folderName);

        info('Herd will now proxy ['.$protocol.'://'.$url.'] traffic to ['.$host.'].');
    }

    /**
     * Unsecure the given URL so that it will use HTTP again.
     */
    public function proxyDelete(string $url): void
    {
        $tld = $this->config->read()['tld'];
        if (! ends_with($url, '.'.$tld)) {
            $url .= '.'.$tld;
        }

        $this->unsecure($url);
        $this->files->unlink($this->nginxPath($url));

        $folderName = str_replace('.'.$tld, '', $url);
        $proxyFolder = $this->herd->proxiesPath();

        if (is_dir($proxyFolder . DIRECTORY_SEPARATOR . $folderName)) {
            rmdir($proxyFolder . DIRECTORY_SEPARATOR . $folderName);
        }

        info('Herd will no longer proxy [https://'.$url.'].');
    }

    /**
     * Create the given nginx host.
     */
    public function put(string $url, string $siteConf): void
    {
        $this->unsecure($url);

        $this->files->ensureDirExists($this->nginxPath(), user());

        $this->files->putAsUser(
            $this->nginxPath($url), $siteConf
        );
    }

    /**
     * Remove old loopback interface alias and add a new one if necessary.
     */
    public function aliasLoopback(string $oldLoopback, string $loopback): void
    {
        if ($oldLoopback !== VALET_LOOPBACK) {
            $this->removeLoopbackAlias($oldLoopback);
        }

        if ($loopback !== VALET_LOOPBACK) {
            $this->addLoopbackAlias($loopback);
        }

        $this->updateLoopbackPlist($loopback);
    }

    /**
     * Remove loopback interface alias.
     */
    public function removeLoopbackAlias(string $loopback): void
    {
        $this->cli->run(sprintf(
            'sudo ifconfig lo0 -alias %s', $loopback
        ));

        info('['.$loopback.'] loopback interface alias removed.');
    }

    /**
     * Add loopback interface alias.
     */
    public function addLoopbackAlias(string $loopback): void
    {
        $this->cli->run(sprintf(
            'sudo ifconfig lo0 alias %s', $loopback
        ));

        info('['.$loopback.'] loopback interface alias added.');
    }

    /**
     * Remove old LaunchDaemon and create a new one if necessary.
     */
    public function updateLoopbackPlist(string $loopback): void
    {
        $this->removeLoopbackPlist();

        if ($loopback !== VALET_LOOPBACK) {
            $this->files->put(
                $this->plistPath(),
                str_replace(
                    'VALET_LOOPBACK',
                    $loopback,
                    $this->files->getStub('loopback.plist')
                )
            );

            info('['.$this->plistPath().'] persistent loopback interface alias launch daemon added.');
        }
    }

    /**
     * Remove loopback interface alias launch daemon plist file.
     */
    public function removeLoopbackPlist(): void
    {
        if ($this->files->exists($this->plistPath())) {
            $this->files->unlink($this->plistPath());

            info('['.$this->plistPath().'] persistent loopback interface alias launch daemon removed.');
        }
    }

    /**
     * Remove loopback interface alias and launch daemon plist file for uninstall purpose.
     */
    public function uninstallLoopback(): void
    {
        if (($loopback = $this->valetLoopback()) !== VALET_LOOPBACK) {
            $this->removeLoopbackAlias($loopback);
        }

        $this->removeLoopbackPlist();
    }

    /**
     * Return Valet home path constant.
     */
    public function valetHomePath(): string
    {
        return VALET_HOME_PATH;
    }

    /**
     * Return Valet loopback configuration.
     */
    public function valetLoopback(): string
    {
        return $this->config->read()['loopback'];
    }

    /**
     * Get the path to loopback LaunchDaemon.
     */
    public function plistPath(): string
    {
        return '/Library/LaunchDaemons/com.laravel.valet.loopback.plist';
    }

    /**
     * Get the path to Nginx site configuration files.
     */
    public function nginxPath(?string $additionalPath = null): string
    {
        return $this->valetHomePath().'/Nginx'.($additionalPath ? '/'.$additionalPath.'.conf' : '');
    }

    /**
     * Get the path to the linked Valet sites.
     */
    public function sitesPath(?string $link = null): string
    {
        return $this->valetHomePath().'/Sites'.($link ? '/'.$link : '');
    }

    /**
     * Get the path to the Valet CA certificates.
     */
    public function caPath(?string $caFile = null): string
    {
        return $this->valetHomePath().'/CA'.($caFile ? '/'.$caFile : '');
    }

    /**
     * Get the path to the Valet TLS certificates.
     */
    public function certificatesPath(?string $url = null, ?string $extension = null): string
    {
        $url = $url ? '/'.$url : '';
        $extension = $extension ? '.'.$extension : '';

        return $this->valetHomePath().'/Certificates'.$url.$extension;
    }

    /**
     * Make the domain name based on parked domains or the internal TLD.
     */
    public function domain(?string $domain): string
    {
        // if ($this->parked()->pluck('site')->contains($domain)) {
        //     return $domain;
        // }

        // if ($parked = $this->parked()->where('path', getcwd())->first()) {
        //     return $parked['site'];
        // }

        // Don't add .TLD if user already passed the string in with the TLD on the end
        if ($domain && str_contains($domain, '.'.$this->config->read()['tld'])) {
            return $domain;
        }

        // Return either the passed domain, or the current folder name, with .TLD appended
        return ($domain ?: $this->host(getcwd())).'.'.$this->config->read()['tld'];
    }

    /**
     * Replace Loopback configuration line in Valet site configuration file contents.
     */
    public function replaceLoopback(string $siteConf): string
    {
        $loopback = $this->config->read()['loopback'];

        if ($loopback === VALET_LOOPBACK) {
            return $siteConf;
        }

        $str = '#listen VALET_LOOPBACK:80; # valet loopback';

        return str_replace(
            $str,
            substr(str_replace('VALET_LOOPBACK', $loopback, $str), 1),
            $siteConf
        );
    }

    /**
     * Extract PHP version of exising nginx conifg.
     */
    public function customPhpVersion(string $url): ?string
    {
        if ($this->files->exists($this->nginxPath($url))) {
            $siteConf = $this->files->get($this->nginxPath($url));

            if (starts_with($siteConf, '# '.ISOLATED_PHP_VERSION)) {
                $firstLine = explode("\n", $siteConf)[0];

                return preg_replace("/[^\d]*/", '', $firstLine); // Example output: "74" or "81"
            }
        }

        return null;
    }

    /**
     * Replace .sock file in an Nginx site configuration file contents.
     */
    public function replaceCgiPortNumber(string $siteConf, string $phpVersion): string
    {
        $cgiPortNumber = PhpFpm::cgiPortNumber($phpVersion);

        $siteConf = preg_replace('/"127.0.0.1:[0-9]*"/', '"127.0.0.1:'.$cgiPortNumber.'"', $siteConf);
        $siteConf = preg_replace('/# '.ISOLATED_PHP_VERSION.'.*\n/', '', $siteConf); // Remove ISOLATED_PHP_VERSION line from config

        return '# '.ISOLATED_PHP_VERSION.'='.$phpVersion.PHP_EOL.$siteConf;
    }


    /**
     * Replace .sock file in an Nginx site configuration file contents.
     */
    public function replaceSockFile(string $siteConf, string $phpVersion): string
    {
        $sockFile = PhpFpm::nginxSockName($phpVersion);

        $siteConf = preg_replace('/\$herd_sock_?[0-9]*/', $sockFile, $siteConf);
        $siteConf = preg_replace('/# '.ISOLATED_PHP_VERSION.'.*\n/', '', $siteConf); // Remove ISOLATED_PHP_VERSION line from config

        return '# '.ISOLATED_PHP_VERSION.'='.$phpVersion.PHP_EOL.$siteConf;
    }

    /**
     * Get configuration items defined in .valetrc for a site.
     */
    public function valetRc(string $siteName, ?string $cwd = null): array
    {
        if ($cwd) {
            $path = $cwd.'/.valetrc';
        } elseif ($site = $this->parked()->merge($this->links())->where('site', $siteName)->first()) {
            $path = data_get($site, 'path').'/.valetrc';
        } else {
            return [];
        }

        if ($this->files->exists($path)) {
            return collect(explode(PHP_EOL, trim($this->files->get($path))))->filter(function ($line) {
                return str_contains($line, '=');
            })->mapWithKeys(function ($item, $index) {
                [$key, $value] = explode('=', $item);

                return [strtolower($key) => $value];
            })->all();
        }

        return [];
    }

    /**
     * Get PHP version from .valetrc or .valetphprc for a site.
     */
    public function phpRcVersion(string $siteName, ?string $cwd = null): ?string
    {
        if ($cwd) {
            $oldPath = $cwd.'/.valetphprc';
        } elseif ($site = $this->parked()->merge($this->links())->where('site', $siteName)->first()) {
            $oldPath = data_get($site, 'path').'/.valetphprc';
        } else {
            return null;
        }

        if ($this->files->exists($oldPath)) {
            return PhpFpm::normalizePhpVersion(trim($this->files->get($oldPath)));
        }

        $valetRc = $this->valetRc($siteName, $cwd);

        return PhpFpm::normalizePhpVersion(data_get($valetRc, 'php'));
    }
}
