<?php

// Test script untuk verifikasi penyimpanan jurusan_id

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Test Nasabah Jurusan ID Save ===\n\n";

// 1. Cek rombel yang ada
echo "1. Checking Rombels:\n";
$rombels = \App\Models\Rombel::with('jurusan')->take(3)->get();
foreach ($rombels as $rombel) {
    echo "   - Rombel ID: {$rombel->id}, Tingkat: {$rombel->tingkat}, Nomor: {$rombel->nomor_rombel}\n";
    echo "     Jurusan ID: {$rombel->jurusan_id}, Jurusan: " . ($rombel->jurusan ? $rombel->jurusan->nama : 'NULL') . "\n";
}

// 2. Cek nasabah terbaru
echo "\n2. Recent Nasabah (last 5):\n";
$nasabahs = \App\Models\Nasabah::with(['user', 'rombelRel', 'jurusanRel'])->latest()->take(5)->get();
foreach ($nasabahs as $nasabah) {
    echo "   - Nasabah ID: {$nasabah->id}, Nama: {$nasabah->user->name}\n";
    echo "     User Type: {$nasabah->user->user_type}\n";
    echo "     Jurusan ID: " . ($nasabah->jurusan_id ?? 'NULL') . "\n";
    echo "     Rombel ID: " . ($nasabah->rombel_id ?? 'NULL') . "\n";
    if ($nasabah->rombelRel) {
        echo "     Rombel: {$nasabah->rombelRel->nama_kelas}\n";
        echo "     Rombel's Jurusan ID: {$nasabah->rombelRel->jurusan_id}\n";
    }
    echo "\n";
}

// 3. Test logic untuk extract jurusan_id dari rombel
echo "3. Testing jurusan_id extraction logic:\n";
$testRombelId = $rombels->first()->id ?? null;
if ($testRombelId) {
    $rombel = \App\Models\Rombel::find($testRombelId);
    $jurusanId = $rombel ? $rombel->jurusan_id : null;
    echo "   - Test Rombel ID: {$testRombelId}\n";
    echo "   - Extracted Jurusan ID: " . ($jurusanId ?? 'NULL') . "\n";
    echo "   - Logic: " . ($jurusanId ? "✓ WORKS" : "✗ FAILED") . "\n";
}

// 4. Cek nasabah dengan jurusan_id NULL tapi punya rombel_id
echo "\n4. Nasabah with NULL jurusan_id but has rombel_id (need fixing):\n";
$brokenNasabah = \App\Models\Nasabah::whereNull('jurusan_id')
    ->whereNotNull('rombel_id')
    ->with(['user', 'rombelRel'])
    ->get();
    
if ($brokenNasabah->count() > 0) {
    echo "   Found {$brokenNasabah->count()} nasabah(s) that need fixing:\n";
    foreach ($brokenNasabah as $n) {
        echo "   - ID: {$n->id}, Nama: {$n->user->name}, Rombel ID: {$n->rombel_id}\n";
        if ($n->rombelRel) {
            echo "     Should have Jurusan ID: {$n->rombelRel->jurusan_id}\n";
        }
    }
    
    echo "\n   Run this query to fix:\n";
    echo "   UPDATE nasabah SET jurusan_id = (SELECT jurusan_id FROM rombels WHERE rombels.id = nasabah.rombel_id) WHERE rombel_id IS NOT NULL AND jurusan_id IS NULL;\n";
} else {
    echo "   ✓ No broken records found!\n";
}

echo "\n=== Test Complete ===\n";
