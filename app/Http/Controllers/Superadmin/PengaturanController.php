<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\ReportLog;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PengaturanController extends Controller
{
    public function index()
    {
        $role = auth()->user()->role;
        $settings = $this->getSettings();

        if ($role === 'admin') {
            $allowedKeys = $this->getAllowedKeysForAdmin();
            $settings = array_intersect_key($settings, array_flip($allowedKeys));
        }

        return Inertia::render('superadmin/Pengaturan', [
            'settings' => $settings,
            'reportHistory' => ReportLog::with('user')->latest()->take(10)->get()
        ]);
    }

    public function store(Request $request)
    {
        $role = auth()->user()->role;
        $inputSettings = $request->all();

        if ($role === 'admin') {
            $allowedKeys = $this->getAllowedKeysForAdmin();
            $inputSettings = array_intersect_key($inputSettings, array_flip($allowedKeys));
        }

        foreach ($inputSettings as $key => $value) {
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            Setting::set($key, $value);
        }

        return back()->with('success', 'Pengaturan berhasil disimpan');
    }

    private function getAllowedKeysForAdmin()
    {
        return [
            // UMUM
            'bank_name', 'school_name', 'address', 'bank_city', 'phone',
            // KEAMANAN
            'ip_blacklist', 'throttle_login_limit', 'throttle_transaction_limit',
            // TRANSAKSI
            'min_deposit', 'min_withdraw', 'max_transfer', 'daily_transfer_limit',
            'monthly_interest_rate_siswa', 'monthly_interest_rate_kelas', 'monthly_interest_rate_organisasi', 'monthly_interest_rate_guru',
            'monthly_admin_fee_siswa', 'monthly_admin_fee_kelas', 'monthly_admin_fee_organisasi', 'monthly_admin_fee_guru',
            'monthly_process_day', 'monthly_process_hour',
            'min_cash_denomination', 'transaction_types', 'bkk_bkm_mode',
            // LAPORAN
            'teacher_responsible_name',
            // NASABAH
            'alumni_retention_years', 'alumni_retention_days',
            // SESSION
            'session_lifetime',

        ];
    }

    public function generateReport(Request $request)
    {
        $request->validate([
            'type' => 'required|in:daily,monthly,manual',
            'format' => 'required|in:pdf,csv,excel',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $format = $request->format;
        $type = $request->type;
        $dateStr = "";

        if ($request->date_from && $request->date_to) {
            $dateStr = "_" . str_replace('-', '', $request->date_from) . "_to_" . str_replace('-', '', $request->date_to);
        }

        $filename = "report_" . $type . $dateStr . "_" . date('YmdHis') . "." . ($format === 'pdf' ? 'pdf' : ($format === 'excel' ? 'xlsx' : 'csv'));
        $path = 'reports/' . $filename;

        if (!Storage::disk('local')->exists('reports')) {
            Storage::disk('local')->makeDirectory('reports');
        }

        // Logic for filtering transactions based on date range
        $query = Transaksi::query();
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        $transactions = $query->get();

        // Dummy content for now, ideally use a reporting library
        $content = "Report generated on " . date('Y-m-d H:i:s') . "\n";
        $content .= "Type: " . $type . "\n";
        $content .= "Format: " . $format . "\n";
        if ($request->date_from) $content .= "From: " . $request->date_from . "\n";
        if ($request->date_to) $content .= "To: " . $request->date_to . "\n";
        $content .= "Total Transactions: " . $transactions->count() . "\n";

        Storage::disk('local')->put($path, $content);

        ReportLog::create([
            'filename' => $filename,
            'type' => $type,
            'format' => $format,
            'size' => round(strlen($content) / 1024, 2) . ' KB',
            'user_id' => auth()->id()
        ]);

        return back()->with('success', 'Laporan berhasil digenerate: ' . $filename);
    }

    public function downloadReport($filename)
    {
        if (Storage::disk('local')->exists('reports/' . $filename)) {
            return Storage::disk('local')->download('reports/' . $filename);
        }
        abort(404);
    }

    private function getSettings()
    {
        return [
            // UMUM
            'bank_name' => Setting::get('bank_name', 'BANK MINI SMK'),
            'school_name' => Setting::get('school_name', 'SMK NEGERI 1 CIAMIS'),
            'address' => Setting::get('address', 'Jl. Pendidikan No. 123, Jakarta'),
            'bank_city' => Setting::get('bank_city', 'Tasikmalaya'),
            'phone' => Setting::get('phone', '(021) 1234-5678'),




            // KEAMANAN
            'ip_whitelist' => Setting::get('ip_whitelist', ''),
            'encryption_method' => Setting::get('encryption_method', 'AES-256'),
            'log_retention' => (int) Setting::get('log_retention', 365),

            'ip_blacklist' => Setting::get('ip_blacklist', ''),

            // TRANSAKSI
            'min_deposit' => (int) Setting::get('min_deposit', 1000),
            'min_withdraw' => (int) Setting::get('min_withdraw', 1000),
            'max_transfer' => (int) Setting::get('max_transfer', 5000000),
            'daily_transfer_limit' => (int) Setting::get('daily_transfer_limit', 10000000),

            // SISTEM BUNGA & BIAYA
            // Keep legacy global keys as fallback for old data
            'monthly_interest_rate' => (float) Setting::get('monthly_interest_rate', 0.1),
            'monthly_admin_fee' => (int) Setting::get('monthly_admin_fee', 5000),
            'monthly_interest_rate_siswa' => (float) Setting::get('monthly_interest_rate_siswa', Setting::get('monthly_interest_rate', 0.1)),
            'monthly_interest_rate_kelas' => (float) Setting::get('monthly_interest_rate_kelas', Setting::get('monthly_interest_rate', 0.1)),
            'monthly_interest_rate_organisasi' => (float) Setting::get('monthly_interest_rate_organisasi', Setting::get('monthly_interest_rate', 0.1)),
            'monthly_interest_rate_guru' => (float) Setting::get('monthly_interest_rate_guru', Setting::get('monthly_interest_rate', 0.1)),
            'monthly_admin_fee_siswa' => (int) Setting::get('monthly_admin_fee_siswa', Setting::get('monthly_admin_fee', 5000)),
            'monthly_admin_fee_kelas' => (int) Setting::get('monthly_admin_fee_kelas', Setting::get('monthly_admin_fee', 5000)),
            'monthly_admin_fee_organisasi' => (int) Setting::get('monthly_admin_fee_organisasi', Setting::get('monthly_admin_fee', 5000)),
            'monthly_admin_fee_guru' => (int) Setting::get('monthly_admin_fee_guru', Setting::get('monthly_admin_fee', 5000)),
            'monthly_process_day' => (int) Setting::get('monthly_process_day', 28),
            'min_cash_denomination' => (int) Setting::get('min_cash_denomination', 100),
            'transaction_types' => Setting::get('transaction_types', 'Tunai, Transfer, Kliring, Cek / BG'),
            'bkk_bkm_mode' => Setting::get('bkk_bkm_mode', 'manual'),

            // LAPORAN
            'teacher_responsible_name' => Setting::get('teacher_responsible_name', 'Nama Guru Penanggung Jawab'),
            'throttle_login_limit' => (int) Setting::get('throttle_login_limit', 5),
            'throttle_transaction_limit' => (int) Setting::get('throttle_transaction_limit', 60),

            // DATABASE
            'db_host' => Setting::get('db_host', config('database.connections.mysql.host')),
            'db_port' => Setting::get('db_port', config('database.connections.mysql.port')),
            'db_name' => Setting::get('db_name', config('database.connections.mysql.database')),
            'db_timeout' => (int) Setting::get('db_timeout', 30),
            'db_cache_size' => (int) Setting::get('db_cache_size', 64),
            'db_max_connections' => (int) Setting::get('db_max_connections', 100),
            'db_optimize_schedule' => Setting::get('db_optimize_schedule', 'Daily at 02:00'),
            'db_log_retention' => (int) Setting::get('db_log_retention', 30),

            // SISTEM
            'app_url' => Setting::get('app_url', config('app.url')),
            'timezone' => Setting::get('timezone', 'Asia/Jakarta'),
            'language' => Setting::get('language', 'id'),
            'cache_ttl' => (int) Setting::get('cache_ttl', 60),
            'log_level' => Setting::get('log_level', 'Info'),
            'max_log_size' => (int) Setting::get('max_log_size', 100),
            'api_rate_limit' => (int) Setting::get('api_rate_limit', 60),
            'api_token_expiry' => (int) Setting::get('api_token_expiry', 24),
            'maintenance_mode' => Setting::get('maintenance_mode', '0'),

            // NOTIFIKASI & OTP
            'notification_email_active' => Setting::get('notification_email_active', '1'),
            'notification_whatsapp_active' => Setting::get('notification_whatsapp_active', '0'),
            'email_provider' => Setting::get('email_provider', 'resend'),
            
            // CONTOH RESEND
            'resend_api_key' => Setting::get('resend_api_key', ''),
            
            // CONTOH SMTP
            'smtp_host' => Setting::get('smtp_host', 'smtp.mailtrap.io'),
            'smtp_port' => Setting::get('smtp_port', '2525'),
            'smtp_username' => Setting::get('smtp_username', ''),
            'smtp_password' => Setting::get('smtp_password', ''),
            'smtp_encryption' => Setting::get('smtp_encryption', 'tls'),
            'smtp_from_address' => Setting::get('smtp_from_address', 'hello@example.com'),
            'smtp_from_name' => Setting::get('smtp_from_name', 'Bank Mini SMK'),

            // NASABAH
            'alumni_retention_years' => (int) Setting::get('alumni_retention_years', 3),
            'alumni_retention_days' => (int) Setting::get('alumni_retention_days', 0),
            'session_lifetime' => (int) Setting::get('session_lifetime', 7),

        ];
    }
}
