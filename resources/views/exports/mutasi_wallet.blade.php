<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Laporan Mutasi Rekening' }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 1.2cm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10px;
            color: #1e293b;
            background: #fff;
            line-height: 1.4;
        }
        .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
        }

        /* Top Action Bar for screen */
        .no-print-bar {
            background: #0f172a;
            color: #fff;
            padding: 12px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .no-print-bar .title {
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.5px;
        }
        .no-print-bar .actions {
            display: flex;
            gap: 10px;
        }
        .btn-print {
            background: #059669;
            color: #fff;
            border: none;
            padding: 7px 16px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .btn-print:hover {
            background: #047857;
        }
        .btn-close {
            background: #334155;
            color: #fff;
            border: none;
            padding: 7px 16px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
        }
        .btn-close:hover {
            background: #475569;
        }

        /* Bank Header */
        .bank-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .bank-info h1 {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .bank-info p {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-badge {
            text-align: right;
        }
        .doc-badge h2 {
            font-size: 13px;
            font-weight: 900;
            color: #059669;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .doc-badge p {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
        }

        /* Nasabah & Account Meta Table */
        .meta-box {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            margin-bottom: 16px;
            background: #f8fafc;
            padding: 10px 14px;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 3px 6px;
            font-size: 10px;
            vertical-align: top;
        }
        .meta-label {
            width: 16%;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 9px;
        }
        .meta-value {
            width: 34%;
            color: #0f172a;
            font-weight: 700;
        }

        /* 4 Statistics Cards */
        .stats-grid {
            width: 100%;
            margin-bottom: 16px;
            border-collapse: collapse;
        }
        .stats-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            background: #ffffff;
            width: 25%;
            vertical-align: top;
        }
        .stats-label {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
        }
        .stats-val {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
        }
        .stats-sub {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 2px;
        }

        /* Mutations Table */
        .mutasi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        .mutasi-table th {
            background-color: #059669;
            color: #ffffff;
            border: 1px solid #047857;
            padding: 6px 6px;
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .mutasi-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 6px;
            font-size: 9px;
            vertical-align: middle;
        }
        .mutasi-table tr:nth-child(even) {
            background-color: #f8fafc;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .mutasi-table .text-center { text-align: center; }
        .mutasi-table .text-right { text-align: right; }
        .mutasi-table .font-mono { font-family: monospace; font-size: 9px; }
        .flow-in {
            color: #059669;
            font-weight: 800;
        }
        .flow-out {
            color: #e11d48;
            font-weight: 800;
        }
        .total-row td {
            background: #e2e8f0 !important;
            font-weight: 900;
            border-top: 2px solid #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Signature Section */
        .signature-table {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
            border: none;
        }
        .signature-table td {
            border: none;
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 10px;
        }
        .signature-space {
            height: 60px;
        }
        .signature-name {
            font-weight: 800;
            text-decoration: underline;
            text-transform: uppercase;
        }

        /* Print Media Styles */
        @media print {
            .no-print, .no-print-bar {
                display: none !important;
            }
            body {
                background: #fff;
                font-size: 9.5px;
            }
            .meta-box {
                background: #fff !important;
                border: 1px solid #94a3b8 !important;
            }
            .mutasi-table th {
                background-color: #059669 !important;
                color: #fff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .mutasi-table tr:nth-child(even) {
                background-color: #f1f5f9 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .total-row td {
                background: #e2e8f0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    @php
        $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
        $now = \Carbon\Carbon::now($timezone);
        $bankName = \App\Models\Setting::get('bank_name', 'BANK MINI');
        $bankCity = \App\Models\Setting::get('bank_city', 'CIAMIS');
        $bankAddress = \App\Models\Setting::get('address', 'Unit Layanan Keuangan Sekolah');
        $teacherName = \App\Models\Setting::get('teacher_responsible_name', 'GURU PENANGGUNG JAWAB');
    @endphp

    <div class="container">
        <!-- Screen Action Bar -->
        <div class="no-print-bar">
            <div class="title">
                Rekening Koran &bull; {{ $wallet->walletType?->name ?? 'Tabungan' }}
            </div>
            <div class="actions">
                <button type="button" class="btn-print" onclick="window.print()">
                    Cetak / Simpan PDF
                </button>
                <button type="button" class="btn-close" onclick="window.close()">
                    Tutup
                </button>
            </div>
        </div>

        <!-- Bank Header -->
        <div class="bank-header">
            <div class="bank-info">
                <h1>{{ $bankName }}</h1>
                <p>{{ $bankAddress }} &bull; {{ $bankCity }}</p>
                <p>Dokumen Laporan Resmi Rekapitulasi Mutasi Transaksi Nasabah</p>
            </div>
            <div class="doc-badge">
                <h2>Rekening Koran</h2>
                <p>Dicetak: {{ $now->locale('id')->translatedFormat('d F Y H:i') }} WIB</p>
                <p>Status: RESMI &amp; VALID</p>
            </div>
        </div>

        <!-- Nasabah & Account Meta -->
        <div class="meta-box">
            <table class="meta-table">
                <tr>
                    <td class="meta-label">Nama Nasabah</td>
                    <td class="meta-value">{{ strtoupper($nasabah->user?->name ?? '-') }}</td>
                    <td class="meta-label">Jenis Kantong</td>
                    <td class="meta-value">{{ strtoupper($wallet->walletType?->name ?? 'Tabungan Utama') }}</td>
                </tr>
                <tr>
                    <td class="meta-label">No. Rekening</td>
                    <td class="meta-value font-mono">{{ $nasabah->nomor_rekening }}</td>
                    <td class="meta-label">No. Kantong</td>
                    <td class="meta-value font-mono">{{ $wallet->wallet_number ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Identitas (NIS/NIP)</td>
                    <td class="meta-value font-mono">{{ $nasabah->user?->nis ?? $nasabah->user?->nip ?? '-' }}</td>
                    <td class="meta-label">Periode Laporan</td>
                    <td class="meta-value">{{ $now->locale('id')->translatedFormat('F Y') }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Kelas / Jurusan</td>
                    <td class="meta-value">
                        {{ strtoupper($nasabah->kelas ?? '-') }}
                        @if($nasabah->jurusanRel)
                            / {{ strtoupper($nasabah->jurusanRel->kode) }}
                        @endif
                    </td>
                    <td class="meta-label">Status Rekening</td>
                    <td class="meta-value">{{ strtoupper($wallet->status ?? 'AKTIF') }}</td>
                </tr>
            </table>
        </div>

        <!-- 4 Containers Ringkasan Statistik -->
        <table class="stats-grid">
            <tr>
                <td class="stats-card" style="border-left: 3px solid #64748b;">
                    <div class="stats-label">Saldo Bulan Lalu</div>
                    <div class="stats-val">Rp {{ number_format($stats['saldo_bulan_lalu'] ?? 0, 0, ',', '.') }}</div>
                    <div class="stats-sub">Saldo awal per 1 {{ $now->locale('id')->translatedFormat('F Y') }}</div>
                </td>
                <td style="width: 10px;"></td>
                <td class="stats-card" style="border-left: 3px solid #059669;">
                    <div class="stats-label" style="color: #059669;">Setoran Bulan Ini</div>
                    <div class="stats-val" style="color: #059669;">Rp {{ number_format($stats['setoran_bulan_ini'] ?? 0, 0, ',', '.') }}</div>
                    <div class="stats-sub">Total dana masuk bulan ini</div>
                </td>
                <td style="width: 10px;"></td>
                <td class="stats-card" style="border-left: 3px solid #e11d48;">
                    <div class="stats-label" style="color: #e11d48;">Penarikan Bulan Ini</div>
                    <div class="stats-val" style="color: #e11d48;">Rp {{ number_format($stats['penarikan_bulan_ini'] ?? 0, 0, ',', '.') }}</div>
                    <div class="stats-sub">Total dana keluar bulan ini</div>
                </td>
                <td style="width: 10px;"></td>
                <td class="stats-card" style="border-left: 3px solid #4f46e5;">
                    <div class="stats-label" style="color: #4f46e5;">Saldo Saat Ini</div>
                    <div class="stats-val" style="color: #4f46e5;">Rp {{ number_format($stats['saldo_saat_ini'] ?? 0, 0, ',', '.') }}</div>
                    <div class="stats-sub">Saldo efektif kantong</div>
                </td>
            </tr>
        </table>

        <!-- Table Mutasi -->
        <table class="mutasi-table">
            <thead>
                <tr>
                    <th style="width: 4%;" class="text-center">No</th>
                    <th style="width: 13%;">Waktu</th>
                    <th style="width: 13%;">Kode Transaksi</th>
                    <th style="width: 15%;">Jenis</th>
                    <th style="width: 19%;">Keterangan</th>
                    <th style="width: 9%;">Petugas</th>
                    <th style="width: 13%;" class="text-right">Kredit (+)</th>
                    <th style="width: 13%;" class="text-right">Debit (-)</th>
                    <th style="width: 13%;" class="text-right">Saldo Akhir</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $totalIn = 0;
                    $totalOut = 0;
                @endphp
                @forelse($mutasi as $index => $row)
                    @php
                        $isFlowIn = $row->flow === 'in';
                        if ($row->status !== 'cancelled') {
                            if ($isFlowIn) {
                                $totalIn += $row->jumlah;
                            } else {
                                $totalOut += $row->jumlah;
                            }
                        }
                    @endphp
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td>{{ $row->tanggal }}</td>
                        <td class="font-mono"><strong>{{ $row->kode_transaksi }}</strong></td>
                        <td>{{ $row->jenis_label }}</td>
                        <td>{{ $row->keterangan }}</td>
                        <td>{{ strtoupper($row->nama_petugas) }}</td>
                        <td class="text-right {{ $isFlowIn ? 'flow-in' : '' }}">
                            {{ $isFlowIn ? number_format($row->jumlah, 0, ',', '.') : '-' }}
                        </td>
                        <td class="text-right {{ !$isFlowIn ? 'flow-out' : '' }}">
                            {{ !$isFlowIn ? number_format($row->jumlah, 0, ',', '.') : '-' }}
                        </td>
                        <td class="text-right font-mono" style="font-weight: 700;">
                            {{ number_format($row->saldo_sesudah, 0, ',', '.') }}
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="text-center" style="padding: 16px; color: #94a3b8;">
                            Belum ada riwayat mutasi transaksi untuk kantong ini.
                        </td>
                    </tr>
                @endforelse
                <tr class="total-row">
                    <td colspan="6" class="text-right">TOTAL MUTASI PERIODE INI</td>
                    <td class="text-right flow-in">+ Rp {{ number_format($totalIn, 0, ',', '.') }}</td>
                    <td class="text-right flow-out">- Rp {{ number_format($totalOut, 0, ',', '.') }}</td>
                    <td class="text-right font-mono">Rp {{ number_format($stats['saldo_saat_ini'] ?? 0, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Signature Section -->
        <table class="signature-table">
            <tr>
                <td>
                    <p>Mengetahui,</p>
                    <p style="font-weight: 700;">Nasabah Pemilik Rekening</p>
                    <div class="signature-space"></div>
                    <p class="signature-name">{{ strtoupper($nasabah->user?->name ?? 'NASABAH') }}</p>
                    <p style="color: #64748b; font-size: 8px;">NIS/NIP: {{ $nasabah->user?->nis ?? $nasabah->user?->nip ?? $nasabah->nomor_rekening }}</p>
                </td>
                <td>
                    <p>{{ $bankCity }}, {{ $now->locale('id')->translatedFormat('d F Y') }}</p>
                    <p style="font-weight: 700;">Guru Penanggung Jawab / Teller</p>
                    <div class="signature-space"></div>
                    <p class="signature-name">{{ strtoupper($teacherName) }}</p>
                    <p style="color: #64748b; font-size: 8px;">{{ $bankName }}</p>
                </td>
            </tr>
        </table>
    </div>

    <script>
        // Otomatis trigger print saat dibuka via iframe
        window.addEventListener('load', function() {
            if (window.self !== window.top) {
                window.print();
            }
        });
    </script>
</body>
</html>
