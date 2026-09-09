import { useEffect, useState, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatRupiah, formatNumber, parseNumber, formatRombelName } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import Receipt from '@/components/Receipt';
import FlashMessage from '@/components/FlashMessage';
import NasabahSearchBox from '@/components/NasabahSearchBox';
import type { Nasabah, User, WalletType, Wallet } from '@/types';

interface PageProps {
    pengirim: (Nasabah & { user: User; wallets?: (Wallet & { wallet_type?: WalletType })[] }) | null;
    kantongList: WalletType[];
    metodeList: { value: string; label: string }[];
    pembayaranAccounts: (Nasabah & { user: User })[];
    auth: { user: User };
    minBayar: number;
}

export default function Bayar({
    pengirim,
    kantongList = [],
    metodeList = [],
    pembayaranAccounts = [],
    minBayar = 1000,
}: PageProps) {
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
        wallet_type_id: '',
        penerima_rekening: '',
        metode_pembayaran: metodeList.length > 0 ? metodeList[0].value : 'tunai',
        jumlah: '',
        keterangan: '',
        nama_petugas: auth.user.name || '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
    });

    // Auto-select wallet from URL query param if present
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedWallet = urlParams.get('wallet_type_id');
        if (preselectedWallet && kantongList.some((k) => String(k.id) === preselectedWallet)) {
            setData('wallet_type_id', preselectedWallet);
        } else if (kantongList.length > 0 && !data.wallet_type_id) {
            setData('wallet_type_id', String(kantongList[0].id));
        }
    }, [kantongList]);

    const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplayJumlah(formatted);
        setData('jumlah', String(parseNumber(formatted)));
    };

    // Sync displayJumlah when data.jumlah changes
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
        const queryParams: any = { pengirim_rekening: rekening };
        if (data.wallet_type_id) {
            queryParams.wallet_type_id = data.wallet_type_id;
        }
        router.get(`/${rolePrefix}/bayar`, queryParams, {
            preserveState: true,
            replace: true,
        });
    };

    // Debounced search for account number / student
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchAccount && searchAccount.length >= 6) {
            searchTimeout.current = setTimeout(() => {
                handleSearch(searchAccount);
            }, 500);
        }
    }, [searchAccount]);

    const selectedKantong = kantongList.find((k) => String(k.id) === String(data.wallet_type_id));
    const existingWallet = pengirim?.wallets?.find((w) => String(w.wallet_type_id) === String(data.wallet_type_id));
    const saldoKantongSaatIni = existingWallet ? Number(existingWallet.balance) : 0;
    const targetAmount = selectedKantong?.target_amount ? Number(selectedKantong.target_amount) : null;
    const sisaTagihan = targetAmount !== null ? Math.max(0, targetAmount - saldoKantongSaatIni) : null;

    const amount = Number(data.jumlah);
    const isPotongTabungan = data.metode_pembayaran === 'potong_tabungan';
    const isInsufficientBalance = isPotongTabungan && amount > (pengirim?.saldo || 0);

    const isFormValid = Boolean(
        (data.wallet_type_id || data.penerima_rekening) &&
        data.jumlah &&
        amount >= minBayar &&
        data.nama_petugas &&
        data.tanggal_transaksi &&
        !isInsufficientBalance
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmit = () => {
        setShowConfirmModal(false);
        post(`/${rolePrefix}/bayar`, {
            preserveScroll: true,
            onSuccess: () => {
                // Handled via flash.transaction useEffect
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
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">
                                Multi-Wallet System
                            </p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">
                                Transaksi Pembayaran
                            </h1>
                            <p className="mt-2 text-sm text-indigo-100/80 max-w-xl">
                                Setor pembayaran tagihan ke pos kantong khusus siswa (Kopsis, Seragam, Buku, dll.).
                            </p>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Pembayaran Kantong" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-12">
                    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-xs">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                            Cari Rekening Nasabah Pembayar
                        </h2>
                        <div className="w-full">
                            <NasabahSearchBox
                                value={searchAccount}
                                onChange={setSearchAccount}
                                onSelect={handleSearch}
                                placeholder="Ketik nama, NIS, atau nomor rekening siswa..."
                            />
                        </div>
                    </div>
                </div>

                {pengirim && (
                    <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Form Pembayaran */}
                        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 md:p-8 shadow-xs space-y-6">
                            <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Formulir Pembayaran Kantong
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Pilih pos kantong dan metode pembayaran yang digunakan siswa.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Kantong Pembayaran Tujuan */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                        Kantong Pembayaran Tujuan <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.wallet_type_id}
                                        onChange={(e) => setData('wallet_type_id', e.target.value)}
                                        required
                                        className={`w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all font-bold text-sm h-12 uppercase ${
                                            errors.wallet_type_id ? 'border-red-500' : ''
                                        }`}
                                    >
                                        <option value="">-- PILIH KANTONG PEMBAYARAN --</option>
                                        {kantongList.map((k) => (
                                            <option key={k.id} value={k.id}>
                                                {k.name} {k.target_amount ? `(Target: ${formatRupiah(k.target_amount)})` : '(Fleksibel)'}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.wallet_type_id && (
                                        <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">
                                            {errors.wallet_type_id}
                                        </p>
                                    )}

                                    {/* Info status tagihan kantong yang dipilih */}
                                    {selectedKantong && (
                                        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-600">Target Tagihan:</span>
                                                <span className="font-bold text-slate-900">
                                                    {targetAmount ? formatRupiah(targetAmount) : 'Bebas / Fleksibel'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-600">Sudah Dibayar Saat Ini:</span>
                                                <span className="font-bold text-emerald-600">
                                                    {formatRupiah(saldoKantongSaatIni)}
                                                </span>
                                            </div>
                                            {targetAmount !== null && (
                                                <div className="flex items-center justify-between text-xs pt-2 border-t border-indigo-100/60">
                                                    <span className="font-semibold text-slate-600">Sisa Tagihan:</span>
                                                    <span className={`font-black ${sisaTagihan === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {sisaTagihan === 0 ? 'LUNAS (Rp 0)' : formatRupiah(sisaTagihan)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Quick Pay Remaining Button */}
                                            {sisaTagihan !== null && sisaTagihan > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const formatted = formatNumber(String(sisaTagihan));
                                                        setDisplayJumlah(formatted);
                                                        setData('jumlah', String(sisaTagihan));
                                                    }}
                                                    className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Bayar Langsung Sisa Tagihan ({formatRupiah(sisaTagihan)})
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Metode Pembayaran */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                        Metode Pembayaran <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.metode_pembayaran}
                                        onChange={(e) => setData('metode_pembayaran', e.target.value)}
                                        required
                                        className={`w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all font-bold text-sm h-12 uppercase ${
                                            errors.metode_pembayaran ? 'border-red-500' : ''
                                        }`}
                                    >
                                        {metodeList.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label} {m.value === 'potong_tabungan' ? '(AUTO-DEBIT)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {data.metode_pembayaran === 'potong_tabungan' && (
                                        <p className="text-[10px] text-indigo-600 font-semibold mt-1 ml-1 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Saldo akan dipotong otomatis dari Saldo Tabungan Utama nasabah.
                                        </p>
                                    )}
                                    {errors.metode_pembayaran && (
                                        <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">
                                            {errors.metode_pembayaran}
                                        </p>
                                    )}
                                </div>

                                {/* Jumlah Bayar */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                        Jumlah Bayar (Rp) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black uppercase tracking-widest text-xs">
                                            Rp
                                        </span>
                                        <input
                                            type="text"
                                            value={displayJumlah}
                                            onChange={handleJumlahChange}
                                            className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-xl text-indigo-600 ${
                                                errors.jumlah || isInsufficientBalance ? 'border-red-500' : ''
                                            }`}
                                            placeholder="0"
                                            required
                                        />
                                    </div>

                                    {/* Preset amounts */}
                                    <div className="flex flex-wrap gap-2">
                                        {[25000, 50000, 100000, 150000, 200000].map((quickAmount) => (
                                            <button
                                                key={quickAmount}
                                                type="button"
                                                onClick={() => {
                                                    const formatted = formatNumber(String(quickAmount));
                                                    setDisplayJumlah(formatted);
                                                    setData('jumlah', String(quickAmount));
                                                }}
                                                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                                            >
                                                {formatRupiah(quickAmount)}
                                            </button>
                                        ))}
                                    </div>

                                    {isInsufficientBalance && (
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Saldo tabungan utama tidak mencukupi untuk Potong Tabungan (Tersedia: {formatRupiah(pengirim.saldo)})
                                        </p>
                                    )}
                                    {errors.jumlah && (
                                        <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">
                                            {errors.jumlah}
                                        </p>
                                    )}
                                </div>

                                {/* Keterangan */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end ml-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            Keterangan / Berita Pembayaran
                                        </label>
                                        <span className="text-[9px] font-bold text-gray-400">
                                            {data.keterangan.length} / 255
                                        </span>
                                    </div>
                                    <textarea
                                        value={data.keterangan}
                                        onChange={(e) => setData('keterangan', e.target.value)}
                                        maxLength={255}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-sm"
                                        placeholder="Contoh: Cicilan seragam ke-1..."
                                        rows={2}
                                    />
                                    {errors.keterangan && (
                                        <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">
                                            {errors.keterangan}
                                        </p>
                                    )}
                                </div>

                                {/* Petugas & Tanggal */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Nama Petugas
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nama_petugas}
                                            onChange={(e) => setData('nama_petugas', e.target.value)}
                                            maxLength={255}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-xs uppercase"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Tanggal Transaksi
                                        </label>
                                        <input
                                            type="date"
                                            value={data.tanggal_transaksi}
                                            onChange={(e) => setData('tanggal_transaksi', e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-xs uppercase"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing || !isFormValid}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {isInsufficientBalance
                                                ? 'Saldo Tabungan Tidak Mencukupi'
                                                : !isFormValid
                                                ? 'Lengkapi Formulir Pembayaran'
                                                : `Konfirmasi Bayar (${formatRupiah(amount || 0)})`}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Right: Data Nasabah & Kantong Overview */}
                        <div className="flex flex-col gap-6 flex-1">
                            {/* Card Nasabah */}
                            <div className="rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 w-full space-y-4">
                                <h2 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                                    Data Pembayar (Siswa / Nasabah)
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black border border-white/20 overflow-hidden">
                                        {pengirim.user.profile_photo_url && !pengirim.user.profile_photo_url.includes('ui-avatars') ? (
                                            <img src={pengirim.user.profile_photo_url} alt={pengirim.user.name} className="h-full w-full object-cover" />
                                        ) : (
                                            pengirim.user.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold leading-tight">{pengirim.user.name}</h3>
                                        <p className="text-xs font-mono font-bold text-indigo-300">
                                            {pengirim.nomor_rekening} {pengirim.user.nis && `| NIS: ${pengirim.user.nis}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-bold text-indigo-200 uppercase">Kelas / Rombel</p>
                                        <p className="text-xs font-bold text-white uppercase mt-0.5">
                                            {formatRombelName(pengirim.rombel_rel || (pengirim as any).rombelRel) || '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-bold text-indigo-200 uppercase">Status Rekening</p>
                                        <p className="text-xs font-bold text-emerald-400 uppercase mt-0.5">
                                            {pengirim.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
                                    <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                                        Saldo Tabungan Utama
                                    </span>
                                    <p className="text-xl font-black text-white mt-1">
                                        {formatRupiah(pengirim.saldo)}
                                    </p>
                                    <p className="text-[10px] text-indigo-200/70 mt-1">
                                        Sumber dana jika memilih metode &quot;Potong Tabungan&quot;
                                    </p>
                                </div>
                            </div>

                            {/* Card Daftar Saldo Kantong Siswa Ini */}
                            {pengirim.wallets && pengirim.wallets.length > 0 && (
                                <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-xs">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                                        Ringkasan Saldo Kantong Siswa Ini
                                    </h3>
                                    <div className="space-y-3">
                                        {pengirim.wallets
                                            .filter((w) => w.wallet_type?.category === 'pembayaran')
                                            .map((wallet) => (
                                                <div
                                                    key={wallet.id}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">
                                                            {wallet.wallet_type?.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {wallet.wallet_type?.target_amount
                                                                ? `Target: ${formatRupiah(wallet.wallet_type.target_amount)}`
                                                                : 'Target: Fleksibel'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-indigo-700">
                                                            {formatRupiah(wallet.balance)}
                                                        </p>
                                                        {wallet.wallet_type?.target_amount && (
                                                            <span className={`text-[9px] font-bold ${
                                                                wallet.balance >= wallet.wallet_type.target_amount
                                                                    ? 'text-emerald-600'
                                                                    : 'text-amber-600'
                                                            }`}>
                                                                {wallet.balance >= wallet.wallet_type.target_amount
                                                                    ? 'Lunas'
                                                                    : `Sisa ${formatRupiah(Math.max(0, wallet.wallet_type.target_amount - wallet.balance))}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Pembayaran"
                message={`Lakukan pembayaran sebesar ${formatRupiah(Number(data.jumlah))} untuk kantong "${
                    selectedKantong?.name || 'Pembayaran'
                }" via metode "${data.metode_pembayaran.toUpperCase()}"?`}
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
