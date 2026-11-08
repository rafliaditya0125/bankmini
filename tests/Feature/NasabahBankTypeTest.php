<?php

namespace Tests\Feature;

use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NasabahBankTypeTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected Jurusan $jurusan;
    protected Rombel $rombel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bankmini.smk',
            'username' => 'superadmin',
            'password' => bcrypt('password'),
            'role' => 'superadmin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->jurusan = Jurusan::create(['nama' => 'Rekayasa Perangkat Lunak', 'kode' => 'RPL']);
        $this->rombel = Rombel::create([
            'jurusan_id' => $this->jurusan->id,
            'tahun_ajaran' => '2024/2025',
            'tingkat' => 11,
            'nomor_rombel' => 1,
            'nama' => '11 RPL 1',
        ]);
    }

    public function test_can_create_nasabah_with_bank_type(): void
    {
        $response = $this->actingAs($this->superadmin)->post(route('superadmin.nasabah.store'), [
            'name' => 'Budi BJB',
            'email' => 'budibjb@example.com',
            'nomor_rekening' => 'BJB001',
            'bank_type' => 'bjb',
            'user_type' => 'siswa',
            'nis' => '12345678',
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'saldo_awal' => 150000,
        ]);

        $response->assertRedirect(route('superadmin.nasabah.index'));

        $this->assertDatabaseHas('nasabah', [
            'nomor_rekening' => 'BJB001',
            'bank_type' => 'bjb',
            'saldo' => 150000,
        ]);
    }

    public function test_can_update_nasabah_bank_type(): void
    {
        $user = User::create([
            'name' => 'Nasabah Awal',
            'email' => 'awal@example.com',
            'username' => 'awal001',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
            'nis' => '998877',
        ]);

        $nasabah = Nasabah::create([
            'user_id' => $user->id,
            'nomor_rekening' => 'EBANK001',
            'bank_type' => 'ebank',
            'saldo' => 200000,
            'saldo_minimum' => 10000,
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        $response = $this->actingAs($this->superadmin)->put(route('superadmin.nasabah.update', $nasabah), [
            'name' => 'Nasabah Diperbarui',
            'email' => 'awal@example.com',
            'nomor_rekening' => 'EBANK001',
            'bank_type' => 'bjb',
            'user_type' => 'siswa',
            'nis' => '998877',
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
        ]);

        $response->assertRedirect(route('superadmin.nasabah.index'));

        $this->assertDatabaseHas('nasabah', [
            'id' => $nasabah->id,
            'bank_type' => 'bjb',
        ]);
    }

    public function test_index_calculates_bank_stats_and_filters_correctly(): void
    {
        // Create 2 eBank nasabah
        $u1 = User::create([
            'name' => 'Nasabah eBank 1',
            'email' => 'ebank1@test.com',
            'username' => 'ebank1',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
            'nis' => '11111',
        ]);
        Nasabah::create([
            'user_id' => $u1->id,
            'nomor_rekening' => '11111',
            'bank_type' => 'ebank',
            'saldo' => 100000,
            'saldo_minimum' => 10000,
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        $u2 = User::create([
            'name' => 'Nasabah eBank 2',
            'email' => 'ebank2@test.com',
            'username' => 'ebank2',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
            'nis' => '22222',
        ]);
        Nasabah::create([
            'user_id' => $u2->id,
            'nomor_rekening' => '22222',
            'bank_type' => 'ebank',
            'saldo' => 150000,
            'saldo_minimum' => 10000,
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        // Create 1 BJB nasabah
        $u3 = User::create([
            'name' => 'Nasabah BJB 1',
            'email' => 'bjb1@test.com',
            'username' => 'bjb1',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'status' => 'active',
            'nis' => '33333',
        ]);
        Nasabah::create([
            'user_id' => $u3->id,
            'nomor_rekening' => '33333',
            'bank_type' => 'bjb',
            'saldo' => 300000,
            'saldo_minimum' => 10000,
            'jurusan_id' => $this->jurusan->id,
            'rombel_id' => $this->rombel->id,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        // Test Index Stats
        $response = $this->actingAs($this->superadmin)->get(route('superadmin.nasabah.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/nasabah/Index')
            ->has('stats', fn (Assert $stats) => $stats
                ->where('total_saldo', 550000)
                ->where('total_saldo_ebank', 250000)
                ->where('total_saldo_bjb', 300000)
                ->where('count_total', 3)
                ->where('count_ebank', 2)
                ->where('count_bjb', 1)
            )
            ->has('nasabah.data', 3)
        );

        // Test Filter by bank_type=bjb
        $responseBjb = $this->actingAs($this->superadmin)->get(route('superadmin.nasabah.index', ['bank_type' => 'bjb']));

        $responseBjb->assertStatus(200);
        $responseBjb->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/nasabah/Index')
            ->has('nasabah.data', 1)
            ->where('nasabah.data.0.bank_type', 'bjb')
        );

        // Test Filter by bank_type=ebank
        $responseEbank = $this->actingAs($this->superadmin)->get(route('superadmin.nasabah.index', ['bank_type' => 'ebank']));

        $responseEbank->assertStatus(200);
        $responseEbank->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/nasabah/Index')
            ->has('nasabah.data', 2)
        );

        // Test Export with bank_type
        $responseExport = $this->actingAs($this->superadmin)->get(route('superadmin.nasabah.index', [
            'bank_type' => 'bjb',
            'export' => 'excel',
        ]));
        $responseExport->assertStatus(200);
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $responseExport->headers->get('content-type'));
    }
}
