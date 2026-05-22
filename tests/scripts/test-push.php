<?php

// Re-bootstrap Laravel
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Notifications\TransactionPushNotification;
use Illuminate\Support\Facades\Notification;

// Mencari user yang punya subscription
$user = User::whereHas('pushSubscriptions')->first();

if (!$user) {
    echo "Gagal: Tidak ada user di database yang memiliki Push Subscription terdaftar.\n";
    exit;
}

echo "Testing pengiriman ke User: {$user->name} (ID: {$user->id})\n";
echo "Jumlah subscription: " . $user->pushSubscriptions()->count() . "\n\n";

try {
    echo "Memulai proses pengiriman...\n";
    $user->notify(new TransactionPushNotification(
        "🚀 Test Notifikasi", 
        "Hore! Web Push Berhasil Terkirim pada " . date('H:i:s'),
        ['url' => '/dashboard']
    ));
    echo "\n✅ BERHASIL: Laravel telah menyerahkan notifikasi ke channel WebPush.\n";
    echo "Catatan: Jika extensions GMP/BCMath tidak ada, ini seharusnya melempar error.\n";
} catch (\Exception $e) {
    echo "\n❌ GAGAL: Terjadi kesalahan saat pengiriman.\n";
    echo "Pesan Error: " . $e->getMessage() . "\n";
    
    if (str_contains($e->getMessage(), 'GMP or BCMath')) {
        echo "\n💡 ANALISIS: Server benar-benar butuh extension 'php-gmp' atau 'php-bcmath'.\n";
        echo "Silakan jalankan: sudo apt install php-gmp\n";
    }
}
