<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaksi extends Model
{
    use HasFactory;

    protected $table = 'transaksi';

    protected $fillable = [
        'kode_transaksi',
        'nasabah_id',
        'user_id',
        'jenis_transaksi',
        'jumlah',
        'saldo_sebelum',
        'saldo_sesudah',
        'nasabah_tujuan_id',
        'keterangan',
        'journal_code',
        'posted_at',
        'status',
        'cancel_reason',
        'tanggal_transaksi',
        'nama_petugas',
    ];

    protected $casts = [
        'jumlah' => 'decimal:2',
        'saldo_sebelum' => 'decimal:2',
        'saldo_sesudah' => 'decimal:2',
    ];

    /**
     * Relationship with Nasabah
     */
    public function nasabah()
    {
        return $this->belongsTo(Nasabah::class);
    }

    /**
     * Relationship with User (teller)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Alias for user relationship (petugas)
     */
    public function petugas()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relationship with Nasabah tujuan (for transfer)
     */
    public function nasabahTujuan()
    {
        return $this->belongsTo(Nasabah::class, 'nasabah_tujuan_id');
    }

    /**
     * Generate kode transaksi
     */
    public static function generateKodeTransaksi($date = null): string
    {
        $dateStr = $date ? $date->format('Ymd') : date('Ymd');
        $dateForQuery = $date ? $date->format('Y-m-d') : date('Y-m-d');

        $lastTransaksi = self::where('kode_transaksi', 'like', 'TRX' . $dateStr . '%')
            ->orderBy('kode_transaksi', 'desc')
            ->first();

        $urutan = $lastTransaksi ? (intval(substr($lastTransaksi->kode_transaksi, -5)) + 1) : 1;

        return 'TRX' . $dateStr . str_pad($urutan, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transaksi) {
            if (!$transaksi->kode_transaksi) {
                // Use created_at if set, otherwise use current time
                $date = $transaksi->created_at ?? now();
                $transaksi->kode_transaksi = self::generateKodeTransaksi($date);
            }
        });
    }
}
