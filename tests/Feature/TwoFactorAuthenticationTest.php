<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Admin Test',
            'email' => 'admin.test@bankmini.test',
            'username' => 'admintest',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    /** @test */
    public function it_can_enable_two_factor_authentication_and_stores_encrypted_secret()
    {
        $response = $this->actingAs($this->user)
            ->postJson(route('admin.profil.two-factor.enable'));

        $response->assertStatus(200)
            ->assertJsonStructure(['svg', 'url', 'secretKey']);

        $this->user->refresh();

        // 1. Check raw database value is encrypted (cannot equal decrypted secretKey directly)
        $rawDbSecret = DB::table('users')->where('id', $this->user->id)->value('two_factor_secret');
        $this->assertNotEmpty($rawDbSecret);
        $this->assertNotEquals($response->json('secretKey'), $rawDbSecret, 'Raw secret in DB must be encrypted');

        // 2. Trait decrypts properly
        $this->assertEquals($response->json('secretKey'), decrypt($rawDbSecret));

        // 3. QR Code SVG contains standard OTP URL format compatible with Google/MS/Authy
        $svg = $response->json('svg');
        $this->assertStringContainsString('<svg', $svg);
        $this->assertStringContainsString('otpauth://totp', $response->json('url'));
    }

    /** @test */
    public function it_can_confirm_two_factor_authentication_with_valid_totp_code()
    {
        // First enable
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.enable'));
        $this->user->refresh();

        // Generate valid OTP
        $provider = app(TwoFactorAuthenticationProvider::class);
        $validOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));

        // Confirm
        $response = $this->actingAs($this->user)
            ->postJson(route('admin.profil.two-factor.confirm'), [
                'code' => $validOtp,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'recoveryCodes']);

        $this->user->refresh();
        $this->assertNotNull($this->user->two_factor_confirmed_at);
        $this->assertTrue($this->user->hasEnabledTwoFactorAuthentication());
        $this->assertTrue($this->user->two_factor_enabled);

        // Check recovery codes stored encrypted in DB
        $rawDbRecovery = DB::table('users')->where('id', $this->user->id)->value('two_factor_recovery_codes');
        $this->assertNotEmpty($rawDbRecovery);
        $this->assertIsArray($this->user->recoveryCodes());
        $this->assertCount(8, $this->user->recoveryCodes());
    }

    /** @test */
    public function it_redirects_to_two_factor_challenge_on_login_when_2fa_enabled()
    {
        // Enable & confirm 2FA
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.enable'));
        $this->user->refresh();

        $provider = app(TwoFactorAuthenticationProvider::class);
        $validOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.confirm'), ['code' => $validOtp]);

        // Logout
        auth()->logout();

        // Attempt login
        $response = $this->post(route('login.post'), [
            'login' => 'admintest',
            'password' => 'password123',
        ]);

        $response->assertRedirect(route('two-factor.login'));
        $this->assertEquals($this->user->id, session('login.id'));
        $this->assertGuest();
    }

    /** @test */
    public function it_can_complete_login_with_valid_totp_at_challenge()
    {
        // Enable & confirm 2FA
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.enable'));
        $this->user->refresh();

        $provider = app(TwoFactorAuthenticationProvider::class);
        $validOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.confirm'), ['code' => $validOtp]);

        // Set up session for 2FA challenge
        session()->put('login.id', $this->user->id);

        $currentOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));

        $response = $this->post(route('two-factor.login.store'), [
            'code' => $currentOtp,
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($this->user);
    }

    /** @test */
    public function it_can_complete_login_with_recovery_code_at_challenge()
    {
        // Enable & confirm 2FA
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.enable'));
        $this->user->refresh();

        $provider = app(TwoFactorAuthenticationProvider::class);
        $validOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));
        $confirmRes = $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.confirm'), ['code' => $validOtp]);

        $recoveryCodes = $confirmRes->json('recoveryCodes');
        $firstCode = $recoveryCodes[0];

        // Set up session for 2FA challenge
        session()->put('login.id', $this->user->id);

        $response = $this->post(route('two-factor.login.store'), [
            'recovery_code' => $firstCode,
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($this->user);

        // Verify used recovery code is consumed
        $this->user->refresh();
        $this->assertNotContains($firstCode, $this->user->recoveryCodes());
        $this->assertCount(7, $this->user->recoveryCodes());
    }

    /** @test */
    public function it_can_disable_two_factor_authentication()
    {
        // Enable & confirm 2FA
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.enable'));
        $this->user->refresh();

        $provider = app(TwoFactorAuthenticationProvider::class);
        $validOtp = $provider->getCurrentOtp(decrypt($this->user->two_factor_secret));
        $this->actingAs($this->user)->postJson(route('admin.profil.two-factor.confirm'), ['code' => $validOtp]);

        $this->assertTrue($this->user->fresh()->hasEnabledTwoFactorAuthentication());

        // Disable
        $response = $this->actingAs($this->user)
            ->delete(route('admin.profil.two-factor.disable'));

        $response->assertRedirect();

        $this->user->refresh();
        $this->assertFalse($this->user->hasEnabledTwoFactorAuthentication());
        $this->assertNull($this->user->two_factor_secret);
        $this->assertNull($this->user->two_factor_recovery_codes);
        $this->assertNull($this->user->two_factor_confirmed_at);
    }
}
