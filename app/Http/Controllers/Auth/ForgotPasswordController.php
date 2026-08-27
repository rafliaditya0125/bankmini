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

        // CAPTCHA verification
        if (CaptchaService::enabled()) {
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

        $channel = env('OTP_CHANNEL', 'whatsapp');
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
            return back()->withErrors(['login' => 'Akun ini tidak memiliki nomor WhatsApp atau Email terdaftar. Silakan hubungi admin.']);
        }

        $success = OtpService::send($user->id, $target, 'guest_password_reset', $channel);

        if ($success) {
            $isEmailChannel = $channel === 'email' || $channel === 'resend';
            return back()->with([
                'success' => 'Kode OTP telah dikirim ke ' . ($isEmailChannel ? 'Email' : 'WhatsApp') . ' Anda.',
                'target_masked' => $isEmailChannel ? $this->maskEmail($target) : $this->maskPhone($target),
                'channel' => $channel,
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
            'otp' => 'required|string|size:6',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::findByIdentity($request->login);

        if (!$user) {
            return back()->withErrors(['login' => 'Pengguna tidak ditemukan.']);
        }

        $isEmailChannel = $request->channel === 'email' || $request->channel === 'resend';
        $target = $isEmailChannel ? $user->email : $user->phone;

        if (!OtpService::verify($target, $request->otp, 'guest_password_reset')) {
            return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return redirect()->route('login')->with('success', 'Berhasil ubah password dengan OTP. Silakan login dengan password baru Anda.');
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
