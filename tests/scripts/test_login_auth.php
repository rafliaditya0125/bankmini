<?php

use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function testLogin($login, $password) {
    echo "Testing login for: $login / $password\n";
    
    // Logic from LoginController@store
    $user = User::where('email', $login)
        ->orWhere('username', $login)
        ->orWhere('nis', $login)
        ->orWhere('nip', $login)
        ->orWhereHas('nasabah', function ($query) use ($login) {
            $query->where('nomor_rekening', $login);
        })
        ->first();

    if (!$user) {
        echo "FAIL: User not found in DB\n";
        return;
    }

    echo "User found: " . $user->username . " (Role: " . $user->role . ", Type: " . ($user->user_type ?? 'N/A') . ")\n";

    // Identifier check
    $identifier = match ($user->user_type) {
        'siswa' => $user->nis ?? $user->username,
        'guru' => $user->nip ?? $user->username,
        default => $user->nasabah?->nomor_rekening ?? $user->username,
    };
    
    echo "Expected Identifier: $identifier\n";

    if ($user->role === 'nasabah' && $login !== $identifier) {
        echo "FAIL: Nasabah identifier mismatch. Login: $login, Expected: $identifier\n";
        return;
    }

    if (Hash::check($password, $user->password)) {
        echo "SUCCESS: Password matches\n";
        if (!$user->isActive()) {
            echo "FAIL: User is inactive\n";
            return;
        }
        echo "SUCCESS: User is active. Login allowed.\n";
    } else {
        echo "FAIL: Password mismatch\n";
    }
    echo "-------------------\n";
}

testLogin('superadmin', 'superadmin');
testLogin('admin@bankmini.smk', 'admin');
testLogin('budi@bankmini.smk', 'password');

// Test nasabah with NIS
$nasabah = User::where('role', 'nasabah')->where('user_type', 'siswa')->first();
if ($nasabah) {
    testLogin($nasabah->nis, $nasabah->nis);
}

// Test nasabah with Email (Should fail because identifier for nasabah is NIS/NIP/Rek)
if ($nasabah) {
    testLogin($nasabah->email, $nasabah->nis);
}
