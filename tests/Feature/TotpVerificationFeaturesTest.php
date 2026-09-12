<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TotpVerificationFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Google2FA $google2fa;

    protected function setUp(): void
    {
        parent::setUp();

        $this->google2fa = new Google2FA();

        config([
            'turnstile.enabled' => false,
            'recaptcha.enabled' => false,
        ]);

        $this->user = User::create([
            'name' => 'Budi Santoso',
            'email' => 'budi@bankmini.test',
            'username' => 'budisantoso',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    protected function enableTotp(User $user): string
    {
        app(EnableTwoFactorAuthentication::class)($user);
        $user->refresh();

        $secret = decrypt($user->two_factor_secret);

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $secret;
    }

    /** @test */
    public function it_can_reset_password_in_profile_using_totp_code_when_2fa_enabled()
    {
        $secret = $this->enableTotp($this->user);
        $currentOtp = $this->google2fa->getCurrentOtp($secret);

        $response = $this->actingAs($this->user)->post(route('admin.profil.reset-password'), [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'otp' => $currentOtp,
        ]);

        $response->assertSessionHas('success');
        $this->user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $this->user->password));
    }

    /** @test */
    public function it_rejects_invalid_totp_code_on_profile_password_reset()
    {
        $this->enableTotp($this->user);

        $response = $this->actingAs($this->user)->post(route('admin.profil.reset-password'), [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'otp' => '000000',
        ]);

        $response->assertSessionHasErrors('otp');
        $this->user->refresh();
        $this->assertTrue(Hash::check('password123', $this->user->password));
    }

    /** @test */
    public function it_can_update_email_in_profile_directly_using_totp_code_when_2fa_enabled()
    {
        $secret = $this->enableTotp($this->user);
        $currentOtp = $this->google2fa->getCurrentOtp($secret);

        $newEmail = 'budi.new@bankmini.test';

        $response = $this->actingAs($this->user)->put(route('admin.profil.email'), [
            'email' => $newEmail,
            'otp' => $currentOtp,
        ]);

        $response->assertSessionHas('success');
        $this->user->refresh();
        $this->assertEquals($newEmail, $this->user->email);
        $this->assertNotNull($this->user->email_verified_at);
    }

    /** @test */
    public function it_can_update_email_using_current_password_when_2fa_disabled()
    {
        $newEmail = 'budi.password@bankmini.test';

        $response = $this->actingAs($this->user)->put(route('admin.profil.email'), [
            'email' => $newEmail,
            'current_password' => 'password123',
        ]);

        $response->assertSessionHas('success');
        $this->user->refresh();
        $this->assertEquals($newEmail, $this->user->email);
    }

    /** @test */
    public function guest_forgot_password_routes_to_totp_channel_when_user_has_2fa()
    {
        $this->enableTotp($this->user);

        // Request reset OTP
        $response = $this->post(route('password.otp'), [
            'login' => 'budisantoso',
        ]);

        $response->assertSessionHas('channel', 'totp');
        $response->assertSessionHas('has_totp', true);
    }

    /** @test */
    public function guest_forgot_password_can_reset_password_with_totp_code()
    {
        $secret = $this->enableTotp($this->user);
        $currentOtp = $this->google2fa->getCurrentOtp($secret);

        $response = $this->post(route('password.update'), [
            'login' => 'budisantoso',
            'channel' => 'totp',
            'otp' => $currentOtp,
            'password' => 'brandnewpass123',
            'password_confirmation' => 'brandnewpass123',
        ]);

        $response->assertRedirect(route('login'));
        $this->user->refresh();
        $this->assertTrue(Hash::check('brandnewpass123', $this->user->password));
    }

    /** @test */
    public function email_verification_controller_verifies_using_totp_when_2fa_enabled()
    {
        $unverifiedUser = User::create([
            'name' => 'Siti Unverified',
            'email' => 'siti@bankmini.test',
            'username' => 'sitiunverified',
            'password' => Hash::make('password123'),
            'role' => 'nasabah',
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        $secret = $this->enableTotp($unverifiedUser);
        $currentOtp = $this->google2fa->getCurrentOtp($secret);

        $response = $this->actingAs($unverifiedUser)->post(route('verification.verify'), [
            'otp' => $currentOtp,
        ]);

        $unverifiedUser->refresh();
        $this->assertNotNull($unverifiedUser->email_verified_at);
        $response->assertSessionHas('success');
    }
}
