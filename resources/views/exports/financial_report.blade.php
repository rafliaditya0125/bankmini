<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 20px; color: #000; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .header p { margin: 5px 0 0; font-size: 12px; font-weight: bold; }
        
        .report-title { text-align: center; margin-bottom: 20px; }
        .report-title h2 { margin: 0; font-size: 16px; text-decoration: underline; text-transform: uppercase; }
        .report-title p { margin: 5px 0 0; font-size: 11px; }

        table { w-full; border-collapse: collapse; margin-bottom: 20px; width: 100%; }
        th { background-color: #ffff00; border: 2px solid #000; padding: 8px; text-align: center; font-weight: bold; text-transform: uppercase; }
        td { border: 2px solid #000; padding: 8px; vertical-align: top; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        
        .section-header { background-color: #f2f2f2; font-weight: bold; padding: 8px; border: 2px solid #000; text-transform: uppercase; }
        .total-row { background-color: #ffff00; font-weight: bold; border-top: 2px solid #000; }

        .footer { margin-top: 50px; width: 100%; }
        .footer-table { border: none; width: 100%; }
        .footer-table td { border: none; text-align: center; width: 50%; padding-top: 50px; }
        .signature-space { height: 60px; }

        @media print {
            .no-print { display: none; }
        }
    </style>
</head>
<body onload="{{ request()->has('print') ? 'window.print()' : '' }}">
    <div class="header">
        <h1>{{ \App\Models\Setting::get('bank_name', 'BANK MINI SMEACIS') }}</h1>
        <p>{{ \App\Models\Setting::get('address', 'Jl. Jend. Sudirman No. 269, Ciamis') }}</p>
    </div>

    <div class="report-title">
        <h2>{{ $title }}</h2>
        <p>Per Tanggal: {{ $data['date'] }}</p>
    </div>

    <!-- NERACA SECTION -->
    <div class="section-header" style="text-align: center; margin-bottom: 10px;">I. NERACA (LAPORAN POSISI KEUANGAN)</div>
    <table>
        <thead>
            <tr>
                <th width="50%">AKTIVA (ASET)</th>
                <th width="50%">PASSIVA (KEWAJIBAN & MODAL)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <table style="border: none; margin: 0;">
                        @foreach($data['neraca']['assets'] as $item)
                            <tr>
                                <td style="border: none;">[{{ $item['code'] }}] {{ $item['name'] }}</td>
                                <td style="border: none;" class="text-right">Rp {{ number_format($item['amount'], 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                        <tr style="border-top: 1px solid #000;">
                            <td style="border: none;" class="font-bold">TOTAL AKTIVA</td>
                            <td style="border: none;" class="text-right font-bold">Rp {{ number_format(array_sum(array_column($data['neraca']['assets'], 'amount')), 0, ',', '.') }}</td>
                        </tr>
                    </table>
                </td>
                <td>
                    <table style="border: none; margin: 0;">
                        <tr><td style="border: none;" class="font-bold underline">KEWAJIBAN</td></tr>
                        @foreach($data['neraca']['liabilities'] as $item)
                            <tr>
                                <td style="border: none; padding-left: 15px;">[{{ $item['code'] }}] {{ $item['name'] }}</td>
                                <td style="border: none;" class="text-right">Rp {{ number_format($item['amount'], 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                        <tr><td style="border: none;" class="font-bold underline">EKUITAS</td></tr>
                        @foreach($data['neraca']['equity'] as $item)
                            <tr>
                                <td style="border: none; padding-left: 15px;">[{{ $item['code'] }}] {{ $item['name'] }}</td>
                                <td style="border: none;" class="text-right">Rp {{ number_format($item['amount'], 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                        <tr style="border-top: 1px solid #000;">
                            <td style="border: none;" class="font-bold">TOTAL PASSIVA</td>
                            <td style="border: none;" class="text-right font-bold">Rp {{ number_format(array_sum(array_column($data['neraca']['liabilities'], 'amount')) + array_sum(array_column($data['neraca']['equity'], 'amount')), 0, ',', '.') }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>

    <!-- LABA RUGI SECTION -->
    <div style="margin-top: 30px;"></div>
    <div class="section-header" style="text-align: center; margin-bottom: 10px;">II. PERHITUNGAN LABA RUGI</div>
    <table>
        <thead>
            <tr>
                <th colspan="2">KETERANGAN</th>
                <th>JUMLAH (IDR)</th>
            </tr>
        </thead>
        <tbody>
            <tr class="section-header"><td colspan="3">PENDAPATAN</td></tr>
            @foreach($data['laba_rugi']['revenue'] as $item)
                <tr>
                    <td colspan="2">{{ $item['name'] }}</td>
                    <td class="text-right">Rp {{ number_format($item['amount'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
            <tr class="font-bold">
                <td colspan="2" class="text-right">TOTAL PENDAPATAN</td>
                <td class="text-right">Rp {{ number_format(array_sum(array_column($data['laba_rugi']['revenue'], 'amount')), 0, ',', '.') }}</td>
            </tr>

            <tr class="section-header"><td colspan="3">BEBAN</td></tr>
            @foreach($data['laba_rugi']['expenses'] as $item)
                <tr>
                    <td colspan="2">{{ $item['name'] }}</td>
                    <td class="text-right">Rp {{ number_format($item['amount'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
            <tr class="font-bold">
                <td colspan="2" class="text-right">TOTAL BEBAN</td>
                <td class="text-right">Rp {{ number_format(array_sum(array_column($data['laba_rugi']['expenses'], 'amount')), 0, ',', '.') }}</td>
            </tr>

            <tr class="total-row">
                <td colspan="2" class="text-right">LABA / RUGI BERSIH</td>
                <td class="text-right">Rp {{ number_format(array_sum(array_column($data['laba_rugi']['revenue'], 'amount')) - array_sum(array_column($data['laba_rugi']['expenses'], 'amount')), 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <table class="footer-table">
            <tr>
                <td style="width: 50%;"></td>
                <td>
                    {{ \App\Models\Setting::get('bank_city', 'TASIKMALAYA') }}, {{ date('d F Y') }}<br>
                    Kepala Bank Mini / Guru HR<br>
                    <div class="signature-space"></div>
                    ( {{ strtoupper(\App\Models\Setting::get('teacher_responsible_name', '__________________________')) }} )
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
