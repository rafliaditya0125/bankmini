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

        // Recent Transactions
        $recent_transactions = Transaksi::where('nasabah_id', $nasabah->id)
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
