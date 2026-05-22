<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log authenticated user activities
        if (auth()->check() && $this->shouldLogActivity($request)) {
            $action = $this->getActionFromRequest($request);
            $description = $this->getDescriptionFromRequest($request, $response);
            $status = $this->getStatusFromResponse($response);

            if ($action && $description) {
                AuditLog::logActivity($action, $description, $status);
            }
        }

        return $response;
    }

    /**
     * Determine if the request should be logged
     */
    private function shouldLogActivity(Request $request): bool
    {
        // Don't log GET requests to audit trail page itself
        if ($request->is('superadmin/audit-trail*')) {
            return false;
        }

        // Don't log asset requests
        if ($request->is('build/*') || $request->is('assets/*')) {
            return false;
        }

        // Don't log Inertia requests (they're handled separately)
        if ($request->header('X-Inertia')) {
            return false;
        }

        // Log POST, PUT, DELETE, PATCH requests
        return in_array($request->method(), ['POST', 'PUT', 'DELETE', 'PATCH']);
    }

    /**
     * Get action from request
     */
    private function getActionFromRequest(Request $request): string
    {
        $route = $request->route();
        if (!$route) {
            return 'unknown';
        }

        $routeName = $route->getName();
        $method = $request->method();
        $uri = $request->path();

        // Map routes to actions
        $actionMap = [
            'login' => 'login',
            'logout' => 'logout',
            'nasabah.store' => 'create_nasabah',
            'nasabah.update' => 'edit_nasabah',
            'nasabah.destroy' => 'delete_nasabah',
            'petugas.store' => 'create_user',
            'petugas.update' => 'edit_user',
            'petugas.destroy' => 'delete_user',
            'setor.store' => 'setor',
            'tarik.store' => 'tarik',
            'transfer.store' => 'transfer',
            'backup.create' => 'backup_created',
            'backup.restore' => 'backup_restored',
            'pengaturan.store' => 'edit_settings',
        ];

        // Check for specific route names
        foreach ($actionMap as $key => $action) {
            if ($routeName && str_contains($routeName, $key)) {
                return $action;
            }
        }

        // Check URI patterns
        if (str_contains($uri, 'login')) {
            return 'login';
        } elseif (str_contains($uri, 'logout')) {
            return 'logout';
        } elseif (str_contains($uri, 'setor')) {
            return 'setor';
        } elseif (str_contains($uri, 'tarik')) {
            return 'tarik';
        } elseif (str_contains($uri, 'transfer')) {
            return 'transfer';
        }

        // Default action based on HTTP method
        if ($method === 'POST') {
            return 'create';
        } elseif ($method === 'PUT' || $method === 'PATCH') {
            return 'update';
        } elseif ($method === 'DELETE') {
            return 'delete';
        }

        return 'unknown';
    }

    /**
     * Get description from request
     */
    private function getDescriptionFromRequest(Request $request, $response): string
    {
        $route = $request->route();
        if (!$route) {
            return 'Unknown activity';
        }

        $routeName = $route->getName();
        $user = auth()->user();

        // Specific descriptions for common actions
        if ($routeName === 'login') {
            return 'User berhasil login ke sistem';
        } elseif ($routeName === 'logout') {
            return 'User logout dari sistem';
        } elseif (str_contains($routeName, 'setor')) {
            $amount = $request->input('jumlah');
            $nasabah = $request->input('nomor_rekening');
            return "Transaksi setor sebesar Rp " . number_format($amount, 0, ',', '.') . " untuk nasabah $nasabah";
        } elseif (str_contains($routeName, 'tarik')) {
            $amount = $request->input('jumlah');
            $nasabah = $request->input('nomor_rekening');
            return "Transaksi tarik sebesar Rp " . number_format($amount, 0, ',', '.') . " untuk nasabah $nasabah";
        } elseif (str_contains($routeName, 'transfer')) {
            $amount = $request->input('jumlah');
            $from = $request->input('nomor_rekening_pengirim');
            $to = $request->input('nomor_rekening_penerima');
            return "Transfer sebesar Rp " . number_format($amount, 0, ',', '.') . " dari $from ke $to";
        } elseif (str_contains($routeName, 'nasabah.store')) {
            $name = $request->input('name');
            $nomor = $request->input('nomor_rekening');
            return "Membuat nasabah baru: $name ($nomor)";
        } elseif (str_contains($routeName, 'petugas.store')) {
            $name = $request->input('name');
            $email = $request->input('email');
            return "Membuat user baru: $name ($email)";
        }

        // Generic description
        return "Melakukan aktivitas pada route: $routeName";
    }

    /**
     * Get status from response
     */
    private function getStatusFromResponse($response): string
    {
        // Check if response indicates success or failure
        if ($response instanceof \Illuminate\Http\RedirectResponse) {
            // Check for error messages in session
            if (session()->has('errors') || session()->has('error')) {
                return 'failed';
            }
            return 'success';
        }

        // For successful responses
        return 'success';
    }
}
