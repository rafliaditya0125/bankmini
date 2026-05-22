import { Head, router } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationsProps {
    notifications: {
        data: Notification[];
        links: any[];
        current_page: number;
        last_page: number;
    };
}

export default function Notifications({ notifications }: NotificationsProps) {
    const markAsRead = (id: number) => {
        router.post(`/nasabah/notifications/${id}/read`);
    };

    const markAllAsRead = () => {
        router.post('/nasabah/notifications/read-all');
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Pusat Notifikasi</p>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Notifikasi Saya</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Lihat riwayat aktivitas dan pemberitahuan penting mengenai akun Anda.</p>
                        </div>
                        <button
                            onClick={markAllAsRead}
                            className="px-6 py-3 text-[10px] font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-[0.2em] border border-emerald-400/30 whitespace-nowrap self-start md:self-center"
                        >
                            Tandai Semua Dibaca
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Notifikasi" />

            <div className="max-w-4xl mx-auto space-y-4">
                {notifications.data.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mb-4">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Belum ada notifikasi</h3>
                        <p className="mt-1 text-xs text-gray-500 font-medium">Semua pemberitahuan transaksi akan muncul di sini.</p>
                    </div>
                ) : (
                    notifications.data.map((notification) => (
                        <div
                            key={notification.id}
                            className={`group relative bg-white rounded-2xl border transition-all hover:shadow-md ${
                                !notification.is_read ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100 shadow-xs'
                            }`}
                        >
                            <div className="p-6 flex gap-4">
                                <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
                                    notification.type === 'transaction' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                    {notification.type === 'transaction' ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                            {notification.title}
                                        </h3>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                            {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.created_at))}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-2xl">{notification.message}</p>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="mt-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors"
                                        >
                                            Tandai dibaca
                                        </button>
                                    )}
                                </div>
                                {!notification.is_read && (
                                    <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    ))
                )}

                {/* Pagination (Simple) */}
                {notifications.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pb-12">
                        {Array.from({ length: notifications.last_page }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => router.get(`/nasabah/notifications?page=${page}`)}
                                className={`h-10 w-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    notifications.current_page === page
                                        ? 'bg-emerald-600 text-white border-none shadow-lg'
                                        : 'bg-white text-gray-500 border border-slate-200 hover:border-emerald-300'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
