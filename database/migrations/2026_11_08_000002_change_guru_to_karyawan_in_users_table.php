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
        if (DB::getDriverName() === 'mysql') {
            // 1. Temporarily allow both 'guru' and 'karyawan' in the ENUM to prevent any truncation
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru', 'karyawan', 'pembayaran') NULL");
        }

        // 2. Safely migrate all existing 'guru' users to 'karyawan' without losing any data
        DB::table('users')
            ->where('user_type', 'guru')
            ->update(['user_type' => 'karyawan']);

        // 3. Migrate settings for interest & admin fees if present
        $guruInterest = DB::table('settings')->where('key', 'monthly_interest_rate_guru')->first();
        if ($guruInterest) {
            DB::table('settings')->updateOrInsert(
                ['key' => 'monthly_interest_rate_karyawan'],
                ['value' => $guruInterest->value]
            );
        }

        $guruAdmin = DB::table('settings')->where('key', 'monthly_admin_fee_guru')->first();
        if ($guruAdmin) {
            DB::table('settings')->updateOrInsert(
                ['key' => 'monthly_admin_fee_karyawan'],
                ['value' => $guruAdmin->value]
            );
        }

        if (DB::getDriverName() === 'mysql') {
            // 4. Update the ENUM definition to the clean target list (replacing 'guru' with 'karyawan')
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'karyawan', 'pembayaran') NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru', 'karyawan', 'pembayaran') NULL");
        }

        DB::table('users')
            ->where('user_type', 'karyawan')
            ->update(['user_type' => 'guru']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('siswa', 'kelas', 'organisasi', 'guru', 'pembayaran') NULL");
        }
    }
};
