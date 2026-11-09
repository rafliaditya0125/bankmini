<?php

namespace App\Http\Controllers\Teller;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;

class TransaksiController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->getQuery($request);

        if ($request->export === 'pdf') {
            return $this->exportPdf($query->get(), $request);
        }

        if ($request->export === 'excel') {
            return $this->exportExcel($query->get(), $request);
        }

        $transactions = $query->paginate(15)->through(function($tx) {
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

                // Coba ambil dari relasi nasabahTujuan dulu
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

            // Untuk bayar: tampilkan info akun tujuan pembayaran
            if ($tx->jenis_transaksi === 'bayar') {
                $tujuan = $tx->nasabahTujuan;
                $data['penerima_norek'] = $tujuan?->nomor_rekening;
                $data['penerima_name'] = $tujuan?->user?->name;
            }

            return $data;
        })->withQueryString();

        $statusFilter = $request->status ?? 'valid';

        return Inertia::render('teller/Transaksi', [
            'transactions' => $transactions,
            'filters' => array_merge(
                $request->only(['search', 'from_date', 'to_date', 'type']),
                ['status' => $statusFilter]
            ),
        ]);
    }

    private function getQuery(Request $request)
    {
        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        
        // Check if teller wants to see all transactions for today (not just their own)
        // This is controlled by a query parameter 'view_all'
        if ($request->view_all === 'true' && auth()->user()->role === 'teller') {
            // Teller can view all transactions for today
            $query = Transaksi::where('status', '!=', 'cancelled')
                ->with(['nasabah.user', 'nasabah.rombelRel', 'nasabahTujuan.user', 'petugas'])
                ->latest();
        } else {
            // Default: only show transactions processed by this teller
            $query = Transaksi::where('user_id', auth()->id())
                ->where('status', '!=', 'cancelled')
                ->with(['nasabah.user', 'nasabah.rombelRel', 'nasabahTujuan.user', 'petugas'])
                ->latest();
        }

        // Tetap hanya untuk hari ini sesuai permintaan, tapi dukung timezone yang benar (termasuk yang diproses hari ini)
        $today = Carbon::today($timezone);
        $query->where(function($q) use ($today) {
            $q->whereDate('created_at', $today)
              ->orWhereDate('updated_at', $today);
        });

        // Filter status: default hanya tampilkan yang valid / tidak dibatalkan
        $statusFilter = $request->status ?? 'valid';
        if ($statusFilter === 'valid') {
            $query->where('status', '!=', 'cancelled');
        } elseif ($statusFilter === 'cancelled' || $statusFilter === 'batal') {
            $query->where('status', 'cancelled');
        }

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('kode_transaksi', 'like', '%' . $request->search . '%')
                  ->orWhere('keterangan', 'like', '%' . $request->search . '%')
                  ->orWhereHas('nasabah.user', function($unq) use ($request) {
                      $unq->where('name', 'like', '%' . $request->search . '%');
                  })
                  ->orWhereHas('nasabah', function($unq) use ($request) {
                      $unq->where('nomor_rekening', 'like', '%' . $request->search . '%');
                  });
            });
        }

        if ($request->type) {
            $query->where('jenis_transaksi', $request->type);
        }

        return $query;
    }

    private function exportExcel($data, Request $request = null)
    {
        $bankName = \App\Models\Setting::get('bank_name', 'Bank Mini');
        $filename = "laporan_transaksi_" . strtolower(str_replace(' ', '_', $bankName)) . "_" . date('YmdHis') . ".xls";

        $headers = [
            "Content-type"        => "application/vnd.ms-excel",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $today = Carbon::today($timezone)->toDateString();

        return response()->view('exports.transactions_excel', [
            'data' => $data,
            'date_from' => $request?->date_from ?? $today,
            'date_to' => $request?->date_to ?? $today,
        ])->withHeaders($headers);
    }

    private function exportPdf($data, Request $request = null)
    {
        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $today = Carbon::today($timezone)->toDateString();

        return view('exports.transactions', [
            'data' => $data,
            'title' => 'Laporan Transaksi ' . \App\Models\Setting::get('bank_name', 'Bank Mini'),
            'date_from' => $request?->date_from ?? $today,
            'date_to' => $request?->date_to ?? $today,
        ]);
    }
}
