import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import type { Nasabah, Transaksi, User } from '@/types';
import { formatRupiah } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';

interface ShowNasabahProps {
    nasabah: Nasabah & { user: User };
    transactions: Transaksi[];
    jurusans: { id: number; nama: string; kode: string }[];
}

type NasabahUserType = 'siswa' | 'kelas' | 'organisasi' | 'guru';

export default function ShowNasabah({ nasabah, transactions, jurusans }: ShowNasabahProps) {
    const page = usePage<any>();
    const rolePrefix = page.props.auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [editOpen, setEditOpen] = useState(false);

    const identifierLabel = nasabah.user.user_type === 'siswa' ? 'NIS' : nasabah.user.user_type === 'guru' ? 'NIP' : 'No. Rekening';
    const identifierValue = nasabah.user.user_type === 'siswa'
        ? nasabah.user.nis
        : nasabah.user.user_type === 'guru'
            ? nasabah.user.nip
            : nasabah.nomor_rekening;

    const getInitial = (value?: string) => (value?.trim().charAt(0).toUpperCase() || '?');

    const { data, setData, put, processing, errors, reset } = useForm({
        name: nasabah.user.name || '',
        nomor_rekening: nasabah.nomor_rekening || '',
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
                                <div className="h-28 w-28 rounded-[2rem] bg-white/10 flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm">
                                    <span className="text-4xl font-black text-white tracking-tighter">
                                        {getInitial(nasabah.user.name)}
                                    </span>
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
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">Saldo Saat Ini</p>
                                            <p className="text-xl font-black tracking-tight text-white">{formatRupiah(nasabah.saldo)}</p>
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
                                <p className="text-sm font-black text-slate-800 tracking-tight uppercase">{nasabah.kelas || '-'}</p>
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
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Eksekusi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada catatan aktivitas</td>
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
                                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(tx.created_at).toLocaleString('id-ID')}</td>
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
                                <option value="guru">Guru</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</label>
                            <input value={data.nomor_rekening} onChange={e => setData('nomor_rekening', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-black" />
                            {errors.nomor_rekening && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.nomor_rekening}</p>}
                        </div>
                        {data.user_type === 'siswa' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIS</label>
                                <input value={data.nis} onChange={e => setData('nis', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-black" />
                                {errors.nis && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.nis}</p>}
                            </div>
                        )}
                        {data.user_type === 'guru' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIP</label>
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
                                        {jurusans.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
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
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat</label>
                            <textarea value={data.alamat} onChange={e => setData('alamat', e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-black" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Password Baru (Opsional)</label>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password</label>
                            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-black" />
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
        </DashboardLayout>
    );
}
