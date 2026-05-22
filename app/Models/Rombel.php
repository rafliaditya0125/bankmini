<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rombel extends Model
{
    protected $fillable = [
        'jurusan_id',
        'tahun_ajaran',
        'tingkat',
        'nomor_rombel',
        'nama',
    ];

    protected $appends = ['nama_kelas'];

    /**
     * Relationship with Jurusan
     */
    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }

    /**
     * Relationship with Nasabah
     */
    public function nasabah()
    {
        return $this->hasMany(Nasabah::class, 'rombel_id');
    }

    /**
     * Get auto-generated class name (e.g., "10 RPL 1")
     */
    public function getNamaKelasAttribute()
    {
        $jurusanKode = $this->jurusan?->kode ?? '';
        return trim("{$this->tingkat} {$jurusanKode} {$this->nomor_rombel}");
    }

    /**
     * Get full name (for backward compatibility)
     */
    public function getFullNameAttribute()
    {
        return $this->nama ?? $this->nama_kelas;
    }
}
