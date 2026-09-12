<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class TrustedDevice extends Model
{
    protected $fillable = [
        'user_id',
        'token_hash',
        'device_name',
        'user_agent',
        'ip_address',
        'last_used_at',
        'expires_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at'   => 'datetime',
    ];

    /**
     * Relationship: belongs to a User.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: only non-expired devices.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    /**
     * Whether this device record has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Whether the given User-Agent differs from the one recorded at trust time.
     * Used as a suspicious signal — if UA changed, re-challenge with MFA.
     */
    public function isSuspicious(string $currentUserAgent): bool
    {
        return $this->user_agent !== $currentUserAgent;
    }
}
