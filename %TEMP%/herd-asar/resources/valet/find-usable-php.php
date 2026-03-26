<?php

$minimumPhpVersion = '8.0';

// First, check if the system's linked "php" is 8+; if so, return that. This
// is the most likely, most ideal, and fastest possible case
$linkedPhpVersion = shell_exec('php -r "echo phpversion();"');

if (version_compare($linkedPhpVersion, $minimumPhpVersion) >= 0) {
    echo shell_exec('which php');

    return;
}

echo $_SERVER['HOME'].'/Library/Application Support/Herd/php82';