<?php

namespace Tests\Feature;

use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NasabahDashboardCancelledTransactionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $teller;
    protected User $nasabahUser;
    protected Nasabah $nasabah;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teller = User::create([
            'name' => 'Teller Satu',
            'email' => 'teller1@bankmini.test',
            'username' => 'teller1',
            'password' => Hash::make('password123'),
            'role' => 'teller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->nasabahUser = User::create([
            'name' => 'Siswa Test',
            'email' => 'siswa@bankmini.test',
            'username' => 'siswatest',
            'password' => Hash::make('password123'),
            'role' => 'nasabah',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $this->nasabahUser->id,
            'nomor_rekening' => '1234567890',
            'saldo' => 500000,
            'saldo_minimum' => 10000,
            'status' => 'aktif',
        ]);
    }

    public function test_nasabah_dashboard_excludes_cancelled_transactions()
    {
        // Active completed transaction
        $txValid = Transaksi::create([
            'kode_transaksi' => 'TX-VALID-1',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->teller->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 50000,
            'saldo_sebelum' => 450000,
            'saldo_sesudah' => 500000,
            'status' => 'completed',
        ]);

        // Cancelled transaction (must NOT appear on dashboard)
        $txCancelled = Transaksi::create([
            'kode_transaksi' => 'TX-CANCELLED-1',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->teller->id,
            'jenis_transaksi' => 'tarik',
            'jumlah' => 20000,
            'saldo_sebelum' => 500000,
            'saldo_sesudah' => 480000,
            'status' => 'cancelled',
            'cancel_reason' => 'Salah input nominal',
        ]);

        $response = $this->actingAs($this->nasabahUser)->get(route('nasabah.dashboard'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('nasabah/Dashboard')
            ->has('recent_transactions', 1)
            ->where('recent_transactions.0.kode_transaksi', 'TX-VALID-1')
        );
    }
}
