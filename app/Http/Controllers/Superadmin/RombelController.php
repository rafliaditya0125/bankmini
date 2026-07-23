<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Rombel;
use App\Models\Jurusan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RombelController extends Controller
{
    public function index(Request $request)
    {
        $jurusanId = $request->jurusan_id;
        
        $query = Rombel::with('jurusan');
        
        if ($jurusanId) {
            $query->where('jurusan_id', $jurusanId);
        }
        
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('nama', 'like', "%{$request->search}%")
                  ->orWhere('tahun_ajaran', 'like', "%{$request->search}%");
            });
        }
        
        return Inertia::render('superadmin/kelas/Index', [
            'rombels' => $query->latest()->paginate(15)->withQueryString(),
            'jurusans' => Jurusan::orderBy('nama')->get(),
            'filters' => $request->only(['search', 'jurusan_id']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'jurusan_id' => 'required|exists:jurusans,id',
            'tahun_ajaran' => 'required|string|max:9',
            'tingkat' => 'required|in:10,11,12',
            'jumlah_rombel' => 'required|integer|min:1|max:20',
        ]);

        $jumlahRombel = $request->jumlah_rombel;
        $createdCount = 0;

        DB::transaction(function () use ($request, $jumlahRombel, &$createdCount) {
            $jurusan = Jurusan::find($request->jurusan_id);
            $jurusanKode = $jurusan?->kode ?? '';

            for ($i = 1; $i <= $jumlahRombel; $i++) {
                Rombel::create([
                    'jurusan_id' => $request->jurusan_id,
                    'tahun_ajaran' => $request->tahun_ajaran,
                    'tingkat' => $request->tingkat,
                    'nomor_rombel' => $i,
                    'nama' => trim("{$request->tingkat} {$jurusanKode} {$i}"),
                ]);
                $createdCount++;
            }
        });

        return redirect()->back()->with('success', "Berhasil membuat {$createdCount} kelas");
    }

    public function update(Request $request, Rombel $rombel)
    {
        $request->validate([
            'jurusan_id' => 'required|exists:jurusans,id',
            'tahun_ajaran' => 'required|string|max:9',
            'tingkat' => 'required|in:10,11,12',
            'nomor_rombel' => 'required|integer|min:1',
            'nama' => 'nullable|string|max:255',
        ]);

        $jurusan = Jurusan::find($request->jurusan_id);
        $jurusanKode = $jurusan?->kode ?? '';
        $nama = $request->nama ?: trim("{$request->tingkat} {$jurusanKode} {$request->nomor_rombel}");

        $rombel->update([
            'jurusan_id' => $request->jurusan_id,
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
            'nomor_rombel' => $request->nomor_rombel,
            'nama' => $nama,
        ]);

        return redirect()->back()->with('success', 'Kelas berhasil diperbarui');
    }

    public function destroy(Rombel $rombel)
    {
        $rombel->delete();
        return redirect()->back()->with('success', 'Kelas berhasil dihapus');
    }
}
