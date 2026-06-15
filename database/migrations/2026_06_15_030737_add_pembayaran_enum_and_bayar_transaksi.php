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
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru', 'pembayaran') NULL");
        }

        Schema::table('transaksi', function (Blueprint $table) {
            $table->enum('jenis_transaksi', ['setor', 'tarik', 'transfer', 'bunga', 'biaya_admin', 'bayar'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->enum('jenis_transaksi', ['setor', 'tarik', 'transfer', 'bunga', 'biaya_admin'])->change();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::table('users')
                ->where('user_type', 'pembayaran')
                ->update(['user_type' => 'organisasi']);

            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru') NULL");
        }
    }
};
