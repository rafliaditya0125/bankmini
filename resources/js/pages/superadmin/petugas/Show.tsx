import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import type { User } from '@/types';

interface ShowPetugasProps {
    petugas: User;
}

export default function ShowPetugas({ petugas }: ShowPetugasProps) {
    const page = usePage<any>();
    const { auth } = page.props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [editOpen, setEditOpen] = useState(false);
    const canEdit = (auth.user.role === 'superadmin' && petugas.role !== 'superadmin')
        || (auth.user.role === 'admin' && petugas.role === 'teller')
        || (petugas.id === auth.user.id);

    const getInitial = (value?: string) => (value?.trim().charAt(0).toUpperCase() || '?');

    const { data, setData, put, processing, errors, reset } = useForm({
        name: petugas.name,
        email: petugas.email,
        role: petugas.role as 'superadmin' | 'teller' | 'admin',
        password: '',
        password_confirmation: '',
        phone: petugas.phone || '',
        status: petugas.status || 'active',
    });

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    const handleToggleStatus = () => {
        const action = petugas.is_active ? 'menonaktifkan' : 'mengaktifkan';
        if (confirm(`Apakah Anda yakin ingin ${action} petugas ${petugas.name}?`)) {
            router.delete(`/${rolePrefix}/petugas/${petugas.id}`);
        }
    };

    const openEditModal = () => {
        setData({
            name: petugas.name || '',
            email: petugas.email || '',
            role: petugas.role as 'superadmin' | 'teller' | 'admin',
            phone: petugas.phone || '',
            status: petugas.status || 'active',
            password: '',
            password_confirmation: '',
        });
        setEditOpen(true);
    };

    const closeEditModal = () => {
        setEditOpen(false);
        reset('password', 'password_confirmation');
    };

    useEffect(() => {
        const query = page.url.split('?')[1];
        if (!query) return;
        const params = new URLSearchParams(query);
        if (params.get('edit') === '1' && canEdit) {
            openEditModal();
        }
    }, [page.url, canEdit]);

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/${rolePrefix}/petugas/${petugas.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profil Akun Petugas</h1>
                        <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-widest">Informasi personil dan akses sistem</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.visit(`/${rolePrefix}/petugas`)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-full hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali
                        </button>

                        {canEdit && (
                            <button
                                type="button"
                                onClick={openEditModal}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Profil
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Profil Petugas - ${petugas.name || 'Petugas'}`} />

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
                                        {getInitial(petugas.name)}
                                    </span>
                                </div>
                                <div className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-xl border-4 border-slate-900 flex items-center justify-center ${petugas.is_active ? 'bg-emerald-500' : 'bg-rose-500 shadow-lg shadow-rose-900/20'}`}>
                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <h2 className="text-4xl font-black text-white tracking-tight">{petugas.name || 'Petugas'}</h2>
                                    <div className="flex gap-2">
                                        <span className="px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest bg-white/10 text-emerald-200 border-white/10 backdrop-blur-md">
                                            {petugas.role}
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest backdrop-blur-md ${petugas.is_active ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' : 'bg-rose-400/10 text-rose-300 border-rose-400/20'}`}>
                                            {petugas.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3">
                                    <div className="flex items-center gap-3 text-emerald-100/70">
                                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest">{petugas.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-emerald-100/70">
                                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">No. Telepon</p>
                                            <p className="text-[11px] font-bold tracking-widest text-emerald-50">{petugas.phone || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-emerald-100/70">
                                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">Terakhir Diperbarui</p>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-50">{formatDate(petugas.updated_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            {petugas.id !== auth.user.id && ((auth.user.role === 'superadmin' && petugas.role !== 'superadmin') || (auth.user.role === 'admin' && petugas.role === 'teller')) && (
                                <button
                                    onClick={handleToggleStatus}
                                    className={`w-full group relative overflow-hidden px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                                        petugas.is_active 
                                            ? 'bg-white/5 text-emerald-100 border border-white/5 hover:bg-white/10' 
                                            : 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-500'
                                    }`}
                                >
                                    <div className="relative flex items-center justify-center gap-2">
                                        {petugas.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Detail Card */}
                    <div className="group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex items-start justify-between gap-4 mb-10">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Detail Personil</h3>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Data identitas utama petugas.</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="group/field relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Email</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{petugas.email || '-'}</p>
                            </div>
                            <div className="relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">No. Telepon</p>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{petugas.phone || '-'}</p>
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
                                <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${petugas.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                    {petugas.is_active ? 'Terizinkan' : 'Terblokir'}
                                </span>
                            </div>
                            <div className="group/field relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Role Sistem</p>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{petugas.role}</p>
                            </div>
                            <div className="col-span-2 relative rounded-2xl border border-slate-50 bg-slate-50/50 p-6 transition-all hover:bg-white hover:border-emerald-100 hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Terakhir Diperbarui</p>
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{formatDate(petugas.updated_at)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-300 shadow-sm">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm uppercase tracking-tight" />
                            {errors.name && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm lowercase" />
                            {errors.email && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</label>
                            <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</label>
                            <select value={data.role} onChange={e => setData('role', e.target.value as any)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white">
                                <option value="teller">Teller</option>
                                {auth.user.role === 'superadmin' && <option value="admin">Admin</option>}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ganti Password (Opsional)</label>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" placeholder="Kosongkan jika tidak diubah" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password Baru</label>
                            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => setData('status', data.status === 'active' ? 'inactive' : 'active')}
                                disabled={petugas.id === auth.user.id}
                                className={`flex items-center group cursor-pointer ${petugas.id === auth.user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-4 ${data.status === 'active' ? 'bg-emerald-600 ring-emerald-500/10' : 'bg-gray-200 ring-transparent'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`}></span>
                                </div>
                                <span className="ms-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Petugas Berstatus Aktif</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={closeEditModal} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={processing} className="px-8 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
