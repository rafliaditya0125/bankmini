<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\TrustedDevice;
use App\Models\User;
use App\Services\TrustedDeviceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrustedDeviceController extends Controller
{
    public function __construct(
        private readonly TrustedDeviceService $trustedDeviceService,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // User-facing: manage their own trusted devices
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List all active trusted devices for the authenticated user.
     */
    public function index(Request $request): Response
    {
        $devices = $request->user()
            ->trustedDevices()
            ->active()
            ->get()
            ->map(fn (TrustedDevice $d) => [
                'id'           => $d->id,
                'device_name'  => $d->device_name ?? 'Perangkat Tidak Dikenal',
                'ip_address'   => $d->ip_address,
                'last_used_at' => $d->last_used_at?->diffForHumans(),
                'expires_at'   => $d->expires_at->format('d M Y'),
                'created_at'   => $d->created_at->format('d M Y H:i'),
                'is_current'   => $this->isCurrentDevice($request, $d),
            ]);

        return Inertia::render('Auth/TrustedDevices', [
            'devices' => $devices,
        ]);
    }

    /**
     * Revoke a specific trusted device owned by the authenticated user.
     */
    public function destroy(Request $request, TrustedDevice $device): RedirectResponse
    {
        // Ensure the device belongs to the authenticated user
        if ($device->user_id !== $request->user()->id) {
            abort(403);
        }

        $this->trustedDeviceService->revoke($device);

        AuditLog::logActivity(
            'trust_device_revoked',
            "Perangkat terpercaya dihapus: {$device->device_name}",
            'success'
        );

        return back()->with('success', 'Perangkat berhasil dihapus dari daftar terpercaya.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Superadmin: manage trusted devices of ALL users
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List all trusted devices across all users (superadmin only).
     */
    public function adminIndex(Request $request): Response
    {
        $query = TrustedDevice::with('user:id,name,email,role')
            ->active()
            ->latest();

        if ($search = $request->input('search')) {
            $query->whereHas('user', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
            );
        }

        $devices = $query->paginate(20)->through(fn (TrustedDevice $d) => [
            'id'           => $d->id,
            'device_name'  => $d->device_name ?? 'Perangkat Tidak Dikenal',
            'ip_address'   => $d->ip_address,
            'last_used_at' => $d->last_used_at?->diffForHumans(),
            'expires_at'   => $d->expires_at->format('d M Y'),
            'created_at'   => $d->created_at->format('d M Y H:i'),
            'user'         => $d->user ? [
                'id'    => $d->user->id,
                'name'  => $d->user->name,
                'email' => $d->user->email,
                'role'  => $d->user->role,
            ] : null,
        ]);

        return Inertia::render('Superadmin/TrustedDevices/Index', [
            'devices' => $devices,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Revoke a trusted device for any user (superadmin only).
     */
    public function adminDestroy(Request $request, TrustedDevice $device): RedirectResponse
    {
        $deviceName = $device->device_name;
        $userName   = $device->user?->name ?? 'Unknown';

        $this->trustedDeviceService->revoke($device);

        AuditLog::logActivity(
            'trust_device_admin_revoked',
            "Superadmin mencabut perangkat terpercaya '{$deviceName}' milik user '{$userName}'",
            'warning'
        );

        return back()->with('success', "Perangkat '{$deviceName}' milik {$userName} berhasil dicabut.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Determine if the given device record matches the current browser session.
     */
    private function isCurrentDevice(Request $request, TrustedDevice $device): bool
    {
        $rawToken = $request->cookie(TrustedDeviceService::COOKIE_NAME);
        if (empty($rawToken)) {
            return false;
        }

        return hash('sha256', $rawToken) === $device->token_hash;
    }
}
