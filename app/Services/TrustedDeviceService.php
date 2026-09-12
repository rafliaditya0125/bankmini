<?php

namespace App\Services;

use App\Models\TrustedDevice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Jenssegers\Agent\Agent;

class TrustedDeviceService
{
    /**
     * Cookie name used to store the trust token on the browser.
     */
    public const COOKIE_NAME = 'trusted_device_token';

    /**
     * How many days a trusted device remains valid.
     */
    public const TRUST_DAYS = 30;

    /**
     * Determine whether the current request comes from a trusted device
     * belonging to the given user.
     *
     * Returns false (= MFA required) when:
     *  - No cookie present
     *  - Token not found in DB or expired
     *  - User-Agent has changed since the device was trusted (suspicious)
     */
    public function isTrusted(User $user, Request $request): bool
    {
        $rawToken = $request->cookie(self::COOKIE_NAME);

        if (empty($rawToken)) {
            return false;
        }

        $tokenHash = hash('sha256', $rawToken);

        /** @var TrustedDevice|null $device */
        $device = TrustedDevice::where('user_id', $user->id)
            ->where('token_hash', $tokenHash)
            ->active()
            ->first();

        if (! $device) {
            return false;
        }

        // Suspicious signal: User-Agent changed since trust was created
        if ($device->isSuspicious($request->userAgent() ?? '')) {
            return false;
        }

        // Update last_used_at
        $device->update(['last_used_at' => now()]);

        return true;
    }

    /**
     * Register the current device as trusted for the given user.
     * The cookie is queued on the response so it reaches the browser.
     */
    public function trustDevice(User $user, Request $request): void
    {
        $rawToken  = Str::random(64);
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = now()->addDays(self::TRUST_DAYS);

        TrustedDevice::create([
            'user_id'     => $user->id,
            'token_hash'  => $tokenHash,
            'device_name' => $this->getDeviceName($request->userAgent() ?? ''),
            'user_agent'  => $request->userAgent(),
            'ip_address'  => $request->ip(),
            'last_used_at' => now(),
            'expires_at'  => $expiresAt,
        ]);

        // Queue a long-lived cookie (secure, httpOnly, same-site)
        cookie()->queue(
            self::COOKIE_NAME,
            $rawToken,
            self::TRUST_DAYS * 24 * 60, // minutes
            '/',
            null,
            config('session.secure', false),
            true,   // httpOnly
            false,
            'lax'
        );
    }

    /**
     * Revoke a specific trusted device record.
     */
    public function revoke(TrustedDevice $device): void
    {
        $device->delete();
    }

    /**
     * Revoke all trusted devices for a given user.
     */
    public function revokeAll(User $user): void
    {
        $user->trustedDevices()->delete();
    }

    /**
     * Parse a raw User-Agent string into a human-friendly name
     * using jenssegers/agent.
     *
     * Examples: "Chrome 126 di Windows 11", "Safari di iPhone (iOS 17)"
     */
    private function getDeviceName(string $userAgent): string
    {
        if (empty($userAgent)) {
            return 'Perangkat Tidak Dikenal';
        }

        $agent = new Agent();
        $agent->setUserAgent($userAgent);

        $browser  = $agent->browser();
        $platform = $agent->platform();

        if ($agent->isPhone()) {
            $device   = $agent->device() ?: 'Ponsel';
            $osVersion = $agent->version($platform);
            $osLabel  = $platform ? "{$platform}" . ($osVersion ? " {$osVersion}" : '') : '';
            return trim("{$browser} di {$device}" . ($osLabel ? " ({$osLabel})" : ''));
        }

        if ($agent->isTablet()) {
            $device  = $agent->device() ?: 'Tablet';
            return trim("{$browser} di {$device}");
        }

        // Desktop
        $browserVersion = $agent->version($browser ?? '');
        $browserLabel   = $browser ? "{$browser}" . ($browserVersion ? " {$browserVersion}" : '') : 'Browser';
        $platformLabel  = $platform ?: 'Desktop';

        return "{$browserLabel} di {$platformLabel}";
    }
}
