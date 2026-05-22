<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class BackupController extends Controller
{
    protected $backupDir = 'backups';

    public function index()
    {
        return Inertia::render('superadmin/Backup', [
            'backups' => $this->getBackups(),
            'backupSchedule' => $this->getBackupSchedule()
        ]);
    }

    public function create(Request $request)
    {
        $type = $request->input('type', 'full'); // full or incremental
        $filename = 'backup_' . $type . '_' . date('Y_m_d_His') . '.sql';
        
        if (!Storage::disk('local')->exists($this->backupDir)) {
            Storage::disk('local')->makeDirectory($this->backupDir);
        }

        $path = storage_path('app/' . $this->backupDir . '/' . $filename);

        if ($type === 'full') {
            $command = sprintf(
                'mysqldump --user=%s --password=%s --host=%s %s > %s',
                escapeshellarg(config('database.connections.mysql.username')),
                escapeshellarg(config('database.connections.mysql.password')),
                escapeshellarg(config('database.connections.mysql.host')),
                escapeshellarg(config('database.connections.mysql.database')),
                escapeshellarg($path)
            );
        } else {
            // Incremental: For our app, let's backup only transaction related tables
            $tables = 'transaksi nasabahs audit_trails audit_logs';
            $command = sprintf(
                'mysqldump --user=%s --password=%s --host=%s %s %s > %s',
                escapeshellarg(config('database.connections.mysql.username')),
                escapeshellarg(config('database.connections.mysql.password')),
                escapeshellarg(config('database.connections.mysql.host')),
                escapeshellarg(config('database.connections.mysql.database')),
                $tables,
                escapeshellarg($path)
            );
        }

        $process = Process::fromShellCommandline($command);
        
        try {
            $process->mustRun();
            return back()->with('success', 'Backup ' . $type . ' berhasil dibuat: ' . $filename);
        } catch (ProcessFailedException $exception) {
            \Log::error('Backup failed', ['error' => $exception->getMessage()]);
            return back()->with('error', 'Gagal membuat backup. Pastikan mysqldump tersedia.');
        }
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file'
        ]);

        $file = $request->file('file');
        $filename = 'upload_' . date('Y_m_d_His') . '_' . $file->getClientOriginalName();
        
        Storage::disk('local')->putFileAs($this->backupDir, $file, $filename);

        return back()->with('success', 'File SQL berhasil diunggah');
    }

    public function restore(Request $request)
    {
        $request->validate([
            'filename' => 'required|string',
            'mode' => 'required|in:full,latest' 
        ]);

        $path = storage_path('app/' . $this->backupDir . '/' . $request->filename);

        if (!file_exists($path)) {
            return back()->with('error', 'File backup tidak ditemukan.');
        }

        // Full restore: usually involves TRUNCATE or DROP if the SQL has it
        // Our mysqldump files include DROP TABLE IF EXISTS by default.
        
        $command = sprintf(
            'mysql --user=%s --password=%s --host=%s %s < %s',
            escapeshellarg(config('database.connections.mysql.username')),
            escapeshellarg(config('database.connections.mysql.password')),
            escapeshellarg(config('database.connections.mysql.host')),
            escapeshellarg(config('database.connections.mysql.database')),
            escapeshellarg($path)
        );

        $process = Process::fromShellCommandline($command);

        try {
            $process->mustRun();
            return back()->with('success', 'Data berhasil dipulihkan via ' . $request->mode . ' mode');
        } catch (\Exception $e) {
            \Log::error('Restore failed', ['error' => $e->getMessage()]);
            return back()->with('error', 'Gagal memulihkan data.');
        }
    }

    public function download($filename)
    {
        if (Storage::disk('local')->exists($this->backupDir . '/' . $filename)) {
            return Storage::disk('local')->download($this->backupDir . '/' . $filename);
        }
        abort(404);
    }

    public function destroy($filename)
    {
        if (Storage::disk('local')->exists($this->backupDir . '/' . $filename)) {
            Storage::disk('local')->delete($this->backupDir . '/' . $filename);
            return back()->with('success', 'File backup berhasil dihapus');
        }
        return back()->with('error', 'File tidak ditemukan');
    }

    private function getBackups()
    {
        if (!Storage::disk('local')->exists($this->backupDir)) {
            return [];
        }

        $files = Storage::disk('local')->files($this->backupDir);
        $backups = [];

        foreach ($files as $file) {
            $filename = basename($file);
            $backups[] = [
                'filename' => $filename,
                'size' => $this->formatBytes(Storage::disk('local')->size($file)),
                'created_at' => date('d M Y, H:i', Storage::disk('local')->lastModified($file)),
                'type' => $this->determineType($filename)
            ];
        }

        return array_reverse($backups);
    }

    private function determineType($filename)
    {
        if (str_contains($filename, 'full')) return 'full';
        if (str_contains($filename, 'incremental')) return 'incremental';
        if (str_contains($filename, 'upload')) return 'upload';
        return 'manual';
    }

    private function getBackupSchedule()
    {
        $last = $this->getBackups();
        return [
            'frequency' => 'Daily',
            'time' => '02:00',
            'retention_days' => 30,
            'is_active' => false,
            'last_backup' => count($last) > 0 ? $last[0]['created_at'] : 'Belum ada',
            'next_backup' => 'Manual Only'
        ];
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
