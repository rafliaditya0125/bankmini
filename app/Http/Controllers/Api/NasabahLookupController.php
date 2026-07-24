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
    public function search(Request $request)
    {
        $q = $request->query('q');
        if (empty($q) || strlen($q) < 2) {
            return response()->json([]);
        }

        $nasabahs = Nasabah::with(['user'])
            ->where('status', 'aktif')
            ->where(function ($query) use ($q) {
                $query->where('nomor_rekening', 'like', "%{$q}%")
                      ->orWhereHas('user', function ($qUser) use ($q) {
                          $qUser->where('name', 'like', "%{$q}%");
                      });
            })
            ->take(10)
            ->get();

        return response()->json($nasabahs);
    }
}
