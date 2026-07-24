<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @page {
            margin: 1.5cm;
            size: A4;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Arial', sans-serif; 
            font-size: 11px; 
            color: #000; 
            line-height: 1.3;
            background: white;
        }
        .container {
            width: 100%;
        }
        
        /* Header */
        .header { 
            text-align: center; 
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
        }
        .header h1 { 
            margin: 0;
            font-size: 14px; 
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .header h2 { 
            margin: 4px 0 0 0;
            font-size: 11px; 
            font-weight: bold;
            text-transform: uppercase;
        }
        .header p {
            margin: 2px 0 0 0;
            font-size: 10px;
            font-weight: normal;
        }
        
        /* Preamble */
        .preamble { 
            margin-bottom: 15px;
            font-size: 11px;
            text-align: justify;
            line-height: 1.5;
        }
        
        /* Data Table */
        .data-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 12px;
            font-size: 10px;
        }
        .data-table th { 
            border: 1px solid #000 !important; 
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            background-color: #fff !important;
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .data-table td { 
            border: 1px solid #000 !important; 
            padding: 5px 4px;
            font-size: 10px;
        }
        .data-table .text-center { text-align: center; }
        .data-table .text-right { text-align: right; }
        
        /* Summary Section */
        .summary-section {
            margin-bottom: 15px;
        }
        
        .summary-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 6px;
            text-transform: uppercase;
            margin-top: 10px;
        }
        
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
        }
        .summary-table td {
            border: 1px solid #000 !important;
            padding: 5px 8px;
        }
        .summary-table .label {
            text-align: left;
            width: 70%;
        }
        .summary-table .value {
            text-align: right;
            font-weight: bold;
            width: 30%;
        }
        .summary-table .subtotal {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .summary-table .total {
            background-color: #e8e8e8;
            font-weight: bold;
        }
        
        /* Footer Section */
        .footer-section { 
            margin-top: 20px;
        }
        
        .footer-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10px;
        }
        .signature-table th {
            border: 1px solid #000 !important;
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            background-color: #fff !important;
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .signature-table td {
            border: 1px solid #000 !important;
            padding: 6px 4px;
            text-align: center;
            font-size: 10px;
        }
        .signature-table .no-col {
            width: 8%;
        }
        .signature-table .name-col {
            width: 60%;
            text-align: left;
            font-weight: bold;
        }
        .signature-table .sign-col {
            width: 32%;
            height: 40px;
        }
        
        /* Closing Statement */
        .closing-statement {
            font-size: 10px;
            text-align: justify;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        
        /* Signature Section */
        .signature-section {
            margin-top: 20px;
            text-align: right;
        }
        .signature-section p {
            margin: 2px 0;
            font-size: 10px;
        }
        .signature-line {
            height: 50px;
            margin: 5px 0;
        }
        .signature-name {
            font-weight: bold;
            font-size: 10px;
        }
        
        /* Print Styles */
        .no-print { 
            display: block;
            margin-bottom: 20px;
            padding: 12px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            text-align: center;
        }
        .no-print button {
            padding: 8px 16px;
            background: #000;
            color: white;
            border: none;
            cursor: pointer;
            font-weight: bold;
            font-size: 11px;
        }
        .no-print button:hover {
            background: #333;
        }
        
        @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .container { max-width: 100%; }
            table { page-break-inside: avoid; border-collapse: collapse !important; }
            th, td { border: 1px solid #000 !important; }
            .data-table th, .data-table td, .summary-table td, .signature-table th, .signature-table td {
                border: 1px solid #000 !important;
            }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <p style="margin-bottom: 8px; font-weight: bold;">Pastikan "Background Graphics" aktif di pengaturan cetak</p>
        <button onclick="window.print()">CETAK LAPORAN</button>
    </div>

    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>BERITA ACARA TRANSAKSI</h1>
            <h2>{{ \App\Models\Setting::get('bank_name', 'EBANK SCHOOL') }}</h2>
            <p>{{ \App\Models\Setting::get('address', 'JL. JEND. SUDIRMAN NO. 269, CIAMIS') }}</p>
        </div>

        <!-- Preamble -->
        <div class="preamble">
            <p>Pada hari ini, <strong>{{ \Carbon\Carbon::now()->format('d F Y') }}</strong>, telah dilakukan audit dan rekapitulasi data transaksi keuangan pada unit <strong>{{ \App\Models\Setting::get('bank_name', 'EBANK SCHOOL') }}</strong>. Berdasarkan rekaman sistem elektronik, berikut adalah rincian transaksi yang telah divalidasi dan dinyatakan sah:</p>
        </div>

        <!-- Data Table -->
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 10%;">KODE SLIP</th>
                    <th style="width: 9%;">TANGGAL</th>
                    <th style="width: 20%;">IDENTITAS NASABAH</th>
                    <th style="width: 8%;">AKSI</th>
                    <th style="width: 11%;">PETUGAS</th>
                    <th style="width: 12%;">SALDO AWAL</th>
                    <th style="width: 12%;">SALDO AKHIR</th>
                    <th style="width: 9%;">DEBIT</th>
                    <th style="width: 9%;">KREDIT</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $setoranByGroup = [];
                    $penarikByGroup = [];
                    $totalSetoranKeseluruhan = 0;
                    $totalPenarikKeseluruhan = 0;
                    $totalTransfer = 0;
                    $petugasUnik = [];
                @endphp
                @forelse($data as $row)
                @php
                    // Get user type and determine group
                    $user = $row->nasabah?->user;
                    $userType = strtolower($user?->user_type ?? 'lainnya');
                    
                    if ($userType === 'siswa') {
                        $rombel = $row->nasabah?->rombelRel;
                        $tingkat = $rombel?->tingkat ?? '';
                        $groupName = $tingkat ? "Siswa Tingkat {$tingkat}" : "Siswa (Lainnya)";
                        
                        // For identity display, still show full class
                        $identityClass = $rombel ? trim("{$rombel->nama_kelas}") : '';
                    } else {
                        $groupName = match($userType) {
                            'guru' => 'Guru / Karyawan',
                            'kelas' => 'Tabungan Kas Kelas',
                            'organisasi' => 'Organisasi / Ekskul',
                            default => ucfirst($userType)
                        };
                        $identityClass = $groupName;
                    }

                    // Hitung berdasarkan jenis transaksi
                    if ($row->jenis_transaksi === 'setor') {
                        $totalSetoranKeseluruhan += $row->jumlah;
                        if (!isset($setoranByGroup[$groupName])) {
                            $setoranByGroup[$groupName] = 0;
                        }
                        $setoranByGroup[$groupName] += $row->jumlah;
                        $debit = 0;
                        $kredit = $row->jumlah;
                    } elseif ($row->jenis_transaksi === 'tarik') {
                        $totalPenarikKeseluruhan += $row->jumlah;
                        if (!isset($penarikByGroup[$groupName])) {
                            $penarikByGroup[$groupName] = 0;
                        }
                        $penarikByGroup[$groupName] += $row->jumlah;
                        $debit = $row->jumlah;
                        $kredit = 0;
                    } elseif ($row->jenis_transaksi === 'transfer') {
                        $totalTransfer += $row->jumlah;
                        $debit = 0;
                        $kredit = 0;
                    } else {
                        $debit = 0;
                        $kredit = 0;
                    }

                    $petugasName = $row->nama_petugas ?? $row->petugas?->name ?? 'SYSTEM';
                    $petugasKey = strtolower(trim($petugasName));
                    if (!isset($petugasUnik[$petugasKey])) {
                        $petugasUnik[$petugasKey] = $petugasName;
                    }

                    $aksi = match($row->jenis_transaksi) {
                        'setor' => 'SETOR',
                        'tarik' => 'TARIK',
                        'transfer' => 'TRANSFER',
                        default => strtoupper($row->jenis_transaksi)
                    };

                    $tanggal = $row->tanggal_transaksi 
                        ? \Carbon\Carbon::parse($row->tanggal_transaksi)->format('d/m/y')
                        : \Carbon\Carbon::parse($row->created_at)->format('d/m/y');
                @endphp
                <tr>
                    <td class="text-center">{{ $row->kode_transaksi ?? '-' }}</td>
                    <td class="text-center">{{ $tanggal }}</td>
                    <td>
                        <div style="font-weight: bold; margin-bottom: 1px;">
                            {{ $row->nasabah?->user?->name ?? 'N/A' }}
                            @if(!empty($identityClass))
                                <span style="font-weight: normal;">({{ $identityClass }})</span>
                            @endif
                        </div>
                        <div style="font-size: 9px;">REK: {{ $row->nasabah?->nomor_rekening ?? '-' }}</div>
                    </td>
                    <td class="text-center">{{ $aksi }}</td>
                    <td class="text-center">{{ $petugasName }}</td>
                    <td class="text-right">{{ number_format($row->saldo_sebelum ?? 0, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($row->saldo_sesudah ?? 0, 0, ',', '.') }}</td>
                    <td class="text-right">{{ $debit > 0 ? number_format($debit, 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $kredit > 0 ? number_format($kredit, 0, ',', '.') : '-' }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="9" class="text-center">Tidak ada data transaksi</td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Summary Section -->
        <div class="summary-section">
            <!-- SETORAN SECTION -->
            <div class="summary-title">REKAPITULASI SETORAN (KREDIT)</div>
            <table class="summary-table">
                @php
                    ksort($setoranByGroup);
                @endphp
                @forelse($setoranByGroup as $group => $nominal)
                <tr>
                    <td class="label">Setoran {{ $group }}</td>
                    <td class="value">{{ number_format($nominal, 0, ',', '.') }}</td>
                </tr>
                @empty
                <tr>
                    <td class="label">Tidak ada setoran</td>
                    <td class="value">0</td>
                </tr>
                @endforelse
                <tr class="total">
                    <td class="label">TOTAL SETORAN KESELURUHAN (RP)</td>
                    <td class="value">{{ number_format($totalSetoranKeseluruhan, 0, ',', '.') }}</td>
                </tr>
            </table>

            <!-- PENARIKAN SECTION -->
            <div class="summary-title">REKAPITULASI PENARIKAN (DEBIT)</div>
            <table class="summary-table">
                @php
                    ksort($penarikByGroup);
                @endphp
                @forelse($penarikByGroup as $group => $nominal)
                <tr>
                    <td class="label">Penarikan {{ $group }}</td>
                    <td class="value">{{ number_format($nominal, 0, ',', '.') }}</td>
                </tr>
                @empty
                <tr>
                    <td class="label">Tidak ada penarikan</td>
                    <td class="value">0</td>
                </tr>
                @endforelse
                <tr class="total">
                    <td class="label">TOTAL PENARIKAN KESELURUHAN (RP)</td>
                    <td class="value">{{ number_format($totalPenarikKeseluruhan, 0, ',', '.') }}</td>
                </tr>
            </table>

            <!-- TRANSFER SECTION -->
            <div class="summary-title">TRANSFER ANTAR NASABAH</div>
            <table class="summary-table">
                <tr>
                    <td class="label">Total Transfer (Informasi Saja)</td>
                    <td class="value">{{ number_format($totalTransfer, 0, ',', '.') }}</td>
                </tr>
                <tr style="background-color: #fff; font-size: 9px;">
                    <td colspan="2" style="padding: 4px 8px; border: 1px solid #000;">
                        <em>*Transfer tidak mempengaruhi cash flow bank, hanya perpindahan dana antar nasabah</em>
                    </td>
                </tr>
            </table>

            <!-- CASH FLOW SECTION -->
            <div class="summary-title">CASH FLOW BANK (SETORAN - PENARIKAN)</div>
            <table class="summary-table">
                @php
                    $cashFlow = $totalSetoranKeseluruhan - $totalPenarikKeseluruhan;
                @endphp
                <tr>
                    <td class="label">Total Setoran</td>
                    <td class="value">{{ number_format($totalSetoranKeseluruhan, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td class="label">Total Penarikan</td>
                    <td class="value">{{ number_format($totalPenarikKeseluruhan, 0, ',', '.') }}</td>
                </tr>
                <tr class="total">
                    <td class="label">REKAPITULASI AKHIR / CASH FLOW (RP)</td>
                    <td class="value" style="color: {{ $cashFlow >= 0 ? '#000' : '#d32f2f' }};">
                        {{ $cashFlow >= 0 ? '+' : '' }}{{ number_format($cashFlow, 0, ',', '.') }}
                    </td>
                </tr>
            </table>
        </div>

        <!-- Footer Section -->
        <div class="footer-section">
            <p class="footer-title">I. DAFTAR OTORISASI PETUGAS</p>
            
            <table class="signature-table">
                <thead>
                    <tr>
                        <th class="no-col">NO</th>
                        <th class="name-col">NAMA PETUGAS PELAKSANA</th>
                        <th class="sign-col">TANDA TANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse(array_values($petugasUnik) as $index => $namaPetugas)
                    <tr>
                        <td class="no-col text-center">{{ $index + 1 }}</td>
                        <td class="name-col">{{ strtoupper($namaPetugas) }}</td>
                        <td class="sign-col"></td>
                    </tr>
                    @empty
                    <tr>
                        <td class="no-col text-center">1</td>
                        <td class="name-col">{{ strtoupper(auth()->user()->name ?? 'PETUGAS') }}</td>
                        <td class="sign-col"></td>
                    </tr>
                    @endforelse
                </tbody>
            </table>

            <p class="closing-statement">Demikian Berita Acara Rekapitulasi Transaksi ini disusun secara otomatis oleh sistem perbankan sebagai dokumen pertanggungjawaban yang valid bagi pihak-pihak berkepentingan.</p>

            <div class="signature-section">
                <p>{{ strtoupper(\App\Models\Setting::get('bank_city', 'CIAMIS')) }}, {{ \Carbon\Carbon::now()->format('d F Y') }}</p>
                <p style="margin-top: 8px; font-weight: bold;">GURU PENANGGUNG JAWAB</p>
                <div class="signature-line"></div>
                <p class="signature-name">( {{ strtoupper(\App\Models\Setting::get('teacher_responsible_name', 'GURU PENANGGUNG JAWAB')) }} )</p>
            </div>
        </div>
    </div>

</body>
</html>
