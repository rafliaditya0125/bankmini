<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $userId = auth()->id();
        $role = auth()->user()->role;

        // Stats - Menggunakan statistik global untuk admin, tapi format disesuaikan dengan teller
        $stats = [
            'transaksi_hari_ini' => (int)Transaksi::whereDate('created_at', today())->count(),
            'total_setor' => (float)Transaksi::where('jenis_transaksi', 'setor')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_tarik' => (float)Transaksi::where('jenis_transaksi', 'tarik')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_transfer' => (float)Transaksi::where('jenis_transaksi', 'transfer')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_bayar' => (float)Transaksi::where('jenis_transaksi', 'bayar')
                ->whereDate('created_at', today())
                ->sum('jumlah'),
            'total_nasabah' => (int)Nasabah::count(),
            'total_saldo' => (float)Nasabah::sum('saldo'),
        ];

        // Recent Transactions
        $recent_transactions = Transaksi::with(['nasabah.user'])
            ->latest()
            ->take(10)
            ->get();

        // Daily transaction data for last 7 days (same as teller)
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
                    'transfer_count' => 0,
                    'setor_total' => $item->setor_total,
                    'tarik_total' => $item->tarik_total,
                    'transfer_total' => 0,
                ];
            });

        // Weekly transaction data for last 4 weeks (same as teller)
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

        // Monthly transaction data for last 12 months (same as teller)
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

        // Volume transaction trend data - Last 7 days (same as teller)
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

        $sharedPayload = [
            'stats' => $stats,
            'recent_transactions' => $recent_transactions,
            'transaction_chart_data' => $transaction_chart_data,
            'weekly_chart_data' => $weekly_chart_data,
            'monthly_chart_data' => $monthly_chart_data,
            'volume_trend_data' => $volume_trend_data,
        ];

        if ($role === 'admin') {
            return Inertia::render('teller/Dashboard', $sharedPayload);
        }

        return Inertia::render('superadmin/Dashboard', $sharedPayload + [
            'recent_nasabah' => Nasabah::with('user')->latest()->take(10)->get(),
            'stats' => [
                'total_nasabah' => (int)Nasabah::count(),
                'total_petugas' => (int)User::whereIn('role', ['admin', 'teller'])->count(),
                'total_transaksi_hari_ini' => (int)$stats['transaksi_hari_ini'],
                'total_saldo' => (float)$stats['total_saldo'],
                'total_setor' => (float)$stats['total_setor'],
                'total_tarik' => (float)$stats['total_tarik'],
                'total_transfer' => (float)$stats['total_transfer'],
                'total_bayar' => (float)$stats['total_bayar'],
            ],
        ]);
    }
}
