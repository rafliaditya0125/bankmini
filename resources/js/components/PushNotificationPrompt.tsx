import React, { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationPrompt() {
    const { isSupported, permission, subscribeUser } = usePushNotifications();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Cek localStorage, jika user sudah memilih "Nanti", sembunyikan selama 1 hari
        const dismissedAt = localStorage.getItem('push_prompt_dismissedAt');
        
        if (isSupported && permission === 'default') {
            if (dismissedAt) {
                const now = new Date().getTime();
                const dismissedTime = parseInt(dismissedAt, 10);
                const oneDay = 24 * 60 * 60 * 1000;
                
                // Tampilkan lagi jika sudah lebih dari 1 hari
                if (now - dismissedTime > oneDay) {
                    setIsVisible(true);
                }
            } else {
                // Tampilkan secara default jika belum pernah dismiss
                // dan sedikit delay agar tidak bentrok dengan PWA prompt di load pertama
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isSupported, permission]);

    const handleEnableClick = async () => {
        setIsVisible(false);
        await subscribeUser();
    };

    const handleDismissClick = () => {
        localStorage.setItem('push_prompt_dismissedAt', new Date().getTime().toString());
        setIsVisible(false);
    };

    if (!isVisible || permission !== 'default') return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[90] md:bottom-24 md:left-auto md:right-8 md:w-80 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-emerald-100 dark:border-gray-800 p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Aktifkan Notifikasi</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium leading-tight mt-0.5">Terima pemberitahuan transaksi langsung di HP Anda.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleEnableClick}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        Izinkan
                    </button>
                    <button 
                        onClick={handleDismissClick}
                        className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Nanti
                    </button>
                </div>
            </div>
        </div>
    );
}
