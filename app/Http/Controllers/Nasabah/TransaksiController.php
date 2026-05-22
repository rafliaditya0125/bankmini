<?php

namespace App\Http\Controllers\Nasabah;

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
        $user = auth()->user();
        $nasabah = $user->nasabah;

        if (!$nasabah) {
            return redirect()->route('welcome')->with('error', 'Anda belum terdaftar sebagai nasabah');
        }

        $query = $this->getQuery($request, $nasabah->id);

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
            $data['tanggal'] = $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');
            $data['petugas'] = $tx->nama_petugas ?? $tx->user?->name ?? 'SYSTEM';

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
        })->withQueryString();

        return Inertia::render('nasabah/Transaksi', [
            'transactions' => $transactions,
            'filters' => $request->only(['search', 'from_date', 'to_date']),
        ]);
    }

    private function getQuery(Request $request, $nasabah_id)
    {
        $query = Transaksi::where('nasabah_id', $nasabah_id)
            ->with(['nasabah.user', 'nasabahTujuan.user', 'user'])
            ->latest();

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('kode_transaksi', 'like', '%' . $request->search . '%')
                  ->orWhere('keterangan', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        return $query;
    }
}
