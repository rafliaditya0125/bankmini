<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TurnstileService
{
    /**
     * Verify a Cloudflare Turnstile token.
     *
     * Returns true if the token is valid, or if Turnstile is disabled,
     * or if the Cloudflare API is unreachable (fail-open policy).
     */
    public static function verify(?string $token, string $ip): bool
    {
        if (!config('turnstile.enabled', true)) {
            return true;
        }

        // Empty token = bot / JS disabled
        if (empty($token)) {
            return false;
        }

        try {
            $response = Http::timeout(config('turnstile.timeout', 10))
                ->asForm()
                ->post(config('turnstile.verify_url'), [
                    'secret'   => config('turnstile.secret_key'),
                    'response' => $token,
                    'remoteip' => $ip,
                ]);

            if (!$response->successful()) {
                // Fail-open: don't block users due to upstream API issues
                Log::warning('Turnstile: HTTP error from Cloudflare API', [
                    'status' => $response->status(),
                ]);
                return true;
            }

            $result = $response->json();

            if (!($result['success'] ?? false)) {
                Log::info('Turnstile: verification failed', [
                    'error-codes' => $result['error-codes'] ?? [],
                    'ip'          => $ip,
                ]);
            }

            return $result['success'] ?? false;
        } catch (\Exception $e) {
            // Fail-open: network issues should not lock out real users
            Log::warning('Turnstile: exception during verification, failing open', [
                'error' => $e->getMessage(),
            ]);
            return true;
        }
    }
}
