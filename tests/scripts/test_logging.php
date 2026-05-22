<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

use App\Models\AuditLog;

// Test manual logging
echo "Testing manual logging...\n";

// Test 1: Login activity
$loginLog = AuditLog::logActivity(
    'login',
    'Test login activity manual',
    'success',
    null,
    'Test User',
    'teller'
);

echo "Login log created: " . ($loginLog ? "Success" : "Failed") . "\n";

// Test 2: Transaction activity
$transactionLog = AuditLog::logActivity(
    'setor',
    'Test transaksi setor manual Rp 100.000',
    'success',
    null,
    'Test Teller',
    'teller'
);

echo "Transaction log created: " . ($transactionLog ? "Success" : "Failed") . "\n";

// Test 3: Check total logs
$totalLogs = AuditLog::count();
echo "Total logs in database: $totalLogs\n";

// Test 4: Get latest logs
$latestLogs = AuditLog::latest()->take(3)->get();
echo "Latest 3 logs:\n";
foreach ($latestLogs as $log) {
    echo "- {$log->user_name} ({$log->role}) - {$log->action} - {$log->description}\n";
}

echo "Manual logging test completed!\n";
