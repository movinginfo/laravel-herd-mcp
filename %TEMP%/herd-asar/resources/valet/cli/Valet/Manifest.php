<?php

namespace Valet;

use Closure;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Symfony\Component\Yaml\Yaml;

class Manifest
{
    /**
     * Get the project name from the current directory's manifest.
     *
     * @return string
     */
    public static function name()
    {
        if (! array_key_exists('name', static::current() ?? [])) {
            abort(sprintf('Invalid project name. Please verify your Herd manifest at [%s].', Path::manifest()));
        }

        return static::current()['id'];
    }

    /**
     * Get the PHP version from the current directory's manifest.
     *
     * @return string
     */
    public static function php()
    {
        return static::current()['php'] ?? null;
    }

    /**
     * Get the secure status from the current directory's manifest.
     *
     * @return bool
     */
    public static function secured()
    {
        return static::current()['secured'] ?? false;
    }

    /**
     * Get the site aliases from the current directory's manifest.
     *
     * @return array
     */
    public static function aliases()
    {
        return static::current()['aliases'] ?? [];
    }

    /**
     * Retrieve the manifest for the current working directory.
     *
     * @return array
     */
    public static function current()
    {
        if (! file_exists(Path::manifest())) {
            abort(sprintf('Unable to find a Herd manifest at [%s].', Path::manifest()));
        }

        return Yaml::parse(file_get_contents(Path::manifest()));
    }

    public static function complementConfigWithEnv($config): array
    {
        if (!is_array($config) || !array_key_exists('services', $config)) {
            return $config;
        }

        $yamlContent = file_get_contents(Path::manifest());
        $re = '/\$\{([^}]+)\}/m';
        preg_match_all($re, $yamlContent, $matches, PREG_SET_ORDER, 0);

        $yamlEnvKeys = array_map(function ($match) {
            return $match[1];
        }, $matches);

        if (count($yamlEnvKeys) === 0) {
            return $config;
        }

        try {
            $envContent = file_get_contents(Path::environment());
            $envVariables = \Dotenv\Dotenv::parse($envContent);
        } catch (\Exception $e) {
            return $config;
        }

        foreach ($config["services"] as $service => $serviceConfig) {
            if(!array_key_exists("port", $config["services"][$service]) || !static::hasPlaceholderValue($config["services"][$service]["port"])) {
                continue;
            }

            preg_match_all($re, $serviceConfig["port"], $matches, PREG_SET_ORDER, 0);
            $servicePortKey = $matches[0][1];

            $portValue = $envVariables[$servicePortKey] ?? '';
            $config["services"][$service]["port"] = static::parsePortValue($service, $portValue);
        }


        return $config;
    }

    protected static function getPortKey($service): ?string
    {
        switch ($service) {
            case 'redis':
                return 'REDIS_PORT';

            case 'postgresql':
            case 'mongodb':
            case 'mysql':
            case 'mariadb':
                return 'DB_PORT';

            case 'meilisearch':
                return 'MEILISEARCH_HOST';

            case 'minio':
                return 'AWS_ENDPOINT';

            case 'reverb':
                return 'REVERB_PORT';

            default:
                return null;
        }
    }

    protected static function parsePortValue($service, $portValue): string
    {
        switch ($service) {
            case 'redis':
            case 'postgresql':
            case 'mysql':
            case 'mariadb':
            case 'mongodb':
            case 'reverb':
                return $portValue;

            case 'meilisearch':
            case 'minio':
                if (str_contains($portValue, ':')) {
                    return substr($portValue, strrpos($portValue, ':') + 1);
                }
                return $portValue;

            default:
                return $portValue;
        }
    }

    public static function getMissingEnvironmentVariables($availableServices)
    {
        $defaultPorts = collect($availableServices)->mapWithKeys(function ($service) {
            return [
                $service['type'] => $service['defaultPort']
            ];
        });

        $originalManifest = self::current();

        $manifest = self::complementConfigWithEnv($originalManifest);

        $missingVariables = [];

        foreach (Arr::get($manifest, 'services') as $service => $value) {
            $port = Arr::get($value, 'port');
            $originalValue = Arr::get($originalManifest, "services.{$service}.port");
            $hasEnvPlaceholder = static::hasPlaceholderValue($originalValue);

            if (trim($port) === '' && $hasEnvPlaceholder) {
                $re = '/\$\{([^}]+)\}/m';
                preg_match_all($re, $originalValue, $matches, PREG_SET_ORDER, 0);
                $keyName = $matches[0][1];

                $missingVariables[] = [
                    'name' => $keyName,
                    'defaultValue' => $defaultPorts[$service] ?? '',
                ];
            }
        }

        return $missingVariables;
    }

    protected static function hasPlaceholderValue($portValue): bool
    {
        return str_contains($portValue, '${');
    }

    /**
     * Check if the current working directory has a manifest.
     *
     * @return bool
     */
    public static function exists()
    {
        return file_exists(Path::manifest());
    }

    /**
     * Write a fresh manifest file for the given project.
     *
     * @param  array  $project
     * @return void
     */
    public static function fresh($project, $availableServices = [])
    {
        static::freshConfiguration($project, $availableServices);
    }

    /**
     * Write a fresh main manifest file for the given project.
     *
     * @param  array  $project
     * @return void
     */
    protected static function freshConfiguration($project, $availableServices = [])
    {
        try {
            $envVariables = [];
            if(Path::hasEnvironment()) {
                $envContent = file_get_contents(Path::environment());
                $envVariables = \Dotenv\Dotenv::parse($envContent);
            }
        } catch (\Exception $e) {
            $envVariables = [];
        }

        $defaultPorts = collect($availableServices)->mapWithKeys(function ($service) {
            return [
                $service['type'] => $service['defaultPort']
            ];
        });

        $services = [];
        $project['services'] = array_filter($project['services'] ?? []);
        foreach ($project['services'] as $service) {
            $version = 'latest';
            if (str_contains($service, ':')) {
                [$service, $version] = explode(':', $service);
            }
            $services[$service] = [
                'version' => $version,
                'port' => static::getPortValue($service, $envVariables, $defaultPorts),
            ];
        }
        $aliases = explode(PHP_EOL, $project['aliases']);
        $aliases = array_map('trim', $aliases);
        $aliases = array_filter($aliases);

        $current = [];
        if (file_exists(Path::manifest())) {
            try {
                $current = Yaml::parse(file_get_contents(Path::manifest()));
            } catch (\Exception $e) {
            }
        }

        static::write([
            'name' => $project['name'],
            'php' => $project['php'],
            'secured' => $project['secured'] ?? false,
            'aliases' => $aliases ?? [],
            'services' => $services,
            'integrations' => $current['integrations'] ?? ['forge' => []],
        ]);
    }

    /**
     * Validate the manifest file.
     */
    public static function validate(array $manifest, array $originalManifest, array $availableServices)
    {
        $supportedPhpVersions = collect(Herd::SUPPORTED_PHP_VERSIONS)->reject(function ($version) {
            return $version === 'php';
        })->toArray();
        /** @var Validator $validator */
        $validator = (new ValidatorFactory())->make(
            $manifest,
            [
                'name' => ['required', 'string'],
                'php' => ['required', 'string', Rule::in($supportedPhpVersions)],
                'secured' => ['boolean'],
                'aliases' => ['array'],
                'aliases.*' => ['string'],
                'services' => ['array:'.implode(',', $availableServices)],
                'services.*.version' => ['string', 'required'],
                'services.*' => [
                    function (string $attribute, mixed $value, Closure $fail) use ($originalManifest) {
                        $port = Arr::get($value, 'port');
                        if($port === null) {
                            $fail("The port for the service \"{$attribute}\" is required.");
                            return;
                        }

                        $service = Str::after($attribute, 'services.');
                        $originalValue = Arr::get($originalManifest, "services.{$service}.port");

                        if (trim($port) === '') {
                            $hasEnvPlaceholder = static::hasPlaceholderValue($originalValue);
                            $errorMessage = "The port for the service \"{$service}\" is required.";
                            if ($hasEnvPlaceholder) {
                                $re = '/\$\{([^}]+)\}/m';
                                preg_match_all($re, $originalValue, $matches, PREG_SET_ORDER, 0);
                                $keyName = $matches[0][1];
                                $errorMessage .= " Please check the .env key for: {$keyName}.";
                            }
                            $fail($errorMessage);
                        }
                    },
                ],
            ],
            [
                'name.required' => 'The name is required.',
                'php.required' => 'You must specify a valid PHP version.',
                'php.in' => 'The PHP version must be one of: '.implode(', ', $supportedPhpVersions).'.',
                'services.array' => 'Invalid service found. The allowed services are: '.implode(', ', $availableServices).'.',
            ],
        );
        if ($validator->fails()) {
            output('  <bg=red;fg=white> ERROR </> Invalid herd.yml file…');
            foreach ($validator->errors()->all() as $error) {
                output('  <bg=red;fg=white> ERROR </> '.$error);
            }
            output('');
            exit(1);
        }
    }

    public static function onlyContainsIntegrations(): bool
    {
        $manifest = self::current();

        $keys = array_keys($manifest);
        return count($keys) === 1 && in_array('integrations', $keys);
    }

    protected static function getPortValue($service, $envVariables, $defaultPorts): string
    {
        $servicePortKey = static::getPortKey($service);

        if (empty($envVariables)) {
            return $defaultPorts[$service] ?? '';
        }

        return "\${{$servicePortKey}}";
    }

    /**
     * Write the given array to disk as the new manifest.
     *
     * @param  string|null  $path
     * @return void
     */
    protected static function write(array $manifest, $path = null)
    {
        file_put_contents(
            $path ?: Path::manifest(),
            Yaml::dump($manifest, $inline = 20, $spaces = 4)
        );
    }
}
