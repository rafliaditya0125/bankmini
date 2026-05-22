<?php

namespace Database\Seeders;

use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BankMiniSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get existing tellers for transaction seeding
        $teller1 = User::where('username', 'teller1')->first();
        $teller2 = User::where('username', 'teller2')->first();

        // Create Admin (Requested credentials)
        if (!User::where('email', 'admin@bankmini.smk')->exists()) {
            User::create([
                'name' => 'Administrator Sistem',
                'username' => 'admin@bankmini.smk',
                'email' => 'admin@bankmini.smk',
                'password' => Hash::make('admin'),
                'role' => 'admin',
                'phone' => '081234567899',
                'status' => 'active',
            ]);
        }

        // Create Tellers
        if (!$teller1) {
            $teller1 = User::create([
                'name' => 'Budi Santoso',
                'username' => 'teller1',
                'email' => 'budi@bankmini.smk',
                'password' => Hash::make('password'),
                'role' => 'teller',
                'phone' => '081234567891',
                'status' => 'active',
            ]);
        }

        if (!$teller2) {
            $teller2 = User::create([
                'name' => 'Siti Nurhaliza',
                'username' => 'teller2',
                'email' => 'siti@bankmini.smk',
                'password' => Hash::make('password'),
                'role' => 'teller',
                'phone' => '081234567892',
                'status' => 'active',
            ]);
        }

        // Create Nasabah Users
        $nasabahDataList = [
            [
                'name' => 'Ahmad Rizky',
                'username' => 'ahmad123',
                'role' => 'nasabah',
                'user_type' => 'siswa',
                'nis' => '2023101',
                'phone' => '081234567893',
                'status' => 'active',
            ],
            [
                'name' => 'Dewi Lestari',
                'username' => 'dewi456',
                'role' => 'nasabah',
                'user_type' => 'siswa',
                'nis' => '2023102',
                'phone' => '081234567894',
                'status' => 'active',
            ],
            [
                'name' => 'Eko Prasetyo',
                'username' => 'eko789',
                'role' => 'nasabah',
                'user_type' => 'siswa',
                'nis' => '2023103',
                'phone' => '081234567895',
                'status' => 'active',
            ],
            [
                'name' => 'Sri Mulyani',
                'username' => 'sri001',
                'role' => 'nasabah',
                'user_type' => 'guru',
                'nip' => '198601012011012001',
                'phone' => '081234567896',
                'status' => 'active',
            ],
        ];

        foreach ($nasabahDataList as $uData) {
            $identifier = $uData['user_type'] === 'siswa' ? $uData['nis'] : $uData['nip'];
            $uData['email'] = $identifier . '@sekolah.sch.id';
            $uData['password'] = Hash::make($identifier);

            $user = User::updateOrCreate(
                ['username' => $uData['username']],
                $uData
            );

            $jurusanKode = $user->user_type === 'siswa' ? ['TKJ', 'RPL', 'MM', 'AKL'][rand(0, 3)] : null;
            $jurusanId = $jurusanKode ? \App\Models\Jurusan::where('kode', $jurusanKode)->first()->id : null;
            
            // Assign a random rombel for students
            $rombelId = null;
            if ($user->user_type === 'siswa' && $jurusanId) {
                // Find rando rombel for this jurusan
                $rombel = \App\Models\Rombel::where('jurusan_id', $jurusanId)->inRandomOrder()->first();
                $rombelId = $rombel?->id;
            }

            $nasabah = Nasabah::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'nomor_rekening' => $user->user_type === 'siswa' ? $user->nis : $user->nip,
                    'saldo' => rand(100000, 5000000),
                    'saldo_minimum' => 10000,
                    'status' => 'aktif',
                    'tanggal_buka' => now()->subDays(rand(1, 365)),
                    'alamat' => 'Jl. Contoh No. ' . rand(1, 100),
                    'jurusan_id' => $jurusanId,
                    'rombel_id' => $rombelId,
                ]
            );

            // Create some transactions if none exist
            if ($nasabah->wasRecentlyCreated || Transaksi::where('nasabah_id', $nasabah->id)->count() === 0) {
                $transactionCount = rand(3, 10);
                for ($i = 0; $i < $transactionCount; $i++) {
                    $jenisTransaksi = ['setor', 'tarik'][rand(0, 1)];
                    $jumlah = rand(10000, 500000);
                    $saldoSebelum = $nasabah->saldo;

                    if ($jenisTransaksi === 'setor') {
                        $saldoSesudah = $saldoSebelum + $jumlah;
                    } else {
                        $saldoSesudah = $saldoSebelum - $jumlah;
                        if ($saldoSesudah < $nasabah->saldo_minimum)
                            continue;
                    }

                    $createdAt = now()->subDays(rand(0, 30));

                    Transaksi::create([
                        'kode_transaksi' => 'TRX' . strtoupper(\Illuminate\Support\Str::random(8)),
                        'nasabah_id' => $nasabah->id,
                        'user_id' => [$teller1->id, $teller2->id][rand(0, 1)],
                        'jenis_transaksi' => $jenisTransaksi,
                        'jumlah' => $jumlah,
                        'saldo_sebelum' => $saldoSebelum,
                        'saldo_sesudah' => $saldoSesudah,
                        'keterangan' => 'Transaksi ' . ucfirst($jenisTransaksi) . ' tunai',
                        'created_at' => $createdAt,
                        'updated_at' => $createdAt,
                    ]);

                    $nasabah->saldo = $saldoSesudah;
                    $nasabah->save();
                }
            }
        }

        $this->command->info('Bank Mini seeder completed successfully!');

        // Print all seeded users
        $this->command->newLine();
        $this->command->info('LIST USER HASIL SEEDING:');
        $users = User::all(['name', 'email', 'role']);
        $headers = ['Nama', 'Email/Username', 'Role'];
        $this->command->table($headers, $users->toArray());

        $this->command->warn('Catatan:');
        $this->command->line('- Password Admin: admin');
        $this->command->line('- Password Nasabah: sesuai NIS/NIP masing-masing');
        $this->command->line('- Password lainnya: password');
        $this->command->newLine();
    }
}
