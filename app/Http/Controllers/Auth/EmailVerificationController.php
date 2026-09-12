<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function show(Request $request)
    {
        return $request->user()->hasVerifiedEmail()
                    ? redirect()->intended(route('dashboard', absolute: false))
                    : Inertia::render('Auth/VerifyEmail', [
                        'status' => session('status'),
                    ]);
    }

    /**
     * Send a new OTP verification email.
     */
    public function sendOtp(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            return back()->with('info', 'Akun Anda memiliki Authenticator (TOTP) aktif. Anda dapat langsung memasukkan kode 6-digit dari aplikasi Authenticator Anda tanpa perlu menunggu email.');
        }

        $success = OtpService::send(Auth::id(), $user->email, 'email_verification', 'email');

        if ($success) {
            return back()->with('success', 'Kode OTP telah dikirim ke alamat email Anda.');
        }

        return back()->with('error', 'Gagal mengirim OTP. Pastikan konfigurasi email sudah benar.');
    }

    /**
     * Verify the email address using OTP or TOTP.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'otp' => ['required', 'string'],
        ]);

        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $isValid = false;

        // If user has 2FA enabled, allow verifying via TOTP code
        if ($user->hasEnabledTwoFactorAuthentication() && $user->verifyTwoFactorCode($request->otp)) {
            $isValid = true;
        } elseif (OtpService::verify($user->email, $request->otp, 'email_verification')) {
            $isValid = true;
        }

        if (!$isValid) {
            return back()->withErrors(['otp' => 'Kode OTP / TOTP tidak valid atau sudah kedaluwarsa.']);
        }

        $user->markEmailAsVerified();

        return redirect()->intended(route('dashboard', absolute: false))->with('success', 'Email Anda telah berhasil diverifikasi.');
    }
}
