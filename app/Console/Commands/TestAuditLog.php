<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AuditLog;

class TestAuditLog extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:audit-log';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test audit logging functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Audit Log functionality...');
        
        // Test 1: Create manual log
        try {
            $log = AuditLog::create([
                'user_name' => 'Test User',
                'role' => 'teller',
                'action' => 'login',
                'description' => 'Test login manual from command',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'CLI Command',
                'status' => 'success',
            ]);
            
            $this->info('✓ Manual log created successfully');
        } catch (\Exception $e) {
            $this->error('✗ Manual log failed: ' . $e->getMessage());
        }
        
        // Test 2: Check total logs
        try {
            $total = AuditLog::count();
            $this->info("✓ Total logs in database: $total");
        } catch (\Exception $e) {
            $this->error('✗ Count failed: ' . $e->getMessage());
        }
        
        // Test 3: Get latest logs
        try {
            $logs = AuditLog::latest()->take(3)->get();
            $this->info('✓ Latest 3 logs:');
            foreach ($logs as $log) {
                $this->line("  - {$log->user_name} ({$log->role}) - {$log->action} - {$log->description}");
            }
        } catch (\Exception $e) {
            $this->error('✗ Query failed: ' . $e->getMessage());
        }
        
        // Test 4: Test filtering
        try {
            $filtered = AuditLog::where('action', 'login')->count();
            $this->info("✓ Login logs count: $filtered");
        } catch (\Exception $e) {
            $this->error('✗ Filter test failed: ' . $e->getMessage());
        }
        
        $this->info('Audit Log test completed!');
    }
}
