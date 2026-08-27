<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\TurnstileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LoginController extends Controller
{
    /**
     * Display the login view.
     */
    public function create()
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'otp_channel' => env('OTP_CHANNEL', 'whatsapp'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'login'    => ['required', 'string'],
            'password' => ['required'],
        ]);

        // Cloudflare Turnstile verification
        if (config('turnstile.enabled', true)) {
            $token = $request->input('cf-turnstile-response', '');
            if (!TurnstileService::verify($token, $request->ip())) {
                return back()->withErrors([
                    'turnstile' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.',
                ])->onlyInput('login');
            }
        }

        $maxAttempts = (int) Setting::get('throttle_login_limit', 5);
        $throttleKey = $this->throttleKey($request);
        $lockoutCountKey = $throttleKey . '.lockout_count';

        // Cek apakah sudah terkena rate limit
        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            // Log activity for security monitoring
            AuditLog::logActivity(
                'login_throttle',
                "Terlalu banyak percobaan login dari IP: {$request->ip()}. Terkunci selama {$seconds} detik.",
                'warning'
            );

            return back()->withErrors([
                'throttle' => $seconds,
            ])->onlyInput('login');
        }

        // Coba cari user berdasarkan identitas apapun
        $user = User::findByIdentity($request->login);

        if ($user && Hash::check($request->password, $user->password)) {
            // Check if user is active
            if (!$user->isActive()) {
                RateLimiter::hit($throttleKey, 60);
                return back()->withErrors([
                    'login' => 'Akun Anda sedang tidak aktif. Silakan hubungi admin.',
                ])->onlyInput('login');
            }

            // Login berhasil — hapus rate limit dan penghitung progresif
            RateLimiter::clear($throttleKey);
            cache()->forget($lockoutCountKey);

            // If Two-Factor Authentication is enabled and confirmed, redirect to 2FA challenge
            if ($user->hasEnabledTwoFactorAuthentication()) {
                $request->session()->put([
                    'login.id' => $user->getKey(),
                    'login.remember' => $request->boolean('remember'),
                ]);

                return redirect()->route('two-factor.login');
            }

            $identifier = $user->getIdentifier();
            $isUsingDefaultPassword = Hash::check($identifier, $user->password);

            Auth::login($user, $request->boolean('remember'));
            $request->session()->regenerate();

            if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
                $request->session()->put('force_password_change', true);
            }

            // Update last login timestamp
            $user->update(['last_login_at' => now()]);

            // Log login activity
            AuditLog::logActivity(
                'login',
                'User berhasil login ke sistem',
                'success'
            );

            if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
                return redirect()
                    ->route('nasabah.profil.index')
                    ->with('warning', 'Untuk keamanan akun, Anda wajib mengganti password default Anda (tidak boleh sama dengan NIS/NIP/No. Rekening).');
            }

            // Redirect based on role
            return redirect()->intended(match ($user->role) {
                'superadmin' => route('superadmin.dashboard'),
                'admin' => route('admin.dashboard'),
                'teller' => route('teller.dashboard'),
                'nasabah' => route('nasabah.dashboard'),
                default => route('home'),
            });
        }

        // Percobaan gagal — tambah hit rate limiter
        RateLimiter::hit($throttleKey, 60);
        $attempts = RateLimiter::attempts($throttleKey);
        $remaining = max(0, $maxAttempts - $attempts);

        // Jika setelah hit ini mencapai batas, kita set durasi progresif
        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            $lockoutCount = cache()->get($lockoutCountKey, 0);
            
            // Definisikan durasi progresif dalam detik: 1m, 5m, 15m, 30m, 60m
            $durations = [60, 300, 900, 1800, 3600];
            $decay = $durations[min($lockoutCount, 4)];

            // Reset limiter dan isi kembali sampai batas maksimal dengan decay baru
            RateLimiter::clear($throttleKey);
            for ($i = 0; $i < $maxAttempts; $i++) {
                RateLimiter::hit($throttleKey, $decay);
            }

            // Increment jumlah lockout untuk percobaan berikutnya (berlaku selama 24 jam)
            cache()->put($lockoutCountKey, $lockoutCount + 1, now()->addDay());

            return back()->withErrors([
                'login' => 'Terlalu banyak percobaan login. Akun Anda dibatasi sementara.',
                'throttle' => $decay,
            ])->onlyInput('login');
        }

        return back()->withErrors([
            'login' => "Username / NIS / NIP atau password salah. Sisa {$remaining} percobaan lagi.",
        ])->onlyInput('login');
    }

    /**
     * Buat kunci throttle unik per IP.
     */
    protected function throttleKey(Request $request): string
    {
        return 'login.' . $request->ip();
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        // Log logout activity
        if (Auth::check()) {
            AuditLog::logActivity(
                'logout',
                'User logout dari sistem',
                'success'
            );
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

}
