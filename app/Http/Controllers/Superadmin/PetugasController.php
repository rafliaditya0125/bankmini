<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AuditTrail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\IOFactory;

class PetugasController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = auth()->user();

        // Base query for roles
        $query = User::whereIn('role', ['superadmin', 'admin', 'teller']);

        // RESTRICTION: Admin cannot see Superadmin
        if ($currentUser->role === 'admin') {
            $query->where('role', '!=', 'superadmin');
        }

        // Apply filters
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%")
                    ->orWhere('username', 'like', "%{$request->search}%");
            });
        }

        if ($request->role && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return Inertia::render('superadmin/petugas/Index', [
            'petugas' => $query->latest('updated_at')->paginate(10)->withQueryString(),
            'filters' => $request->only(['search', 'role', 'status'])
        ]);
    }

    public function show(User $petuga)
    {
        $currentUser = auth()->user();

        // Admin cannot see superadmin details
        if ($currentUser->role === 'admin' && $petuga->role === 'superadmin') {
            abort(403, 'Anda tidak memiliki akses untuk melihat data Superadmin');
        }

        // Admin cannot see other admin details (as requested: superadmin can delete admin, admin can only manage teller)
        if ($currentUser->role === 'admin' && $petuga->role === 'admin' && $currentUser->id !== $petuga->id) {
            abort(403, 'Anda tidak memiliki akses untuk melihat data Admin lain');
        }

        if (!in_array($petuga->role, ['superadmin', 'teller', 'admin'])) {
            abort(404);
        }
        return Inertia::render('superadmin/petugas/Show', [
            'petugas' => $petuga
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = auth()->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:254|unique:users,email',
            'role' => 'required|in:superadmin,teller,admin',
            'password' => 'required|string|min:8|max:255|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        // RESTRICTION: No one can create Superadmin via UI
        if ($request->role === 'superadmin') {
            return back()->with('error', 'Tidak diperbolehkan membuat akun Superadmin baru');
        }

        // Admin can ONLY create teller
        if ($currentUser->role === 'admin' && $request->role !== 'teller') {
            return back()->with('error', 'Admin hanya diperbolehkan membuat akun Teller');
        }

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username ?? explode('@', $request->email)[0],
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'phone' => $request->phone,
            'status' => 'active',
        ]);

        AuditTrail::log(
            "Membuat petugas baru: {$request->email} ({$request->role})",
            'User',
            $user->id
        );

        // Determine the correct route based on current user's role
        $routeName = match($currentUser->role) {
            'superadmin' => 'superadmin.petugas.index',
            'admin' => 'admin.petugas.index',
            default => 'superadmin.petugas.index'
        };

        return redirect()->route($routeName)->with('success', 'Petugas berhasil ditambahkan');
    }

    public function update(Request $request, User $petuga)
    {
        $currentUser = auth()->user();

        // Admin cannot update superadmin
        if ($currentUser->role === 'admin' && $petuga->role === 'superadmin') {
            abort(403, 'Anda tidak memiliki akses untuk memperbarui data Superadmin');
        }

        // Admin cannot update other admin
        if ($currentUser->role === 'admin' && $petuga->role === 'admin' && $currentUser->id !== $petuga->id) {
            abort(403, 'Anda tidak memiliki akses untuk memperbarui data Admin lain');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $petuga->id,
            'role' => 'required|in:admin,teller,superadmin',
            'phone' => 'nullable|string|max:20',
            'status' => 'required|in:active,inactive,suspended',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        // Role restriction for admin
        if ($currentUser->role === 'admin') {
            // RESTRICTION: No one can escalate to Superadmin via UI
            if ($request->role === 'superadmin' && $petuga->role !== 'superadmin') {
                return back()->with('error', 'Tidak diperbolehkan membuat akun Superadmin baru');
            }

            // Admin can ONLY update to teller
            if ($request->role !== 'teller' && $petuga->id !== $currentUser->id) {
                return back()->with('error', 'Admin hanya diperbolehkan mengelola akun Teller');
            }
        }

        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'phone' => $request->phone,
            'status' => $request->status,
        ];

        if ($request->filled('password')) {
            $userData['password'] = Hash::make($request->password);
        }

        // Log final data before update
        \Log::info('Petugas Update Data:', [
            'petuga_id' => $petuga->id,
            'updated_fields' => array_keys($userData),
            'has_password' => isset($userData['password'])
        ]);

        $petuga->update($userData);

        AuditTrail::log(
            "Memperbarui data petugas: {$petuga->email}",
            'User',
            $petuga->id
        );

        // Determine the correct route based on current user's role
        $routeName = match($currentUser->role) {
            'superadmin' => 'superadmin.petugas.index',
            'admin' => 'admin.petugas.index',
            default => 'superadmin.petugas.index'
        };

        return redirect()->route($routeName)->with('success', 'Data petugas berhasil diperbarui');
    }

    public function destroy(User $petuga)
    {
        $currentUser = auth()->user();

        if ($petuga->id === $currentUser->id) {
            return back()->with('error', 'Anda tidak dapat menonaktifkan akun sendiri');
        }

        // Admin cannot deactivate superadmin
        if ($currentUser->role === 'admin' && $petuga->role === 'superadmin') {
            return back()->with('error', 'Admin tidak memiliki otoritas untuk menonaktifkan Superadmin');
        }

        // Admin cannot deactivate other admin
        if ($currentUser->role === 'admin' && $petuga->role === 'admin') {
            return back()->with('error', 'Admin tidak memiliki otoritas untuk menonaktifkan Admin lain');
        }

        // Superadmin can deactivate admin, but admin can only deactivate teller
        if ($currentUser->role === 'admin' && $petuga->role !== 'teller') {
            return back()->with('error', 'Admin hanya dapat menonaktifkan akun Teller');
        }

        $email = $petuga->email;
        $newStatus = $petuga->status === 'active' ? 'inactive' : 'active';
        $petuga->update(['status' => $newStatus]);

        $statusText = $newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan';

        AuditTrail::log(
            ucfirst($statusText) . " petugas: {$email}",
            'User',
            $petuga->id
        );

        return back()->with('success', "Petugas berhasil {$statusText}");
    }

    public function import(Request $request)
    {
        $request->validate([
            'files'   => 'nullable|array',
            'files.*' => 'mimes:xlsx,xls',
            'file'    => 'nullable|mimes:xlsx,xls',
        ]);

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $rawFiles = $request->file('files');
            $uploadedFiles = is_array($rawFiles) ? $rawFiles : [$rawFiles];
        } elseif ($request->hasFile('file')) {
            $rawFile = $request->file('file');
            $uploadedFiles = is_array($rawFile) ? $rawFile : [$rawFile];
        }

        if (empty($uploadedFiles)) {
            return back()->withErrors(['file' => 'Berkas Excel wajib diunggah.']);
        }

        $count = 0;
        DB::transaction(function () use ($uploadedFiles, &$count) {
            foreach ($uploadedFiles as $file) {
                $spreadsheet = IOFactory::load($file->getRealPath());
                $rows = $spreadsheet->getActiveSheet()->toArray();
                array_shift($rows); // Skip header

                foreach ($rows as $data) {
                    if (count(array_filter($data, fn($v) => $v !== null)) < 5) continue;

                    $name     = trim($data[0] ?? '');
                    $email    = trim($data[1] ?? '');
                    $role     = trim($data[2] ?? '');
                    $password = trim($data[3] ?? '');
                    $phone    = trim($data[4] ?? '');

                    if (empty($email) || empty($password)) continue;
                    if (User::where('email', $email)->exists()) continue;

                    User::create([
                        'name'     => $name,
                        'username' => explode('@', $email)[0],
                        'email'    => $email,
                        'role'     => in_array($role, ['admin', 'teller']) ? $role : 'teller',
                        'password' => Hash::make($password),
                        'phone'    => $phone ?: null,
                        'status'   => 'active',
                    ]);

                    $count++;
                }
            }
        });

        AuditTrail::log("Import {$count} petugas baru via Excel", 'User');

        return back()->with('success', "Berhasil mengimport {$count} petugas");
    }

    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Petugas');

        // Header
        $sheet->fromArray(['name', 'email', 'role', 'password', 'phone'], null, 'A1');
        // Contoh data
        $sheet->fromArray(['Admin Sekolah', 'admin@sekolah.sch.id', 'admin', 'password123', '08123456789'], null, 'A2');
        $sheet->fromArray(['Teller Bank', 'teller1@sekolah.sch.id', 'teller', 'password123', '08987654321'], null, 'A3');

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'template_petugas.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Bulk update status for selected petugas.
     */
    public function bulkStatus(Request $request)
    {
        $currentUser = auth()->user();

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:users,id',
            'status' => 'required|in:active,inactive,suspended',
        ]);

        $users = User::whereIn('id', $request->ids)->get();
        $targetStatus = $request->status;
        $updatedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($users, $targetStatus, $currentUser, &$updatedCount, &$skippedCount) {
            foreach ($users as $user) {
                // Cannot change self
                if ($user->id === $currentUser->id) {
                    $skippedCount++;
                    continue;
                }

                // Role restrictions
                if ($currentUser->role === 'admin') {
                    if ($user->role === 'superadmin' || $user->role === 'admin') {
                        $skippedCount++;
                        continue;
                    }
                }

                $user->update(['status' => $targetStatus]);
                $updatedCount++;
            }

            if ($updatedCount > 0) {
                AuditTrail::log(
                    "Mengubah status {$updatedCount} akun petugas menjadi {$targetStatus}",
                    'User'
                );
            }
        });

        $statusText = match($targetStatus) {
            'active' => 'diaktifkan',
            'inactive' => 'dinonaktifkan',
            'suspended' => 'diblokir',
        };

        if ($updatedCount === 0 && $skippedCount > 0) {
            return back()->with('error', 'Tidak ada akun petugas yang dapat diubah karena batasan hak akses.');
        }

        $message = "Berhasil {$statusText} {$updatedCount} petugas";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} dilewati karena batasan hak akses atau akun sendiri)";
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk delete selected petugas accounts.
     */
    public function bulkDelete(Request $request)
    {
        $currentUser = auth()->user();

        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:users,id',
        ]);

        $users = User::whereIn('id', $request->ids)->get();
        $deletedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($users, $currentUser, &$deletedCount, &$skippedCount) {
            foreach ($users as $user) {
                // Cannot delete self
                if ($user->id === $currentUser->id) {
                    $skippedCount++;
                    continue;
                }

                // Superadmin protection & admin permission limits
                if ($user->role === 'superadmin') {
                    $skippedCount++;
                    continue;
                }

                if ($currentUser->role === 'admin' && $user->role !== 'teller') {
                    $skippedCount++;
                    continue;
                }

                AuditTrail::log(
                    "Menghapus akun petugas: {$user->email} ({$user->role})",
                    'User',
                    $user->id
                );

                $user->delete();
                $deletedCount++;
            }
        });

        if ($deletedCount === 0 && $skippedCount > 0) {
            return back()->with('error', 'Tidak ada akun petugas yang dapat dihapus karena batasan hak akses atau akun sendiri.');
        }

        $message = "Berhasil menghapus {$deletedCount} akun petugas";
        if ($skippedCount > 0) {
            $message .= " ({$skippedCount} dilewati karena batasan hak akses/akun sendiri)";
        }

        return back()->with('success', $message);
    }
}
