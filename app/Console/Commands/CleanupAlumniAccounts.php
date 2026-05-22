<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Nasabah;
use App\Models\Setting;
use App\Models\AuditLog;
use App\Models\AuditTrail;
use Illuminate\Support\Facades\DB;

class CleanupAlumniAccounts extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:cleanup-alumni {--force : Force cleanup without confirmation}';

    /**
     * The console command description.
     */
    protected $description = 'Cleanup graduated student accounts that have exceeded the retention period and have zero balance';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $retentionYears = (int) Setting::get('alumni_retention_years', 3);
        $retentionDays = (int) Setting::get('alumni_retention_days', 0);

        $cutoffDate = now()->subYears($retentionYears)->subDays($retentionDays);

        $this->info("Alumni retention period: {$retentionYears} year(s) and {$retentionDays} day(s)");
        $this->info("Cutoff date: {$cutoffDate->format('Y-m-d')}");

        // Find alumni accounts past retention with zero balance
        $alumniToDelete = Nasabah::where('kelas', 'Alumni')
            ->whereNotNull('tanggal_lulus')
            ->where('tanggal_lulus', '<=', $cutoffDate)
            ->where('saldo', '<=', 0)
            ->with('user')
            ->get();

        // Find alumni past retention with remaining balance (just for info)
        $alumniWithBalance = Nasabah::where('kelas', 'Alumni')
            ->whereNotNull('tanggal_lulus')
            ->where('tanggal_lulus', '<=', $cutoffDate)
            ->where('saldo', '>', 0)
            ->count();

        if ($alumniToDelete->isEmpty()) {
            $this->info('No alumni accounts eligible for cleanup.');
            if ($alumniWithBalance > 0) {
                $this->warn("{$alumniWithBalance} alumni account(s) past retention still have balance and will be kept active.");
            }
            return;
        }

        $this->info("Found {$alumniToDelete->count()} alumni account(s) eligible for deletion.");
        if ($alumniWithBalance > 0) {
            $this->warn("{$alumniWithBalance} alumni account(s) past retention still have balance and will be kept active.");
        }

        if (!$this->option('force') && !$this->confirm('Do you want to proceed with deletion?')) {
            $this->info('Cleanup cancelled.');
            return;
        }

        $deletedCount = 0;

        DB::transaction(function () use ($alumniToDelete, &$deletedCount) {
            foreach ($alumniToDelete as $nasabah) {
                $userName = $nasabah->user ? $nasabah->user->name : 'Unknown';
                $userId = $nasabah->user_id;

                // Delete nasabah record (hard delete)
                $nasabah->delete();

                // Delete user record
                DB::table('users')->where('id', $userId)->delete();

                $this->line("Deleted alumni: {$userName}");
                $deletedCount++;
            }
        });

        $this->info("Successfully cleaned up {$deletedCount} alumni account(s).");

        AuditTrail::log(
            "Pembersihan otomatis: {$deletedCount} akun alumni yang telah melewati batas retensi dihapus.",
            'Nasabah'
        );
    }
}
