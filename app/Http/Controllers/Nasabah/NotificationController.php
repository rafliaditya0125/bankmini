<?php

namespace App\Http\Controllers\Nasabah;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 200));

        $notifications = $request->user()->notifications()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('nasabah/Notifications', [
            'notifications' => $notifications,
            'filters' => ['per_page' => $perPage],
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->update(['is_read' => true]);

        return back();
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications()->update(['is_read' => true]);

        return back()->with('success', 'Semua notifikasi ditandai telah dibaca');
    }
}
