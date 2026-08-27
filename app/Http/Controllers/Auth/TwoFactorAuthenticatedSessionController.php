<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\TurnstileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;

class TwoFactorAuthenticatedSessionController extends Controller
{
    /**
     * Show the two factor authentication challenge view.
     */
    public function create(Request $request)
    {
        if (!$request->session()->has('login.id')) {
            return redirect()->route('login');
        }

        $user = User::find($request->session()->get('login.id'));

        if (!$user) {
            $request->session()->forget(['login.id', 'login.remember']);
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'status' => session('status'),
            'user_name' => $user->name,
            'user_email' => $user->email,
        ]);
    }

    /**
     * Attempt to authenticate the user using a two factor code or recovery code.
     */
    public function store(Request $request)
    {
        if (!$request->session()->has('login.id')) {
            return redirect()->route('login');
        }

        $user = User::find($request->session()->get('login.id'));

        if (!$user || !$user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->forget(['login.id', 'login.remember']);
            return redirect()->route('login');
        }

        $throttleKey = 'two-factor.' . $user->id . '.' . $request->ip();

        // Cloudflare Turnstile verification
        if (config('turnstile.enabled', true)) {
            $token = $request->input('cf-turnstile-response', '');
            if (!TurnstileService::verify($token, $request->ip())) {
                return back()->withErrors([
                    'turnstile' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.',
                ]);
            }
        }

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return back()->withErrors([
                'code' => "Terlalu banyak percobaan verifikasi 2FA. Silakan tunggu {$seconds} detik lagi.",
            ]);
        }

        $code = $request->input('code');
        $recoveryCode = $request->input('recovery_code');

        if ($code) {
            $cleanedCode = preg_replace('/\s+/', '', (string) $code);
            $provider = app(TwoFactorAuthenticationProvider::class);

            $secret = decrypt($user->two_factor_secret);
            $isValid = $provider->verify($secret, $cleanedCode);

            if (!$isValid) {
                RateLimiter::hit($throttleKey, 60);
                return back()->withErrors([
                    'code' => 'Kode autentikasi 6-digit tidak valid atau sudah kedaluwarsa. Pastikan waktu di perangkat Anda sesuai.',
                ]);
            }
        } elseif ($recoveryCode) {
            $cleanedRecoveryCode = trim((string) $recoveryCode);
            $recoveryCodes = $user->recoveryCodes() ?? [];

            $foundCode = collect($recoveryCodes)->first(function ($code) use ($cleanedRecoveryCode) {
                return hash_equals($code, $cleanedRecoveryCode);
            });

            if (!$foundCode) {
                RateLimiter::hit($throttleKey, 60);
                return back()->withErrors([
                    'recovery_code' => 'Kode pemulihan (recovery code) tidak valid atau sudah pernah digunakan.',
                ]);
            }

            // Consume the recovery code so it cannot be used again
            $user->replaceRecoveryCode($foundCode);
        } else {
            return back()->withErrors([
                'code' => 'Silakan masukkan kode autentikasi atau kode pemulihan.',
            ]);
        }

        // Verification successful
        RateLimiter::clear($throttleKey);

        $remember = $request->session()->pull('login.remember', false);
        $request->session()->forget('login.id');

        Auth::login($user, $remember);
        $request->session()->regenerate();

        $identifier = $user->getIdentifier();
        $isUsingDefaultPassword = Hash::check($identifier, $user->password);

        if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
            $request->session()->put('force_password_change', true);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        // Audit Log
        AuditLog::logActivity(
            'login_2fa',
            $code ? 'User berhasil login dengan verifikasi 2FA (Authenticator App)' : 'User berhasil login dengan Kode Pemulihan 2FA (Recovery Code)',
            'success'
        );

        if ($user->role === 'nasabah' && $isUsingDefaultPassword) {
            return redirect()
                ->route('nasabah.profil.index')
                ->with('warning', 'Untuk keamanan akun, Anda wajib mengganti password default Anda.');
        }

        return redirect()->intended(match ($user->role) {
            'superadmin' => route('superadmin.dashboard'),
            'admin' => route('admin.dashboard'),
            'teller' => route('teller.dashboard'),
            'nasabah' => route('nasabah.dashboard'),
            default => route('home'),
        });
    }
}
