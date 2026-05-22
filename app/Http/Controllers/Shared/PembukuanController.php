<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Response;

use App\Models\Nasabah;

class PembukuanController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->input('type', 'jurnal_umum'); 
        $account = $request->input('account', 'all'); 
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        if ($type === 'laporan_keuangan') {
            return $this->financialReport($request);
        }

        $query = Transaksi::with(['nasabah.user', 'nasabahTujuan.user'])
            ->when($fromDate, fn($q) => $q->whereDate('created_at', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('created_at', '<=', $toDate))
            ->when($type === 'buku_besar', fn($q) => $q->whereNotNull('journal_code'))
            ->latest();

        $transactions = $query->get();
        // Count unposted transactions within the current date filters
        $unpostedCount = Transaksi::whereNull('journal_code')
            ->when($fromDate, fn($q) => $q->whereDate('created_at', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('created_at', '<=', $toDate))
            ->count();

        $entries = $this->formatEntries($transactions, $type, $account);

        if ($request->export === 'pdf' || $request->has('print')) {
            return $this->exportPdf($entries, $type, $account, $fromDate, $toDate);
        }

        if ($request->export === 'excel') {
            return $this->exportExcel($entries, $type, $account, $fromDate, $toDate);
        }

        return Inertia::render('shared/Pembukuan', [
            'entries' => $entries,
            'unpostedCount' => $unpostedCount,
            'filters' => $request->only(['type', 'account', 'from_date', 'to_date']),
            'accounts' => [
                ['id' => '111', 'name' => '111 - Kas'],
                ['id' => '211', 'name' => '211 - Simpanan Nasabah'],
            ]
        ]);
    }

    public function postToLedger(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $unposted = Transaksi::whereNull('journal_code')
            ->when($fromDate, fn($q) => $q->whereDate('created_at', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('created_at', '<=', $toDate))
            ->orderBy('created_at', 'asc')
            ->get();
        
        if ($unposted->isEmpty()) {
            return back()->with('error', 'Tidak ada transaksi dalam filter ini yang belum diposting.');
        }

        // Get last journal number across all time to keep JU-XXXX sequence unique
        $lastJournal = Transaksi::whereNotNull('journal_code')
            ->orderBy('journal_code', 'desc')
            ->first();

        $lastNumber = $lastJournal ? (int) substr($lastJournal->journal_code, 2) : 0;

        foreach ($unposted as $tx) {
            $lastNumber++;
            $tx->update([
                'journal_code' => 'JU' . str_pad($lastNumber, 3, '0', STR_PAD_LEFT),
                'posted_at' => now()
            ]);
        }

        return back()->with('success', count($unposted) . ' transaksi berhasil diposting ke Buku Besar.');
    }

    private function financialReport(Request $request)
    {
        // Assets (Aktiva)
        $totalSetor = Transaksi::where('jenis_transaksi', 'setor')->sum('jumlah');
        $totalTarik = Transaksi::where('jenis_transaksi', 'tarik')->sum('jumlah');
        $kasValue = floatval($totalSetor) - floatval($totalTarik);

        // Liabilities (Passiva)
        $totalSimpananNasabah = Nasabah::sum('saldo');

        // Calculate real revenue and expenses
        $totalAdminFees = Transaksi::where('jenis_transaksi', 'biaya_admin')->sum('jumlah');
        $totalInterest = Transaksi::where('jenis_transaksi', 'bunga')->sum('jumlah');

        $neraca = [
            'assets' => [
                ['code' => '111', 'name' => 'Kas', 'amount' => $kasValue],
            ],
            'liabilities' => [
                ['code' => '211', 'name' => 'Simpanan Nasabah', 'amount' => $totalSimpananNasabah],
            ],
            'equity' => [
                ['code' => '311', 'name' => 'Modal / Laba Ditahan', 'amount' => $kasValue - $totalSimpananNasabah],
            ]
        ];

        $labaRugi = [
            'revenue' => [
                ['code' => '411', 'name' => 'Pendapatan Administrasi', 'amount' => floatval($totalAdminFees)],
            ],
            'expenses' => [
                ['code' => '511', 'name' => 'Beban Bunga', 'amount' => floatval($totalInterest)],
            ]
        ];

        $data = [
            'neraca' => $neraca,
            'laba_rugi' => $labaRugi,
            'date' => date('d/m/Y')
        ];

        if ($request->export === 'pdf' || $request->has('print')) {
            return view('exports.financial_report', [
                'data' => $data,
                'title' => 'Laporan Keuangan',
            ]);
        }

        return Inertia::render('shared/FinancialReport', [
            'data' => $data,
        ]);
    }

    private function formatEntries($transactions, $reportType, $targetAccount)
    {
        $allEntries = [];

        foreach ($transactions as $tx) {
            $date = $tx->created_at->format('d/m/Y');
            $noBukti = $tx->kode_transaksi;
            $amount = floatval($tx->jumlah);
            $journalCode = $tx->journal_code;
            $postedStatus = $journalCode ? 'posted' : 'unposted';

            $entries = [];

            if ($tx->jenis_transaksi === 'setor') {
                $entries[] = ['account' => '111', 'debit' => $amount, 'kredit' => 0, 'desc' => "Setoran Tunai - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                $entries[] = ['account' => '211', 'debit' => 0, 'kredit' => $amount, 'desc' => "Simpanan - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
            } elseif ($tx->jenis_transaksi === 'tarik') {
                $entries[] = ['account' => '211', 'debit' => $amount, 'kredit' => 0, 'desc' => "Penarikan Tunai - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                $entries[] = ['account' => '111', 'debit' => 0, 'kredit' => $amount, 'desc' => "Kas - Tarik Tunai"];
            } elseif ($tx->jenis_transaksi === 'transfer') {
                if (str_ends_with($tx->kode_transaksi, '-S')) {
                    $entries[] = ['account' => '211', 'debit' => $amount, 'kredit' => 0, 'desc' => "Transfer Keluar - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                } elseif (str_ends_with($tx->kode_transaksi, '-R')) {
                    $entries[] = ['account' => '211', 'debit' => 0, 'kredit' => $amount, 'desc' => "Transfer Masuk - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                } else {
                    // Legacy support for unsuffixed codes
                    $entries[] = ['account' => '211', 'debit' => $amount, 'kredit' => 0, 'desc' => "Transfer Keluar - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                    $entries[] = ['account' => '211', 'debit' => 0, 'kredit' => $amount, 'desc' => "Transfer Masuk - " . ($tx->nasabahTujuan?->user?->name ?? 'Unknown')];
                }
            } elseif ($tx->jenis_transaksi === 'bunga') {
                $entries[] = ['account' => '511', 'debit' => $amount, 'kredit' => 0, 'desc' => "Beban Bunga - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                $entries[] = ['account' => '211', 'debit' => 0, 'kredit' => $amount, 'desc' => "Simpanan (Bunga) - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
            } elseif ($tx->jenis_transaksi === 'biaya_admin') {
                $entries[] = ['account' => '211', 'debit' => $amount, 'kredit' => 0, 'desc' => "Biaya Admin - " . ($tx->nasabah?->user?->name ?? 'Unknown')];
                $entries[] = ['account' => '411', 'debit' => 0, 'kredit' => $amount, 'desc' => "Pendapatan Administrasi"];
            }

            // Original Entries
            foreach ($entries as $e) {
                $allEntries[] = [
                    'tanggal' => $date,
                    'no_bukti' => $noBukti,
                    'deskripsi' => $e['desc'],
                    'reff' => ($reportType === 'jurnal_umum') ? ($journalCode ? $e['account'] : null) : $journalCode,
                    'status' => $postedStatus,
                    'account' => $e['account'],
                    'debit' => $e['debit'],
                    'kredit' => $e['kredit'],
                    'created_at' => $tx->created_at
                ];
            }

            // Reversing Entries (Jurnal Pembalik)
            if ($tx->status === 'cancelled') {
                foreach ($entries as $e) {
                    $allEntries[] = [
                        'tanggal' => $date,
                        'no_bukti' => $noBukti,
                        'deskripsi' => "[PEMBALIK] " . $e['desc'],
                        'reff' => ($reportType === 'jurnal_umum') ? ($journalCode ? $e['account'] : null) : $journalCode,
                        'status' => $postedStatus,
                        'account' => $e['account'],
                        'debit' => $e['kredit'], // Swapped
                        'kredit' => $e['debit'], // Swapped
                        'created_at' => $tx->created_at->copy()->addSecond() // Ensure it appears after original
                    ];
                }
            }
        }

        // Filter by account if Books Besar
        if ($reportType === 'buku_besar' && $targetAccount !== 'all') {
            $allEntries = array_filter($allEntries, fn($entry) => $entry['account'] === $targetAccount);
        }

        // Sort by created_at desc (matches latest query)
        usort($allEntries, fn($a, $b) => $b['created_at'] <=> $a['created_at']);

        return array_values($allEntries);
    }

    private function exportPdf($entries, $type, $account, $from, $to)
    {
        $title = $type === 'jurnal_umum' ? 'Laporan Jurnal Umum' : 'Laporan Buku Besar';
        if ($type === 'buku_besar' && $account !== 'all') {
            $accountName = $account === '111' ? 'Kas' : 'Simpanan Nasabah';
            $title .= " - " . $accountName;
        }

        $period = $this->getPeriodString($from, $to);

        return view('exports.pembukuan', [
            'entries' => $entries,
            'title' => $title,
            'period' => $period,
            'totals' => $this->calculateTotals($entries)
        ]);
    }

    private function exportExcel($entries, $type, $account, $from, $to)
    {
        $title = $type === 'jurnal_umum' ? 'Laporan Jurnal Umum' : 'Laporan Buku Besar';
        if ($type === 'buku_besar' && $account !== 'all') {
            $accountName = $account === '111' ? 'Kas' : 'Simpanan Nasabah';
            $title .= " - " . $accountName;
        }
        
        $period = $this->getPeriodString($from, $to);
        $bankName = Setting::get('bank_name', 'Bank Mini');
        $filename = strtolower(str_replace(' ', '_', $title)) . "_" . date('YmdHis') . ".xls";

        $headers = [
            "Content-type"        => "application/vnd.ms-excel",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        return response()->view('exports.pembukuan', [
            'entries' => $entries,
            'title' => $title,
            'period' => $period,
            'isExcel' => true,
            'totals' => $this->calculateTotals($entries)
        ])->withHeaders($headers);
    }

    private function getPeriodString($from, $to)
    {
        if ($from && $to) return "$from s/d $to";
        if ($from) return "Mulai $from";
        if ($to) return "Sampai $to";
        return "Semua Waktu";
    }

    private function calculateTotals($entries)
    {
        return [
            'debit' => array_sum(array_column($entries, 'debit')),
            'kredit' => array_sum(array_column($entries, 'kredit'))
        ];
    }
}
