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
        $query = Transaksi::where('status', '!=', 'cancelled')->with(['nasabah.user', 'nasabah.rombelRel', 'petugas']);
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

        // Filter status: default hanya tampilkan yang valid / tidak dibatalkan
        $statusFilter = $request->status ?? 'valid';
        if ($statusFilter === 'valid') {
            $query->where('status', '!=', 'cancelled');
        } elseif ($statusFilter === 'cancelled' || $statusFilter === 'batal') {
            $query->where('status', 'cancelled');
        }

        if ($request->date_from) {
            $query->where(function($q) use ($request) {
                $q->whereDate('tanggal_transaksi', '>=', $request->date_from)
                  ->orWhere(function($sq) use ($request) {
                      $sq->whereNull('tanggal_transaksi')
                         ->whereDate('created_at', '>=', $request->date_from);
                  });
            });
        }

        if ($request->date_to) {
            $query->where(function($q) use ($request) {
                $q->whereDate('tanggal_transaksi', '<=', $request->date_to)
                  ->orWhere(function($sq) use ($request) {
                      $sq->whereNull('tanggal_transaksi')
                         ->whereDate('created_at', '<=', $request->date_to);
                  });
            });
        }

        $query->orderByRaw('COALESCE(tanggal_transaksi, DATE(created_at)) DESC')->orderBy('id', 'desc');

        // Handle PDF export
        if ($request->export === 'pdf') {
            $transactions = $query->with(['nasabah.rombelRel.jurusan'])->get();

            return view('exports.transactions', [
                'data' => $transactions,
                'title' => 'Laporan Transaksi ' . \App\Models\Setting::get('bank_name', 'Bank Mini'),
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
            ]);
        }

        // Handle Excel export
        if ($request->export === 'excel') {
            $transactions = $query->with(['nasabah.rombelRel.jurusan'])->get();
            $bankName = \App\Models\Setting::get('bank_name', 'Bank Mini');
            $filename = "laporan_transaksi_" . strtolower(str_replace(' ', '_', $bankName)) . "_" . date('YmdHis') . ".xls";

            $headers = [
                "Content-type"        => "application/vnd.ms-excel",
                "Content-Disposition" => "attachment; filename=$filename",
                "Pragma"              => "no-cache",
                "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
                "Expires"             => "0"
            ];

            return response()->view('exports.transactions_excel', [
                'data' => $transactions,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
            ])->withHeaders($headers);
        }

        $perPage = max(1, min((int) $request->input('per_page', 15), 200));

        return Inertia::render('superadmin/Laporan', [
            'transactions' => $query->paginate($perPage)->through(function(Transaksi $tx) {
                // Calculate no_urut for this specific transaction
                // Based on counting distinct kode_transaksi on the same transaction date up to this transaction's ID
                $txDate = $tx->tanggal_transaksi ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->toDateString() : $tx->created_at->toDateString();
                $noUrut = Transaksi::where(function($q) use ($txDate) {
                        $q->whereDate('tanggal_transaksi', $txDate)
                          ->orWhere(function($sq) use ($txDate) {
                              $sq->whereNull('tanggal_transaksi')
                                 ->whereDate('created_at', $txDate);
                          });
                    })
                    ->where('id', '<=', $tx->id)
                    ->distinct('kode_transaksi')
                    ->count('kode_transaksi');

                $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
                $timeStr = $tx->created_at ? $tx->created_at->timezone($timezone)->format('H:i:s') : '00:00:00';
                $formattedTanggal = $tx->tanggal_transaksi 
                    ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->format('d/m/Y') . ' ' . $timeStr
                    : $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');

                $data = $tx->toArray();
                $data['no_urut'] = $noUrut;
                $data['nasabah_name'] = $tx->nasabah?->user?->name;
                $data['nasabah_norek'] = $tx->nasabah?->nomor_rekening;
                $data['nasabah_baris_terakhir_buku'] = (int) ($tx->nasabah?->baris_terakhir_buku ?? 0);
                $data['nasabah_kelas'] = $tx->nasabah?->rombelRel?->nama_kelas;
                $data['tanggal'] = $formattedTanggal;
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
            'filters' => array_merge(
                $request->only(['search', 'archive_search', 'jenis_transaksi', 'date_from', 'date_to', 'per_page']),
                ['status' => $statusFilter, 'per_page' => $perPage]
            ),
            'active_tab' => $request->tab ?? 'transaksi'
        ]);
    }
}
