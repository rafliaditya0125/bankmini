<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Request;

class CaptchaService
{
    /**
     * Verify CAPTCHA token from a request.
     *
     * Automatically detects which provider sent the token based on which
     * field is present in the request. Primary provider is configured via
     * the 'captcha_primary' setting (settable by superadmin).
     *
     * Fallback logic:
     * - If cf-turnstile-response is present → verify with Turnstile
     * - If g-recaptcha-response is present  → verify with reCAPTCHA
     * - If both are present                 → verify with primary provider only
     * - If neither is present               → return false (reject)
     */
    public static function verify(Request $request): bool
    {
        $primary   = Setting::get('captcha_primary', 'turnstile');
        $turnToken = $request->input('cf-turnstile-response');
        $rcToken   = $request->input('g-recaptcha-response');

        // Both tokens present: verify with primary only
        if (!empty($turnToken) && !empty($rcToken)) {
            return $primary === 'turnstile'
                ? TurnstileService::verify($turnToken, $request->ip())
                : RecaptchaService::verify($rcToken, $request->ip());
        }

        // Only Turnstile token present
        if (!empty($turnToken)) {
            return TurnstileService::verify($turnToken, $request->ip());
        }

        // Only reCAPTCHA token present
        if (!empty($rcToken)) {
            return RecaptchaService::verify($rcToken, $request->ip());
        }

        // No token at all
        return false;
    }

    /**
     * Get the primary captcha provider key from settings.
     */
    public static function primary(): string
    {
        return Setting::get('captcha_primary', 'turnstile');
    }

    /**
     * Check if any CAPTCHA provider is globally enabled.
     */
    public static function enabled(): bool
    {
        return config('turnstile.enabled', true) || config('recaptcha.enabled', true);
    }
}
