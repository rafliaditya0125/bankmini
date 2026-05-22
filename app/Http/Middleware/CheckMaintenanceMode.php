<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $isMaintenance = Setting::get('maintenance_mode', '0') === '1';

        if ($isMaintenance) {
            // Allow essential routes and health check
            if ($request->is('login') || $request->is('logout') || $request->is('/') || $request->is('up')) {
                return $next($request);
            }

            $user = auth()->user();
            
            // Allow superadmin and admin to bypass maintenance mode
            if ($user && in_array($user->role, ['superadmin', 'admin'])) {
                return $next($request);
            }

            // Trigger maintenance mode ONLY for teller and nasabah
            if ($user && in_array($user->role, ['teller', 'nasabah'])) {
                if ($request->header('X-Inertia')) {
                    return Inertia::render('Maintenance', [
                        'message' => 'Maaf, saat ini aplikasi sedang dalam tahap maintenance.'
                    ])->toResponse($request)->setStatusCode(503);
                }

                abort(503, 'Maaf, saat ini aplikasi sedang dalam tahap maintenance.');
            }
        }

        return $next($request);
    }
}
