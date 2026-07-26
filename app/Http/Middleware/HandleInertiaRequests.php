<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => Setting::get('bank_name', config('app.name')),
            'bank_city' => Setting::get('bank_city', 'Tasikmalaya'),
            'bank_address' => Setting::get('address', 'Jl. Pendidikan No. 123'),
            'bank_phone' => Setting::get('phone', '(021) 1234-5678'),
            'is_maintenance' => Setting::get('maintenance_mode', '0') === '1',
            'min_cash_denomination' => (int) Setting::get('min_cash_denomination', 100),
            'max_field_length' => (int) Setting::get('max_field_length', 255),
            'session_lifetime' => (int) Setting::get('session_lifetime', 7),
            'auth' => [
                'user' => $user ? [
                    ...$user->load('nasabah')->toArray(),
                    'unread_notifications_count' => $user->role === 'nasabah' ? $user->unreadNotifications()->count() : 0,
                    'notifications' => $user->role === 'nasabah' ? $user->notifications()->take(5)->get() : [],
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'transaction' => fn () => $request->session()->get('transaction'),
            ],
        ];
    }
}
