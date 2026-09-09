import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Pagination from '@/components/Pagination';
import type { WalletType } from '@/types';
import { formatRupiah } from '@/lib/utils';

interface NasabahKantongRow {
    id: number;
    nomor_rekening: string;
    nama: string;
    nis_nip?: string;
    user_type: string;
    rombel_nama?: string;
    tingkat?: number;
    saldo_kantong: number;
    target_amount?: number | null;
    sisa_tagihan?: number | null;
    status_bayar: 'lunas' | 'sebagian' | 'belum_bayar' | 'sudah_bayar';
    wallet_id?: number;
}

interface KantongShowProps {
    kantong: WalletType;
    nasabahs: {
        data: NasabahKantongRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    rombels: {
        id: number;
        nama_kelas: string;
        tingkat: number;
    }[];
    stats: {
        total_terkumpul: number;
        total_nasabah: number;
        total_lunas: number;
        persentase_lunas: number;
    };
    filters: {
        search?: string;
        tingkat?: string;
        rombel_id?: string;
    };
    rolePrefix: string;
}

export default function KantongShow({ kantong, nasabahs, rombels, stats, filters, rolePrefix }: KantongShowProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [tingkatFilter, setTingkatFilter] = useState(filters.tingkat || 'all');
    const [rombelFilter, setRombelFilter] = useState(filters.rombel_id || 'all');

    // Debounced search & filter
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const queryParams: any = {};
            if (search) queryParams.search = search;
            if (tingkatFilter !== 'all') queryParams.tingkat = tingkatFilter;
            if (rombelFilter !== 'all') queryParams.rombel_id = rombelFilter;

            if (
                search !== (filters.search || '') ||
                tingkatFilter !== (filters.tingkat || 'all') ||
                rombelFilter !== (filters.rombel_id || 'all')
            ) {
                router.get(`/${rolePrefix}/kantong/${kantong.id}`, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, tingkatFilter, rombelFilter]);

    const filteredRombels = rombels.filter((r) => {
        if (tingkatFilter === 'all') return true;
        return String(r.tingkat) === tingkatFilter;
    });

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/${rolePrefix}/kantong`}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
                            title="Kembali ke Kelola Kantong"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-semibold text-slate-900">{kantong.name}</h1>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                    kantong.category === 'tabungan'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                    {kantong.category === 'tabungan' ? 'Tabungan Utama' : 'Kantong Pembayaran'}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {kantong.description || 'Daftar saldo dan status pembayaran nasabah pada kantong ini'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/${rolePrefix}/bayar?wallet_type_id=${kantong.id}`}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] transition-all shadow-sm"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Bayar ke Kantong Ini
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`Detail Kantong: ${kantong.name}`} />

            <div className="space-y-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Total Dana Terkumpul
                        </span>
                        <p className="text-2xl font-bold text-indigo-600 mt-2">
                            {formatRupiah(stats.total_terkumpul)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Saldo masuk ke kantong</p>
                    </div>

                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Target Nominal / Siswa
                        </span>
                        <p className="text-2xl font-bold text-slate-900 mt-2">
                            {kantong.target_amount ? formatRupiah(kantong.target_amount) : 'Fleksibel'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Besaran tagihan per nasabah</p>
                    </div>

                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Nasabah Lunas
                        </span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <p className="text-2xl font-bold text-emerald-600">{stats.total_lunas}</p>
                            <span className="text-xs text-slate-400">/ {stats.total_nasabah} siswa</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, stats.persentase_lunas)}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Persentase Pembayaran
                        </span>
                        <p className="text-2xl font-bold text-slate-900 mt-2">
                            {stats.persentase_lunas}%
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Capaian target pelunasan</p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">
                                Cari Nasabah
                            </label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Nama, NIS, atau No. Rekening..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">
                                Tingkat
                            </label>
                            <select
                                value={tingkatFilter}
                                onChange={(e) => {
                                    setTingkatFilter(e.target.value);
                                    setRombelFilter('all');
                                }}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 transition-all"
                            >
                                <option value="all">SEMUA TINGKAT</option>
                                <option value="10">TINGKAT 10</option>
                                <option value="11">TINGKAT 11</option>
                                <option value="12">TINGKAT 12</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">
                                Rombel / Kelas
                            </label>
                            <select
                                value={rombelFilter}
                                onChange={(e) => setRombelFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/40 transition-all"
                            >
                                <option value="all">SEMUA KELAS</option>
                                {filteredRombels.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.nama_kelas || (r as any).nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table: Mirrored from Kelola Nasabah with Kantong Balance column */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75">
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        No. Rekening
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Nasabah
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Kelas
                                    </th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-indigo-700 uppercase tracking-[0.2em] bg-indigo-50/40">
                                        Saldo {kantong.name}
                                    </th>
                                    {kantong.target_amount && (
                                        <th className="px-6 py-4 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                            Sisa Tagihan
                                        </th>
                                    )}
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nasabahs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Tidak ada data nasabah ditemukan untuk kantong ini
                                        </td>
                                    </tr>
                                ) : (
                                    nasabahs.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono font-semibold text-indigo-700 tracking-tight">
                                                    {item.nomor_rekening}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                                                        {item.nama ? item.nama.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 tracking-tight">
                                                            {item.nama}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                            {item.nis_nip || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.rombel_nama ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border bg-slate-50 text-slate-700 border-slate-200 uppercase tracking-wider">
                                                        {item.rombel_nama}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            {/* Saldo Kantong: Main highlight column */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right bg-indigo-50/20">
                                                <span className="text-sm font-black text-indigo-900">
                                                    {formatRupiah(item.saldo_kantong)}
                                                </span>
                                            </td>
                                            {kantong.target_amount && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {item.sisa_tagihan !== null && item.sisa_tagihan > 0 ? (
                                                        <span className="text-xs font-semibold text-amber-600">
                                                            {formatRupiah(item.sisa_tagihan)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-emerald-600">
                                                            Rp 0 (Lunas)
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                {item.status_bayar === 'lunas' && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        Lunas
                                                    </span>
                                                )}
                                                {item.status_bayar === 'sebagian' && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
                                                        Sebagian
                                                    </span>
                                                )}
                                                {item.status_bayar === 'belum_bayar' && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-wider bg-rose-50 text-rose-700 border-rose-200">
                                                        Belum Bayar
                                                    </span>
                                                )}
                                                {item.status_bayar === 'sudah_bayar' && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-wider bg-sky-50 text-sky-700 border-sky-200">
                                                        Ada Saldo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/${rolePrefix}/bayar?pengirim_rekening=${item.nomor_rekening}&wallet_type_id=${kantong.id}`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                                                        title="Input Pembayaran untuk siswa ini"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        Bayar
                                                    </Link>
                                                    <Link
                                                        href={`/${rolePrefix}/nasabah/${item.id}`}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                                        title="Lihat Profil Lengkap Nasabah"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {nasabahs.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100">
                            <Pagination
                                currentPage={nasabahs.current_page}
                                lastPage={nasabahs.last_page}
                                total={nasabahs.total}
                                perPage={nasabahs.per_page}
                                onPageChange={(page) => {
                                    router.get(
                                        `/${rolePrefix}/kantong/${kantong.id}`,
                                        { ...filters, page },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
