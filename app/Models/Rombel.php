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
     * Get class name (reads from 'nama' column in database, or falls back to generated string if empty)
     */
    public function getNamaKelasAttribute()
    {
        if (!empty($this->attributes['nama'])) {
            return $this->attributes['nama'];
        }

        $jurusanKode = $this->jurusan?->kode ?? '';
        return trim("{$this->tingkat} {$jurusanKode}");
    }

    /**
     * Get full name (for backward compatibility)
     */
    public function getFullNameAttribute()
    {
        return $this->nama ?? $this->nama_kelas;
    }
}
