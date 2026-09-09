<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletType extends Model
{
    use HasFactory;

    protected $table = 'wallet_types';

    protected $fillable = [
        'name',
        'category',
        'target_amount',
        'target_audience',
        'description',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Relationship with Wallets
     */
    public function wallets()
    {
        return $this->hasMany(Wallet::class, 'wallet_type_id');
    }

    /**
     * Scope for active wallet types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for payment pockets
     */
    public function scopePembayaran($query)
    {
        return $query->where('category', 'pembayaran');
    }

    /**
     * Scope for default savings pocket
     */
    public function scopeTabungan($query)
    {
        return $query->where('category', 'tabungan')->orWhere('is_default', true);
    }
}
