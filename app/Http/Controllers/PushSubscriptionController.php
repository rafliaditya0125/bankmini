<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    /**
     * Simpan atau update push subscription dari browser.
     */
    public function store(Request $request)
    {
        $request->validate([
            'endpoint'                => 'required|url',
            'keys.auth'               => 'required|string',
            'keys.p256dh'             => 'required|string',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $user->updatePushSubscription(
            $request->endpoint,
            $request->keys['p256dh'],
            $request->keys['auth'],
        );

        return response()->json(['message' => 'Subscription berhasil disimpan.'], 201);
    }

    /**
     * Hapus push subscription.
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|url',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $user->deletePushSubscription($request->endpoint);

        return response()->json(['message' => 'Subscription berhasil dihapus.']);
    }

    /**
     * Kembalikan VAPID public key untuk digunakan di frontend.
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'publicKey' => config('webpush.vapid.public_key'),
        ]);
    }
}
