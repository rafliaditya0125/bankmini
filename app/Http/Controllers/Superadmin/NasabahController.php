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
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class NasabahController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->getFilteredQuery($request);

        if ($request->input('export') === 'excel') {
            return $this->export($request);
        }

        // Stats summary for saldo BJB & eBank containers
        $stats = [
            'total_saldo' => (float) Nasabah::sum('saldo'),
            'total_saldo_ebank' => (float) Nasabah::where(function ($q) {
                $q->where('bank_type', 'ebank')->orWhereNull('bank_type');
            })->sum('saldo'),
            'total_saldo_bjb' => (float) Nasabah::where('bank_type', 'bjb')->sum('saldo'),
            'count_total' => Nasabah::count(),
            'count_ebank' => Nasabah::where(function ($q) {
                $q->where('bank_type', 'ebank')->orWhereNull('bank_type');
            })->count(),
            'count_bjb' => Nasabah::where('bank_type', 'bjb')->count(),
        ];

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
            'filters' => $request->only(['search', 'status', 'tingkat', 'jurusan_id', 'rombel_id', 'user_type', 'bank_type']),
            'stats' => $stats,
            'available_jurusan' => $available_jurusan,
            'available_rombels' => $available_rombels
        ]);
    }

    private function getFilteredQuery(Request $request)
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

        if ($request->filled('bank_type') && $request->bank_type !== 'all') {
            if ($request->bank_type === 'ebank') {
                $query->where(function ($q) {
                    $q->where('bank_type', 'ebank')
                      ->orWhereNull('bank_type');
                });
            } else {
                $query->where('bank_type', $request->bank_type);
            }
        }

        return $query;
    }

    public function export(Request $request)
    {
        $query = $this->getFilteredQuery($request);
        $nasabahs = $query->latest('updated_at')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Nasabah');

        // Headers
        $headers = [
            'NO',
            'NO. REKENING',
            'TIPE BANK',
            'NAMA NASABAH',
            'TIPE',
            'NIS / NIP',
            'KELAS / ROMBEL',
            'JURUSAN',
            'SALDO',
            'STATUS',
            'TELEPON',
            'ALAMAT',
            'TANGGAL BUKA',
        ];

        $sheet->fromArray($headers, null, 'A1');

        $rowNum = 2;
        $totalSaldo = 0;

        foreach ($nasabahs as $index => $item) {
            $user = $item->user;
            $userType = match ($user?->user_type) {
                'siswa' => 'Siswa',
                'karyawan', 'guru' => 'Karyawan',
                'kelas' => 'Kas Kelas',
                'organisasi' => 'Organisasi',
                'pembayaran' => 'Pembayaran',
                default => ucfirst($user?->user_type ?? 'Lainnya')
            };

            $identifier = $user?->user_type === 'siswa'
                ? ($user?->nis ?: '-')
                : (in_array($user?->user_type, ['karyawan', 'guru']) ? ($user?->nip ?: '-') : ($item->nomor_rekening ?: '-'));

            $rombel = $item->rombelRel;
            $namaKelas = $rombel ? $rombel->nama_kelas : ($item->jurusanRel ? $item->jurusanRel->kode . ' (Tanpa Kelas)' : '-');
            $jurusan = $item->jurusanRel?->nama ?: ($rombel?->jurusan?->nama ?: '-');
            $saldo = (float) $item->saldo;
            $totalSaldo += $saldo;

            $tanggalBuka = $item->tanggal_buka
                ? $item->tanggal_buka->format('d/m/Y')
                : ($item->created_at ? $item->created_at->format('d/m/Y') : '-');

            $sheet->setCellValueExplicit("A{$rowNum}", $index + 1, DataType::TYPE_NUMERIC);
            $sheet->setCellValueExplicit("B{$rowNum}", (string) $item->nomor_rekening, DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("C{$rowNum}", strtoupper($item->bank_type ?? 'EBANK'), DataType::TYPE_STRING);
            $sheet->setCellValue("D{$rowNum}", strtoupper($user?->name ?? '-'));
            $sheet->setCellValue("E{$rowNum}", $userType);
            $sheet->setCellValueExplicit("F{$rowNum}", (string) $identifier, DataType::TYPE_STRING);
            $sheet->setCellValue("G{$rowNum}", $namaKelas);
            $sheet->setCellValue("H{$rowNum}", $jurusan);
            $sheet->setCellValueExplicit("I{$rowNum}", $saldo, DataType::TYPE_NUMERIC);
            $sheet->setCellValue("J{$rowNum}", strtoupper($item->status ?? 'AKTIF'));
            $sheet->setCellValueExplicit("K{$rowNum}", (string) ($user?->phone ?: '-'), DataType::TYPE_STRING);
            $sheet->setCellValue("L{$rowNum}", $item->alamat ?: '-');
            $sheet->setCellValue("M{$rowNum}", $tanggalBuka);

            $rowNum++;
        }

        // Summary row (Total Saldo)
        $lastRow = $rowNum;
        $sheet->setCellValue("A{$lastRow}", 'TOTAL SALDO');
        $sheet->mergeCells("A{$lastRow}:H{$lastRow}");
        $sheet->setCellValueExplicit("I{$lastRow}", $totalSaldo, DataType::TYPE_NUMERIC);

        // Header styling
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 10,
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '059669'], // Emerald 600
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ];
        $sheet->getStyle('A1:M1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(26);

        // Border styling for whole table
        $sheet->getStyle("A1:M{$lastRow}")->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        // Alignments for data
        if ($lastRow > 2) {
            $sheet->getStyle("A2:A" . ($lastRow - 1))->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("B2:C" . ($lastRow - 1))->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("E2:G" . ($lastRow - 1))->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("J2:J" . ($lastRow - 1))->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("M2:M" . ($lastRow - 1))->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        }

        // Format Currency / Numbers for Saldo column
        $sheet->getStyle("I2:I{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("I2:I{$lastRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT);

        // Format text columns to prevent scientific notation in Excel
        $sheet->getStyle("B2:B{$lastRow}")->getNumberFormat()->setFormatCode(\PhpOffice\PhpSpreadsheet\Style\NumberFormat::FORMAT_TEXT);
        $sheet->getStyle("F2:F{$lastRow}")->getNumberFormat()->setFormatCode(\PhpOffice\PhpSpreadsheet\Style\NumberFormat::FORMAT_TEXT);

        // Total row style
        $totalStyle = [
            'font' => [
                'bold' => true,
                'size' => 10,
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2E8F0'], // Slate 200
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ];
        $sheet->getStyle("A{$lastRow}:M{$lastRow}")->applyFromArray($totalStyle);
        $sheet->getStyle("I{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');

        // Auto-fit column widths
        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'data_nasabah_' . date('Ymd_His') . '.xlsx';
        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function show(Nasabah $nasabah)
    {
        if (request()->filled('export') || request()->filled('format')) {
            return $this->exportMutasi(request(), $nasabah);
        }

        $nasabah->load(['user', 'rombelRel.jurusan', 'jurusanRel']);
        $transactions = Transaksi::where('nasabah_id', $nasabah->id)
            ->with('petugas')
            ->latest()
            ->take(10)
            ->get();

        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $now = now($timezone);
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        // Load wallets with their types, default (tabungan utama) first
        $wallets = \App\Models\Wallet::where('nasabah_id', $nasabah->id)
            ->with('walletType')
            ->get()
            ->sortBy(fn($w) => $w->walletType?->is_default ? 0 : 1)
            ->values();

        $enrichedWallets = $wallets->map(function ($wallet) use ($nasabah, $timezone, $startOfMonth, $endOfMonth) {
            $isDefault = (bool) ($wallet->walletType?->is_default ?? false);

            if ($isDefault) {
                // Tabungan Utama: mencakup setor, tarik, transfer, bunga, biaya_admin,
                // serta pembayaran yang dipotong dari tabungan utama milik nasabah ini
                $txList = Transaksi::where('nasabah_id', $nasabah->id)
                    ->with(['petugas', 'nasabah.user', 'nasabahTujuan.user'])
                    ->where(function ($mainQ) use ($wallet) {
                        $mainQ->where(function ($sq) use ($wallet) {
                            $sq->where(function ($ssq) use ($wallet) {
                                $ssq->where('wallet_id', $wallet->id)
                                    ->orWhereNull('wallet_id');
                            })->whereIn('jenis_transaksi', ['setor', 'tarik', 'transfer', 'bunga', 'biaya_admin']);
                        })->orWhere(function ($sq) {
                            $sq->where('jenis_transaksi', 'bayar')
                               ->where('metode_pembayaran', 'potong_tabungan');
                        });
                    })
                    ->orderByRaw('COALESCE(tanggal_transaksi, DATE(created_at)) DESC')
                    ->orderBy('id', 'desc')
                    ->get();
            } else {
                // Kantong Pembayaran tertentu milik nasabah ini
                $txList = Transaksi::where('nasabah_id', $nasabah->id)
                    ->with(['petugas', 'nasabah.user', 'nasabahTujuan.user'])
                    ->where('wallet_id', $wallet->id)
                    ->orderByRaw('COALESCE(tanggal_transaksi, DATE(created_at)) DESC')
                    ->orderBy('id', 'desc')
                    ->get();
            }

            $setoranBulanIni = 0;
            $penarikanBulanIni = 0;

            $mutasi = $txList->map(function ($tx) use ($nasabah, $wallet, $timezone, $isDefault, $startOfMonth, $endOfMonth, &$setoranBulanIni, &$penarikanBulanIni) {
                $timeStr = $tx->created_at ? $tx->created_at->timezone($timezone)->format('H:i:s') : '00:00:00';
                $tanggalFormatted = $tx->tanggal_transaksi 
                    ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->format('d/m/Y') . ' ' . $timeStr
                    : $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');
                $tglOnly = $tx->tanggal_transaksi 
                    ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->toDateString() 
                    : $tx->created_at->timezone($timezone)->toDateString();

                if ($tx->jenis_transaksi === 'tarik' || $tx->jenis_transaksi === 'biaya_admin') {
                    $flow = 'out';
                } elseif ($tx->jenis_transaksi === 'transfer') {
                    $flow = (str_ends_with($tx->kode_transaksi, '-S') || $tx->saldo_sesudah < $tx->saldo_sebelum) ? 'out' : 'in';
                } elseif ($tx->jenis_transaksi === 'bayar') {
                    $flow = $isDefault ? 'out' : 'in';
                } elseif ($tx->saldo_sesudah < $tx->saldo_sebelum) {
                    $flow = 'out';
                } else {
                    $flow = 'in';
                }

                $jenisLabel = match($tx->jenis_transaksi) {
                    'setor' => 'Setor Tunai',
                    'tarik' => 'Penarikan Tunai',
                    'transfer' => str_ends_with($tx->kode_transaksi, '-S') ? 'Transfer Keluar' : (str_ends_with($tx->kode_transaksi, '-R') ? 'Transfer Masuk' : 'Transfer Dana'),
                    'bayar' => $isDefault ? 'Pembayaran (Potong Tabungan)' : 'Pembayaran Masuk',
                    'bunga' => 'Bunga Tabungan',
                    'biaya_admin' => 'Biaya Admin',
                    default => ucfirst(str_replace('_', ' ', $tx->jenis_transaksi)),
                };

                // Hitung total mutasi bulan ini untuk transaksi yang valid (tidak dibatalkan)
                if ($tx->status !== 'cancelled' && $tglOnly >= $startOfMonth && $tglOnly <= $endOfMonth) {
                    if ($flow === 'in') {
                        $setoranBulanIni += (float) $tx->jumlah;
                    } else {
                        $penarikanBulanIni += (float) $tx->jumlah;
                    }
                }

                return [
                    'id' => $tx->id,
                    'kode_transaksi' => $tx->kode_transaksi,
                    'tanggal' => $tanggalFormatted,
                    'tanggal_transaksi' => $tglOnly,
                    'created_at' => $tx->created_at ? $tx->created_at->toISOString() : null,
                    'jenis_transaksi' => $tx->jenis_transaksi,
                    'jenis_label' => $jenisLabel,
                    'metode_pembayaran' => $tx->metode_pembayaran,
                    'flow' => $flow,
                    'jumlah' => (float) $tx->jumlah,
                    'saldo_sebelum' => (float) $tx->saldo_sebelum,
                    'saldo_sesudah' => (float) $tx->saldo_sesudah,
                    'keterangan' => $tx->keterangan ?? '-',
                    'nama_petugas' => $tx->nama_petugas ?? $tx->petugas?->name ?? 'SYSTEM',
                    'status' => $tx->status ?? 'valid',
                    'nasabah' => $tx->nasabah,
                    'nasabah_tujuan' => $tx->nasabahTujuan,
                    'nasabah_name' => $tx->nasabah?->user?->name ?? $nasabah->user?->name ?? '-',
                    'nasabah_norek' => $wallet->wallet_number ?? $nasabah->nomor_rekening ?? '-',
                    'penerima_name' => $tx->nasabahTujuan?->user?->name ?? '',
                    'penerima_norek' => $tx->nasabahTujuan?->nomor_rekening ?? '',
                ];
            });

            $saldoSaatIni = (float) $wallet->balance;
            $saldoBulanLalu = max(0, $saldoSaatIni - $setoranBulanIni + $penarikanBulanIni);

            $walletData = $wallet->toArray();
            $walletData['stats'] = [
                'saldo_bulan_lalu' => $saldoBulanLalu,
                'setoran_bulan_ini' => $setoranBulanIni,
                'penarikan_bulan_ini' => $penarikanBulanIni,
                'saldo_saat_ini' => $saldoSaatIni,
            ];
            $walletData['mutasi'] = $mutasi->values()->all();

            return $walletData;
        });

        $totalSaldo = $wallets->sum(fn($w) => (float) $w->balance);

        return Inertia::render('superadmin/nasabah/Show', [
            'nasabah' => $nasabah,
            'transactions' => $transactions,
            'jurusans' => Jurusan::orderBy('nama')->get(),
            'wallets' => $enrichedWallets,
            'total_saldo' => $totalSaldo,
        ]);
    }

    public function exportMutasi(Request $request, Nasabah $nasabah)
    {
        $nasabah->load(['user', 'rombelRel.jurusan', 'jurusanRel']);

        $walletId = $request->input('wallet_id');
        $format = strtolower($request->input('format', $request->input('export', 'excel')));

        $wallet = null;
        if ($walletId) {
            $wallet = \App\Models\Wallet::where('nasabah_id', $nasabah->id)
                ->with('walletType')
                ->find($walletId);
        }

        if (!$wallet) {
            $wallet = \App\Models\Wallet::where('nasabah_id', $nasabah->id)
                ->with('walletType')
                ->get()
                ->sortBy(fn($w) => $w->walletType?->is_default ? 0 : 1)
                ->first();
        }

        $isDefault = (bool) ($wallet?->walletType?->is_default ?? true);

        if ($isDefault) {
            $txList = Transaksi::where('nasabah_id', $nasabah->id)
                ->with(['petugas', 'nasabah.user', 'nasabahTujuan.user'])
                ->where(function ($mainQ) use ($wallet) {
                    $mainQ->where(function ($sq) use ($wallet) {
                        $sq->where(function ($ssq) use ($wallet) {
                            if ($wallet) {
                                $ssq->where('wallet_id', $wallet->id)
                                    ->orWhereNull('wallet_id');
                            } else {
                                $ssq->whereNull('wallet_id');
                            }
                        })->whereIn('jenis_transaksi', ['setor', 'tarik', 'transfer', 'bunga', 'biaya_admin']);
                    })->orWhere(function ($sq) {
                        $sq->where('jenis_transaksi', 'bayar')
                           ->where('metode_pembayaran', 'potong_tabungan');
                    });
                })
                ->orderByRaw('COALESCE(tanggal_transaksi, DATE(created_at)) DESC')
                ->orderBy('id', 'desc')
                ->get();
        } else {
            $txList = Transaksi::where('nasabah_id', $nasabah->id)
                ->with(['petugas', 'nasabah.user', 'nasabahTujuan.user'])
                ->where('wallet_id', $wallet->id)
                ->orderByRaw('COALESCE(tanggal_transaksi, DATE(created_at)) DESC')
                ->orderBy('id', 'desc')
                ->get();
        }

        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $now = now($timezone);
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        $setoranBulanIni = 0;
        $penarikanBulanIni = 0;

        $mutasi = $txList->map(function ($tx) use ($timezone, $isDefault, $startOfMonth, $endOfMonth, &$setoranBulanIni, &$penarikanBulanIni) {
            $timeStr = $tx->created_at ? $tx->created_at->timezone($timezone)->format('H:i:s') : '00:00:00';
            $tanggalFormatted = $tx->tanggal_transaksi 
                ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->format('d/m/Y') . ' ' . $timeStr
                : $tx->created_at->timezone($timezone)->format('d/m/Y H:i:s');
            $tglOnly = $tx->tanggal_transaksi 
                ? \Carbon\Carbon::parse($tx->tanggal_transaksi)->toDateString() 
                : $tx->created_at->timezone($timezone)->toDateString();

            if ($tx->jenis_transaksi === 'tarik' || $tx->jenis_transaksi === 'biaya_admin') {
                $flow = 'out';
            } elseif ($tx->jenis_transaksi === 'transfer') {
                $flow = (str_ends_with($tx->kode_transaksi, '-S') || $tx->saldo_sesudah < $tx->saldo_sebelum) ? 'out' : 'in';
            } elseif ($tx->jenis_transaksi === 'bayar') {
                $flow = $isDefault ? 'out' : 'in';
            } elseif ($tx->saldo_sesudah < $tx->saldo_sebelum) {
                $flow = 'out';
            } else {
                $flow = 'in';
            }

            $jenisLabel = match($tx->jenis_transaksi) {
                'setor' => 'Setor Tunai',
                'tarik' => 'Penarikan Tunai',
                'transfer' => str_ends_with($tx->kode_transaksi, '-S') ? 'Transfer Keluar' : (str_ends_with($tx->kode_transaksi, '-R') ? 'Transfer Masuk' : 'Transfer Dana'),
                'bayar' => $isDefault ? 'Pembayaran (Potong Tabungan)' : 'Pembayaran Masuk',
                'bunga' => 'Bunga Tabungan',
                'biaya_admin' => 'Biaya Admin',
                default => ucfirst(str_replace('_', ' ', $tx->jenis_transaksi)),
            };

            if ($tx->status !== 'cancelled' && $tglOnly >= $startOfMonth && $tglOnly <= $endOfMonth) {
                if ($flow === 'in') {
                    $setoranBulanIni += (float) $tx->jumlah;
                } else {
                    $penarikanBulanIni += (float) $tx->jumlah;
                }
            }

            return (object) [
                'id' => $tx->id,
                'kode_transaksi' => $tx->kode_transaksi,
                'tanggal' => $tanggalFormatted,
                'tanggal_transaksi' => $tglOnly,
                'jenis_transaksi' => $tx->jenis_transaksi,
                'jenis_label' => $jenisLabel,
                'flow' => $flow,
                'jumlah' => (float) $tx->jumlah,
                'saldo_sebelum' => (float) $tx->saldo_sebelum,
                'saldo_sesudah' => (float) $tx->saldo_sesudah,
                'keterangan' => $tx->keterangan ?? '-',
                'nama_petugas' => $tx->nama_petugas ?? $tx->petugas?->name ?? 'SYSTEM',
                'status' => $tx->status ?? 'valid',
            ];
        });

        $saldoSaatIni = (float) ($wallet?->balance ?? 0);
        $saldoBulanLalu = max(0, $saldoSaatIni - $setoranBulanIni + $penarikanBulanIni);

        $stats = [
            'saldo_bulan_lalu' => $saldoBulanLalu,
            'setoran_bulan_ini' => $setoranBulanIni,
            'penarikan_bulan_ini' => $penarikanBulanIni,
            'saldo_saat_ini' => $saldoSaatIni,
        ];

        if ($format === 'pdf') {
            return view('exports.mutasi_wallet', [
                'nasabah' => $nasabah,
                'wallet' => $wallet,
                'mutasi' => $mutasi,
                'stats' => $stats,
                'title' => 'Mutasi Rekening ' . ($wallet?->walletType?->name ?? 'Tabungan') . ' - ' . ($nasabah->user?->name ?? ''),
            ]);
        }

        return $this->exportMutasiExcel($nasabah, $wallet, $mutasi, $stats);
    }

    private function exportMutasiExcel(Nasabah $nasabah, $wallet, $mutasi, array $stats)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Mutasi Rekening');

        $bankName = \App\Models\Setting::get('bank_name', 'BANK MINI');
        $walletName = $wallet?->walletType?->name ?? 'Tabungan Utama';
        $walletNumber = $wallet?->wallet_number ?? $nasabah->nomor_rekening;

        // Title Header
        $sheet->setCellValue('A1', strtoupper($bankName) . ' - LAPORAN MUTASI KANTONG REKENING');
        $sheet->mergeCells('A1:J1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('059669'));
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', 'Dicetak pada: ' . date('d/m/Y H:i') . ' WIB');
        $sheet->mergeCells('A2:J2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('64748B'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Nasabah & Wallet Meta
        $sheet->setCellValue('A4', 'Nama Nasabah');
        $sheet->setCellValue('B4', ': ' . strtoupper($nasabah->user?->name ?? '-'));
        $sheet->setCellValue('A5', 'No. Rekening');
        $sheet->setCellValueExplicit('B5', ': ' . $nasabah->nomor_rekening, DataType::TYPE_STRING);
        $sheet->setCellValue('A6', 'Identitas (NIS/NIP)');
        $sheet->setCellValueExplicit('B6', ': ' . ($nasabah->user?->nis ?? $nasabah->user?->nip ?? '-'), DataType::TYPE_STRING);
        $sheet->setCellValue('A7', 'Kelas / Jurusan');
        $sheet->setCellValue('B7', ': ' . ($nasabah->kelas ?? '-') . ($nasabah->jurusanRel ? ' / ' . $nasabah->jurusanRel->kode : ''));

        $sheet->setCellValue('E4', 'Jenis Kantong');
        $sheet->setCellValue('F4', ': ' . strtoupper($walletName));
        $sheet->setCellValue('E5', 'No. Kantong');
        $sheet->setCellValueExplicit('F5', ': ' . $walletNumber, DataType::TYPE_STRING);
        $sheet->setCellValue('E6', 'Status Kantong');
        $sheet->setCellValue('F6', ': ' . strtoupper($wallet?->status ?? 'AKTIF'));

        // Box Ringkasan Statistik
        $sheet->setCellValue('H4', 'Saldo Bulan Lalu');
        $sheet->setCellValueExplicit('I4', $stats['saldo_bulan_lalu'], DataType::TYPE_NUMERIC);
        $sheet->setCellValue('H5', 'Setoran Bulan Ini');
        $sheet->setCellValueExplicit('I5', $stats['setoran_bulan_ini'], DataType::TYPE_NUMERIC);
        $sheet->setCellValue('H6', 'Penarikan Bulan Ini');
        $sheet->setCellValueExplicit('I6', $stats['penarikan_bulan_ini'], DataType::TYPE_NUMERIC);
        $sheet->setCellValue('H7', 'Saldo Saat Ini');
        $sheet->setCellValueExplicit('I7', $stats['saldo_saat_ini'], DataType::TYPE_NUMERIC);

        $sheet->getStyle('I4:I7')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('A4:A7')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('E4:E7')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('H4:H7')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('I7')->getFont()->setBold(true);

        // Styling Box Ringkasan
        $sheet->getStyle('H4:I7')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('F8FAFC');
        $sheet->getStyle('H4:I7')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        // Table Header
        $tableStartRow = 9;
        $headers = [
            'A' => 'NO',
            'B' => 'WAKTU',
            'C' => 'KODE TRANSAKSI',
            'D' => 'JENIS TRANSAKSI',
            'E' => 'KETERANGAN',
            'F' => 'PETUGAS',
            'G' => 'MUTASI MASUK (KREDIT)',
            'H' => 'MUTASI KELUAR (DEBIT)',
            'I' => 'SALDO AKHIR',
            'J' => 'STATUS',
        ];

        foreach ($headers as $col => $title) {
            $sheet->setCellValue("{$col}{$tableStartRow}", $title);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 9,
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '059669'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ];
        $sheet->getStyle("A{$tableStartRow}:J{$tableStartRow}")->applyFromArray($headerStyle);
        $sheet->getRowDimension($tableStartRow)->setRowHeight(24);

        $rowNum = $tableStartRow + 1;
        $totalIn = 0;
        $totalOut = 0;

        foreach ($mutasi as $index => $item) {
            $isFlowIn = $item->flow === 'in';
            $masuk = $isFlowIn ? $item->jumlah : 0;
            $keluar = !$isFlowIn ? $item->jumlah : 0;

            if ($item->status !== 'cancelled') {
                $totalIn += $masuk;
                $totalOut += $keluar;
            }

            $sheet->setCellValueExplicit("A{$rowNum}", $index + 1, DataType::TYPE_NUMERIC);
            $sheet->setCellValue("B{$rowNum}", $item->tanggal);
            $sheet->setCellValueExplicit("C{$rowNum}", $item->kode_transaksi, DataType::TYPE_STRING);
            $sheet->setCellValue("D{$rowNum}", $item->jenis_label);
            $sheet->setCellValue("E{$rowNum}", $item->keterangan);
            $sheet->setCellValue("F{$rowNum}", strtoupper($item->nama_petugas));
            $sheet->setCellValueExplicit("G{$rowNum}", $masuk > 0 ? $masuk : 0, DataType::TYPE_NUMERIC);
            $sheet->setCellValueExplicit("H{$rowNum}", $keluar > 0 ? $keluar : 0, DataType::TYPE_NUMERIC);
            $sheet->setCellValueExplicit("I{$rowNum}", $item->saldo_sesudah, DataType::TYPE_NUMERIC);
            $sheet->setCellValue("J{$rowNum}", strtoupper($item->status));

            $rowNum++;
        }

        $lastDataRow = $rowNum - 1;

        // Total row
        $sheet->setCellValue("A{$rowNum}", 'TOTAL');
        $sheet->mergeCells("A{$rowNum}:F{$rowNum}");
        $sheet->setCellValueExplicit("G{$rowNum}", $totalIn, DataType::TYPE_NUMERIC);
        $sheet->setCellValueExplicit("H{$rowNum}", $totalOut, DataType::TYPE_NUMERIC);
        $sheet->setCellValueExplicit("I{$rowNum}", $stats['saldo_saat_ini'], DataType::TYPE_NUMERIC);
        $sheet->setCellValue("J{$rowNum}", '');

        $totalStyle = [
            'font' => ['bold' => true, 'size' => 10],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2E8F0'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ];
        $sheet->getStyle("A{$rowNum}:J{$rowNum}")->applyFromArray($totalStyle);

        // Borders
        $sheet->getStyle("A{$tableStartRow}:J{$rowNum}")->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        // Number Formatting
        $sheet->getStyle("G" . ($tableStartRow + 1) . ":I{$rowNum}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("G" . ($tableStartRow + 1) . ":I{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT);

        // Alignments
        if ($lastDataRow >= ($tableStartRow + 1)) {
            $sheet->getStyle("A" . ($tableStartRow + 1) . ":A{$lastDataRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("B" . ($tableStartRow + 1) . ":C{$lastDataRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("J" . ($tableStartRow + 1) . ":J{$lastDataRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        }

        // Auto-fit column widths
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $cleanNorek = preg_replace('/[^A-Za-z0-9]/', '', $walletNumber);
        $filename = "mutasi_{$cleanNorek}_" . date('Ymd_His') . ".xlsx";
        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
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
            'bank_type' => 'nullable|in:ebank,bjb',
            'phone' => 'nullable|string|max:20',
            'user_type' => 'required|in:siswa,kelas,organisasi,karyawan,guru',
            'nis' => 'required_if:user_type,siswa|nullable|string|max:20|regex:/^[0-9]+$/|unique:users,nis',
            'nip' => 'required_if:user_type,karyawan,guru|nullable|string|max:30|regex:/^[0-9]+$/|unique:users,nip',
            'jurusan_id' => 'required_if:user_type,siswa,kelas|nullable|exists:jurusans,id',
            'rombel_id' => 'required_if:user_type,siswa,kelas|nullable|exists:rombels,id',
            'alamat' => 'nullable|string|max:255',
            'saldo_awal' => 'required_unless:user_type,karyawan,guru|nullable|numeric|max:999999999999999|min:0',
        ]);

        $userType = $request->user_type === 'guru' ? 'karyawan' : $request->user_type;
        $isStudentType = in_array($userType, ['siswa', 'kelas'], true);
        $isKaryawan = in_array($userType, ['karyawan', 'guru'], true);
        
        $nis = $userType === 'siswa' ? $request->nis : null;
        $nip = $isKaryawan ? $request->nip : null;
        $rombelId = $isStudentType ? $request->rombel_id : null;
        $saldoAwal = $isKaryawan ? 0 : ($request->saldo_awal ?? 0);
        $bankType = $request->input('bank_type', 'ebank') ?: 'ebank';

        DB::transaction(function () use ($request, $userType, $nis, $nip, $rombelId, $saldoAwal, $isStudentType, $bankType) {
            $loginIdentifier = match ($userType) {
                'siswa' => $nis,
                'karyawan', 'guru' => $nip,
                default => $request->nomor_rekening,
            };

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'username' => $loginIdentifier,
                'password' => $loginIdentifier,
                'role' => 'nasabah',
                'phone' => $request->phone,
                'user_type' => $userType,
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
                'bank_type' => $bankType,
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
            'bank_type' => 'nullable|in:ebank,bjb',
            'user_type' => 'required|in:siswa,kelas,organisasi,karyawan,guru,pembayaran',
            'nis' => 'required_if:user_type,siswa|nullable|string|max:20|regex:/^[0-9]+$/|unique:users,nis,' . $nasabah->user_id,
            'nip' => 'required_if:user_type,karyawan,guru|nullable|string|max:30|regex:/^[0-9]+$/|unique:users,nip,' . $nasabah->user_id,
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

        $userType = $request->user_type === 'guru' ? 'karyawan' : $request->user_type;
        $isStudentType = in_array($userType, ['siswa', 'kelas'], true);
        $isKaryawan = in_array($userType, ['karyawan', 'guru'], true);

        $nis = $userType === 'siswa' ? $request->nis : null;
        $nip = $isKaryawan ? $request->nip : null;
        $rombelId = $isStudentType ? $request->rombel_id : null;

        DB::transaction(function () use ($request, $userType, $nasabah, $nis, $nip, $rombelId, $isStudentType) {
            $loginIdentifier = match ($userType) {
                'siswa' => $nis,
                'karyawan', 'guru' => $nip,
                default => $request->nomor_rekening,
            };

            $userData = [
                'name' => $request->name,
                'email' => $request->email,
                'nis' => $nis,
                'nip' => $nip,
                'username' => $loginIdentifier,
                'phone' => $request->phone,
                'user_type' => $userType,
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
                'bank_type' => $request->input('bank_type', $nasabah->bank_type ?? 'ebank') ?: 'ebank',
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
            'scope'                => 'required|in:all,jurusan,rombel',
            'jurusan_id'           => 'required_if:scope,jurusan|nullable|exists:jurusans,id',
            'rombel_id'            => 'required_if:scope,rombel|nullable|exists:rombels,id',
            'kelas_asal'           => 'nullable|in:all,10,11,12',
            'exclude_jurusan_ids'  => 'nullable|array',
            'exclude_jurusan_ids.*'=> 'exists:jurusans,id',
            'exclude_rombel_ids'   => 'nullable|array',
            'exclude_rombel_ids.*' => 'exists:rombels,id',
            'exclude_nasabah_ids'  => 'nullable|array',
            'exclude_nasabah_ids.*'=> 'exists:nasabah,id',
        ]);

        $query = Nasabah::with(['user', 'rombelRel.jurusan', 'jurusanRel'])
            ->whereHas('user', function ($q) {
                $q->where('user_type', 'siswa');
            })
            ->whereNull('tanggal_lulus')
            ->whereHas('rombelRel');

        // Scope filter
        if ($request->scope === 'jurusan' && $request->filled('jurusan_id')) {
            $query->where('jurusan_id', $request->jurusan_id);
        } elseif ($request->scope === 'rombel' && $request->filled('rombel_id')) {
            $query->where('rombel_id', $request->rombel_id);
        }

        // Kelas asal (tingkat) filter
        if ($request->filled('kelas_asal') && in_array($request->kelas_asal, ['10', '11', '12'])) {
            $query->whereHas('rombelRel', function ($q) use ($request) {
                $q->where('tingkat', $request->kelas_asal);
            });
        }

        // Exclusions
        if ($request->filled('exclude_jurusan_ids') && is_array($request->exclude_jurusan_ids) && !empty($request->exclude_jurusan_ids)) {
            $query->whereNotIn('jurusan_id', $request->exclude_jurusan_ids);
        }

        if ($request->filled('exclude_rombel_ids') && is_array($request->exclude_rombel_ids) && !empty($request->exclude_rombel_ids)) {
            $query->whereNotIn('rombel_id', $request->exclude_rombel_ids);
        }

        if ($request->filled('exclude_nasabah_ids') && is_array($request->exclude_nasabah_ids) && !empty($request->exclude_nasabah_ids)) {
            $query->whereNotIn('id', $request->exclude_nasabah_ids);
        }

        $nasabahs = $query->get();

        if ($nasabahs->isEmpty()) {
            return back()->with('error', 'Tidak ada nasabah siswa yang memenuhi kriteria kenaikan kelas.');
        }

        $promotedCount = 0;
        $graduatedCount = 0;

        DB::transaction(function () use ($nasabahs, &$promotedCount, &$graduatedCount, $request) {
            foreach ($nasabahs as $nasabah) {
                $oldRombel = $nasabah->rombelRel;
                $currentTingkat = (string)($oldRombel ? $oldRombel->tingkat : 10);

                $newTingkat = match ($currentTingkat) {
                    '10' => '11',
                    '11' => '12',
                    '12' => 'Alumni',
                    default => $currentTingkat
                };

                if ($newTingkat === 'Alumni') {
                    $nasabah->update(['tanggal_lulus' => now()]);
                    $graduatedCount++;
                } else {
                    $targetRombel = null;
                    $expectedName = null;
                    if ($oldRombel) {
                        $expectedName = preg_replace('/^' . preg_quote((string)$currentTingkat, '/') . '\b/', $newTingkat, $oldRombel->nama);
                        $targetRombel = Rombel::where('jurusan_id', $nasabah->jurusan_id)
                            ->where('tingkat', $newTingkat)
                            ->where('nama', $expectedName)
                            ->first();
                    }

                    if (!$targetRombel) {
                        $targetRombel = Rombel::where('jurusan_id', $nasabah->jurusan_id)
                            ->where('tingkat', $newTingkat)
                            ->first();
                    }

                    if (!$targetRombel) {
                        $jurusan = $nasabah->jurusanRel ?? Jurusan::find($nasabah->jurusan_id);
                        $jurusanKode = $jurusan?->kode ?? 'KLS';
                        $namaRombel = ($oldRombel && !empty($expectedName)) ? $expectedName : "{$newTingkat} {$jurusanKode}";
                        $targetRombel = Rombel::create([
                            'jurusan_id'   => $nasabah->jurusan_id,
                            'tingkat'      => (int)$newTingkat,
                            'nama'         => $namaRombel,
                            'tahun_ajaran' => date('Y') . '/' . (date('Y') + 1),
                        ]);
                    }

                    $nasabah->update(['rombel_id' => $targetRombel->id]);
                    $promotedCount++;
                }
            }

            $scopeDesc = match ($request->scope) {
                'jurusan' => "jurusan ID {$request->jurusan_id}",
                'rombel'  => "rombel ID {$request->rombel_id}",
                default   => 'seluruh angkatan/sekolah'
            };

            AuditTrail::log(
                "Naik kelas batch ({$scopeDesc}): {$promotedCount} siswa naik kelas, {$graduatedCount} siswa lulus/alumni",
                'Nasabah'
            );
        });

        $messages = [];
        if ($promotedCount > 0) $messages[] = "{$promotedCount} siswa berhasil naik kelas";
        if ($graduatedCount > 0) $messages[] = "{$graduatedCount} siswa kelas 12 berhasil lulus (alumni)";

        $excludedSummary = [];
        if (!empty($request->exclude_jurusan_ids)) $excludedSummary[] = count($request->exclude_jurusan_ids) . " jurusan dikecualikan";
        if (!empty($request->exclude_rombel_ids)) $excludedSummary[] = count($request->exclude_rombel_ids) . " kelas dikecualikan";
        if (!empty($request->exclude_nasabah_ids)) $excludedSummary[] = count($request->exclude_nasabah_ids) . " siswa dikecualikan";

        $fullMsg = "Proses selesai: " . implode(' & ', $messages) . ".";
        if (!empty($excludedSummary)) {
            $fullMsg .= " (" . implode(', ', $excludedSummary) . ")";
        }

        return back()->with('success', $fullMsg);
    }

    public function import(Request $request)
    {
        @set_time_limit(180);

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
                $rawCandidates = [];

                foreach ($uploadedFiles as $file) {
                    $reader = IOFactory::createReaderForFile($file->getRealPath());
                    $reader->setReadDataOnly(true);
                    $spreadsheet = $reader->load($file->getRealPath());
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

                    $headerMap = array_flip($header);
                    $colName = $headerMap['name'] ?? $headerMap['nama'] ?? 0;
                    $colId = $headerMap['nis_or_nip'] ?? $headerMap['nis'] ?? $headerMap['nip'] ?? $headerMap['identifier'] ?? 1;
                    $colNorek = $headerMap['norek'] ?? $headerMap['nomor_rekening'] ?? 2;
                    $colUserType = $headerMap['user_type'] ?? $headerMap['tipe_pengguna'] ?? 3;
                    $colBankType = $headerMap['bank_type'] ?? $headerMap['tipe_bank'] ?? null;
                    $colRombel = $headerMap['rombel_id'] ?? $headerMap['rombel'] ?? ($colBankType !== null ? 5 : 4);
                    $colPhone = $headerMap['phone'] ?? $headerMap['no_hp'] ?? $headerMap['telepon'] ?? ($colBankType !== null ? 6 : 5);
                    $colAlamat = $headerMap['alamat'] ?? ($colBankType !== null ? 7 : 6);
                    $colSaldo = $headerMap['saldo_awal'] ?? $headerMap['saldo'] ?? ($colBankType !== null ? 8 : 7);

                    // Remove header
                    array_shift($rows);

                    foreach ($rows as $index => $data) {
                        $rowNum = $index + 2;

                        // Check if row is completely empty
                        if (empty(array_filter($data, fn($v) => $v !== null && trim((string)$v) !== ''))) {
                            continue;
                        }

                        $name       = isset($data[$colName]) ? trim((string)$data[$colName]) : '';
                        $identifier = isset($data[$colId]) ? trim((string)$data[$colId]) : '';
                        $norekInput = isset($data[$colNorek]) && trim((string)$data[$colNorek]) !== '' ? trim((string)$data[$colNorek]) : null;
                        $user_type  = isset($data[$colUserType]) && trim((string)$data[$colUserType]) !== '' ? strtolower(trim((string)$data[$colUserType])) : 'siswa';
                        $bank_type  = 'ebank';
                        if ($colBankType !== null && isset($data[$colBankType])) {
                            $rawBankType = strtolower(trim((string)$data[$colBankType]));
                            if (in_array($rawBankType, ['bjb', 'ebank'])) {
                                $bank_type = $rawBankType;
                            }
                        }
                        $rombelId   = isset($data[$colRombel]) && trim((string)$data[$colRombel]) !== '' ? trim((string)$data[$colRombel]) : null;
                        $phone      = isset($data[$colPhone]) && trim((string)$data[$colPhone]) !== '' ? trim((string)$data[$colPhone]) : null;
                        $alamat     = isset($data[$colAlamat]) && trim((string)$data[$colAlamat]) !== '' ? trim((string)$data[$colAlamat]) : null;
                        $saldo_awal = isset($data[$colSaldo]) && is_numeric($data[$colSaldo]) ? (float)$data[$colSaldo] : 0;

                        if (empty($name) || empty($identifier)) {
                            $failedCount++;
                            $errors[] = "Baris {$rowNum}: Kolom Nama atau NIS/NIP tidak boleh kosong";
                            continue;
                        }

                        $norek = $norekInput ?: $identifier;
                        $nis   = $user_type === 'siswa' ? $identifier : null;
                        $nip   = in_array($user_type, ['karyawan', 'guru'], true) ? $identifier : null;
                        $validUserType = in_array($user_type, ['siswa', 'karyawan', 'guru', 'kelas', 'organisasi', 'pembayaran'])
                            ? ($user_type === 'guru' ? 'karyawan' : $user_type)
                            : 'siswa';

                        $rawCandidates[] = [
                            'rowNum'     => $rowNum,
                            'name'       => $name,
                            'identifier' => $identifier,
                            'norek'      => $norek,
                            'user_type'  => $validUserType,
                            'bank_type'  => $bank_type,
                            'nis'        => $nis,
                            'nip'        => $nip,
                            'rombel_raw' => $rombelId,
                            'phone'      => $phone,
                            'alamat'     => $alamat,
                            'saldo_awal' => $saldo_awal,
                        ];
                    }
                }

                if (empty($rawCandidates)) {
                    return;
                }

                // In-file duplicate detection
                $fileSeenIdentifiers = [];
                $fileSeenNoreks      = [];
                $uniqueCandidates    = [];

                foreach ($rawCandidates as $item) {
                    $idKey    = $item['identifier'];
                    $norekKey = $item['norek'];

                    if (isset($fileSeenIdentifiers[$idKey])) {
                        $failedCount++;
                        $errors[] = "Baris {$item['rowNum']}: NIS/NIP '{$idKey}' duplikat di dalam berkas Excel";
                        continue;
                    }
                    if (isset($fileSeenNoreks[$norekKey])) {
                        $failedCount++;
                        $errors[] = "Baris {$item['rowNum']}: Nomor rekening '{$norekKey}' duplikat di dalam berkas Excel";
                        continue;
                    }

                    $fileSeenIdentifiers[$idKey] = true;
                    $fileSeenNoreks[$norekKey]   = true;
                    $uniqueCandidates[]          = $item;
                }

                if (empty($uniqueCandidates)) {
                    return;
                }

                // --- BULK SELECTS (3 Queries) ---

                // 1. Bulk Select Existing Users
                $existingUserIdentifiers = [];
                $identifiers = array_keys($fileSeenIdentifiers);
                $existingUsers = User::whereIn('username', $identifiers)
                    ->orWhereIn('nis', $identifiers)
                    ->orWhereIn('nip', $identifiers)
                    ->get(['username', 'nis', 'nip']);
                foreach ($existingUsers as $u) {
                    if ($u->username) $existingUserIdentifiers[$u->username] = true;
                    if ($u->nis)      $existingUserIdentifiers[$u->nis]      = true;
                    if ($u->nip)      $existingUserIdentifiers[$u->nip]      = true;
                }

                // 2. Bulk Select Existing Nasabah Norek
                $existingNoreks = Nasabah::whereIn('nomor_rekening', array_keys($fileSeenNoreks))
                    ->pluck('nomor_rekening')
                    ->flip()
                    ->toArray();

                // 3. Bulk Select Referenced Rombels
                $numericRombelIds  = [];
                $stringRombelNames = [];
                foreach ($uniqueCandidates as $c) {
                    if (!empty($c['rombel_raw'])) {
                        if (is_numeric($c['rombel_raw'])) {
                            $numericRombelIds[] = (int)$c['rombel_raw'];
                        } else {
                            $stringRombelNames[] = $c['rombel_raw'];
                        }
                    }
                }
                $numericRombelIds  = array_unique($numericRombelIds);
                $stringRombelNames = array_unique($stringRombelNames);

                $rombels = collect();
                if (!empty($numericRombelIds) || !empty($stringRombelNames)) {
                    $rombelQuery = Rombel::query();
                    if (!empty($numericRombelIds) && !empty($stringRombelNames)) {
                        $rombelQuery->where(function ($q) use ($numericRombelIds, $stringRombelNames) {
                            $q->whereIn('id', $numericRombelIds)
                              ->orWhereIn('nama', $stringRombelNames);
                        });
                    } elseif (!empty($numericRombelIds)) {
                        $rombelQuery->whereIn('id', $numericRombelIds);
                    } else {
                        $rombelQuery->whereIn('nama', $stringRombelNames);
                    }
                    $rombels = $rombelQuery->get(['id', 'nama', 'jurusan_id']);
                }
                $rombelById   = $rombels->keyBy('id');
                $rombelByNama = $rombels->keyBy('nama');

                // --- IN-MEMORY FILTERING & DATA PREPARATION ---
                $now                 = now();
                $usersToInsert       = [];
                $validCandidates     = [];
                $hashedPasswordCache = [];

                foreach ($uniqueCandidates as $c) {
                    if (isset($existingUserIdentifiers[$c['identifier']])) {
                        $failedCount++;
                        $errors[] = "Baris {$c['rowNum']}: NIS/NIP '{$c['identifier']}' sudah terdaftar";
                        continue;
                    }

                    if (isset($existingNoreks[$c['norek']])) {
                        $failedCount++;
                        $errors[] = "Baris {$c['rowNum']}: Nomor rekening '{$c['norek']}' sudah digunakan";
                        continue;
                    }

                    // Resolve rombel & jurusan (fallback null if not found)
                    $validRombelId = null;
                    $jurusanId     = null;
                    if (!empty($c['rombel_raw'])) {
                        $r = is_numeric($c['rombel_raw'])
                            ? ($rombelById[(int)$c['rombel_raw']] ?? null)
                            : ($rombelByNama[$c['rombel_raw']] ?? null);

                        if ($r) {
                            $validRombelId = $r->id;
                            $jurusanId     = $r->jurusan_id;
                        }
                    }

                    $pwd = $c['identifier'];
                    if (!isset($hashedPasswordCache[$pwd])) {
                        // Use rounds=4 for fast bulk import (2ms vs 350ms per user); Laravel rehashes automatically upon login if needed
                        $hashedPasswordCache[$pwd] = Hash::make($pwd, ['rounds' => 4]);
                    }

                    $usersToInsert[] = [
                        'name'       => $c['name'],
                        'username'   => $c['identifier'],
                        'email'      => $c['identifier'] . '@bankmini.smk',
                        'password'   => $hashedPasswordCache[$pwd],
                        'role'       => 'nasabah',
                        'phone'      => $c['phone'],
                        'user_type'  => $c['user_type'],
                        'nis'        => $c['nis'],
                        'nip'        => $c['nip'],
                        'status'     => 'active',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    $validCandidates[] = [
                        'identifier' => $c['identifier'],
                        'norek'      => $c['norek'],
                        'bank_type'  => $c['bank_type'] ?? 'ebank',
                        'saldo_awal' => $c['saldo_awal'],
                        'jurusan_id' => $jurusanId,
                        'rombel_id'  => $validRombelId,
                        'alamat'     => $c['alamat'],
                    ];
                }

                // --- BULK INSERTS (Users & Nasabah) ---
                if (!empty($usersToInsert)) {
                    // Bulk insert Users
                    foreach (array_chunk($usersToInsert, 500) as $chunk) {
                        User::insert($chunk);
                    }

                    // Fetch newly inserted user IDs by username (1 Query)
                    $insertedUserMap = User::whereIn('username', array_column($validCandidates, 'identifier'))
                        ->pluck('id', 'username')
                        ->toArray();

                    // Prepare Nasabah rows
                    $nasabahToInsert = [];
                    foreach ($validCandidates as $vc) {
                        $userId = $insertedUserMap[$vc['identifier']] ?? null;
                        if (!$userId) continue;

                        $nasabahToInsert[] = [
                            'user_id'        => $userId,
                            'nomor_rekening' => $vc['norek'],
                            'bank_type'      => $vc['bank_type'] ?? 'ebank',
                            'saldo'          => $vc['saldo_awal'],
                            'saldo_minimum'  => 10000,
                            'jurusan_id'     => $vc['jurusan_id'],
                            'rombel_id'      => $vc['rombel_id'],
                            'alamat'         => $vc['alamat'],
                            'tanggal_buka'   => $now,
                            'status'         => 'aktif',
                            'created_at'     => $now,
                            'updated_at'     => $now,
                        ];
                    }

                    // Bulk insert Nasabah
                    foreach (array_chunk($nasabahToInsert, 500) as $chunk) {
                        Nasabah::insert($chunk);
                    }

                    // Initialize default Tabungan Wallet in bulk if wallet type exists
                    $tabunganType = \App\Models\WalletType::where('is_default', true)->orWhere('category', 'tabungan')->first();
                    if ($tabunganType && !empty($nasabahToInsert)) {
                        $createdNasabahs = Nasabah::whereIn('nomor_rekening', array_column($nasabahToInsert, 'nomor_rekening'))
                            ->get(['id', 'nomor_rekening', 'saldo']);

                        $walletsToInsert = [];
                        foreach ($createdNasabahs as $n) {
                            $walletsToInsert[] = [
                                'wallet_number'  => 'W-' . $n->nomor_rekening . '-' . str_pad($tabunganType->id, 2, '0', STR_PAD_LEFT),
                                'nasabah_id'     => $n->id,
                                'wallet_type_id' => $tabunganType->id,
                                'balance'        => $n->saldo ?? 0.00,
                                'status'         => 'active',
                                'created_at'     => $now,
                                'updated_at'     => $now,
                            ];
                        }

                        foreach (array_chunk($walletsToInsert, 500) as $chunk) {
                            \App\Models\Wallet::insert($chunk);
                        }
                    }

                    $successCount += count($nasabahToInsert);
                }
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Nasabah import error: ' . $e->getMessage(), [
                'exception' => $e
            ]);
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
        $sheet->fromArray(['name', 'nis_or_nip', 'norek', 'user_type', 'bank_type', 'rombel_id', 'phone', 'alamat', 'saldo_awal'], null, 'A1');
        // Contoh data
        $sheet->fromArray(['Budi Santoso', '2024001', '10002024001', 'siswa', 'ebank', '5', '08123456789', 'Jl. Merdeka No. 1', 50000], null, 'A2');
        $sheet->fromArray(['Siti Aminah', '2024002', '10002024002', 'siswa', 'bjb', '8', '08987654321', 'Jl. Sudirman No. 10', 100000], null, 'A3');

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
