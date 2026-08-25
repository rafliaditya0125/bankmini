import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import type { Jurusan } from '@/types';
import { formatRombelName } from '@/lib/utils';

interface Rombel {
    id: number;
    jurusan_id: number;
    tahun_ajaran: string;
    tingkat: number;
    nama?: string;
    nama_kelas?: string;
    nasabah_count: number;
    created_at: string;
    jurusan?: Jurusan;
}

interface RombelIndexProps {
    rombels: {
        data: Rombel[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    jurusans: Jurusan[];
    filters: {
        search?: string;
        jurusan_id?: number;
    };
}

export default function RombelIndex({ rombels, jurusans, filters }: RombelIndexProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [search, setSearch] = useState(filters.search || '');
    const [jurusanFilter, setJurusanFilter] = useState(filters.jurusan_id?.toString() || '');
    const [modalOpen, setModalOpen] = useState(false);
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

    // Realtime search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const queryParams: any = {};
            if (search) queryParams.search = search;
            if (jurusanFilter) queryParams.jurusan_id = jurusanFilter;

            if (
                search !== (filters.search || '') ||
                jurusanFilter !== (filters.jurusan_id?.toString() || '')
            ) {
                setSelectedIds([]);
                router.get(`/${rolePrefix}/rombel`, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, jurusanFilter, rolePrefix, filters]);

    useEffect(() => {
        setSearch(filters.search || '');
        setJurusanFilter(filters.jurusan_id?.toString() || '');
        setSelectedIds([]);
    }, [filters]);

    const isAllSelected = rombels.data.length > 0 && rombels.data.every(r => selectedIds.includes(r.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected && rombels.data.some(r => selectedIds.includes(r.id));

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(rombels.data.map(r => r.id));
        }
    };

    const handleBulkPromote = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            show: true,
            title: 'Naikkan Tingkat Kelas Massal',
            message: `Apakah Anda yakin ingin menaikkan tingkat ${selectedIds.length} kelas yang dipilih? (Tingkat 10 -> 11, 11 -> 12).`,
            variant: 'info',
            onConfirm: () => {
                router.post(`/${rolePrefix}/kelas/bulk-promote`, { ids: selectedIds }, {
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
            title: 'Hapus Kelas Massal',
            message: `Apakah Anda yakin ingin MENGHAPUS ${selectedIds.length} kelas yang dipilih? Kelas yang masih memiliki data siswa terdaftar akan otomatis dilewati.`,
            variant: 'danger',
            onConfirm: () => {
                router.post(`/${rolePrefix}/kelas/bulk-delete`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        jurusan_id: '',
        tahun_ajaran: '',
        tingkat: '10',
        jumlah_rombel: '1',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        jurusan_id: '',
        tahun_ajaran: '',
        tingkat: '10',
        nama: '',
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!data.jurusan_id) return;
        post(`/${rolePrefix}/rombel`, {
            onSuccess: () => {
                setModalOpen(false);
                reset();
            },
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

    const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editTarget) return;
        putEdit(`/${rolePrefix}/rombel/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };

    const handleDelete = (rombel: Rombel) => {
        setConfirmModal({
            show: true,
            title: 'Hapus Kelas',
            message: `Apakah Anda yakin ingin menghapus kelas ${getRombelDisplayName(rombel)}? Tindakan ini tidak dapat dibatalkan.`,
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/rombel/${rombel.id}`, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(prev => ({ ...prev, show: false }))
                });
            }
        });
    };

    const openEditModal = (item: Rombel) => {
        setEditTarget(item);
        setEditData('jurusan_id', item.jurusan_id.toString());
        setEditData('tahun_ajaran', item.tahun_ajaran);
        setEditData('tingkat', item.tingkat.toString());
        setEditData('nama', getRombelDisplayName(item));
        setEditOpen(true);
    };

    const closeEditModal = () => {
        setEditOpen(false);
        resetEdit();
    };

    const isFormValid = data.jurusan_id && data.tahun_ajaran && data.tingkat && data.jumlah_rombel;
    const isEditFormValid = editData.jurusan_id && editData.tahun_ajaran && editData.tingkat && editData.nama;

    const getRombelDisplayName = (rombel: Rombel) => {
        return formatRombelName(rombel);
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Kelola Kelas</h1>
                        <p className="mt-1 text-sm text-slate-500">Manajemen kelas per jurusan</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Kelas
                    </button>
                </div>
            }
        >
            <Head title="Kelola Kelas" />

            <div className="space-y-6">
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Cari Kelas</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    maxLength={255}
                                    placeholder="Cari nama atau tahun ajaran..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Filter Jurusan</label>
                            <select
                                value={jurusanFilter}
                                onChange={(e) => setJurusanFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="">SEMUA JURUSAN</option>
                                {jurusans.map(jurusan => (
                                    <option key={jurusan.id} value={jurusan.id}>
                                        {jurusan.kode}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center bg-emerald-500 text-slate-900 font-black text-xs h-7 min-w-7 px-2 rounded-xl">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                                Kelas Terpilih
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
                                Hapus Kelas
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

                <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-200/70">
                                <tr>
                                    <th className="px-4 py-4 text-center w-12 border-b border-slate-200/70">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                                            title="Pilih Semua Kelas di Halaman Ini"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Nama Kelas</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Jurusan</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Tahun Ajaran</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Tingkat</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Total Siswa</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rombels.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                                            Tidak ada kelas ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    rombels.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}
                                        >
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-200/70 uppercase tracking-[0.2em]">
                                                    {item.id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm font-semibold text-slate-900 tracking-tight">{getRombelDisplayName(item)}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200/70 uppercase tracking-[0.2em]">
                                                    {item.jurusan?.nama || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <p className="text-sm font-semibold text-slate-900">{item.tahun_ajaran}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <p className="text-sm font-semibold text-slate-900">{item.tingkat}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-200/70 uppercase tracking-[0.2em]">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {item.nasabah_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-all"
                                                        title="Edit"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all"
                                                        title="Hapus"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={rombels.current_page}
                        lastPage={rombels.last_page}
                        total={rombels.total}
                        url={`/${rolePrefix}/rombel`}
                        filters={{
                            search,
                            jurusan_id: jurusanFilter,
                        }}
                        itemLabel="Kelas"
                    />
                </div>
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

            {/* Modal Tambah Kelas */}
            <Modal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Tambah Kelas Baru"
                description="Buat kelas baru"
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jurusan</label>
                            <select
                                value={data.jurusan_id}
                                onChange={e => setData('jurusan_id', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                                required
                            >
                                <option value="">Pilih Jurusan</option>
                                {jurusans.map(jurusan => (
                                    <option key={jurusan.id} value={jurusan.id}>
                                        {jurusan.kode}
                                    </option>
                                ))}
                            </select>
                            {errors.jurusan_id && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.jurusan_id}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tahun Ajaran</label>
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
                            <select
                                value={data.tingkat}
                                onChange={e => setData('tingkat', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                            >
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jumlah Kelas</label>
                            <input
                                type="number"
                                value={data.jumlah_rombel}
                                onChange={e => setData('jumlah_rombel', e.target.value)}
                                min="1"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                                required
                            />
                            {errors.jumlah_rombel && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.jumlah_rombel}</p>}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={processing || !isFormValid} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Proses...' : (isFormValid ? 'Tambah Kelas' : 'Lengkapi Data')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Kelas */}
            <Modal
                show={editOpen}
                onClose={closeEditModal}
                title="Edit Kelas"
                description="Perbarui informasi kelas"
                maxWidth="2xl"
            >
                <form onSubmit={handleEditSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jurusan</label>
                            <select
                                value={editData.jurusan_id}
                                onChange={e => setEditData('jurusan_id', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                                required
                            >
                                <option value="">Pilih Jurusan</option>
                                {jurusans.map(jurusan => (
                                    <option key={jurusan.id} value={jurusan.id}>
                                        {jurusan.kode}
                                    </option>
                                ))}
                            </select>
                            {editErrors.jurusan_id && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.jurusan_id}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tahun Ajaran</label>
                            <input
                                type="text"
                                value={editData.tahun_ajaran}
                                onChange={e => handleEditTahunAjaranChange(e.target.value)}
                                placeholder="2025/2026"
                                maxLength={9}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                                required
                            />
                            {editErrors.tahun_ajaran && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.tahun_ajaran}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tingkat</label>
                            <select
                                value={editData.tingkat}
                                onChange={e => setEditData('tingkat', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                            >
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Kelas</label>
                            <input
                                type="text"
                                value={editData.nama}
                                onChange={e => setEditData('nama', e.target.value)}
                                placeholder="Contoh: 11 RPL 1"
                                maxLength={255}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                                required
                            />
                            {editErrors.nama && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.nama}</p>}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={closeEditModal} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={editProcessing || !isEditFormValid} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {editProcessing ? 'Proses...' : (isEditFormValid ? 'Simpan Perubahan' : 'Lengkapi Data')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal
                show={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Hapus Kelas"
                description="Apakah Anda yakin ingin menghapus kelas ini?"
                maxWidth="md"
            >
                <div className="space-y-4">
                    {deleteTarget && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-sm text-red-800">
                                <span className="font-semibold">Kelas:</span> {getRombelDisplayName(deleteTarget)}
                            </p>
                            <p className="text-sm text-red-800 mt-2">
                                <span className="font-semibold">Tahun Ajaran:</span> {deleteTarget.tahun_ajaran}
                            </p>
                        </div>
                    )}
                    <p className="text-sm text-gray-600">
                        Tindakan ini tidak dapat dibatalkan. Semua data terkait kelas ini akan dihapus.
                    </p>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(false)}
                        className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={confirmDelete}
                        className="px-8 py-2.5 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                    >
                        Hapus Kelas
                    </button>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
