<?php

namespace Valet;

class Path
{

    /**
     * Get the path to the current working directory.
     *
     * @return string
     */
    public static function current()
    {
        return getcwd();
    }

    /**
     * Get the path to the default manifest file location.
     *
     * @return string
     */
    public static function defaultManifest()
    {
        return getcwd().'/herd.yml';
    }

    /**
     * Get the path to the project's manifest file.
     *
     * @return string
     */
    public static function manifest()
    {
        return static::defaultManifest();
    }

    /**
     * Get the path to the project's environment file.
     *
     * @return string
     */
    public static function environment()
    {
        return getcwd().'/.env';
    }

    /**
     * Returns if a project environment file exists.
     */
    public static function hasEnvironment()
    {
        return file_exists(static::environment());
    }

    /**
     * Returns if a project has Laravel Boost installed and an artisan file exists.
     *
     * @return bool
     */
    public static function hasLaravelBoost()
    {
        return is_dir(getcwd().'/vendor/laravel/boost') && file_exists(getcwd().'/artisan');
    }
}
