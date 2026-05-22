<?php

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Auth;
use App\Models\Setting;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$guard = Auth::guard('web');
$duration = 0;
if (method_exists($guard, 'getRememberDuration')) {
    $duration = $guard->getRememberDuration();
}

echo "Session Lifetime: " . Config::get('session.lifetime') . "\n";
echo "Session Expire on Close: " . (Config::get('session.expire_on_close') ? 'true' : 'false') . "\n";
echo "Remember Duration (min): " . $duration . "\n";
echo "Remember Duration (days): " . ($duration / 60 / 24) . "\n";
