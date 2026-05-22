<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class ForceNasabahPasswordChange
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $identifier = $this->getUserIdentifier($user);
        $mustChangePassword = !empty($identifier) && Hash::check($identifier, $user->password);

        if ($mustChangePassword) {
            $request->session()->put('force_password_change', true);
        } else {
            $request->session()->forget('force_password_change');
            return $next($request);
        }

        $routeName = $request->route()?->getName();
        $allowedRoutes = [
            'nasabah.profil.index',
            'nasabah.profil.password',
            'teller.profil.index',
            'teller.profil.password',
            'admin.profil.index',
            'admin.profil.password',
            'superadmin.profil.index',
            'superadmin.profil.password',
            'logout',
        ];

        if (in_array($routeName, $allowedRoutes, true)) {
            return $next($request);
        }

        return redirect()
            ->route($user->role . '.profil.index')
            ->with('warning', 'Silakan ganti password terlebih dahulu untuk melanjutkan.');
    }

    private function getUserIdentifier(User $user): string
    {
        return match ($user->user_type) {
            'siswa' => $user->nis ?? '',
            'guru' => $user->nip ?? '',
            default => $user->nasabah?->nomor_rekening ?? $user->username,
        };
    }
}
