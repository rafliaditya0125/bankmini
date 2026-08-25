<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Nasabah;
use App\Models\User;
use App\Models\Transaksi;
use App\Models\AuditTrail;
use App\Models\Jurusan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Rombel;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\IOFactory;

class NasabahController extends Controller
{
    public function index(Request $request)
    {
        $query = Nasabah::with(['user', 'jurusanRel', 'rombelRel', 'rombelRel.jurusan']);

        // Apply filters
        $query->where(function ($q) use ($request) {
            if ($request->search) {
                $q->where('nomor_rekening', 'like', "%{$request->search}%")
                    ->orWhereHas('user', function ($sq) use ($request) {
                        $sq->where('name', 'like', "%{$request->search}%")
                            ->orWhere('email', 'like', "%{$request->search}%")
                            ->orWhere('nis', 'like', "%{$request->search}%")
                            ->orWhere('nip', 'like', "%{$request->search}%");
                    });
            }
        });

        // Filter by Tingkat (Grade) via Rombel Relationship
        if ($request->filled('tingkat') && $request->tingkat !== 'all') {
            $query->whereHas('rombelRel', function ($q) use ($request) {
                $q->where('tingkat', $request->tingkat);
            });
        } elseif ($request->filled('kelas') && $request->kelas !== 'all') {
            // Keep 'kelas' as fallback for compatibility with older parts of the system
            $query->whereHas('rombelRel', function ($q) use ($request) {
                $q->where('tingkat', $request->kelas);
            });
        }

        // Filter by jurusan_id
        if ($request->jurusan_id && $request->jurusan_id !== 'all') {
            $query->where('jurusan_id', '=', $request->jurusan_id);
        }

        // Filter by rombel_id
        if ($request->rombel_id && $request->rombel_id !== 'all') {
            $query->where('rombel_id', '=', $request->rombel_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->user_type && $request->user_type !== 'all') {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('user_type', $request->user_type);
            });
        }

        // Get filter options
        $available_jurusan = Jurusan::orderBy('nama')->get();
        $available_rombels = \App\Models\Rombel::with('jurusan')->orderBy('tingkat')->orderBy('nama')->get()->map(function ($rombel) {
            return [
                'id' => $rombel->id,
                'nama' => $rombel->nama_kelas,
                'jurusan_id' => $rombel->jurusan_id,
                'tingkat' => $rombel->tingkat,
            ];
        });

        return Inertia::render('superadmin/nasabah/Index', [
            'nasabah' => $query->latest('updated_at')->paginate(15)->withQueryString(),
            'filters' => $request->only(['search', 'status', 'tingkat', 'jurusan_id', 'rombel_id', 'user_type']),
            'available_jurusan' => $available_jurusan,
            'available_rombels' => $available_rombels
        ]);
    }

    public function show(Nasabah $nasabah)
    {
        $nasabah->load('user');
        $transactions = Transaksi::where('nasabah_id', $nasabah->id)
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('superadmin/nasabah/Show', [
            'nasabah' => $nasabah,
            'transactions' => $transactions,
            'jurusans' => Jurusan::orderBy('nama')->get(),
        ]);
    }

    public function store(Request $request)
    {
        // Debug: Log request data
        \Log::info('Nasabah Store Request:', [
            'user_type' => $request->user_type,
            'jurusan_id' => $request->jurusan_id,
            'rombel_id' => $request->rombel_id,
            'all_data' => $request->all()
        ]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'nomor_rekening' => 'required|string|max:50|unique:nasabah,nomor_rekening',
            'phone' => 'nullable|string|max:20',
            'user_type' => 'required|in:siswa,kelas,organisasi,guru',
            'nis' => 'required_if:user_type,siswa|nullable|string|max:20|regex:/^[0-9]+$/|unique:users,nis',
            'nip' => 'required_if:user_type,guru|nullable|string|max:30|regex:/^[0-9]+$/|unique:users,nip',
            'jurusan_id' => 'required_if:user_type,siswa,kelas|nullable|exists:jurusans,id',
            'rombel_id' => 'required_if:user_type,siswa,kelas|nullable|exists:rombels,id',
            'alamat' => 'nullable|string|max:255',
            'saldo_awal' => 'required_unless:user_type,guru|nullable|numeric|max:999999999999999|min:0',
        ]);

        $userType = $request->user_type;
        $isStudentType = in_array($userType, ['siswa', 'kelas'], true);
        
        $nis = $userType === 'siswa' ? $request->nis : null;
        $nip = $userType === 'guru' ? $request->nip : null;
        $rombelId = $isStudentType ? $request->rombel_id : null;
        $saldoAwal = $userType === 'guru' ? 0 : ($request->saldo_awal ?? 0);

        DB::transaction(function () use ($request, $nis, $nip, $rombelId, $saldoAwal, $isStudentType) {
            $loginIdentifier = match ($request->user_type) {
                'siswa' => $nis,
                'guru' => $nip,
                default => $request->nomor_rekening,
            };

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'username' => $loginIdentifier,
                'password' => $loginIdentifier,
                'role' => 'nasabah',
                'phone' => $request->phone,
                'user_type' => $request->user_type,
                'nis' => $nis,
                'nip' => $nip,
                'status' => 'active',
            ]);

            // Determine jurusan_id
            $jurusanId = $request->jurusan_id;
            if ($isStudentType && $rombelId) {
                $rombel = \App\Models\Rombel::find($rombelId);
                if ($rombel) {
                    $jurusanId = $rombel->jurusan_id;
                }
            } elseif (!$isStudentType) {
                // Guru and Organisasi do NOT have jurusan/rombel
                $jurusanId = null;
                // $rombelId is already null
            }

            $nasabah = Nasabah::create([
                'user_id' => $user->id,
                'nomor_rekening' => $request->nomor_rekening,
                'saldo' => $saldoAwal,
                'saldo_minimum' => 10000,
                'jurusan_id' => $jurusanId,
                'rombel_id' => $rombelId,
                'alamat' => $request->alamat,
                'tanggal_buka' => now(),
                'status' => 'aktif',
            ]);
            
            AuditTrail::log(
                "Membuat nasabah baru: {$request->name} ({$loginIdentifier})",
                'Nasabah',
                $nasabah->id
            );
        });

        $role = auth()->user()->role;
        return redirect()->route("{$role}.nasabah.index")->with('success', 'Nasabah berhasil ditambahkan');
    }

    public function update(Request $request, Nasabah $nasabah)
    {
        // Only validate password if it's provided
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $nasabah->user_id,
            'nomor_rekening' => 'required|string|max:50|unique:nasabah,nomor_rekening,' . $nasabah->id,
            'user_type' => 'required|in:siswa,kelas,organisasi,guru,pembayaran',
            'nis' => 'required_if:user_type,siswa|nullable|string|max:20|regex:/^[0-9]+$/|unique:users,nis,' . $nasabah->user_id,
            'nip' => 'required_if:user_type,guru|nullable|string|max:30|regex:/^[0-9]+$/|unique:users,nip,' . $nasabah->user_id,
            'phone' => 'nullable|string|max:20',
            'jurusan_id' => 'required_if:user_type,siswa,kelas|nullable|exists:jurusans,id',
            'rombel_id' => 'required_if:user_type,siswa,kelas|nullable|exists:rombels,id',
            'alamat' => 'nullable|string|max:255',
            'status' => 'required|in:aktif,nonaktif',
        ];
        
        // Only add password validation if password field is filled
        if ($request->filled('password')) {
            $rules['password'] = 'required|string|max:100|min:8|confirmed';
        }
        
        $request->validate($rules);

        $userType = $request->user_type;
        $isStudentType = in_array($userType, ['siswa', 'kelas'], true);

        $nis = $userType === 'siswa' ? $request->nis : null;
        $nip = $userType === 'guru' ? $request->nip : null;
        $rombelId = $isStudentType ? $request->rombel_id : null;

        DB::transaction(function () use ($request, $nasabah, $nis, $nip, $rombelId, $isStudentType) {
            $loginIdentifier = match ($request->user_type) {
                'siswa' => $nis,
                'guru' => $nip,
                default => $request->nomor_rekening,
            };

            $userData = [
                'name' => $request->name,
                'email' => $request->email,
                'nis' => $nis,
                'nip' => $nip,
                'username' => $loginIdentifier,
                'phone' => $request->phone,
                'user_type' => $request->user_type,
                'status' => $request->status === 'aktif' ? 'active' : 'inactive',
            ];

            if ($request->filled('password')) {
                if ($request->password === $loginIdentifier) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'password' => 'Password tidak boleh sama dengan identifier (NIS/NIP/Norek).'
                    ]);
                }
                $userData['password'] = Hash::make($request->password);
            }

            $nasabah->user->update($userData);

            // Determine jurusan_id
            $jurusanId = $request->jurusan_id;
            if ($isStudentType && $rombelId) {
                $rombel = \App\Models\Rombel::find($rombelId);
                if ($rombel) {
                    $jurusanId = $rombel->jurusan_id;
                }
            } elseif (!$isStudentType) {
                $jurusanId = null;
            }

            $nasabah->update([
                'nomor_rekening' => $request->nomor_rekening,
                'jurusan_id' => $jurusanId,
                'rombel_id' => $rombelId,
                'alamat' => $request->alamat,
                'status' => $request->status,
            ]);

            AuditTrail::log(
                "Memperbarui data nasabah: {$nasabah->user->name}",
                'Nasabah',
                $nasabah->id
            );
        });

        $role = auth()->user()->role;
        return redirect()->route("{$role}.nasabah.index")->with('success', 'Data nasabah berhasil diperbarui');
    }

    /**
     * Toggle nasabah status (aktif/nonaktif).
     * Nonaktif = tidak bisa login.
     */
    public function destroy(Nasabah $nasabah)
    {
        DB::transaction(function () use ($nasabah) {
            $currentStatus = $nasabah->status;
            $newStatus = $currentStatus === 'aktif' ? 'nonaktif' : 'aktif';

            $nasabah->update(['status' => $newStatus]);
            $nasabah->user->update(['status' => $newStatus === 'aktif' ? 'active' : 'inactive']);

            AuditTrail::log(
                ($newStatus === 'aktif' ? 'Mengaktifkan' : 'Menonaktifkan') . " nasabah: {$nasabah->user->name}",
                'Nasabah',
                $nasabah->id
            );
        });

        return back()->with('success', 'Status nasabah berhasil diperbarui');
    }

    /**
     * Permanently delete a nasabah account (hard delete).
     * Only allowed if saldo is 0.
     */
    public function deleteRekening(Nasabah $nasabah)
    {
        if ($nasabah->saldo > 0) {
            return back()->with('error', 'Saldo nasabah masih tersisa. Silakan lakukan penarikan seluruh saldo terlebih dahulu.');
        }

        $userName = $nasabah->user->name;
        $userId = $nasabah->user_id;

        DB::transaction(function () use ($nasabah, $userName, $userId) {
            AuditTrail::log(
                "Menghapus rekening nasabah secara permanen: {$userName}",
                'Nasabah',
                $nasabah->id
            );

            // Hard delete nasabah
            $nasabah->forceDelete();

            // Hard delete user
            DB::table('users')->where('id', $userId)->delete();
        });

        $role = auth()->user()->role;
        return redirect()->route("{$role}.nasabah.index")->with('success', "Rekening nasabah {$userName} berhasil dihapus secara permanen");
    }

    public function promote(Nasabah $nasabah)
    {
        $nasabah->load(['user', 'rombelRel']);
        if ($nasabah->user->user_type !== 'siswa') {
            return back()->with('error', 'Hanya nasabah tipe Siswa yang dapat dinaikkan kelas');
        }

        if (!$nasabah->rombelRel) {
            return back()->with('error', 'Nasabah belum memiliki data kelas (Rombel)');
        }

        $currentTingkat = $nasabah->rombelRel->tingkat;
        $newTingkat = match ((string)$currentTingkat) {
            '10' => '11',
            '11' => '12',
            '12' => 'Alumni',
            default => $currentTingkat
        };

        if ($newTingkat === $currentTingkat) {
            return back()->with('error', 'Nasabah sudah berada di tingkat tertinggi atau data tidak valid');
        }

        DB::transaction(function () use ($nasabah, $newTingkat, $currentTingkat) {
            if ($newTingkat === 'Alumni') {
                $nasabah->update([
                    'tanggal_lulus' => now(),
                    // Optional: keep rombel_id but it's now alumni
                ]);
            } else {
                // Find rombel in the next level with same jurusan and name pattern
                $nextRombel = Rombel::where('jurusan_id', $nasabah->jurusan_id)
                    ->where('tingkat', $newTingkat)
                    ->first();

                if ($nextRombel) {
                    $nasabah->update(['rombel_id' => $nextRombel->id]);
                } else {
                    // If not found, we can't move them automatically to a specific rombel
                    // but we can at least log or throw error
                    throw new \Exception("Rombel tingkat {$newTingkat} untuk jurusan ini tidak ditemukan. Silakan buat rombel terlebih dahulu.");
                }
            }

            AuditTrail::log(
                "Naik kelas nasabah {$nasabah->user->name}: Tingkat {$currentTingkat} -> {$newTingkat}",
                'Nasabah',
                $nasabah->id
            );
        });

        return back()->with('success', "Nasabah {$nasabah->user->name} berhasil naik ke tingkat {$newTingkat}");
    }

    public function promoteBatch(Request $request)
    {
        $request->validate([
            'jurusan_id' => 'required|exists:jurusans,id',
            'kelas_asal' => 'required|in:10,11,12'
        ]);

        $nasabahs = Nasabah::where('jurusan_id', $request->jurusan_id)
            ->whereHas('rombelRel', function ($q) use ($request) {
                $q->where('tingkat', $request->kelas_asal);
            })
            ->whereHas('user', function ($q) {
                $q->where('user_type', 'siswa');
            })
            ->get();

        if ($nasabahs->isEmpty()) {
            return back()->with('error', 'Tidak ada nasabah siswa yang ditemukan untuk jurusan dan tingkat tersebut');
        }

        $newTingkat = match ($request->kelas_asal) {
            '10' => '11',
            '11' => '12',
            '12' => 'Alumni',
        };

        DB::transaction(function () use ($nasabahs, $newTingkat, $request) {
            foreach ($nasabahs as $nasabah) {
                // When graduating: account stays ACTIVE, set tanggal_lulus
                if ($newTingkat === 'Alumni') {
                    $nasabah->update(['tanggal_lulus' => now()]);
                }
            }

            // Update rombel tingkat for all rombels in this cohort
            if ($newTingkat !== 'Alumni') {
                $rombelIds = $nasabahs->pluck('rombel_id')->filter()->unique();
                Rombel::whereIn('id', $rombelIds)->update(['tingkat' => $newTingkat]);
            }

            AuditTrail::log(
                "Naik kelas batch jurusan ID {$request->jurusan_id}: {$nasabahs->count()} nasabah ke tingkat {$newTingkat}",
                'Nasabah'
            );
        });

        return back()->with('success', "Berhasil menaikkan {$nasabahs->count()} nasabah ke tingkat {$newTingkat}");
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
                    $hasName = in_array('name', $header) || in_array('nama', $header);
                    $hasIdentifier = in_array('nis_or_nip', $header) || in_array('nis', $header) || in_array('nip', $header) || in_array('identifier', $header);

                    if (!$hasName && !$hasIdentifier && count(array_filter($header)) < 2) {
                        $formatMismatch = true;
                        $failedCount += (count($rows) - 1);
                        $errors[] = "Format kolom pada '{$file->getClientOriginalName()}' tidak sesuai template.";
                        continue;
                    }

                    // Remove header
                    array_shift($rows);

                    foreach ($rows as $index => $data) {
                        $rowNum = $index + 2;

                        // Check if row is completely empty
                        if (empty(array_filter($data, fn($v) => $v !== null && trim((string)$v) !== ''))) {
                            continue;
                        }

                        $name       = isset($data[0]) ? trim((string)$data[0]) : '';
                        $identifier = isset($data[1]) ? trim((string)$data[1]) : '';
                        $norekInput = isset($data[2]) && trim((string)$data[2]) !== '' ? trim((string)$data[2]) : null;
                        $user_type  = isset($data[3]) && trim((string)$data[3]) !== '' ? strtolower(trim((string)$data[3])) : 'siswa';
                        $rombelId   = isset($data[4]) && trim((string)$data[4]) !== '' ? trim((string)$data[4]) : null;
                        $phone      = isset($data[5]) && trim((string)$data[5]) !== '' ? trim((string)$data[5]) : null;
                        $alamat     = isset($data[6]) && trim((string)$data[6]) !== '' ? trim((string)$data[6]) : null;
                        $saldo_awal = isset($data[7]) && is_numeric($data[7]) ? (float)$data[7] : 0;

                        if (empty($name) || empty($identifier)) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Kolom Nama atau NIS/NIP tidak boleh kosong";
                            continue;
                        }

                        $norek = $norekInput ?: $identifier;
                        $nis = $user_type === 'siswa' ? $identifier : null;
                        $nip = $user_type === 'guru'  ? $identifier : null;

                        // Check duplicate identifier in users
                        if (User::where('nis', $identifier)->orWhere('nip', $identifier)->orWhere('username', $identifier)->exists()) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: NIS/NIP '{$identifier}' sudah terdaftar";
                            continue;
                        }

                        // Check duplicate nomor_rekening in nasabah
                        if (Nasabah::where('nomor_rekening', $norek)->exists()) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Nomor rekening '{$norek}' sudah digunakan";
                            continue;
                        }

                        $user = User::create([
                            'name'      => $name,
                            'username'  => $identifier,
                            'email'     => $identifier . '@bankmini.smk',
                            'password'  => $identifier,
                            'role'      => 'nasabah',
                            'phone'     => $phone,
                            'user_type' => in_array($user_type, ['siswa', 'guru', 'kelas', 'organisasi', 'pembayaran']) ? $user_type : 'siswa',
                            'nis'       => $nis,
                            'nip'       => $nip,
                            'status'    => 'active',
                        ]);

                        // Get jurusan_id from rombel
                        $jurusanId = null;
                        if ($rombelId) {
                            $rombel    = \App\Models\Rombel::find($rombelId);
                            $jurusanId = $rombel ? $rombel->jurusan_id : null;
                        }

                        Nasabah::create([
                            'user_id'         => $user->id,
                            'nomor_rekening'  => $norek,
                            'saldo'           => $saldo_awal,
                            'saldo_minimum'   => 10000,
                            'jurusan_id'      => $jurusanId,
                            'rombel_id'       => $rombelId,
                            'alamat'          => $alamat,
                            'tanggal_buka'    => now(),
                            'status'          => 'aktif',
                        ]);

                        $successCount++;
                    }
                }
            });
        } catch (\Throwable $e) {
            return back()->with('error', 'Mohon masukkan file dengan format sesuai (Gunakan template Excel).');
        }

        if ($successCount > 0) {
            AuditTrail::log("Import {$successCount} nasabah baru via Excel", 'Nasabah');
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
            return back()->with('success', "Proses import selesai: {$successCount} nasabah berhasil, {$failedCount} data gagal/dilewati{$sampleErrors}.");
        }

        return back()->with('success', "Berhasil mengimport {$successCount} nasabah.");
    }

    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Nasabah');

        // Header
        $sheet->fromArray(['name', 'nis_or_nip', 'norek', 'user_type', 'rombel_id', 'phone', 'alamat', 'saldo_awal'], null, 'A1');
        // Contoh data
        $sheet->fromArray(['Budi Santoso', '2024001', '10002024001', 'siswa', '5', '08123456789', 'Jl. Merdeka No. 1', 50000], null, 'A2');
        $sheet->fromArray(['Siti Aminah', '2024002', '10002024002', 'siswa', '8', '08987654321', 'Jl. Sudirman No. 10', 100000], null, 'A3');

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'template_nasabah.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function downloadRombelList()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Daftar Rombel');

        // Header
        $sheet->fromArray(['id', 'angkatan', 'tingkat', 'nama_kelas', 'jurusan'], null, 'A1');

        $rombels = \App\Models\Rombel::with('jurusan')
            ->orderBy('tahun_ajaran')
            ->orderBy('tingkat')
            ->orderBy('nama')
            ->get();

        $row = 2;
        foreach ($rombels as $rombel) {
            $sheet->fromArray([
                $rombel->id,
                $rombel->tahun_ajaran,
                $rombel->tingkat,
                $rombel->nama_kelas,
                $rombel->jurusan?->nama ?? '-',
            ], null, "A{$row}");
            $row++;
        }

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'daftar_rombel.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Bulk update kelas/rombel for selected nasabahs.
     */
    public function bulkUpdateKelas(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:nasabah,id',
            'rombel_id' => 'required|exists:rombels,id',
        ]);

        $rombel = \App\Models\Rombel::with('jurusan')->findOrFail($request->rombel_id);
        $nasabahs = Nasabah::with('user')->whereIn('id', $request->ids)->get();

        $count = 0;
        DB::transaction(function () use ($nasabahs, $rombel, &$count) {
            foreach ($nasabahs as $nasabah) {
                $nasabah->update([
                    'rombel_id' => $rombel->id,
                    'jurusan_id' => $rombel->jurusan_id,
                ]);
                $count++;
            }
        });

        AuditTrail::log("Memindahkan {$count} nasabah ke kelas {$rombel->nama_kelas}", 'Nasabah');

        return back()->with('success', "Berhasil memindahkan {$count} nasabah ke kelas {$rombel->nama_kelas}");
    }

    /**
     * Bulk promote selected nasabahs.
     */
    public function bulkPromote(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:nasabah,id',
        ]);

        $nasabahs = Nasabah::with(['user', 'rombelRel'])
            ->whereIn('id', $request->ids)
            ->get();

        $promotedCount = 0;
        $graduatedCount = 0;
        $failedCount = 0;
        $errors = [];

        DB::transaction(function () use ($nasabahs, &$promotedCount, &$graduatedCount, &$failedCount, &$errors) {
            foreach ($nasabahs as $nasabah) {
                if ($nasabah->user->user_type !== 'siswa') {
                    $failedCount++;
                    continue;
                }

                if (!$nasabah->rombelRel) {
                    $failedCount++;
                    $errors[] = "Nasabah {$nasabah->user->name} belum memiliki data rombel/kelas.";
                    continue;
                }

                $currentTingkat = (string)$nasabah->rombelRel->tingkat;
                $newTingkat = match ($currentTingkat) {
                    '10' => '11',
                    '11' => '12',
                    '12' => 'Alumni',
                    default => $currentTingkat
                };

                if ($newTingkat === $currentTingkat || $currentTingkat === 'Alumni') {
                    $failedCount++;
                    continue;
                }

                if ($newTingkat === 'Alumni') {
                    $nasabah->update(['tanggal_lulus' => now()]);
                    $graduatedCount++;
                    AuditTrail::log(
                        "Kelulusan nasabah {$nasabah->user->name}: Tingkat {$currentTingkat} -> Alumni",
                        'Nasabah',
                        $nasabah->id
                    );
                } else {
                    // Find rombel in the next level with same jurusan
                    $nextRombel = Rombel::where('jurusan_id', $nasabah->jurusan_id)
                        ->where('tingkat', $newTingkat)
                        ->first();

                    if ($nextRombel) {
                        $nasabah->update(['rombel_id' => $nextRombel->id]);
                        $promotedCount++;
                        AuditTrail::log(
                            "Naik kelas nasabah {$nasabah->user->name}: Tingkat {$currentTingkat} -> {$newTingkat}",
                            'Nasabah',
                            $nasabah->id
                        );
                    } else {
                        $failedCount++;
                        $errors[] = "Rombel tingkat {$newTingkat} untuk jurusan nasabah {$nasabah->user->name} belum tersedia.";
                    }
                }
            }
        });

        $totalSuccess = $promotedCount + $graduatedCount;
        if ($totalSuccess === 0 && $failedCount > 0) {
            return back()->with('error', 'Gagal menaikkan kelas: ' . (count($errors) > 0 ? implode(', ', array_slice($errors, 0, 2)) : 'Nasabah tidak valid atau sudah di tingkat tertinggi.'));
        }

        $message = "Berhasil memproses {$totalSuccess} nasabah";
        if ($promotedCount > 0 && $graduatedCount > 0) {
            $message .= " ({$promotedCount} naik kelas, {$graduatedCount} lulus/alumni)";
        } elseif ($graduatedCount > 0) {
            $message .= " ({$graduatedCount} lulus/alumni)";
        }
        if ($failedCount > 0) {
            $message .= " ({$failedCount} dilewati)";
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk update status for selected nasabahs (aktif/nonaktif).
     */
    public function bulkStatus(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:nasabah,id',
            'status' => 'required|in:aktif,nonaktif',
        ]);

        $nasabahs = Nasabah::with('user')->whereIn('id', $request->ids)->get();
        $targetStatus = $request->status;
        $userTargetStatus = $targetStatus === 'aktif' ? 'active' : 'inactive';
        $count = 0;

        DB::transaction(function () use ($nasabahs, $targetStatus, $userTargetStatus, &$count) {
            foreach ($nasabahs as $nasabah) {
                $nasabah->update(['status' => $targetStatus]);
                $nasabah->user->update(['status' => $userTargetStatus]);
                $count++;
            }

            AuditTrail::log(
                ($targetStatus === 'aktif' ? 'Mengaktifkan' : 'Menonaktifkan') . " {$count} akun nasabah secara massal",
                'Nasabah'
            );
        });

        $statusText = $targetStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Berhasil {$statusText} {$count} nasabah");
    }

    /**
     * Bulk delete accounts for selected nasabahs.
     * Only deletes accounts with 0 saldo.
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:nasabah,id',
        ]);

        $nasabahs = Nasabah::with('user')->whereIn('id', $request->ids)->get();

        $deletedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($nasabahs, &$deletedCount, &$skippedCount) {
            foreach ($nasabahs as $nasabah) {
                if ((float)$nasabah->saldo > 0) {
                    $skippedCount++;
                    continue;
                }

                $userName = $nasabah->user->name;
                $userId = $nasabah->user_id;

                AuditTrail::log(
                    "Menghapus rekening nasabah secara permanen: {$userName}",
                    'Nasabah',
                    $nasabah->id
                );

                $nasabah->forceDelete();
                DB::table('users')->where('id', $userId)->delete();
                $deletedCount++;
            }
        });

        if ($deletedCount === 0 && $skippedCount > 0) {
            return back()->with('error', "Semua {$skippedCount} nasabah yang dipilih masih memiliki sisa saldo dan tidak dapat dihapus.");
        }

        $message = "Berhasil menghapus {$deletedCount} rekening nasabah secara permanen";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} nasabah dilewati karena masih memiliki saldo)";
        }

        return back()->with('success', $message);
    }
}
