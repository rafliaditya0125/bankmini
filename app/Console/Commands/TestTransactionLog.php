<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class TestTransactionLog extends Command
{
    protected $signature = 'test:transaction-log';
    protected $description = 'Test transaction logging functionality';

    public function handle()
    {
        $this->info('Testing Transaction Log functionality...');
        
        // Find a teller user for testing
        $teller = User::where('role', 'teller')->first();
        if (!$teller) {
            $this->error('No teller user found for testing');
            return;
        }
        
        $this->info("Using teller: {$teller->name} ({$teller->email})");
        
        // Test 1: Test setor logging
        try {
            // Simulate auth user
            Auth::login($teller);
            
            $log = AuditLog::logActivity(
                'setor',
                'Transaksi setor sebesar Rp 500.000 untuk nasabah N001',
                'success',
                $teller->id,
                $teller->name,
                'teller'
            );
            
            $this->info('✓ Setor log created successfully');
        } catch (\Exception $e) {
            $this->error('✗ Setor log failed: ' . $e->getMessage());
        }
        
        // Test 2: Test tarik logging
        try {
            $log = AuditLog::logActivity(
                'tarik',
                'Transaksi tarik sebesar Rp 200.000 dari rekening N002',
                'success',
                $teller->id,
                $teller->name,
                'teller'
            );
            
            $this->info('✓ Tarik log created successfully');
        } catch (\Exception $e) {
            $this->error('✗ Tarik log failed: ' . $e->getMessage());
        }
        
        // Test 3: Test transfer logging
        try {
            $log = AuditLog::logActivity(
                'transfer',
                'Transfer sebesar Rp 1.000.000 dari N001 ke N003',
                'success',
                $teller->id,
                $teller->name,
                'teller'
            );
            
            $this->info('✓ Transfer log created successfully');
        } catch (\Exception $e) {
            $this->error('✗ Transfer log failed: ' . $e->getMessage());
        }
        
        // Test 4: Check total logs
        try {
            $total = AuditLog::count();
            $this->info("✓ Total logs in database: $total");
        } catch (\Exception $e) {
            $this->error('✗ Count failed: ' . $e->getMessage());
        }
        
        // Test 5: Get latest logs
        try {
            $logs = AuditLog::latest()->take(5)->get();
            $this->info('✓ Latest 5 logs:');
            foreach ($logs as $log) {
                $this->line("  - {$log->user_name} ({$log->role}) - {$log->action} - {$log->description}");
            }
        } catch (\Exception $e) {
            $this->error('✗ Query failed: ' . $e->getMessage());
        }
        
        // Test 6: Test filtering by action
        try {
            $setorLogs = AuditLog::where('action', 'setor')->count();
            $tarikLogs = AuditLog::where('action', 'tarik')->count();
            $transferLogs = AuditLog::where('action', 'transfer')->count();
            
            $this->info("✓ Setor logs: $setorLogs");
            $this->info("✓ Tarik logs: $tarikLogs");
            $this->info("✓ Transfer logs: $transferLogs");
        } catch (\Exception $e) {
            $this->error('✗ Filter test failed: ' . $e->getMessage());
        }
        
        $this->info('Transaction Log test completed!');
    }
}
