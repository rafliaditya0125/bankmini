<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Nasabah extends Model
{
    use HasFactory;

    protected $table = 'nasabah';

    protected $fillable = [
        'user_id',
        'nomor_rekening',
        'saldo',
        'saldo_minimum',
        'status',
        'tanggal_buka',
        'tanggal_lulus',
        'alamat',
        'jurusan_id',
        'rombel_id',
    ];

    protected $casts = [
        'saldo' => 'decimal:2',
        'saldo_minimum' => 'decimal:2',
        'tanggal_buka' => 'date',
        'tanggal_lulus' => 'date',
    ];

    /**
     * Relationship with User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship with Transaksi
     */
    public function transaksi()
    {
        return $this->hasMany(Transaksi::class);
    }

    /**
     * Relationship with Transaksi as receiver (transfer)
     */
    public function transaksiMasuk()
    {
        return $this->hasMany(Transaksi::class, 'nasabah_tujuan_id');
    }

    /**
     * Relationship with Jurusan
     */
    public function jurusanRel()
    {
        return $this->belongsTo(Jurusan::class, 'jurusan_id');
    }

    /**
     * Relationship with Rombel
     */
    public function rombelRel()
    {
        return $this->belongsTo(Rombel::class, 'rombel_id');
    }

    /**
     * Relationship with Wallets
     */
    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    /**
     * Get the default Tabungan wallet
     */
    public function tabunganWallet()
    {
        return $this->hasOne(Wallet::class)->whereHas('walletType', function ($q) {
            $q->where('is_default', true)->orWhere('category', 'tabungan');
        });
    }

    /**
     * Get or create wallet for specific wallet type
     */
    public function getOrCreateWallet(int $walletTypeId): Wallet
    {
        return $this->wallets()->firstOrCreate(
            ['wallet_type_id' => $walletTypeId],
            [
                'wallet_number' => 'W-' . $this->nomor_rekening . '-' . str_pad($walletTypeId, 2, '0', STR_PAD_LEFT),
                'balance' => 0.00,
                'status' => 'active',
            ]
        );
    }

    /**
     * Check if nasabah is active
     */
    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }
}
