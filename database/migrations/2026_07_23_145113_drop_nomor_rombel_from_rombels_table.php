<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drops the nomor_rombel column (and its unique constraint) from rombels table.
     * The column is no longer used since kelas names are now stored directly in `nama`.
     *
     * Note: MySQL requires a separate index covering jurusan_id (for the FK constraint)
     * before the composite unique index (which also covered jurusan_id) can be dropped.
     * We therefore create a plain index first, drop the unique key via raw SQL, then
     * finally drop the column.
     */
    public function up(): void
    {
        // 1. Create a plain index on jurusan_id so the FK is still satisfied after
        //    the composite unique key is dropped.
        Schema::table('rombels', function (Blueprint $table) {
            $table->index('jurusan_id', 'rombels_jurusan_id_index');
        });

        // 2. Drop the composite unique key via raw SQL (Blueprint::dropUnique would
        //    fail if MySQL still sees it as needed for the FK lookup).
        DB::statement('ALTER TABLE `rombels` DROP INDEX `rombels_jurusan_id_tahun_ajaran_tingkat_nomor_rombel_unique`');

        // 3. Now drop the column itself.
        Schema::table('rombels', function (Blueprint $table) {
            $table->dropColumn('nomor_rombel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rombels', function (Blueprint $table) {
            $table->integer('nomor_rombel')->default(1)->after('tingkat');
        });

        Schema::table('rombels', function (Blueprint $table) {
            $table->unique(['jurusan_id', 'tahun_ajaran', 'tingkat', 'nomor_rombel']);
            $table->dropIndex('rombels_jurusan_id_index');
        });
    }
};
