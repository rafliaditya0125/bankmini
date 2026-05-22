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
        Schema::create('rombels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jurusan_id')->constrained('jurusans')->onDelete('cascade');
            $table->string('tahun_ajaran'); // Contoh: 2025/2026
            $table->integer('tingkat'); // 10, 11, 12
            $table->integer('nomor_rombel'); // 1, 2, 3, dst
            $table->string('nama')->nullable(); // Contoh: 11 RPL 1
            $table->timestamps();
            
            // Unique constraint untuk mencegah duplikat
            $table->unique(['jurusan_id', 'tahun_ajaran', 'tingkat', 'nomor_rombel']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rombels');
    }
};
