<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaService
{
    /**
     * Verify a Google reCAPTCHA v2 token.
     *
     * Returns true if the token is valid, or if reCAPTCHA is disabled,
     * or if the Google API is unreachable (fail-open policy).
     */
    public static function verify(?string $token, string $ip): bool
    {
        if (!config('recaptcha.enabled', true)) {
            return true;
        }

        if (empty($token)) {
            return false;
        }

        try {
            $secretKey = Setting::get('recaptcha_secret_key', config('recaptcha.secret_key'));
            $response = Http::timeout(config('recaptcha.timeout', 10))
                ->asForm()
                ->post(config('recaptcha.verify_url'), [
                    'secret'   => $secretKey,
                    'response' => $token,
                    'remoteip' => $ip,
                ]);

            if (!$response->successful()) {
                Log::warning('reCAPTCHA: HTTP error from Google API', [
                    'status' => $response->status(),
                ]);
                return true; // fail-open
            }

            $result = $response->json();

            if (!($result['success'] ?? false)) {
                Log::info('reCAPTCHA: verification failed', [
                    'error-codes' => $result['error-codes'] ?? [],
                    'ip'          => $ip,
                ]);
            }

            return $result['success'] ?? false;
        } catch (\Exception $e) {
            Log::warning('reCAPTCHA: exception during verification, failing open', [
                'error' => $e->getMessage(),
            ]);
            return true; // fail-open
        }
    }
}
