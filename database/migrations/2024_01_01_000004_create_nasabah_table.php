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
        Schema::create('nasabah', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('nomor_rekening')->unique();
            $table->decimal('saldo', 15, 2)->default(0);
            $table->decimal('saldo_minimum', 15, 2)->default(10000);
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->string('nama_lengkap')->nullable();
            $table->string('nik')->nullable();
            $table->string('tempat_lahir')->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable();
            $table->string('alamat')->nullable();
            $table->string('kelas')->nullable(); // untuk siswa
            $table->string('jurusan')->nullable(); // untuk siswa
            $table->date('tanggal_buka')->useCurrent();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nasabah');
    }
};
