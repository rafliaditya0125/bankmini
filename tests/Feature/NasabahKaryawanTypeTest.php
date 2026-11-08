<?php

namespace Tests\Feature;

use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NasabahKaryawanTypeTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

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
    }

    public function test_can_create_nasabah_with_karyawan_type(): void
    {
        $response = $this->actingAs($this->superadmin)->post(route('superadmin.nasabah.store'), [
            'name' => 'Pak Joko Karyawan',
            'email' => 'joko@karyawan.smk',
            'nomor_rekening' => 'KRY001',
            'bank_type' => 'ebank',
            'user_type' => 'karyawan',
            'nip' => '198501012020011001',
            'saldo_awal' => 0,
        ]);

        $response->assertRedirect(route('superadmin.nasabah.index'));

        $this->assertDatabaseHas('users', [
            'username' => '198501012020011001',
            'nip' => '198501012020011001',
            'user_type' => 'karyawan',
        ]);

        $this->assertDatabaseHas('nasabah', [
            'nomor_rekening' => 'KRY001',
            'saldo' => 0,
        ]);
    }

    public function test_can_update_nasabah_to_karyawan_type(): void
    {
        $user = User::create([
            'name' => 'Staf Awal',
            'email' => 'staf@example.com',
            'username' => 'STAF001',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'organisasi',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $nasabah = Nasabah::create([
            'user_id' => $user->id,
            'nomor_rekening' => 'STAF001',
            'bank_type' => 'ebank',
            'saldo' => 50000,
            'saldo_minimum' => 10000,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        $response = $this->actingAs($this->superadmin)->put(route('superadmin.nasabah.update', $nasabah), [
            'name' => 'Staf Diperbarui Jadi Karyawan',
            'email' => 'staf@example.com',
            'nomor_rekening' => 'STAF001',
            'bank_type' => 'ebank',
            'user_type' => 'karyawan',
            'nip' => '199002022022011002',
            'status' => 'aktif',
        ]);

        $response->assertRedirect(route('superadmin.nasabah.index'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'nip' => '199002022022011002',
            'user_type' => 'karyawan',
        ]);
    }

    public function test_filter_by_karyawan_user_type(): void
    {
        $user = User::create([
            'name' => 'Ibu Siti Karyawan',
            'email' => 'siti@karyawan.smk',
            'username' => '198701012021012001',
            'nip' => '198701012021012001',
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'karyawan',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Nasabah::create([
            'user_id' => $user->id,
            'nomor_rekening' => '198701012021012001',
            'bank_type' => 'ebank',
            'saldo' => 75000,
            'saldo_minimum' => 10000,
            'status' => 'aktif',
            'tanggal_buka' => now(),
        ]);

        $response = $this->actingAs($this->superadmin)->get(route('superadmin.nasabah.index', [
            'user_type' => 'karyawan',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/nasabah/Index')
            ->has('nasabah.data', 1)
            ->where('nasabah.data.0.user.user_type', 'karyawan')
        );
    }

    public function test_legacy_guru_input_is_seamlessly_mapped_to_karyawan(): void
    {
        $response = $this->actingAs($this->superadmin)->post(route('superadmin.nasabah.store'), [
            'name' => 'Pak Guru Lama',
            'email' => 'gurulama@example.com',
            'nomor_rekening' => 'GURULAMA01',
            'bank_type' => 'ebank',
            'user_type' => 'guru',
            'nip' => '197501012000011001',
            'saldo_awal' => 0,
        ]);

        $response->assertRedirect(route('superadmin.nasabah.index'));

        // Should be saved as 'karyawan'
        $this->assertDatabaseHas('users', [
            'nip' => '197501012000011001',
            'user_type' => 'karyawan',
        ]);
    }
}
