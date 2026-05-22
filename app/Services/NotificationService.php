<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Notifications\TransactionPushNotification;

class NotificationService
{
    /**
     * Send a notification to a user (in-app + push).
     */
    public static function send(int $userId, string $title, string $message, string $type = 'transaction', array $data = [])
    {
        // Simpan notifikasi ke database (in-app)
        $notification = Notification::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'data' => $data,
            'is_read' => false,
        ]);

        // Kirim push notification ke device
        $user = User::find($userId);
        if ($user) {
            // Web Push
            if ($user->pushSubscriptions()->exists()) {
                try {
                    $user->notify(new TransactionPushNotification($title, $message, $data));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Push notification failed for user ' . $userId . ': ' . $e->getMessage());
                }
            }

            // Get configured channels
            $configuredChannels = explode(',', env('NOTIFICATION_CHANNELS', 'whatsapp,email'));

            // WhatsApp Notification via Fonnte
            if (in_array('whatsapp', $configuredChannels) && $user->phone) {
                try {
                    \App\Services\FonnteService::sendMessage($user->phone, $message);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('WhatsApp notification failed for user ' . $userId . ': ' . $e->getMessage());
                }
            }

            // Email / Resend Notification
            $emailChannel = in_array('email', $configuredChannels) ? 'email' : (in_array('resend', $configuredChannels) ? 'resend' : null);
            if ($emailChannel && $user->email) {
                try {
                    $mailer = \Illuminate\Support\Facades\Mail::mailer($emailChannel === 'resend' ? 'resend' : null);
                    $mailer->to($user->email)->send(new \App\Mail\TransactionNotificationMail($title, $message));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning($emailChannel . ' notification failed for user ' . $userId . ': ' . $e->getMessage());
                }
            }
        }

        return $notification;
    }

    /**
     * Send a transaction notification.
     */
    public static function sendTransactionNotification(int $userId, string $jenis, float $jumlah, string $kode): mixed
    {
        $formattedJumlah = "Rp " . number_format($jumlah, 0, ',', '.');
        $title = "Transaksi " . ucfirst($jenis) . " Berhasil";
        $message = "Transaksi " . strtolower($jenis) . " sebesar " . $formattedJumlah . " dengan kode " . $kode . " telah berhasil diproses.";

        return self::send($userId, $title, $message, 'transaction', [
            'jenis' => $jenis,
            'jumlah' => $jumlah,
            'kode' => $kode,
        ]);
    }

    /**
     * Send a cancellation notification.
     */
    public static function sendCancellationNotification(int $userId, string $kode, string $reason): mixed
    {
        $title = "Transaksi Dibatalkan";
        $message = "Transaksi dengan kode " . $kode . " telah dibatalkan. Alasan: " . $reason;

        return self::send($userId, $title, $message, 'cancellation', [
            'kode' => $kode,
            'reason' => $reason,
        ]);
    }
}
