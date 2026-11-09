<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('nasabah', function (Blueprint $table) {
            $table->unsignedTinyInteger('baris_terakhir_buku')->default(0)->after('bank_type');
        });

        Schema::table('transaksi', function (Blueprint $table) {
            $table->unsignedTinyInteger('baris_cetak')->nullable()->after('keterangan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('nasabah', function (Blueprint $table) {
            $table->dropColumn('baris_terakhir_buku');
        });

        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropColumn('baris_cetak');
        });
    }
};
