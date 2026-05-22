import { formatRupiah } from '@/lib/utils';

interface TransactionSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionType: 'setor' | 'tarik' | 'transfer';
    data: {
        nomor_rekening?: string;
        nama?: string;
        jumlah: string | number;
        // For transfer
        nomor_rekening_pengirim?: string;
        nomor_rekening_penerima?: string;
        nama_pengirim?: string;
        nama_penerima?: string;
    };
    onCetakStruk: () => void;
    onCetakBukuTabungan: () => void;
}

export default function TransactionSuccessModal({
    isOpen,
    onClose,
    transactionType,
    data,
    onCetakStruk,
    onCetakBukuTabungan
}: TransactionSuccessModalProps) {
    if (!isOpen) return null;

    const getTypeLabel = () => {
        switch (transactionType) {
            case 'setor': return 'Setoran Tunai';
            case 'tarik': return 'Penarikan Tunai';
            case 'transfer': return 'Transfer';
            default: return 'Transaksi';
        }
    };

    const getTypeIcon = () => {
        switch (transactionType) {
            case 'setor':
                return (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                );
            case 'tarik':
                return (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                );
            case 'transfer':
                return (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                );
        }
    };

    const formatDateTimeWIB = (date: Date) => {
        const tanggal = date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
        });
        const waktu = date
            .toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta',
            })
            .replace(/\./g, ':');

        return `${tanggal} • ${waktu} WIB`;
    };

    const timestamp = formatDateTimeWIB(new Date());

    const tujuanRekening = transactionType === 'transfer'
        ? `${data.nomor_rekening_penerima || '-'} (${data.nama_penerima || '-'})`
        : `${data.nomor_rekening || '-'} (${data.nama || '-'})`;

    const keterangan = transactionType === 'transfer'
        ? 'Dana sudah diteruskan ke rekening tujuan.'
        : transactionType === 'setor'
            ? 'Saldo rekening bertambah sesuai nominal setoran.'
            : 'Saldo rekening berkurang sesuai nominal penarikan.';

    return (
        <>
            <div className="fixed inset-0 z-40 transition-opacity bg-black/50 backdrop-blur-sm"></div>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                    <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-sm w-full pointer-events-auto transform transition-all border border-gray-100 overflow-hidden">
                        {/* Success Header */}
                        <div className="relative px-8 pt-10 pb-6 text-center">
                            {/* Success Icon Circle */}
                            <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            
                            {/* Success Message */}
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Transaksi Berhasil!</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{getTypeLabel()}</p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Tutup modal"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-8 pb-8 space-y-6">
                            {/* Main Transaction Card */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
                                {/* Amount Display */}
                                <div className="text-center mb-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nominal {transactionType === 'setor' ? 'Setoran' : transactionType === 'tarik' ? 'Penarikan' : 'Transfer'}</p>
                                    <p className="text-3xl font-black text-blue-600 tracking-tighter">{formatRupiah(data.jumlah)}</p>
                                </div>

                                {/* Transaction Details */}
                                {transactionType === 'transfer' ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Dari</p>
                                                <p className="text-[10px] font-mono font-black text-gray-900 truncate">{data.nomor_rekening_pengirim}</p>
                                                <p className="text-[9px] font-black text-blue-600 mt-1 truncate uppercase tracking-tight">{data.nama_pengirim}</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Ke</p>
                                                <p className="text-[10px] font-mono font-black text-gray-900 truncate">{data.nomor_rekening_penerima}</p>
                                                <p className="text-[9px] font-black text-emerald-600 mt-1 truncate uppercase tracking-tight">{data.nama_penerima}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Rekening Tujuan</p>
                                                <p className="text-xs font-mono font-black text-gray-900 truncate tracking-tighter">{data.nomor_rekening}</p>
                                                <p className="text-[10px] font-black text-blue-600 mt-1 truncate uppercase tracking-tight">{data.nama}</p>
                                            </div>
                                            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                                {getTypeIcon()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Transaction Info */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-gray-400">Waktu</span>
                                        <span className="text-gray-900">{timestamp}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Message */}
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-0.5">Konfirmasi Sistem</p>
                                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-tight leading-relaxed">{keterangan}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={onCetakStruk}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-3.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-200"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Cetak Struk
                                </button>
                                <button
                                    onClick={onCetakBukuTabungan}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-3.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-200"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Buku Tabungan
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                                >
                                    Selesai
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
