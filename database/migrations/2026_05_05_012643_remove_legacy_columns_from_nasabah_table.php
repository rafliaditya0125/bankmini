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
            if (Schema::hasColumn('nasabah', 'kelas')) {
                $table->dropColumn('kelas');
            }
            if (Schema::hasColumn('nasabah', 'jurusan')) {
                $table->dropColumn('jurusan');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('nasabah', function (Blueprint $table) {
            $table->string('kelas')->nullable();
            $table->string('jurusan')->nullable();
        });
    }
};
