import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface TrustedDevice {
    id: number;
    device_name: string;
    ip_address: string | null;
    last_used_at: string | null;
    expires_at: string;
    created_at: string;
    is_current: boolean;
}

interface PageProps extends Record<string, unknown> {
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
    devices?: TrustedDevice[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function TrustedDevices({ devices = [] }: PageProps) {
    const { props } = usePage<PageProps>();
    const flash = props.flash;
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const handleRevoke = (id: number) => {
        // Use route helper based on current role — handled via Ziggy
        const url = window.location.pathname.includes('superadmin')
            ? route('superadmin.profil.trusted-devices.destroy', id)
            : window.location.pathname.includes('teller')
            ? route('teller.profil.trusted-devices.destroy', id)
            : window.location.pathname.includes('admin')
            ? route('admin.profil.trusted-devices.destroy', id)
            : route('nasabah.profil.trusted-devices.destroy', id);

        router.delete(url, {
            onSuccess: () => setConfirmId(null),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
            <Head title="Perangkat Terpercaya" />

            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white">Perangkat Terpercaya</h1>
                            <p className="text-xs text-slate-400">Kelola perangkat yang dapat melewati verifikasi 2FA</p>
                        </div>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-400">
                        {flash.success}
                    </div>
                )}

                {/* Info box */}
                <div className="mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Perangkat yang ada di daftar ini dapat masuk ke akun Anda tanpa verifikasi 2FA selama masa berlaku aktif.
                        Jika Anda mencurigai ada perangkat yang tidak dikenal, segera cabut aksesnya.
                    </p>
                </div>

                {/* Device list */}
                {devices.length === 0 ? (
                    <div className="rounded-[2rem] bg-slate-900/90 border border-slate-800 p-12 text-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 mb-4">
                            <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400">Belum ada perangkat terpercaya</p>
                        <p className="text-xs text-slate-500 mt-1">Centang "Percayai perangkat ini" saat login 2FA berikutnya</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {devices.map((device) => (
                            <div
                                key={device.id}
                                className={`rounded-2xl border p-5 transition-all ${
                                    device.is_current
                                        ? 'bg-emerald-500/5 border-emerald-500/30'
                                        : 'bg-slate-900/90 border-slate-800'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        {/* Device icon */}
                                        <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${
                                            device.is_current ? 'bg-emerald-500/20' : 'bg-slate-800'
                                        }`}>
                                            <svg className={`h-5 w-5 ${device.is_current ? 'text-emerald-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-white truncate">{device.device_name}</p>
                                                {device.is_current && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                        Perangkat Ini
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 space-y-0.5">
                                                {device.ip_address && (
                                                    <p className="text-[11px] text-slate-500">IP: {device.ip_address}</p>
                                                )}
                                                <p className="text-[11px] text-slate-500">
                                                    Ditambahkan: {device.created_at}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Terakhir digunakan: {device.last_used_at ?? 'Belum pernah'}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Berlaku hingga: <span className="text-amber-400">{device.expires_at}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Revoke button */}
                                    <div className="flex-shrink-0">
                                        {confirmId === device.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRevoke(device.id)}
                                                    className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors"
                                                >
                                                    Hapus
                                                </button>
                                                <span className="text-slate-600">|</span>
                                                <button
                                                    onClick={() => setConfirmId(null)}
                                                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmId(device.id)}
                                                className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-rose-400 transition-colors"
                                            >
                                                Cabut
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
