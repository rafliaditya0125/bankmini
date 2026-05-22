<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
        th, td { border: 2px solid #000000; padding: 6px; text-align: center; vertical-align: middle; word-wrap: break-word; }
        th { background-color: #FFFF00; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .footer { margin-top: 30px; }
        .footer-table { width: 100%; border: none; }
        .footer-table td { border: none; width: 50%; text-align: center; }
        @media print {
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>{{ \App\Models\Setting::get('bank_name', 'Bank Mini') }}</p>
        <p>Periode: {{ $period ?? 'Semua Waktu' }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 15%;">TANGGAL</th>
                <th style="width: 20%;">KODE SLIP</th>
                <th style="width: 25%;">DESKRIPSI</th>
                <th style="width: 10%;">REFF</th>
                <th style="width: 15%;">DEBIT</th>
                <th style="width: 15%;">KREDIT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($entries as $entry)
            <tr>
                <td>{{ $entry['tanggal'] }}</td>
                <td>{{ $entry['no_bukti'] }}</td>
                <td style="text-align: left;">{{ $entry['deskripsi'] }}</td>
                <td>{{ $entry['reff'] }}</td>
                <td class="text-right">
                    {{ $entry['debit'] > 0 ? number_format($entry['debit'], 0, ',', '.') : '-' }}
                </td>
                <td class="text-right">
                    {{ $entry['kredit'] > 0 ? number_format($entry['kredit'], 0, ',', '.') : '-' }}
                </td>
            </tr>
            @endforeach
        </tbody>
        @if(isset($totals))
        <tfoot>
            <tr style="font-weight: bold; background-color: #f9f9f9;">
                <td colspan="4">TOTAL</td>
                <td class="text-right">{{ number_format($totals['debit'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($totals['kredit'], 0, ',', '.') }}</td>
            </tr>
        </tfoot>
        @endif
    </table>

    <div class="footer">
        <table class="footer-table">
            <tr>
                <td></td>
                <td>
                    <p>{{ \App\Models\Setting::get('bank_city', 'TASIKMALAYA') }}, {{ date('d F Y') }}</p>
                    <p>Guru Penanggung Jawab</p>
                    <br><br><br><br>
                    <p>( {{ strtoupper(\App\Models\Setting::get('teacher_responsible_name', '__________________________')) }} )</p>
                </td>
            </tr>
        </table>
    </div>

    @if(!isset($isExcel))
    <script>
        window.onload = function() {
            if (window.location.search.includes('print=true')) {
                window.print();
            }
        }
    </script>
    @endif
</body>
</html>
