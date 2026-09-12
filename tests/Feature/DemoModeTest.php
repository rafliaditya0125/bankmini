<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoModeTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $admin;
    protected User $teller;
    protected User $nasabah;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'turnstile.enabled' => false,
            'recaptcha.enabled' => false,
        ]);

        $this->superadmin = User::create([
            'name' => 'Superadmin Demo',
            'email' => 'superadmin@demo.test',
            'username' => 'superadmin_demo',
            'password' => Hash::make('real_super_password'),
            'role' => 'superadmin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->admin = User::create([
            'name' => 'Admin Demo',
            'email' => 'admin@demo.test',
            'username' => 'admin_demo',
            'password' => Hash::make('real_admin_password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->teller = User::create([
            'name' => 'Teller Demo',
            'email' => 'teller@demo.test',
            'username' => 'teller_demo',
            'password' => Hash::make('real_teller_password'),
            'role' => 'teller',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->nasabah = User::create([
            'name' => 'Nasabah Demo',
            'email' => 'nasabah@demo.test',
            'username' => 'nasabah_demo',
            'password' => Hash::make('real_nasabah_password'),
            'role' => 'nasabah',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    public function test_superadmin_can_update_demo_settings_with_at_least_one_account_per_role(): void
    {
        $response = $this->actingAs($this->superadmin)
            ->post('/superadmin/pengaturan', [
                'demo_mode' => '1',
                'demo_password' => 'secret123',
                'demo_accounts' => [
                    $this->superadmin->id,
                    $this->admin->id,
                    $this->teller->id,
                    $this->nasabah->id,
                ],
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertEquals('1', Setting::get('demo_mode'));
        $this->assertEquals('secret123', Setting::get('demo_password'));

        $savedAccounts = json_decode(Setting::get('demo_accounts'), true);
        $this->assertCount(4, $savedAccounts);
        $this->assertContains($this->superadmin->id, $savedAccounts);
        $this->assertContains($this->admin->id, $savedAccounts);
        $this->assertContains($this->teller->id, $savedAccounts);
        $this->assertContains($this->nasabah->id, $savedAccounts);
    }

    public function test_superadmin_cannot_activate_demo_mode_if_any_role_missing(): void
    {
        // Only selecting superadmin and admin (teller and nasabah are missing)
        $response = $this->actingAs($this->superadmin)
            ->post('/superadmin/pengaturan', [
                'demo_mode' => '1',
                'demo_password' => 'secret123',
                'demo_accounts' => [
                    $this->superadmin->id,
                    $this->admin->id,
                ],
            ]);

        $response->assertSessionHasErrors(['demo_accounts']);
        $this->assertNotEquals('1', Setting::get('demo_mode', '0'));
    }

    public function test_admin_cannot_modify_demo_settings(): void
    {
        Setting::set('demo_mode', '0');

        $response = $this->actingAs($this->admin)
            ->post('/admin/pengaturan', [
                'demo_mode' => '1',
                'demo_password' => 'hacked',
                'bank_name' => 'Bank Mini Test',
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals('0', Setting::get('demo_mode', '0'));
        $this->assertNotEquals('hacked', Setting::get('demo_password'));
    }

    public function test_login_page_renders_demo_accounts_when_demo_mode_is_active(): void
    {
        Setting::set('demo_mode', '1');
        Setting::set('demo_password', 'demopass123');
        Setting::set('demo_accounts', json_encode([
            $this->superadmin->id,
            $this->admin->id,
            $this->teller->id,
            $this->nasabah->id,
        ]));

        $response = $this->get(route('login'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('demo_mode', true)
            ->where('demo_password', 'demopass123')
            ->has('demo_accounts', 4)
            ->has('demo_accounts.0', fn (Assert $item) => $item
                ->has('id')
                ->has('name')
                ->has('role')
                ->has('identifier')
                ->etc()
            )
        );
    }

    public function test_login_page_does_not_render_demo_accounts_when_demo_mode_is_inactive(): void
    {
        Setting::set('demo_mode', '0');
        Setting::set('demo_accounts', json_encode([
            $this->superadmin->id,
        ]));

        $response = $this->get(route('login'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('demo_mode', false)
            ->has('demo_accounts', 0)
        );
    }

    public function test_demo_quick_login_succeeds_for_approved_demo_account(): void
    {
        Setting::set('demo_mode', '1');
        Setting::set('demo_accounts', json_encode([$this->teller->id]));

        $response = $this->post(route('demo.login'), [
            'user_id' => $this->teller->id,
        ]);

        $response->assertRedirect(route('teller.dashboard'));
        $this->assertAuthenticatedAs($this->teller);
    }

    public function test_demo_quick_login_fails_when_demo_mode_is_inactive(): void
    {
        Setting::set('demo_mode', '0');
        Setting::set('demo_accounts', json_encode([$this->teller->id]));

        $response = $this->post(route('demo.login'), [
            'user_id' => $this->teller->id,
        ]);

        $response->assertSessionHasErrors(['login']);
        $this->assertGuest();
    }

    public function test_demo_quick_login_fails_for_unapproved_account(): void
    {
        Setting::set('demo_mode', '1');
        Setting::set('demo_accounts', json_encode([$this->teller->id]));

        // Admin is not in demo_accounts
        $response = $this->post(route('demo.login'), [
            'user_id' => $this->admin->id,
        ]);

        $response->assertSessionHasErrors(['login']);
        $this->assertGuest();
    }

    public function test_form_login_allows_demo_password_for_approved_demo_account(): void
    {
        Setting::set('demo_mode', '1');
        Setting::set('demo_password', 'shared_demo_pass');
        Setting::set('demo_accounts', json_encode([$this->nasabah->id]));

        $response = $this->post(route('login'), [
            'login' => $this->nasabah->username,
            'password' => 'shared_demo_pass',
        ]);

        $response->assertRedirect(route('nasabah.dashboard'));
        $this->assertAuthenticatedAs($this->nasabah);
    }

    public function test_demo_login_bypasses_2fa_for_approved_demo_account(): void
    {
        // Simulate superadmin having 2FA enabled
        $this->superadmin->update([
            'two_factor_secret' => 'DUMMYSECRET',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->assertTrue($this->superadmin->hasEnabledTwoFactorAuthentication());

        Setting::set('demo_mode', '1');
        Setting::set('demo_accounts', json_encode([$this->superadmin->id]));

        $response = $this->post(route('demo.login'), [
            'user_id' => $this->superadmin->id,
        ]);

        $response->assertRedirect(route('superadmin.dashboard'));
        $this->assertAuthenticatedAs($this->superadmin);
    }
}
