<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditTrailAccessTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $admin;

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

        $this->admin = User::create([
            'name' => 'Admin Petugas',
            'email' => 'admin@bankmini.smk',
            'username' => 'adminpetugas',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    public function test_superadmin_can_access_audit_trail(): void
    {
        $response = $this->actingAs($this->superadmin)->get(route('superadmin.audit-trail.index'));
        $response->assertStatus(200);
    }

    public function test_admin_cannot_access_superadmin_audit_trail(): void
    {
        $response = $this->actingAs($this->admin)->get(route('superadmin.audit-trail.index'));
        $response->assertStatus(403);
    }

    public function test_admin_audit_trail_route_does_not_exist(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/audit-trail');
        $response->assertStatus(404);
    }
}
