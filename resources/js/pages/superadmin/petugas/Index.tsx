import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import type { User } from '@/types';

interface PetugasIndexProps {
    petugas: {
        data: User[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        role?: string;
        status?: string;
    };
}

export default function PetugasIndex({ petugas, filters }: PetugasIndexProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<User | null>(null);
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

    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Realtime search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const queryParams: any = {};
            if (search) queryParams.search = search;
            if (roleFilter !== 'all') queryParams.role = roleFilter;
            if (statusFilter !== 'all') queryParams.status = statusFilter;

            // Only navigate if filters changed from prop values
            if (
                search !== (filters.search || '') ||
                roleFilter !== (filters.role || 'all') ||
                statusFilter !== (filters.status || 'all')
            ) {
                setSelectedIds([]);
                router.get(`/${rolePrefix}/petugas`, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, roleFilter, statusFilter, rolePrefix]);

    // Sync state if props change externally (like Browser Back button or Reset)
    useEffect(() => {
        setSearch(filters.search || '');
        setRoleFilter(filters.role || 'all');
        setStatusFilter(filters.status || 'all');
        setSelectedIds([]);
    }, [filters]);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        role: 'teller',
        password: '',
        password_confirmation: '',
        phone: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        name: '',
        email: '',
        role: 'teller' as 'superadmin' | 'teller' | 'admin',
        password: '',
        password_confirmation: '',
        phone: '',
        status: 'active' as 'active' | 'inactive' | 'suspended',
    });

    const { data: importData, setData: setImportData, post: postImport, processing: importProcessing } = useForm({
        files: [] as File[],
    });

    const canSelectPetugas = (item: User) => (
        item.id !== auth.user.id && (auth.user.role === 'superadmin' ? true : item.role === 'teller')
    );

    const selectablePetugas = petugas.data.filter(canSelectPetugas);
    const isAllSelected = selectablePetugas.length > 0 && selectablePetugas.every(item => selectedIds.includes(item.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected && selectablePetugas.some(item => selectedIds.includes(item.id));

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectablePetugas.map(item => item.id));
        }
    };

    const handleBulkStatus = (targetStatus: 'active' | 'inactive') => {
        if (selectedIds.length === 0) return;
        const action = targetStatus === 'active' ? 'mengaktifkan' : 'menonaktifkan';
        setConfirmModal({
            show: true,
            title: targetStatus === 'active' ? 'Aktifkan Petugas Massal' : 'Nonaktifkan Petugas Massal',
            message: `Apakah Anda yakin ingin ${action} ${selectedIds.length} petugas yang dipilih?`,
            variant: targetStatus === 'inactive' ? 'warning' : 'success',
            onConfirm: () => {
                router.post(`/${rolePrefix}/petugas/bulk-status`, { ids: selectedIds, status: targetStatus }, {
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
            title: 'Hapus Petugas Massal',
            message: `Apakah Anda yakin ingin MENGHAPUS ${selectedIds.length} akun petugas yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
            variant: 'danger',
            onConfirm: () => {
                router.post(`/${rolePrefix}/petugas/bulk-delete`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const handleToggleStatus = (id: number, email: string, status: string) => {
        const action = status === 'active' ? 'menonaktifkan' : 'mengaktifkan';
        setConfirmModal({
            show: true,
            title: status === 'active' ? 'Nonaktifkan Petugas' : 'Aktifkan Petugas',
            message: `Apakah Anda yakin ingin ${action} petugas ${email}?`,
            variant: status === 'active' ? 'warning' : 'success',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/petugas/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(prev => ({ ...prev, show: false }))
                });
            }
        });
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postImport(`/${rolePrefix}/petugas/import`, {
            preserveScroll: true,
            onSuccess: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onFinish: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        post(`/${rolePrefix}/petugas`, {
            onSuccess: () => {
                setModalOpen(false);
                reset();
            },
        });
    };

    const isFormValid = data.name && data.email && data.password && data.password_confirmation && data.role;
    const isEditFormValid = editData.name && editData.email && editData.role && editData.status;

    const canEditPetugas = (item: User) => (
        item.id === auth.user.id
        || (auth.user.role === 'superadmin' && item.role !== 'superadmin')
        || (auth.user.role === 'admin' && item.role === 'teller')
    );

    const openEditModal = (item: User) => {
        if (!canEditPetugas(item)) return;
        setEditTarget(item);
        setEditData('name', item.name || '');
        setEditData('email', item.email || '');
        setEditData('role', item.role as 'superadmin' | 'teller' | 'admin');
        setEditData('phone', item.phone || '');
        setEditData('status', item.status as 'active' | 'inactive' | 'suspended');
        setEditData('password', '');
        setEditData('password_confirmation', '');
        setEditOpen(true);

    };

    const closeEditModal = () => {
        setEditOpen(false);
        resetEdit('password', 'password_confirmation');
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        putEdit(`/${rolePrefix}/petugas/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                resetEdit();
            },
        });
    };

    const getInitial = (name?: string, email?: string) => {
        const source = name && name.trim().length > 0 ? name : (email ?? '');
        return source.trim().charAt(0).toUpperCase() || '?';
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Kelola Petugas</h1>
                        <p className="mt-1 text-sm text-slate-500">Manajemen data petugas sistem</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-50/70 text-emerald-700 border border-emerald-200/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] hover:bg-emerald-100/80 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import Excel
                        </button>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Petugas
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Kelola Petugas" />

            <div className="space-y-6">
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Cari Petugas</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    maxLength={255}
                                    placeholder="Cari nama atau email..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Filter Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA ROLE</option>
                                {auth.user.role === 'superadmin' && <option value="superadmin">SUPERADMIN</option>}
                                <option value="admin">ADMIN</option>
                                <option value="teller">TELLER</option>
                            </select>
                        </div>
                        <div className="w-full">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Filter Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA STATUS</option>
                                <option value="active">AKTIF</option>
                                <option value="inactive">NONAKTIF</option>
                                <option value="suspended">DIBLOKIR</option>
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
                                Petugas Terpilih
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => handleBulkStatus('active')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aktifkan
                            </button>
                            <button
                                onClick={() => handleBulkStatus('inactive')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Nonaktifkan
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Petugas
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
                                            disabled={selectablePetugas.length === 0}
                                            className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Pilih Semua Petugas di Halaman Ini"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Nama & Email</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Role</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {petugas.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Tidak ada data petugas ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    petugas.data.map((item) => {
                                        const selectable = canSelectPetugas(item);
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}
                                            >
                                                <td className="px-4 py-4 text-center whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleToggleSelect(item.id)}
                                                        disabled={!selectable}
                                                        className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={!selectable ? 'Akun sendiri / tidak dapat dikelola' : undefined}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-semibold text-white">
                                                                {getInitial(item.name, item.email)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold text-slate-900 tracking-tight">{item.name || item.email || '-'}</p>
                                                                {item.is_email_verified ? (
                                                                    <div className="flex items-center justify-center p-0.5 rounded-full bg-emerald-100 text-emerald-600 shadow-sm" title="Email Terverifikasi">
                                                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center p-0.5 rounded-full bg-slate-100 text-slate-400" title="Email Belum Terverifikasi">
                                                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">{item.email || '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-[0.2em] ${
                                                        item.role === 'superadmin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' :
                                                        item.role === 'admin' ? 'bg-emerald-100 text-emerald-800 border-emerald-300/70' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-200/70'
                                                    }`}>
                                                        {item.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-[0.2em] ${
                                                        item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' :
                                                        item.status === 'inactive' ? 'bg-rose-50 text-rose-700 border-rose-200/70' :
                                                        'bg-amber-50 text-amber-700 border-amber-200/70'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center justify-center">
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
                                                                href={`/${rolePrefix}/petugas/${item.id}`}
                                                                className="text-gray-500 hover:text-emerald-600"
                                                                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                            >
                                                                <span className="font-black text-[10px] uppercase tracking-widest">Profil Akun</span>
                                                            </DropdownItem>

                                                            {canEditPetugas(item) && (
                                                                <>
                                                                    <DropdownItem
                                                                        onClick={() => openEditModal(item)}
                                                                        className="text-gray-500 hover:text-amber-600"
                                                                        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                                                                    >
                                                                        <span className="font-black text-[10px] uppercase tracking-widest">Edit Data</span>
                                                                    </DropdownItem>

                                                                    {item.id !== auth.user.id && (
                                                                        <DropdownItem
                                                                            onClick={() => handleToggleStatus(item.id, item.email, item.status)}
                                                                            className={`border-t border-gray-50 ${item.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                                            icon={item.status === 'active' 
                                                                                ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                                : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                            }
                                                                        >
                                                                            <span className="font-black text-[10px] uppercase tracking-widest">{item.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                                                        </DropdownItem>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Dropdown>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <Pagination
                        currentPage={petugas.current_page}
                        lastPage={petugas.last_page}
                        total={petugas.total}
                        url={`/${rolePrefix}/petugas`}
                        filters={{
                            search,
                            role: roleFilter,
                            status: statusFilter,
                        }}
                        itemLabel="Petugas"
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

            {/* Modal Tambah Petugas */}
            <Modal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Registrasi Petugas Baru"
                description="Tambah personil admin atau teller baru"
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.name && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} maxLength={254} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.email && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role Akses</label>
                            <select value={data.role} onChange={e => setData('role', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                <option value="teller">Teller</option>
                                {auth.user.role === 'superadmin' && <option value="admin">Admin</option>}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value.replace(/\D/g, ''))}
                                maxLength={20}
                                placeholder="08xxxxxxxxxx"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                            />
                            {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Password</label>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" required />
                            {errors.password && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password</label>
                            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" required />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={processing || !isFormValid} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Proses...' : (isFormValid ? 'Daftarkan Petugas' : 'lengkapi semua data')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={editOpen}
                onClose={closeEditModal}
                title="Edit Data Petugas"
                description="Perbarui informasi personil dan otoritas akses"
                maxWidth="4xl"
            >
                <form onSubmit={handleEditSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                            <input type="text" value={editData.name} onChange={e => setEditData('name', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm uppercase tracking-tight" />
                            {editErrors.name && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={editData.email} onChange={e => setEditData('email', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm lowercase" />
                            {editErrors.email && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</label>
                            <input type="text" value={editData.phone} onChange={e => setEditData('phone', e.target.value.replace(/\D/g, ''))} maxLength={20} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</label>
                             <select value={editData.role} onChange={e => setEditData('role', e.target.value as any)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white">
                                <option value="teller">Teller</option>
                                {auth.user.role === 'superadmin' && (
                                    <>
                                        <option value="admin">Admin</option>
                                        {editData.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                                    </>
                                )}
                            </select>
                            {editErrors.role && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.role}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ganti Password (Opsional)</label>
                            <input type="password" value={editData.password} onChange={e => setEditData('password', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" placeholder="Kosongkan jika tidak diubah" />
                            {editErrors.password && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password Baru</label>
                            <input type="password" value={editData.password_confirmation} onChange={e => setEditData('password_confirmation', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" />
                            {editErrors.password_confirmation && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.password_confirmation}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Akun</label>
                            <select
                                value={editData.status}
                                onChange={e => setEditData('status', e.target.value as any)}
                                disabled={editTarget?.id === auth.user.id}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                            >
                                 <option value="active">AKTIF</option>
                                <option value="inactive">NONAKTIF / SUSPEND</option>
                                <option value="suspended">DIBLOKIR</option>
                            </select>
                            {editErrors.status && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.status}</p>}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={closeEditModal} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={editProcessing || !isEditFormValid} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {editProcessing ? 'Menyimpan...' : (isEditFormValid ? 'Simpan Perubahan' : 'lengkapi semua data')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Import Excel */}
            <Modal
                show={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Petugas via Excel"
                description="Tambah petugas massal melalui berkas Excel"
                maxWidth="2xl"
            >
                <form onSubmit={handleImportSubmit} className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Template & Format</p>
                            <p className="text-sm font-semibold text-slate-900">Gunakan format Excel yang disediakan.</p>
                        </div>
                        <a
                            href={`/${rolePrefix}/petugas/template`}
                            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Template Excel
                        </a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                            <input
                                type="file"
                                className="hidden"
                                accept=".xlsx,.xls"
                                multiple
                                ref={fileInputRef}
                                onChange={(e) => setImportData('files', e.target.files ? Array.from(e.target.files) : [])}
                            />
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm shadow-emerald-100">
                                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-widest">
                                    {importData.files.length > 0
                                        ? `${importData.files.length} berkas dipilih (${importData.files.map(f => f.name).join(', ')})`
                                        : 'Klik untuk pilih berkas Excel (.xlsx)'}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Dapat memilih lebih dari 1 file Excel (Maks 2MB per file)</p>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kolom Wajib</p>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-[9px] font-mono text-slate-600">
                                    name,email,role,password,phone
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contoh Baris</p>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-[9px] font-mono text-slate-600">
                                    "Admin 1","admin1@bankmini.smk",admin,"password123",08123
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Catatan</p>
                        <p className="mt-1 text-xs text-slate-600">
                            Pastikan email unik dan role sesuai template (admin atau teller).
                        </p>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setImportModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button
                            type="submit"
                            disabled={importProcessing || importData.files.length === 0}
                            className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400"
                        >
                            {importProcessing ? 'Mengimport...' : 'Mulai Import'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
