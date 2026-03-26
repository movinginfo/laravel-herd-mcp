<?php

use BeyondCode\HerdConfiguration\HerdConfiguration;

/*
|--------------------------------------------------------------------------
| Laravel Herd
|--------------------------------------------------------------------------
|
| This script is the entrypoint of your Laravel Herd request. If you see
| this file while using Herd's Xdebug auto-detection, you may want to
| modify your PHPStorm settings, to not automatically break at the
| first line.
|
| Learn more about it in the Herd documentation
| https://herd.laravel.com/docs/windows/debugging/xdebug
|
*/

require_once __DIR__ . '/HerdConfiguration.php';

try {
    $_herdConfig = HerdConfiguration::load();
} catch (\Throwable $e) {
    return;
}
   
$herdAutoPrepend = HerdConfiguration::getIniValues()['herd_auto_prepend_file'] ?? '';

if (!empty($herdAutoPrepend) && file_exists($herdAutoPrepend)) {
    include_once $herdAutoPrepend;
}

// Ignore dumps in Herd sites preview
if((array_key_exists('herd', $_GET) && $_GET['herd'] === 'preview')) {
    return;
}

if (!$_herdConfig->interceptionEnabled()) {
    return;
}

define('HERD_DUMP_REQUEST_ID', uniqid());

$pharFile = __DIR__ . '/dump.phar';

try {
    include_once $pharFile;

    if ($_herdConfig->watchDumpsInCurrentEnvironment()) {
        class_alias('Herd\HerdDumper\VarDumper', 'Symfony\Component\VarDumper\VarDumper');

        // Only define global dump/dd functions when watching is enabled
        if (!function_exists('dump')) {
            function dump($var, ...$moreVars) {
                return \Herd\dump($var, ...$moreVars);
            }
        }

        if (!function_exists('dd')) {
            function dd(...$vars) {
                \Herd\dd(...$vars);
            }
        }
    }

    $GLOBALS['__composer_autoload_files'] = [];
} catch (\Throwable $e) {
}
