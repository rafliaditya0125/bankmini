import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
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

interface NasabahTransaksiProps {
    transactions: PaginatedTransactions;
    filters: {
        search?: string;
        from_date?: string;
        to_date?: string;
    };
}

export default function NasabahTransaksi({ transactions, filters }: NasabahTransaksiProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const { name, auth } = usePage<any>().props;
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get('/nasabah/transaksi', {
                search,
                from_date: fromDate,
                to_date: toDate,
            }, {
                preserveState: false,
                preserveScroll: true,
                replace: true
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, fromDate, toDate]);

    // Auto-refresh data every 10 seconds to ensure latest transactions are shown
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            router.get('/nasabah/transaksi', {
                search,
                from_date: fromDate,
                to_date: toDate,
            }, {
                preserveState: false,
                preserveScroll: true,
                replace: true
            });
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(refreshInterval);
    }, [search, fromDate, toDate]);

    const handleReset = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        router.get('/nasabah/transaksi');
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

    const handleViewReceipt = (tx: any) => {
        setSelectedTransaction(tx);
        setShowReceiptModal(true);
    };


    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Akun Nasabah</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Riwayat Transaksi</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Seluruh catatan aktivitas finansial rekening Anda dengan ringkasan saldo dan keterangan.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {/* Tombol cetak dan ekspor dinonaktifkan untuk nasabah */}
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Riwayat Transaksi" />

            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:px-4 md:py-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Total</p>
                        <p className="mt-0.5 text-base font-black text-slate-900 md:mt-1 md:text-xl">{transactions.total}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:px-4 md:py-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Periode</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-tight text-slate-800 md:mt-1 md:text-xs md:tracking-wide">
                            {fromDate && toDate ? `${fromDate} - ${toDate}` : 'Semua'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:px-4 md:py-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Filter</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-800 md:mt-1 md:text-xs">{search || 'Semua transaksi'}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-3xl bg-white/90 border border-slate-200/70 p-6 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Pencarian</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari kode transaksi atau keterangan..."
                                    className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                        <div className="flex items-end gap-2 lg:col-span-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Rentang Tanggal</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-black focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-black focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                                </div>
                            </div>
                            <button onClick={handleReset} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-2xl border border-slate-200">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="rounded-3xl bg-white/90 border border-slate-200/70 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Transaksi</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Nominal</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Akhir</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Informasi</th>
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
                                    transactions.data.map((transaction: any) => {
                                        const isIncomingPayment = transaction.is_incoming_payment;
                                        const isCreditTransaction = isIncomingPayment || (transaction.saldo_sesudah && Number(transaction.saldo_sesudah) >= Number(transaction.saldo_sebelum));
                                        
                                        return (
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
                                                <span className="text-xs font-mono font-black text-emerald-600 uppercase tracking-tighter">{transaction.kode_transaksi}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                                                    isCreditTransaction ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    {isIncomingPayment ? 'Terima Bayar' : transaction.jenis_transaksi.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right whitespace-nowrap text-sm font-black tracking-tighter ${
                                                isCreditTransaction ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                                {isCreditTransaction ? '+' : '-'} {formatRupiah(transaction.jumlah)}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-black text-gray-900 tracking-tighter">
                                                {transaction.saldo_sesudah ? formatRupiah(transaction.saldo_sesudah) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isIncomingPayment ? (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Dari: {transaction.nasabah_name}</p>
                                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-tight mt-0.5">{transaction.nasabah_norek}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight line-clamp-1 max-w-48">{transaction.keterangan || '-'}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleViewReceipt(transaction)}
                                                    className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-black text-[10px] uppercase tracking-wider transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Struk
                                                </button>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={transactions.current_page}
                        lastPage={transactions.last_page}
                        total={transactions.total}
                        url="/nasabah/transaksi"
                        filters={{
                            search,
                            from_date: fromDate,
                            to_date: toDate,
                        }}
                        itemLabel="Riwayat Transaksi"
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
        </DashboardLayout>
    );
}
