<?php

namespace Database\Seeders;

use App\Models\Jurusan;
use App\Models\Nasabah;
use Illuminate\Database\Seeder;

class JurusanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jurusans = [
            ['kode' => 'RPL', 'nama' => 'Rekayasa Perangkat Lunak'],
            ['kode' => 'AKL', 'nama' => 'Akuntansi dan Keuangan Lembaga'],
        ];

        foreach ($jurusans as $j) {
            $model = Jurusan::updateOrCreate(['kode' => $j['kode']], $j);

            // Sync existing nasabah that have this string in 'jurusan' column
            Nasabah::where('jurusan', $j['kode'])
                ->update(['jurusan_id' => $model->id]);
        }
    }
}
