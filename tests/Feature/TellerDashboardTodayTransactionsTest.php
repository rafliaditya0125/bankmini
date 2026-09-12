<?php

namespace Tests\Feature;

use App\Models\Nasabah;
use App\Models\Setting;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TellerDashboardTodayTransactionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $teller;
    protected User $otherTeller;
    protected Nasabah $nasabah;
    protected string $timezone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->timezone = Setting::get('timezone', 'Asia/Jakarta');

        // Create teller
        $this->teller = User::create([
            'name' => 'Teller Satu',
            'email' => 'teller1@bankmini.test',
            'username' => 'teller1',
            'password' => Hash::make('password123'),
            'role' => 'teller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        // Create other teller
        $this->otherTeller = User::create([
            'name' => 'Teller Dua',
            'email' => 'teller2@bankmini.test',
            'username' => 'teller2',
            'password' => Hash::make('password123'),
            'role' => 'teller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        // Create nasabah user and profile
        $nasabahUser = User::create([
            'name' => 'Siswa Test',
            'email' => 'siswa@bankmini.test',
            'username' => 'siswatest',
            'password' => Hash::make('password123'),
            'role' => 'nasabah',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $nasabahUser->id,
            'nomor_rekening' => '1234567890',
            'saldo' => 500000,
            'saldo_minimum' => 10000,
            'status' => 'aktif',
        ]);
    }

    public function test_teller_dashboard_only_shows_todays_transactions()
    {
        $today = Carbon::today($this->timezone);

        // Transaction yesterday by this teller (should NOT appear)
        $txYesterday = Transaksi::create([
            'kode_transaksi' => 'TX-YESTERDAY',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->teller->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 100000,
            'saldo_sebelum' => 400000,
            'saldo_sesudah' => 500000,
            'status' => 'completed',
        ]);
        $txYesterday->created_at = $today->copy()->subDays(2)->setTime(10, 0, 0);
        $txYesterday->save();

        // Transaction today by this teller (SHOULD appear)
        $txToday = Transaksi::create([
            'kode_transaksi' => 'TX-TODAY-1',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->teller->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 50000,
            'saldo_sebelum' => 500000,
            'saldo_sesudah' => 550000,
            'status' => 'completed',
            'created_at' => $today->copy()->setTime(11, 0, 0),
        ]);

        // Cancelled transaction today by this teller (should NOT appear)
        $txCancelledToday = Transaksi::create([
            'kode_transaksi' => 'TX-CANCELLED',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->teller->id,
            'jenis_transaksi' => 'tarik',
            'jumlah' => 20000,
            'saldo_sebelum' => 550000,
            'saldo_sesudah' => 530000,
            'status' => 'cancelled',
            'created_at' => $today->copy()->setTime(12, 0, 0),
        ]);

        // Transaction today by other teller (should NOT appear)
        $txOtherTeller = Transaksi::create([
            'kode_transaksi' => 'TX-OTHER-TELLER',
            'nasabah_id' => $this->nasabah->id,
            'user_id' => $this->otherTeller->id,
            'jenis_transaksi' => 'setor',
            'jumlah' => 75000,
            'saldo_sebelum' => 550000,
            'saldo_sesudah' => 625000,
            'status' => 'completed',
            'created_at' => $today->copy()->setTime(13, 0, 0),
        ]);

        $response = $this->actingAs($this->teller)->get(route('teller.dashboard'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('teller/Dashboard')
            ->has('recent_transactions', 1)
            ->where('recent_transactions.0.kode_transaksi', 'TX-TODAY-1')
            ->where('stats.transaksi_hari_ini', 1)
            ->where('stats.total_setor', 50000)
            ->where('stats.total_tarik', 0)
        );
    }
}
