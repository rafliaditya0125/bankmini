<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Honeypot\EncryptedTime;
use Tests\TestCase;

class HoneypotTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Admin Honeypot Test',
            'email' => 'honeypot.test@bankmini.test',
            'username' => 'honeypottest',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    /** @test */
    public function it_blocks_bot_requests_when_honeypot_field_is_filled()
    {
        config(['honeypot.enabled' => true]);

        // A bot fills the honeypot field 'my_name_bot123'
        $validFrom = EncryptedTime::create(now()->subSeconds(2));

        $response = $this->post(route('login'), [
            'login' => 'honeypottest',
            'password' => 'password123',
            'my_name_rand123' => 'I am a spam bot',
            'valid_from' => $validFrom,
        ]);

        $response->assertStatus(422);

        // Verify that bot blocking was logged to AuditLog
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'bot_blocked',
            'status' => 'warning',
        ]);
    }

    /** @test */
    public function it_blocks_bot_requests_submitted_too_fast()
    {
        config(['honeypot.enabled' => true]);

        // Submit with a future timestamp (meaning submitted in 0 seconds, faster than configured threshold)
        $futureTime = EncryptedTime::create(now()->addSeconds(5));

        $response = $this->post(route('login'), [
            'login' => 'honeypottest',
            'password' => 'password123',
            'my_name_rand123' => '',
            'valid_from' => $futureTime,
        ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function it_allows_valid_human_request_with_correct_honeypot()
    {
        config(['honeypot.enabled' => true]);

        // Human submitted after elapsed time with empty honeypot field
        $validPastTime = EncryptedTime::create(now()->subSeconds(2));

        $response = $this->post(route('login'), [
            'login' => 'honeypottest',
            'password' => 'password123',
            'my_name_rand123' => '',
            'valid_from' => $validPastTime,
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($this->user);
    }
}
