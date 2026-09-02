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
            'tanggal' => 'nullable|date',
        ]);

        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $date = $request->filled('tanggal')
            ? \Carbon\Carbon::parse($request->tanggal, $timezone)
            : now($timezone);

        $paddedNumber = str_pad($validated['number'], 3, '0', STR_PAD_LEFT);
        $month = $date->format('m');
        $year = $date->format('y');

        $kode = strtoupper($validated['prefix']) . $paddedNumber . '/' . $month . '/' . $year;
        $exists = Transaksi::where('kode_transaksi', $kode)->exists();

        return response()->json([
            'exists' => $exists,
            'available' => !$exists,
            'kode_transaksi' => $kode,
        ]);
    }
}
