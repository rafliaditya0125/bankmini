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

    /** @test */
    public function guest_forgot_password_can_reset_password_with_recovery_code()
    {
        $this->enableTotp($this->user);
        $recoveryCodes = json_decode(decrypt($this->user->two_factor_recovery_codes), true);
        $this->assertNotEmpty($recoveryCodes);
        $validRecoveryCode = $recoveryCodes[0];

        $response = $this->post(route('password.update'), [
            'login' => 'budisantoso',
            'channel' => 'recovery',
            'otp' => $validRecoveryCode,
            'password' => 'recoverypass123',
            'password_confirmation' => 'recoverypass123',
        ]);

        $response->assertRedirect(route('login'));
        $this->user->refresh();
        $this->assertTrue(Hash::check('recoverypass123', $this->user->password));

        // Ensure the recovery code was consumed and cannot be used again
        $remainingCodes = json_decode(decrypt($this->user->two_factor_recovery_codes), true);
        $this->assertNotContains($validRecoveryCode, $remainingCodes);
    }

    /** @test */
    public function guest_forgot_password_rejects_invalid_recovery_code()
    {
        $this->enableTotp($this->user);

        $response = $this->post(route('password.update'), [
            'login' => 'budisantoso',
            'channel' => 'recovery',
            'otp' => 'invalid-recovery-code',
            'password' => 'recoverypass123',
            'password_confirmation' => 'recoverypass123',
        ]);

        $response->assertSessionHasErrors('otp');
        $this->user->refresh();
        $this->assertFalse(Hash::check('recoverypass123', $this->user->password));
    }

    /** @test */
    public function guest_forgot_password_can_switch_to_otp_channel_when_requested()
    {
        $this->user->update(['phone' => '081234567890']);
        $this->enableTotp($this->user);

        $response = $this->post(route('password.otp', ['requested_channel' => 'email']), [
            'login' => 'budisantoso',
        ]);

        $response->assertSessionHas('channel', 'email');
        $response->assertSessionHas('has_totp', true);
        $response->assertSessionHas('available_channels');
    }

    /** @test */
    public function it_can_reset_password_in_profile_using_recovery_code_when_2fa_enabled()
    {
        $this->enableTotp($this->user);
        $recoveryCodes = json_decode(decrypt($this->user->two_factor_recovery_codes), true);
        $validRecoveryCode = $recoveryCodes[0];

        $response = $this->actingAs($this->user)->post(route('admin.profil.reset-password'), [
            'password' => 'newrecoverypass123',
            'password_confirmation' => 'newrecoverypass123',
            'channel' => 'recovery',
            'otp' => $validRecoveryCode,
        ]);

        $response->assertSessionHas('success');
        $this->user->refresh();
        $this->assertTrue(Hash::check('newrecoverypass123', $this->user->password));
    }

    /** @test */
    public function it_can_update_email_in_profile_using_recovery_code_when_2fa_enabled()
    {
        $this->enableTotp($this->user);
        $recoveryCodes = json_decode(decrypt($this->user->two_factor_recovery_codes), true);
        $validRecoveryCode = $recoveryCodes[0];

        $newEmail = 'budi.recovery@bankmini.test';

        $response = $this->actingAs($this->user)->put(route('admin.profil.email'), [
            'email' => $newEmail,
            'channel' => 'recovery',
            'otp' => $validRecoveryCode,
        ]);

        $response->assertSessionHas('success');
        $this->user->refresh();
        $this->assertEquals($newEmail, $this->user->email);
    }

    /** @test */
    public function guest_forgot_password_can_switch_from_totp_to_otp_without_re_captcha_when_already_verified()
    {
        config(['turnstile.enabled' => true]);

        $this->user->update(['phone' => '081234567890']);
        $this->enableTotp($this->user);

        // 1. If unverified session tries to request OTP directly without captcha, it fails
        $unverifiedResponse = $this->post(route('password.otp', ['requested_channel' => 'email']), [
            'login' => 'budisantoso',
        ]);
        $unverifiedResponse->assertSessionHasErrors('captcha');

        // 2. If session has verified login from step 1, switching channel in step 2 bypasses captcha
        $verifiedResponse = $this->withSession([
            'password_reset_captcha_verified' => true,
            'password_reset_login' => 'budisantoso',
            'password_reset_user_id' => $this->user->id,
        ])->post(route('password.otp', ['requested_channel' => 'email', 'step' => 2]), [
            'login' => 'budisantoso',
        ]);

        $verifiedResponse->assertSessionHasNoErrors();
        $verifiedResponse->assertSessionHas('channel', 'email');
        $verifiedResponse->assertSessionHas('step', 2);
    }
}
