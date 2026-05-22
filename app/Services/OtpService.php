<?php

namespace App\Services;

use App\Models\Otp;
use App\Mail\OtpMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OtpService
{
    /**
     * Generate and send a new OTP via the preferred channel
     */
    public static function send(?int $userId, string $target, string $type, ?string $channel = null): bool
    {
        $channel = $channel ?? config('otp.channel', env('OTP_CHANNEL', 'whatsapp'));

        // If target looks like an email and channel is whatsapp, try to see if it's actually an email request
        // or just validate the target based on channel
        
        $otp = self::generate($userId, $target, $type, $channel);

        if ($channel === 'email' || $channel === 'resend') {
            try {
                $mailer = Mail::mailer($channel === 'resend' ? 'resend' : null);
                $mailer->to($target)->send(new OtpMail($otp->otp));
                return true;
            } catch (\Exception $e) {
                Log::error($channel . ' OTP failed: ' . $e->getMessage());
                return false;
            }
        }

        // Default to WhatsApp/Fonnte
        $appName = \App\Models\Setting::get('app_name', config('app.name'));
        $message = "Kode OTP $appName Anda adalah: " . $otp->otp . ". Kode ini berlaku selama 15 menit. JANGAN BERIKAN KODE INI KEPADA SIAPAPUN.";
        return FonnteService::sendMessage($target, $message);
    }

    /**
     * Generate a new OTP and save it to the database
     */
    public static function generate(?int $userId, string $target, string $type, string $channel): Otp
    {
        // Delete any existing unused OTPs for this target and type
        $query = Otp::where('type', $type)->whereNull('verified_at');
        
        if ($channel === 'email' || $channel === 'resend') {
            $query->where('email', $target);
        } else {
            $query->where('phone', $target);
        }
        
        $query->delete();

        $otpCode = (string) random_int(100000, 999999);
        $expiresAt = Carbon::now()->addMinutes(15);

        $isEmailType = $channel === 'email' || $channel === 'resend';
        
        return Otp::create([
            'user_id' => $userId,
            'phone' => !$isEmailType ? $target : null,
            'email' => $isEmailType ? $target : null,
            'otp' => $otpCode,
            'type' => $type,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Verify the provided OTP
     */
    public static function verify(string $target, string $otpCode, string $type): bool
    {
        $otp = Otp::where(function($q) use ($target) {
                $q->where('phone', $target)->orWhere('email', $target);
            })
            ->where('otp', $otpCode)
            ->where('type', $type)
            ->where('expires_at', '>', Carbon::now())
            ->whereNull('verified_at')
            ->first();

        if ($otp) {
            $otp->update(['verified_at' => Carbon::now()]);
            return true;
        }

        return false;
    }

    /**
     * Check if a target has been verified for a specific type recently
     */
    public static function isVerified(string $target, string $type): bool
    {
        return Otp::where(function($q) use ($target) {
                $q->where('phone', $target)->orWhere('email', $target);
            })
            ->where('type', $type)
            ->whereNotNull('verified_at')
            ->where('updated_at', '>', Carbon::now()->addMinutes(-15))
            ->exists();
    }
}
