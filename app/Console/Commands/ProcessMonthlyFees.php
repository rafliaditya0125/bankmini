<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ProcessMonthlyFees extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:process-monthly-fees {--force : Force execution regardless of the configured day}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process monthly interest and administration fees for all active nasabah';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $defaultInterestRate = (float) \App\Models\Setting::get('monthly_interest_rate', 0.1);
        $defaultAdminFee = (int) \App\Models\Setting::get('monthly_admin_fee', 5000);

        $interestRateByType = [
            'siswa' => (float) \App\Models\Setting::get('monthly_interest_rate_siswa', $defaultInterestRate),
            'kelas' => (float) \App\Models\Setting::get('monthly_interest_rate_kelas', $defaultInterestRate),
            'organisasi' => (float) \App\Models\Setting::get('monthly_interest_rate_organisasi', $defaultInterestRate),
            'guru' => (float) \App\Models\Setting::get('monthly_interest_rate_guru', $defaultInterestRate),
        ];

        $adminFeeByType = [
            'siswa' => (int) \App\Models\Setting::get('monthly_admin_fee_siswa', $defaultAdminFee),
            'kelas' => (int) \App\Models\Setting::get('monthly_admin_fee_kelas', $defaultAdminFee),
            'organisasi' => (int) \App\Models\Setting::get('monthly_admin_fee_organisasi', $defaultAdminFee),
            'guru' => (int) \App\Models\Setting::get('monthly_admin_fee_guru', $defaultAdminFee),
        ];

        $processDay = (int) \App\Models\Setting::get('monthly_process_day', 28);
        $processHour = (int) \App\Models\Setting::get('monthly_process_hour', 0);
        $force = $this->option('force');

        $now = now();
        $today = $now->day;
        $currentHour = $now->hour;

        if (!$force && ($today != $processDay || $currentHour != $processHour)) {
            $this->info("Current Time: Day $today, Hour $currentHour. Scheduled: Day $processDay, Hour $processHour. Skipping.");
            return;
        }

        $baseDate = $now->copy()->setHour($processHour)->setMinute(0)->setSecond(0);

        $this->info("Processing monthly interest and fees...");

        $nasabahs = \App\Models\Nasabah::with('user')->where('status', 'aktif')->get();
        $count = 0;
        
        $admin = \App\Models\User::where('role', 'admin')->first();
        $adminId = $admin ? $admin->id : 1; // Fallback to 1 if no admin
        
        $dateStr = now()->format('Ymd');
        $lastTransaksi = \App\Models\Transaksi::where('kode_transaksi', 'like', 'TRX' . $dateStr . '%')
            ->orderBy('kode_transaksi', 'desc')
            ->first();
            
        $sequence = 1;
        if ($lastTransaksi) {
            $lastSequence = (int) substr($lastTransaksi->kode_transaksi, -5);
            $sequence = $lastSequence + 1;
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($nasabahs, $interestRateByType, $adminFeeByType, $defaultInterestRate, $defaultAdminFee, $adminId, &$count, $dateStr, &$sequence, $baseDate) {
            foreach ($nasabahs as $nasabah) {
                $userType = $nasabah->user?->user_type ?? 'siswa';
                $interestRate = $interestRateByType[$userType] ?? $defaultInterestRate;
                $adminFee = $adminFeeByType[$userType] ?? $defaultAdminFee;

                // Check if already processed this month
                $alreadyProcessed = \App\Models\Transaksi::where('nasabah_id', $nasabah->id)
                    ->whereIn('jenis_transaksi', ['bunga', 'biaya_admin'])
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->exists();

                if ($alreadyProcessed) {
                    $this->line("Nasabah {$nasabah->nomor_rekening} already processed. Skipping.");
                    continue;
                }

                // 1. Process Interest (Bunga)
                if ($interestRate > 0) {
                    $bungaAmount = round($nasabah->saldo * ($interestRate / 100), 2);
                    if ($bungaAmount > 0) {
                        $kode = 'TRX' . $dateStr . str_pad($sequence++, 5, '0', STR_PAD_LEFT);
                        $tx = new \App\Models\Transaksi();
                        $tx->kode_transaksi = $kode;
                        $tx->nasabah_id = $nasabah->id;
                        $tx->user_id = $adminId;
                        $tx->jenis_transaksi = 'bunga';
                        $tx->jumlah = $bungaAmount;
                        $tx->saldo_sebelum = $nasabah->saldo;
                        $tx->saldo_sesudah = $nasabah->saldo + $bungaAmount;
                        $tx->keterangan = "Bunga tabungan bulanan {$userType} (" . $interestRate . "%)";
                        $tx->status = 'completed';
                        $tx->created_at = $baseDate;
                        $tx->save();
                        
                        $nasabah->increment('saldo', $bungaAmount);
                    }
                }

                // 2. Process Admin Fee (Biaya Admin)
                if ($adminFee > 0) {
                    if ($nasabah->saldo >= $adminFee) {
                        $kode = 'TRX' . $dateStr . str_pad($sequence++, 5, '0', STR_PAD_LEFT);
                        $tx = new \App\Models\Transaksi();
                        $tx->kode_transaksi = $kode;
                        $tx->nasabah_id = $nasabah->id;
                        $tx->user_id = $adminId;
                        $tx->jenis_transaksi = 'biaya_admin';
                        $tx->jumlah = $adminFee;
                        $tx->saldo_sebelum = $nasabah->saldo;
                        $tx->saldo_sesudah = $nasabah->saldo - $adminFee;
                        $tx->keterangan = "Biaya administrasi bulanan {$userType}";
                        $tx->status = 'completed';
                        $tx->created_at = $baseDate->copy()->addMinute();
                        $tx->save();
                        
                        $nasabah->decrement('saldo', $adminFee);
                    }
                }

                $count++;
            }
        });

        $this->info("Successfully processed $count nasabah.");
        \App\Models\AuditLog::logActivity(
            'process_monthly_fees',
            "Pemrosesan bunga dan biaya admin bulanan per tipe nasabah untuk $count nasabah.",
            'success',
            null,
            'System',
            'system'
        );
    }
}
