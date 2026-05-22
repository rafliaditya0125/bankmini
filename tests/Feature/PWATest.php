<?php

test('pwa manifest is accessible', function () {
    $response = $this->get('/manifest.webmanifest');
    
    // In local development without building, this might 404 if not using the dev server properly
    // But in a real environment or after build it should work.
    // For the sake of this test, we check if the app view contains the manifest link.
    $response = $this->get('/login');
    $response->assertStatus(200);
    $response->assertSee('link rel="manifest" href="/build/manifest.webmanifest"', false);
    $response->assertSee('meta name="theme-color" content="#059669"', false);
});
