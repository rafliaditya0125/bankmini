<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_name',
        'role',
        'action',
        'description',
        'ip_address',
        'user_agent',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the audit log.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log an activity
     */
    public static function logActivity($action, $description, $status = 'success', $userId = null, $userName = null, $role = null)
    {
        $user = null;
        // Try to get authenticated user
        if (function_exists('auth') && auth()->check()) {
            $user = auth()->user();
        }
        $finalUserName = $userName;
        if (empty($finalUserName)) {
            if ($user && !empty($user->name)) {
                $finalUserName = $user->name;
            } else {
                $finalUserName = 'System';
            }
        }
        return self::create([
            'user_id' => $userId ?? ($user ? $user->id : null),
            'user_name' => $finalUserName,
            'role' => $role ?? ($user ? $user->role : 'system'),
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'Unknown',
            'status' => $status,
        ]);
    }

    /**
     * Get filtered logs
     */
    public static function getFilteredLogs($filters = [])
    {
        $query = self::latest();

        // Filter by action
        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        // Filter by user
        if (!empty($filters['user'])) {
            $query->where('user_name', 'like', '%' . $filters['user'] . '%');
        }

        // Filter by date range
        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query;
    }
}
