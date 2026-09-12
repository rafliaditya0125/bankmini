<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\CaptchaService;
use App\Services\TrustedDeviceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LoginController extends Controller
{
    public function __construct(
        private readonly TrustedDeviceService $trustedDeviceService,
    ) {}
    /**
     * Display the login view.
     */
    public function create()
    {
        $isDemo = Setting::get('demo_mode', '0') === '1';
        $demoAccounts = [];
        $demoPassword = Setting::get('demo_password', 'password');

        if ($isDemo) {
            $accountIds = json_decode(Setting::get('demo_accounts', '[]'), true) ?: [];
            if (!empty($accountIds)) {
                $demoAccounts = User::whereIn('id', array_map('intval', $accountIds))
                    ->where('status', 'active')
                    ->select('id', 'name', 'username', 'email', 'role', 'user_type', 'nis', 'nip', 'profile_photo_path')
                    ->get()
                    ->map(function ($u) {
                        return [
                            'id' => $u->id,
                            'name' => $u->name,
                            'username' => $u->username,
                            'email' => $u->email,
                            'role' => $u->role,
                            'user_type' => $u->user_type,
                            'nis' => $u->nis,
                            'nip' => $u->nip,
                            'identifier' => $u->getIdentifier(),
                            'profile_photo_url' => $u->profile_photo_url,
                        ];
                    })
                    ->values();
            }
        }

        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'otp_channel' => env('OTP_CHANNEL', 'whatsapp'),
            'demo_mode' => $isDemo,
            'demo_accounts' => $demoAccounts,
            'demo_password' => $demoPassword,
        ]);
    }

    /**
     * Handle quick login for demo accounts.
     */
    public function demoLogin(Request $request)
    {
        if (Setting::get('demo_mode', '0') !== '1') {
            return back()->withErrors(['login' => 'Mode demo saat ini tidak aktif.']);
        }

        $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $demoAccountIds = json_decode(Setting::get('demo_accounts', '[]'), true) ?: [];

        if (!in_array((int) $request->user_id, array_map('intval', $demoAccountIds), true)) {
            return back()->withErrors(['login' => 'Akun demo tidak valid atau tidak terdaftar.']);
        }

        $user = User::find($request->user_id);
        if (!$user || !$user->isActive()) {
            return back()->withErrors(['login' => 'Akun demo tidak aktif atau tidak ditemukan.']);
        }

        Auth::login($user);
        $request->session()->regenerate();

        $user->update(['last_login_at' => now()]);

        AuditLog::logActivity(
            'demo_login',
            "Login demo sebagai {$user->name} ({$user->role})",
            'success'
        );

        return redirect()->intended(match ($user->role) {
            'superadmin' => route('superadmin.dashboard'),
            'admin'      => route('admin.dashboard'),
            'teller'     => route('teller.dashboard'),
            'nasabah'    => route('nasabah.dashboard'),
            default      => route('home'),
        });
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

        // CAPTCHA verification (Turnstile primary / reCAPTCHA backup)
        if (CaptchaService::enabled()) {
            if (!CaptchaService::verify($request)) {
                return back()->withErrors([
                    'captcha' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.',
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

        $isDemo = Setting::get('demo_mode', '0') === '1';
        $isDemoUser = false;
        if ($isDemo && $user) {
            $demoAccountIds = json_decode(Setting::get('demo_accounts', '[]'), true) ?: [];
            $isDemoUser = in_array((int) $user->id, array_map('intval', $demoAccountIds), true);
        }

        $passwordValid = $user && (
            Hash::check($request->password, $user->password) ||
            ($isDemoUser && $request->password === Setting::get('demo_password', 'password'))
        );

        if ($user && $passwordValid) {
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

            // If Two-Factor Authentication is enabled, check for trusted device first (skip 2FA challenge for demo accounts in demo mode)
            if ($user->hasEnabledTwoFactorAuthentication() && !$isDemoUser) {
                // Trusted device? Skip 2FA entirely
                if ($this->trustedDeviceService->isTrusted($user, $request)) {
                    Auth::login($user, $request->boolean('remember'));
                    $request->session()->regenerate();

                    $identifier = $user->getIdentifier();
                    $isUsingDefaultPassword = Hash::check($identifier, $user->password);

                    if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
                        $request->session()->put('force_password_change', true);
                    }

                    $user->update(['last_login_at' => now()]);

                    AuditLog::logActivity(
                        'login_trusted_device',
                        'User berhasil login tanpa 2FA via perangkat terpercaya',
                        'success'
                    );

                    if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
                        return redirect()
                            ->route('nasabah.profil.index')
                            ->with('warning', 'Untuk keamanan akun, Anda wajib mengganti password default Anda.');
                    }

                    return redirect()->intended(match ($user->role) {
                        'superadmin' => route('superadmin.dashboard'),
                        'admin'      => route('admin.dashboard'),
                        'teller'     => route('teller.dashboard'),
                        'nasabah'    => route('nasabah.dashboard'),
                        default      => route('home'),
                    });
                }

                // Not trusted → go through 2FA challenge
                $request->session()->put([
                    'login.id'       => $user->getKey(),
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
