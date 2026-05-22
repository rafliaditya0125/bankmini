<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use App\Models\ReportLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LaporanController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaksi::with(['nasabah.user', 'nasabah.rombelRel', 'petugas']);
        $archiveQuery = ReportLog::with('user');

        // Filters for transactions
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('kode_transaksi', 'like', "%{$request->search}%")
                  ->orWhereHas('nasabah.user', function ($sq) use ($request) {
                      $sq->where('name', 'like', "%{$request->search}%");
                  });
            });
        }

        // Filters for archives
        if ($request->archive_search) {
            $archiveQuery->where(function($q) use ($request) {
                $q->where('filename', 'like', "%{$request->archive_search}%")
                  ->orWhereHas('user', function ($sq) use ($request) {
                      $sq->where('name', 'like', "%{$request->archive_search}%");
                  });
            });
        }

        if ($request->jenis_transaksi) {
            $query->where('jenis_transaksi', $request->jenis_transaksi);
        }

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Handle PDF export
        if ($request->export === 'pdf') {
            $transactions = $query->with(['nasabah.rombelRel.jurusan'])->latest()->get();

            return view('exports.transactions', [
                'data' => $transactions,
                'title' => 'Laporan Transaksi ' . \App\Models\Setting::get('bank_name', 'Bank Mini')
            ]);
        }

        return Inertia::render('superadmin/Laporan', [
            'transactions' => $query->latest()->paginate(15)->through(function(Transaksi $tx) {
                // Calculate no_urut for this specific transaction
                // Based on counting distinct kode_transaksi on the same day up to this transaction's ID
                $noUrut = Transaksi::whereDate('created_at', $tx->created_at->toDateString())
                    ->where('id', '<=', $tx->id)
                    ->distinct('kode_transaksi')
                    ->count('kode_transaksi');

                $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
                $data = $tx->toArray();
                $data['no_urut'] = $noUrut;
                $data['nasabah_name'] = $tx->nasabah?->user?->name;
                $data['nasabah_norek'] = $tx->nasabah?->nomor_rekening;
                $data['nasabah_kelas'] = $tx->nasabah?->rombelRel?->nama_kelas;
                $data['tanggal'] = $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');
                $data['petugas_nama'] = $tx->nama_petugas ?? $tx->petugas?->name ?? 'SYSTEM';

                if ($tx->jenis_transaksi === 'transfer') {
                    $isDebit = $tx->saldo_sesudah < $tx->saldo_sebelum;

                    // Coba ambil dari relasi nasabahTujuan dulu (yang baru kita tambahkan di TransactionService)
                    $relatedNasabah = $tx->nasabahTujuan ?: Transaksi::where('kode_transaksi', $tx->kode_transaksi)
                        ->where('nasabah_id', '!=', $tx->nasabah_id)
                        ->first()?->nasabah;

                    if ($isDebit) {
                        $data['pengirim_norek'] = $tx->nasabah?->nomor_rekening;
                        $data['pengirim_name'] = $tx->nasabah?->user?->name;
                        $data['penerima_norek'] = $relatedNasabah?->nomor_rekening;
                        $data['penerima_name'] = $relatedNasabah?->user?->name;
                    } else {
                        $data['pengirim_norek'] = $relatedNasabah?->nomor_rekening;
                        $data['pengirim_name'] = $relatedNasabah?->user?->name;
                        $data['penerima_norek'] = $tx->nasabah?->nomor_rekening;
                        $data['penerima_name'] = $tx->nasabah?->user?->name;
                    }
                }

                return $data;
            })->withQueryString(),
            'reportFiles' => $archiveQuery->latest()->paginate(10, ['*'], 'report_page')->withQueryString(),
            'filters' => $request->only(['search', 'archive_search', 'jenis_transaksi', 'date_from', 'date_to']),
            'active_tab' => $request->tab ?? 'transaksi'
        ]);
    }
}
