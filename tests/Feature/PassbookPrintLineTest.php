<?php

namespace Tests\Feature;

use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PassbookPrintLineTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Nasabah $nasabah;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Siswa Test',
            'username' => 'siswatest',
            'email' => 'siswa@example.com',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $this->user->id,
            'nomor_rekening' => '1234567890',
            'saldo' => 500000,
            'status' => 'aktif',
            'baris_terakhir_buku' => 0,
        ]);
    }

    public function test_get_baris_buku_defaults_to_line_one_when_empty(): void
    {
        $response = $this->getJson('/api/nasabah/baris-buku?rekening=' . $this->nasabah->nomor_rekening);

        $response->assertOk()
            ->assertJson([
                'baris_terakhir' => 0,
                'next_baris' => 1,
            ]);
    }

    public function test_get_baris_buku_returns_next_line_after_last_line(): void
    {
        $this->nasabah->update(['baris_terakhir_buku' => 5]);

        $response = $this->getJson('/api/nasabah/baris-buku?rekening=' . $this->nasabah->nomor_rekening);

        $response->assertOk()
            ->assertJson([
                'baris_terakhir' => 5,
                'next_baris' => 6,
            ]);
    }

    public function test_get_baris_buku_wraps_around_to_line_one_when_reaches_line_40(): void
    {
        $this->nasabah->update(['baris_terakhir_buku' => 40]);

        $response = $this->getJson('/api/nasabah/baris-buku?rekening=' . $this->nasabah->nomor_rekening);

        $response->assertOk()
            ->assertJson([
                'baris_terakhir' => 40,
                'next_baris' => 1,
            ]);
    }

    public function test_update_baris_buku_saves_as_last_line_in_database(): void
    {
        $tx = Transaksi::create([
            'kode_transaksi' => 'TRX2026110900001',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->user->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 100000,
            'saldo_sebelum' => 500000,
            'saldo_sesudah' => 600000,
            'status' => 'completed',
        ]);

        $response = $this->postJson('/api/nasabah/baris-buku', [
            'rekening' => $this->nasabah->nomor_rekening,
            'kode_transaksi' => $tx->kode_transaksi,
            'baris' => 12,
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'baris_terakhir' => 12,
                'next_baris' => 13,
            ]);

        $this->assertEquals(12, $this->nasabah->fresh()->baris_terakhir_buku);
        $this->assertEquals(12, $tx->fresh()->baris_cetak);

        // Next GET should return 12 + 1 = 13
        $nextResponse = $this->getJson('/api/nasabah/baris-buku?rekening=' . $this->nasabah->nomor_rekening);
        $nextResponse->assertOk()
            ->assertJson([
                'baris_terakhir' => 12,
                'next_baris' => 13,
            ]);
    }
}
