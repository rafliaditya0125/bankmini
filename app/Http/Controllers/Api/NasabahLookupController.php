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
        $q = trim($request->query('q', ''));
        if (empty($q) || strlen($q) < 2) {
            return response()->json([]);
        }

        $cleanQ = strtolower($q);
        $keywords = array_values(array_filter(explode(' ', $cleanQ)));

        $exact = $cleanQ;
        $prefix = $cleanQ . '%';
        $wordPrefix = '% ' . $cleanQ . '%';
        $contains = '%' . $cleanQ . '%';

        $query = Nasabah::query()
            ->select('nasabah.*')
            ->leftJoin('users', 'users.id', '=', 'nasabah.user_id')
            ->leftJoin('rombels', 'rombels.id', '=', 'nasabah.rombel_id')
            ->leftJoin('jurusans', 'jurusans.id', '=', 'rombels.jurusan_id')
            ->where('nasabah.status', 'aktif');

        if (count($keywords) > 1) {
            // Jika pencarian multi-kata (misal "nazwa eka"):
            $query->where(function ($subQ) use ($keywords, $contains) {
                // Cocokkan seluruh frasa
                $subQ->where(function ($phraseQ) use ($contains) {
                    $phraseQ->where('nasabah.nomor_rekening', 'like', $contains)
                            ->orWhere('users.name', 'like', $contains)
                            ->orWhere('nasabah.nama_lengkap', 'like', $contains)
                            ->orWhere('rombels.nama', 'like', $contains)
                            ->orWhere('jurusans.kode', 'like', $contains)
                            ->orWhere('jurusans.nama', 'like', $contains);
                })
                // ATAU setiap kata kunci ditemukan di salah satu kolom
                ->orWhere(function ($allWordsQ) use ($keywords) {
                    foreach ($keywords as $word) {
                        $wordLike = '%' . $word . '%';
                        $allWordsQ->where(function ($singleWordQ) use ($wordLike) {
                            $singleWordQ->where('nasabah.nomor_rekening', 'like', $wordLike)
                                        ->orWhere('users.name', 'like', $wordLike)
                                        ->orWhere('nasabah.nama_lengkap', 'like', $wordLike)
                                        ->orWhere('rombels.nama', 'like', $wordLike)
                                        ->orWhere('jurusans.kode', 'like', $wordLike)
                                        ->orWhere('jurusans.nama', 'like', $wordLike);
                        });
                    }
                });
            });
        } else {
            // Pencarian kata tunggal
            $query->where(function ($subQ) use ($contains) {
                $subQ->where('nasabah.nomor_rekening', 'like', $contains)
                     ->orWhere('users.name', 'like', $contains)
                     ->orWhere('nasabah.nama_lengkap', 'like', $contains)
                     ->orWhere('rombels.nama', 'like', $contains)
                     ->orWhere('rombels.tingkat', 'like', $contains)
                     ->orWhere('jurusans.kode', 'like', $contains)
                     ->orWhere('jurusans.nama', 'like', $contains);
            });
        }

        // Prioritas pengurutan:
        // 1: Tepat sama (Exact match) pada nama atau no rekening
        // 2: Berawalan dengan kata pencarian (Prefix match, misal "Eka...")
        // 3: Kata kedua/ketiga berawalan dengan kata pencarian (misal "Nazwa Eka...")
        // 4: Mengandung kata di tengah (Substring match)
        // 5: Cocok di kelas atau jurusan
        $query->orderByRaw('
            CASE
                WHEN LOWER(users.name) = ? OR LOWER(nasabah.nomor_rekening) = ? OR LOWER(COALESCE(nasabah.nama_lengkap, "")) = ? THEN 1
                WHEN LOWER(users.name) LIKE ? OR LOWER(nasabah.nomor_rekening) LIKE ? OR LOWER(COALESCE(nasabah.nama_lengkap, "")) LIKE ? THEN 2
                WHEN LOWER(users.name) LIKE ? OR LOWER(COALESCE(nasabah.nama_lengkap, "")) LIKE ? THEN 3
                WHEN LOWER(users.name) LIKE ? OR LOWER(nasabah.nomor_rekening) LIKE ? OR LOWER(COALESCE(nasabah.nama_lengkap, "")) LIKE ? THEN 4
                ELSE 5
            END ASC, users.name ASC
        ', [
            $exact, $exact, $exact,
            $prefix, $prefix, $prefix,
            $wordPrefix, $wordPrefix,
            $contains, $contains, $contains
        ]);

        $nasabahs = $query->with(['user', 'jurusanRel', 'rombelRel.jurusan'])
            ->take(25)
            ->get();

        return response()->json($nasabahs);
    }
}
