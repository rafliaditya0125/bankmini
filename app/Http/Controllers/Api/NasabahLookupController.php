<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nasabah;

class NasabahLookupController extends Controller
{
    public function show($rekening)
    {
        $nasabah = Nasabah::with(['user', 'jurusanRel', 'rombelRel.jurusan'])->where('nomor_rekening', $rekening)->where('status', 'aktif')->first();
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

        $keywords = array_filter(explode(' ', trim($q)));

        $nasabahs = Nasabah::with(['user', 'jurusanRel', 'rombelRel.jurusan'])
            ->where('status', 'aktif')
            ->where(function ($query) use ($q, $keywords) {
                $query->where('nomor_rekening', 'like', "%{$q}%")
                      ->orWhereHas('user', function ($qUser) use ($q) {
                          $qUser->where('name', 'like', "%{$q}%");
                      })
                      ->orWhereHas('rombelRel', function ($qRombel) use ($q) {
                          $qRombel->where('nama', 'like', "%{$q}%")
                                  ->orWhere('tingkat', 'like', "%{$q}%")
                                  ->orWhereHas('jurusan', function ($qJur) use ($q) {
                                      $qJur->where('kode', 'like', "%{$q}%")
                                           ->orWhere('nama', 'like', "%{$q}%");
                                  });
                      });

                if (count($keywords) > 1) {
                    $query->orWhere(function ($multiQ) use ($keywords) {
                        foreach ($keywords as $word) {
                            $multiQ->where(function ($subQ) use ($word) {
                                $subQ->where('nomor_rekening', 'like', "%{$word}%")
                                     ->orWhereHas('user', function ($u) use ($word) {
                                         $u->where('name', 'like', "%{$word}%");
                                     })
                                     ->orWhereHas('rombelRel', function ($r) use ($word) {
                                         $r->where('nama', 'like', "%{$word}%")
                                           ->orWhere('tingkat', 'like', "%{$word}%")
                                           ->orWhereHas('jurusan', function ($j) use ($word) {
                                               $j->where('kode', 'like', "%{$word}%")
                                                 ->orWhere('nama', 'like', "%{$word}%");
                                           });
                                     });
                            });
                        }
                    });
                }
            })
            ->take(15)
            ->get();

        return response()->json($nasabahs);
    }
}
