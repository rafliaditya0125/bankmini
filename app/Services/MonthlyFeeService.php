<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Nasabah;
use App\Models\Setting;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\WalletType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MonthlyFeeService
{
    public static function getTimezone(): string
    {
        return Setting::get('timezone', 'Asia/Jakarta');
    }

    public static function getScheduledTime(?Carbon $now = null): Carbon
    {
        $timezone = self::getTimezone();
        $now = $now ? $now->copy()->timezone($timezone) : now($timezone);

        $processDay = (int) Setting::get('monthly_process_day', 28);
        $processHour = (int) Setting::get('monthly_process_hour', 0);

        $targetDay = min($processDay, $now->daysInMonth);
        return $now->copy()->day($targetDay)->hour($processHour)->minute(0)->second(0);
    }

    public static function isDue(?Carbon $now = null): bool
    {
        $timezone = self::getTimezone();
        $now = $now ? $now->copy()->timezone($timezone) : now($timezone);

        $completedPeriod = Setting::get('monthly_fees_last_completed_period');
        if ($completedPeriod === $now->format('Y-m')) {
            return false;
        }

        $scheduledTime = self::getScheduledTime($now);
        return $now->gte($scheduledTime);
    }

    public static function hasUnprocessedNasabah(?Carbon $now = null): bool
    {
        $timezone = self::getTimezone();
        $now = $now ? $now->copy()->timezone($timezone) : now($timezone);

        if (Setting::get('monthly_fees_last_completed_period') === $now->format('Y-m')) {
            return false;
        }

        return Nasabah::where('status', 'aktif')
            ->whereDoesntHave('transaksi', function ($q) use ($now) {
                $q->whereIn('jenis_transaksi', ['bunga', 'biaya_admin'])
                    ->where(function ($sq) use ($now) {
                        $sq->where(function ($sub) use ($now) {
                            $sub->whereMonth('tanggal_transaksi', $now->month)
                                ->whereYear('tanggal_transaksi', $now->year);
                        })->orWhere(function ($sub) use ($now) {
                            $sub->whereNull('tanggal_transaksi')
                                ->whereMonth('created_at', $now->month)
                                ->whereYear('created_at', $now->year);
                        });
                    });
            })
            ->exists();
    }

    public static function process(bool $force = false): array
    {
        $timezone = self::getTimezone();
        $now = now($timezone);

        if (!$force) {
            $completedPeriod = Setting::get('monthly_fees_last_completed_period');
            if ($completedPeriod === $now->format('Y-m')) {
                return [
                    'status' => 'skipped',
                    'message' => "Pemrosesan bunga & biaya untuk periode {$now->translatedFormat('F Y')} sudah selesai dilakukan sebelumnya.",
                    'processed' => 0,
                    'skipped' => 0,
                    'total' => Nasabah::where('status', 'aktif')->count(),
                ];
            }

            if (!self::isDue($now)) {
                $scheduledTime = self::getScheduledTime($now);
                return [
                    'status' => 'skipped',
                    'message' => "Waktu proses bulanan belum tiba. Dijadwalkan pada {$scheduledTime->format('d/m/Y H:i')} ({$timezone}).",
                    'processed' => 0,
                    'skipped' => 0,
                    'total' => Nasabah::where('status', 'aktif')->count(),
                ];
            }
        }

        $defaultInterestRate = (float) Setting::get('monthly_interest_rate', 0.1);
        $defaultAdminFee = (int) Setting::get('monthly_admin_fee', 5000);

        $interestRateByType = [
            'siswa' => (float) Setting::get('monthly_interest_rate_siswa', $defaultInterestRate),
            'kelas' => (float) Setting::get('monthly_interest_rate_kelas', $defaultInterestRate),
            'organisasi' => (float) Setting::get('monthly_interest_rate_organisasi', $defaultInterestRate),
            'karyawan' => (float) Setting::get('monthly_interest_rate_karyawan', Setting::get('monthly_interest_rate_guru', $defaultInterestRate)),
            'guru' => (float) Setting::get('monthly_interest_rate_karyawan', Setting::get('monthly_interest_rate_guru', $defaultInterestRate)),
        ];

        $adminFeeByType = [
            'siswa' => (int) Setting::get('monthly_admin_fee_siswa', $defaultAdminFee),
            'kelas' => (int) Setting::get('monthly_admin_fee_kelas', $defaultAdminFee),
            'organisasi' => (int) Setting::get('monthly_admin_fee_organisasi', $defaultAdminFee),
            'karyawan' => (int) Setting::get('monthly_admin_fee_karyawan', Setting::get('monthly_admin_fee_guru', $defaultAdminFee)),
            'guru' => (int) Setting::get('monthly_admin_fee_karyawan', Setting::get('monthly_admin_fee_guru', $defaultAdminFee)),
        ];

        $processHour = (int) Setting::get('monthly_process_hour', 0);
        $processDay = (int) Setting::get('monthly_process_day', 28);
        $targetDay = min($processDay, $now->daysInMonth);
        $scheduledDate = $now->copy()->day($targetDay)->hour($processHour)->minute(0)->second(0);
        $baseDate = $now->gte($scheduledDate) ? $scheduledDate : $now->copy();

        $nasabahs = Nasabah::with(['user', 'wallets'])->where('status', 'aktif')->get();
        $processedCount = 0;
        $skippedCount = 0;

        $admin = User::where('role', 'admin')->first() ?? User::where('role', 'superadmin')->first();
        $adminId = $admin ? $admin->id : 1;
        $adminName = $admin ? $admin->name : 'SISTEM';

        $dateStr = $baseDate->format('Ymd');
        $lastTransaksi = Transaksi::where('kode_transaksi', 'like', 'TRX' . $dateStr . '%')
            ->orderBy('kode_transaksi', 'desc')
            ->first();

        $sequence = 1;
        if ($lastTransaksi) {
            $lastSequence = (int) substr($lastTransaksi->kode_transaksi, -5);
            $sequence = $lastSequence + 1;
        }

        $tabunganType = WalletType::tabungan()->first();

        DB::transaction(function () use (
            $nasabahs,
            $interestRateByType,
            $adminFeeByType,
            $defaultInterestRate,
            $defaultAdminFee,
            $adminId,
            $adminName,
            $dateStr,
            &$sequence,
            $baseDate,
            $now,
            $tabunganType,
            &$processedCount,
            &$skippedCount
        ) {
            foreach ($nasabahs as $nasabah) {
                // Check if already processed this month
                $alreadyProcessed = Transaksi::where('nasabah_id', $nasabah->id)
                    ->whereIn('jenis_transaksi', ['bunga', 'biaya_admin'])
                    ->where(function ($q) use ($now) {
                        $q->where(function ($sq) use ($now) {
                            $sq->whereMonth('tanggal_transaksi', $now->month)
                                ->whereYear('tanggal_transaksi', $now->year);
                        })->orWhere(function ($sq) use ($now) {
                            $sq->whereNull('tanggal_transaksi')
                                ->whereMonth('created_at', $now->month)
                                ->whereYear('created_at', $now->year);
                        });
                    })
                    ->exists();

                if ($alreadyProcessed) {
                    $skippedCount++;
                    continue;
                }

                $userType = $nasabah->user?->user_type ?? 'siswa';
                $interestRate = $interestRateByType[$userType] ?? $defaultInterestRate;
                $adminFee = $adminFeeByType[$userType] ?? $defaultAdminFee;

                $tabunganWallet = $tabunganType ? $nasabah->getOrCreateWallet($tabunganType->id) : null;
                $hasTransaction = false;

                // 1. Process Interest (Bunga)
                if ($interestRate > 0) {
                    $bungaAmount = round((float) $nasabah->saldo * ($interestRate / 100), 2);
                    if ($bungaAmount > 0) {
                        $kode = 'TRX' . $dateStr . str_pad($sequence++, 5, '0', STR_PAD_LEFT);
                        $saldoSebelum = (float) $nasabah->saldo;
                        $saldoSesudah = $saldoSebelum + $bungaAmount;

                        $tx = new Transaksi();
                        $tx->kode_transaksi = $kode;
                        $tx->nasabah_id = $nasabah->id;
                        $tx->user_id = $adminId;
                        $tx->nama_petugas = $adminName;
                        $tx->wallet_id = $tabunganWallet?->id;
                        $tx->jenis_transaksi = 'bunga';
                        $tx->jumlah = $bungaAmount;
                        $tx->saldo_sebelum = $saldoSebelum;
                        $tx->saldo_sesudah = $saldoSesudah;
                        $tx->keterangan = "Bunga tabungan bulanan {$userType} (" . $interestRate . "%)";
                        $tx->status = 'completed';
                        $tx->tanggal_transaksi = $baseDate->toDateString();
                        $tx->created_at = $baseDate;
                        $tx->save();

                        $nasabah->increment('saldo', $bungaAmount);
                        $nasabah->refresh();

                        if ($tabunganWallet) {
                            $tabunganWallet->update(['balance' => $nasabah->saldo]);
                        }

                        $hasTransaction = true;
                    }
                }

                // 2. Process Admin Fee (Biaya Admin)
                if ($adminFee > 0 && (float) $nasabah->saldo >= $adminFee) {
                    $kode = 'TRX' . $dateStr . str_pad($sequence++, 5, '0', STR_PAD_LEFT);
                    $saldoSebelum = (float) $nasabah->saldo;
                    $saldoSesudah = $saldoSebelum - $adminFee;

                    $tx = new Transaksi();
                    $tx->kode_transaksi = $kode;
                    $tx->nasabah_id = $nasabah->id;
                    $tx->user_id = $adminId;
                    $tx->nama_petugas = $adminName;
                    $tx->wallet_id = $tabunganWallet?->id;
                    $tx->jenis_transaksi = 'biaya_admin';
                    $tx->jumlah = $adminFee;
                    $tx->saldo_sebelum = $saldoSebelum;
                    $tx->saldo_sesudah = $saldoSesudah;
                    $tx->keterangan = "Biaya administrasi bulanan {$userType}";
                    $tx->status = 'completed';
                    $tx->tanggal_transaksi = $baseDate->toDateString();
                    $tx->created_at = $baseDate->copy()->addMinute();
                    $tx->save();

                    $nasabah->decrement('saldo', $adminFee);
                    $nasabah->refresh();

                    if ($tabunganWallet) {
                        $tabunganWallet->update(['balance' => $nasabah->saldo]);
                    }

                    $hasTransaction = true;
                }

                if ($hasTransaction) {
                    $processedCount++;
                } else {
                    $skippedCount++;
                }
            }
        });

        Setting::set('monthly_fees_last_completed_period', $now->format('Y-m'));
        Setting::set('monthly_fees_last_run_at', $now->format('d/m/Y H:i:s'));

        if ($processedCount > 0) {
            AuditLog::logActivity(
                'process_monthly_fees',
                "Pemrosesan bunga dan biaya admin bulanan untuk {$processedCount} nasabah.",
                'success',
                auth()->id() ?? $adminId,
                auth()->user()?->name ?? 'System',
                auth()->user()?->role ?? 'system'
            );
        }

        return [
            'status' => $processedCount > 0 ? 'success' : 'skipped',
            'message' => $processedCount > 0
                ? "Berhasil memproses bunga & biaya untuk {$processedCount} nasabah ({$skippedCount} dilewati)."
                : "Tidak ada nasabah yang perlu diproses ({$skippedCount} dilewati).",
            'processed' => $processedCount,
            'skipped' => $skippedCount,
            'total' => $nasabahs->count(),
        ];
    }

    public static function checkAndProcessOpportunistically(): void
    {
        $cacheKey = 'monthly_fee_opportunistic_check';
        if (Cache::has($cacheKey)) {
            return;
        }

        // Cache lock 5 minutes
        Cache::put($cacheKey, true, now()->addMinutes(5));

        try {
            if (self::isDue()) {
                self::process(false);
            }
        } catch (\Throwable $e) {
            Log::error('Gagal memproses bunga dan biaya bulanan otomatis: ' . $e->getMessage());
        }
    }
}
