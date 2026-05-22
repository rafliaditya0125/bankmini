<?php

namespace App\Http\Controllers\Nasabah;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('nasabah/Notifications', [
            'notifications' => $notifications,
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
