<?php

namespace Tests\Feature;

use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class NasabahWalletMutasiTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected Nasabah $nasabah;
    protected Wallet $wallet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bankmini.smk',
            'username' => 'superadmin',
            'password' => bcrypt('superadmin'),
            'role' => 'superadmin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $jurusan = Jurusan::create(['nama' => 'Rekayasa Perangkat Lunak', 'kode' => 'RPL']);
        $rombel = Rombel::create([
            'jurusan_id' => $jurusan->id,
            'tahun_ajaran' => '2024/2025',
            'tingkat' => 11,
            'nomor_rombel' => 1,
            'nama' => '11 RPL 1'
        ]);

        $nasabahUser = User::create([
            'name' => 'Budi Nasabah',
            'email' => 'budi@bankmini.smk',
            'username' => 'budinasabah',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $nasabahUser->id,
            'nomor_rekening' => '1234567890',
            'saldo' => 350000,
            'status' => 'aktif',
            'rombel_id' => $rombel->id,
            'jurusan_id' => $jurusan->id,
            'kelas' => '11 RPL 1',
        ]);

        $walletType = WalletType::firstOrCreate(
            ['name' => 'Tabungan Utama'],
            ['is_default' => true, 'description' => 'Tabungan utama']
        );

        $this->wallet = Wallet::create([
            'nasabah_id' => $this->nasabah->id,
            'wallet_type_id' => $walletType->id,
            'wallet_number' => 'W-1234567890',
            'balance' => 350000,
            'status' => 'active',
        ]);
    }

    public function test_nasabah_show_provides_wallet_statistics_and_mutation(): void
    {
        $this->actingAs($this->superadmin);

        $today = now()->toDateString();

        // Transaction 1: Setoran bulan ini
        Transaksi::create([
            'kode_transaksi' => 'TRX-SETOR-01',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->superadmin->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 200000,
            'saldo_sebelum' => 250000,
            'saldo_sesudah' => 450000,
            'status' => 'completed',
            'tanggal_transaksi' => $today,
            'wallet_id' => $this->wallet->id,
        ]);

        // Transaction 2: Penarikan bulan ini
        Transaksi::create([
            'kode_transaksi' => 'TRX-TARIK-01',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->superadmin->id,
            'jenis_transaksi' => 'tarik',
            'jumlah' => 100000,
            'saldo_sebelum' => 450000,
            'saldo_sesudah' => 350000,
            'status' => 'completed',
            'tanggal_transaksi' => $today,
            'wallet_id' => $this->wallet->id,
        ]);

        $response = $this->get(route('superadmin.nasabah.show', $this->nasabah->id));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/nasabah/Show')
            ->has('wallets', 1)
            ->has('wallets.0.stats', fn (Assert $stats) => $stats
                ->where('setoran_bulan_ini', 200000)
                ->where('penarikan_bulan_ini', 100000)
                ->where('saldo_saat_ini', 350000)
                // saldo_bulan_lalu = 350000 - 200000 + 100000 = 250000
                ->where('saldo_bulan_lalu', 250000)
            )
            ->has('wallets.0.mutasi', 2)
            ->where('wallets.0.mutasi.0.kode_transaksi', 'TRX-TARIK-01')
            ->where('wallets.0.mutasi.0.flow', 'out')
            ->where('wallets.0.mutasi.1.kode_transaksi', 'TRX-SETOR-01')
            ->where('wallets.0.mutasi.1.flow', 'in')
        );
    }

    public function test_can_export_wallet_mutasi_as_excel(): void
    {
        $this->actingAs($this->superadmin);

        Transaksi::create([
            'kode_transaksi' => 'TRX-SETOR-01',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->superadmin->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 200000,
            'saldo_sebelum' => 250000,
            'saldo_sesudah' => 450000,
            'status' => 'completed',
            'tanggal_transaksi' => now()->toDateString(),
            'wallet_id' => $this->wallet->id,
        ]);

        $response = $this->get(route('superadmin.nasabah.mutasi-export', [
            'nasabah' => $this->nasabah->id,
            'wallet_id' => $this->wallet->id,
            'format' => 'excel',
        ]));

        $response->assertStatus(200);
        $this->assertTrue(str_contains(
            $response->headers->get('content-type') ?? '',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ));
        $this->assertTrue(str_contains(
            $response->headers->get('content-disposition') ?? '',
            'attachment;'
        ));
    }

    public function test_can_export_wallet_mutasi_as_pdf(): void
    {
        $this->actingAs($this->superadmin);

        Transaksi::create([
            'kode_transaksi' => 'TRX-TARIK-01',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->superadmin->id,
            'jenis_transaksi' => 'tarik',
            'jumlah' => 50000,
            'saldo_sebelum' => 350000,
            'saldo_sesudah' => 300000,
            'status' => 'completed',
            'tanggal_transaksi' => now()->toDateString(),
            'wallet_id' => $this->wallet->id,
        ]);

        $response = $this->get(route('superadmin.nasabah.mutasi-export', [
            'nasabah' => $this->nasabah->id,
            'wallet_id' => $this->wallet->id,
            'format' => 'pdf',
        ]));

        $response->assertStatus(200);
        $response->assertViewIs('exports.mutasi_wallet');
        $response->assertSee('TRX-TARIK-01');
        $response->assertSee('Budi Nasabah');
        $response->assertSee('Rekening Koran');
    }
}
