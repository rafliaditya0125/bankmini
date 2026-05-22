import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useState, useEffect } from 'react';
import { formatRupiah } from '@/lib/utils';
import Modal from '@/components/Modal';
import Receipt from '@/components/Receipt';
import Dropdown, { DropdownItem } from '@/components/Dropdown';

interface LaporanPageProps {
    transactions: {
        data: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        jenis_transaksi?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function Laporan({ transactions, filters }: LaporanPageProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';

    const [search, setSearch] = useState(filters.search || '');
    const [jenis, setJenis] = useState(filters.jenis_transaksi || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const { name } = usePage<any>().props;

    // Real-time search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (
                search !== (filters.search || '') ||
                jenis !== (filters.jenis_transaksi || '') ||
                dateFrom !== (filters.date_from || '') ||
                dateTo !== (filters.date_to || '')
            ) {
                router.get(`/${rolePrefix}/laporan`, {
                    search,
                    jenis_transaksi: jenis,
                    date_from: dateFrom,
                    date_to: dateTo
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, jenis, dateFrom, dateTo, rolePrefix]);

    const resetFilters = () => {
        setSearch('');
        setJenis('');
        setDateFrom('');
        setDateTo('');
        router.get(`/${rolePrefix}/laporan`);
    };

    const handleViewReceipt = (tx: any) => {
        setSelectedTransaction(tx);
        setShowReceiptModal(true);
    };

    const handleOpenCancel = (tx: any) => {
        setSelectedTransaction(tx);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleCancelSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cancelReason || cancelReason.length < 5) return;

        setIsCancelling(true);
        router.post(`/${rolePrefix}/transaksi/${selectedTransaction.id}/cancel`, {
            reason: cancelReason
        }, {
            onSuccess: () => {
                setShowCancelModal(false);
                setIsCancelling(false);
                setCancelReason('');
            },
            onError: () => setIsCancelling(false),
            preserveScroll: true
        });
    };

    const exportPdf = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('export', 'pdf');
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url.toString();
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 3000);
        };
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Laporan Transaksi</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Riwayat Transaksi</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Daftar lengkap seluruh transaksi sistem dengan filter periode, jenis, dan pencarian cepat.</p>
                        </div>
                        <button
                            onClick={exportPdf}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Cetak Laporan
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Riwayat Transaksi" />

            <div className="space-y-6">
                {/* Real-time Filters */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Pencarian</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari transaksi..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    maxLength={255}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Jenis</label>
                            <select
                                value={jenis}
                                onChange={(e) => setJenis(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium h-11"
                            >
                                <option value="">Semua Jenis</option>
                                <option value="setor">Setoran Tunai</option>
                                <option value="tarik">Penarikan Tunai</option>
                                <option value="transfer">Transfer</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Dari Tanggal</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-11"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Sampai Tanggal</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-11"
                                />
                                <button onClick={resetFilters} className="p-2 text-slate-400 hover:text-rose-500 transition-colors border border-slate-200 rounded-xl bg-white">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-200/70">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Waktu</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Transaksi</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Nasabah</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Tipe</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Jumlah</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Info / Petugas</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                                            Tidak ada riwayat transaksi ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-semibold text-slate-900 uppercase tracking-tight">
                                                    {new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                                                    {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono font-black text-emerald-600 uppercase tracking-tighter">{tx.kode_transaksi}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900 tracking-tight">
                                                    {tx.nasabah.user.name}
                                                    {tx.nasabah_kelas && (
                                                        <span className="ml-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight italic">
                                                            ({tx.nasabah_kelas})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-mono font-semibold text-slate-400 tracking-tighter uppercase">{tx.nasabah.nomor_rekening}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                                                    Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    {tx.jenis_transaksi.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right whitespace-nowrap text-sm font-black tracking-tighter ${
                                                tx.status === 'cancelled' ? 'text-gray-400 line-through' : (
                                                    Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum) ? 'text-emerald-600' : 'text-rose-600'
                                                )
                                            }`}>
                                                {tx.status === 'cancelled' && <span className="block text-[8px] uppercase tracking-widest text-rose-500 mb-0.5">Dibatalkan</span>}
                                                {Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum) ? '+' : '-'} {formatRupiah(tx.jumlah)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">
                                                    {tx.status === 'cancelled' ? (
                                                        <span className="text-rose-500 italic">Batal: {tx.cancel_reason}</span>
                                                    ) : (
                                                        (tx as any).petugas_nama || tx.petugas?.name || 'System'
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight line-clamp-1 max-w-32">{tx.keterangan || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Dropdown
                                                    trigger={
                                                        <button className="p-2 hover:bg-emerald-50 rounded-full transition-colors group-hover:bg-white shadow-sm border border-transparent group-hover:border-emerald-100">
                                                            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    <DropdownItem
                                                        onClick={() => handleViewReceipt(tx)}
                                                        className="text-emerald-700 hover:bg-emerald-50"
                                                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                                    >
                                                        Lihat Struk
                                                    </DropdownItem>

                                                    {tx.status !== 'cancelled' && !tx.posted_at && (
                                                        <DropdownItem
                                                            onClick={() => handleOpenCancel(tx)}
                                                            className="text-rose-600 hover:bg-rose-50"
                                                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                        >
                                                            Batalkan Transaksi
                                                        </DropdownItem>
                                                    )}
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-200/70 bg-slate-50/70 flex items-center justify-between">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                            Total {transactions.total} Data
                        </div>
                        <div className="flex gap-2">
                            {transactions.current_page > 1 && (
                                <Link
                                    href={`/${rolePrefix}/laporan?page=${transactions.current_page - 1}&${new URLSearchParams(filters as any).toString()}`}
                                    className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Prev
                                </Link>
                            )}
                            <div className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl">
                                {transactions.current_page}
                            </div>
                            {transactions.current_page < transactions.last_page && (
                                <Link
                                    href={`/${rolePrefix}/laporan?page=${transactions.current_page + 1}&${new URLSearchParams(filters as any).toString()}`}
                                    className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            <Modal show={showReceiptModal} onClose={() => setShowReceiptModal(false)} maxWidth="md" title="DETAIL TRANSAKSI" variant="dark">
                <Receipt
                    name={name}
                    transaction={selectedTransaction}
                    onClose={() => setShowReceiptModal(false)}
                    showPrint={['superadmin', 'admin', 'teller'].includes(auth.user.role)}
                />
            </Modal>

            {/* Cancellation Modal */}
            <Modal show={showCancelModal} onClose={() => setShowCancelModal(false)} maxWidth="md">
                <form onSubmit={handleCancelSubmit} className="p-8">
                    <div className="flex items-center gap-4 mb-6 text-rose-600">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Batalkan Transaksi</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Gunakan kode {selectedTransaction?.kode_transaksi} sebagai referensi</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alasan Pembatalan</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Kenapa transaksi ini dibatalkan?"
                                maxLength={255}
                                className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-32"
                                required
                            />
                            {cancelReason.length > 0 && cancelReason.length < 5 && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-tight ml-1">Minimal 5 karakter</p>
                            )}
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
                            <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-tight leading-relaxed">
                                Pembatalan akan otomatis mengembalikan saldo nasabah terkait. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(false)}
                            className="px-6 py-2.5 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                        >
                            Tutup
                        </button>
                        <button
                            type="submit"
                            disabled={isCancelling || cancelReason.length < 5}
                            className="px-8 py-2.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 disabled:bg-rose-300"
                        >
                            {isCancelling ? 'Memproses...' : 'Ya, Batalkan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
