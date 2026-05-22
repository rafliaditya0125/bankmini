<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Superadmin
        User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Administrator',
                'email' => 'superadmin@bankmini.smk',
                'password' => Hash::make('superadmin'),
                'role' => 'superadmin',
                'phone' => '081234567890',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Superadmin seeder completed successfully!');
    }
}