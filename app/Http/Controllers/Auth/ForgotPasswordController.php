<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CaptchaService;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ForgotPasswordController extends Controller
{

    public function sendResetOtp(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
        ]);

        $sessionVerifiedLogin = $request->session()->get('password_reset_login');
        $isAlreadyVerified = $sessionVerifiedLogin
            && $sessionVerifiedLogin === $request->login
            && $request->session()->get('password_reset_captcha_verified');

        $isStep2Request = $request->has('requested_channel')
            || $request->input('step') == 2
            || $request->boolean('resend');

        // CAPTCHA verification:
        // Fresh CAPTCHA is required for Step 1 (identity check).
        // Step 2 operations (switching between TOTP/Email/WhatsApp or resending OTP)
        // reuse the human-verified session state.
        if (CaptchaService::enabled() && (!$isAlreadyVerified || !$isStep2Request)) {
            if (!CaptchaService::verify($request)) {
                return back()->withErrors([
                    'captcha' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.',
                ]);
            }
        }

        $user = User::findByIdentity($request->login);

        if (!$user) {
            return back()->withErrors(['login' => 'Pengguna tidak ditemukan.']);
        }

        // Store identity & captcha verification in session for Step 2 operations
        $request->session()->put('password_reset_captcha_verified', true);
        $request->session()->put('password_reset_login', $request->login);
        $request->session()->put('password_reset_user_id', $user->id);

        $requestedChannel = $request->input('requested_channel', $request->input('channel'));

        // If user has 2FA enabled:
        // Default to TOTP directly unless user explicitly chose an alternative channel like email or whatsapp
        if ($user->hasEnabledTwoFactorAuthentication() && ($requestedChannel === 'totp' || empty($requestedChannel))) {
            return back()->with([
                'success' => 'Akun Anda dilindungi Authenticator (TOTP). Masukkan kode 6-digit dari aplikasi Authenticator Anda.',
                'target_masked' => 'Aplikasi Authenticator (TOTP)',
                'channel' => 'totp',
                'has_totp' => true,
                'available_channels' => [
                    'totp' => true,
                    'email' => !empty($user->email) ? $this->maskEmail($user->email) : null,
                    'whatsapp' => !empty($user->phone) ? $this->maskPhone($user->phone) : null,
                    'recovery' => true,
                ],
                'step' => 2,
                'login_verified' => $request->login,
            ]);
        }

        $channel = $requestedChannel ?: env('OTP_CHANNEL', 'whatsapp');
        $isEmailChannel = $channel === 'email' || $channel === 'resend';
        $target = $isEmailChannel ? $user->email : $user->phone;
        
        // Fallback logic
        if (empty($target)) {
            if (!$isEmailChannel && !empty($user->email)) {
                $channel = 'email';
                $target = $user->email;
            } elseif ($isEmailChannel && !empty($user->phone)) {
                $channel = 'whatsapp';
                $target = $user->phone;
            }
        }

        if (empty($target)) {
            return back()->withErrors(['login' => 'Akun ini tidak memiliki nomor WhatsApp atau Email terdaftar untuk pengiriman OTP.']);
        }

        $success = OtpService::send($user->id, $target, 'guest_password_reset', $channel);

        if ($success) {
            $isEmailChannel = $channel === 'email' || $channel === 'resend';
            return back()->with([
                'success' => 'Kode OTP telah dikirim ke ' . ($isEmailChannel ? 'Email' : 'WhatsApp') . ' Anda.',
                'target_masked' => $isEmailChannel ? $this->maskEmail($target) : $this->maskPhone($target),
                'channel' => $channel,
                'has_totp' => $user->hasEnabledTwoFactorAuthentication(),
                'available_channels' => [
                    'totp' => $user->hasEnabledTwoFactorAuthentication(),
                    'email' => !empty($user->email) ? $this->maskEmail($user->email) : null,
                    'whatsapp' => !empty($user->phone) ? $this->maskPhone($user->phone) : null,
                    'recovery' => $user->hasEnabledTwoFactorAuthentication(),
                ],
                'step' => 2,
                'login_verified' => $request->login
            ]);
        }

        return back()->withErrors(['login' => 'Gagal mengirim OTP. Pastikan konfigurasi pengiriman sudah benar.']);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'channel' => 'required|string',
            'otp' => 'required|string',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::findByIdentity($request->login);

        if (!$user) {
            return back()->withErrors(['login' => 'Pengguna tidak ditemukan.']);
        }

        $channel = $request->channel;

        if ($channel === 'totp' || $channel === 'recovery') {
            if (!$user->verifyTwoFactorCode($request->otp)) {
                return back()->withErrors([
                    'otp' => $channel === 'recovery'
                        ? 'Kode Pemulihan (Recovery Code) tidak valid atau telah digunakan.'
                        : 'Kode Authenticator TOTP tidak valid atau sudah kedaluwarsa.'
                ]);
            }
        } elseif ($channel === 'email' || $channel === 'whatsapp' || $channel === 'resend') {
            $isEmailChannel = $channel === 'email' || $channel === 'resend';
            $target = $isEmailChannel ? $user->email : $user->phone;

            if (!OtpService::verify($target, $request->otp, 'guest_password_reset')) {
                return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
            }
        } else {
            // Fallback checking
            if ($user->hasEnabledTwoFactorAuthentication()) {
                if (!$user->verifyTwoFactorCode($request->otp) && !OtpService::verify($user->phone ?? $user->email, $request->otp, 'guest_password_reset')) {
                    return back()->withErrors(['otp' => 'Kode verifikasi tidak valid atau sudah kedaluwarsa.']);
                }
            } else {
                if (!OtpService::verify($user->phone ?? $user->email, $request->otp, 'guest_password_reset')) {
                    return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
                }
            }
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        $request->session()->forget([
            'password_reset_captcha_verified',
            'password_reset_login',
            'password_reset_user_id',
        ]);

        return redirect()->route('login')->with('success', 'Berhasil ubah password. Silakan login dengan password baru Anda.');
    }

    private function maskPhone(string $phone): string
    {
        $len = strlen($phone);
        if ($len < 8) return $phone;
        return substr($phone, 0, 4) . str_repeat('*', $len - 8) . substr($phone, -4);
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        $name = $parts[0];
        $domain = $parts[1];
        $len = strlen($name);
        if ($len < 3) return $email;
        return substr($name, 0, 2) . str_repeat('*', $len - 2) . '@' . $domain;
    }
}
