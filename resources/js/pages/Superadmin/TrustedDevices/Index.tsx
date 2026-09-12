import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface DeviceUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface TrustedDevice {
    id: number;
    device_name: string;
    ip_address: string | null;
    last_used_at: string | null;
    expires_at: string;
    created_at: string;
    user: DeviceUser | null;
}

interface PaginatedDevices {
    data: TrustedDevice[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface PageProps extends Record<string, unknown> {
    devices?: PaginatedDevices;
    filters?: { search?: string };
    flash?: { success?: string; error?: string };
}

const roleLabel: Record<string, string> = {
    superadmin: 'Superadmin',
    admin: 'Admin',
    teller: 'Teller',
    nasabah: 'Nasabah',
};

const roleBadge: Record<string, string> = {
    superadmin: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    teller: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    nasabah: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function TrustedDevicesIndex({ devices, filters }: PageProps) {
    const { props } = usePage<PageProps>();
    const flash = props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('superadmin.trusted-devices.index'), { search }, { preserveState: true });
    };

    const handleRevoke = (device: TrustedDevice) => {
        router.delete(route('superadmin.trusted-devices.destroy', device.id), {
            onSuccess: () => setConfirmId(null),
        });
    };

    return (
        <div className="space-y-6">
            <Head title="Manajemen Perangkat Terpercaya" />

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/20">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">Perangkat Terpercaya</h1>
                        <p className="text-xs text-slate-400">Semua perangkat terpercaya aktif di sistem</p>
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Cari nama / email user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all w-56"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
                    >
                        Cari
                    </button>
                </form>
            </div>

            {/* Flash */}
            {flash?.success && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-400">
                    {flash.success}
                </div>
            )}

            {/* Stats */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 px-6 py-4">
                <p className="text-xs text-slate-400">
                    Menampilkan <span className="text-white font-bold">{devices.from ?? 0}–{devices.to ?? 0}</span> dari{' '}
                    <span className="text-white font-bold">{devices.total}</span> perangkat aktif
                </p>
            </div>

            {/* Table */}
            {devices.data.length === 0 ? (
                <div className="rounded-[2rem] bg-slate-900/90 border border-slate-800 p-12 text-center">
                    <p className="text-sm font-bold text-slate-400">Tidak ada perangkat terpercaya aktif</p>
                </div>
            ) : (
                <div className="rounded-[2rem] bg-slate-900/90 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Perangkat</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Terakhir Digunakan</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Berlaku Hingga</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {devices.data.map((device) => (
                                    <tr key={device.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{device.device_name}</p>
                                                    {device.ip_address && (
                                                        <p className="text-[10px] text-slate-500">{device.ip_address}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {device.user ? (
                                                <div>
                                                    <p className="text-xs font-bold text-white">{device.user.name}</p>
                                                    <p className="text-[10px] text-slate-500">{device.user.email}</p>
                                                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wider border rounded-full px-2 py-0.5 ${roleBadge[device.user.role] ?? ''}`}>
                                                        {roleLabel[device.user.role] ?? device.user.role}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-300">{device.last_used_at ?? '—'}</p>
                                            <p className="text-[10px] text-slate-500">Ditambahkan: {device.created_at}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-amber-400">{device.expires_at}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {confirmId === device.id ? (
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => handleRevoke(device)}
                                                        className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors"
                                                    >
                                                        Ya, Cabut
                                                    </button>
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
                                                    Cabut Akses
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {devices.last_page > 1 && (
                        <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-center gap-1">
                            {devices.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url || link.active}
                                    onClick={() => link.url && router.get(link.url)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                        link.active
                                            ? 'bg-violet-600 text-white'
                                            : link.url
                                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            : 'text-slate-600 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
