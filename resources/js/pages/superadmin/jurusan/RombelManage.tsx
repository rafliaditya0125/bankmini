import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import type { Jurusan } from '@/types';

interface Rombel {
    id: number;
    jurusan_id: number;
    tahun_ajaran: string;
    tingkat: number;
    nomor_rombel: number;
    nama?: string;
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
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Rombel | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

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
        nomor_rombel: '1',
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
        nomor_rombel: '1',
        nama: '',
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

    const openEditModal = (rombel: Rombel) => {
        setEditTarget(rombel);
        setEditData('tahun_ajaran', rombel.tahun_ajaran);
        setEditData('tingkat', rombel.tingkat.toString());
        setEditData('nomor_rombel', rombel.nomor_rombel.toString());
        setEditData('nama', rombel.nama || '');
        setEditOpen(true);
        setOpenDropdownId(null);
    };

    const handleDelete = (rombel: Rombel) => {
        if (confirm(`Hapus rombel ${rombel.nama || `${rombel.tingkat} ${jurusan.kode} ${rombel.nomor_rombel}`}?`)) {
            router.delete(`/${rolePrefix}/jurusan/${jurusan.id}/rombel/${rombel.id}`, {
                preserveScroll: true,
            });
        }
    };

    const getRombelName = (rombel: Rombel) => {
        return rombel.nama || `${rombel.tingkat} ${jurusan.kode} ${rombel.nomor_rombel}`;
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
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Rombel
                    </button>
                </div>
            }
        >
            <Head title={`Kelola Rombel - ${jurusan.nama}`} />

            <div className="space-y-6">
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
                                    <div key={rombel.id} className="rounded-2xl bg-white border border-slate-200/70 p-4 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{getRombelName(rombel)}</h3>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
                                                    Tingkat {rombel.tingkat} • Rombel {rombel.nomor_rombel}
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenDropdownId(openDropdownId === rombel.id ? null : rombel.id)}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                                {openDropdownId === rombel.id && (
                                                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-sm z-50 overflow-hidden border border-slate-200" onMouseLeave={() => setOpenDropdownId(null)}>
                                                        <button
                                                            onClick={() => openEditModal(rombel)}
                                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 hover:text-amber-600 transition-colors"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(rombel)}
                                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-[10px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 transition-colors border-t border-gray-100"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Hapus
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

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
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rombel</label>
                            <input type="number" value={data.nomor_rombel} onChange={e => setData('nomor_rombel', e.target.value)} min="1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.nomor_rombel && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.nomor_rombel}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Rombel (Opsional)</label>
                            <input type="text" value={data.nama} onChange={e => setData('nama', e.target.value)} maxLength={255} placeholder="Misal: 11 RPL 1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" />
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
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rombel</label>
                            <input type="number" value={editData.nomor_rombel} onChange={e => setEditData('nomor_rombel', e.target.value)} min="1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm" />
                            {editErrors.nomor_rombel && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{editErrors.nomor_rombel}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Rombel (Opsional)</label>
                            <input type="text" value={editData.nama} onChange={e => setEditData('nama', e.target.value)} maxLength={255} placeholder="Misal: 11 RPL 1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm" />
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
        </DashboardLayout>
    );
}
