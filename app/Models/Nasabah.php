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
     * Check if nasabah is active
     */
    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }
}
