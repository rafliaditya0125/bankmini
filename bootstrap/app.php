<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\LogActivity;
use App\Http\Middleware\CheckMaintenanceMode;
use App\Http\Middleware\ForceNasabahPasswordChange;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            CheckMaintenanceMode::class,
            \App\Http\Middleware\PreventRequestsCaching::class,
        ]);

        $middleware->alias([
            'role' => CheckRole::class,
            'log' => LogActivity::class,
            'force_password_change' => ForceNasabahPasswordChange::class,
            'honeypot' => \Spatie\Honeypot\ProtectAgainstSpam::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
