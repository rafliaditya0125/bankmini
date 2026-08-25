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
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'files'   => 'nullable|array',
            'files.*' => 'mimes:xlsx,xls',
            'file'    => 'nullable|mimes:xlsx,xls',
        ], [
            'files.*.mimes' => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
            'file.mimes'    => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
        ]);

        if ($validator->fails()) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).');
        }

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $rawFiles = $request->file('files');
            $uploadedFiles = is_array($rawFiles) ? $rawFiles : [$rawFiles];
        } elseif ($request->hasFile('file')) {
            $rawFile = $request->file('file');
            $uploadedFiles = is_array($rawFile) ? $rawFile : [$rawFile];
        }

        if (empty($uploadedFiles)) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai.');
        }

        $successCount = 0;
        $failedCount = 0;
        $errors = [];
        $formatMismatch = false;

        try {
            DB::transaction(function () use ($uploadedFiles, &$successCount, &$failedCount, &$errors, &$formatMismatch) {
                foreach ($uploadedFiles as $file) {
                    $spreadsheet = IOFactory::load($file->getRealPath());
                    $rows = $spreadsheet->getActiveSheet()->toArray();

                    if (empty($rows) || count($rows) < 2) {
                        $failedCount++;
                        $errors[] = "Berkas '{$file->getClientOriginalName()}' kosong atau tidak memiliki baris data.";
                        continue;
                    }

                    // Check Header Row
                    $header = array_map(fn($h) => strtolower(trim((string)$h)), $rows[0]);
                    $hasKode = in_array('kode', $header);
                    $hasNama = in_array('nama', $header) || in_array('name', $header);

                    if (!$hasKode && !$hasNama && count(array_filter($header)) < 2) {
                        $formatMismatch = true;
                        $failedCount += (count($rows) - 1);
                        $errors[] = "Format kolom pada '{$file->getClientOriginalName()}' tidak sesuai template.";
                        continue;
                    }

                    // Remove header
                    array_shift($rows);

                    foreach ($rows as $index => $data) {
                        $rowNum = $index + 2;

                        if (empty(array_filter($data, fn($v) => $v !== null && trim((string)$v) !== ''))) {
                            continue;
                        }

                        $kode = isset($data[0]) ? strtoupper(trim((string)$data[0])) : '';
                        $nama = isset($data[1]) ? trim((string)$data[1]) : '';

                        if (empty($kode) || empty($nama)) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Kode dan nama jurusan wajib diisi";
                            continue;
                        }

                        if (Jurusan::where('kode', $kode)->exists()) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Kode jurusan '{$kode}' sudah ada";
                            continue;
                        }

                        Jurusan::create([
                            'kode' => $kode,
                            'nama' => $nama,
                        ]);

                        $successCount++;
                    }
                }
            });
        } catch (\Throwable $e) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan template Excel).');
        }

        if ($successCount > 0) {
            AuditLog::logActivity(
                'import_jurusan',
                "Import {$successCount} jurusan baru via Excel",
                'success',
                Auth::id(),
                Auth::user()->name,
                Auth::user()->role
            );
        }

        if ($formatMismatch && $successCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan tombol Download Template).');
        }

        if ($successCount === 0 && $failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? '. Kendala: ' . implode('; ', array_slice($errors, 0, 3)) : '';
            return back()->with('error', "Gagal mengimport data: 0 berhasil, {$failedCount} gagal/dilewati{$sampleErrors}. Mohon masukkan file dengan format sesuai.");
        }

        if ($successCount === 0 && $failedCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai.');
        }

        if ($failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? ' (Catatan: ' . implode('; ', array_slice($errors, 0, 2)) . ')' : '';
            return back()->with('success', "Proses import selesai: {$successCount} jurusan berhasil, {$failedCount} data gagal/dilewati{$sampleErrors}.");
        }

        return back()->with('success', "Berhasil mengimport {$successCount} jurusan.");
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
        $rombels = $jurusan->rombel()->withCount('nasabah')->orderBy('tahun_ajaran')->orderBy('tingkat')->orderBy('nama')->get();
        
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
            'nama' => 'required|string|max:255',
        ]);

        \App\Models\Rombel::create([
            'jurusan_id' => $jurusan->id,
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
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
            'nama' => 'required|string|max:255',
        ]);

        $rombel->update([
            'tahun_ajaran' => $request->tahun_ajaran,
            'tingkat' => $request->tingkat,
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

    public function importRombel(Request $request, Jurusan $jurusan)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'files'   => 'nullable|array',
            'files.*' => 'mimes:xlsx,xls',
            'file'    => 'nullable|mimes:xlsx,xls',
        ], [
            'files.*.mimes' => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
            'file.mimes'    => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
        ]);

        if ($validator->fails()) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).');
        }

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $rawFiles = $request->file('files');
            $uploadedFiles = is_array($rawFiles) ? $rawFiles : [$rawFiles];
        } elseif ($request->hasFile('file')) {
            $rawFile = $request->file('file');
            $uploadedFiles = is_array($rawFile) ? $rawFile : [$rawFile];
        }

        if (empty($uploadedFiles)) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai.');
        }

        $successCount = 0;
        $failedCount = 0;
        $errors = [];
        $formatMismatch = false;

        try {
            DB::transaction(function () use ($uploadedFiles, &$successCount, &$failedCount, &$errors, &$formatMismatch, $jurusan) {
                foreach ($uploadedFiles as $file) {
                    $spreadsheet = IOFactory::load($file->getRealPath());
                    $rows = $spreadsheet->getActiveSheet()->toArray();

                    if (empty($rows) || count($rows) < 2) {
                        $failedCount++;
                        $errors[] = "Berkas '{$file->getClientOriginalName()}' kosong atau tidak memiliki baris data.";
                        continue;
                    }

                    // Check Header Row
                    $header = array_map(fn($h) => strtolower(trim((string)$h)), $rows[0]);
                    $hasTahun = in_array('tahun_ajaran', $header) || in_array('tahun', $header) || in_array('angkatan', $header);
                    $hasTingkat = in_array('tingkat', $header) || in_array('kelas', $header);

                    if (!$hasTahun && !$hasTingkat && count(array_filter($header)) < 2) {
                        $formatMismatch = true;
                        $failedCount += (count($rows) - 1);
                        $errors[] = "Format kolom pada '{$file->getClientOriginalName()}' tidak sesuai template.";
                        continue;
                    }

                    // Remove header
                    array_shift($rows);

                    foreach ($rows as $index => $data) {
                        $rowNum = $index + 2;

                        if (empty(array_filter($data, fn($v) => $v !== null && trim((string)$v) !== ''))) {
                            continue;
                        }

                        $tahunAjaran = isset($data[0]) ? trim((string)$data[0]) : '';
                        $tingkat     = isset($data[1]) ? trim((string)$data[1]) : '';
                        $namaInput   = isset($data[2]) && trim((string)$data[2]) !== '' ? trim((string)$data[2]) : null;
                        $nama        = $namaInput ?: trim("{$tingkat} {$jurusan->kode}");

                        if (empty($tahunAjaran) || empty($tingkat)) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Tahun ajaran dan tingkat wajib diisi";
                            continue;
                        }

                        if (!in_array($tingkat, ['10', '11', '12'])) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Tingkat harus 10, 11, atau 12";
                            continue;
                        }

                        // Validate if combination already exists
                        if (\App\Models\Rombel::where('jurusan_id', $jurusan->id)
                            ->where('tahun_ajaran', $tahunAjaran)
                            ->where('tingkat', $tingkat)
                            ->where('nama', $nama)
                            ->exists()) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Rombel '{$nama}' ({$tahunAjaran}) sudah ada";
                            continue;
                        }

                        \App\Models\Rombel::create([
                            'jurusan_id'   => $jurusan->id,
                            'tahun_ajaran' => $tahunAjaran,
                            'tingkat'      => (int)$tingkat,
                            'nama'         => $nama,
                        ]);

                        $successCount++;
                    }
                }
            });
        } catch (\Throwable $e) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan template Excel).');
        }

        if ($successCount > 0) {
            AuditLog::logActivity(
                'import_rombel',
                "Import {$successCount} rombel baru untuk jurusan {$jurusan->nama} via Excel",
                'success',
                Auth::id(),
                Auth::user()->name,
                Auth::user()->role
            );
        }

        if ($formatMismatch && $successCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan tombol Download Template).');
        }

        if ($successCount === 0 && $failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? '. Kendala: ' . implode('; ', array_slice($errors, 0, 3)) : '';
            return back()->with('error', "Gagal mengimport data: 0 berhasil, {$failedCount} gagal/dilewati{$sampleErrors}. Mohon masukkan file dengan format sesuai.");
        }

        if ($successCount === 0 && $failedCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai.');
        }

        if ($failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? ' (Catatan: ' . implode('; ', array_slice($errors, 0, 2)) . ')' : '';
            return back()->with('success', "Proses import selesai: {$successCount} rombel berhasil, {$failedCount} data gagal/dilewati{$sampleErrors}.");
        }

        return back()->with('success', "Berhasil mengimport {$successCount} rombel.");
    }

    public function downloadRombelTemplate(Jurusan $jurusan)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Rombel');

        // Header
        $sheet->fromArray(['tahun_ajaran', 'tingkat', 'nama'], null, 'A1');
        
        // Contoh data
        $sheet->fromArray(['2025/2026', '10', '10 ' . $jurusan->kode . ' 1'], null, 'A2');
        $sheet->fromArray(['2025/2026', '10', '10 ' . $jurusan->kode . ' 2'], null, 'A3');

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'template_rombel_' . strtolower($jurusan->kode) . '.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Download template rombel for all jurusan (with jurusan_id column)
     */
    public function downloadRombelTemplateAll()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Rombel All');

        // Header
        $sheet->fromArray(['jurusan_id', 'tahun_ajaran', 'tingkat', 'nama'], null, 'A1');
        
        // Contoh data dengan beberapa jurusan
        $jurusans = Jurusan::orderBy('id')->take(3)->get();
        $row = 2;
        foreach ($jurusans as $jurusan) {
            $sheet->fromArray([$jurusan->id, '2025/2026', '10', '10 ' . $jurusan->kode . ' 1'], null, "A{$row}");
            $row++;
            $sheet->fromArray([$jurusan->id, '2025/2026', '11', '11 ' . $jurusan->kode . ' 1'], null, "A{$row}");
            $row++;
        }

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'template_rombel_all_jurusan.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Import rombel for all jurusan with jurusan_id column
     */
    public function importRombelAll(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'files'   => 'nullable|array',
            'files.*' => 'mimes:xlsx,xls',
            'file'    => 'nullable|mimes:xlsx,xls',
        ], [
            'files.*.mimes' => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
            'file.mimes'    => 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).',
        ]);

        if ($validator->fails()) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai (.xlsx atau .xls).');
        }

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $rawFiles = $request->file('files');
            $uploadedFiles = is_array($rawFiles) ? $rawFiles : [$rawFiles];
        } elseif ($request->hasFile('file')) {
            $rawFile = $request->file('file');
            $uploadedFiles = is_array($rawFile) ? $rawFile : [$rawFile];
        }

        if (empty($uploadedFiles)) {
            return back()->with('error', 'Mohon masukkan file dengan format yang sesuai.');
        }

        $successCount = 0;
        $failedCount = 0;
        $errors = [];
        $formatMismatch = false;

        try {
            DB::transaction(function () use ($uploadedFiles, &$successCount, &$failedCount, &$errors, &$formatMismatch) {
                foreach ($uploadedFiles as $file) {
                    $spreadsheet = IOFactory::load($file->getRealPath());
                    $rows = $spreadsheet->getActiveSheet()->toArray();

                    if (empty($rows) || count($rows) < 2) {
                        $failedCount++;
                        $errors[] = "Berkas '{$file->getClientOriginalName()}' kosong atau tidak memiliki baris data.";
                        continue;
                    }

                    // Check Header Row
                    $header = array_map(fn($h) => strtolower(trim((string)$h)), $rows[0]);
                    $hasJurusan = in_array('jurusan_id', $header) || in_array('jurusan', $header);
                    $hasTahun = in_array('tahun_ajaran', $header) || in_array('tahun', $header) || in_array('angkatan', $header);

                    if (!$hasJurusan && !$hasTahun && count(array_filter($header)) < 2) {
                        $formatMismatch = true;
                        $failedCount += (count($rows) - 1);
                        $errors[] = "Format kolom pada '{$file->getClientOriginalName()}' tidak sesuai template.";
                        continue;
                    }

                    // Remove header
                    array_shift($rows);

                    foreach ($rows as $index => $data) {
                        $rowNum = $index + 2;

                        if (empty(array_filter($data, fn($v) => $v !== null && trim((string)$v) !== ''))) {
                            continue;
                        }

                        $jurusanId   = isset($data[0]) ? (int)trim((string)$data[0]) : 0;
                        $tahunAjaran = isset($data[1]) ? trim((string)$data[1]) : '';
                        $tingkat     = isset($data[2]) ? trim((string)$data[2]) : '';
                        $namaInput   = isset($data[3]) && trim((string)$data[3]) !== '' ? trim((string)$data[3]) : null;

                        if (empty($jurusanId) || empty($tahunAjaran) || empty($tingkat)) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Kolom Jurusan ID, Tahun Ajaran, dan Tingkat wajib diisi";
                            continue;
                        }

                        $jurusan = Jurusan::find($jurusanId);
                        if (!$jurusan) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Jurusan ID {$jurusanId} tidak ditemukan";
                            continue;
                        }

                        if (!in_array($tingkat, ['10', '11', '12'])) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Tingkat harus 10, 11, atau 12";
                            continue;
                        }

                        $nama = $namaInput ?: trim("{$tingkat} {$jurusan->kode}");

                        if (\App\Models\Rombel::where('jurusan_id', $jurusanId)
                            ->where('tahun_ajaran', $tahunAjaran)
                            ->where('tingkat', $tingkat)
                            ->where('nama', $nama)
                            ->exists()) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Rombel '{$nama}' ({$tahunAjaran}) sudah ada";
                            continue;
                        }

                        \App\Models\Rombel::create([
                            'jurusan_id'   => $jurusanId,
                            'tahun_ajaran' => $tahunAjaran,
                            'tingkat'      => (int)$tingkat,
                            'nama'         => $nama,
                        ]);

                        $successCount++;
                    }
                }
            });
        } catch (\Throwable $e) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan template Excel).');
        }

        if ($successCount > 0) {
            AuditLog::logActivity(
                'import_rombel_all',
                "Import {$successCount} rombel baru untuk semua jurusan via Excel",
                'success',
                Auth::id(),
                Auth::user()->name,
                Auth::user()->role
            );
        }

        if ($formatMismatch && $successCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan tombol Download Template).');
        }

        if ($successCount === 0 && $failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? '. Kendala: ' . implode('; ', array_slice($errors, 0, 3)) : '';
            return back()->with('error', "Gagal mengimport data: 0 berhasil, {$failedCount} gagal/dilewati{$sampleErrors}. Mohon masukkan file dengan format sesuai.");
        }

        if ($successCount === 0 && $failedCount === 0) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai.');
        }

        if ($failedCount > 0) {
            $sampleErrors = count($errors) > 0 ? ' (Catatan: ' . implode('; ', array_slice($errors, 0, 2)) . ')' : '';
            return back()->with('success', "Proses import selesai: {$successCount} rombel berhasil, {$failedCount} data gagal/dilewati{$sampleErrors}.");
        }

        return back()->with('success', "Berhasil mengimport {$successCount} rombel.");
    }

    /**
     * Bulk delete jurusans.
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:jurusans,id',
        ]);

        $jurusans = Jurusan::withCount('nasabah')->whereIn('id', $request->ids)->get();
        $deletedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($jurusans, &$deletedCount, &$skippedCount) {
            foreach ($jurusans as $jurusan) {
                if ($jurusan->nasabah_count > 0) {
                    $skippedCount++;
                    continue;
                }

                $nama = $jurusan->nama;
                $jurusan->delete();

                AuditLog::logActivity(
                    'delete_jurusan',
                    "Menghapus jurusan: {$nama}",
                    'success',
                    Auth::id(),
                    Auth::user()->name,
                    Auth::user()->role
                );

                $deletedCount++;
            }
        });

        if ($deletedCount === 0 && $skippedCount > 0) {
            return back()->with('error', "Gagal: {$skippedCount} jurusan masih digunakan oleh data nasabah aktif.");
        }

        $message = "Berhasil menghapus {$deletedCount} jurusan";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} jurusan dilewati karena masih memiliki nasabah)";
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk delete rombels for a specific jurusan
     */
    public function bulkDestroyRombel(Request $request, Jurusan $jurusan)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:rombels,id',
        ]);

        $rombels = \App\Models\Rombel::withCount('nasabah')
            ->where('jurusan_id', $jurusan->id)
            ->whereIn('id', $request->ids)
            ->get();

        $deletedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($rombels, $jurusan, &$deletedCount, &$skippedCount) {
            foreach ($rombels as $rombel) {
                if ($rombel->nasabah_count > 0) {
                    $skippedCount++;
                    continue;
                }

                $rombelName = $rombel->nama ?? "Tingkat {$rombel->tingkat}";
                $rombel->delete();

                AuditLog::logActivity(
                    'delete_rombel',
                    "Menghapus rombel {$rombelName} dari jurusan {$jurusan->nama}",
                    'success',
                    Auth::id(),
                    Auth::user()->name,
                    Auth::user()->role
                );

                $deletedCount++;
            }
        });

        if ($deletedCount === 0 && $skippedCount > 0) {
            return back()->with('error', "Gagal: {$skippedCount} rombel masih memiliki siswa terdaftar.");
        }

        $message = "Berhasil menghapus {$deletedCount} rombel";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} dilewati karena masih memiliki siswa)";
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk promote rombels for a specific jurusan
     */
    public function bulkPromoteRombel(Request $request, Jurusan $jurusan)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:rombels,id',
        ]);

        $rombels = \App\Models\Rombel::where('jurusan_id', $jurusan->id)
            ->whereIn('id', $request->ids)
            ->get();

        $promotedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($rombels, $jurusan, &$promotedCount, &$skippedCount) {
            foreach ($rombels as $rombel) {
                $currentTingkat = (string)$rombel->tingkat;
                $newTingkat = match ($currentTingkat) {
                    '10' => '11',
                    '11' => '12',
                    default => null
                };

                if (!$newTingkat) {
                    $skippedCount++;
                    continue;
                }

                $oldNama = $rombel->nama;
                $newNama = $oldNama ? preg_replace('/^' . preg_quote($currentTingkat, '/') . '\b/', $newTingkat, $oldNama) : "{$newTingkat} {$jurusan->kode}";

                $rombel->update([
                    'tingkat' => $newTingkat,
                    'nama' => $newNama
                ]);

                $promotedCount++;
            }

            if ($promotedCount > 0) {
                AuditLog::logActivity(
                    'update_rombel',
                    "Menaikkan tingkat {$promotedCount} rombel di jurusan {$jurusan->nama}",
                    'success',
                    Auth::id(),
                    Auth::user()->name,
                    Auth::user()->role
                );
            }
        });

        if ($promotedCount === 0 && $skippedCount > 0) {
            return back()->with('error', 'Semua rombel yang dipilih sudah berada di tingkat tertinggi (12).');
        }

        $message = "Berhasil menaikkan tingkat {$promotedCount} rombel";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} rombel dilewati karena sudah tingkat 12)";
        }

        return back()->with('success', $message);
    }
}