<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;

class TransactionCodeController extends Controller
{
    public function check(Request $request)
    {
        $validated = $request->validate([
            'prefix' => 'required|string|in:BKM,BKK',
            'number' => 'required|string|regex:/^[0-9]+$/|max:50',
        ]);

        $kode = strtoupper($validated['prefix']) . $validated['number'];
        $exists = Transaksi::where('kode_transaksi', $kode)->exists();

        return response()->json([
            'exists' => $exists,
            'available' => !$exists,
            'kode_transaksi' => $kode,
        ]);
    }
}
