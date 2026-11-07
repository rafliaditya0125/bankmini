<?php

namespace Tests\Feature;

use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class TransactionDateBugTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected Nasabah $nasabah;

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
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $nasabahUser->id,
            'nomor_rekening' => '111001001',
            'saldo' => 500000,
            'status' => 'aktif',
            'rombel_id' => $rombel->id,
        ]);
    }

    public function test_past_date_transaction_is_filtered_and_formatted_correctly_in_laporan()
    {
        $pastDate = '2026-10-01';

        // Create transaction with past date
        $tx = Transaksi::create([
            'kode_transaksi' => 'BKM001/10/26',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->superadmin->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 100000,
            'saldo_sebelum' => 400000,
            'saldo_sesudah' => 500000,
            'tanggal_transaksi' => $pastDate,
            'nama_petugas' => 'Teller Test',
        ]);

        $this->assertEquals($pastDate, $tx->fresh()->tanggal_transaksi);
        $this->assertEquals($pastDate, $tx->fresh()->created_at->toDateString());

        // Access laporan with past date filter
        $response = $this->actingAs($this->superadmin)
            ->get('/superadmin/laporan?date_from=2026-10-01&date_to=2026-10-01');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/Laporan')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.tanggal_transaksi', $pastDate)
            ->where('transactions.data.0.tanggal', fn ($val) => str_contains($val, '01/10/2026'))
        );

        // Filter for another date should NOT include the past transaction
        $responseOther = $this->actingAs($this->superadmin)
            ->get('/superadmin/laporan?date_from=2026-11-01&date_to=2026-11-05');

        $responseOther->assertStatus(200);
        $responseOther->assertInertia(fn (Assert $page) => $page
            ->has('transactions.data', 0)
        );

        // Test excel export includes the past date
        $responseExcel = $this->actingAs($this->superadmin)
            ->get('/superadmin/laporan?date_from=2026-10-01&date_to=2026-10-01&export=excel');

        $responseExcel->assertStatus(200);
        $responseExcel->assertSee('01/10/2026');

        // Test pdf export includes the past date
        $responsePdf = $this->actingAs($this->superadmin)
            ->get('/superadmin/laporan?date_from=2026-10-01&date_to=2026-10-01&export=pdf');

        $responsePdf->assertStatus(200);
        $responsePdf->assertSee('01/10/26');
    }

    public function test_transaction_service_returns_past_date()
    {
        $this->actingAs($this->superadmin);
        $service = app(\App\Services\TransactionService::class);
        $pastDate = '2026-09-15';

        $result = $service->setor([
            'kode_transaksi' => 'BKM002/09/26',
            'nomor_rekening' => $this->nasabah->nomor_rekening,
            'jumlah' => 50000,
            'tanggal_transaksi' => $pastDate,
            'jenis_transaksi' => 'tunai',
            'keterangan' => 'Setor lewat',
            'nama_petugas' => 'Teller Budi',
        ], 'teller');

        $this->assertEquals($pastDate, $result['tanggal_transaksi']);
        $this->assertStringStartsWith('2026-09-15', $result['tanggal']);
    }
}
