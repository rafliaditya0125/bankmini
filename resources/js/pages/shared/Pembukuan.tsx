import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { formatRupiah } from '@/lib/utils';
import Modal from '@/components/Modal';

interface Entry {
    tanggal: string;
    no_bukti: string;
    deskripsi: string;
    reff: string;
    debit: number;
    kredit: number;
    status: 'posted' | 'unposted';
}

interface Account {
    id: string;
    name: string;
}

interface Props {
    entries: Entry[];
    unpostedCount: number;
    filters: {
        type: 'jurnal_umum' | 'buku_besar';
        account: string;
        from_date: string;
        to_date: string;
    };
    accounts: Account[];
}

export default function Pembukuan({ entries, unpostedCount, filters, accounts }: Props) {
    const { auth } = usePage<any>().props;
    const [type, setType] = useState(filters.type || 'jurnal_umum');
    const [account, setAccount] = useState(filters.account || 'all');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [showPostModal, setShowPostModal] = useState(false);
    const firstRender = useRef(true);

    // Real-time filtering
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(window.location.pathname, {
                type,
                account,
                from_date: fromDate,
                to_date: toDate
            }, { 
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [account, fromDate, toDate, type]);

    const handleReset = () => {
        setAccount('all');
        setFromDate('');
        setToDate('');
        router.get(window.location.pathname, { type });
    };

    const handlePost = () => {
        router.post(`/${auth.user.role}/pembukuan/post`, {
            from_date: fromDate,
            to_date: toDate
        }, {
            onSuccess: () => setShowPostModal(false)
        });
    };

    const exportData = (exportType: 'pdf' | 'excel') => {
        const url = new URL(window.location.href);
        url.searchParams.set('export', exportType);
        
        if (exportType === 'pdf') {
            url.searchParams.set('print', 'true');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url.toString();
            document.body.appendChild(iframe);
            iframe.onload = () => {
                setTimeout(() => document.body.removeChild(iframe), 5000);
            };
        } else {
            window.open(url.toString(), '_blank');
        }
    };

    const totalDebit = entries.reduce((acc, curr) => acc + curr.debit, 0);
    const totalKredit = entries.reduce((acc, curr) => acc + curr.kredit, 0);

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">
                                {type === 'buku_besar' ? 'Buku Besar' : 'Jurnal Umum'}
                            </p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight uppercase">
                                {type === 'buku_besar' ? 'Laporan Buku Besar' : 'Laporan Jurnal Umum'}
                            </h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">
                                {type === 'buku_besar' ? 'Mutasi per rekening akun yang telah diposting.' : 'Kronologi transaksi akuntansi yang belum terposting.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                        {unpostedCount > 0 && type === 'jurnal_umum' && (
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all border border-emerald-400/30"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Posting ({unpostedCount})
                            </button>
                        )}
                        <button 
                            onClick={() => exportData('pdf')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 transition-all border border-emerald-400/30"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Cetak
                        </button>
                        <button 
                            onClick={() => exportData('excel')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all border border-emerald-400/30"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Excel
                        </button>
                    </div>
                </div>
                </div>
            }
        >
            <Head title={type === 'buku_besar' ? 'Buku Besar' : 'Jurnal Umum'} />

            <div className="space-y-6">
                {/* Filters - Match Laporan.tsx styles */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {type === 'buku_besar' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Filter Akun</label>
                                <select 
                                    value={account}
                                    onChange={(e) => setAccount(e.target.value)}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium h-11"
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Dari Tanggal</label>
                            <input 
                                type="date" 
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium h-11"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Sampai Tanggal</label>
                            <input 
                                type="date" 
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium h-11"
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={handleReset}
                                className="w-full h-11 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all border border-slate-100"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Reset Filter
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table - Match Laporan.tsx table styles */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Tanggal</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">No Bukti</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Deskripsi</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] text-center">REFF</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] text-right">Debit</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] text-right">Kredit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-50 rounded-full">
                                                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Data Tidak Ditemukan</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-500 uppercase">
                                                {entry.tanggal}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-xs font-mono font-black text-emerald-600 uppercase tracking-tighter">
                                                    {entry.no_bukti}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-black text-gray-900 tracking-tight">{entry.deskripsi}</p>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                {entry.status === 'posted' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                                                        Sudah Posting
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest">
                                                        Belum Posting
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                {entry.reff ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                                                        {entry.reff}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300 uppercase italic">─</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                {entry.debit > 0 ? (
                                                    <span className="text-sm font-black text-emerald-600 tracking-tighter">
                                                        {formatRupiah(entry.debit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-200">─</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                {entry.kredit > 0 ? (
                                                    <span className="text-sm font-black text-rose-600 tracking-tighter">
                                                        {formatRupiah(entry.kredit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-200">─</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {entries.length > 0 && (
                                <tfoot className="bg-slate-50/50">
                                    <tr className="border-t-2 border-slate-100">
                                        <td colSpan={5} className="px-6 py-6 text-xs font-black text-gray-900 uppercase tracking-widest text-right">Total Periode Ini</td>
                                        <td className="px-6 py-6 text-sm font-black text-emerald-600 text-right tracking-tighter bg-emerald-50/40">
                                            {formatRupiah(totalDebit)}
                                        </td>
                                        <td className="px-6 py-6 text-sm font-black text-rose-600 text-right tracking-tighter bg-rose-50/30">
                                            {formatRupiah(totalKredit)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                show={showPostModal}
                onClose={() => setShowPostModal(false)}
                maxWidth="2xl"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Konfirmasi Posting</h3>
                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">Tinjau daftar transaksi yang akan diposting ke Buku Besar</p>
                        </div>
                        <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{unpostedCount} Transaksi</span>
                        </div>
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto mb-8 border border-gray-100 rounded-2xl shadow-inner bg-gray-50/30">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">No Bukti</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Deskripsi</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Debit</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Kredit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {entries.filter(e => e.status === 'unposted').map((e, i) => (
                                    <tr key={i} className="hover:bg-white transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-[10px] font-mono font-black text-emerald-600 uppercase tracking-widest">{e.no_bukti}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">{e.tanggal}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-[10px] font-black text-gray-900 leading-tight">{e.deskripsi}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {e.debit > 0 ? <span className="text-[10px] font-black text-emerald-600">{formatRupiah(e.debit)}</span> : <span className="text-gray-300">─</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {e.kredit > 0 ? <span className="text-[10px] font-black text-rose-600">{formatRupiah(e.kredit)}</span> : <span className="text-gray-300">─</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 mr-auto mb-3 sm:mb-0">
                            ⚠️ Data yang diposting tidak dapat dibatalkan otomatis
                        </p>
                        <button
                            onClick={() => setShowPostModal(false)}
                            className="px-6 py-2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handlePost}
                            className="px-8 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            Ya, Posting Sekarang
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
