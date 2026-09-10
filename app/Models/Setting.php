<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set($key, $value)
    {
        $setting = self::updateOrCreate(['key' => $key], ['value' => $value]);

        if (in_array($key, ['bank_name', 'school_name'])) {
            self::syncManifest();
        }

        return $setting;
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
