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

interface TarikPageProps {
    nasabah: (Nasabah & { jurusan_rel?: { nama: string }; user: User }) | null;
    auth: { user: User };
    transactionTypes: string[];
    bkkBkmMode: 'manual' | 'auto';
    minWithdraw: number;
}

export default function Tarik({ nasabah, transactionTypes, bkkBkmMode, minWithdraw }: TarikPageProps) {
    const { auth, name, flash, min_cash_denomination } = usePage<any>().props;
    const [searchAccount, setSearchAccount] = useState('');
    const searchTimeout = useRef<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [displayJumlah, setDisplayJumlah] = useState('');
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [pendingSuccess, setPendingSuccess] = useState<string | null>(null);
    const [manualSuccess, setManualSuccess] = useState<string | null>(null);
    const [bkkStatus, setBkkStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
    const [bkkStatusMessage, setBkkStatusMessage] = useState('');
    const bkkCheckTimeout = useRef<any>(null);
    const bkkCheckRequest = useRef(0);

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

    const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplayJumlah(formatted);
        setData('jumlah', String(parseNumber(formatted)));
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        nomor_rekening: nasabah?.nomor_rekening || '',
        jumlah: '',
        keterangan: '',
        nama_petugas: '',
        no_bkk: '',
        jenis_transaksi: transactionTypes?.[0] || 'Tunai',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
    });

    // Sync displayJumlah when data.jumlah changes (e.g. on reset or quick buttons)
    useEffect(() => {
        if (data.jumlah === '') {
            setDisplayJumlah('');
        } else if (parseNumber(displayJumlah) !== Number(data.jumlah)) {
            setDisplayJumlah(formatNumber(data.jumlah));
        }
    }, [data.jumlah]);

    // Sync nasabah prop to form data
    useEffect(() => {
        if (nasabah) {
            setData('nomor_rekening', nasabah.nomor_rekening);
        }
    }, [nasabah]);

    const rolePrefix = auth.user.role === 'superadmin' || auth.user.role === 'admin' ? auth.user.role : 'teller';


    const handleSearch = (rekening: string) => {
        router.get(`/${rolePrefix}/tarik`, { nomor_rekening: rekening }, {
            preserveState: true,
            replace: true,
        });
    };

    // Otomatis cari rekening saat input berubah
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchAccount && searchAccount.length >= 6) {
            searchTimeout.current = setTimeout(() => {
                handleSearch(searchAccount);
            }, 500); // debounce 500ms
        }
    }, [searchAccount]);

    useEffect(() => {
        if (bkkBkmMode !== 'manual') {
            setBkkStatus('idle');
            setBkkStatusMessage('');
            return;
        }

        if (bkkCheckTimeout.current) {
            clearTimeout(bkkCheckTimeout.current);
        }

        const rawNumber = data.no_bkk.trim();
        if (!rawNumber) {
            setBkkStatus('idle');
            setBkkStatusMessage('');
            return;
        }

        setBkkStatus('checking');
        setBkkStatusMessage('Memeriksa nomor BKK...');
        const requestId = ++bkkCheckRequest.current;

        bkkCheckTimeout.current = setTimeout(() => {
            axios
                .get('/api/kode-transaksi/check', { params: { prefix: 'BKK', number: rawNumber } })
                .then((response) => {
                    if (requestId !== bkkCheckRequest.current) {
                        return;
                    }

                    if (response.data?.exists) {
                        setBkkStatus('taken');
                        setBkkStatusMessage('Nomor BKK ini sudah digunakan.');
                        return;
                    }

                    setBkkStatus('available');
                    setBkkStatusMessage('Nomor BKK tersedia.');
                })
                .catch(() => {
                    if (requestId !== bkkCheckRequest.current) {
                        return;
                    }

                    setBkkStatus('error');
                    setBkkStatusMessage('Gagal memeriksa nomor BKK. Coba lagi.');
                });
        }, 350);

        return () => {
            if (bkkCheckTimeout.current) {
                clearTimeout(bkkCheckTimeout.current);
            }
        };
    }, [data.no_bkk, bkkBkmMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmit = () => {
        setShowConfirmModal(false);
        post(`/${rolePrefix}/tarik`, {
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
        router.get(`/${rolePrefix}/tarik`, {}, { preserveState: false });
    };

    const handlePrintReceipt = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-gradient-to-br from-rose-950 via-slate-900 to-rose-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-200">Tarik Tunai</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Transaksi Penarikan</h1>
                            <p className="mt-2 text-sm text-rose-100/80 max-w-xl">Layanan pengeluaran dana nasabah SMEACIS dengan kontrol keamanan berlapis.</p>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Penarikan" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 space-y-6">
                    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Identifikasi Nasabah</p>
                                <p className="text-xs text-slate-500">Cari dan pilih rekening nasabah sebelum transaksi.</p>
                            </div>
                        </div>
                        <form onSubmit={e => { e.preventDefault(); handleSearch(searchAccount); }} className="flex w-full">
                            <div className="flex w-full">
                                <input
                                    type="text"
                                    value={searchAccount}
                                    onChange={(e) => setSearchAccount(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Nomor Rekening Pengirim..."
                                    maxLength={255}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 border-r-0 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 rounded-l-2xl rounded-r-none outline-none transition-all font-bold text-[13px] h-12"
                                />
                                <button type="submit" className="px-6 bg-slate-900 text-white rounded-r-2xl rounded-l-none font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all h-12 flex items-center">
                                    Cari
                                </button>
                            </div>
                        </form>
                    </div>

                    {nasabah && (
                        <div className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 md:p-5 shadow-sm">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Transaksi</p>
                                    <p className="text-[11px] text-slate-500">Pastikan nominal & tanggal sudah benar.</p>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jumlah Penarikan (Rp)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black uppercase tracking-widest text-xs">Rp</span>
                                            <input
                                                type="text"
                                                value={displayJumlah}
                                                onChange={handleJumlahChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-xl text-rose-600 ${errors.jumlah ? 'border-red-500' : ''}`}
                                                placeholder="0"
                                                required
                                                style={{ fontSize: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
                                            />
                                        </div>

                                        {/* Quick Amount Buttons */}
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
                                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm shadow-rose-50"
                                                >
                                                    {formatRupiah(amount)}
                                                </button>
                                            ))}
                                        </div>
                                        {(() => {
                                            const amount = Number(data.jumlah);
                                            const isInvalidDenom = amount > 0 && amount % min_cash_denomination !== 0;
                                            const isBelowMinWithdraw = amount > 0 && amount < minWithdraw;
                                            const isInsufficientBalance = amount > (nasabah?.saldo || 0);

                                            return (
                                                <>
                                                    {isInvalidDenom && (
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Harus kelipatan Rp {formatNumber(String(min_cash_denomination))}
                                                        </p>
                                                    )}
                                                    {isInsufficientBalance && amount > 0 && (
                                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Saldo tidak mencukupi
                                                        </p>
                                                    )}
                                                    {isBelowMinWithdraw && (
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Minimal penarikan {formatRupiah(minWithdraw)}
                                                        </p>
                                                    )}
                                                    {errors.jumlah && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{errors.jumlah}</p>}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jenis Transaksi</label>
                                        <select
                                            value={data.jenis_transaksi}
                                            onChange={e => setData('jenis_transaksi', e.target.value)}
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest appearance-none"
                                        style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                        >
                                            {transactionTypes && transactionTypes.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {bkkBkmMode === 'manual' ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">No. BKK</label>
                                            <input
                                                type="text"
                                                value={data.no_bkk}
                                                onChange={e => setData('no_bkk', e.target.value.replace(/\D/g, ''))}
                                                maxLength={50}
                                                className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.no_bkk || bkkStatus === 'taken' || bkkStatus === 'error' ? 'border-red-500' : ''}`}
                                                placeholder="CONTOH: 001"
                                                required
                                                style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                            />
                                            {bkkStatus === 'checking' && <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 ml-1">{bkkStatusMessage}</p>}
                                            {bkkStatus === 'taken' && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{bkkStatusMessage}</p>}
                                            {bkkStatus === 'error' && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{bkkStatusMessage}</p>}
                                            {errors.no_bkk && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{errors.no_bkk}</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">No. BKK</label>
                                            <div className="w-full px-4 py-4 bg-rose-50 border border-rose-200 rounded-2xl text-[10px] font-black text-rose-700 uppercase tracking-widest">
                                                Otomatis Digenerate Sistem
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                                        <input
                                            type="date"
                                            value={data.tanggal_transaksi}
                                            onChange={e => setData('tanggal_transaksi', e.target.value)}
                                            className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.tanggal_transaksi ? 'border-red-500' : ''}`}
                                            required
                                            style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                        />
                                        {errors.tanggal_transaksi && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{errors.tanggal_transaksi}</p>}
                                    </div>
                                </div>


                                <div className="space-y-2">
                                    <div className="flex justify-between items-end ml-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Keterangan (Optional)</label>
                                        <span className="text-[9px] font-bold text-gray-400">{data.keterangan.length} / 255</span>
                                    </div>
                                    <textarea
                                        value={data.keterangan}
                                        onChange={e => setData('keterangan', e.target.value)}
                                        maxLength={255}
                                        className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm min-h-[100px]"
                                        placeholder="Tambahkan catatan jika diperlukan..."
                                        style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', minHeight: 60 }}
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
                                        className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.nama_petugas ? 'border-red-500' : ''}`}
                                        placeholder="Masukkan Nama Petugas..."
                                        required
                                        style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                    />
                                    {errors.nama_petugas && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{errors.nama_petugas}</p>}
                                </div>

                                <div className="pt-4">
                                    {(() => {
                                        const amount = Number(data.jumlah);
                                        const isInvalidDenom = amount > 0 && amount % min_cash_denomination !== 0;
                                        const isBelowMinWithdraw = amount > 0 && amount < minWithdraw;
                                        const isInsufficientBalance = amount > (nasabah?.saldo || 0);
                                        const isFormValid = !!(
                                            data.nomor_rekening &&
                                            data.jumlah &&
                                            amount > 0 &&
                                            data.nama_petugas &&
                                            (bkkBkmMode !== 'manual' || data.no_bkk) &&
                                            !isInsufficientBalance &&
                                            !isInvalidDenom &&
                                            !isBelowMinWithdraw &&
                                            (bkkBkmMode !== 'manual' || bkkStatus === 'available')
                                        );
                                        return (
                                            <button
                                                type="submit"
                                                disabled={processing || !isFormValid}
                                                className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-700 transition-all active:scale-[0.98] shadow-xl shadow-rose-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? (
                                                    <span className="inline-flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        Memproses...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {isInsufficientBalance && amount > 0 ? 'Saldo tidak mencukupi' : (!isFormValid ? 'lengkapi semua data' : 'Proses Penarikan')}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-5 space-y-6">
                    {nasabah ? (
                        <div className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-rose-900">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/25 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest">Informasi Rekening Aktif</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-black mb-2 border border-white/20">
                                    {nasabah.user.name.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-base font-black tracking-tight">{nasabah.user.name}</h3>
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-1 italic">{nasabah.nomor_rekening}</p>
                            </div>
                            <div className="space-y-2 relative z-10">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center col-span-1">
                                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1">Saldo Saat Ini</p>
                                        <p className="text-sm font-black text-rose-300 tracking-tight">{formatRupiah(nasabah.saldo)}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center col-span-1">
                                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1">Min. Penarikan</p>
                                        <p className="text-sm font-black text-rose-300 tracking-tight">{formatRupiah(minWithdraw)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1">No. Rekening</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{nasabah.nomor_rekening}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-[9px] font-black text-rose-200 uppercase tracking-widest flex items-center gap-2">{nasabah.status || '-'}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest mb-1">Kelas</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">
                                            {nasabah.rombel_rel?.nama_kelas || 
                                             (nasabah.rombel_rel ? `${nasabah.rombel_rel.tingkat} ${nasabah.rombel_rel.jurusan?.kode || ''} ${nasabah.rombel_rel.nomor_rombel}`.trim() : '-')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-200 rounded-3xl bg-white/70">
                            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Nasabah Belum Dipilih</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2 italic capitalize">Cek Identitas Nasabah Untuk Transaksi Ambil Saldo</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Penarikan"
                message={`Anda akan memproses penarikan sebesar ${formatRupiah(Number(data.jumlah))} dari rekening ${nasabah?.nomor_rekening}?`}
                variant="danger"
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
                    showPassbookPrint={true}
                />
            </Modal>

            <FlashMessage
                manualSuccess={manualSuccess}
                onClose={() => setManualSuccess(null)}
            />
        </DashboardLayout>
    );
}
