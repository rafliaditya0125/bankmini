import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import ConfirmModal from '@/components/ConfirmModal';
import type { Jurusan } from '@/types';

interface Rombel {
    id: number;
    jurusan_id: number;
    tahun_ajaran: string;
    tingkat: number;
    nama?: string;
    nasabah_count: number;
    created_at: string;
}

interface RombelManageProps {
    jurusan: Jurusan;
    rombels: Rombel[];
    tahun_ajaran_list: string[];
}

export default function RombelManage({ jurusan, rombels, tahun_ajaran_list }: RombelManageProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Rombel | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info' | 'success';
        onConfirm: () => void;
    }>({
        show: false,
        title: '',
        message: '',
        variant: 'info',
        onConfirm: () => {}
    });

    const isAllSelected = rombels.length > 0 && rombels.every(r => selectedIds.includes(r.id));

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rombels.map(r => r.id));
        }
    };

    const handleBulkPromote = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            show: true,
            title: 'Naikkan Tingkat Rombel Massal',
            message: `Apakah Anda yakin ingin menaikkan tingkat ${selectedIds.length} rombel yang dipilih? (Tingkat 10 -> 11, 11 -> 12).`,
            variant: 'info',
            onConfirm: () => {
                router.post(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/bulk-promote`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            show: true,
            title: 'Hapus Rombel Massal',
            message: `Apakah Anda yakin ingin MENGHAPUS ${selectedIds.length} rombel yang dipilih? Rombel yang masih memiliki siswa terdaftar akan otomatis dilewati.`,
            variant: 'danger',
            onConfirm: () => {
                router.post(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/bulk-delete`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const handleTahunAjaranChange = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        
        // Format as YYYY/YYYY
        let formatted = '';
        if (digits.length <= 4) {
            formatted = digits;
        } else {
            formatted = digits.substring(0, 4) + '/' + digits.substring(4, 8);
        }
        
        setData('tahun_ajaran', formatted);
    };

    const handleEditTahunAjaranChange = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        
        // Format as YYYY/YYYY
        let formatted = '';
        if (digits.length <= 4) {
            formatted = digits;
        } else {
            formatted = digits.substring(0, 4) + '/' + digits.substring(4, 8);
        }
        
        setEditData('tahun_ajaran', formatted);
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        tahun_ajaran: '',
        tingkat: '10',
        nama: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        tahun_ajaran: '',
        tingkat: '10',
        nama: '',
    });

    const importForm = useForm<{ files: File[] }>({
        files: [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/${rolePrefix}/jurusan/${jurusan.id}/rombel`, {
            onSuccess: () => {
                setModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        putEdit(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/import`, {
            preserveScroll: true,
            onSuccess: () => {
                setImportOpen(false);
                importForm.reset();
            },
        });
    };

    const openEditModal = (rombel: Rombel) => {
        setEditTarget(rombel);
        setEditData('tahun_ajaran', rombel.tahun_ajaran);
        setEditData('tingkat', rombel.tingkat.toString());
        setEditData('nama', rombel.nama || '');
        setEditOpen(true);
    };

    const handleDelete = (rombel: Rombel) => {
        setConfirmModal({
            show: true,
            title: 'Hapus Rombel',
            message: `Apakah Anda yakin ingin menghapus rombel ${getRombelName(rombel)}? Tindakan ini tidak dapat dibatalkan.`,
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/${rombel.id}`, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(prev => ({ ...prev, show: false }))
                });
            }
        });
    };

    const getRombelName = (rombel: Rombel) => {
        return rombel.nama || `${rombel.tingkat} ${jurusan.kode}`;
    };

    // Group rombels by tahun_ajaran
    const groupedRombels = rombels.reduce((acc, rombel) => {
        if (!acc[rombel.tahun_ajaran]) {
            acc[rombel.tahun_ajaran] = [];
        }
        acc[rombel.tahun_ajaran].push(rombel);
        return acc;
    }, {} as Record<string, Rombel[]>);

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href={`/${rolePrefix}/jurusan`} className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold mb-2 inline-flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Kembali ke Jurusan
                        </Link>
                        <h1 className="text-2xl font-semibold text-slate-900">Kelola Rombel - {jurusan.nama}</h1>
                        <p className="mt-1 text-sm text-slate-500">Atur rombel per angkatan untuk jurusan {jurusan.kode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {rombels.length > 0 && (
                            <button
                                onClick={handleSelectAll}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-[10px] font-semibold text-slate-700 uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={() => {}}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                />
                                <span>{isAllSelected ? 'Batal Pilih' : 'Pilih Semua'}</span>
                            </button>
                        )}
                        <button
                            onClick={() => setImportOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="hidden md:inline">Import Excel</span>
                            <span className="md:hidden">Import</span>
                        </button>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-md"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden md:inline">Tambah Rombel</span>
                            <span className="md:hidden">Tambah</span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Kelola Rombel - ${jurusan.nama}`} />

            <div className="space-y-6">
                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center bg-emerald-500 text-slate-900 font-black text-xs h-7 min-w-7 px-2 rounded-xl">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                                Rombel Terpilih
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleBulkPromote}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Naikkan Tingkat
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Rombel
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {Object.keys(groupedRombels).length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200/70 p-12 text-center">
                        <svg className="h-16 w-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-slate-500 font-semibold">Belum ada rombel</p>
                        <p className="text-sm text-slate-400 mt-1">Mulai dengan menambahkan rombel baru</p>
                    </div>
                ) : (
                    Object.entries(groupedRombels).map(([tahun, rombelList]) => (
                        <div key={tahun} className="space-y-3">
                            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Angkatan {tahun}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rombelList.map((rombel) => (
                                    <div
                                        key={rombel.id}
                                        className={`rounded-2xl bg-white border p-4 hover:shadow-md transition-all ${
                                            selectedIds.includes(rombel.id) ? 'border-emerald-500 ring-2 ring-emerald-200/60 bg-emerald-50/20' : 'border-slate-200/70'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(rombel.id)}
                                                    onChange={() => handleToggleSelect(rombel.id)}
                                                    className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                                                />
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{getRombelName(rombel)}</h3>
                                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
                                                        Tingkat {rombel.tingkat}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {rombel.nasabah_count} siswa
                                                </span>
                                                <Dropdown
                                                    trigger={
                                                        <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    <DropdownItem
                                                        onClick={() => openEditModal(rombel)}
                                                        className="text-gray-500 hover:text-amber-600"
                                                        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>}
                                                    >
                                                        <span className="font-black text-[10px] uppercase tracking-widest">Edit</span>
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        onClick={() => handleDelete(rombel)}
                                                        className="text-rose-600 hover:bg-rose-50 border-t border-gray-100"
                                                        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>}
                                                    >
                                                        <span className="font-black text-[10px] uppercase tracking-widest">Hapus</span>
                                                    </DropdownItem>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                show={confirmModal.show}
                onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />

            {/* Modal Tambah Rombel */}
            <Modal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Tambah Rombel Baru"
                description="Buat rombel baru untuk jurusan ini"
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Angkatan (Tahun Ajaran)</label>
                            <input
                                type="text"
                                value={data.tahun_ajaran}
                                onChange={e => handleTahunAjaranChange(e.target.value)}
                                placeholder="2025/2026"
                                maxLength={9}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                                required
                            />
                            {errors.tahun_ajaran && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.tahun_ajaran}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tingkat</label>
                            <select value={data.tingkat} onChange={e => setData('tingkat', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Rombel</label>
                            <input type="text" value={data.nama} onChange={e => setData('nama', e.target.value)} maxLength={255} placeholder="Misal: 11 RPL 1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.nama && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.nama}</p>}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={processing} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Proses...' : 'Tambah Rombel'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Rombel */}
            <Modal
                show={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Rombel"
                description="Perbarui informasi rombel"
                maxWidth="2xl"
            >
                <form onSubmit={handleEditSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Angkatan (Tahun Ajaran)</label>
                            <input
                                type="text"
                                value={editData.tahun_ajaran}
                                onChange={e => handleEditTahunAjaranChange(e.target.value)}
                                placeholder="2025/2026"
                                maxLength={9}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm"
                                required
                            />
                            {editErrors.tahun_ajaran && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.tahun_ajaran}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tingkat</label>
                            <select value={editData.tingkat} onChange={e => setEditData('tingkat', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Rombel</label>
                            <input type="text" value={editData.nama} onChange={e => setEditData('nama', e.target.value)} maxLength={255} placeholder="Misal: 11 RPL 1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm" required />
                            {editErrors.nama && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.nama}</p>}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setEditOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={editProcessing} className="px-8 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-blue-400">
                            {editProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Import Rombel */}
            <Modal
                show={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import Rombel"
                description="Import daftar rombel dari file Excel"
                maxWidth="md"
            >
                <form onSubmit={handleImportSubmit} className="space-y-6">
                    <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-slate-800">Format Data Excel</h3>
                                <p className="text-xs text-slate-500 mt-1 mb-3">Kolom: tahun_ajaran, tingkat, nama</p>
                                <a
                                    href={`/${rolePrefix}/jurusan/${jurusan.id}/rombel/template`}
                                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Template
                                </a>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">File Excel (.xlsx, .xls) - Bisa pilih lebih dari 1 file</label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                multiple
                                onChange={e => importForm.setData('files', e.target.files ? Array.from(e.target.files) : [])}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer border border-slate-200 rounded-xl bg-white"
                                required
                            />
                            {importForm.errors.files && (
                                <p className="text-[10px] text-red-500 mt-2 font-black uppercase tracking-widest">{importForm.errors.files}</p>
                            )}
                            {(importForm.errors as any).file && (
                                <p className="text-[10px] text-red-500 mt-2 font-black uppercase tracking-widest">{(importForm.errors as any).file}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setImportOpen(false)}
                            className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={importForm.processing || importForm.data.files.length === 0}
                            className="px-8 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400 disabled:shadow-none flex items-center gap-2"
                        >
                            {importForm.processing && (
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {importForm.processing ? 'Mengimport...' : 'Import Data'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
