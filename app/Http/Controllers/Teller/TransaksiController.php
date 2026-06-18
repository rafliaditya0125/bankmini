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
            return $this->exportPdf($query->get());
        }

        if ($request->export === 'excel') {
            return $this->exportExcel($query->get());
        }

        $transactions = $query->paginate(15)->through(function($tx) {
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

        return Inertia::render('teller/Transaksi', [
            'transactions' => $transactions,
            'filters' => $request->only(['search', 'from_date', 'to_date', 'type']),
        ]);
    }

    private function getQuery(Request $request)
    {
        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        
        // Check if teller wants to see all transactions for today (not just their own)
        // This is controlled by a query parameter 'view_all'
        if ($request->view_all === 'true' && auth()->user()->role === 'teller') {
            // Teller can view all transactions for today
            $query = Transaksi::with(['nasabah.user', 'nasabah.rombelRel', 'nasabahTujuan.user', 'petugas'])
                ->latest();
        } else {
            // Default: only show transactions processed by this teller
            $query = Transaksi::where('user_id', auth()->id())
                ->with(['nasabah.user', 'nasabah.rombelRel', 'nasabahTujuan.user', 'petugas'])
                ->latest();
        }

        // Tetap hanya untuk hari ini sesuai permintaan, tapi dukung timezone yang benar
        $query->whereDate('created_at', Carbon::today($timezone));

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

    private function exportExcel($data)
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

        return response()->view('exports.transactions_excel', [
            'data' => $data,
        ])->withHeaders($headers);
    }

    private function exportPdf($data)
    {
        return view('exports.transactions', [
            'data' => $data,
            'title' => 'Laporan Transaksi ' . \App\Models\Setting::get('bank_name', 'Bank Mini')
        ]);
    }
}
