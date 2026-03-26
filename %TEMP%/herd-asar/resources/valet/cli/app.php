<?php

use Illuminate\Container\Container;
use Silly\Application;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\Console\Event\ConsoleCommandEvent;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\ConfirmationQuestion;
use Symfony\Component\EventDispatcher\EventDispatcher;
use Valet\Drivers\ValetDriver;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;
use function Valet\ends_with;
use function Valet\info;
use function Valet\output;
use function Valet\table;
use function Valet\warning;
use function Valet\writer;
use function Valet\retry;
use function Laravel\Prompts\form;

use Valet\Manifest;
use Valet\Path;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Create the application.
 */
Container::setInstance(new Container);

$version = Herd::version();

$app = new Application('Herd', $version);

$app->setDispatcher($dispatcher = new EventDispatcher());

$dispatcher->addListener(
    ConsoleEvents::COMMAND,
    function (ConsoleCommandEvent $event) {
        writer($event->getOutput());
    }
);

/**
 * Most commands are available only if valet is installed.
 */
if (is_dir(VALET_HOME_PATH) && $version != '') {
    /**
     * Upgrade helper: ensure the tld config exists and the loopback config exists.
     */
    if (empty(Configuration::read()['tld']) || empty(Configuration::read()['loopback'])) {
        Configuration::writeBaseConfiguration();
    }


    $app->command('init:fresh', function (InputInterface $input, OutputInterface $output) {
        CommandLine::configurePrompts($input, $output);

        if(Manifest::exists() && !Manifest::onlyContainsIntegrations()) {
            info('A Herd manifest file already exists. If you continue, the existing file will be overwritten.');
            $overwrite = confirm(
                label: 'Do you want to overwrite the existing Herd manifest file?',
                default: false,
            );

            if(!$overwrite) {
                return;
            }
        }

        // Detect the project name
        $projectName = basename(getcwd());

        // Detect used PHP version
        $phpVersion = Site::usedPhpVersion(getcwd());

        // Detect possible aliases
        $aliases = Site::links()->filter(function ($link) {
            return $link['path'] === getcwd();
        })
            ->reject(function ($link) use ($projectName) {
                return $link['site'] === $projectName;
            })
            ->map(function ($link) {
                return $link['site'];
            })
            ->all();

        // Detect if the project is secured
        $isSecured = Site::isSecured($projectName);
        if (!$isSecured) {
            foreach ($aliases as $alias) {
                if (Site::isSecured($alias)) {
                    $isSecured = true;
                    break;
                }
            }
        }

        $supportedPhpVersions = collect(\Valet\Herd::SUPPORTED_PHP_VERSIONS)->reject(fn ($version) => $version === 'php')->values()->all();

        $usedServices = Site::usedServices(getcwd());

        $availableServicesArray = Herd::availableServices();
        $availableServices = collect($availableServicesArray)->mapWithKeys(function ($service) use (&$usedServices) {
            $serviceKey = $service['type'].':'.$service['version'];

            if (in_array($service['type'], $usedServices)) {
                $usedServices[] = $serviceKey;
                $index = array_search($service['type'], $usedServices);
                unset($usedServices[$index]);
            }

            return [
                $serviceKey => $service['name'] . ' ('.$service['version'].')'
            ];
        });

        CommandLine::configurePrompts($input, $output);

        $data = form()
            ->text(label: 'What is the name of your project?', default: $projectName, name: 'name')
            ->textarea(
                label: 'Do you want to add additional aliases? ',
                default: implode(PHP_EOL, $aliases),
                hint: 'Separate aliases with Enter.',
                name: 'aliases'
            )
            ->select('Which PHP version does your project use?', $supportedPhpVersions, $phpVersion, name: 'php')
            ->confirm('Do you want to serve your project via HTTPS locally?', $isSecured, name: 'secured')
            ->multiselect('Do you want to add additional services?', $availableServices, $usedServices, name: 'services', hint: 'Separate the services by comma.')
            ->submit();

        $availableServices = Herd::availableServices();
        Manifest::fresh($data, $availableServicesArray);

        $missingVariables = Manifest::getMissingEnvironmentVariables($availableServicesArray);

        info('Your Herd manifest file has been created. Run `herd init` to initialize your services and apply the configuration.');

        if (count($missingVariables) > 0) {
            info('Please add the following entries to your .env file:');

            foreach ($missingVariables as $missingVariable) {
                info("\t".$missingVariable['name'].'='.$missingVariable['defaultValue']);
            }
        }
    })->descriptions('Initialize a Herd manifest file');


    $app->command('init [--fresh]', function (InputInterface $input, OutputInterface $output) {

        if($input->getOption('fresh') || !Manifest::exists() || Manifest::onlyContainsIntegrations()) {
            $this->runCommand('init:fresh', $output);
            return;
        }
        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Setting up your project…');
        $output->writeln('');

        CommandLine::configurePrompts($input, $output);

        if (file_exists(getcwd() . '/.env.example') && !Path::hasEnvironment()) {
            $copyEnv = confirm(
                label: 'Do you want to copy the .env.example file to .env?',
                default: true,
            );

            if ($copyEnv) {
                copy(getcwd() . '/.env.example', getcwd() . '/.env');
            }
            $output->writeln('');
        }

        $originalManifest = Manifest::current();
        $manifest = Manifest::complementConfigWithEnv($originalManifest);

        $availableServices = Herd::availableServices();
        Manifest::validate($manifest, $originalManifest, collect($availableServices)->pluck('type')->toArray());

        $projectName = $manifest['name'];

        $aliases = $manifest['aliases'] ?? [];
        $existingLinks = Site::links()->filter(function ($link) {
            return $link['path'] === getcwd();
        })->map(function ($link) {
            return $link['site'];
        })->all();

        $aliases = collect($aliases)
            ->map(function ($alias) {
                foreach (Herd::availableTlds() as $tld) {
                    if (ends_with($alias, '.'.$tld)) {
                        $alias = str_replace('.'.$tld, '', $alias);
                    }
                }

                return $alias;
            })
            ->reject(fn ($alias) => in_array($alias, $existingLinks))
            ->unique();

        $aliases->each(function ($alias) use ($existingLinks) {
            info('Linking project as '.$alias.'.'.Configuration::read()['tld']);
            $this->runCommand('link '.$alias);
            info('');
        });

        // Check if the required PHP version is installed
        if (!Herd::isPHPInstalled($manifest['php'])) {
            $output->writeln('  Installing PHP ' . $manifest['php'] . '…');

            Herd::installPHP($manifest['php']);

            $output->writeln('  <bg=blue;fg=white> INFO </> PHP ' . $manifest['php'] . ' has been installed.');
            $output->writeln('');
        } else {
            $output->writeln('  <bg=blue;fg=white> INFO </> PHP ' . $manifest['php'] . ' is installed.');
            $output->writeln('');
        }


        $phpVersion = Site::usedPhpVersion(getcwd());

        if ($phpVersion != $manifest['php']) {
            $output->writeln('  Isolating PHP ' . $manifest['php'] . '…');
            $output->writeln('');

            if (!$aliases->contains($projectName)) {
                $this->runCommand('isolate '.$manifest['php']);
                $output->writeln('');
            }

            collect($aliases)->each(function ($alias) use ($manifest) {
                $this->runCommand('isolate ' . $manifest['php'] . ' --site ' . $alias);
                info('');
            });

            $output->writeln('  <bg=blue;fg=white> INFO </> PHP ' . $manifest['php'] . ' is isolated.');
            $output->writeln('');
        }

        $isSecured = Site::isSecured($projectName);
        if (!$isSecured) {
            foreach ($aliases as $alias) {
                if (Site::isSecured($alias)) {
                    $isSecured = true;
                    break;
                }
            }
        }

        if ($isSecured && !$manifest['secured']) {

            if (!$aliases->contains($projectName)) {
                $output->writeln('  Unsecuring site '.$projectName.'.test…');
                $this->runCommand('unsecure '.$projectName);
                $output->writeln('');
            }

            collect($aliases)->each(function ($alias) use ($output) {
                $output->writeln('  Unsecuring site ' . $alias . '.test…');
                $this->runCommand('unsecure ' . $alias . ' --silent');
                $output->writeln('');
            });

            $output->writeln('  <bg=blue;fg=white> INFO </> Site is not secured.');
        } elseif (!$isSecured && $manifest['secured']) {
            if (!$aliases->contains($projectName)) {
                $output->writeln('  Securing site '.$projectName.'.test…');
                $this->runCommand('secure '.$projectName);
                $output->writeln('');
            }

            collect($aliases)->each(function ($alias) use ($output) {
                $output->writeln('  Securing site ' . $alias . '.test…');
                $this->runCommand('secure ' . $alias);
                $output->writeln('');
            });

            $output->writeln('  <bg=blue;fg=white> INFO </> Site is secured.');
            $output->writeln('');
        } else {
            if ($isSecured) {
                $output->writeln('  <bg=blue;fg=white> INFO </> Site is secured.');
                $output->writeln('');
            } else {
                $output->writeln('  <bg=blue;fg=white> INFO </> Site is not secured.');
                $output->writeln('');
            }
        }


        $services = $manifest['services'] ?? [];

        foreach ($services as $service => $config) {

            $serviceInstalled = Herd::isExtraServiceInstalled($service, $config['port'], $config['version']);
            if (!$serviceInstalled->ok()) {
                $hint = ". ";
                if($service === 'postgresql') {
                    $hint .= 'This could take a while...';
                }

                $output->writeln('  Installing service ' . ucfirst($service) . $hint);

                $serviceInstallation = Herd::installExtraService($service, $config['port'], $config['version']);
                if ($serviceInstallation->ok()) {
                    $output->writeln('  <bg=blue;fg=white> INFO </> ' . ucfirst($service) . ' is running');
                    $output->writeln('');
                } else {
                    $output->writeln('  <bg=blue;fg=white> ERROR </> ' . ucfirst($service) . ': ' . $serviceInstallation->getErrorMessage());
                    $output->writeln('');
                }
            } else {
                $output->writeln('  '. ucfirst($service) . ' is already installed');

                $serviceRunning = Herd::isExtraServiceRunning($service, $config['port'], $config['version']);
                if (!$serviceRunning->ok()) {
                    $output->writeln('  Starting service ' . ucfirst($service));

                    $serviceStarted = Herd::startExtraService($service, $config['port'], $config['version']);
                    if($serviceStarted->ok()) {
                        $output->writeln('  <bg=blue;fg=white> INFO </> ' . ucfirst($service) . ' is running');
                    }
                    else {
                        $output->writeln('  <bg=blue;fg=white> ERROR </> ' . ucfirst($service) . ' failed to start. ' . $serviceStarted->getErrorMessage());
                    }
                    $output->writeln('');
                } else {
                    $output->writeln('  <bg=blue;fg=white> INFO </> ' . ucfirst($service) . ' is running');
                    $output->writeln('');
                }
            }

        }

        $output->writeln('  <bg=green;fg=black> DONE </> Your application is ready to go!');
        $output->writeln('');
    })->descriptions('Start the services defined in the Herd manifest file, and apply the configuration.');

    /**
     * Get or set the TLD currently being used by Valet.
     */
    $app->command('tld [tld]', function (InputInterface $input, OutputInterface $output, $tld = null) {
        if ($tld === null) {
            return output(Configuration::read()['tld']);
        }

        $helper = $this->getHelperSet()->get('question');
        $question = new ConfirmationQuestion(
            'Using a custom TLD is no longer officially supported and may lead to unexpected behavior. Do you wish to proceed? [y/N]',
            false
        );

        if (false === $helper->ask($input, $output, $question)) {
            return warning('No new Herd tld was set.');
        }

        DnsMasq::updateTld(
            $oldTld = Configuration::read()['tld'],
            $tld = trim($tld, '.')
        );

        Configuration::updateKey('tld', $tld);

        Site::resecureForNewConfiguration(['tld' => $oldTld], ['tld' => $tld]);
        PhpFpm::restart();
        Nginx::restart();

        info('Your Herd TLD has been updated to [' . $tld . '].');
    }, ['domain'])->descriptions('Get or set the TLD used for Herd sites.');

    /**
     * Get or set the loopback address currently being used by Valet.
     */
    $app->command('loopback [loopback]', function (InputInterface $input, OutputInterface $output, $loopback = null) {
        if ($loopback === null) {
            return output(Configuration::read()['loopback']);
        }

        if (filter_var($loopback, FILTER_VALIDATE_IP) === false) {
            return warning('[' . $loopback . '] is not a valid IP address');
        }

        $oldLoopback = Configuration::read()['loopback'];

        Configuration::updateKey('loopback', $loopback);

        DnsMasq::refreshConfiguration();
        Site::aliasLoopback($oldLoopback, $loopback);
        Site::resecureForNewConfiguration(['loopback' => $oldLoopback], ['loopback' => $loopback]);
        PhpFpm::restart();
        Nginx::installServer();
        Nginx::restart();

        info('Your Herd loopback address has been updated to [' . $loopback . ']');
    })->descriptions('Get or set the loopback address used for Herd sites');

    /**
     * Add the current working directory to the paths configuration.
     */
    $app->command('park [path]', function (OutputInterface $output, $path = null) {
        Configuration::addPath($path ?: getcwd());

        info(($path === null ? 'This' : "The [{$path}]") . " directory has been added to Herd's paths.", $output);
    })->descriptions('Register the current working (or specified) directory with Herd');

    /**
     * Get all the current sites within paths parked with 'park {path}'.
     */
    $app->command('parked [--json]', function (OutputInterface $output, $json) {
        $parked = Site::parked();

        if ($json) {
            $links = array_values(Site::links()->all());
            $parked = array_values($parked->all());
            $data = array_merge($parked, $links);

            usort($data, function ($item1, $item2) {
                return $item1['site'] <=> $item2['site'];
            });

            echo json_encode($data);
            return;
        }

        table(['Site', 'SSL', 'URL', 'Path'], $parked->all());
    })->descriptions('Display all the current sites within parked paths');

    /**
     * Remove the current working directory from the paths configuration.
     */
    $app->command('forget [path]', function (OutputInterface $output, $path = null) {
        Configuration::removePath($path ?: getcwd());

        info(($path === null ? 'This' : "The [{$path}]") . " directory has been removed from Herd's paths.");
    }, ['unpark'])->descriptions('Remove the current working (or specified) directory from Herd\'s list of paths');

    /**
     * Register a symbolic link with Valet.
     */
    $app->command('link [name] [--secure] [--isolate=]', function ($name, $secure, $isolate) {
        $name = $name ?: basename(getcwd());
        $tld = Configuration::read()['tld'];

        if(ends_with($name, ".$tld")) {
            $name = str_replace(".$tld", '', $name);
        }

        $linkPath = Site::link(getcwd(), $name);
        info('A ['.$name.'] symbolic link has been created in ['.$linkPath.'].');

        if ($secure) {
            $this->runCommand('secure ' . $name);
        }

        if (Path::hasEnvironment()) {
            $env = file_get_contents(Path::environment());
            preg_match('/^APP_URL=.*$/m', $env, $matches);
            $appUrlFromEnv = $matches[0];
            if (!str_contains($appUrlFromEnv, ".".$tld)) {
                $scheme = $secure ? 'https' : 'http';
                $appUrl = $scheme . '://' . $name . '.' . $tld;

                $env = preg_replace('/^APP_URL=.*$/m', 'APP_URL=' . $appUrl, $env);
                file_put_contents(Path::environment(), $env);

                info('Updated APP_URL in your .env file to ['.$appUrl.']');
            }
        }

        if ($isolate) {
            if (!Herd::isPHPInstalled($isolate)) {
                warning('PHP version ' . $isolate . ' is not installed. Site is not isolated.');
                return;
            }

            retry(20, function () use ($name) {
                $sites = Site::links();
                if (!$sites->has($name)) {
                    throw new Exception('Site not linked yet');
                }
                return true;
            }, 250);

            $this->runCommand('isolate ' . $isolate . ' --site=' . $name);
        }

        if (Path::hasLaravelBoost()) {
            info('Laravel Boost detected, updating boost configuration...');
            $phpBinary = Herd::getPhpExecutablePath($isolate ?? null);
            CommandLine::run('cd "' . getcwd() . '" && "'. $phpBinary .'" artisan boost:update');
            info('Boost configuration updated successfully.');
        }
    })->descriptions('Link the current working directory to Herd', [
        '--secure' => 'Link the site with a trusted TLS certificate.',
        '--isolate' => 'Isolate the site to the PHP version specified, for example 8.3.',
    ]);

    /**
     * Display all of the registered symbolic links.
     */
    $app->command('links', function (OutputInterface $output) {
        $links = Site::links();

        table(['Site', 'SSL', 'URL', 'Path', 'PHP Version'], $links->all());
    })->descriptions('Display all of the registered Herd links');

    /**
     * Unlink a link from the Valet links directory.
     */
    $app->command('unlink [name]', function (OutputInterface $output, $name) {
        $siteName = Site::getSiteLinkName($name);

        if (Site::isIsolated($siteName)) {
            info('Unisolating ' . $siteName . '...');
            PhpFpm::unIsolateDirectory($siteName);
        }

        if (Site::isSecured($siteName)) {
            info('Unsecuring ' . $siteName . '...');
            Site::unsecure(Site::domain($siteName));

            Nginx::restart();
        }

        $siteName = Site::unlink($siteName);
        info('The [' . $siteName . '] symbolic link has been removed.');
    })->descriptions('Remove the specified Herd link');

    /**
     * Secure the given domain with a trusted TLS certificate.
     */
    $app->command('secure [domain] [--expireIn=] [--silent]', function (OutputInterface $output, $domain = null, $expireIn = 368, $silent = null) {
        if ($silent) {
            \Valet\silent();
        }

        $url = Site::domain($domain);

        Site::secure($url, null, $expireIn);

        Nginx::restart();

        info('The [' . $url . '] site has been secured with a fresh TLS certificate.');


        if ($silent) {
            \Valet\silent(false);
        }
    })->descriptions('Secure the given domain with a trusted TLS certificate', [
        '--expireIn' => 'The amount of days the self signed certificate is valid for. Default is set to "368"',
    ]);

    /**
     * Stop serving the given domain over HTTPS and remove the trusted TLS certificate.
     */
    $app->command('unsecure [domain] [--all] [--silent]', function (OutputInterface $output, $domain = null, $all = null, $silent = null) {
        if ($silent) {
            \Valet\silent();
        }
        if ($all) {
            Site::unsecureAll();

            Nginx::restart();

            info('All Herd sites will now serve traffic over HTTP.');
            if ($silent) {
                \Valet\silent(false);
            }

            return;
        }

        $url = Site::domain($domain);

        Site::unsecure($url);

        Nginx::restart();

        info('The [' . $url . '] site will now serve traffic over HTTP.');
    })->descriptions('Stop serving the given domain over HTTPS and remove the trusted TLS certificate');

    /**
     * Display all of the currently secured sites.
     */
    $app->command('secured [--expiring] [--days=]', function (OutputInterface $output, $expiring = null, $days = 60) {
        $now = (new Datetime())->add(new DateInterval('P' . $days . 'D'));
        $sites = collect(Site::securedWithDates())
            ->when($expiring, fn($collection) => $collection->filter(fn($row) => $row['exp'] < $now))
            ->map(function ($row) {
                return [
                    'Site' => $row['site'],
                    'Valid Until' => $row['exp']->format('Y-m-d H:i:s T'),
                ];
            })
            ->when($expiring, fn($collection) => $collection->sortBy('Valid Until'));

        return table(['Site', 'Valid Until'], $sites->all());
    })->descriptions('Display all of the currently secured sites', [
        '--expiring' => 'Limits the results to only sites expiring within the next 60 days.',
        '--days' => 'To be used with --expiring. Limits the results to only sites expiring within the next X days. Default is set to 60.',
    ]);

    /**
     * Create an Nginx proxy config for the specified domain.
     */
    $app->command('proxy domain host [--secure]', function (OutputInterface $output, $domain, $host, $secure) {
        Site::proxyCreate($domain, $host, $secure);
        Nginx::restart();
    })->descriptions('Create an Nginx proxy site for the specified host. Useful for docker, mailhog etc.', [
        '--secure' => 'Create a proxy with a trusted TLS certificate',
    ]);

    /**
     * Delete an Nginx proxy config.
     */
    $app->command('unproxy domain', function (OutputInterface $output, $domain) {
        Site::proxyDelete($domain);
        Nginx::restart();
    })->descriptions('Delete an Nginx proxy config.');

    /**
     * Display all of the sites that are proxies.
     */
    $app->command('proxies', function (OutputInterface $output) {
        $proxies = Site::proxies();

        table(['Site', 'SSL', 'URL', 'Host'], $proxies->all());
    })->descriptions('Display all of the proxy sites');

    /**
     * Display which Valet driver the current directory is using.
     */
    $app->command('which', function (OutputInterface $output) {
        $driver = ValetDriver::assign(getcwd(), basename(getcwd()), '/');

        if ($driver) {
            info('This site is served by [' . get_class($driver) . '].');
        } else {
            warning('Herd could not determine which driver to use for this site.');
        }
    })->descriptions('Display which Herd driver serves the current working directory');


    /**
     * Display site specific information
     */
    $app->command('site-information [path]', function (OutputInterface $output, $path) {

        if($path) {
            $path = realpath($path);
        }
        else {
            $path = getcwd();
        }

        $driver = ValetDriver::assign($path, basename($path), '/');


        if ($driver) {
            $site = basename($path);
            $phpVersion = Site::customPhpVersion(
                Site::host($site) . '.' . Configuration::read()['tld']
            );

            if (!$phpVersion) {
                $phpVersion = Site::phpRcVersion($site);
            }
            $phpBinary = Herd::getPhpExecutablePath($phpVersion);

            $info = $driver->siteInformation($path, $phpBinary);
            output(json_encode($info));
        } else {
            warning('Herd could not determine which driver to use for this site.');
        }
    })->descriptions('Display information about the specified site');


    /**
     * Display all of the registered paths.
     */
    $app->command('paths', function (OutputInterface $output) {
        $paths = Configuration::read()['paths'];

        if (count($paths) > 0) {
            output(json_encode($paths, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            info('No paths have been registered.');
        }
    })->descriptions('Get all of the paths registered with Herd');

    /**
     * Open the current or given directory in the browser.
     */
    $app->command('open [domain]', function (OutputInterface $output, $domain = null) {
        $url = 'http://' . Site::domain($domain);
        CommandLine::run('start ' . $url);
    })->descriptions('Open the site for the current (or specified) directory in your browser');

    /**
     * Open the database for the current or given site, if credentials are found.
     */
    $app->command('db [site]', function (OutputInterface $output, $site = null) {
        $site = $site ?: basename(getcwd());
        Herd::openDatabase($site);
    })->descriptions('Open the database for the current or given site, if credentials are found.', [
        'site' => 'Specify the site to open the database for (e.g. if the site isn\'t linked as its directory name)',
    ]);

    /**
     * Echo the currently tunneled URL.
     */
    $app->command('fetch-share-url [domain]', function ($domain = null) {
        $tool = Configuration::read()['share-tool'] ?? null;

        switch ($tool) {
            default:
                if ($url = Expose::currentTunnelUrl($domain ?: Site::host(getcwd()))) {
                    output($url);
                }
                break;
        }
    })->descriptions('Get the URL to the current share tunnel for Expose');

    $app->command('share', function () {
        // .bat file handles this command
    })
        ->descriptions('Share the current site via an Expose tunnel');


    /**
     * Start the daemon services.
     */
    $app->command('start [service]', function (OutputInterface $output, $service) {
        switch ($service) {
            case '':
                Herd::startAllServices();

                return info('Herd services have been started.');
            case 'dnsmasq':
                DnsMasq::restart();

                return info('dnsmasq has been started.');
            case 'nginx':
                Nginx::restart();

                return info('Nginx has been started.');
            case 'php':
                PhpFpm::restart();

                return info('PHP has been started.');
        }

        return warning(sprintf('Invalid Herd service name [%s]', $service));
    })->descriptions('Start the Herd services');

    /**
     * Open site in IDE
     */
    $app->command('edit [--path=]', function (OutputInterface $output, $path = null) {
        if (! $path) {
            $path = getcwd();
        }

        try {
            Herd::openDefaultIde($path);
        }
        catch(Exception $e) {
            warning($e->getMessage());
        }

    })->descriptions('Open the site in your favorite IDE.');

    /**
     * Open the php.ini in your favorite IDE.
     */
    $app->command('ini [phpVersion] [--debug]', function (OutputInterface $output, $phpVersion, $debug = null) {
        if (! $phpVersion) {
            $phpVersion = Site::customPhpVersion(
                Site::host(getcwd()) . '.' . Configuration::read()['tld']
            );

            if (! $phpVersion) {
                $phpVersion = Site::phpRcVersion(basename(getcwd()));
            }

            if (! $phpVersion) {
                $phpVersion = Herd::usedPhp();
            }
        }

        $phpVersionNormalized = str_replace('.', '', $phpVersion);

        $filename = $debug ? 'debug/debug.ini' : 'php.ini';

        if ($debug) {
            $phpIniFile = realpath(VALET_HOME_PATH . '/../php/' . $phpVersionNormalized . '/debug/debug.ini');
        } else {
            $phpIniFile = realpath(VALET_HOME_PATH . '/../../bin/php' . $phpVersionNormalized . '/php.ini');
        }

        if (! file_exists($phpIniFile)) {
            warning('The php.ini file for ' . $phpVersion . ' does not exist.');
            exit;
        }

        Herd::openDefaultIde($phpIniFile);
    })->descriptions('Open the php.ini in your favorite IDE', [
        'phpVersion' => 'The PHP version you want to use; e.g. 8.3',
    ]);

    /**
     * Restart the daemon services.
     */
    $app->command('restart [service]', function (OutputInterface $output, $service) {
        switch ($service) {
            case '':
                Herd::restartAllServices();

                return info('Herd services have been restarted.');
            case 'dnsmasq':
                DnsMasq::restart();

                return info('dnsmasq has been restarted.');
            case 'nginx':
                Nginx::restart();

                return info('Nginx has been restarted.');
            case 'php':
                PhpFpm::restart();

                return info('PHP has been restarted.');
        }

        return warning(sprintf('Invalid Herd service name [%s]', $service));
    })->descriptions('Restart the Herd services');

    /**
     * Stop the daemon services.
     */
    $app->command('stop [service]', function (OutputInterface $output, $service) {
        switch ($service) {
            case '':
                Herd::stopAllServices();

                return info('Herd services have been stopped.');
            case 'nginx':
                Nginx::stop();

                return info('Nginx has been stopped.');
            case 'dnsmasq':
                DnsMasq::stop();

                return info('Nginx has been stopped.');
            case 'php':
                PhpFpm::stopRunning();

                return info('PHP has been stopped.');
        }

        return warning(sprintf('Invalid Herd service name [%s]', $service));
    })->descriptions('Stop the Herd services');

    /**
     * Allow the user to change the version of php Valet uses.
     */
    $app->command('use [phpVersion]', function (OutputInterface $output, $phpVersion) {
        if (!$phpVersion) {
            $site = basename(getcwd());
            $linkedVersion = Herd::usedPhp();

            if ($phpVersion = Site::phpRcVersion($site, getcwd())) {
                info("Found '{$site}/.valetrc' or '{$site}/.valetphprc' specifying version: {$phpVersion}");
                info("Found '{$site}/.valetphprc' specifying version: {$phpVersion}");
            } else {
                $domain = $site . '.' . data_get(Configuration::read(), 'tld');
                if ($phpVersion = PhpFpm::normalizePhpVersion(Site::customPhpVersion($domain))) {
                    info("Found isolated site '{$domain}' specifying version: {$phpVersion}");
                }
            }

            if (!$phpVersion) {
                return info("Herd is using {$linkedVersion}.");
            }
        }

        PhpFpm::useVersion($phpVersion);
    })->descriptions('Change the version of PHP used by Herd', [
        'phpVersion' => 'The PHP version you want to use; e.g. 8.2',
    ]);

    /**
     * Allow the user to change the version of PHP Herd uses to serve the current site.
     */
    $app->command('isolate [phpVersion] [--site=] [--silent]', function (OutputInterface $output, $phpVersion, $site = null, $silent = null) {
        if ($silent) {
            \Valet\silent();
        }

        if (!$site) {
            $site = basename(getcwd());
        }

        if (is_null($phpVersion)) {
            if ($phpVersion = Site::phpRcVersion($site, getcwd())) {
                info("Found '{$site}/.valetrc' or '{$site}/.valetphprc' specifying version: {$phpVersion}");
            } else {
                info(PHP_EOL . 'Please provide a version number. E.g.:');
                info('herd isolate 8.2');

                return;
            }
        }

        PhpFpm::isolateDirectory($site, $phpVersion);


        if ($silent) {
            \Valet\silent(true);
        }
    })->descriptions('Change the version of PHP used by Herd to serve the current working directory', [
        'phpVersion' => 'The PHP version you want to use; e.g 8.1',
        '--site' => 'Specify the site to isolate (e.g. if the site isn\'t linked as its directory name)',
    ]);

    /**
     * Allow the user to un-do specifying the version of PHP Valet uses to serve the current site.
     */
    $app->command('unisolate [--site=]', function (OutputInterface $output, $site = null) {
        if (!$site) {
            $site = basename(getcwd());
        }

        PhpFpm::unIsolateDirectory($site);
    })->descriptions('Stop customizing the version of PHP used by Herd to serve the current working directory', [
        '--site' => 'Specify the site to un-isolate (e.g. if the site isn\'t linked as its directory name)',
    ]);

    /**
     * List isolated sites.
     */
    $app->command('isolated', function (OutputInterface $output) {
        $sites = PhpFpm::isolatedDirectories();

        table(['Path', 'PHP Version'], $sites->all());
    })->descriptions('List all sites using isolated versions of PHP.');

    /**
     * Get the PHP executable path for a site.
     */
    $app->command('which-php [site]', function (OutputInterface $output, $site) {
        $phpVersion = Site::customPhpVersion(
            Site::host($site ?: getcwd()) . '.' . Configuration::read()['tld']
        );

        if (!$phpVersion) {
            $phpVersion = Site::phpRcVersion($site ?: basename(getcwd()));
        }

        return output(Herd::getPhpExecutablePath($phpVersion));
    })->descriptions('Get the PHP executable path for a given site', [
        'site' => 'The site to get the PHP executable path for',
    ]);

    /**
     * Proxy commands through to an isolated site's version of PHP.
     */
    $app->command('php [--site=] [command]', function (OutputInterface $output, $command) {
        warning('It looks like you are running `cli/valet.php` directly; please use the `valet` script in the project root instead.');
    })->descriptions("Proxy PHP commands with isolated site's PHP executable", [
        'command' => "Command to run with isolated site's PHP executable",
        '--site' => 'Specify the site to use to get the PHP version (e.g. if the site isn\'t linked as its directory name)',
    ]);

    /**
     * Proxy commands through to an isolated site's version of Composer.
     */
    $app->command('composer [--site=] [command]', function (OutputInterface $output, $command) {
        warning('It looks like you are running `cli/valet.php` directly; please use the `valet` script in the project root instead.');
    })->descriptions("Proxy Composer commands with isolated site's PHP executable", [
        'command' => "Composer command to run with isolated site's PHP executable",
        '--site' => 'Specify the site to use to get the PHP version (e.g. if the site isn\'t linked as its directory name)',
    ]);

    $app->command('tinker [--site=]', function (OutputInterface $output, $site = null) {
        if (!$site) {
            $site = basename(getcwd());
        }

        Herd::tinker($site);
    })->descriptions("Run tinker/Tinkerwell", [
        '--site' => 'Specify the site to tinker with (e.g. if the site isn\'t linked as its directory name)'
    ]);

    /**
     * Tail log file.
     */
    $app->command('log [-f|--follow] [-l|--lines=] [key]', function (OutputInterface $output, $follow, $lines, $key = null) {
        $defaultLogs = [
            'php-fpm' => BREW_PREFIX . '/var/log/php-fpm.log',
            'nginx' => VALET_HOME_PATH . '/Log/nginx-error.log',
            'mailhog' => BREW_PREFIX . '/var/log/mailhog.log',
            'redis' => BREW_PREFIX . '/var/log/redis.log',
        ];

        $configLogs = data_get(Configuration::read(), 'logs');
        if (!is_array($configLogs)) {
            $configLogs = [];
        }

        $logs = array_merge($defaultLogs, $configLogs);
        ksort($logs);

        if (!$key) {
            info(implode(PHP_EOL, [
                'In order to tail a log, pass the relevant log key (e.g. "nginx")',
                'along with any optional tail parameters (e.g. "-f" for follow).',
                null,
                'For example: "herd log nginx -f --lines=3"',
                null,
                'Here are the logs you might be interested in.',
                null,
            ]));

            table(
                ['Keys', 'Files'],
                collect($logs)->map(function ($file, $key) {
                    return [$key, $file];
                })->toArray()
            );

            info(implode(PHP_EOL, [
                null,
                'Tip: Set custom logs by adding a "logs" key/file object',
                'to your "' . Configuration::path() . '" file.',
            ]));

            return;
        }

        if (!isset($logs[$key])) {
            return warning('No logs found for [' . $key . '].');
        }

        $file = $logs[$key];
        if (!file_exists($file)) {
            return warning('Log path [' . $file . '] does not (yet) exist.');
        }

        $options = [];
        if ($follow) {
            $options[] = '-f';
        }
        if ((int) $lines) {
            $options[] = '-n ' . (int) $lines;
        }

        $command = implode(' ', array_merge(['tail'], $options, [$file]));

        passthru($command);
    })->descriptions('Tail log file');

    /**
     * Update the Laravel Installer.
     */
    $app->command('laravel:update', function (OutputInterface $output) {
        info('Updating the Laravel Installer...');
        Herd::updateLaravelInstaller();
        info('Laravel Installer has been updated.');
    })->descriptions('Update the Laravel Installer');

    /**
     * Configure or display the directory-listing setting.
     */
    $app->command('directory-listing [status]', function (OutputInterface $output, $status = null) {
        $key = 'directory-listing';
        $config = Configuration::read();

        if (in_array($status, ['on', 'off'])) {
            $config[$key] = $status;
            Configuration::write($config);

            return output('Directory listing setting is now: ' . $status);
        }

        $current = isset($config[$key]) ? $config[$key] : 'off';
        output('Directory listing is ' . $current);
    })->descriptions('Determine directory-listing behavior. Default is off, which means a 404 will display.', [
        'status' => 'on or off. (default=off) will show a 404 page; [on] will display a listing if project folder exists but requested URI not found',
    ]);

    /**
     * List all installed services.
     */
    $app->command('services:list [--json]', function (OutputInterface $output, $json) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        $services = Herd::listInstalledServices();

        if (empty($services)) {
            info('No services installed.');
            return;
        }

        if ($json) {
            echo json_encode(collect($services)->map(function ($service) {
                $service['status'] = $service['status'] === 'active' ? 'running' : 'stopped';
                return $service;
            })->values());
            return;
        }

        $rows = collect($services)->map(function ($service) {
            $status = $service['status'] === 'active' ? 'running' : 'stopped';

            return [
                $service['id'],
                $service['name'],
                $service['type'],
                $service['port'],
                $service['version'],
                $status,
            ];
        })->values()->toArray();

        table(['ID', 'Name', 'Type', 'Port', 'Version', 'Status'], $rows);
    })->descriptions('List all installed services', [
        '--json' => 'Output services as JSON',
    ]);

    /**
     * List all available service types that can be created.
     */
    $app->command('services:available', function (OutputInterface $output) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        $services = Herd::availableServices();

        if (empty($services)) {
            info('No services available.');
            return;
        }

        $rows = collect($services)->map(function ($service) {
            return [
                $service['type'],
                $service['name'],
                $service['version'],
            ];
        })->toArray();

        table(['Type', 'Name', 'Version'], $rows);

        $output->writeln('');
        $output->writeln('  Use "herd services:versions <type>" to see all available versions.');
        $output->writeln('  Use "herd services:create <type>" to create a new service.');
    })->descriptions('List all available service types that can be created');

    /**
     * List all available versions for a service type.
     */
    $app->command('services:versions [type]', function (InputInterface $input, OutputInterface $output, $type = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        if (! $type) {
            $availableServices = Herd::availableServices();

            if (empty($availableServices)) {
                $output->writeln('  <bg=red;fg=white> ERROR </> No services available.');
                return;
            }

            CommandLine::configurePrompts($input, $output);

            $serviceTypes = collect($availableServices)->pluck('name', 'type')->unique()->toArray();

            $type = select(
                label: 'Which service type do you want to see versions for?',
                options: $serviceTypes
            );
        }

        $versions = Herd::serviceVersions($type);

        if (empty($versions)) {
            warning('No versions found for service type "'.$type.'".');
            $output->writeln('');
            $output->writeln('  Use "herd services:available" to see all available service types.');
            return;
        }

        $rows = collect($versions)->map(function ($version) {
            return [
                $version['version'],
                $version['status'],
                $version['default_port'],
            ];
        })->toArray();

        table(['Version', 'Status', 'Default Port'], $rows);

        $output->writeln('');
        $output->writeln('  Use "herd services:create '.$type.' --service-version=<version>" to create a specific version.');
    })->descriptions('List all available versions for a service type', [
        'type' => 'The service type (e.g., mysql, redis, postgresql)',
    ]);

    /**
     * Clone an existing service.
     */
    $app->command('services:clone [identifier] [--name=] [--port=] [--no-start]', function (InputInterface $input, OutputInterface $output, $noStart, $identifier = null, $name = null, $port = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        $services = Herd::listInstalledServices();

        if (empty($services)) {
            $output->writeln('  <bg=red;fg=white> ERROR </> No services installed.');
            return;
        }

        if (! $identifier) {
            CommandLine::configurePrompts($input, $output);

            $identifier = select(
                label: 'Which service do you want to clone?',
                options: collect($services)->mapWithKeys(function ($service) {
                    return [$service['id'] => $service['name'] . ' ('.$service['version'].')'];
                })->toArray()
            );
        }

        $serviceToClone = collect($services)->firstWhere('id', $identifier)
            ?? collect($services)->firstWhere('name', $identifier);

        if (! $serviceToClone) {
            $output->writeln('  <bg=red;fg=white> ERROR </> Service not found.');
            return;
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Cloning service "'.$serviceToClone['name'].'"...');
        $output->writeln('');

        $result = Herd::cloneExtraService($serviceToClone['id'], $name, $port, !$noStart);

        if (($result['installation_status'] ?? '') === 'installed') {
            // If the service is still starting, wait briefly and re-check the actual status
            if (($result['status'] ?? '') === 'starting') {
                sleep(1);
                $services = Herd::listInstalledServices();
                $cloned = collect($services)->firstWhere('name', $result['name']);
                if ($cloned) {
                    $result['status'] = $cloned['status'];
                }
            }

            $output->writeln('  <bg=green;fg=black>      </> Service "'.$serviceToClone['name'].'" cloned successfully!');
            $output->writeln('  <bg=green;fg=black> DONE </> Port: '.$result['port']);
            $output->writeln('  <bg=green;fg=black>      </> Status: '.$result['status']);
            $output->writeln('');
        } else {
            $output->writeln('  <bg=red;fg=white> ERROR </> Failed to clone service "'.$serviceToClone['name'].'".');
            $output->writeln('');
        }
    })->descriptions('Clone an existing service instance', [
        'identifier' => 'The name or UUID of the service to clone',
        '--name' => 'The name for the cloned service',
        '--port' => 'The port for the cloned service',
        '--no-start' => 'Do not start the cloned service automatically',
    ]);

    /**
     * Delete a service and all its data.
     */
    $app->command('services:delete [identifier] [--force]', function (InputInterface $input, OutputInterface $output, $force, $identifier = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        CommandLine::configurePrompts($input, $output);

        $services = Herd::listInstalledServices();

        if (empty($services)) {
            $output->writeln('  <bg=red;fg=white> ERROR </> No services installed.');
            return;
        }

        if (! $identifier) {
            $identifier = select(
                label: 'Which service do you want to delete?',
                options: collect($services)->mapWithKeys(function ($service) {
                    return [$service['id'] => $service['name'] . ' ('.$service['version'].')'];
                })->toArray()
            );
        }

        $serviceToDelete = collect($services)->firstWhere('id', $identifier)
            ?? collect($services)->firstWhere('name', $identifier);

        if (! $serviceToDelete) {
            $output->writeln('  <bg=red;fg=white> ERROR </> Service not found.');
            return;
        }

        if (! $force) {
            $confirmed = confirm(
                label: 'Are you sure you want to delete the service "'.$serviceToDelete['name'].'"? All data will be permanently removed.',
                default: false,
            );

            if (! $confirmed) {
                info('Service deletion cancelled.');
                return;
            }
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Deleting service "'.$serviceToDelete['name'].'"...');
        $output->writeln('');

        $result = Herd::deleteExtraService($serviceToDelete['id']);

        if (($result['status'] ?? '') === 'deleted') {
            $output->writeln('  <bg=green;fg=black> DONE </> Service "'.$result['name'].'" has been deleted.');
            $output->writeln('');
        } else {
            $output->writeln('  <bg=red;fg=white> ERROR </> Failed to delete service.');
            $output->writeln('');
        }
    })->descriptions('Delete a service and all its data', [
        'identifier' => 'The name or UUID of the service to delete',
        '--force' => 'Skip confirmation prompt',
    ]);

    /**
     * Create a new service instance.
     */
    $app->command('services:create [type] [--name=] [--port=] [--service-version=]', function (InputInterface $input, OutputInterface $output, $type = null, $name = null, $port = null, $serviceVersion = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        CommandLine::configurePrompts($input, $output);

        if (! $type) {
            $availableServices = Herd::availableServices();

            if (empty($availableServices)) {
                $output->writeln('  <bg=red;fg=white> ERROR </> No services available.');
                return;
            }

            $serviceTypes = collect($availableServices)->pluck('name', 'type')->unique()->toArray();

            $type = select(
                label: 'Which service type do you want to create?',
                options: $serviceTypes
            );
        }

        $versions = Herd::serviceVersions($type);

        if (! $serviceVersion) {
            if (! empty($versions)) {
                $versionOptions = collect($versions)->pluck('version', 'version')->toArray();

                $serviceVersion = select(
                    label: 'Which version do you want to install?',
                    options: $versionOptions
                );
            } else {
                $output->writeln('  <bg=red;fg=white> ERROR </> No versions available for service type "'.$type.'".');
                return;
            }
        } else {
            // Validate that the provided version exists
            $validVersions = collect($versions)->pluck('version')->toArray();
            if (! empty($validVersions) && ! in_array($serviceVersion, $validVersions)) {
                $output->writeln('  <bg=red;fg=white> ERROR </> Version "'.$serviceVersion.'" is not available for "'.$type.'".');
                $output->writeln('');
                $output->writeln('  Available versions: '.implode(', ', $validVersions));
                return;
            }
        }

        $defaultPort = collect($versions)->firstWhere('version', $serviceVersion)['default_port'] ?? '';

        if (! $port) {
            $port = text(
                label: 'Which port do you want to use?',
                default: $defaultPort,
                hint: 'Press Enter to use the default port'
            );
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Creating service...');
        $output->writeln('');

        $servicePort = $port ?? '';

        $result = Herd::installExtraService($type, $servicePort, $serviceVersion, $name);

        if ($result->ok()) {
            $output->writeln('  <bg=green;fg=black> DONE </> Service created successfully!');
            $output->writeln('');
            $output->writeln('  Port: '.$servicePort);
            $output->writeln('');
        } else {
            $output->writeln('  <bg=red;fg=white> ERROR </> Failed to create service. '.$result->getErrorMessage());
            $output->writeln('');
        }
    })->descriptions('Create a new service instance', [
        'type' => 'The service type (e.g., mysql, redis, postgresql)',
        '--name' => 'The name for the service',
        '--port' => 'The port for the service',
        '--service-version' => 'The version of the service (default: latest)',
    ]);

    /**
     * Start a service.
     */
    $app->command('services:start [identifier]', function (InputInterface $input, OutputInterface $output, $identifier = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        $services = Herd::listInstalledServices();

        if (empty($services)) {
            $output->writeln('  <bg=red;fg=white> ERROR </> No services installed.');
            return;
        }

        if (! $identifier) {
            CommandLine::configurePrompts($input, $output);

            $identifier = select(
                label: 'Which service do you want to start?',
                options: collect($services)->pluck('name', 'id')->toArray()
            );
        }

        $serviceToStart = collect($services)->firstWhere('id', $identifier)
            ?? collect($services)->firstWhere('name', $identifier);

        if (! $serviceToStart) {
            $output->writeln('  <bg=red;fg=white> ERROR </> Service not found.');
            return;
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Starting service "'.$serviceToStart['name'].'"...');
        $output->writeln('');

        $result = Herd::startExtraServiceByIdentifier($serviceToStart['id']);

        // If we got 'starting' status, wait briefly and re-check the actual service status
        if (($result['status'] ?? '') === 'starting') {
            sleep(1);
            $services = Herd::listInstalledServices();
            $service = collect($services)->firstWhere('id', $serviceToStart['id']);
            if ($service) {
                $result['status'] = $service['status'];
            }
        }

        if (($result['status'] ?? '') === 'active') {
            $output->writeln('  <bg=green;fg=black> DONE </> Service "'.$serviceToStart['name'].'" started successfully!');
            $output->writeln('');
        } else {
            $output->writeln('  <bg=red;fg=white> ERROR </> Failed to start service "'.$serviceToStart['name'].'".');
            $output->writeln('');
        }
    })->descriptions('Start a service', [
        'identifier' => 'The name or UUID of the service to start',
    ]);

    /**
     * Stop a service.
     */
    $app->command('services:stop [identifier]', function (InputInterface $input, OutputInterface $output, $identifier = null) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use services.');
            return;
        }

        $services = Herd::listInstalledServices();

        if (empty($services)) {
            $output->writeln('  <bg=red;fg=white> ERROR </> No services installed.');
            return;
        }

        if (! $identifier) {
            CommandLine::configurePrompts($input, $output);

            $identifier = select(
                label: 'Which service do you want to stop?',
                options: collect($services)->pluck('name', 'id')->toArray()
            );
        }

        $serviceToStop = collect($services)->firstWhere('id', $identifier)
            ?? collect($services)->firstWhere('name', $identifier);

        if (! $serviceToStop) {
            $output->writeln('  <bg=red;fg=white> ERROR </> Service not found.');
            return;
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Stopping service "'.$serviceToStop['name'].'"...');
        $output->writeln('');

        $result = Herd::stopExtraService($serviceToStop['id']);

        // If we got a non-inactive status, wait briefly and re-check
        if (($result['status'] ?? '') !== 'inactive') {
            sleep(1);
            $services = Herd::listInstalledServices();
            $service = collect($services)->firstWhere('id', $serviceToStop['id']);
            if ($service) {
                $result['status'] = $service['status'];
            }
        }

        if (($result['status'] ?? '') === 'inactive') {
            $output->writeln('  <bg=green;fg=black> DONE </> Service "'.$serviceToStop['name'].'" stopped successfully!');
            $output->writeln('');
        } else {
            $output->writeln('  <bg=red;fg=white> ERROR </> Failed to stop service "'.$serviceToStop['name'].'".');
            $output->writeln('');
        }
    })->descriptions('Stop a service', [
        'identifier' => 'The name or UUID of the service to stop',
    ]);

    /**
     * List all PHP versions with their status.
     */
    $app->command('php:list [--json]', function (OutputInterface $output, $json) {
        $versions = Herd::phpVersions();

        if (empty($versions)) {
            info('No PHP versions found.');
            return;
        }

        $globalVersion = Herd::usedPhp();

        if ($json) {
            echo json_encode(collect($versions)->map(function ($version) use ($globalVersion) {
                return [
                    'version' => $version['cycle'],
                    'installed' => $version['installed'] === true || $version['installed'] === 'true',
                    'updateAvailable' => $version['updateAvailable'] === true || $version['updateAvailable'] === 'true',
                    'global' => $version['cycle'] === $globalVersion,
                ];
            })->values());
            return;
        }

        $rows = collect($versions)->map(function ($version) use ($globalVersion) {
            $cycle = $version['cycle'] ?? '';
            $isGlobal = $cycle === $globalVersion;

            return [
                $isGlobal ? $cycle.' *' : $cycle,
                $version['installed'] === true || $version['installed'] === 'true' ? 'Installed' : 'Not Installed',
                $version['updateAvailable'] === true || $version['updateAvailable'] === 'true' ? 'Yes' : '',
            ];
        })->toArray();

        table(['Version', 'Status', 'Update Available'], $rows);

        $output->writeln('');
        $output->writeln('  * Global PHP version');
    })->descriptions('List all PHP versions and their status', [
        '--json' => 'Output PHP versions as JSON',
    ]);

    /**
     * Install a PHP version.
     */
    $app->command('php:install [version]', function (InputInterface $input, OutputInterface $output, $version = null) {
        if (! $version) {
            $versions = Herd::phpVersions();
            $notInstalled = collect($versions)->filter(function ($v) {
                return $v['installed'] !== true && $v['installed'] !== 'true';
            });

            if ($notInstalled->isEmpty()) {
                info('All PHP versions are already installed.');
                return;
            }

            CommandLine::configurePrompts($input, $output);

            $version = select(
                label: 'Which PHP version do you want to install?',
                options: $notInstalled->pluck('cycle', 'cycle')->toArray()
            );
        }

        if (Herd::isPHPInstalled($version)) {
            info('PHP '.$version.' is already installed.');
            return;
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Installing PHP '.$version.'...');
        $output->writeln('');

        Herd::installPHP($version);

        $output->writeln('  <bg=green;fg=black> DONE </> PHP '.$version.' has been installed.');
        $output->writeln('');
        $output->writeln('  Your global PHP version is still PHP '.Herd::usedPhp().'.');
        $output->writeln('  Run "herd use '.$version.'" to switch to it.');
        $output->writeln('');
    })->descriptions('Install a PHP version', [
        'version' => 'The PHP version to install (e.g. 8.3, 8.4, 8.5)',
    ]);

    /**
     * Update a PHP version.
     */
    $app->command('php:update [version]', function (InputInterface $input, OutputInterface $output, $version = null) {
        if (! $version) {
            $versions = Herd::phpVersions();
            $updatable = collect($versions)->filter(function ($v) {
                return ($v['installed'] === true || $v['installed'] === 'true')
                    && ($v['updateAvailable'] === true || $v['updateAvailable'] === 'true');
            });

            if ($updatable->isEmpty()) {
                info('All installed PHP versions are up to date.');
                return;
            }

            CommandLine::configurePrompts($input, $output);

            $version = select(
                label: 'Which PHP version do you want to update?',
                options: $updatable->pluck('cycle', 'cycle')->toArray()
            );
        }

        $output->writeln('');
        $output->writeln('  <bg=blue;fg=white> INFO </> Updating PHP '.$version.'...');
        $output->writeln('');

        Herd::updatePHP($version);

        $output->writeln('  <bg=green;fg=black> DONE </> PHP '.$version.' has been updated.');
        $output->writeln('');
    })->descriptions('Update a PHP version to the latest patch release', [
        'version' => 'The PHP version to update (e.g. 8.3, 8.4)',
    ]);

    /**
     * List all sites.
     */
    $app->command('sites [--json]', function (OutputInterface $output, $json) {
        $sites = Herd::allSites();

        if (empty($sites)) {
            info('No sites found.');
            return;
        }

        if ($json) {
            echo json_encode($sites);
            return;
        }

        $rows = array_map(function ($site) {
            return [
                $site['site'] ?? '',
                $site['url'] ?? '',
                $site['path'] ?? '',
                ($site['secured'] ?? false) ? 'Yes' : '',
                $site['phpVersion'] ?? '',
            ];
        }, $sites);

        table(['Site', 'URL', 'Path', 'Secured', 'PHP Version'], $rows);
    })->descriptions('List all sites', [
        '--json' => 'Output sites as JSON',
    ]);

    /**
     * Start a debug session.
     */
    $app->command('debug:start', function (OutputInterface $output) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use debug sessions.');
            return;
        }

        Herd::startDebugSession();

        info('Debug session started.');
    })->descriptions('Start a debug session (Pro)');

    /**
     * Stop a debug session and display the captured data.
     */
    $app->command('debug:stop', function (OutputInterface $output) {
        if (! Herd::hasPro()) {
            warning('Herd Pro is required to use debug sessions.');
            return;
        }

        $data = Herd::stopDebugSession();

        if (empty($data)) {
            info('Debug session stopped. No data captured.');
            return;
        }

        info('Debug session stopped.');
        echo json_encode($data, JSON_PRETTY_PRINT);
        $output->writeln('');
    })->descriptions('Stop a debug session and display captured data (Pro)');

} else {
    warning('The Herd Desktop application is not running. Please start Herd and try again.' . PHP_EOL);
}

return $app;
