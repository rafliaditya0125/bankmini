<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default Settings
        $settings = [
            // UMUM
            'bank_name' => 'Ebank School',
            'school_name' => 'SMK NEGERI 1 CIAMIS',
            'address' => 'Jl. Jend. Sudirman No. 269, Ciamis',
            'bank_city' => 'CIAMIS',
            'phone' => '(0265) 771204',

            // KEAMANAN
            'ip_blacklist' => '',
            'throttle_login_limit' => '5',
            'throttle_transaction_limit' => '60',

            // TRANSAKSI
            'min_deposit' => '1000',
            'min_withdraw' => '1000',
            'max_transfer' => '5000000',
            'daily_transfer_limit' => '10000000',
            'monthly_interest_rate' => '0.1',
            'monthly_admin_fee' => '5000',
            'monthly_interest_rate_siswa' => '0.1',
            'monthly_interest_rate_kelas' => '0.1',
            'monthly_interest_rate_organisasi' => '0.1',
            'monthly_interest_rate_guru' => '0.1',
            'monthly_admin_fee_siswa' => '5000',
            'monthly_admin_fee_kelas' => '5000',
            'monthly_admin_fee_organisasi' => '5000',
            'monthly_admin_fee_guru' => '5000',
            'monthly_process_day' => '28',
            'min_cash_denomination' => '100',
            'transaction_types' => 'Tunai, Transfer, Kliring, Cek / BG',
            'bkk_bkm_mode' => 'manual',

            // LAPORAN
            'teacher_responsible_name' => 'Guru Penanggung Jawab',

            // SISTEM
            'maintenance_mode' => '0',
            'app_url' => config('app.url'),
            'timezone' => 'Asia/Jakarta',
            'language' => 'id',
            'cache_ttl' => '60',
            'log_level' => 'Info',
            'max_log_size' => '100',
            'api_rate_limit' => '60',
            'api_token_expiry' => '24',

            // SESSION
            'session_lifetime' => '7',

            // DATABASE
            'db_host' => config('database.connections.mysql.host'),
            'db_port' => config('database.connections.mysql.port'),
            'db_name' => config('database.connections.mysql.database'),
            'db_timeout' => '30',
            'db_cache_size' => '64',
            'db_max_connections' => '100',
            'db_optimize_schedule' => 'Daily at 02:00',
            'db_log_retention' => '30',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        $this->command->info('Settings seeder completed successfully!');
    }
}
