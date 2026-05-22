<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nasabah;

class NasabahLookupController extends Controller
{
    public function show($rekening)
    {
        $nasabah = Nasabah::with(['user', 'jurusanRel'])->where('nomor_rekening', $rekening)->where('status', 'aktif')->first();
        if (!$nasabah) {
            return response()->json(['message' => 'Rekening tidak ditemukan atau tidak aktif'], 404);
        }
        return response()->json($nasabah);
    }
}
