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
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $success = OtpService::send(Auth::id(), $request->user()->email, 'email_verification', 'email');

        if ($success) {
            return back()->with('success', 'Kode OTP telah dikirim ke alamat email Anda.');
        }

        return back()->with('error', 'Gagal mengirim OTP. Pastikan konfigurasi email sudah benar.');
    }

    /**
     * Verify the email address using OTP.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        if (!OtpService::verify($request->user()->email, $request->otp, 'email_verification')) {
            return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
        }

        $request->user()->markEmailAsVerified();

        return redirect()->intended(route('dashboard', absolute: false))->with('success', 'Email Anda telah berhasil diverifikasi.');
    }
}
