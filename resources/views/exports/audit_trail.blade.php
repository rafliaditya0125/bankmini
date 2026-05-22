<!DOCTYPE html>
<html>
<head>
    <title>{{ $title }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .header h2 { margin: 4px 0 0 0; font-size: 13px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 6px 4px; vertical-align: top; word-wrap: break-word; }
        th { background: #f0f0f0; text-transform: uppercase; font-size: 10px; }
        .text-center { text-align: center; }
        .no-print { margin-bottom: 16px; text-align: right; }
        .footer { margin-top: 20px; text-align: right; }
        @media print {
            .no-print { display: none; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()" style="padding: 8px 14px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
            CETAK
        </button>
    </div>

    <div class="header">
        <h1>Laporan Audit Trail</h1>
        <h2>{{ \App\Models\Setting::get('bank_name', 'BANK MINI SMEACIS') }}</h2>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 12%;">Waktu</th>
                <th style="width: 12%;">User</th>
                <th style="width: 8%;">Role</th>
                <th style="width: 10%;">Aksi</th>
                <th style="width: 27%;">Deskripsi</th>
                <th style="width: 10%;">IP</th>
                <th style="width: 14%;">User Agent</th>
                <th style="width: 7%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $row)
                <tr>
                    <td class="text-center">{{ optional($row->created_at)->timezone($timezone)->format('d/m/Y H:i:s') }}</td>
                    <td>{{ strtoupper($row->user_name) }}</td>
                    <td class="text-center">{{ strtoupper($row->role) }}</td>
                    <td class="text-center">{{ strtoupper(str_replace('_', ' ', $row->action)) }}</td>
                    <td>{{ $row->description }}</td>
                    <td class="text-center">{{ $row->ip_address }}</td>
                    <td>{{ $row->user_agent }}</td>
                    <td class="text-center">{{ strtoupper($row->status) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data audit trail.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>{{ strtoupper(\App\Models\Setting::get('bank_city', 'TASIKMALAYA')) }}, {{ date('d F Y') }}</p>
    </div>
</body>
</html>
