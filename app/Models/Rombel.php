<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rombel extends Model
{
    protected $fillable = [
        'jurusan_id',
        'tahun_ajaran',
        'tingkat',
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
     * Get dynamic formatted class name (tingkat + nama rombel, e.g. "10 RPL 1", "11 RPL 1")
     */
    public function getNamaKelasAttribute()
    {
        $tingkat = $this->tingkat ? (string)$this->tingkat : '';
        $rawNama = trim((string)($this->attributes['nama'] ?? ''));
        $cleanNama = trim(preg_replace('/^(10|11|12)\s*/i', '', $rawNama));

        if (!empty($tingkat) && !empty($cleanNama)) {
            return trim("{$tingkat} {$cleanNama}");
        }

        if (!empty($cleanNama)) {
            return $cleanNama;
        }

        if (!empty($tingkat)) {
            $jurusanKode = $this->jurusan?->kode ?? '';
            return trim("{$tingkat} {$jurusanKode}");
        }

        return $rawNama;
    }

    /**
     * Get full name (for backward compatibility)
     */
    public function getFullNameAttribute()
    {
        return $this->nama_kelas;
    }
}
