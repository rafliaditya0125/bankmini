<?php

namespace App\Http\Controllers\Nasabah;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\DB;
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

        $transactions = $query->paginate(15)->through(function($tx) use ($nasabah) {
            $noUrut = Transaksi::whereDate('created_at', $tx->created_at->toDateString())
                ->where('id', '<=', $tx->id)
                ->distinct('kode_transaksi')
                ->count('kode_transaksi');

            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            $data = $tx->toArray();
            $data['no_urut'] = $noUrut;
            $data['tanggal'] = $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');
            $data['petugas'] = $tx->nama_petugas ?? $tx->user?->name ?? 'SYSTEM';

            // Untuk pembayaran yang masuk (nasabah ini adalah penerima)
            if ($tx->jenis_transaksi === 'bayar' && $tx->nasabah_tujuan_id === $nasabah->id) {
                // Ini pembayaran masuk ke akun pembayaran ini
                $data['is_incoming_payment'] = true;
                $data['nasabah_name'] = $tx->nasabah?->user?->name; // Pembayar
                $data['nasabah_norek'] = $tx->nasabah?->nomor_rekening;
                $data['penerima_name'] = $nasabah->user->name; // Akun pembayaran ini
                $data['penerima_norek'] = $nasabah->nomor_rekening;
                
                // Untuk pembayaran masuk, kita tampilkan dari perspektif penerima
                // Tidak perlu saldo_sebelum/sesudah karena ini bukan transaksi utama mereka
                // Cukup tampilkan jumlah yang diterima
                $data['saldo_sebelum'] = null;
                $data['saldo_sesudah'] = null;
            } 
            // Untuk transaksi normal milik nasabah ini
            else {
                $data['nasabah_name'] = $tx->nasabah?->user?->name;
                $data['nasabah_norek'] = $tx->nasabah?->nomor_rekening;
                
                if ($tx->jenis_transaksi === 'transfer') {
                    $isDebit = $tx->saldo_sesudah < $tx->saldo_sebelum;
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

                // Untuk transaksi bayar yang keluar (nasabah ini sebagai pembayar)
                if ($tx->jenis_transaksi === 'bayar' && $tx->nasabah_id === $nasabah->id) {
                    $tujuan = $tx->nasabahTujuan;
                    $data['penerima_norek'] = $tujuan?->nomor_rekening;
                    $data['penerima_name'] = $tujuan?->user?->name;
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
        // Query untuk transaksi milik nasabah ini
        // ATAU transaksi pembayaran yang ditujukan ke nasabah ini
        $query = Transaksi::where(function($q) use ($nasabah_id) {
                $q->where('nasabah_id', $nasabah_id)
                  ->orWhere(function($inner) use ($nasabah_id) {
                      $inner->where('nasabah_tujuan_id', $nasabah_id)
                            ->where('jenis_transaksi', 'bayar');
                  });
            })
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
