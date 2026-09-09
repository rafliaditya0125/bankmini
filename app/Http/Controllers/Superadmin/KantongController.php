<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\WalletType;
use App\Models\Wallet;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\Jurusan;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class KantongController extends Controller
{
    /**
     * Display a listing of pocket types.
     */
    public function index(Request $request)
    {
        $query = WalletType::withCount('wallets')
            ->withSum('wallets as total_saldo', 'balance');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
        }

        if ($request->category) {
            $query->where('category', $request->category);
        } else {
            // Default show payment pockets first, but Tabungan is also visible
        }

        $kantongList = $query->orderBy('is_default', 'desc')
            ->orderBy('id', 'asc')
            ->paginate(12)
            ->withQueryString();

        // Summary Stats
        $totalKantongAktif = WalletType::pembayaran()->where('is_active', true)->count();
        $totalDanaKantong = Wallet::whereHas('walletType', function ($q) {
            $q->pembayaran();
        })->sum('balance');
        $totalNasabahTerdaftar = Nasabah::where('status', 'aktif')->count();

        $userRole = Auth::user()?->role;
        $rolePrefix = in_array($userRole, ['superadmin', 'admin']) ? $userRole : 'superadmin';

        return Inertia::render('superadmin/kantong/Index', [
            'kantongList' => $kantongList,
            'filters' => $request->only(['search', 'category']),
            'stats' => [
                'total_kantong' => $totalKantongAktif,
                'total_dana' => (float) $totalDanaKantong,
                'total_nasabah' => $totalNasabahTerdaftar,
            ],
            'rolePrefix' => $rolePrefix,
        ]);
    }

    /**
     * Store a newly created pocket type in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'target_amount' => 'nullable|numeric|min:0',
            'target_audience' => 'required|string|in:all,siswa_all,siswa_tingkat_10,siswa_tingkat_11,siswa_tingkat_12',
            'description' => 'nullable|string|max:500',
        ]);

        $walletType = WalletType::create([
            'name' => $validated['name'],
            'category' => 'pembayaran',
            'target_amount' => $validated['target_amount'] ?? null,
            'target_audience' => $validated['target_audience'],
            'description' => $validated['description'] ?? null,
            'is_default' => false,
            'is_active' => true,
        ]);

        // Auto-provision wallet for existing matching nasabahs
        $nasabahQuery = Nasabah::where('status', 'aktif');
        if (str_starts_with($walletType->target_audience, 'siswa_')) {
            $nasabahQuery->whereHas('user', fn($q) => $q->where('user_type', 'siswa'));
            if ($walletType->target_audience === 'siswa_tingkat_10') {
                $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '10'));
            } elseif ($walletType->target_audience === 'siswa_tingkat_11') {
                $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '11'));
            } elseif ($walletType->target_audience === 'siswa_tingkat_12') {
                $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '12'));
            }
        }

        $nasabahs = $nasabahQuery->select('id', 'nomor_rekening')->get();
        foreach ($nasabahs as $nasabah) {
            Wallet::firstOrCreate(
                [
                    'nasabah_id' => $nasabah->id,
                    'wallet_type_id' => $walletType->id,
                ],
                [
                    'wallet_number' => 'W-' . $nasabah->nomor_rekening . '-' . str_pad($walletType->id, 2, '0', STR_PAD_LEFT),
                    'balance' => 0.00,
                    'status' => 'active',
                ]
            );
        }

        AuditLog::logActivity(
            'create_pocket',
            "Membuat kantong pembayaran baru: {$walletType->name}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return redirect()->back()->with('success', "Kantong '{$walletType->name}' berhasil dibuat.");
    }

    /**
     * Display the specified pocket type and its nasabah balances.
     */
    public function show(Request $request, WalletType $kantong)
    {
        $nasabahQuery = Nasabah::with(['user', 'rombelRel.jurusan'])
            ->where('status', 'aktif');

        // Apply audience filtering if pocket has audience constraint
        if ($kantong->target_audience === 'siswa_all') {
            $nasabahQuery->whereHas('user', fn($q) => $q->where('user_type', 'siswa'));
        } elseif ($kantong->target_audience === 'siswa_tingkat_10') {
            $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '10'));
        } elseif ($kantong->target_audience === 'siswa_tingkat_11') {
            $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '11'));
        } elseif ($kantong->target_audience === 'siswa_tingkat_12') {
            $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', '12'));
        }

        // Search
        if ($request->search) {
            $search = $request->search;
            $nasabahQuery->where(function ($q) use ($search) {
                $q->where('nomor_rekening', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$search}%")->orWhere('nis_nip', 'like', "%{$search}%"));
            });
        }

        // Filter Tingkat & Rombel
        if ($request->tingkat) {
            $nasabahQuery->whereHas('rombelRel', fn($q) => $q->where('tingkat', $request->tingkat));
        }
        if ($request->rombel_id) {
            $nasabahQuery->where('rombel_id', $request->rombel_id);
        }

        // Eager load wallet specifically for this kantong
        $nasabahQuery->with(['wallets' => function ($wq) use ($kantong) {
            $wq->where('wallet_type_id', $kantong->id);
        }]);

        // Pagination
        $nasabahs = $nasabahQuery->orderBy('id', 'asc')
            ->paginate(15)
            ->through(function ($nasabah) use ($kantong) {
                $wallet = $nasabah->wallets->first();
                $saldoKantong = $wallet ? (float) $wallet->balance : 0.0;
                $targetAmount = $kantong->target_amount ? (float) $kantong->target_amount : null;
                $sisaTagihan = $targetAmount ? max(0, $targetAmount - $saldoKantong) : null;

                $statusBayar = 'belum_bayar';
                if ($targetAmount) {
                    if ($saldoKantong >= $targetAmount) {
                        $statusBayar = 'lunas';
                    } elseif ($saldoKantong > 0) {
                        $statusBayar = 'sebagian';
                    }
                } else {
                    $statusBayar = $saldoKantong > 0 ? 'sudah_bayar' : 'belum_bayar';
                }

                return [
                    'id' => $nasabah->id,
                    'nomor_rekening' => $nasabah->nomor_rekening,
                    'nama' => $nasabah->user?->name,
                    'nis_nip' => $nasabah->user?->nis_nip,
                    'user_type' => $nasabah->user?->user_type,
                    'rombel_nama' => $nasabah->rombelRel?->nama_kelas,
                    'tingkat' => $nasabah->rombelRel?->tingkat,
                    'saldo_kantong' => $saldoKantong,
                    'target_amount' => $targetAmount,
                    'sisa_tagihan' => $sisaTagihan,
                    'status_bayar' => $statusBayar,
                    'wallet_id' => $wallet?->id,
                ];
            })
            ->withQueryString();

        // Calculate statistics for this specific pocket
        $totalDanaTerkumpul = (float) Wallet::where('wallet_type_id', $kantong->id)->sum('balance');
        $totalNasabah = $nasabahQuery->count();
        
        $totalLunas = 0;
        if ($kantong->target_amount) {
            $totalLunas = Wallet::where('wallet_type_id', $kantong->id)
                ->where('balance', '>=', $kantong->target_amount)
                ->count();
        } else {
            $totalLunas = Wallet::where('wallet_type_id', $kantong->id)
                ->where('balance', '>', 0)
                ->count();
        }

        $rombels = Rombel::with('jurusan')->orderBy('tingkat')->orderBy('nama')->get();
        $userRole = Auth::user()?->role;
        $rolePrefix = in_array($userRole, ['superadmin', 'admin']) ? $userRole : 'superadmin';

        return Inertia::render('superadmin/kantong/Show', [
            'kantong' => $kantong,
            'nasabahs' => $nasabahs,
            'rombels' => $rombels,
            'stats' => [
                'total_terkumpul' => $totalDanaTerkumpul,
                'total_nasabah' => $totalNasabah,
                'total_lunas' => $totalLunas,
                'persentase_lunas' => $totalNasabah > 0 ? round(($totalLunas / $totalNasabah) * 100, 1) : 0,
            ],
            'filters' => $request->only(['search', 'tingkat', 'rombel_id']),
            'rolePrefix' => $rolePrefix,
        ]);
    }

    /**
     * Update the specified pocket type in storage.
     */
    public function update(Request $request, WalletType $kantong)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'target_amount' => 'nullable|numeric|min:0',
            'target_audience' => 'required|string|in:all,siswa_all,siswa_tingkat_10,siswa_tingkat_11,siswa_tingkat_12',
            'description' => 'nullable|string|max:500',
            'is_active' => 'required|boolean',
        ]);

        $kantong->update($validated);

        AuditLog::logActivity(
            'update_pocket',
            "Memperbarui kantong: {$kantong->name}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        return redirect()->back()->with('success', "Kantong '{$kantong->name}' berhasil diperbarui.");
    }

    /**
     * Remove or deactivate the specified pocket type.
     */
    public function destroy(WalletType $kantong)
    {
        if ($kantong->is_default) {
            return redirect()->back()->with('error', "Kantong default 'Tabungan' tidak boleh dihapus.");
        }

        // Check if any wallet has positive balance
        $hasBalance = $kantong->wallets()->where('balance', '>', 0)->exists();
        if ($hasBalance) {
            $kantong->update(['is_active' => false]);
            return redirect()->back()->with('success', "Kantong '{$kantong->name}' masih memiliki saldo, sehingga statusnya dinonaktifkan.");
        }

        // If no balances, delete wallets and wallet type
        $kantong->wallets()->delete();
        $kantong->delete();

        AuditLog::logActivity(
            'delete_pocket',
            "Menghapus kantong: {$kantong->name}",
            'success',
            Auth::id(),
            Auth::user()->name,
            Auth::user()->role
        );

        $role = Auth::user()?->role ?? 'superadmin';
        return redirect()->route($role . '.kantong.index')->with('success', "Kantong '{$kantong->name}' berhasil dihapus.");
    }
}
