<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
        th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
        .header-row th { background-color: #FFFF00; color: #000000; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <table style="border-collapse: collapse; border: 2px solid #000000; width: 100%; font-family: Arial, sans-serif;">
        <thead>
            <tr>
                <th rowspan="2" style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">TANGGAL</th>
                <th rowspan="2" style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">KODE SLIP</th>
                <th rowspan="2" style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">DESKRIPSI</th>
                <th rowspan="2" style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">NAMA PETUGAS</th>
                <th colspan="2" style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">SALDO</th>
            </tr>
            <tr>
                <th style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">DEBIT</th>
                <th style="background-color: #FFFF00; border: 2px solid #000000; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">KREDIT</th>
            </tr>
        </thead>
        <tbody>
            @php
                $totalDebit = 0;
                $totalKredit = 0;
            @endphp
            @foreach($data as $row)
            @php
                $isDebit = $row->saldo_sesudah < $row->saldo_sebelum;
                $debit = $isDebit ? $row->jumlah : 0;
                $kredit = !$isDebit ? $row->jumlah : 0;
                $totalDebit += $debit;
                $totalKredit += $kredit;
                
                $deskripsi = match($row->jenis_transaksi) {
                    'setor' => 'Setoran Tunai',
                    'tarik' => 'Penarikan Tunai',
                    'transfer' => 'Transfer Dana',
                    default => ucfirst($row->jenis_transaksi)
                };

                $petugasName = $row->nama_petugas ?? $row->petugas->name ?? 'SYSTEM';
                if (empty($row->nama_petugas) && isset($row->petugas) && in_array($row->petugas->role, ['admin', 'superadmin'])) {
                    $petugasName = 'ADMIN';
                }
            @endphp
            <tr>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle;">{{ $row->created_at->format('d/m/Y') }}</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle;">{{ $row->kode_transaksi }}</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle;">{{ $deskripsi }}</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle;">{{ strtoupper($petugasName) }}</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle; mso-number-format: '\#\,\#\#0';">
                    {{ $debit > 0 ? $debit : '' }}
                </td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle; mso-number-format: '\#\,\#\#0';">
                    {{ $kredit > 0 ? $kredit : '' }}
                </td>
            </tr>
            @endforeach
            <tr>
                <td colspan="4" style="border: 2px solid #000000; padding: 8px; text-align: right; vertical-align: middle; font-weight: bold;">TOTAL</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; mso-number-format: '\#\,\#\#0';">{{ $totalDebit }}</td>
                <td style="border: 2px solid #000000; padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; mso-number-format: '\#\,\#\#0';">{{ $totalKredit }}</td>
            </tr>
        </tbody>
        <tfoot style="border: none;">
            <tr><td colspan="6" style="border: none;">&nbsp;</td></tr>
            <tr><td colspan="6" style="border: none;">&nbsp;</td></tr>
            <tr>
                <td colspan="3" style="border: none;">&nbsp;</td>
                <td style="border: none;">&nbsp;</td>
                <td colspan="2" style="border: none; text-align: center; vertical-align: middle;">{{ \App\Models\Setting::get('bank_city', 'TASIKMALAYA') }}, {{ date('d F Y') }}</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none;">&nbsp;</td>
                <td style="border: none;">&nbsp;</td>
                <td colspan="2" style="border: none; text-align: center; vertical-align: middle;">Guru Penanggung Jawab</td>
            </tr>
            <tr><td colspan="6" style="border: none; height: 60px;">&nbsp;</td></tr>
            <tr>
                <td colspan="3" style="border: none;">&nbsp;</td>
                <td style="border: none;">&nbsp;</td>
                <td colspan="2" style="border: none; text-align: center; vertical-align: middle;">( {{ strtoupper(\App\Models\Setting::get('teacher_responsible_name', '__________________________')) }} )</td>
            </tr>
        </tfoot>
    </table>
</body>
</html>
