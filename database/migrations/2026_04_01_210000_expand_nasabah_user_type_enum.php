<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru') NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::table('users')
            ->whereIn('user_type', ['kelas', 'organisasi'])
            ->update(['user_type' => 'siswa']);

        DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'guru') NULL");
    }
};
