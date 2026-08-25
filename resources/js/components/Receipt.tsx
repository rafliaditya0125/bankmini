import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { isSupported as isWebUSBSupported, printToPassbook, type PassbookTransaction } from '@/lib/passbookPrinter';
import { formatRombelName } from '@/lib/utils';

interface ReceiptData {
    kode_transaksi: string;
    no_urut: number | string;
    tanggal: string;
    jumlah: string | number;
    jenis_transaksi: string;
    nasabah_name: string;
    nasabah_norek: string;
    penerima_name?: string;
    penerima_norek?: string;
    saldo_sebelum?: number | string;
    saldo_sesudah?: number | string;
    petugas?: string;
    sub_jenis_transaksi?: string;
}

interface ReceiptProps {
    name: string;
    transaction: ReceiptData | null;
    showPrint?: boolean;
    showPassbookPrint?: boolean;
    onPrint?: () => void;
    onClose?: () => void;
}

export default function Receipt({ name, transaction, showPrint = true, showPassbookPrint = false, onPrint, onClose }: ReceiptProps) {
    const { school_name, bank_city, bank_address, bank_phone } = usePage<any>().props;
    const [passbookStatus, setPassbookStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
    const [passbookError, setPassbookError] = useState<string | null>(null);

    if (!transaction) return null;

    // Check if this is an incoming payment (penerima view)
    const isIncomingPayment = (transaction as any).is_incoming_payment || false;

    const normalized: ReceiptData = {
        kode_transaksi: transaction.kode_transaksi,
        no_urut: transaction.no_urut || transaction.id || '-',
        tanggal: transaction.tanggal || transaction.created_at || new Date().toISOString(),
        jumlah: transaction.jumlah,
        jenis_transaksi: (transaction as any).is_incoming_payment ? 'terima_bayar' : transaction.jenis_transaksi,
        nasabah_name: (transaction.jenis_transaksi === 'transfer')
            ? ((transaction as any).pengirim_name || (transaction as any).nasabah?.user?.name || transaction.nasabah_name || '-')
            : (transaction.nasabah_name || (transaction as any).nasabah?.user?.name || '-'),
        nasabah_norek: (transaction.jenis_transaksi === 'transfer')
            ? ((transaction as any).pengirim_norek || (transaction as any).nasabah?.nomor_rekening || transaction.nasabah_norek || '-')
            : (transaction.nasabah_norek || (transaction as any).nasabah?.nomor_rekening || '-'),
        penerima_name: (transaction as any).penerima_name || (transaction as any).nasabah_tujuan?.user?.name || (transaction as any).penerima?.user?.name || (transaction as any).nasabah_tujuan_name || '',
        penerima_norek: (transaction as any).penerima_norek || (transaction as any).nasabah_tujuan?.nomor_rekening || (transaction as any).penerima?.nomor_rekening || (transaction as any).nasabah_tujuan_norek || '',
        saldo_sebelum: transaction.saldo_sebelum,
        saldo_sesudah: transaction.saldo_sesudah,
        petugas: (transaction as any).petugas_nama || (transaction as any).nama_petugas || (transaction as any).petugas || (transaction as any).petugas?.name || '-',
        sub_jenis_transaksi: transaction.sub_jenis_transaksi || (transaction as any).sub_jenis_transaksi || 'TUNAI',
    };

    const getTransactionTypeLabel = (type: string, subType?: string) => {
        if (!type) return 'TRANSAKSI';
        let label = '';
        switch (type.toLowerCase()) {
            case 'setor': label = 'SETOR TUNAI'; break;
            case 'tarik': label = 'PENARIKAN TUNAI'; break;
            case 'transfer': label = 'TRANSFER DANA'; break;
            case 'bayar': label = 'PEMBAYARAN'; break;
            case 'terima_bayar': label = 'PENERIMAAN PEMBAYARAN'; break;
            case 'bunga': label = 'BUNGA TABUNGAN'; break;
            case 'biaya_admin': label = 'BIAYA ADMIN'; break;
            default: label = type.toUpperCase().replace('_', ' ');
        }

        if (subType && subType.toLowerCase() !== 'tunai' && subType.toLowerCase() !== type.toLowerCase()) {
            return `${label} (${subType.toUpperCase()})`;
        }
        return label;
    };

    const getTransactionActionLabel = (type: string) => {
        if (!type) return 'TRANSAKSI';
        switch (type.toLowerCase()) {
            case 'setor': return 'SETORAN';
            case 'tarik': return 'PENARIKAN';
            case 'transfer': return 'TRANSFER';
            case 'bayar': return 'PEMBAYARAN';
            case 'terima_bayar': return 'PENERIMAAN';
            case 'bunga': return 'BUNGA';
            case 'biaya_admin': return 'BIAYA ADMIN';
            default: return type.toUpperCase().replace('_', ' ');
        }
    };

    const getJumlahLabel = (type: string) => {
        if (!type) return 'JUMLAH:RP';
        switch (type.toLowerCase()) {
            case 'setor': return 'JUMLAH SETOR:RP';
            case 'tarik': return 'JUMLAH TARIK:RP';
            case 'transfer': return 'JUMLAH TRF:RP';
            case 'bayar': return 'JUMLAH BAYAR:RP';
            case 'terima_bayar': return 'JUMLAH TERIMA:RP';
            case 'bunga': return 'JUMLAH BUNGA:RP';
            case 'biaya_admin': return 'JUMLAH BIAYA:RP';
            default: return 'JUMLAH:RP';
        }
    };

    const handlePrintPassbook = async () => {
        setPassbookStatus('printing');
        setPassbookError(null);
        try {
            const passbookData: PassbookTransaction = {
                tanggal: normalized.tanggal,
                kode_transaksi: normalized.kode_transaksi,
                jenis_transaksi: normalized.jenis_transaksi,
                jumlah: normalized.jumlah,
                saldo_sesudah: normalized.saldo_sesudah || 0,
                keterangan: normalized.kode_transaksi,
                petugas: normalized.petugas,
            };
            await printToPassbook(passbookData);
            setPassbookStatus('success');
            setTimeout(() => setPassbookStatus('idle'), 3000);
        } catch (error: any) {
            setPassbookStatus('error');
            setPassbookError(error.message || 'Gagal mencetak ke buku tabungan');
            setTimeout(() => {
                setPassbookStatus('idle');
                setPassbookError(null);
            }, 5000);
        }
    };

    const canShowPassbook = showPassbookPrint && isWebUSBSupported();

    // Helper to safely split date and time
    const tanggalParts = normalized.tanggal.includes(' ')
        ? normalized.tanggal.split(' ')
        : [normalized.tanggal, ''];

    // Format tanggal: DD/MM/YYYY HH:MM:SS
    const formatTanggal = (tanggal: string) => {
        if (!tanggal) return '-';
        
        try {
            // Parse tanggal dari format Y-m-d H:i:s atau ISO string
            const date = new Date(tanggal);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return tanggal; // Return original if cannot parse
            }
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            return tanggal;
        }
    };

    // Helper untuk mengambil kelas nasabah
    const getKelasNasabah = () => {
        const nasabah = (transaction as any).nasabah;
        if (!nasabah) return '-';
        
        // Jika ada rombel_rel
        if (nasabah.rombel_rel || nasabah.rombelRel) {
            return formatRombelName(nasabah.rombel_rel || nasabah.rombelRel);
        }
        
        // Jika user_type ada, tampilkan
        if (nasabah.user?.user_type) {
            return nasabah.user.user_type.toUpperCase();
        }
        
        return '-';
    };

    // Helper untuk konversi angka ke terbilang
    const numberToWords = (num: number): string => {
        const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
        const teens = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
        const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh', 'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];
        
        if (num === 0) return 'Nol';
        
        const convertHundreds = (n: number): string => {
            if (n === 0) return '';
            if (n < 10) return ones[n];
            if (n >= 10 && n < 20) return teens[n - 10];
            if (n < 100) {
                const ten = Math.floor(n / 10);
                const one = n % 10;
                return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
            }
            const hundred = Math.floor(n / 100);
            const rest = n % 100;
            return (hundred === 1 ? 'Seratus' : ones[hundred] + ' Ratus') + (rest > 0 ? ' ' + convertHundreds(rest) : '');
        };
        
        if (num < 1000) return convertHundreds(num);
        if (num < 1000000) {
            const thousand = Math.floor(num / 1000);
            const rest = num % 1000;
            return (thousand === 1 ? 'Seribu' : convertHundreds(thousand) + ' Ribu') + (rest > 0 ? ' ' + convertHundreds(rest) : '');
        }
        if (num < 1000000000) {
            const million = Math.floor(num / 1000000);
            const rest = num % 1000000;
            return convertHundreds(million) + ' Juta' + (rest > 0 ? ' ' + numberToWords(rest) : '');
        }
        return 'Terlalu Besar';
    };

    // Determine transaction type for header (SETOR/TARIK/TRANSFER/BAYAR)
    const getTransactionHeader = (type: string) => {
        if (!type) return 'TRANSAKSI';
        switch (type.toLowerCase()) {
            case 'setor': 
                return 'TRANSAKSI SETOR';
            case 'tarik': 
                return 'TRANSAKSI TARIK';
            case 'transfer':
                return 'TRANSAKSI TRANSFER';
            case 'bayar':
                return 'TRANSAKSI BAYAR';
            case 'terima_bayar':
                return 'TRANSAKSI PENERIMAAN';
            case 'bunga':
                return 'TRANSAKSI BUNGA';
            case 'biaya_admin':
                return 'TRANSAKSI BIAYA ADMIN';
            default: 
                return 'TRANSAKSI';
        }
    };

    // Format nominal dengan pemisah ribuan titik dan desimal koma
    const formatNominal = (value: number | string): string => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\./g, ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    };

    return (
        <div>
            <div id="receipt-print" className="bg-white p-6 space-y-3 font-mono text-[11px] text-gray-800 border border-gray-100 shadow-sm leading-tight">
                {/* Header Bank */}
                <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                    <div className="font-black text-base tracking-tight uppercase">{name}</div>
                    <div className="text-[10px] font-bold uppercase mt-0.5">{school_name || 'SMK NEGERI 1 CIAMIS'}</div>
                    <div className="text-[10px] font-bold uppercase">{bank_city?.toUpperCase() || 'CIAMIS'}</div>
                    {bank_address && (
                        <div className="text-[9px] font-bold mt-0.5">{bank_address}</div>
                    )}
                    <div className="text-[10px] font-bold">{bank_phone || '(0265) 771204'}</div>
                </div>

                {/* Date and horizontal line */}
                <div className="text-center border-b border-gray-300 pb-1 mb-2">
                    <div className="text-[9px] font-bold">
                        {formatTanggal(normalized.tanggal || new Date().toISOString())}
                    </div>
                </div>

                {/* Transaction Type */}
                <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-3">
                    <div className="font-black text-sm uppercase tracking-wide">
                        {getTransactionHeader(normalized.jenis_transaksi)}
                    </div>
                </div>

                {/* Nasabah Info */}
                <div className="space-y-0.5 border-b border-dashed border-gray-300 pb-3 mb-3">
                    <div className="flex">
                        <span className="w-24 font-bold">Rekening</span>
                        <span>: {normalized.nasabah_norek}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">Nama</span>
                        <span>: {normalized.nasabah_name.toUpperCase()}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">Kelas</span>
                        <span>: {getKelasNasabah()}</span>
                    </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-0.5">
                    <div className="flex">
                        <span className="w-24 font-bold">No. Trans</span>
                        <span>: {normalized.no_urut}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">No BKK/BKM</span>
                        <span>: {normalized.kode_transaksi}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">Jenis Trans</span>
                        <span>: {getTransactionTypeLabel(normalized.jenis_transaksi, normalized.sub_jenis_transaksi).toUpperCase()}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">Nominal</span>
                        <span>: Rp {formatNominal(normalized.jumlah)}</span>
                    </div>
                    {/* Terbilang */}
                    <div className="pl-24 text-[9px] italic">
                        {numberToWords(Math.floor(Number(normalized.jumlah)))} Rupiah
                    </div>
                    <div className="flex mt-1">
                        <span className="w-24 font-bold">Saldo Awal</span>
                        <span>: Rp {formatNominal(normalized.saldo_sebelum || 0)}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24 font-bold">Saldo sekarang</span>
                        <span>: Rp {formatNominal(normalized.saldo_sesudah || 0)}</span>
                    </div>
                    {normalized.petugas && (
                        <div className="flex">
                            <span className="w-24 font-bold">Petugas</span>
                            <span>: {normalized.petugas.toUpperCase()}</span>
                        </div>
                    )}
                </div>

                {/* Penerima Info (untuk transfer/bayar) */}
                {(normalized.jenis_transaksi === 'transfer' || normalized.jenis_transaksi === 'bayar') && normalized.penerima_name && (
                    <div className="space-y-0.5 border-t border-dashed border-gray-300 pt-3 mt-3">
                        <div className="font-bold text-[10px] mb-1">
                            {normalized.jenis_transaksi === 'bayar' ? 'JENIS PEMBAYARAN:' : 'PENERIMA:'}
                        </div>
                        {normalized.jenis_transaksi === 'transfer' && (
                            <div className="flex">
                                <span className="w-24 font-bold">Rekening</span>
                                <span>: {normalized.penerima_norek}</span>
                            </div>
                        )}
                        <div className="flex">
                            <span className="w-24 font-bold">Nama</span>
                            <span>: {normalized.penerima_name.toUpperCase()}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-3 text-center text-[9px] font-bold border-t border-gray-300 mt-4">
                    STRUK INI ADALAH BUKTI<br />TRANSAKSI YANG SAH
                </div>
            </div>
            <div className={`mt-8 grid grid-cols-1 ${canShowPassbook ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 no-print px-6 pb-6`}>
                {showPrint ? (
                    <button
                        onClick={onPrint || (() => window.print())}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak Struk
                    </button>
                ) : (
                    <button
                        onClick={() => window.print()}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Simpan PDF
                    </button>
                )}

                {canShowPassbook && (
                    <button
                        onClick={handlePrintPassbook}
                        disabled={passbookStatus === 'printing'}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${passbookStatus === 'success'
                            ? 'bg-emerald-600 text-white'
                            : passbookStatus === 'error'
                                ? 'bg-rose-600 text-white'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                            }`}
                    >
                        {passbookStatus === 'printing' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Mencetak...
                            </>
                        ) : passbookStatus === 'success' ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Berhasil!
                            </>
                        ) : passbookStatus === 'error' ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Gagal
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Cetak Buku
                            </>
                        )}
                    </button>
                )}

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                    Tutup
                </button>
            </div>

            {/* Passbook error or help message */}
            {passbookError && (
                <div className="mx-6 mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{passbookError}</p>
                </div>
            )}

            {showPassbookPrint && (
                <div className="mx-6 mb-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em] mb-1">Informasi Cetak Buku</p>
                            <p className="text-[9px] font-bold text-slate-700 leading-relaxed uppercase">
                                Pastikan aplikasi <b>Passbook Bridge</b> sudah aktif di komputer teller (localhost:3001) untuk mencetak langsung ke printer dot-matrix.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
