import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { useState } from 'react';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { useRef } from 'react';

interface Jurusan {
    id: number;
    nama: string;
    kode: string;
    jumlah_kelas_10?: number;
    jumlah_kelas_11?: number;
    jumlah_kelas_12?: number;
}

interface Props {
    jurusans: Jurusan[];
}

export default function Index({ jurusans }: Props) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedJurusan, setSelectedJurusan] = useState<Jurusan | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [jurusanToDelete, setJurusanToDelete] = useState<Jurusan | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        nama: '',
        kode: '',
    });

    const { data: importData, setData: setImportData, post: postImport, processing: importProcessing } = useForm({
        files: [] as File[],
    });

    const filteredJurusans = jurusans.filter(j =>
        j.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenAddModal = () => {
        setIsEdit(false);
        setSelectedJurusan(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (jurusan: Jurusan) => {
        setIsEdit(true);
        setSelectedJurusan(jurusan);
        setData({
            nama: jurusan.nama,
            kode: jurusan.kode,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        if (isEdit && selectedJurusan) {
            put(`/${rolePrefix}/jurusan/${selectedJurusan.id}`, {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post(`/${rolePrefix}/jurusan`, {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    };

    const isFormValid = data.nama && data.kode;

    const handleDelete = () => {
        if (jurusanToDelete) {
            destroy(`/${rolePrefix}/jurusan/${jurusanToDelete.id}`, {
                onSuccess: () => setShowDeleteConfirm(false),
            });
        }
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postImport(`/${rolePrefix}/jurusan/import`, {
            onSuccess: () => {
                setImportModalOpen(false);
                setImportData('files', []);
            },
        });
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Kelola Jurusan</h2>
                        <p className="mt-1 text-sm text-slate-500">Manajemen data jurusan sekolah</p>
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
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Jurusan
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Kelola Jurusan" />

            <div className="space-y-6">
                {/* Search Bar */}
                <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="CARI JURUSAN (NAMA ATAU KODE)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            maxLength={255}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 rounded-2xl outline-none transition-all text-[10px] font-semibold uppercase tracking-[0.2em]"
                        />
                    </div>
                </div>

                {/* Jurusan Table */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80">
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70">Kode</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70">Nama Jurusan</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70">Kelas 10</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70">Kelas 11</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70">Kelas 12</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200/70 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredJurusans.length > 0 ? (
                                    filteredJurusans.map((jurusan) => (
                                        <tr key={jurusan.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                    {jurusan.kode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] font-semibold text-slate-900 uppercase tracking-[0.2em]">{jurusan.nama}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-blue-50 text-blue-700 border border-blue-200/70">
                                                    {jurusan.jumlah_kelas_10 || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-purple-50 text-purple-700 border border-purple-200/70">
                                                    {jurusan.jumlah_kelas_11 || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-orange-50 text-orange-700 border border-orange-200/70">
                                                    {jurusan.jumlah_kelas_12 || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-end">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setOpenDropdownId(openDropdownId === jurusan.id ? null : jurusan.id)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                            </svg>
                                                        </button>
                                                        {openDropdownId === jurusan.id && (
                                                            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-sm z-50 overflow-hidden border border-slate-200" onMouseLeave={() => setOpenDropdownId(null)}>
                                                                <div className="py-1">
                                                                    <Link
                                                                        href={`/${rolePrefix}/jurusan/${jurusan.id}/rombel`}
                                                                        className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 hover:text-emerald-600 transition-colors"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Kelola Rombel
                                                                    </Link>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleOpenEditModal(jurusan);
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 hover:text-blue-600 transition-colors border-t border-gray-50"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Edit Data
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setJurusanToDelete(jurusan);
                                                                            setShowDeleteConfirm(true);
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 transition-colors border-t border-gray-50"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Hapus Jurusan
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {searchTerm ? 'TIDAK ADA JURUSAN YANG COCOK' : 'BELUM ADA DATA JURUSAN'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEdit ? 'Edit Jurusan' : 'Tambah Jurusan'}>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Kode Jurusan</label>
                            <input
                                type="text"
                                value={data.kode}
                                onChange={e => setData('kode', e.target.value.toUpperCase())}
                                maxLength={15}
                                className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-[10px] uppercase tracking-widest ${errors.kode ? 'border-red-500' : ''}`}
                                placeholder="CONTOH: TKJ"
                            />
                            {errors.kode && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.kode}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nama Jurusan</label>
                            <input
                                type="text"
                                value={data.nama}
                                onChange={e => setData('nama', e.target.value)}
                                maxLength={100}
                                className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-[10px] uppercase tracking-widest ${errors.nama ? 'border-red-500' : ''}`}
                                placeholder="CONTOH: TEKNIK KOMPUTER DAN JARINGAN"
                            />
                            {errors.nama && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.nama}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !isFormValid}
                            className="flex-2 px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:bg-emerald-400"
                        >
                            {processing ? 'Menyimpan...' : (isFormValid ? (isEdit ? 'Simpan Perubahan' : 'Tambah Jurusan') : 'lengkapi semua data')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                show={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Hapus Jurusan"
                message={`Apakah Anda yakin ingin menghapus jurusan ${jurusanToDelete?.nama}? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus"
                variant="danger"
            />

            {/* Modal Import Excel */}
            <Modal
                show={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Jurusan via Excel"
                description="Tambah jurusan massal melalui berkas Excel"
                maxWidth="2xl"
            >
                <form onSubmit={handleImportSubmit} className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Template & Format</p>
                            <p className="text-sm font-semibold text-slate-900">Gunakan format Excel yang disediakan.</p>
                        </div>
                        <a
                            href={`/${rolePrefix}/jurusan/template`}
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
                                    kode,nama
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contoh Baris</p>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-[9px] font-mono text-slate-600">
                                    "RPL","Rekayasa Perangkat Lunak"<br/>
                                    "TKJ","Teknik Komputer dan Jaringan"
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Catatan</p>
                        <p className="mt-1 text-xs text-slate-600">
                            Gunakan kode singkat jurusan dan pastikan tidak duplikat.
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

