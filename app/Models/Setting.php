<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * In-memory cache for current request lifecycle
     */
    protected static ?array $memoryCache = null;

    protected static function booted(): void
    {
        static::saved(function () {
            self::clearCache();
        });

        static::deleted(function () {
            self::clearCache();
        });
    }

    /**
     * Load all settings as key-value pairs with caching
     */
    public static function allKeyed(): array
    {
        if (self::$memoryCache !== null) {
            return self::$memoryCache;
        }

        self::$memoryCache = \Illuminate\Support\Facades\Cache::remember('app_settings_all', 86400, function () {
            return self::pluck('value', 'key')->toArray();
        });

        return self::$memoryCache;
    }

    public static function get($key, $default = null)
    {
        $settings = self::allKeyed();
        return array_key_exists($key, $settings) ? $settings[$key] : $default;
    }

    public static function set($key, $value)
    {
        $setting = self::updateOrCreate(['key' => $key], ['value' => $value]);

        self::clearCache();

        if (in_array($key, ['bank_name', 'school_name'])) {
            self::syncManifest();
        }

        return $setting;
    }

    public static function clearCache(): void
    {
        self::$memoryCache = null;
        \Illuminate\Support\Facades\Cache::forget('app_settings_all');
    }

    public static function syncManifest(): void
    {
        try {
            $bankName = self::get('bank_name', 'Bank Mini');
            $schoolName = self::get('school_name', 'SMK NEGERI 1 CIAMIS');

            $manifest = [
                'name' => $bankName,
                'short_name' => $bankName,
                'description' => "Aplikasi Pengelolaan {$bankName} - {$schoolName}",
                'theme_color' => '#059669',
                'background_color' => '#ffffff',
                'display' => 'standalone',
                'orientation' => 'portrait',
                'scope' => '/',
                'start_url' => '/',
                'icons' => [
                    [
                        'src' => '/images/bankmini-removebg-preview.png',
                        'sizes' => '192x192',
                        'type' => 'image/png',
                    ],
                    [
                        'src' => '/images/bankmini-removebg-preview.png',
                        'sizes' => '512x512',
                        'type' => 'image/png',
                    ],
                ],
            ];

            $path = public_path('manifest.json');
            file_put_contents($path, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to sync manifest.json: ' . $e->getMessage());
        }
    }
}
