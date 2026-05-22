<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class TransactionPushNotification extends Notification
{
    public function __construct(
        private string $title,
        private string $body,
        private array $data = []
    ) {}

    public function via(mixed $notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush(mixed $notifiable, mixed $notification): WebPushMessage
    {
        $url = $notifiable->role === 'nasabah' ? '/nasabah/transaksi' : '/';

        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->icon('/images/bankmini-removebg-preview.png')
            ->badge('/images/bankmini-removebg-preview.png')
            ->data(array_merge($this->data, ['url' => $url]));
    }
}
