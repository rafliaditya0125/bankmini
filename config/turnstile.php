<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cloudflare Turnstile Configuration
    |--------------------------------------------------------------------------
    |
    | Turnstile is Cloudflare's CAPTCHA alternative. In "Managed" mode,
    | Cloudflare automatically decides whether to show a visual challenge
    | or silently pass the user based on its own bot detection signals.
    |
    | For local development, use Cloudflare's test keys:
    |   Site Key:   1x00000000000000000000AA    (always passes)
    |   Secret Key: 1x0000000000000000000000000000000AA (always passes)
    |
    | Get production keys at: https://dash.cloudflare.com/
    |
    */

    'enabled' => env('TURNSTILE_ENABLED', true),

    'site_key' => env('TURNSTILE_SITE_KEY', '1x00000000000000000000AA'),

    'secret_key' => env('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA'),

    'verify_url' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',

    /*
    |--------------------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------------------
    |
    | The number of seconds to wait for a response from Cloudflare's API.
    | If the request times out, access is granted (fail-open) to avoid
    | locking out legitimate users due to network issues.
    |
    */
    'timeout' => 10,
];
