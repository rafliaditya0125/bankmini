<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

use App\Models\AuditLog;

echo "Testing AuditLog model...\n";

// Test 1: Create log without auth context
try {
    $log = AuditLog::create([
        'user_name' => 'Test User',
        'role' => 'teller',
        'action' => 'login',
        'description' => 'Test login manual',
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Test Browser',
        'status' => 'success',
    ]);
    
    echo "✓ Manual log created successfully\n";
} catch (Exception $e) {
    echo "✗ Manual log failed: " . $e->getMessage() . "\n";
}

// Test 2: Check total logs
try {
    $total = AuditLog::count();
    echo "✓ Total logs in database: $total\n";
} catch (Exception $e) {
    echo "✗ Count failed: " . $e->getMessage() . "\n";
}

// Test 3: Get latest logs
try {
    $logs = AuditLog::latest()->take(3)->get();
    echo "✓ Latest 3 logs:\n";
    foreach ($logs as $log) {
        echo "  - {$log->user_name} ({$log->role}) - {$log->action}\n";
    }
} catch (Exception $e) {
    echo "✗ Query failed: " . $e->getMessage() . "\n";
}

echo "Test completed!\n";
