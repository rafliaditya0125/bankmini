import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import type { WalletType } from '@/types';
import { formatRupiah, formatNumber, parseNumber } from '@/lib/utils';

interface KantongIndexProps {
    kantongList: {
        data: WalletType[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
    };
    stats: {
        total_kantong: number;
        total_dana: number;
        total_nasabah: number;
    };
    rolePrefix: string;
}

export default function KantongIndex({ kantongList, filters, stats, rolePrefix }: KantongIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const [modalOpen, setModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedKantong, setSelectedKantong] = useState<WalletType | null>(null);

    const [displayTargetAmount, setDisplayTargetAmount] = useState('');
    const [displayEditTargetAmount, setDisplayEditTargetAmount] = useState('');

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
        onConfirm: () => {},
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        target_amount: '',
        target_audience: 'siswa_all',
        description: '',
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
        target_amount: '',
        target_audience: 'siswa_all',
        description: '',
        is_active: true,
    });

    // Realtime search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const queryParams: any = {};
            if (search) queryParams.search = search;
            if (statusFilter !== 'all') queryParams.status = statusFilter;

            if (search !== (filters.search || '') || statusFilter !== (filters.status || 'all')) {
                router.get(`/${rolePrefix}/kantong`, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, statusFilter]);

    const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplayTargetAmount(formatted);
        setData('target_amount', String(parseNumber(formatted)));
    };

    const handleEditTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplayEditTargetAmount(formatted);
        setEditData('target_amount', String(parseNumber(formatted)));
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/${rolePrefix}/kantong`, {
            preserveScroll: true,
            onSuccess: () => {
                setModalOpen(false);
                reset();
                setDisplayTargetAmount('');
            },
        });
    };

    const openEditModal = (kantong: WalletType) => {
        setSelectedKantong(kantong);
        setEditData({
            name: kantong.name,
            target_amount: kantong.target_amount ? String(kantong.target_amount) : '',
            target_audience: kantong.target_audience,
            description: kantong.description || '',
            is_active: Boolean(kantong.is_active),
        });
        setDisplayEditTargetAmount(kantong.target_amount ? formatNumber(String(kantong.target_amount)) : '');
        setEditOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKantong) return;

        putEdit(`/${rolePrefix}/kantong/${selectedKantong.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                resetEdit();
                setSelectedKantong(null);
            },
        });
    };

    const handleDelete = (kantong: WalletType) => {
        setConfirmModal({
            show: true,
            title: 'Hapus / Nonaktifkan Kantong',
            message: `Apakah Anda yakin ingin menghapus kantong "${kantong.name}"? Jika kantong sudah memiliki saldo transaksi nasabah, statusnya akan dinonaktifkan secara aman.`,
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/kantong/${kantong.id}`, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal((prev) => ({ ...prev, show: false })),
                });
            },
        });
    };

    const formatAudience = (audience: string) => {
        switch (audience) {
            case 'all':
                return 'Semua Nasabah';
            case 'siswa_all':
                return 'Semua Siswa';
            case 'siswa_tingkat_10':
                return 'Siswa Tingkat 10';
            case 'siswa_tingkat_11':
                return 'Siswa Tingkat 11';
            case 'siswa_tingkat_12':
                return 'Siswa Tingkat 12';
            default:
                return audience;
        }
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Kelola Kantong</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manajemen pos kantong pembayaran dan alokasi dana nasabah
                        </p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Kantong
                    </button>
                </div>
            }
        >
            <Head title="Kelola Kantong" />

            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Kantong Pembayaran Aktif
                            </span>
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_kantong}</p>
                        <p className="text-xs text-slate-500 mt-1">Pos pembayaran aktif dikelola</p>
                    </div>

                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Total Dana Terkumpul di Kantong
                            </span>
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{formatRupiah(stats.total_dana)}</p>
                        <p className="text-xs text-slate-500 mt-1">Total saldo semua kantong pembayaran</p>
                    </div>

                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Total Nasabah Terdaftar
                            </span>
                            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_nasabah}</p>
                        <p className="text-xs text-slate-500 mt-1">Nasabah aktif berpartisipasi</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama kantong atau deskripsi..."
                                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-full self-start md:self-auto">
                            {[
                                { key: 'all', label: 'SEMUA' },
                                { key: 'aktif', label: 'AKTIF' },
                                { key: 'nonaktif', label: 'NONAKTIF' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key)}
                                    className={`px-4 py-1.5 text-[10px] font-semibold rounded-full transition-all uppercase tracking-[0.2em] ${
                                        statusFilter === tab.key
                                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75">
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Kantong
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Kategori
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Target Audiens
                                    </th>
                                    <th className="px-6 py-4 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Target Tagihan
                                    </th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Nasabah
                                    </th>
                                    <th className="px-6 py-4 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Total Saldo
                                    </th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kantongList.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Belum ada kantong yang ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    kantongList.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-700">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 tracking-tight">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                                            {item.description || 'Tidak ada deskripsi'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-[0.2em] bg-indigo-50 text-indigo-700 border-indigo-200/70">
                                                    Pembayaran
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                                {formatAudience(item.target_audience)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold text-slate-700">
                                                {item.target_amount ? formatRupiah(item.target_amount) : (
                                                    <span className="text-slate-400 font-normal">Fleksibel</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-semibold text-slate-800">
                                                {item.wallets_count || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-bold text-slate-900">
                                                    {formatRupiah(item.total_saldo || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-[0.2em] ${
                                                    item.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200/70'
                                                }`}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center">
                                                    <Dropdown
                                                        trigger={
                                                            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="Opsi">
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                </svg>
                                                            </button>
                                                        }
                                                    >
                                                        <DropdownItem
                                                            href={`/${rolePrefix}/kantong/${item.id}`}
                                                            className="text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                            icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest">Detail Saldo</span>
                                                        </DropdownItem>
                                                        {!item.is_default && (
                                                            <>
                                                                <DropdownItem
                                                                    onClick={() => openEditModal(item)}
                                                                    className="text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                                                                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                                                                >
                                                                    <span className="font-black text-[10px] uppercase tracking-widest">Edit</span>
                                                                </DropdownItem>
                                                                <DropdownItem
                                                                    onClick={() => handleDelete(item)}
                                                                    className="border-t border-gray-100 text-rose-600 hover:bg-rose-50"
                                                                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                                                >
                                                                    <span className="font-black text-[10px] uppercase tracking-widest">Hapus</span>
                                                                </DropdownItem>
                                                            </>
                                                        )}
                                                    </Dropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {kantongList.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100">
                            <Pagination
                                currentPage={kantongList.current_page}
                                lastPage={kantongList.last_page}
                                total={kantongList.total}
                                perPage={kantongList.per_page}
                                onPageChange={(page) => {
                                    router.get(
                                        `/${rolePrefix}/kantong`,
                                        { ...filters, page },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Kantong */}
            <Modal show={modalOpen} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-900">Tambah Kantong Pembayaran</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Buat pos kantong baru untuk menampung pembayaran siswa seperti Kopsis, Seragam, atau Buku.
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Nama Kantong <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Contoh: Bayar Kopsis, Baju Batik, Buku Paket"
                            required
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                        />
                        {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Target Nominal Tagihan (Opsional)
                        </label>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                            <input
                                type="text"
                                value={displayTargetAmount}
                                onChange={handleTargetAmountChange}
                                placeholder="0 (Kosongkan jika nominal bebas)"
                                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Jika diisi, sistem akan menghitung status lunas/belum lunas dan sisa tagihan tiap nasabah.
                        </p>
                        {errors.target_amount && <p className="text-rose-500 text-xs mt-1">{errors.target_amount}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Target Audiens <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={data.target_audience}
                            onChange={(e) => setData('target_audience', e.target.value)}
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                        >
                            <option value="all">SEMUA NASABAH (Siswa, Guru, dll.)</option>
                            <option value="siswa_all">KHUSUS SISWA (Semua Tingkat)</option>
                            <option value="siswa_tingkat_10">SISWA KELAS 10 SAJA</option>
                            <option value="siswa_tingkat_11">SISWA KELAS 11 SAJA</option>
                            <option value="siswa_tingkat_12">SISWA KELAS 12 SAJA</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Kantong ini otomatis dibuatkan untuk nasabah yang memenuhi target audiens.
                        </p>
                        {errors.target_audience && <p className="text-rose-500 text-xs mt-1">{errors.target_audience}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Deskripsi / Keterangan
                        </label>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            placeholder="Penjelasan rincian pos pembayaran ini..."
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all resize-none"
                        />
                        {errors.description && <p className="text-rose-500 text-xs mt-1">{errors.description}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 uppercase tracking-wider transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Kantong'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Kantong */}
            <Modal show={editOpen} onClose={() => setEditOpen(false)}>
                <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-900">Edit Kantong Pembayaran</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Perbarui pengaturan atau target nominal kantong {selectedKantong?.name}.
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Nama Kantong <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData('name', e.target.value)}
                            required
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                        />
                        {editErrors.name && <p className="text-rose-500 text-xs mt-1">{editErrors.name}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Target Nominal Tagihan
                        </label>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                            <input
                                type="text"
                                value={displayEditTargetAmount}
                                onChange={handleEditTargetAmountChange}
                                placeholder="0 (Kosongkan jika nominal bebas)"
                                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                            />
                        </div>
                        {editErrors.target_amount && <p className="text-rose-500 text-xs mt-1">{editErrors.target_amount}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Target Audiens <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={editData.target_audience}
                            onChange={(e) => setEditData('target_audience', e.target.value)}
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                        >
                            <option value="all">SEMUA NASABAH</option>
                            <option value="siswa_all">KHUSUS SISWA (Semua Tingkat)</option>
                            <option value="siswa_tingkat_10">SISWA KELAS 10 SAJA</option>
                            <option value="siswa_tingkat_11">SISWA KELAS 11 SAJA</option>
                            <option value="siswa_tingkat_12">SISWA KELAS 12 SAJA</option>
                        </select>
                        {editErrors.target_audience && <p className="text-rose-500 text-xs mt-1">{editErrors.target_audience}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Deskripsi / Keterangan
                        </label>
                        <textarea
                            value={editData.description}
                            onChange={(e) => setEditData('description', e.target.value)}
                            rows={3}
                            className="w-full mt-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all resize-none"
                        />
                        {editErrors.description && <p className="text-rose-500 text-xs mt-1">{editErrors.description}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active_checkbox"
                            checked={editData.is_active}
                            onChange={(e) => setEditData('is_active', e.target.checked)}
                            className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="is_active_checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                            Kantong Aktif (Menerima Pembayaran)
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setEditOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 uppercase tracking-wider transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={editProcessing}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                        >
                            {editProcessing ? 'Menyimpan...' : 'Perbarui Kantong'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Modal */}
            <ConfirmModal
                show={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
            />
        </DashboardLayout>
    );
}
