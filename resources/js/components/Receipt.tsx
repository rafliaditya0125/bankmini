import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { isSupported as isWebUSBSupported, printToPassbook, type PassbookTransaction } from '@/lib/passbookPrinter';

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
    const { bank_city } = usePage<any>().props;
    const [passbookStatus, setPassbookStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
    const [passbookError, setPassbookError] = useState<string | null>(null);

    if (!transaction) return null;

    const normalized: ReceiptData = {
        kode_transaksi: transaction.kode_transaksi,
        no_urut: transaction.no_urut || '-',
        tanggal: transaction.tanggal || (transaction.created_at
            ? new Date(transaction.created_at).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')
            : '- -'),
        jumlah: transaction.jumlah,
        jenis_transaksi: transaction.jenis_transaksi,
        nasabah_name: transaction.jenis_transaksi === 'transfer'
            ? ((transaction as any).pengirim_name || (transaction as any).nasabah?.user?.name || transaction.nasabah_name || '-')
            : (transaction.nasabah_name || (transaction as any).nasabah?.user?.name || '-'),
        nasabah_norek: transaction.jenis_transaksi === 'transfer'
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

    return (
        <div>
            <div id="receipt-print" className="bg-white p-6 space-y-4 font-mono text-[10px] text-gray-800 border border-gray-100 shadow-sm leading-tight">
                {/* Logo header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                    <div className="flex flex-col">
                        <span className="font-black text-lg tracking-tighter uppercase">{name}</span>
                        <span className="text-[8px] font-bold">TRANSAKSI {getTransactionActionLabel(normalized.jenis_transaksi)}</span>
                    </div>
                    <div className="text-right uppercase">
                        <p>{tanggalParts[0]}</p>
                        <p>{tanggalParts[1]}</p>
                        <p>{bank_city}</p>
                    </div>
                </div>

                <div className="space-y-1 uppercase">
                    <div className="flex">
                        <span className="w-24">NO URUT</span>
                        <span>: {normalized.no_urut}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24">JENIS TRANS</span>
                        <span>: {getTransactionTypeLabel(normalized.jenis_transaksi, normalized.sub_jenis_transaksi)}</span>
                    </div>
                    {normalized.jenis_transaksi !== 'transfer' && (
                        <div className="flex">
                            <span className="w-24">PEMBAYARAN</span>
                            <span className="uppercase">: {normalized.sub_jenis_transaksi}</span>
                        </div>
                    )}
                    <div className="font-bold">{getTransactionActionLabel(normalized.jenis_transaksi)}</div>
                    <div className="flex justify-between font-bold border-b border-gray-100 pb-2 mb-2">
                        <span>{getJumlahLabel(normalized.jenis_transaksi)}</span>
                        <span>{Number(normalized.jumlah).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex">
                        <span className="w-24">{normalized.jenis_transaksi === 'transfer' ? 'PENGIRIM' : 'NOREK'}</span>
                        <span>: {normalized.nasabah_norek}</span>
                    </div>
                    <div className="flex">
                        <span className="w-24">NAMA</span>
                        <span>: {normalized.nasabah_name}</span>
                    </div>
                    {normalized.jenis_transaksi === 'transfer' && normalized.penerima_norek && (
                        <>
                            <div className="flex">
                                <span className="w-24">PENERIMA</span>
                                <span>: {normalized.penerima_norek}</span>
                            </div>
                            <div className="flex">
                                <span className="w-24">NAMA</span>
                                <span>: {normalized.penerima_name}</span>
                            </div>
                        </>
                    )}
                    <div className="flex">
                        <span className="w-24">
                            No. Bukti
                        </span>
                        <span>: {normalized.kode_transaksi}</span>
                    </div>
                    {normalized.petugas && (
                        <div className="flex">
                            <span className="w-24 uppercase">PETUGAS</span>
                            <span className="uppercase">: {normalized.petugas}</span>
                        </div>
                    )}
                </div>

                <div className="pt-8 text-center text-[9px] font-bold border-t border-gray-100 mt-4">
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
