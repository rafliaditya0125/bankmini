<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabel wallet_types (Master Jenis Kantong)
        Schema::create('wallet_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('category', ['tabungan', 'pembayaran'])->default('pembayaran');
            $table->decimal('target_amount', 15, 2)->nullable();
            $table->string('target_audience', 50)->default('all'); // all, siswa_all, siswa_tingkat_10, siswa_tingkat_11, siswa_tingkat_12
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Tabel wallets (Dompet Nasabah Vertikal)
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->string('wallet_number', 32)->unique();
            $table->foreignId('nasabah_id')->constrained('nasabah')->onDelete('cascade');
            $table->foreignId('wallet_type_id')->constrained('wallet_types')->onDelete('restrict');
            $table->decimal('balance', 15, 2)->default(0.00);
            $table->enum('status', ['active', 'frozen', 'closed'])->default('active');
            $table->timestamps();

            $table->unique(['nasabah_id', 'wallet_type_id']);
        });

        // 3. Kolom tambahan pada tabel transaksi
        Schema::table('transaksi', function (Blueprint $table) {
            $table->foreignId('wallet_id')->nullable()->after('nasabah_tujuan_id')->constrained('wallets')->nullOnDelete();
            $table->string('metode_pembayaran', 50)->nullable()->after('jenis_transaksi');
        });

        // 4. Data Awal: Buat Wallet Type default 'Tabungan'
        $tabunganTypeId = DB::table('wallet_types')->insertGetId([
            'name' => 'Tabungan',
            'category' => 'tabungan',
            'target_amount' => null,
            'target_audience' => 'all',
            'description' => 'Kantong Tabungan Utama Nasabah',
            'is_default' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Inisialisasi wallet Tabungan untuk seluruh nasabah yang sudah ada
        $nasabahs = DB::table('nasabah')->select('id', 'nomor_rekening', 'saldo')->get();
        foreach ($nasabahs as $nasabah) {
            DB::table('wallets')->insert([
                'wallet_number' => 'W-' . $nasabah->nomor_rekening . '-01',
                'nasabah_id' => $nasabah->id,
                'wallet_type_id' => $tabunganTypeId,
                'balance' => $nasabah->saldo ?? 0.00,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropForeign(['wallet_id']);
            $table->dropColumn(['wallet_id', 'metode_pembayaran']);
        });

        Schema::dropIfExists('wallets');
        Schema::dropIfExists('wallet_types');
    }
};
