<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\AuditTrail;
use App\Models\Jurusan;
use App\Models\Nasabah;
use App\Models\Rombel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NasabahDeleteFilteredTest extends TestCase
{
    use RefreshDatabase;

    protected $superadmin;
    protected $admin;
    protected $jurusanRpl;
    protected $jurusanTkj;
    protected $rombelA;
    protected $rombelB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bankmini.test',
            'username' => 'superadmin',
            'password' => bcrypt('password'),
            'role' => 'superadmin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->admin = User::create([
            'name' => 'Admin Officer',
            'email' => 'admin@bankmini.test',
            'username' => 'adminofficer',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->jurusanRpl = Jurusan::create(['nama' => 'Rekayasa Perangkat Lunak', 'kode' => 'RPL']);
        $this->jurusanTkj = Jurusan::create(['nama' => 'Teknik Komputer Jaringan', 'kode' => 'TKJ']);

        $this->rombelA = Rombel::create([
            'jurusan_id' => $this->jurusanRpl->id,
            'tahun_ajaran' => '2024/2025',
            'tingkat' => 10,
            'nomor_rombel' => 1,
            'nama' => '10 RPL 1',
        ]);

        $this->rombelB = Rombel::create([
            'jurusan_id' => $this->jurusanTkj->id,
            'tahun_ajaran' => '2024/2025',
            'tingkat' => 11,
            'nomor_rombel' => 1,
            'nama' => '11 TKJ 1',
        ]);
    }

    private function createNasabah(string $name, Rombel $rombel, float $saldo = 0, string $status = 'aktif'): Nasabah
    {
        static $counter = 1000;
        $counter++;

        $user = User::create([
            'name' => $name,
            'email' => "user{$counter}@test.com",
            'username' => "user{$counter}",
            'password' => bcrypt('password'),
            'role' => 'nasabah',
            'user_type' => 'siswa',
            'nis' => (string) $counter,
            'status' => 'active',
        ]);

        return Nasabah::create([
            'user_id' => $user->id,
            'nomor_rekening' => "NOREK{$counter}",
            'saldo' => $saldo,
            'saldo_minimum' => 0,
            'jurusan_id' => $rombel->jurusan_id,
            'rombel_id' => $rombel->id,
            'status' => $status,
            'bank_type' => 'ebank',
        ]);
    }

    public function test_requires_exact_confirmation_string()
    {
        $this->createNasabah('Student 1', $this->rombelA, 0);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'SALAH KONFIRMASI',
                'rombel_id' => $this->rombelA->id,
            ]);

        $response->assertRedirect('/superadmin/nasabah');
        $response->assertSessionHas('error', 'Teks konfirmasi tidak sesuai. Penghapusan dibatalkan demi keamanan.');
        $this->assertDatabaseCount('nasabah', 1);
    }

    public function test_requires_at_least_one_active_filter()
    {
        $this->createNasabah('Student 1', $this->rombelA, 0);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => 'all',
                'jurusan_id' => 'all',
                'tingkat' => 'all',
                'status' => 'all',
            ]);

        $response->assertRedirect('/superadmin/nasabah');
        $response->assertSessionHas('error', 'Harap tentukan minimal satu filter (misalnya kelas atau jurusan) sebelum melakukan penghapusan massal.');
        $this->assertDatabaseCount('nasabah', 1);
    }

    public function test_deletes_only_filtered_nasabah_and_preserves_others()
    {
        $studentA1 = $this->createNasabah('Student A1', $this->rombelA, 0);
        $studentA2 = $this->createNasabah('Student A2', $this->rombelA, 0);
        $studentB1 = $this->createNasabah('Student B1', $this->rombelB, 0);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => $this->rombelA->id,
            ]);

        $response->assertRedirect('/superadmin/nasabah');
        $response->assertSessionHas('success');

        // Student A1 & A2 should be deleted (both nasabah and user)
        $this->assertDatabaseMissing('nasabah', ['id' => $studentA1->id]);
        $this->assertDatabaseMissing('users', ['id' => $studentA1->user_id]);
        $this->assertDatabaseMissing('nasabah', ['id' => $studentA2->id]);
        $this->assertDatabaseMissing('users', ['id' => $studentA2->user_id]);

        // Student B1 in other rombel must remain untouched
        $this->assertDatabaseHas('nasabah', ['id' => $studentB1->id]);
        $this->assertDatabaseHas('users', ['id' => $studentB1->user_id]);
    }

    public function test_skips_accounts_with_positive_balance_by_default()
    {
        $zeroBalance = $this->createNasabah('Zero Balance', $this->rombelA, 0);
        $hasBalance = $this->createNasabah('Has Balance', $this->rombelA, 150000);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => $this->rombelA->id,
                'force_delete_with_balance' => false,
            ]);

        $response->assertRedirect('/superadmin/nasabah');
        $response->assertSessionHas('success');

        // Zero balance account deleted
        $this->assertDatabaseMissing('nasabah', ['id' => $zeroBalance->id]);
        // Positive balance account preserved
        $this->assertDatabaseHas('nasabah', ['id' => $hasBalance->id]);
    }

    public function test_forces_deletion_of_accounts_with_balance_when_flag_is_true()
    {
        $hasBalance = $this->createNasabah('Has Balance Force', $this->rombelA, 150000);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => $this->rombelA->id,
                'force_delete_with_balance' => true,
            ]);

        $response->assertRedirect('/superadmin/nasabah');
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('nasabah', ['id' => $hasBalance->id]);
    }

    public function test_records_in_audit_trail_and_audit_log()
    {
        $this->createNasabah('Student A1', $this->rombelA, 0);

        $response = $this->actingAs($this->superadmin)
            ->from('/superadmin/nasabah')
            ->post('/superadmin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => $this->rombelA->id,
            ]);

        $response->assertRedirect('/superadmin/nasabah');

        // Audit Trail check
        $this->assertDatabaseHas('audit_trail', [
            'user_id' => $this->superadmin->id,
            'model_type' => 'Nasabah',
        ]);

        $latestTrail = AuditTrail::latest('id')->first();
        $this->assertStringContainsString('Hapus massal nasabah terfilter: 1 nasabah dihapus permanen', $latestTrail->activity);
        $this->assertStringContainsString('Kelas: 10 RPL 1', $latestTrail->activity);

        // Audit Log check
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->superadmin->id,
            'action' => 'mass_delete_filtered_nasabah',
            'status' => 'warning',
        ]);

        $latestLog = AuditLog::latest('id')->first();
        $this->assertStringContainsString('10 RPL 1', $latestLog->description);
    }

    public function test_works_for_admin_role_as_well()
    {
        $studentA = $this->createNasabah('Student Admin Delete', $this->rombelA, 0);

        $response = $this->actingAs($this->admin)
            ->from('/admin/nasabah')
            ->post('/admin/nasabah/delete-filtered', [
                'confirmation' => 'HAPUS SEMUA',
                'rombel_id' => $this->rombelA->id,
            ]);

        $response->assertRedirect('/admin/nasabah');
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('nasabah', ['id' => $studentA->id]);
    }
}
