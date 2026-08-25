import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatRupiah, formatRombelName } from '@/lib/utils';
import Modal from '@/components/Modal';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import Receipt from '@/components/Receipt';
import Pagination from '@/components/Pagination';
import type { Transaksi } from '@/types';

interface PaginatedTransactions {
    data: Transaksi[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    current_page: number;
    last_page: number;
    total: number;
}

interface TellerTransaksiProps {
    transactions: PaginatedTransactions;
    filters: {
        search?: string;
        from_date?: string;
        to_date?: string;
        type?: string;
    };
}

export default function TellerTransaksi({ transactions, filters }: TellerTransaksiProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [type, setType] = useState(filters.type || '');
    const [viewAll, setViewAll] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const { name, auth } = usePage<any>().props;
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get('/teller/transaksi', {
                search,
                type,
                view_all: viewAll ? 'true' : 'false',
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, type, viewAll]);

    // Auto-refresh data every 10 seconds to ensure latest transactions are shown
    useEffect(() => {
        if (showReceiptModal || showCancelModal || isCancelling) {
            return;
        }

        const refreshInterval = setInterval(() => {
            router.get('/teller/transaksi', {
                search,
                type,
                view_all: viewAll ? 'true' : 'false',
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(refreshInterval);
    }, [search, type, viewAll, showReceiptModal, showCancelModal, isCancelling]);

    const handleReset = () => {
        setSearch('');
        setType('');
        router.get('/teller/transaksi');
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
        router.post(`/teller/transaksi/${selectedTransaction.id}/cancel`, {
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

    const exportData = (exportType: 'pdf' | 'excel') => {
        const url = new URL(window.location.href);
        url.searchParams.set('export', exportType);

        if (exportType === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url.toString();
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 3000);
            };
        } else {
            window.open(url.toString(), '_blank');
        }
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Transaksi Teller</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Riwayat Layanan Hari Ini</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Daftar transaksi yang Anda layani pada hari ini dengan status dan detail lengkap.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => exportData('pdf')}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Cetak Laporan
                            </button>
                            <button
                                onClick={() => exportData('excel')}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Ekspor Excel
                            </button>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Riwayat Transaksi" />

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Transaksi</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{transactions.total}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Jenis Aktif</p>
                        <p className="mt-2 text-sm font-black text-slate-900 uppercase tracking-widest">{type ? type : 'Semua'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Pencarian</p>
                        <p className="mt-2 text-sm font-black text-slate-900 truncate">{search || 'Semua'}</p>
                    </div>
                </div>

                {/* Action Bar / Filters */}
                <div className="rounded-3xl bg-white/90 border border-slate-200/70 p-6 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Pencarian</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    maxLength={255}
                                    placeholder="Cari kode, nama, atau rekening..."
                                    className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Jenis</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-xs focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none bg-white"
                            >
                                <option value="">Semua Jenis</option>
                                <option value="setor">Setor</option>
                                <option value="tarik">Tarik</option>
                                <option value="transfer">Transfer</option>
                                <option value="bayar">Bayar</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={handleReset} className="px-4 py-2.5 text-slate-500 hover:text-rose-500 transition-colors bg-slate-50 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" /></svg>
                                Reset Pencarian
                            </button>
                        </div>
                    </div>
                    
                    {/* Toggle untuk melihat semua transaksi hari ini */}
                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={viewAll}
                                onChange={(e) => setViewAll(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                Tampilkan Semua Transaksi Hari Ini (dari semua teller)
                            </span>
                        </label>
                    </div>
                </div>

                {/* Table Card */}
                <div className="rounded-3xl bg-white/90 border border-slate-200/70 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaksi</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nasabah</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Info / Petugas</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Tidak ada riwayat transaksi ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                    {new Date(transaction.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                    {new Date(transaction.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono font-black text-indigo-600 uppercase tracking-tighter">{transaction.kode_transaksi}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-black text-gray-900 tracking-tight">
                                                    {transaction.nasabah?.user?.name || 'N/A'}
                                                    {(transaction.nasabah_kelas || transaction.nasabah?.rombel_rel || (transaction.nasabah as any)?.rombelRel) && (
                                                        <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight italic">
                                                            ({transaction.nasabah_kelas || formatRombelName(transaction.nasabah?.rombel_rel || (transaction.nasabah as any)?.rombelRel)})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter uppercase">{transaction.nasabah?.nomor_rekening || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                                                    transaction.jenis_transaksi === 'setor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    transaction.jenis_transaksi === 'tarik' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    transaction.jenis_transaksi === 'bayar' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {transaction.jenis_transaksi}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right whitespace-nowrap text-sm font-black tracking-tighter ${
                                                transaction.status === 'cancelled' ? 'text-gray-400 line-through' : (
                                                    transaction.jenis_transaksi === 'setor' ? 'text-emerald-600' :
                                                    transaction.jenis_transaksi === 'tarik' ? 'text-rose-600' :
                                                    'text-blue-600'
                                                )
                                            }`}>
                                                {transaction.status === 'cancelled' && <span className="block text-[8px] uppercase tracking-widest text-rose-500 mb-0.5">Dibatalkan</span>}
                                                {formatRupiah(transaction.jumlah)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-[10px] font-black text-gray-600 uppercase tracking-tight">
                                                    {transaction.status === 'cancelled' ? (
                                                        <span className="text-rose-500 italic">Batal: {transaction.cancel_reason}</span>
                                                    ) : (
                                                        (transaction as any).petugas_nama || transaction.petugas?.name || 'System'
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tight line-clamp-1 max-w-[8rem]">{transaction.keterangan || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Dropdown
                                                    trigger={
                                                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors group-hover:bg-white shadow-sm border border-transparent group-hover:border-gray-100">
                                                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    <DropdownItem
                                                        onClick={() => handleViewReceipt(transaction)}
                                                        className="text-gray-700 hover:bg-gray-50"
                                                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                                    >
                                                        Lihat Struk
                                                    </DropdownItem>

                                                    {transaction.status !== 'cancelled' && !transaction.posted_at && (
                                                        <DropdownItem
                                                            onClick={() => handleOpenCancel(transaction)}
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
                    <Pagination
                        currentPage={transactions.current_page}
                        lastPage={transactions.last_page}
                        total={transactions.total}
                        url="/teller/transaksi"
                        filters={{
                            search,
                            type,
                            view_all: viewAll ? 'true' : 'false',
                        }}
                        itemLabel="Transaksi"
                    />
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
