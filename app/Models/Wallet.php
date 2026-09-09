<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasFactory;

    protected $table = 'wallets';

    protected $fillable = [
        'wallet_number',
        'nasabah_id',
        'wallet_type_id',
        'balance',
        'status',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
    ];

    /**
     * Relationship with Nasabah
     */
    public function nasabah()
    {
        return $this->belongsTo(Nasabah::class);
    }

    /**
     * Relationship with WalletType
     */
    public function walletType()
    {
        return $this->belongsTo(WalletType::class, 'wallet_type_id');
    }

    /**
     * Credit funds to wallet
     */
    public function credit(float|int|string $amount): self
    {
        $this->balance = (float) $this->balance + (float) $amount;
        $this->save();
        return $this;
    }

    /**
     * Debit funds from wallet
     */
    public function debit(float|int|string $amount): self
    {
        $this->balance = (float) $this->balance - (float) $amount;
        $this->save();
        return $this;
    }
}
