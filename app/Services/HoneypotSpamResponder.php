<?php

namespace App\Services;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Spatie\Honeypot\SpamResponder\SpamResponder;

class HoneypotSpamResponder implements SpamResponder
{
    public function respond(Request $request, Closure $next)
    {
        try {
            AuditLog::logActivity(
                'bot_blocked',
                'Aktivitas bot terdeteksi dan diblokir oleh Honeypot pada rute ' . $request->path() . ' (IP: ' . $request->ip() . ')',
                'warning'
            );
        } catch (\Throwable $e) {
            // Ignore if DB logging fails
        }

        if ($request->wantsJson() || $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Permintaan mencurigakan terdeteksi dan telah diblokir.',
            ], 422);
        }

        return response('', 422);
    }
}
