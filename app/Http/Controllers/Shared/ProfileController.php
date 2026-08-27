<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Actions\GenerateNewRecoveryCodes;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;

class ProfileController extends Controller
{
        /**
     * Display the profile page
     */
    public function index()
    {
        $user = Auth::user();
        
        // Load nasabah info if the user is a nasabah
        if ($user->role === 'nasabah') {
            $user->load('nasabah');
        }

        return Inertia::render('shared/Profile', [
            'user' => $user,
            'must_change_password' => session('force_password_change', false),
            'otp_channel' => env('OTP_CHANNEL', 'whatsapp'),
        ]);
    }

    /**
     * Update the user's profile photo.
     */
    public function updatePhoto(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'photo' => ['required', 'image', 'max:2048'], // Max 2MB
        ]);

        // Delete old photo if exists
        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        // Store new photo
        $path = $request->file('photo')->store('profile-photos', 'public');

        $user->update([
            'profile_photo_path' => $path,
        ]);

        return back()->with('success', 'Foto profil berhasil diperbarui.');
    }

    /**
     * Remove the user's profile photo.
     */
    public function removePhoto(Request $request)
    {
        $user = Auth::user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            
            $user->update([
                'profile_photo_path' => null,
            ]);
        }

        return back()->with('success', 'Foto profil berhasil dihapus.');
    }

    /**
     * Request OTP for phone change
     */
    public function requestPhoneOtp(Request $request)
    {
        $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $channel = env('OTP_CHANNEL', 'whatsapp');
        // Phone change always uses phone for the target, but channel could technically be email?
        // But if you're changing phone, you want to verify the NEW phone is yours. So channel should be whatsapp here.
        // Unless it's an email backup. For now, phone update verifies the phone.
        $success = OtpService::send(Auth::id(), $request->phone, 'phone_update', 'whatsapp');

        if ($success) {
            return back()->with('success', 'Kode OTP telah dikirim ke nomor WhatsApp baru Anda.');
        }

        return back()->with('error', 'Gagal mengirim OTP. Pastikan konfigurasi WhatsApp sudah benar.');
    }

    /**
     * Update the profile information (phone only for now)
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if (!OtpService::verify($request->phone, $request->otp, 'phone_update')) {
            return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
        }

        $user->update([
            'phone' => $request->phone,
        ]);

        return back()->with('success', 'Nomor telepon berhasil diperbarui.');
    }

    /**
     * Request OTP for password change
     */
    public function requestPasswordOtp(Request $request)
    {
        $user = Auth::user();
        $channel = env('OTP_CHANNEL', 'whatsapp');
        $isEmailChannel = $channel === 'email' || $channel === 'resend';
        $target = $isEmailChannel ? $user->email : $user->phone;

        if (empty($target)) {
            return back()->with('error', 'Anda harus memiliki ' . ($isEmailChannel ? 'Email' : 'Nomor Telepon') . ' yang terdaftar untuk menerima OTP.');
        }

        $success = OtpService::send($user->id, $target, 'password_reset', $channel);

        if ($success) {
            return back()->with('success', 'Kode OTP telah dikirim ke ' . ($isEmailChannel ? 'Email' : 'WhatsApp') . ' Anda.');
        }

        return back()->with('error', 'Gagal mengirim OTP. Pastikan konfigurasi pengiriman sudah benar.');
    }

    /**
     * Update the user's password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();
        $identifier = $user->getIdentifier();
        $channel = env('OTP_CHANNEL', 'whatsapp');
        $isEmailChannel = $channel === 'email' || $channel === 'resend';
        $target = $isEmailChannel ? $user->email : $user->phone;

        $rules = [
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required',
                Password::defaults(),
                'confirmed',
                function ($attribute, $value, $fail) use ($identifier) {
                    if (!empty($identifier) && $value === $identifier) {
                        $fail('Password tidak boleh sama dengan No. Rekening / NIS / NIP.');
                    }
                }
            ],
        ];

        $request->validate($rules);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        if ($user->role === 'nasabah' && $request->session()->has('force_password_change')) {
            $request->session()->forget('force_password_change');
        }

        return back()->with('success', 'Password berhasil diperbarui.');
    }

    /**
     * Reset password via OTP without current password (for logged in users)
     */
    public function resetPasswordViaOtp(Request $request)
    {
        $user = Auth::user();
        $identifier = $user->getIdentifier();
        $channel = env('OTP_CHANNEL', 'whatsapp');
        $isEmailChannel = $channel === 'email' || $channel === 'resend';
        $target = $isEmailChannel ? $user->email : $user->phone;

        $request->validate([
            'password' => [
                'required',
                Password::defaults(),
                'confirmed',
                function ($attribute, $value, $fail) use ($identifier) {
                    if (!empty($identifier) && $value === $identifier) {
                        $fail('Password tidak boleh sama dengan No. Rekening / NIS / NIP.');
                    }
                }
            ],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if (!OtpService::verify($target, $request->otp, 'password_reset')) {
            return back()->withErrors(['otp' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        if ($user->role === 'nasabah' && $request->session()->has('force_password_change')) {
            $request->session()->forget('force_password_change');
        }

        return back()->with('success', 'Berhasil ubah password dengan OTP.');
    }

    /**
     * Step 1: Request Email Change - Send OTP to OLD email
     */
    public function requestEmailChangeOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ]);

        $user = Auth::user();
        
        // Store the intended new email in session temporarily
        session(['pending_new_email' => $request->email]);

        // Send OTP to OLD email
        $success = OtpService::send($user->id, $user->email, 'email_change_old', 'email');

        if ($success) {
            return back()->with('success', 'Kode OTP telah dikirim ke alamat email LAMA Anda untuk verifikasi keamanan.');
        }

        return back()->with('error', 'Gagal mengirim OTP ke email lama. Coba lagi nanti atau hubungi admin.');
    }

    /**
     * Step 2: Verify OLD Email OTP and Send OTP to NEW Email
     */
    public function verifyOldEmailOtp(Request $request)
    {
        $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $user = Auth::user();
        $newEmail = session('pending_new_email');

        if (!$newEmail) {
            return back()->with('error', 'Sesi perubahan email kedaluwarsa. Silakan ulangi dari awal.');
        }

        if (!OtpService::verify($user->email, $request->otp, 'email_change_old')) {
            return back()->withErrors(['otp' => 'Kode OTP email lama tidak valid.']);
        }

        // OTP Old verified! Now send OTP to NEW email
        $success = OtpService::send($user->id, $newEmail, 'email_change_new', 'email');

        if ($success) {
            session(['old_email_verified' => true]);
            return back()->with('success', 'Email lama terverifikasi. Sekarang masukkan kode OTP yang dikirim ke email BARU Anda.');
        }

        return back()->with('error', 'Gagal mengirim OTP ke email baru.');
    }

    /**
     * Step 3: Verify NEW Email OTP and Update
     */
    public function updateEmail(Request $request)
    {
        $user = Auth::user();
        $newEmail = session('pending_new_email');
        $oldVerified = session('old_email_verified');

        if (!$newEmail || !$oldVerified) {
            return back()->with('error', 'Urutan verifikasi tidak valid atau sesi kedaluwarsa.');
        }

        $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if (!OtpService::verify($newEmail, $request->otp, 'email_change_new')) {
            return back()->withErrors(['otp' => 'Kode OTP email baru tidak valid.']);
        }

        // Both verified! Update.
        $user->update([
            'email' => $newEmail,
            'email_verified_at' => now(), // Mark as verified since they just verified it
        ]);

        // Cleanup session
        session()->forget(['pending_new_email', 'old_email_verified']);

        return back()->with('success', 'Alamat email berhasil diperbarui dan diverifikasi.');
    }

    /**
     * Enable Two-Factor Authentication and return QR code + secret key.
     */
    public function enableTwoFactor(Request $request)
    {
        $user = $request->user();

        // Enable 2FA using Fortify action (generates encrypted secret & recovery codes)
        app(EnableTwoFactorAuthentication::class)($user, true);

        // Refresh user model from database
        $user->refresh();

        return response()->json([
            'svg' => $user->twoFactorQrCodeSvg(),
            'secretKey' => decrypt($user->two_factor_secret),
            'url' => $user->twoFactorQrCodeUrl(),
        ]);
    }

    /**
     * Confirm Two-Factor Authentication with the 6-digit TOTP code.
     */
    public function confirmTwoFactor(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (empty($user->two_factor_secret)) {
            return response()->json([
                'message' => 'Proses aktivasi 2FA belum dimulai. Silakan mulai ulang.',
            ], 422);
        }

        $provider = app(TwoFactorAuthenticationProvider::class);
        $secret = decrypt($user->two_factor_secret);
        $code = preg_replace('/\s+/', '', (string) $request->code);

        $isValid = $provider->verify($secret, $code);

        if (!$isValid) {
            return response()->json([
                'message' => 'Kode autentikasi 6-digit tidak valid. Pastikan waktu pada perangkat dan aplikasi authenticator Anda telah sinkron.',
            ], 422);
        }

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();

        AuditLog::logActivity(
            '2fa_enabled',
            'User berhasil mengaktifkan Otentikasi Dua Faktor (2FA / MFA)',
            'success'
        );

        return response()->json([
            'message' => 'Otentikasi Dua Faktor (2FA) berhasil diaktifkan.',
            'recoveryCodes' => $user->recoveryCodes(),
        ]);
    }

    /**
     * Disable Two-Factor Authentication.
     */
    public function disableTwoFactor(Request $request)
    {
        $user = $request->user();

        app(DisableTwoFactorAuthentication::class)($user);

        AuditLog::logActivity(
            '2fa_disabled',
            'User menonaktifkan Otentikasi Dua Faktor (2FA / MFA)',
            'warning'
        );

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Otentikasi Dua Faktor (2FA) berhasil dinonaktifkan.',
            ]);
        }

        return back()->with('success', 'Otentikasi Dua Faktor (2FA) berhasil dinonaktifkan.');
    }

    /**
     * Get the SVG QR code and secret key for 2FA.
     */
    public function getTwoFactorQrCode(Request $request)
    {
        $user = $request->user();

        if (empty($user->two_factor_secret)) {
            return response()->json([
                'message' => '2FA belum diaktifkan pada akun ini.',
            ], 404);
        }

        return response()->json([
            'svg' => $user->twoFactorQrCodeSvg(),
            'secretKey' => decrypt($user->two_factor_secret),
            'url' => $user->twoFactorQrCodeUrl(),
        ]);
    }

    /**
     * Get the current 2FA recovery codes.
     */
    public function getTwoFactorRecoveryCodes(Request $request)
    {
        $user = $request->user();

        if (!$user->hasEnabledTwoFactorAuthentication()) {
            return response()->json([
                'message' => '2FA belum aktif pada akun ini.',
            ], 404);
        }

        return response()->json([
            'recoveryCodes' => $user->recoveryCodes() ?? [],
        ]);
    }

    /**
     * Regenerate 2FA recovery codes.
     */
    public function regenerateTwoFactorRecoveryCodes(Request $request)
    {
        $user = $request->user();

        if (!$user->hasEnabledTwoFactorAuthentication()) {
            return response()->json([
                'message' => '2FA belum aktif pada akun ini.',
            ], 404);
        }

        app(GenerateNewRecoveryCodes::class)($user);
        $user->refresh();

        AuditLog::logActivity(
            '2fa_recovery_regenerated',
            'User meregenerasi kode pemulihan (Recovery Codes) 2FA',
            'info'
        );

        return response()->json([
            'message' => 'Kode pemulihan baru berhasil dibuat.',
            'recoveryCodes' => $user->recoveryCodes() ?? [],
        ]);
    }
}
