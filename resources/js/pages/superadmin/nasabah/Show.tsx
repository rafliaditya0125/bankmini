import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import type { Nasabah, Transaksi, User } from '@/types';
import { formatRupiah, formatRombelName } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Receipt from '@/components/Receipt';

export interface WalletMutationItem {
    id: number;
    kode_transaksi: string;
    tanggal: string;
    tanggal_transaksi: string;
    created_at: string | null;
    jenis_transaksi: string;
    jenis_label: string;
    metode_pembayaran?: string;
    flow: 'in' | 'out';
    jumlah: number;
    saldo_sebelum: number;
    saldo_sesudah: number;
    keterangan: string;
    nama_petugas: string;
    status: string;
    nasabah?: any;
    nasabah_tujuan?: any;
    nasabah_name?: string;
    nasabah_norek?: string;
    penerima_name?: string;
    penerima_norek?: string;
}

interface WalletInfo {
    id: number;
    wallet_number: string;
    balance: string | number;
    status: string;
    wallet_type: {
        id: number;
        name: string;
        is_default: boolean;
        description?: string;
        category?: string;
        target_amount?: number;
    };
    stats?: {
        saldo_bulan_lalu: number;
        setoran_bulan_ini: number;
        penarikan_bulan_ini: number;
        saldo_saat_ini: number;
    };
    mutasi?: WalletMutationItem[];
}

interface ShowNasabahProps {
    nasabah: Nasabah & { user: User };
    transactions: Transaksi[];
    jurusans: { id: number; nama: string; kode: string }[];
    wallets: WalletInfo[];
    total_saldo: number;
}

type NasabahUserType = 'siswa' | 'kelas' | 'organisasi' | 'karyawan' | 'guru';

export default function ShowNasabah({ nasabah, transactions, jurusans, wallets, total_saldo }: ShowNasabahProps) {
    const page = usePage<any>();
    const rolePrefix = page.props.auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [editOpen, setEditOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [mutasiSearch, setMutasiSearch] = useState('');
    const [mutasiFilter, setMutasiFilter] = useState<'all' | 'in' | 'out'>('all');
    const [selectedReceiptTx, setSelectedReceiptTx] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    const currentMonthName = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
        } catch {
            return 'Bulan Ini';
        }
    }, []);

    const filteredMutasi = useMemo(() => {
        if (!selectedWallet?.mutasi) return [];
        return selectedWallet.mutasi.filter((item) => {
            if (mutasiFilter !== 'all' && item.flow !== mutasiFilter) {
                return false;
            }
            if (mutasiSearch.trim()) {
                const query = mutasiSearch.toLowerCase().trim();
                const matchKode = item.kode_transaksi?.toLowerCase().includes(query);
                const matchJenis = item.jenis_label?.toLowerCase().includes(query) || item.jenis_transaksi?.toLowerCase().includes(query);
                const matchKet = item.keterangan?.toLowerCase().includes(query);
                const matchPetugas = item.nama_petugas?.toLowerCase().includes(query);
                const matchTgl = item.tanggal?.toLowerCase().includes(query);
                return matchKode || matchJenis || matchKet || matchPetugas || matchTgl;
            }
            return true;
        });
    }, [selectedWallet, mutasiFilter, mutasiSearch]);

    const mutasiSummary = useMemo(() => {
        if (!selectedWallet?.mutasi) return { total: 0, inCount: 0, outCount: 0 };
        const inCount = selectedWallet.mutasi.filter(m => m.flow === 'in').length;
        const outCount = selectedWallet.mutasi.filter(m => m.flow === 'out').length;
        return {
            total: selectedWallet.mutasi.length,
            inCount,
            outCount,
        };
    }, [selectedWallet]);

    const handleExportMutasi = (formatType: 'excel' | 'pdf') => {
        if (!selectedWallet) return;
        const url = new URL(`/${rolePrefix}/nasabah/${nasabah.id}/mutasi-export`, window.location.origin);
        url.searchParams.set('wallet_id', String(selectedWallet.id));
        url.searchParams.set('format', formatType);

        if (formatType === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url.toString();
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.contentWindow?.print();
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 3000);
            };
        } else {
            window.open(url.toString(), '_blank');
        }
    };

    const isKaryawan = nasabah.user.user_type === 'karyawan' || (nasabah.user.user_type as any) === 'guru';
    const identifierLabel = nasabah.user.user_type === 'siswa' ? 'NIS' : isKaryawan ? 'NIP' : 'No. Rekening';
    const identifierValue = nasabah.user.user_type === 'siswa'
        ? nasabah.user.nis
        : isKaryawan
            ? nasabah.user.nip
            : nasabah.nomor_rekening;

    const getInitial = (value?: string) => (value?.trim().charAt(0).toUpperCase() || '?');

    const { data, setData, put, processing, errors, reset } = useForm({
        name: nasabah.user.name || '',
        nomor_rekening: nasabah.nomor_rekening || '',
        bank_type: (nasabah.bank_type || 'ebank') as 'ebank' | 'bjb',
        phone: nasabah.user.phone || '',
        user_type: (nasabah.user.user_type || 'siswa') as NasabahUserType,
        nis: nasabah.user.nis || '',
        nip: nasabah.user.nip || '',
        password: '',
        password_confirmation: '',
        kelas: nasabah.kelas || '',
        jurusan_id: String((nasabah as any).jurusan_id || ''),
        alamat: nasabah.alamat || '',
        status: nasabah.status as 'aktif' | 'nonaktif',
    });

    const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info' | 'success'; onConfirm: () => void; }>({
        show: false,
        title: '',
        message: '',
        variant: 'info',
        onConfirm: () => { },
    });

    const openEditModal = () => {
        setData({
            name: nasabah.user.name || '',
            nomor_rekening: nasabah.nomor_rekening || '',
            bank_type: (nasabah.bank_type || 'ebank') as 'ebank' | 'bjb',
            phone: nasabah.user.phone || '',
            user_type: (nasabah.user.user_type || 'siswa') as NasabahUserType,
            nis: nasabah.user.nis || '',
            nip: nasabah.user.nip || '',
            password: '',
            password_confirmation: '',
            kelas: nasabah.kelas || '',
            jurusan_id: String((nasabah as any).jurusan_id || ''),
            alamat: nasabah.alamat || '',
            status: nasabah.status as 'aktif' | 'nonaktif',
        });
        setEditOpen(true);
    };

    useEffect(() => {
        const query = page.url.split('?')[1];
        if (query && new URLSearchParams(query).get('edit') === '1') {
            openEditModal();
        }
    }, [page.url]);

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/${rolePrefix}/nasabah/${nasabah.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                reset('password', 'password_confirmation');
            },
        });
    };

    const handleToggleStatus = () => {
        const action = nasabah.status === 'aktif' ? 'menonaktifkan' : 'mengaktifkan';
        setConfirmModal({
            show: true,
            title: action === 'menonaktifkan' ? 'Nonaktifkan Akun' : 'Aktifkan Akun',
            message: `Apakah Anda yakin ingin ${action} nasabah ${nasabah.user.name}?`,
            variant: action === 'menonaktifkan' ? 'warning' : 'success',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/nasabah/${nasabah.id}`);
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    const handleDeleteRekening = () => {
        if (Number(nasabah.saldo) > 0) {
            setConfirmModal({
                show: true,
                title: 'Saldo Masih Tersisa',
                message: `Saldo nasabah ${formatRupiah(nasabah.saldo)}. Tarik seluruh saldo terlebih dahulu.`,
                variant: 'warning',
                onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, show: false }));
                    router.get(`/${rolePrefix}/tarik`, { search: nasabah.user.name });
                },
            });
            return;
        }

        setConfirmModal({
            show: true,
            title: 'Hapus Rekening Permanen',
            message: 'Data rekening akan dihapus permanen dan tidak dapat dikembalikan.',
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/nasabah/${nasabah.id}/delete-rekening`);
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profil Nasabah</h1>
                        <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-widest">Ringkasan data rekening dan histori transaksi.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/${rolePrefix}/nasabah`}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-full hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali
                        </Link>
                        <button
                            onClick={openEditModal}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profil
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Profil - ${nasabah.user.name}`} />

            <div className="space-y-8">
                {/* Hero Section */}
                <div className="rounded-[2.5rem] bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-900 p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-emerald-500/15 transition-all duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

                    <div className="relative flex flex-col md:flex-row gap-8 items-center justify-between">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                            <div className="relative h-28 w-28 shrink-0">
                                <div className="h-28 w-28 rounded-[2rem] bg-white/10 flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm overflow-hidden">
                                    {nasabah.user.profile_photo_url && !nasabah.user.profile_photo_url.includes('ui-avatars') ? (
                                        <img src={nasabah.user.profile_photo_url} alt={nasabah.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-white tracking-tighter">
                                            {getInitial(nasabah.user.name)}
                                        </span>
                                    )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-xl border-4 border-slate-900 flex items-center justify-center ${nasabah.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500 shadow-lg shadow-rose-900/20'}`}>
                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <h2 className="text-4xl font-black text-white tracking-tight">{nasabah.user.name}</h2>
                                    <div className="flex gap-2">
                                        <span className="px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest bg-white/10 text-emerald-200 border-white/10 backdrop-blur-md">
                                            Nasabah
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest backdrop-blur-md ${
                                            nasabah.bank_type === 'bjb'
                                                ? 'bg-blue-400/20 text-blue-200 border-blue-400/30'
                                                : 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                                        }`}>
                                            {nasabah.bank_type === 'bjb' ? 'Bank BJB' : 'eBank'}
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest backdrop-blur-md ${nasabah.status === 'aktif' ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' : 'bg-rose-400/10 text-rose-300 border-rose-400/20'}`}>
                                            {nasabah.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3">
                                    <div className="flex items-center gap-3 text-emerald-100/70">
                                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">No. Rekening</p>
                                            <p className="text-[11px] font-mono font-bold tracking-widest text-emerald-50">{nasabah.nomor_rekening}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-emerald-100/70">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V15" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">Total Saldo</p>
                                            <p className="text-xl font-black tracking-tight text-white">{formatRupiah(total_saldo)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full group relative overflow-hidden px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                                    nasabah.status === 'aktif' 
                                        ? 'bg-white/5 text-emerald-100 border border-white/5 hover:bg-white/10' 
                                        : 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-500'
                                }`}
                            >
                                {nasabah.status === 'aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            </button>
                            <button
                                onClick={handleDeleteRekening}
                                className="w-full px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-300 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all transform active:scale-95"
                            >
                                Hapus Rekening
                            </button>
                        </div>
                    </div>
                </div>

                {/* Wallet Breakdown */}
                {wallets && wallets.length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Rincian Saldo</h3>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                    Tabungan & kantong pembayaran • Klik kantong untuk mutasi & statistik lengkap
                                </p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet.id}
                                    onClick={() => {
                                        setSelectedWallet(wallet);
                                        setMutasiSearch('');
                                        setMutasiFilter('all');
                                        setShowWalletModal(true);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedWallet(wallet);
                                            setMutasiSearch('');
                                            setMutasiFilter('all');
                                            setShowWalletModal(true);
                                        }
                                    }}
                                    className={`group relative rounded-2xl border p-5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.99] select-none text-left ${
                                        wallet.wallet_type.is_default
                                            ? 'bg-emerald-50/60 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/90'
                                            : 'bg-slate-50/60 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                wallet.wallet_type.is_default
                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                    : 'bg-indigo-500/10 text-indigo-600'
                                            }`}>
                                                {wallet.wallet_type.is_default ? (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V15" /></svg>
                                                ) : (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{wallet.wallet_type.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {wallet.wallet_type.is_default && (
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600">Utama</span>
                                            )}
                                            <span className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                            </span>
                                        </div>
                                    </div>
                                    <p className={`text-xl font-black tracking-tight ${
                                        wallet.wallet_type.is_default ? 'text-emerald-700' : 'text-slate-800'
                                    }`}>
                                        {formatRupiah(wallet.balance)}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-400 mt-1">{wallet.wallet_number}</p>
                                    {!wallet.wallet_type.is_default && total_saldo > 0 && (
                                        <div className="mt-3">
                                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-1 bg-indigo-400 rounded-full transition-all"
                                                    style={{ width: `${Math.min(100, (Number(wallet.balance) / total_saldo) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] font-semibold text-slate-400 mt-1">
                                                {((Number(wallet.balance) / total_saldo) * 100).toFixed(1)}% dari total
                                            </p>
                                        </div>
                                    )}
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
                                        <span className="inline-flex items-center gap-1.5">
                                            <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            Statistik & Mutasi
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 group-hover:underline flex items-center gap-0.5">
                                            Buka Mutasi &rarr;
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Detail Card */}
                    <div className="group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex items-start justify-between gap-4 mb-10">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Detail Nasabah</h3>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Identitas dan data akademik.</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{identifierLabel}</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{identifierValue || '-'}</p>
                            </div>
                            <div className="relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">No. Telepon</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{nasabah.user.phone || '-'}</p>
                            </div>
                            <div className="relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Kelas</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight uppercase">
                                    {formatRombelName((nasabah as any).rombel_rel || (nasabah as any).rombelRel || nasabah.kelas)}
                                </p>
                            </div>
                            <div className="relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Jurusan</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight uppercase">{(nasabah as any).jurusan?.nama || '-'}</p>
                            </div>
                            <div className="col-span-2 relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Alamat</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{nasabah.alamat || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex items-start justify-between gap-4 mb-10">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Status Keamanan</h3>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Ringkasan akses dan kontrol akun.</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="group/field relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Akses Login</p>
                                <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${nasabah.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                    {nasabah.status === 'aktif' ? 'Terizinkan' : 'Terblokir'}
                                </span>
                            </div>
                            <div className="group/field relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Tipe Akun</p>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{nasabah.user.user_type}</p>
                            </div>
                            <div className="col-span-2 relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Terakhir Diperbarui</p>
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{new Date(nasabah.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-300 shadow-sm">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Histori Transaksi</h3>
                            <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">10 catatan aktivitas keuangan terakhir.</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Transaksi</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Petugas</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Eksekusi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada catatan aktivitas</td>
                                    </tr>
                                )}
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-4 text-xs font-mono font-black text-slate-700">{tx.kode_transaksi}</td>
                                        <td className="px-8 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                tx.jenis_transaksi === 'setor' ? 'bg-emerald-50 text-emerald-700' :
                                                tx.jenis_transaksi === 'tarik' ? 'bg-amber-50 text-amber-700' :
                                                'bg-indigo-50 text-indigo-700'
                                            }`}>
                                                {tx.jenis_transaksi}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                                            {(tx as any).petugas_nama || tx.petugas?.name || tx.nama_petugas || '-'}
                                        </td>
                                        <td className="px-8 py-4 text-sm text-right font-black text-slate-900 tracking-tight">{formatRupiah(tx.jumlah)}</td>
                                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {(() => {
                                                const txAny = tx as any;
                                                if (txAny.tanggal_transaksi) {
                                                    const parts = txAny.tanggal_transaksi.split('-');
                                                    if (parts.length === 3) {
                                                        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                                        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                                                    }
                                                }
                                                return new Date(tx.created_at).toLocaleString('id-ID');
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal show={editOpen} onClose={() => setEditOpen(false)} title="Edit Data Nasabah" description="Perbarui data identitas dan status rekening" maxWidth="4xl">
                <form onSubmit={handleEditSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama</label>
                            <input value={data.name} onChange={e => setData('name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black" />
                            {errors.name && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe Nasabah</label>
                            <select value={data.user_type} onChange={e => setData('user_type', e.target.value as NasabahUserType)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest">
                                <option value="siswa">Siswa</option>
                                <option value="kelas">Kelas</option>
                                <option value="organisasi">Organisasi</option>
                                <option value="karyawan">Karyawan</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</label>
                            <input value={data.nomor_rekening} onChange={e => setData('nomor_rekening', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-black" />
                            {errors.nomor_rekening && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.nomor_rekening}</p>}
                        </div>
                        {data.user_type === 'siswa' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIS</label>
                                <input value={data.nis} onChange={e => setData('nis', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-black" />
                                {errors.nis && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.nis}</p>}
                            </div>
                        )}
                        {(data.user_type === 'karyawan' || (data.user_type as any) === 'guru') && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIP (Nomor Induk Pegawai / Karyawan)</label>
                                <input value={data.nip} onChange={e => setData('nip', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-black" />
                                {errors.nip && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.nip}</p>}
                            </div>
                        )}
                        {(data.user_type === 'siswa' || data.user_type === 'kelas') && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kelas</label>
                                    <input value={data.kelas} onChange={e => setData('kelas', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black uppercase" />
                                    {errors.kelas && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.kelas}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jurusan</label>
                                    <select value={data.jurusan_id} onChange={e => setData('jurusan_id', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest">
                                        <option value="">Pilih Jurusan</option>
                                        {jurusans.map(j => <option key={j.id} value={j.id}>{j.kode}</option>)}
                                    </select>
                                    {errors.jurusan_id && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.jurusan_id}</p>}
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon (Opsional)</label>
                            <input value={data.phone} onChange={e => setData('phone', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                            <select value={data.status} onChange={e => setData('status', e.target.value as 'aktif' | 'nonaktif')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest">
                                <option value="aktif">Akun Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe Bank</label>
                            <select value={data.bank_type} onChange={e => setData('bank_type', e.target.value as 'ebank' | 'bjb')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black text-xs uppercase tracking-widest">
                                <option value="ebank">eBank (Bank Mini)</option>
                                <option value="bjb">BJB (Bank BJB)</option>
                            </select>
                            {errors.bank_type && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.bank_type}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat</label>
                            <textarea value={data.alamat} onChange={e => setData('alamat', e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-black" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Password Baru (Opsional)</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={data.password} onChange={e => setData('password', e.target.value)} className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl font-black" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-600 transition-colors">
                                    {showPassword ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl font-black" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-600 transition-colors">
                                    {showPassword ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setEditOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest">Batal</button>
                        <button type="submit" disabled={processing} className="px-8 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={confirmModal.show}
                onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />

            {/* Modal Detail Mutasi & Statistik Kantong */}
            <Modal
                show={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                title={`MUTASI & STATISTIK • ${selectedWallet?.wallet_type?.name || 'KANTONG'}`}
                description={`No. Rekening: ${selectedWallet?.wallet_number || '-'} • Nasabah: ${nasabah.user.name}`}
                maxWidth="5xl"
            >
                <div className="p-6 md:p-8 space-y-6">
                    {/* 4 Container Cards (Dashboard style) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ringkasan Statistik Keuangan Kantong</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Periode: {currentMonthName}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Saldo Bulan Lalu */}
                            <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shadow-inner shrink-0">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">Saldo Bulan Lalu</p>
                                        <p className="mt-1 text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
                                            {formatRupiah(selectedWallet?.stats?.saldo_bulan_lalu || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Saldo awal per 1 {currentMonthName}</p>
                                </div>
                            </div>

                            {/* Card 2: Setoran Bulan Ini */}
                            <div className="rounded-2xl bg-linear-to-br from-emerald-50/70 to-white p-5 border border-emerald-100 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider truncate">Setoran Bulan Ini</p>
                                        <p className="mt-1 text-lg md:text-xl font-black text-emerald-900 tracking-tight truncate">
                                            {formatRupiah(selectedWallet?.stats?.setoran_bulan_ini || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-emerald-50">
                                    <p className="text-[10px] text-emerald-600/70 font-semibold uppercase tracking-wider">Total dana masuk bulan ini</p>
                                </div>
                            </div>

                            {/* Card 3: Penarikan Bulan Ini */}
                            <div className="rounded-2xl bg-linear-to-br from-rose-50/70 to-white p-5 border border-rose-100 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shadow-inner shrink-0">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider truncate">Penarikan Bulan Ini</p>
                                        <p className="mt-1 text-lg md:text-xl font-black text-rose-900 tracking-tight truncate">
                                            {formatRupiah(selectedWallet?.stats?.penarikan_bulan_ini || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-rose-50">
                                    <p className="text-[10px] text-rose-600/70 font-semibold uppercase tracking-wider">Total dana keluar bulan ini</p>
                                </div>
                            </div>

                            {/* Card 4: Saldo Saat Ini */}
                            <div className="rounded-2xl bg-linear-to-br from-indigo-50/70 to-white p-5 border border-indigo-100 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider truncate">Saldo Saat Ini</p>
                                        <p className="mt-1 text-lg md:text-xl font-black text-indigo-950 tracking-tight truncate">
                                            {formatRupiah(selectedWallet?.stats?.saldo_saat_ini ?? (selectedWallet?.balance || 0))}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-indigo-50">
                                    <p className="text-[10px] text-indigo-600/70 font-semibold uppercase tracking-wider">Saldo efektif kantong</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Mutasi */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                        {/* Toolbar */}
                        <div className="p-4 md:p-5 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Daftar Mutasi Transaksi</h4>
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">
                                    Riwayat aktivitas mutasi saldo pada kantong ini
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Search */}
                                <div className="relative min-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Cari transaksi..."
                                        value={mutasiSearch}
                                        onChange={(e) => setMutasiSearch(e.target.value)}
                                        className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    />
                                    <svg className="h-4 w-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    {mutasiSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setMutasiSearch('')}
                                            className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>

                                {/* Filter buttons */}
                                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                    <button
                                        type="button"
                                        onClick={() => setMutasiFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            mutasiFilter === 'all'
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        Semua ({mutasiSummary.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMutasiFilter('in')}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            mutasiFilter === 'in'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-emerald-700 hover:text-emerald-900'
                                        }`}
                                    >
                                        Masuk ({mutasiSummary.inCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMutasiFilter('out')}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            mutasiFilter === 'out'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'text-rose-700 hover:text-rose-900'
                                        }`}
                                    >
                                        Keluar ({mutasiSummary.outCount})
                                    </button>
                                </div>

                                {/* Export buttons */}
                                <div className="flex items-center gap-1.5 sm:pl-1 sm:border-l sm:border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => handleExportMutasi('excel')}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                                        title="Download mutasi ke format Excel (.xlsx)"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExportMutasi('pdf')}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                                        title="Cetak Rekening Koran atau Simpan PDF"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Cetak / PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-3.5">Waktu</th>
                                        <th className="px-5 py-3.5">Kode Transaksi</th>
                                        <th className="px-5 py-3.5">Jenis</th>
                                        <th className="px-5 py-3.5">Keterangan / Petugas</th>
                                        <th className="px-5 py-3.5 text-right">Mutasi</th>
                                        <th className="px-5 py-3.5 text-right">Saldo Akhir</th>
                                        <th className="px-5 py-3.5 text-center">Status</th>
                                        <th className="px-5 py-3.5 text-center">Struk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMutasi.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        {mutasiSearch || mutasiFilter !== 'all' ? 'Tidak ada mutasi yang sesuai filter' : 'Belum ada mutasi transaksi pada kantong ini'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMutasi.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-5 py-3.5 whitespace-nowrap text-[11px] font-semibold text-slate-600">
                                                    {item.tanggal}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                        {item.kode_transaksi}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        item.flow === 'in'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                    }`}>
                                                        {item.jenis_label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="text-xs font-bold text-slate-800 max-w-xs truncate">{item.keterangan || '-'}</p>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Petugas: {item.nama_petugas || '-'}</p>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                    <span className={`text-xs font-black tracking-tight ${
                                                        item.flow === 'in' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {item.flow === 'in' ? '+' : '-'} {formatRupiah(item.jumlah)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-black text-slate-900 tracking-tight">
                                                    {formatRupiah(item.saldo_sesudah)}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                                        item.status === 'valid'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedReceiptTx({
                                                                ...item,
                                                                nasabah_name: nasabah.user.name,
                                                                nasabah_norek: selectedWallet?.wallet_number || nasabah.nomor_rekening,
                                                                petugas: item.nama_petugas,
                                                            });
                                                            setShowReceiptModal(true);
                                                        }}
                                                        title="Lihat Struk"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-all"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Struk
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-500">
                                Menampilkan {filteredMutasi.length} dari {selectedWallet?.mutasi?.length || 0} mutasi
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleExportMutasi('excel')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-xs active:scale-95"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExportMutasi('pdf')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs active:scale-95"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Cetak / PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowWalletModal(false)}
                                    className="px-5 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all shadow-xs"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Bukti Transaksi / Struk */}
            <Modal
                show={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                maxWidth="md"
                title="DETAIL STRUK TRANSAKSI"
                variant="dark"
            >
                <Receipt
                    name={nasabah.user.name}
                    transaction={selectedReceiptTx}
                    onClose={() => setShowReceiptModal(false)}
                    showPrint={true}
                    showPassbookPrint={true}
                />
            </Modal>
        </DashboardLayout>
    );
}
