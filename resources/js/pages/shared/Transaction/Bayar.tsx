import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatRupiah, formatNumber, parseNumber } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Receipt from '@/components/Receipt';
import FlashMessage from '@/components/FlashMessage';
import type { Nasabah, User } from '@/types';

interface PageProps {
    pengirim: (Nasabah & { user: User }) | null;
    pembayaranAccounts: (Nasabah & { user: User })[];
    auth: { user: User };
    minBayar: number;
}

export default function Bayar({ pengirim, pembayaranAccounts, minBayar }: PageProps) {
    const { auth, name, flash } = usePage<any>().props;
    const [searchAccount, setSearchAccount] = useState('');
    const searchTimeout = useRef<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [displayJumlah, setDisplayJumlah] = useState('');
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [pendingSuccess, setPendingSuccess] = useState<string | null>(null);
    const [manualSuccess, setManualSuccess] = useState<string | null>(null);

    // Sync flashed transaction data to local state
    useEffect(() => {
        if (flash?.transaction) {
            setLastTransaction(flash.transaction);
            setShowReceiptModal(true);
            if (flash.success) {
                setPendingSuccess(flash.success);
            }
        }
    }, [flash?.transaction]);

    const { data, setData, post, processing, errors, reset } = useForm({
        pengirim_rekening: pengirim?.nomor_rekening || '',
        penerima_rekening: '', // Ini akan diisi dari dropdown
        jumlah: '',
        keterangan: '',
        nama_petugas: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
    });

    const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplayJumlah(formatted);
        setData('jumlah', String(parseNumber(formatted)));
    };

    // Sync displayJumlah when data.jumlah changes (e.g. on reset or quick buttons)
    useEffect(() => {
        if (data.jumlah === '') {
            setDisplayJumlah('');
        } else if (parseNumber(displayJumlah) !== Number(data.jumlah)) {
            setDisplayJumlah(formatNumber(data.jumlah));
        }
    }, [data.jumlah]);

    // Sync pengirim prop to form data
    useEffect(() => {
        if (pengirim) {
            setData('pengirim_rekening', pengirim.nomor_rekening);
        }
    }, [pengirim]);

    const rolePrefix = auth.user.role === 'superadmin' || auth.user.role === 'admin' ? auth.user.role : 'teller';

    const handleSearch = (rekening: string) => {
        router.get(`/${rolePrefix}/bayar`, { pengirim_rekening: rekening }, {
            preserveState: true,
            replace: true,
        });
    };

    // Otomatis cari rekening pengirim saat input berubah
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchAccount && searchAccount.length >= 6) {
            searchTimeout.current = setTimeout(() => {
                handleSearch(searchAccount);
            }, 500); // debounce 500ms
        }
    }, [searchAccount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmit = () => {
        setShowConfirmModal(false);
        post(`/${rolePrefix}/bayar`, {
            onSuccess: () => {
                // Success modal will be triggered by useEffect watching flash.transaction
            },
        });
    };

    const handleCloseReceipt = () => {
        setShowReceiptModal(false);
        if (pendingSuccess) {
            setManualSuccess(pendingSuccess);
            setPendingSuccess(null);
        }
        reset();
        setSearchAccount('');
        setDisplayJumlah('');
        router.get(`/${rolePrefix}/bayar`, {}, { preserveState: false });
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-900 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">Pembayaran</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Transaksi Pembayaran</h1>
                            <p className="mt-2 text-sm text-indigo-100/80 max-w-xl">Layanan pembayaran untuk berbagai macam tagihan (sekolah/institusi).</p>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Pembayaran" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-12">
                    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-sm mb-8">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Cari Rekening Pembayar</h2>
                        <form onSubmit={e => { e.preventDefault(); handleSearch(searchAccount); }} className="flex w-full">
                            <div className="flex w-full">
                                <input
                                    type="text"
                                    value={searchAccount}
                                    onChange={(e) => setSearchAccount(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                    placeholder="Nomor Rekening Pembayar..."
                                    maxLength={255}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 border-r-0 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 rounded-l-2xl rounded-r-none outline-none transition-all font-bold text-[13px] h-12"
                                />
                                <button type="submit" className="px-6 bg-slate-900 text-white rounded-r-2xl rounded-l-none font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all h-12 flex items-center">
                                    Cari
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {pengirim && (
                    <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <>
                            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-sm flex-1">
                                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Formulir Pembayaran</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jenis Pembayaran Tujuan</label>
                                        <div className="flex w-full">
                                            <select
                                                value={data.penerima_rekening}
                                                onChange={e => setData('penerima_rekening', e.target.value)}
                                                className={`flex-1 px-4 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all font-bold text-[13px] h-12 uppercase ${errors.penerima_rekening ? 'border-red-500' : ''}`}
                                            >
                                                <option value="">-- Pilih Jenis Pembayaran --</option>
                                                {pembayaranAccounts.map((account) => (
                                                    <option key={account.id} value={account.nomor_rekening}>
                                                        {account.user.name} ({account.nomor_rekening})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {errors.penerima_rekening && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.penerima_rekening}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jumlah Bayar (Rp)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black uppercase tracking-widest text-xs">Rp</span>
                                            <input
                                                type="text"
                                                value={displayJumlah}
                                                onChange={handleJumlahChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-xl text-indigo-600 ${errors.jumlah ? 'border-red-500' : ''}`}
                                                placeholder="0"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {[50000, 100000, 200000, 500000, 1000000].map((amount) => (
                                                <button
                                                    key={amount}
                                                    type="button"
                                                    onClick={() => {
                                                        const formatted = formatNumber(String(amount));
                                                        setDisplayJumlah(formatted);
                                                        setData('jumlah', String(amount));
                                                    }}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm shadow-indigo-50"
                                                >
                                                    {formatRupiah(amount)}
                                                </button>
                                            ))}
                                        </div>
                                        {(() => {
                                            const amount = Number(data.jumlah);
                                            const isInsufficientBalance = amount > (pengirim?.saldo || 0);
                                            return (
                                                <>
                                                    {isInsufficientBalance && amount > 0 && (
                                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Saldo tidak mencukupi
                                                        </p>
                                                    )}
                                                    {errors.jumlah && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.jumlah}</p>}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end ml-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Keterangan</label>
                                            <span className="text-[9px] font-bold text-gray-400">{data.keterangan.length} / 255</span>
                                        </div>
                                        <textarea
                                            value={data.keterangan}
                                            onChange={e => setData('keterangan', e.target.value)}
                                            maxLength={255}
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm"
                                            placeholder="Berita Pembayaran..."
                                            rows={2}
                                        />
                                        {errors.keterangan && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.keterangan}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nama Petugas</label>
                                        <input
                                            type="text"
                                            value={data.nama_petugas}
                                            onChange={e => setData('nama_petugas', e.target.value)}
                                            maxLength={255}
                                            className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.nama_petugas ? 'border-red-500' : ''}`}
                                            placeholder="Masukkan Nama Petugas..."
                                            required
                                        />
                                        {errors.nama_petugas && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.nama_petugas}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                                        <input
                                            type="date"
                                            value={data.tanggal_transaksi}
                                            onChange={e => setData('tanggal_transaksi', e.target.value)}
                                            className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.tanggal_transaksi ? 'border-red-500' : ''}`}
                                            required
                                        />
                                        {errors.tanggal_transaksi && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.tanggal_transaksi}</p>}
                                    </div>

                                    {(() => {
                                        const amount = Number(data.jumlah);
                                        const isInsufficientBalance = amount > (pengirim?.saldo || 0);
                                        const isFormValid = !!(
                                            data.penerima_rekening &&
                                            data.jumlah &&
                                            amount > 0 &&
                                            data.nama_petugas &&
                                            data.tanggal_transaksi &&
                                            !isInsufficientBalance
                                        );

                                        let buttonText = 'Konfirmasi Pembayaran';
                                        if (isInsufficientBalance && amount > 0) buttonText = 'Saldo tidak mencukupi';
                                        else if (!isFormValid) buttonText = 'Lengkapi Semua Data';

                                        return (
                                            <button
                                                type="submit"
                                                disabled={processing || !isFormValid}
                                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <>{buttonText}</>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </form>
                            </div>
                            <div className="flex flex-col gap-6 flex-1">
                                <div className="rounded-xl p-4 text-white shadow bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 w-full">
                                    <h2 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-3 text-left">Data Pembayar (Pengirim)</h2>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-base font-black border border-white/20">
                                            {pengirim.user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold leading-tight">{pengirim.user.name}</h3>
                                            <p className="text-[10px] font-bold text-indigo-300 italic leading-tight">{pengirim.nomor_rekening}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                            <p className="text-[8px] font-bold text-gray-300 uppercase mb-0.5">Status</p>
                                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{pengirim.status || '-'}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                            <p className="text-[8px] font-bold text-gray-300 uppercase mb-0.5">Kelas</p>
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate" title={pengirim.rombel_rel?.nama_kelas || '-'}>
                                                {pengirim.rombel_rel?.nama_kelas || (pengirim.rombel_rel ? pengirim.rombel_rel.nama_kelas || `${pengirim.rombel_rel.tingkat} ${pengirim.rombel_rel.jurusan?.kode || ''}`.trim() : '-')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left">
                                            <p className="text-[10px] font-bold text-gray-300 uppercase mb-1">Saldo Tersedia</p>
                                            <p className="text-sm font-black text-indigo-300">{formatRupiah(pengirim.saldo)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    </div>
                )}
            </div>

            <ConfirmModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Pembayaran"
                message={`Lakukan pembayaran sebesar ${formatRupiah(Number(data.jumlah))}?`}
                variant="warning"
            />

            {/* Receipt Modal */}
            <Modal
                show={showReceiptModal}
                onClose={handleCloseReceipt}
                maxWidth="md"
                title="TRANSAKSI BERHASIL"
                variant="dark"
                closeOnOverlayClick={false}
                showCloseButton={false}
            >
                <Receipt
                    name={name}
                    transaction={lastTransaction}
                    onPrint={handlePrintReceipt}
                    onClose={handleCloseReceipt}
                    showPassbookPrint={false}
                />
            </Modal>

            <FlashMessage
                manualSuccess={manualSuccess}
                onClose={() => setManualSuccess(null)}
            />
        </DashboardLayout>
    );
}
