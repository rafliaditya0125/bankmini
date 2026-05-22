<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    /**
     * Send a WhatsApp message via Fonnte
     */
    public static function sendMessage(string $target, string $message): bool
    {
        $token = config('services.fonnte.token');
        $apiUrl = config('services.fonnte.api_url');

        if (empty($token)) {
            Log::error('Fonnte token not set in configuration.');
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $token,
            ])->post($apiUrl, [
                'target' => $target,
                'message' => $message,
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::error('Fonnte API error: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('Fonnte connection error: ' . $e->getMessage());
            return false;
        }
    }
}
