<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Google reCAPTCHA v2 Configuration
    |--------------------------------------------------------------------------
    |
    | reCAPTCHA v2 shows a checkbox challenge to suspicious users.
    | Normal users typically see it silently pass.
    |
    | Test keys (always pass — for local development):
    |   Site Key:   6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
    |   Secret Key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
    |
    | Get production keys at: https://www.google.com/recaptcha/admin/create
    |
    */

    'enabled' => env('RECAPTCHA_ENABLED', true),

    'site_key' => env('RECAPTCHA_SITE_KEY', '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'),

    'secret_key' => env('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'),

    'verify_url' => 'https://www.google.com/recaptcha/api/siteverify',

    'timeout' => 10,
];
