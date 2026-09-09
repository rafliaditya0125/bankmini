<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            // Drop global unique constraint on kode_transaksi
            $table->dropUnique('transaksi_kode_transaksi_unique');
            
            // Add regular index on kode_transaksi for fast lookups
            $table->index('kode_transaksi');
        });

        // Add virtual column active_kode_transaksi:
        // When status != 'cancelled', it equals kode_transaksi.
        // When status == 'cancelled', it is NULL.
        // In MariaDB/MySQL, NULL values in unique indexes do not collide,
        // allowing cancelled transactions to share the same code without duplicate errors.
        DB::statement("ALTER TABLE transaksi ADD COLUMN active_kode_transaksi VARCHAR(255) GENERATED ALWAYS AS (IF(status != 'cancelled', kode_transaksi, NULL)) VIRTUAL");
        DB::statement("ALTER TABLE transaksi ADD UNIQUE INDEX transaksi_active_kode_transaksi_unique (active_kode_transaksi)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE transaksi DROP INDEX transaksi_active_kode_transaksi_unique");
        DB::statement("ALTER TABLE transaksi DROP COLUMN active_kode_transaksi");

        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropIndex(['kode_transaksi']);
            $table->unique('kode_transaksi');
        });
    }
};
