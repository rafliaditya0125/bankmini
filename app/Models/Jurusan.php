<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Nasabah;
use App\Models\Rombel;

class Jurusan extends Model
{
    protected $fillable = [
        'nama',
        'kode',
    ];

    protected $appends = ['jumlah_kelas_10', 'jumlah_kelas_11', 'jumlah_kelas_12'];

    /**
     * Relationship with Nasabah
     */
    public function nasabah()
    {
        return $this->hasMany(Nasabah::class);
    }

    /**
     * Relationship with Rombel
     */
    public function rombel()
    {
        return $this->hasMany(Rombel::class);
    }

    /**
     * Get count of kelas tingkat 10
     */
    public function getJumlahKelas10Attribute()
    {
        return $this->rombel()->where('tingkat', 10)->count();
    }

    /**
     * Get count of kelas tingkat 11
     */
    public function getJumlahKelas11Attribute()
    {
        return $this->rombel()->where('tingkat', 11)->count();
    }

    /**
     * Get count of kelas tingkat 12
     */
    public function getJumlahKelas12Attribute()
    {
        return $this->rombel()->where('tingkat', 12)->count();
    }
}
