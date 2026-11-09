<?php

namespace Tests\Feature;

use App\Models\Nasabah;
use App\Models\Setting;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\WalletType;
use App\Services\MonthlyFeeService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyFeesAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $siswaUser;
    protected Nasabah $nasabah;

    protected function setUp(): void
    {
        parent::setUp();

        // Create superadmin
        $this->superadmin = User::create([
            'name' => 'Superadmin Test',
            'username' => 'superadmintest',
            'email' => 'superadmin@example.com',
            'password' => bcrypt('password'),
            'role' => 'superadmin',
            'email_verified_at' => now(),
        ]);

        // Create nasabah
        $this->siswaUser = User::create([
            'name' => 'Siswa Test',
            'username' => 'siswatest',
            'email' => 'siswa@example.com',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $this->siswaUser->id,
            'nomor_rekening' => '1000000001',
            'saldo' => 100000,
            'status' => 'aktif',
            'baris_terakhir_buku' => 0,
        ]);
    }

    public function test_monthly_process_hour_persists_and_returns_in_settings(): void
    {
        $this->actingAs($this->superadmin);

        // Save hour = 14
        $response = $this->post('/superadmin/pengaturan', [
            'monthly_process_day' => 28,
            'monthly_process_hour' => 14,
        ]);

        $response->assertRedirect();
        $this->assertEquals('14', Setting::get('monthly_process_hour'));

        // Visit settings page and verify prop contains monthly_process_hour
        $getResponse = $this->get('/superadmin/pengaturan');
        $getResponse->assertOk();
        $settings = $getResponse->viewData('page')['props']['settings'];

        $this->assertArrayHasKey('monthly_process_hour', $settings);
        $this->assertEquals(14, $settings['monthly_process_hour']);
    }

    public function test_monthly_fee_service_is_due_logic(): void
    {
        Setting::set('monthly_process_day', 28);
        Setting::set('monthly_process_hour', 10);
        Setting::set('timezone', 'Asia/Jakarta');
        Setting::set('monthly_fees_last_completed_period', '');

        // Time before scheduled: 28th at 09:59
        $before = Carbon::create(2026, 11, 28, 9, 59, 0, 'Asia/Jakarta');
        $this->assertFalse(MonthlyFeeService::isDue($before));

        // Time at scheduled: 28th at 10:00
        $at = Carbon::create(2026, 11, 28, 10, 0, 0, 'Asia/Jakarta');
        $this->assertTrue(MonthlyFeeService::isDue($at));

        // Time after scheduled: 29th at 12:00
        $after = Carbon::create(2026, 11, 29, 12, 0, 0, 'Asia/Jakarta');
        $this->assertTrue(MonthlyFeeService::isDue($after));

        // If marked completed for this period
        Setting::set('monthly_fees_last_completed_period', '2026-11');
        $this->assertFalse(MonthlyFeeService::isDue($after));
    }

    public function test_monthly_fee_service_processes_interest_and_admin_fee(): void
    {
        Setting::set('monthly_interest_rate_siswa', 1.0); // 1% of 100,000 = 1,000
        Setting::set('monthly_admin_fee_siswa', 2500); // Admin fee = 2,500

        $result = MonthlyFeeService::process(force: true);

        $this->assertEquals('success', $result['status']);
        $this->assertEquals(1, $result['processed']);

        $this->nasabah->refresh();
        // Saldo: 100,000 + 1,000 (bunga) - 2,500 (biaya_admin) = 98,500
        $this->assertEquals(98500, (float) $this->nasabah->saldo);

        // Verify transactions created
        $bungaTx = Transaksi::where('nasabah_id', $this->nasabah->id)
            ->where('jenis_transaksi', 'bunga')
            ->first();
        $this->assertNotNull($bungaTx);
        $this->assertEquals(1000, (float) $bungaTx->jumlah);

        $adminTx = Transaksi::where('nasabah_id', $this->nasabah->id)
            ->where('jenis_transaksi', 'biaya_admin')
            ->first();
        $this->assertNotNull($adminTx);
        $this->assertEquals(2500, (float) $adminTx->jumlah);

        // Verify period marked completed
        $this->assertEquals(now(MonthlyFeeService::getTimezone())->format('Y-m'), Setting::get('monthly_fees_last_completed_period'));

        // Running again without force should skip because period is completed
        $secondRun = MonthlyFeeService::process(force: false);
        $this->assertEquals('skipped', $secondRun['status']);
        $this->assertEquals(0, $secondRun['processed']);
    }

    public function test_console_command_runs_successfully(): void
    {
        $this->artisan('app:process-monthly-fees', ['--force' => true])
            ->assertSuccessful();
    }

    public function test_superadmin_can_trigger_process_fees_now_endpoint(): void
    {
        $this->actingAs($this->superadmin);

        $response = $this->post('/superadmin/pengaturan/process-fees-now');
        $response->assertRedirect();
        $response->assertSessionHas('success');
    }
}
