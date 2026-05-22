<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\AuditLog;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;

class AuditTrailController extends Controller
{
    public function index(Request $request)
    {
        $filters = [
            'action' => $request->input('action'),
            'user' => $request->input('search', $request->input('user')),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $query = AuditLog::getFilteredLogs($filters);

        if ($request->input('export') === 'excel') {
            return $this->exportExcel($query->get());
        }

        if ($request->input('export') === 'pdf') {
            return $this->exportPdf($query->get());
        }

        // Apply pagination
        $logs = $query->paginate(20)->withQueryString();

        return Inertia::render('superadmin/AuditTrail', [
            'logs' => [
                'data' => $logs->items(),
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage()
            ],
            'filters' => [
                'search' => $filters['user'],
                'action' => $filters['action'],
                'date_from' => $filters['date_from'],
                'date_to' => $filters['date_to'],
                'page' => $request->input('page'),
            ]
        ]);
    }

    private function exportExcel($logs): StreamedResponse
    {
        $filename = 'audit_trail_' . now()->format('Ymd_His') . '.xlsx';
        $timezone = Setting::get('timezone', 'Asia/Jakarta');

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Audit Trail');

        $sheet->fromArray(['Waktu', 'User', 'Role', 'Aksi', 'Deskripsi', 'IP Address', 'User Agent', 'Status'], null, 'A1');

        $rowNum = 2;
        foreach ($logs as $log) {
            $sheet->fromArray([
                optional($log->created_at)->timezone($timezone)->format('d/m/Y H:i:s'),
                $log->user_name,
                $log->role,
                $log->action,
                $log->description,
                $log->ip_address,
                $log->user_agent,
                $log->status,
            ], null, "A{$rowNum}");
            $rowNum++;
        }

        $writer = new XlsxWriter($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exportPdf($logs)
    {
        return view('exports.audit_trail', [
            'title' => 'Audit Trail',
            'data' => $logs,
            'timezone' => Setting::get('timezone', 'Asia/Jakarta'),
        ]);
    }
}
