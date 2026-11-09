<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Nasabah;
use App\Models\Transaksi;
use Illuminate\Http\Request;

class NasabahPassbookController extends Controller
{
    private function resolveNasabah(Request $request): ?Nasabah
    {
        if ($request->filled('nasabah_id')) {
            return Nasabah::find($request->nasabah_id);
        }

        if ($request->filled('rekening')) {
            $nasabah = Nasabah::where('nomor_rekening', $request->rekening)->first();
            if ($nasabah) {
                return $nasabah;
            }
        }

        if ($request->filled('kode_transaksi')) {
            $tx = Transaksi::where('kode_transaksi', $request->kode_transaksi)->first();
            if ($tx && $tx->nasabah) {
                return $tx->nasabah;
            }
        }

        if ($request->filled('transaksi_id')) {
            $tx = Transaksi::find($request->transaksi_id);
            if ($tx && $tx->nasabah) {
                return $tx->nasabah;
            }
        }

        return null;
    }

    public function getBarisBuku(Request $request)
    {
        $nasabah = $this->resolveNasabah($request);

        if (!$nasabah) {
            return response()->json([
                'baris_terakhir' => 0,
                'next_baris' => 1,
            ]);
        }

        $barisTerakhir = (int) ($nasabah->baris_terakhir_buku ?? 0);
        $nextBaris = ($barisTerakhir >= 40 || $barisTerakhir < 1) ? 1 : ($barisTerakhir + 1);

        return response()->json([
            'baris_terakhir' => $barisTerakhir,
            'next_baris' => $nextBaris,
            'nomor_rekening' => $nasabah->nomor_rekening,
        ]);
    }

    public function updateBarisBuku(Request $request)
    {
        $validated = $request->validate([
            'baris' => 'required|integer|min:1|max:40',
            'rekening' => 'nullable|string',
            'nasabah_id' => 'nullable|integer',
            'kode_transaksi' => 'nullable|string',
            'transaksi_id' => 'nullable|integer',
        ]);

        $nasabah = $this->resolveNasabah($request);

        if (!$nasabah) {
            return response()->json(['message' => 'Nasabah tidak ditemukan'], 404);
        }

        $nasabah->baris_terakhir_buku = $validated['baris'];
        $nasabah->save();

        if (!empty($validated['transaksi_id'])) {
            Transaksi::where('id', $validated['transaksi_id'])->update(['baris_cetak' => $validated['baris']]);
        } elseif (!empty($validated['kode_transaksi'])) {
            Transaksi::where('kode_transaksi', $validated['kode_transaksi'])->update(['baris_cetak' => $validated['baris']]);
        }

        $nextBaris = ($nasabah->baris_terakhir_buku >= 40 || $nasabah->baris_terakhir_buku < 1) ? 1 : ($nasabah->baris_terakhir_buku + 1);

        return response()->json([
            'success' => true,
            'baris_terakhir' => $nasabah->baris_terakhir_buku,
            'next_baris' => $nextBaris,
            'nomor_rekening' => $nasabah->nomor_rekening,
        ]);
    }
}
