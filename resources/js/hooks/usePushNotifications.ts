import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * usePushNotifications
 *
 * Hook yang mengelola subscription Web Push Notifications.
 * - Mengekspos status dukungan dan permission
 * - Menyediakan fungi subscribeUser() untuk dipanggil saat user menyetujui prompt khusus
 */
export function usePushNotifications() {
    const subscribed = useRef(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Cek dukungan push notification
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            setIsSupported(false);
            return;
        }
        
        setIsSupported(true);
        setPermission(Notification.permission);

        // Jika sudah pernah diberikan izin, langsung subscribe di background
        if (Notification.permission === 'granted' && !subscribed.current) {
            subscribeUser(true);
        }
    }, []);

    const subscribeUser = async (isAutoSub: boolean = false) => {
        if (subscribed.current) return;
        
        try {
            let perm = Notification.permission;
            
            // Minta izin secara eksplisit jika dipanggil secara manual
            if (!isAutoSub && perm !== 'granted') {
                perm = await Notification.requestPermission();
                setPermission(perm);
            }

            if (perm !== 'granted') return;

            subscribed.current = true;

            const { data } = await axios.get<{ publicKey: string }>('/push/vapid-key');
            const vapidPublicKey = data.publicKey;

            const registration = await navigator.serviceWorker.ready;

            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                await sendSubscriptionToServer(existing);
                return;
            }

            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            await sendSubscriptionToServer(subscription);
        } catch (error) {
            console.warn('[PushNotifications] Gagal subscribe:', error);
            subscribed.current = false;
        }
    };

    return { isSupported, permission, subscribeUser };
}

/**
 * Kirim subscription object ke backend.
 */
async function sendSubscriptionToServer(subscription: PushSubscription) {
    const subJson = subscription.toJSON();

    await axios.post('/push/subscribe', {
        endpoint:  subJson.endpoint,
        keys: {
            auth:   subJson.keys?.auth,
            p256dh: subJson.keys?.p256dh,
        },
    });
}

/**
 * Konversi VAPID public key dari base64 ke Uint8Array
 * (diperlukan oleh PushManager.subscribe).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const buffer  = new ArrayBuffer(rawData.length);
    const output  = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}
