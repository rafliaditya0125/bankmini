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
        
        $query = Rombel::with('jurusan')->withCount('nasabah');
        
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
            'nama' => 'required|string|max:255',
        ]);

        $rombel->update([
            'jurusan_id' => $request->jurusan_id,
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
            'nama' => $request->nama,
        ]);

        return redirect()->back()->with('success', 'Kelas berhasil diperbarui');
    }

    public function destroy(Rombel $rombel)
    {
        $rombel->delete();
        return redirect()->back()->with('success', 'Kelas berhasil dihapus');
    }

    /**
     * Bulk promote selected classes (tingkat 10 -> 11, 11 -> 12).
     */
    public function bulkPromote(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:rombels,id',
        ]);

        $rombels = Rombel::with('jurusan')->whereIn('id', $request->ids)->get();
        $promotedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($rombels, &$promotedCount, &$skippedCount) {
            foreach ($rombels as $rombel) {
                $currentTingkat = (string)$rombel->tingkat;
                $newTingkat = match ($currentTingkat) {
                    '10' => '11',
                    '11' => '12',
                    default => null,
                };

                if (!$newTingkat) {
                    $skippedCount++;
                    continue;
                }

                $jurusanKode = $rombel->jurusan?->kode ?? '';
                $oldNama = $rombel->nama;
                $newNama = $oldNama ? preg_replace('/^' . preg_quote($currentTingkat, '/') . '\b/', $newTingkat, $oldNama) : trim("{$newTingkat} {$jurusanKode}");

                $rombel->update([
                    'tingkat' => $newTingkat,
                    'nama' => $newNama,
                ]);

                $promotedCount++;
            }
        });

        if ($promotedCount === 0 && $skippedCount > 0) {
            return back()->with('error', 'Semua kelas yang dipilih sudah berada di tingkat tertinggi (12).');
        }

        $message = "Berhasil menaikkan tingkat {$promotedCount} kelas";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} kelas dilewati karena sudah tingkat 12)";
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk delete selected classes.
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:rombels,id',
        ]);

        $rombels = Rombel::withCount('nasabah')->whereIn('id', $request->ids)->get();
        $deletedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($rombels, &$deletedCount, &$skippedCount) {
            foreach ($rombels as $rombel) {
                if ($rombel->nasabah_count > 0) {
                    $skippedCount++;
                    continue;
                }

                $rombel->delete();
                $deletedCount++;
            }
        });

        if ($deletedCount === 0 && $skippedCount > 0) {
            return back()->with('error', "Gagal: {$skippedCount} kelas masih memiliki data nasabah/siswa terdaftar.");
        }

        $message = "Berhasil menghapus {$deletedCount} kelas";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} kelas dilewati karena masih memiliki siswa)";
        }

        return back()->with('success', $message);
    }
}
