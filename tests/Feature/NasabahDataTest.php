<?php

namespace Tests\Feature;

use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class NasabahDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create Superadmin
        $this->superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bankmini.smk',
            'username' => 'superadmin',
            'password' => bcrypt('superadmin'),
            'role' => 'superadmin',
            'status' => 'active',
        ]);

        // Create Jurusan and Rombel
        $this->jurusan = Jurusan::create(['nama' => 'Rekayasa Perangkat Lunak', 'kode' => 'RPL']);
        $this->rombel = Rombel::create([
            'jurusan_id' => $this->jurusan->id,
            'tahun_ajaran' => '2024/2025',
            'tingkat' => 11,
            'nomor_rombel' => 1,
            'nama' => '11 RPL 1'
        ]);

        // Create Nasabah with Rombel
        $user = User::create([
            'name' => 'Test Nasabah',
            'email' => 'test@nasabah.com',
            'username' => 'testnasabah',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
        ]);

        $this->nasabah = Nasabah::create([
            'user_id' => $user->id,
            'nomor_rekening' => '123456789',
            'saldo' => 500000,
            'saldo_minimum' => 10000,
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);
    }

    /** @test */
    public function it_returns_nasabah_with_rombel_and_jurusan_relations_in_snake_case()
    {
        $this->actingAs($this->superadmin)
            ->get('/superadmin/nasabah')
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->has('nasabah.data', 1)
                ->has('nasabah.data.0', fn (Assert $item) => $item
                    ->where('id', $this->nasabah->id)
                    ->has('rombel_rel') // Verifying snake_case key
                    ->has('jurusan_rel')
                    ->where('rombel_rel.nama_kelas', '11 RPL 1') // Verifying append
                    ->etc()
                )
            );
    }
}
