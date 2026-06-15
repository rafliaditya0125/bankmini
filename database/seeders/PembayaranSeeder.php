<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Nasabah;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PembayaranSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kategoriPembayaran = [
            'Pembayaran Baju Seragam',
            'Pembayaran SPP dan Gedung',
            'Pembayaran Buku dan LKS'
        ];

        foreach ($kategoriPembayaran as $index => $kategori) {
            $username = 'pembayaran_' . ($index + 1);
            
            $user = User::firstOrCreate(
                ['username' => $username],
                [
                    'name' => $kategori,
                    'email' => $username . '@bankmini.local',
                    'password' => Hash::make('password'),
                    'role' => 'nasabah',
                    'user_type' => 'pembayaran',
                    'status' => 'active',
                ]
            );

            Nasabah::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'nomor_rekening' => '888000' . ($index + 1),
                    'saldo' => 0,
                    'saldo_minimum' => 0,
                    'status' => 'aktif',
                    'nama_lengkap' => $kategori,
                    'tanggal_buka' => now(),
                ]
            );
        }
    }
}
