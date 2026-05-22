import { Head, router, usePage, useForm } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useState, useRef, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import Dropdown, { DropdownItem } from '@/components/Dropdown';

interface BackupPageProps {
    backups: any[];
    name: string;
}

export default function Backup({ backups = [], name }: BackupPageProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';

    const [search, setSearch] = useState('');
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [restoreMode, setRestoreMode] = useState<'full' | 'latest'>('full');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredBackups = backups.filter(backup => 
        backup.filename.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreateBackup = (type: 'full' | 'incremental') => {
        router.post(`/${rolePrefix}/backup/create`, { type }, {
            onSuccess: () => {
                // Flash message handled by backend
            }
        });
    };

    const handleRestore = () => {
        if (!selectedBackup) return;
        router.post(`/${rolePrefix}/backup/restore`, {
            filename: selectedBackup,
            mode: restoreMode
        }, {
            onSuccess: () => {
                setShowRestoreConfirm(false);
                setSelectedBackup(null);
            }
        });
    };

    const handleDelete = () => {
        if (!selectedBackup) return;
        router.post(`/${rolePrefix}/backup/delete`, {
            filename: selectedBackup
        }, {
            onSuccess: () => {
                setShowDeleteConfirm(false);
                setSelectedBackup(null);
            }
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        router.post(`/${rolePrefix}/backup/upload`, formData as any, {
            onSuccess: () => {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Backup & Restore</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Backup & Restore</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Kelola cadangan data dan pemulihan sistem {name} secara aman dan terstruktur.</p>
                        </div>
                        <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Unggah SQL
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".sql" className="hidden" />
                        
                        <Dropdown
                            trigger={
                                <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all border border-emerald-400/30">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Buat Backup
                                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            }
                        >
                            <DropdownItem onClick={() => handleCreateBackup('full')}>
                                <div className="flex flex-col">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Backup Full</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Seluruh basis data</span>
                                </div>
                            </DropdownItem>
                            <DropdownItem onClick={() => handleCreateBackup('incremental')}>
                                <div className="flex flex-col">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Backup Incremental</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Hanya data transaksi</span>
                                </div>
                            </DropdownItem>
                        </Dropdown>
                    </div>
                </div>
                </div>
            }
        >
            <Head title={`Backup & Restore - ${name}`} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Backup List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                        <div className="max-w-md">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Cari File</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama file backup..."
                                    maxLength={255}
                                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                />
                                <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                        <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Nama Berkas Backup</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Ukuran</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredBackups.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Tidak ada riwayat backup ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBackups.map((backup) => (
                                            <tr key={backup.filename} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2.5 rounded-xl shrink-0 shadow-sm ${
                                                            backup.type === 'full' ? 'bg-emerald-100 text-emerald-700 shadow-emerald-100' :
                                                            backup.type === 'incremental' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' :
                                                            'bg-emerald-50 text-emerald-600 shadow-emerald-100'
                                                        }`}>
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-black text-gray-900 truncate tracking-tight">{backup.filename}</span>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{backup.created_at}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-gray-600 uppercase">{backup.size}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Dropdown
                                                        trigger={
                                                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                </svg>
                                                            </button>
                                                        }
                                                    >
                                                        <DropdownItem 
                                                            onClick={() => {
                                                                setSelectedBackup(backup.filename);
                                                                setShowRestoreConfirm(true);
                                                            }}
                                                            icon={<svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest text-emerald-600">Restore Data</span>
                                                        </DropdownItem>
                                                        <DropdownItem 
                                                            href={`/${rolePrefix}/backup/download/${backup.filename}`}
                                                            icon={<svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest text-emerald-600">Unduh SQL</span>
                                                        </DropdownItem>
                                                        <DropdownItem 
                                                            onClick={() => {
                                                                setSelectedBackup(backup.filename);
                                                                setShowDeleteConfirm(true);
                                                            }}
                                                            className="text-rose-600 hover:bg-rose-50"
                                                            icon={<svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest">Hapus Permanen</span>
                                                        </DropdownItem>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Settings & Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-8">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Metode Pemulihan</h2>
                        <div className="space-y-4">
                            <button
                                onClick={() => setRestoreMode('full')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                    restoreMode === 'full' ? 'bg-emerald-50 border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <div className={`h-5 w-5 rounded-full border-4 flex shrink-0 transition-colors ${restoreMode === 'full' ? 'border-emerald-600' : 'border-slate-200'}`}></div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Restore Full</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mt-0.5 leading-relaxed">Timpa seluruh data & reset basis data</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setRestoreMode('latest')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                    restoreMode === 'latest' ? 'bg-emerald-50 border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <div className={`h-5 w-5 rounded-full border-4 flex shrink-0 transition-colors ${restoreMode === 'latest' ? 'border-emerald-600' : 'border-slate-200'}`}></div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Update Query</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mt-0.5 leading-relaxed">Jalankan SQL tanpa menghapus data</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="bg-red-600 rounded-2xl shadow-xl shadow-red-200 p-8 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Peringatan</h2>
                        </div>
                        <p className="text-red-50 text-[11px] font-bold uppercase tracking-tight leading-relaxed mb-6">
                            Tindakan pemulihan (restore) bersifat permanen. Seluruh data transaksi saat ini mungkin akan tertimpa. Mohon amankan data Anda sebelum melanjutkan.
                        </p>
                        <div className="p-4 bg-black/20 rounded-xl border border-white/10 text-[9px] text-red-100 uppercase font-black tracking-[0.2em] text-center">
                            MySQL / MariaDB Engine
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                show={showRestoreConfirm}
                onClose={() => setShowRestoreConfirm(false)}
                onConfirm={handleRestore}
                title="Restore Data?"
                message={`Sistem akan memulihkan data menggunakan file "${selectedBackup}". Proses ini akan menimpa data saat ini.`}
                variant="warning"
                confirmText="Ya, Restore Sekarang"
            />

            <ConfirmModal
                show={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Hapus Backup?"
                message={`File "${selectedBackup}" akan dihapus permanen dari server.`}
                variant="danger"
                confirmText="Ya, Hapus Permanen"
            />
        </DashboardLayout>
    );
}
