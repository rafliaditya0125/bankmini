<?php

namespace App\Services;

use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\AuditLog;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TransactionService
{
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
            $noUrut = Transaksi::whereDate('created_at', now($timezone)->toDateString())->count() + 1;
            $kodeTransaksi = $data['kode_transaksi'] ?? ('1' . now($timezone)->format('YmdHis') . strtoupper(Str::random(4)));

            $transaksi = Transaksi::create([
                'kode_transaksi' => $kodeTransaksi,
                'nasabah_id' => $nasabah->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'setor',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => $data['keterangan'] ?? null,
                'nama_petugas' => $data['nama_petugas'],
            ]);

            $nasabah->update(['saldo' => $saldoSesudah]);

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
                'no_urut' => $noUrut,
                'nasabah_name' => $nasabah->user->name,
                'nasabah_norek' => $nasabah->nomor_rekening,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'jenis_transaksi' => 'setor',
                'sub_jenis_transaksi' => $data['jenis_transaksi'] ?? null,
                'tanggal' => now($timezone)->format('d/m/y H:i:s'),
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
            $noUrut = Transaksi::whereDate('created_at', now($timezone)->toDateString())->count() + 1;
            $kodeTransaksi = $data['kode_transaksi'] ?? ('2' . now($timezone)->format('YmdHis') . strtoupper(Str::random(4)));

            $transaksi = Transaksi::create([
                'kode_transaksi' => $kodeTransaksi,
                'nasabah_id' => $nasabah->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'tarik',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => $data['keterangan'] ?? null,
                'nama_petugas' => $data['nama_petugas'],
            ]);

            $nasabah->update(['saldo' => $saldoSesudah]);

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
                'no_urut' => $noUrut,
                'nasabah_name' => $nasabah->user->name,
                'nasabah_norek' => $nasabah->nomor_rekening,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelum,
                'saldo_sesudah' => $saldoSesudah,
                'jenis_transaksi' => 'tarik',
                'sub_jenis_transaksi' => $data['jenis_transaksi'] ?? null,
                'tanggal' => now($timezone)->format('d/m/y H:i:s'),
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

            $noUrut = Transaksi::whereDate('created_at', now($timezone)->toDateString())->distinct('kode_transaksi')->count('kode_transaksi') + 1;

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

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $noUrut,
                'nasabah_name' => $pengirim->user->name,
                'nasabah_norek' => $pengirim->nomor_rekening,
                'pengirim_name' => $pengirim->user->name,
                'pengirim_norek' => $pengirim->nomor_rekening,
                'penerima_name' => $penerima->user->name,
                'penerima_norek' => $penerima->nomor_rekening,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPengirim,
                'saldo_sesudah' => $saldoSesudahPengirim,
                'jenis_transaksi' => 'transfer',
                'tanggal' => now($timezone)->format('d/m/y H:i:s'),
                'petugas' => $data['nama_petugas'],
            ];
        });
    }

    /**
     * Process a payment (Bayar)
     */
    public function bayar(array $data, string $role)
    {
        return DB::transaction(function () use ($data, $role) {
            $pembayar = Nasabah::where('nomor_rekening', $data['pengirim_rekening'])->firstOrFail();
            $penerima = Nasabah::where('nomor_rekening', $data['penerima_rekening'])->firstOrFail(); // The 'pembayaran' account

            if ($pembayar->nomor_rekening === $penerima->nomor_rekening) {
                throw new \Exception('Pembayar dan penerima tidak boleh sama');
            }

            if ($pembayar->status !== 'aktif') throw new \Exception('Rekening pembayar tidak aktif');
            if ($penerima->status !== 'aktif') throw new \Exception('Rekening penerima (pembayaran) tidak aktif');
            if ($pembayar->saldo < $data['jumlah']) throw new \Exception('Saldo pembayar tidak mencukupi');

            $jumlah = $data['jumlah'];

            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            // Using logic similar to transfer but generic enough
            $kodeTransaksi = '4' . now($timezone)->format('YmdHis');

            // Debit pembayar
            $saldoSebelumPembayar = $pembayar->saldo;
            $saldoSesudahPembayar = $saldoSebelumPembayar - $jumlah;

            // Credit penerima
            $saldoSebelumPenerima = $penerima->saldo;
            $saldoSesudahPenerima = $saldoSebelumPenerima + $jumlah;

            // Transaksi Pembayar
            Transaksi::create([
                'kode_transaksi' => $kodeTransaksi . '-S',
                'nasabah_id' => $pembayar->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'bayar',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPembayar,
                'saldo_sesudah' => $saldoSesudahPembayar,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => "Pembayaran: " . $penerima->user->name . ($data['keterangan'] ? " (" . $data['keterangan'] . ")" : ""),
                'nama_petugas' => $data['nama_petugas'],
                'nasabah_tujuan_id' => $penerima->id,
            ]);

            // Transaksi Penerima (Akun Pembayaran)
            Transaksi::create([
                'kode_transaksi' => $kodeTransaksi . '-R',
                'nasabah_id' => $penerima->id,
                'user_id' => Auth::id(),
                'jenis_transaksi' => 'bayar',
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPenerima,
                'saldo_sesudah' => $saldoSesudahPenerima,
                'tanggal_transaksi' => $data['tanggal_transaksi'],
                'keterangan' => "Menerima pembayaran dari " . $pembayar->nomor_rekening,
                'nama_petugas' => $data['nama_petugas'],
                'nasabah_tujuan_id' => $pembayar->id,
            ]);

            $pembayar->update(['saldo' => $saldoSesudahPembayar]);
            $penerima->update(['saldo' => $saldoSesudahPenerima]);

            $noUrut = Transaksi::whereDate('created_at', now($timezone)->toDateString())->distinct('kode_transaksi')->count('kode_transaksi') + 1;

            AuditLog::logActivity(
                'bayar',
                "Pembayaran Rp " . number_format($jumlah, 0, ',', '.') . " dari " . $pembayar->nomor_rekening . " untuk " . $penerima->user->name,
                'success',
                Auth::id(),
                Auth::user()->name,
                $role
            );

            NotificationService::sendTransactionNotification($pembayar->user_id, 'transfer_out', $jumlah, $kodeTransaksi . '-S');
            NotificationService::sendTransactionNotification($penerima->user_id, 'transfer_in', $jumlah, $kodeTransaksi . '-R');

            return [
                'kode_transaksi' => $kodeTransaksi,
                'no_urut' => $noUrut,
                'nasabah_name' => $pembayar->user->name,
                'nasabah_norek' => $pembayar->nomor_rekening,
                'pengirim_name' => $pembayar->user->name,
                'pengirim_norek' => $pembayar->nomor_rekening,
                'penerima_name' => $penerima->user->name,
                'penerima_norek' => $penerima->nomor_rekening,
                'jumlah' => $jumlah,
                'saldo_sebelum' => $saldoSebelumPembayar,
                'saldo_sesudah' => $saldoSesudahPembayar,
                'jenis_transaksi' => 'bayar',
                'tanggal' => now($timezone)->format('d/m/y H:i:s'),
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
                $transaksi->update(['status' => 'cancelled', 'cancel_reason' => $reason]);
            } elseif ($jenis === 'tarik') {
                $nasabah = Nasabah::findOrFail($transaksi->nasabah_id);
                $nasabah->increment('saldo', (float) $jumlah);
                $transaksi->update(['status' => 'cancelled', 'cancel_reason' => $reason]);
            } elseif ($jenis === 'transfer' || $jenis === 'bayar') {
                // For transfers and payments, we find both records (sender and receiver)
                $relatedTransactions = Transaksi::where('kode_transaksi', $kodeTransaksi)->get();

                foreach ($relatedTransactions as $tx) {
                    $nasabah = Nasabah::findOrFail($tx->nasabah_id);

                    // Logic to detect if this record is the sender or receiver
                    // Sender's amount is subtracted (saldo_sesudah < saldo_sebelum)
                    // Receiver's amount is added (saldo_sesudah > saldo_sebelum)
                    if ($tx->saldo_sesudah < $tx->saldo_sebelum) {
                        // This is the sender, add the money back
                        $nasabah->increment('saldo', (float) $jumlah);
                    } else {
                        // This is the receiver, subtract the money
                        $nasabah->decrement('saldo', (float) $jumlah);
                    }

                    $tx->update(['status' => 'cancelled', 'cancel_reason' => $reason]);
                }
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
