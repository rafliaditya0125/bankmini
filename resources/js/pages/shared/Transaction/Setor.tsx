import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatRupiah, formatNumber, parseNumber, formatRombelName } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Receipt from '@/components/Receipt';
import FlashMessage from '@/components/FlashMessage';
import NasabahSearchBox from '@/components/NasabahSearchBox';
import type { Nasabah, User } from '@/types';

interface SetorPageProps {
    nasabah: (Nasabah & { user: User }) | null;
    auth: { user: User };
    transactionTypes: string[];
    bkkBkmMode: 'manual' | 'auto';
}

export default function Setor({ nasabah, transactionTypes, bkkBkmMode }: SetorPageProps) {
    const { auth, name, flash, min_cash_denomination } = usePage<any>().props;
    const [searchAccount, setSearchAccount] = useState('');
    const searchTimeout = useRef<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showSavingsBookModal, setShowSavingsBookModal] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [displayJumlah, setDisplayJumlah] = useState('');
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [pendingSuccess, setPendingSuccess] = useState<string | null>(null);
    const [manualSuccess, setManualSuccess] = useState<string | null>(null);
    const [bkmStatus, setBkmStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
    const [bkmStatusMessage, setBkmStatusMessage] = useState('');
    const bkmCheckTimeout = useRef<any>(null);
    const bkmCheckRequest = useRef(0);

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
        no_bkm: '',
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
        router.get(`/${rolePrefix}/setor`, { nomor_rekening: rekening }, {
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
            setBkmStatus('idle');
            setBkmStatusMessage('');
            return;
        }

        if (bkmCheckTimeout.current) {
            clearTimeout(bkmCheckTimeout.current);
        }

        const rawNumber = data.no_bkm.trim();
        if (!rawNumber) {
            setBkmStatus('idle');
            setBkmStatusMessage('');
            return;
        }

        setBkmStatus('checking');
        setBkmStatusMessage('Memeriksa nomor BKM...');
        const requestId = ++bkmCheckRequest.current;

        bkmCheckTimeout.current = setTimeout(() => {
            axios
                .get('/api/kode-transaksi/check', { params: { prefix: 'BKM', number: rawNumber } })
                .then((response) => {
                    if (requestId !== bkmCheckRequest.current) {
                        return;
                    }

                    if (response.data?.exists) {
                        setBkmStatus('taken');
                        setBkmStatusMessage('Nomor BKM ini sudah digunakan.');
                        return;
                    }

                    setBkmStatus('available');
                    setBkmStatusMessage('Nomor BKM tersedia.');
                })
                .catch(() => {
                    if (requestId !== bkmCheckRequest.current) {
                        return;
                    }

                    setBkmStatus('error');
                    setBkmStatusMessage('Gagal memeriksa nomor BKM. Coba lagi.');
                });
        }, 350);

        return () => {
            if (bkmCheckTimeout.current) {
                clearTimeout(bkmCheckTimeout.current);
            }
        };
    }, [data.no_bkm, bkkBkmMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmit = () => {
        setShowConfirmModal(false);
        post(`/${rolePrefix}/setor`, {
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
        // Force navigate to clean URL to remove nasabah from props
        router.get(`/${rolePrefix}/setor`, {}, { preserveState: false });
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
                <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Setor Tunai</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Transaksi Setoran</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Layanan penerimaan dana nasabah SMEACIS dengan validasi cepat dan bukti transaksi instan.</p>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Setoran" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Search & Input Column */}
                <div className="xl:col-span-7 space-y-6">
                    {/* Search Section */}
                    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Identifikasi Nasabah</p>
                                <p className="text-xs text-slate-500">Cari dan pilih rekening nasabah sebelum transaksi.</p>
                            </div>
                        </div>
                        <div className="w-full">
                            <NasabahSearchBox
                                value={searchAccount}
                                onChange={setSearchAccount}
                                onSelect={handleSearch}
                                placeholder="Cari nama atau nomor rekening..."
                            />
                        </div>
                    </div>

                    {/* Transaction Form */}
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
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jumlah Setoran (Rp)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black uppercase tracking-widest text-xs">Rp</span>
                                            <input
                                                type="text"
                                                value={displayJumlah}
                                                onChange={handleJumlahChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-xl text-emerald-600 ${errors.jumlah ? 'border-red-500' : ''}`}
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
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-50"
                                                >
                                                    {formatRupiah(amount)}
                                                </button>
                                            ))}
                                        </div>

                                        {(() => {
                                            const amount = Number(data.jumlah);
                                            const isInvalidDenom = amount > 0 && amount % min_cash_denomination !== 0;

                                            return (
                                                <>
                                                    {isInvalidDenom && (
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            Harus kelipatan Rp {formatNumber(String(min_cash_denomination))}
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
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest appearance-none"
                                            style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                        >
                                            {transactionTypes && transactionTypes.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {bkkBkmMode === 'manual' ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">No. BKM</label>
                                            <input
                                                type="text"
                                                value={data.no_bkm}
                                                onChange={e => setData('no_bkm', e.target.value.replace(/\D/g, ''))}
                                                maxLength={50}
                                                className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.no_bkm || bkmStatus === 'taken' || bkmStatus === 'error' ? 'border-red-500' : ''}`}
                                                placeholder="CONTOH: 001"
                                                required
                                                style={{ fontSize: '0.95rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
                                            />
                                            {bkmStatus === 'checking' && <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 ml-1">{bkmStatusMessage}</p>}
                                            {bkmStatus === 'taken' && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{bkmStatusMessage}</p>}
                                            {bkmStatus === 'error' && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{bkmStatusMessage}</p>}
                                            {errors.no_bkm && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1">{errors.no_bkm}</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">No. BKM</label>
                                            <div className="w-full px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-[10px] font-black text-emerald-700 uppercase tracking-widest">
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
                                            className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.tanggal_transaksi ? 'border-red-500' : ''}`}
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
                                        className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm min-h-[100px]"
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
                                        className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-sm uppercase tracking-widest ${errors.nama_petugas ? 'border-red-500' : ''}`}
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
                                        const isFormValid = !!(
                                            data.nomor_rekening &&
                                            data.jumlah &&
                                            amount > 0 &&
                                            data.nama_petugas &&
                                            (bkkBkmMode !== 'manual' || data.no_bkm) &&
                                            !isInvalidDenom &&
                                            (bkkBkmMode !== 'manual' || bkmStatus === 'available')
                                        );
                                        return (
                                            <button
                                                type="submit"
                                                disabled={processing || !isFormValid}
                                                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? (
                                                    <span className="inline-flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        Memproses...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {!isFormValid ? 'lengkapi semua data' : 'Proses Setoran'}
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

                {/* Info Column */}
                <div className="xl:col-span-5 space-y-6">
                    {nasabah ? (
                        <div className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/25 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Informasi Rekening Aktif</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-black mb-2 border border-white/20 overflow-hidden">
                                    {nasabah.user.profile_photo_url && !nasabah.user.profile_photo_url.includes('ui-avatars') ? (
                                        <img src={nasabah.user.profile_photo_url} alt={nasabah.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        nasabah.user.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <h3 className="text-base font-black tracking-tight">{nasabah.user.name}</h3>
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1 italic">{nasabah.nomor_rekening}</p>
                            </div>
                            <div className="space-y-2 relative z-10">
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Saldo Saat Ini</p>
                                    <p className="text-xl font-black text-emerald-300 tracking-tight">{formatRupiah(nasabah.saldo)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">No. Rekening</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{nasabah.nomor_rekening}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest flex items-center gap-2">{nasabah.status || '-'}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Tipe</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{nasabah.user.user_type}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Kelas</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">
                                            {formatRombelName(nasabah.rombel_rel || (nasabah as any).rombelRel)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-200 rounded-3xl bg-white/70">
                            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Nasabah Belum Dipilih</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2 leading-relaxed">Masukkan nomor rekening pada form pencarian di samping untuk memulai transaksi</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Setoran"
                message={`Anda akan memproses setoran sebesar ${formatRupiah(Number(data.jumlah))} ke rekening ${nasabah?.nomor_rekening}?`}
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
