<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use App\Http\Requests\StoreJurusanRequest;
use App\Http\Requests\UpdateJurusanRequest;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\IOFactory;

class JurusanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('superadmin/jurusan/Index', [
            'jurusans' => Jurusan::with('rombel')->latest()->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreJurusanRequest $request)
    {
        $jurusan = Jurusan::create($request->validated());

        AuditLog::logActivity(
            'create_jurusan',
            "Menambahkan jurusan baru: {$jurusan->nama} ({$jurusan->kode})",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        $role = Auth::user()->role;
        return redirect()->route("{$role}.jurusan.index")->with('success', 'Jurusan berhasil ditambahkan');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateJurusanRequest $request, Jurusan $jurusan)
    {
        $oldNama = $jurusan->nama;
        $jurusan->update($request->validated());

        AuditLog::logActivity(
            'update_jurusan',
            "Memperbarui jurusan: {$oldNama} menjadi {$jurusan->nama}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        $role = Auth::user()->role;
        return redirect()->route("{$role}.jurusan.index")->with('success', 'Jurusan berhasil diperbarui');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Jurusan $jurusan)
    {
        $nama = $jurusan->nama;
        
        if ($jurusan->nasabah()->count() > 0) {
            return back()->with('error', 'Gagal: Jurusan masih digunakan oleh nasabah');
        }

        $jurusan->delete();

        AuditLog::logActivity(
            'delete_jurusan',
            "Menghapus jurusan: {$nama}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        $role = Auth::user()->role;
        return redirect()->route("{$role}.jurusan.index")->with('success', 'Jurusan berhasil dihapus');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls'
        ]);

        $file = $request->file('file');
        $spreadsheet = IOFactory::load($file->getRealPath());
        $rows = $spreadsheet->getActiveSheet()->toArray();
        array_shift($rows); // Skip header

        $count = 0;
        DB::transaction(function () use ($rows, &$count) {
            foreach ($rows as $data) {
                if (empty($data[0]) || empty($data[1])) continue;

                $kode = strtoupper(trim($data[0]));
                $nama = trim($data[1]);

                if (Jurusan::where('kode', $kode)->exists()) continue;

                Jurusan::create([
                    'kode' => $kode,
                    'nama' => $nama,
                ]);

                $count++;
            }
        });

        AuditLog::logActivity(
            'import_jurusan',
            "Import {$count} jurusan baru via Excel",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return back()->with('success', "Berhasil mengimport {$count} jurusan");
    }

    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Jurusan');

        // Header
        $sheet->fromArray(['kode', 'nama'], null, 'A1');
        // Contoh data
        $sheet->fromArray(['RPL', 'Rekayasa Perangkat Lunak'], null, 'A2');
        $sheet->fromArray(['TKJ', 'Teknik Komputer dan Jaringan'], null, 'A3');

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'template_jurusan.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Show rombel management for a specific jurusan
     */
    public function showRombel(Jurusan $jurusan)
    {
        $rombels = $jurusan->rombel()->orderBy('tahun_ajaran')->orderBy('tingkat')->orderBy('nomor_rombel')->get();
        
        return Inertia::render('superadmin/jurusan/RombelManage', [
            'jurusan' => $jurusan,
            'rombels' => $rombels,
            'tahun_ajaran_list' => \App\Models\Rombel::distinct()->pluck('tahun_ajaran')->sort()->values(),
        ]);
    }

    /**
     * Store rombel for a jurusan
     */
    public function storeRombel(Request $request, Jurusan $jurusan)
    {
        $request->validate([
            'tahun_ajaran' => 'required|string|max:9',
            'tingkat' => 'required|in:10,11,12',
            'nomor_rombel' => 'required|integer|min:1',
            'nama' => 'nullable|string|max:255',
        ]);

        \App\Models\Rombel::create([
            'jurusan_id' => $jurusan->id,
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
            'nomor_rombel' => $request->nomor_rombel,
            'nama' => $request->nama,
        ]);

        AuditLog::logActivity(
            'create_rombel',
            "Menambahkan rombel baru untuk jurusan {$jurusan->nama}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return back()->with('success', 'Rombel berhasil ditambahkan');
    }

    /**
     * Update rombel
     */
    public function updateRombel(Request $request, Jurusan $jurusan, \App\Models\Rombel $rombel)
    {
        $request->validate([
            'tahun_ajaran' => 'required|string|max:9',
            'tingkat' => 'required|in:10,11,12',
            'nomor_rombel' => 'required|integer|min:1',
            'nama' => 'nullable|string|max:255',
        ]);

        $rombel->update([
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
            'nomor_rombel' => $request->nomor_rombel,
            'nama' => $request->nama,
        ]);

        AuditLog::logActivity(
            'update_rombel',
            "Memperbarui rombel untuk jurusan {$jurusan->nama}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return back()->with('success', 'Rombel berhasil diperbarui');
    }

    /**
     * Delete rombel
     */
    public function destroyRombel(Jurusan $jurusan, \App\Models\Rombel $rombel)
    {
        if ($rombel->nasabah()->count() > 0) {
            return back()->with('error', 'Gagal: Rombel masih digunakan oleh nasabah');
        }

        $rombel->delete();

        AuditLog::logActivity(
            'delete_rombel',
            "Menghapus rombel dari jurusan {$jurusan->nama}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return back()->with('success', 'Rombel berhasil dihapus');
    }
}