<?php

namespace App\Services;

use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\AuditLog;
use App\Models\Wallet;
use App\Models\WalletType;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TransactionService
{
    /**
     * Generate BKM/BKK number based on monthly cycle: PREFIX[no urut]/[bulan]/[tahun]
     * Format example: BKM001/09/26 or BKK001/09/26
     * Reset every 1st of the month
     * Find the smallest available number (including cancelled ones)
     */
    private function generateBkkBkm(string $prefix, ?string $tanggalTransaksi = null): string
    {
        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $date = $tanggalTransaksi ? \Carbon\Carbon::parse($tanggalTransaksi, $timezone) : now($timezone);
        $month = $date->format('m');
        $year = $date->format('y');
        
        // Find all used numbers for this prefix and this month/year
        $usedNumbers = Transaksi::where('kode_transaksi', 'like', "{$prefix}%/{$month}/{$year}")
            ->where('status', '!=', 'cancelled')
            ->pluck('kode_transaksi')
            ->map(function($kode) use ($prefix, $month, $year) {
                // Extract number from BKM001/09/26, BKK002/09/26, etc
                if (preg_match('/^' . preg_quote($prefix, '/') . '(\d+)\/' . preg_quote($month, '/') . '\/' . preg_quote($year, '/') . '$/', $kode, $matches)) {
                    return (int) $matches[1];
                }
                return null;
            })
            ->filter(fn($num) => !is_null($num))
            ->sort()
            ->values()
            ->toArray();
        
        // Find the smallest available number starting from 1
        $nextNumber = 1;
        foreach ($usedNumbers as $num) {
            if ($num == $nextNumber) {
                $nextNumber++;
            } else {
                break;
            }
        }
        
        return $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT) . '/' . $month . '/' . $year;
    }

    /**
     * Process a deposit (Setoran)
     */
    public function setor(array $data, string $role)
    {
        return DB::transaction(function () use ($data, $role) {
            $nasabah = Nasabah::where('nomor_rekening', $data['nomor_rekening'])->firstOrFail();

            if ($nasabah->status !== 'aktif') {
                throw new \Exception('Rekening nasabah tidak aktif');
            }

            $saldoSebelum = $nasabah->saldo;
            $jumlah = $data['jumlah'];
            $saldoSesudah = $saldoSebelum + $jumlah;

            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            
            // Generate kode transaksi based on mode
            $bkkBkmMode = \App\Models\Setting::get('bkk_bkm_mode', 'manual');
            if ($bkkBkmMode === 'manual') {
                $kodeTransaksi = $data['kode_transaksi']; // Already validated and formatted by controller
            } else {
                $kodeTransaksi = $this->generateBkkBkm('BKM', $data['tanggal_transaksi'] ?? null);
            }

            $transaksi = Transaksi::create([
                'kode_transaksi' => $kodeTransaksi,
                'nasabah_id' => $nasabah->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'setor',
                'metode_pembayaran' => $data['jenis_transaksi'] ?? 'tunai',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => $data['keterangan'] ?? null,
                'nama_petugas' => $data['nama_petugas'],
            ]);

            $nasabah->update(['saldo' => $saldoSesudah]);

            $tabunganType = WalletType::tabungan()->first();
            if ($tabunganType) {
                $tabunganWallet = $nasabah->getOrCreateWallet($tabunganType->id);
                $tabunganWallet->update(['balance' => $saldoSesudah]);
                $transaksi->update(['wallet_id' => $tabunganWallet->id]);
            }

            AuditLog::logActivity(
                'setor',
                "Transaksi setor sebesar Rp " . number_format($jumlah, 0, ',', '.') . " untuk nasabah " . $nasabah->nomor_rekening,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendTransactionNotification($nasabah->user_id, 'setor', $jumlah, $kodeTransaksi);

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $transaksi->id,
                'nasabah_name' => $nasabah->user->name,
                'nasabah_norek' => $nasabah->nomor_rekening,
                'nasabah' => $nasabah->load(['user', 'rombelRel.jurusan']),
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'jenis_transaksi' => 'setor',
                'sub_jenis_transaksi' => $data['jenis_transaksi'] ?? null,
                'tanggal' => $transaksi->created_at->format('Y-m-d H:i:s'),
                'created_at' => $transaksi->created_at->toDateTimeString(),
                'petugas' => $data['nama_petugas'],
            ];
        });
    }

    /**
     * Process a withdrawal (Tarik)
     */
    public function tarik(array $data, string $role)
    {
        return DB::transaction(function () use ($data, $role) {
            $nasabah = Nasabah::where('nomor_rekening', $data['nomor_rekening'])->firstOrFail();

            if ($nasabah->status !== 'aktif') {
                throw new \Exception('Rekening nasabah tidak aktif');
            }

            if ($nasabah->saldo < $data['jumlah']) {
                throw new \Exception('Saldo tidak mencukupi');
            }

            $saldoSebelum = $nasabah->saldo;
            $jumlah = $data['jumlah'];
            $saldoSesudah = $saldoSebelum - $jumlah;

            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            
            // Generate kode transaksi based on mode
            $bkkBkmMode = \App\Models\Setting::get('bkk_bkm_mode', 'manual');
            if ($bkkBkmMode === 'manual') {
                $kodeTransaksi = $data['kode_transaksi']; // Already validated and formatted by controller
            } else {
                $kodeTransaksi = $this->generateBkkBkm('BKK', $data['tanggal_transaksi'] ?? null);
            }

            $transaksi = Transaksi::create([
                'kode_transaksi' => $kodeTransaksi,
                'nasabah_id' => $nasabah->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'tarik',
                'metode_pembayaran' => $data['jenis_transaksi'] ?? 'tunai',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => $data['keterangan'] ?? null,
                'nama_petugas' => $data['nama_petugas'],
            ]);

            $nasabah->update(['saldo' => $saldoSesudah]);

            $tabunganType = WalletType::tabungan()->first();
            if ($tabunganType) {
                $tabunganWallet = $nasabah->getOrCreateWallet($tabunganType->id);
                $tabunganWallet->update(['balance' => $saldoSesudah]);
                $transaksi->update(['wallet_id' => $tabunganWallet->id]);
            }

            AuditLog::logActivity(
                'tarik',
                "Transaksi tarik sebesar Rp " . number_format($jumlah, 0, ',', '.') . " untuk nasabah " . $nasabah->nomor_rekening,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendTransactionNotification($nasabah->user_id, 'tarik', $jumlah, $kodeTransaksi);

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $transaksi->id,
                'nasabah_name' => $nasabah->user->name,
                'nasabah_norek' => $nasabah->nomor_rekening,
                'nasabah' => $nasabah->load(['user', 'rombelRel.jurusan']),
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'jenis_transaksi' => 'tarik',
                'sub_jenis_transaksi' => $data['jenis_transaksi'] ?? null,
                'tanggal' => $transaksi->created_at->format('Y-m-d H:i:s'),
                'created_at' => $transaksi->created_at->toDateTimeString(),
                'petugas' => $data['nama_petugas'],
            ];
        });
    }

    /**
     * Process a transfer
     */
    public function transfer(array $data, string $role)
    {
        return DB::transaction(function () use ($data, $role) {
            $pengirim = Nasabah::where('nomor_rekening', $data['pengirim_rekening'])->firstOrFail();
            $penerima = Nasabah::where('nomor_rekening', $data['penerima_rekening'])->firstOrFail();

            if ($pengirim->nomor_rekening === $penerima->nomor_rekening) {
                throw new \Exception('Pengirim dan penerima tidak boleh sama');
            }

            if ($pengirim->status !== 'aktif') throw new \Exception('Rekening pengirim tidak aktif');
            if ($penerima->status !== 'aktif') throw new \Exception('Rekening penerima tidak aktif');
            if ($pengirim->saldo < $data['jumlah']) throw new \Exception('Saldo pengirim tidak mencukupi');

            $jumlah = $data['jumlah'];

            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            $kodeTransaksi = '3' . now($timezone)->format('YmdHis');

            // Debit pengirim
            $saldoSebelumPengirim = $pengirim->saldo;
            $saldoSesudahPengirim = $saldoSebelumPengirim - $jumlah;

            // Credit penerima
            $saldoSebelumPenerima = $penerima->saldo;
            $saldoSesudahPenerima = $saldoSebelumPenerima + $jumlah;

            // Transaksi Pengirim
            Transaksi::create([
                'kode_transaksi' => $kodeTransaksi . '-S',
                'nasabah_id' => $pengirim->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'transfer',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPengirim,
                'saldo_sesudah' => $saldoSesudahPengirim,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => "Transfer ke " . $penerima->nomor_rekening . ($data['keterangan'] ? " (" . $data['keterangan'] . ")" : ""),
                'nama_petugas' => $data['nama_petugas'],
                'nasabah_tujuan_id' => $penerima->id,
            ]);

            // Transaksi Penerima
            Transaksi::create([
                'kode_transaksi' => $kodeTransaksi . '-R',
                'nasabah_id' => $penerima->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'transfer',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPenerima,
                'saldo_sesudah' => $saldoSesudahPenerima,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => "Transfer dari " . $pengirim->nomor_rekening,
                'nama_petugas' => $data['nama_petugas'],
                'nasabah_tujuan_id' => $pengirim->id,
            ]);

            $pengirim->update(['saldo' => $saldoSesudahPengirim]);
            $penerima->update(['saldo' => $saldoSesudahPenerima]);

            AuditLog::logActivity(
                'transfer',
                "Transfer Rp " . number_format($jumlah, 0, ',', '.') . " dari " . $pengirim->nomor_rekening . " ke " . $penerima->nomor_rekening,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendTransactionNotification($pengirim->user_id, 'transfer_out', $jumlah, $kodeTransaksi . '-S');
            NotificationService::sendTransactionNotification($penerima->user_id, 'transfer_in', $jumlah, $kodeTransaksi . '-R');

            // Ambil transaksi yang baru dibuat untuk mendapatkan ID
            $transaksiPengirim = Transaksi::where('kode_transaksi', $kodeTransaksi . '-S')->first();

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $transaksiPengirim->id,
                'nasabah_name' => $pengirim->user->name,
                'nasabah_norek' => $pengirim->nomor_rekening,
                'nasabah' => $pengirim->load(['user', 'rombelRel.jurusan']),
                'pengirim_name' => $pengirim->user->name,
                'pengirim_norek' => $pengirim->nomor_rekening,
                'penerima_name' => $penerima->user->name,
                'penerima_norek' => $penerima->nomor_rekening,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPengirim,
                'saldo_sesudah' => $saldoSesudahPengirim,
                'jenis_transaksi' => 'transfer',
                'tanggal' => $transaksiPengirim->created_at->format('Y-m-d H:i:s'),
                'created_at' => $transaksiPengirim->created_at->toDateTimeString(),
                'petugas' => $data['nama_petugas'],
            ];
        });
    }

    /**
     * Process a payment (Bayar)
     * Logic: Hanya membuat 1 transaksi di sisi pembayar saja,
     * tetapi tetap update saldo penerima (akun pembayaran).
     * Struk akan menampilkan jenis pembayaran (nama akun tujuan).
     */
    public function bayar(array $data, string $role)
    {
        return DB::transaction(function () use ($data, $role) {
            $pembayar = Nasabah::where('nomor_rekening', $data['pengirim_rekening'])->firstOrFail();

            if ($pembayar->status !== 'aktif') {
                throw new \Exception('Rekening pembayar tidak aktif');
            }

            $jumlah = (float) $data['jumlah'];
            $metodePembayaran = strtolower($data['metode_pembayaran'] ?? 'tunai');
            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            $kodeTransaksi = '4' . now($timezone)->format('YmdHis') . strtoupper(Str::random(4));

            // Jika pembayaran ke tipe kantong pembayaran (Pocket System)
            if (!empty($data['wallet_type_id'])) {
                $walletType = WalletType::findOrFail($data['wallet_type_id']);
                $targetWallet = $pembayar->getOrCreateWallet($walletType->id);

                if ($metodePembayaran === 'potong_tabungan') {
                    if ($pembayar->saldo < $jumlah) {
                        throw new \Exception('Saldo tabungan utama tidak mencukupi');
                    }

                    $saldoSebelum = $pembayar->saldo;
                    $saldoSesudah = $saldoSebelum - $jumlah;
                    $pembayar->update(['saldo' => $saldoSesudah]);

                    $tabunganType = WalletType::tabungan()->first();
                    if ($tabunganType) {
                        $tabunganWallet = $pembayar->getOrCreateWallet($tabunganType->id);
                        $tabunganWallet->update(['balance' => $saldoSesudah]);
                    }

                    $targetWallet->credit($jumlah);
                } else {
                    // Tunai / Transfer / Cek dll: tidak memotong tabungan utama
                    $saldoSebelum = $targetWallet->balance;
                    $targetWallet->credit($jumlah);
                    $saldoSesudah = $targetWallet->balance;
                }

                $keteranganTag = "Pembayaran " . $walletType->name . ($data['keterangan'] ? " (" . $data['keterangan'] . ")" : "");

                $transaksi = Transaksi::create([
                    'kode_transaksi' => $kodeTransaksi,
                    'nasabah_id' => $pembayar->id,
                    'user_id' => Auth::id(),
                    'jenis_transaksi' => 'bayar',
                    'metode_pembayaran' => $metodePembayaran,
                    'wallet_id' => $targetWallet->id,
                    'jumlah' => $jumlah,
                    'saldo_sebelum' => $saldoSebelum,
                    'saldo_sesudah' => $saldoSesudah,
                    'tanggal_transaksi' => $data['tanggal_transaksi'],
                    'keterangan' => $keteranganTag,
                    'nama_petugas' => $data['nama_petugas'],
                    'nasabah_tujuan_id' => null,
                ]);

                AuditLog::logActivity(
                    'bayar',
                    "Pembayaran Rp " . number_format($jumlah, 0, ',', '.') . " (" . strtoupper($metodePembayaran) . ") dari " . $pembayar->nomor_rekening . " untuk kantong " . $walletType->name,
                    'success',
                    Auth::id(),
                    Auth::user()->name,
                    $role
                );

                NotificationService::sendTransactionNotification($pembayar->user_id, 'bayar', $jumlah, $kodeTransaksi);

                return [
                    'kode_transaksi' => $kodeTransaksi,
                    'no_urut' => $transaksi->id,
                    'nasabah_name' => $pembayar->user->name,
                    'nasabah_norek' => $pembayar->nomor_rekening,
                    'nasabah' => $pembayar->load(['user', 'rombelRel.jurusan']),
                    'jenis_pembayaran' => $walletType->name,
                    'wallet_name' => $walletType->name,
                    'metode_pembayaran' => $metodePembayaran,
                    'sub_jenis_transaksi' => strtoupper($metodePembayaran),
                    'target_amount' => $walletType->target_amount,
                    'penerima_name' => $walletType->name,
                    'penerima_norek' => $targetWallet->wallet_number,
                    'jumlah' => $jumlah,
                    'saldo_sebelum' => $saldoSebelum,
                    'saldo_sesudah' => $saldoSesudah,
                    'saldo_kantong' => $targetWallet->balance,
                    'jenis_transaksi' => 'bayar',
                    'tanggal' => $transaksi->created_at->format('Y-m-d H:i:s'),
                    'created_at' => $transaksi->created_at->toDateTimeString(),
                    'petugas' => $data['nama_petugas'],
                ];
            }

            // Fallback legacy jika masih memilih akun pembayaran rekening
            $penerima = Nasabah::where('nomor_rekening', $data['penerima_rekening'])->firstOrFail();

            if ($pembayar->nomor_rekening === $penerima->nomor_rekening) {
                throw new \Exception('Pembayar dan penerima tidak boleh sama');
            }

            if ($penerima->status !== 'aktif') throw new \Exception('Rekening penerima tidak aktif');
            if ($pembayar->saldo < $jumlah) throw new \Exception('Saldo pembayar tidak mencukupi');

            $saldoSebelumPembayar = $pembayar->saldo;
            $saldoSesudahPembayar = $saldoSebelumPembayar - $jumlah;
            $saldoSebelumPenerima = $penerima->saldo;
            $saldoSesudahPenerima = $saldoSebelumPenerima + $jumlah;

            $transaksi = Transaksi::create([
                'kode_transaksi' => $kodeTransaksi,
                'nasabah_id' => $pembayar->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'bayar',
                'metode_pembayaran' => $metodePembayaran,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPembayar,
                'saldo_sesudah' => $saldoSesudahPembayar,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => "Pembayaran: " . $penerima->user->name . ($data['keterangan'] ? " (" . $data['keterangan'] . ")" : ""),
                'nama_petugas' => $data['nama_petugas'],
                'nasabah_tujuan_id' => $penerima->id,
            ]);

            $pembayar->update(['saldo' => $saldoSesudahPembayar]);
            $penerima->update(['saldo' => $saldoSesudahPenerima]);

            AuditLog::logActivity(
                'bayar',
                "Pembayaran Rp " . number_format($jumlah, 0, ',', '.') . " dari " . $pembayar->nomor_rekening . " untuk " . $penerima->user->name,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendTransactionNotification($pembayar->user_id, 'bayar', $jumlah, $kodeTransaksi);

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $transaksi->id,
                'nasabah_name' => $pembayar->user->name,
                'nasabah_norek' => $pembayar->nomor_rekening,
                'nasabah' => $pembayar->load(['user', 'rombelRel.jurusan']),
                'jenis_pembayaran' => $penerima->user->name,
                'penerima_name' => $penerima->user->name,
                'penerima_norek' => $penerima->nomor_rekening,
                'metode_pembayaran' => $metodePembayaran,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPembayar,
                'saldo_sesudah' => $saldoSesudahPembayar,
                'jenis_transaksi' => 'bayar',
                'tanggal' => $transaksi->created_at->format('Y-m-d H:i:s'),
                'created_at' => $transaksi->created_at->toDateTimeString(),
                'petugas' => $data['nama_petugas'],
            ];
        });
    }

    /**
     * Cancel a transaction
     */
    public function cancel(int $id, string $reason, string $role)
    {
        return DB::transaction(function () use ($id, $reason, $role) {
            $transaksi = Transaksi::findOrFail($id);

            if ($transaksi->status === 'cancelled') {
                throw new \Exception('Transaksi sudah dibatalkan');
            }

            $kodeTransaksi = $transaksi->kode_transaksi;
            $jenis = $transaksi->jenis_transaksi;
            $jumlah = $transaksi->jumlah;

            // Handle based on transaction type
            if ($jenis === 'setor') {
                $nasabah = Nasabah::findOrFail($transaksi->nasabah_id);
                $nasabah->decrement('saldo', (float) $jumlah);
                $tabunganWallet = $nasabah->tabunganWallet;
                if ($tabunganWallet) {
                    $tabunganWallet->debit($jumlah);
                }
                $transaksi->update([
                    'status' => 'cancelled', 
                    'cancel_reason' => $reason,
                ]);
            } elseif ($jenis === 'tarik') {
                $nasabah = Nasabah::findOrFail($transaksi->nasabah_id);
                $nasabah->increment('saldo', (float) $jumlah);
                $tabunganWallet = $nasabah->tabunganWallet;
                if ($tabunganWallet) {
                    $tabunganWallet->credit($jumlah);
                }
                $transaksi->update([
                    'status' => 'cancelled', 
                    'cancel_reason' => $reason,
                ]);
            } elseif ($jenis === 'transfer') {
                $relatedTransactions = Transaksi::where('kode_transaksi', $kodeTransaksi)->get();

                foreach ($relatedTransactions as $tx) {
                    $nasabah = Nasabah::findOrFail($tx->nasabah_id);

                    if ($tx->saldo_sesudah < $tx->saldo_sebelum) {
                        $nasabah->increment('saldo', (float) $jumlah);
                    } else {
                        $nasabah->decrement('saldo', (float) $jumlah);
                    }

                    $tabunganWallet = $nasabah->tabunganWallet;
                    if ($tabunganWallet) {
                        $tabunganWallet->update(['balance' => $nasabah->saldo]);
                    }

                    $tx->update(['status' => 'cancelled', 'cancel_reason' => $reason]);
                }
            } elseif ($jenis === 'bayar') {
                $pembayar = Nasabah::findOrFail($transaksi->nasabah_id);

                if ($transaksi->wallet_id) {
                    $targetWallet = Wallet::find($transaksi->wallet_id);
                    if ($targetWallet) {
                        $targetWallet->debit($jumlah);
                    }
                    if ($transaksi->metode_pembayaran === 'potong_tabungan') {
                        $pembayar->increment('saldo', (float) $jumlah);
                        $tabunganWallet = $pembayar->tabunganWallet;
                        if ($tabunganWallet) {
                            $tabunganWallet->credit($jumlah);
                        }
                    }
                } elseif ($transaksi->nasabah_tujuan_id) {
                    $penerima = Nasabah::findOrFail($transaksi->nasabah_tujuan_id);
                    $pembayar->increment('saldo', (float) $jumlah);
                    $penerima->decrement('saldo', (float) $jumlah);
                }

                $transaksi->update(['status' => 'cancelled', 'cancel_reason' => $reason]);
            }

            AuditLog::logActivity(
                'cancel_transaction',
                "Pembatalan transaksi " . $kodeTransaksi . " dengan alasan: " . $reason,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendCancellationNotification($transaksi->nasabah?->user_id ?? $transaksi->user_id, $kodeTransaksi, $reason);

            return $transaksi;
        });
    }
}
