<?php

namespace App\Providers;

use App\Models\Notification;
use App\Models\Setting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (str_contains(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
        $this->configureDefaults();
        $this->configureRateLimiters();
        $this->configureSession();
    }

    protected function configureSession(): void
    {
        // Try-catch to avoid issues during migrations or if table doesn't exist
        // The actual lifetime is now handled via Auth::setRememberDuration for remember me
        // and a fixed short lifetime for the session itself.
        try {
            // Default remember me duration: 7 days (from superadmin setting)
            // This value is used for the remember_web cookie.
            $rememberDays = 7; // Default to 7 days
            $rememberLifetimeInMinutes = $rememberDays * 24 * 60;

            // Session cookie itself should expire when the browser is closed.
            Config::set('session.expire_on_close', true);

            // Keep the server-side session lifetime short (e.g., 2 hours).
            // This ensures that even if the browser preserves the session cookie, 
            // the session still expires on the server after 2 hours of inactivity.
            Config::set('session.lifetime', 120);

            // Properly set the remember me cookie duration using the guard method.
            if ($this->app->bound('auth')) {
                Auth::guard('web')->setRememberDuration($rememberLifetimeInMinutes);
            }
        } catch (\Exception $e) {
            // Fallback to default
        }
    }
    /**
     * Configure dynamic rate limiters from settings.
     */
    protected function configureRateLimiters(): void
    {
        // Use default values if Setting::get fails or is unavailable
        RateLimiter::for('dynamic_login', function (Request $request) {
            return Limit::perMinute((int) 5)->by($request->ip()); // Default 5 requests per minute
        });

        RateLimiter::for('dynamic_transaction', function (Request $request) {
            return Limit::perMinute((int) 60)->by($request->ip()); // Default 60 transactions per minute
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn(): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }
}
