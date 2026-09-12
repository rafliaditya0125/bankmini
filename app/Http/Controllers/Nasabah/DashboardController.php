<?php

namespace App\Http\Controllers\Nasabah;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $nasabah = $user->nasabah;

        if (!$nasabah) {
            return redirect()->route('welcome')->with('error', 'Anda belum terdaftar sebagai nasabah');
        }

        // Recent Transactions (hanya transaksi aktif / tidak dibatalkan)
        $recent_transactions = Transaksi::where(function($q) use ($nasabah) {
                $q->where('nasabah_id', $nasabah->id)
                  ->orWhere(function($inner) use ($nasabah) {
                      $inner->where('nasabah_tujuan_id', $nasabah->id)
                            ->where('jenis_transaksi', 'bayar');
                  });
            })
            ->where('status', '!=', 'cancelled')
            ->latest()
            ->take(10)
            ->get();

        // Pockets / Wallets
        $wallets = $nasabah->wallets()
            ->with('walletType')
            ->whereHas('walletType', function ($q) {
                $q->where('is_active', true);
            })
            ->get();

        return Inertia::render('nasabah/Dashboard', [
            'nasabah' => $nasabah,
            'recent_transactions' => $recent_transactions,
            'wallets' => $wallets,
        ]);
    }
}
