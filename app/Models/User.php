<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasPushSubscriptions;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'phone',
        'user_type',
        'nis',
        'nip',
        'status',
        'profile_photo_path',
        'last_login_at',
        'failed_login_attempts',
        'locked_until',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'profile_photo_url',
        'is_active',
        'is_email_verified',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'failed_login_attempts' => 'integer',
        ];
    }

    /**
     * Get the URL to the user's profile photo.
     */
    public function getProfilePhotoUrlAttribute(): string
    {
        return $this->profile_photo_path
            ? asset('storage/' . $this->profile_photo_path)
            : 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&color=7F9CF5&background=EBF4FF';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Get the is_active status of the user for frontend
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->isActive();
    }

    /**
     * Get the email verification status for frontend
     */
    public function getIsEmailVerifiedAttribute(): bool
    {
        return !is_null($this->email_verified_at);
    }


    /**
     * Check if user is locked out
     */
    public function isLockedOut(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Check if user is superadmin
     */
    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is teller
     */
    public function isTeller(): bool
    {
        return $this->role === 'teller';
    }

    /**
     * Check if user is nasabah
     */
    public function isNasabah(): bool
    {
        return $this->role === 'nasabah';
    }

    /**
     * Relationship with Nasabah
     */
    public function nasabah()
    {
        return $this->hasOne(Nasabah::class);
    }

    /**
     * Relationship with Transaksi (as teller)
     */
    public function transaksi()
    {
        return $this->hasMany(Transaksi::class);
    }

    /**
     * Relationship with AuditTrail
     */
    public function auditTrails()
    {
        return $this->hasMany(AuditTrail::class);
    }

    /**
     * Relationship with Notifications
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class)->latest();
    }

    /**
     * Relationship with Unread Notifications
     */
    public function unreadNotifications()
    {
        return $this->hasMany(Notification::class)->where('is_read', false)->latest();
    }

    /**
     * Find a user by any of the identifier fields (NIS, NIP, Email, Username, or Account Number)
     */
    public static function findByIdentity(string $identity): ?self
    {
        return self::where('email', $identity)
            ->orWhere('username', $identity)
            ->orWhere('nis', $identity)
            ->orWhere('nip', $identity)
            ->orWhereHas('nasabah', function ($query) use ($identity) {
                $query->where('nomor_rekening', $identity);
            })
            ->first();
    }

    /**
     * Get the primary identifier for the user (NIS, NIP, or Account Number)
     */
    public function getIdentifier(): string
    {
        return match ($this->user_type) {
            'siswa' => $this->nis ?? $this->username,
            'guru' => $this->nip ?? $this->username,
            default => $this->nasabah?->nomor_rekening ?? $this->username,
        };
    }
}
