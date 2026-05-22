<?php

namespace App\Http\Controllers\Teller;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $userId = auth()->id();

        // Stats
        $stats = [
            'transaksi_hari_ini' => (int)Transaksi::where('user_id', $userId)
                ->whereDate('created_at', today())
                ->count(),
            'total_setor' => (float)Transaksi::where('user_id', $userId)
                ->where('jenis_transaksi', 'setor')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_tarik' => (float)Transaksi::where('user_id', $userId)
                ->where('jenis_transaksi', 'tarik')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_transfer' => (float)Transaksi::where('user_id', $userId)
                ->where('jenis_transaksi', 'transfer')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
        ];

        // Recent Transactions
        $recent_transactions = Transaksi::with(['nasabah.user'])
            ->where('user_id', $userId)
            ->latest()
            ->take(10)
            ->get();

        // Daily transaction data for last 7 days (same as admin)
        $transaction_chart_data = Transaksi::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN 1 ELSE 0 END) as setor_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN 1 ELSE 0 END) as tarik_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN jumlah ELSE 0 END) as setor_total'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN jumlah ELSE 0 END) as tarik_total')
            )
            ->whereDate('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => \Carbon\Carbon::parse($item->date)->format('d M'),
                    'setor_count' => $item->setor_count,
                    'tarik_count' => $item->tarik_count,
                    'transfer_count' => 0, // Admin tidak menampilkan transfer
                    'setor_total' => $item->setor_total,
                    'tarik_total' => $item->tarik_total,
                    'transfer_total' => 0,
                ];
            });

        // Weekly transaction data for last 4 weeks (same as admin)
        $weekly_chart_data = Transaksi::select(
                DB::raw('YEARWEEK(created_at) as week'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN 1 ELSE 0 END) as setor_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN 1 ELSE 0 END) as tarik_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN jumlah ELSE 0 END) as setor_total'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN jumlah ELSE 0 END) as tarik_total')
            )
            ->where('created_at', '>=', now()->subWeeks(4))
            ->groupBy('week')
            ->orderBy('week')
            ->get()
            ->map(function ($item, $index) {
                return [
                    'week' => "Minggu " . ($index + 1),
                    'setor_count' => $item->setor_count,
                    'tarik_count' => $item->tarik_count,
                    'transfer_count' => 0,
                    'setor_total' => $item->setor_total,
                    'tarik_total' => $item->tarik_total,
                    'transfer_total' => 0,
                ];
            });

        // Monthly transaction data for last 12 months (same as admin)
        $monthly_chart_data = Transaksi::select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN 1 ELSE 0 END) as setor_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN 1 ELSE 0 END) as tarik_count'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN jumlah ELSE 0 END) as setor_total'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN jumlah ELSE 0 END) as tarik_total')
            )
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                $monthNum = (int)\Carbon\Carbon::parse($item->month . '-01')->format('m');
                return [
                    'month' => $months[$monthNum - 1],
                    'setor_count' => $item->setor_count,
                    'tarik_count' => $item->tarik_count,
                    'transfer_count' => 0,
                    'setor_total' => $item->setor_total,
                    'tarik_total' => $item->tarik_total,
                    'transfer_total' => 0,
                ];
            });

        // Volume transaction trend data - Last 7 days (same as admin)
        $volume_trend_data = Transaksi::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "setor" THEN jumlah ELSE 0 END) as setor_total'),
                DB::raw('SUM(CASE WHEN jenis_transaksi = "tarik" THEN jumlah ELSE 0 END) as tarik_total')
            )
            ->whereDate('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => \Carbon\Carbon::parse($item->date)->format('d M'),
                    'volume' => $item->setor_total + $item->tarik_total
                ];
            });

        return Inertia::render('teller/Dashboard', [
            'stats' => $stats,
            'recent_transactions' => $recent_transactions,
            'transaction_chart_data' => $transaction_chart_data,
            'weekly_chart_data' => $weekly_chart_data,
            'monthly_chart_data' => $monthly_chart_data,
            'volume_trend_data' => $volume_trend_data,
        ]);
    }
}
