<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AuditLog;
use Carbon\Carbon;

class AuditLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sampleLogs = [
            [
                'user_name' => 'Admin User',
                'role' => 'superadmin',
                'action' => 'login',
                'description' => 'User berhasil login ke sistem',
                'ip_address' => '192.168.1.100',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'status' => 'success',
                'created_at' => Carbon::now()->subMinutes(30),
            ],
            [
                'user_name' => 'Teller 1',
                'role' => 'teller',
                'action' => 'login',
                'description' => 'User berhasil login ke sistem',
                'ip_address' => '192.168.1.101',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'status' => 'success',
                'created_at' => Carbon::now()->subMinutes(25),
            ],
            [
                'user_name' => 'Teller 1',
                'role' => 'teller',
                'action' => 'setor',
                'description' => 'Transaksi setor sebesar Rp 500.000 untuk nasabah N001',
                'ip_address' => '192.168.1.101',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'status' => 'success',
                'created_at' => Carbon::now()->subMinutes(20),
            ],
            [
                'user_name' => 'Teller 2',
                'role' => 'teller',
                'action' => 'login',
                'description' => 'User berhasil login ke sistem',
                'ip_address' => '192.168.1.102',
                'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'status' => 'success',
                'created_at' => Carbon::now()->subMinutes(15),
            ],
            [
                'user_name' => 'Unknown User',
                'role' => 'guest',
                'action' => 'login_failed',
                'description' => 'Login gagal: password salah untuk user admin',
                'ip_address' => '192.168.1.103',
                'user_agent' => 'Mozilla/5.0 (compatible; scanner/1.0)',
                'status' => 'failed',
                'created_at' => Carbon::now()->subMinutes(10),
            ],
        ];

        foreach ($sampleLogs as $log) {
            AuditLog::create($log);
        }
    }
}
