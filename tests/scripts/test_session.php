<?php

use Illuminate\Support\Facades\Config;
use App\Models\Setting;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Session Driver: " . Config::get('session.driver') . "\n";
echo "Session Lifetime: " . Config::get('session.lifetime') . "\n";
echo "Session Expire on Close: " . (Config::get('session.expire_on_close') ? 'true' : 'false') . "\n";
echo "Setting session_lifetime: " . Setting::get('session_lifetime', 'not set') . "\n";
