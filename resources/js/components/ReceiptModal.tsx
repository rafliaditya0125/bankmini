import { useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { formatRupiah } from '@/lib/utils';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: {
        nomor_rekening?: string;
        nama?: string;
        jumlah: string;
        jenis: string;
        // For transfer
        nomor_rekening_pengirim?: string;
        nomor_rekening_penerima?: string;
        nama_pengirim?: string;
        nama_penerima?: string;
    } | null;
}

export default function ReceiptModal({ isOpen, onClose, transaction }: ReceiptModalProps) {
    const { props } = usePage<any>();
    const bankName = props.name || 'BANK MINI SMK';
    const receiptRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !transaction) return null;

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

    const jenisTransaksi = transaction.jenis?.trim() || 'Transaksi';
    const tujuanRekening = transaction.nomor_rekening_penerima
        ? `${transaction.nomor_rekening_penerima} (${transaction.nama_penerima || '-'})`
        : `${transaction.nomor_rekening || '-'} (${transaction.nama || '-'})`;

    const keterangan = transaction.nomor_rekening_penerima
        ? 'Dana sudah diteruskan ke rekening tujuan.'
        : transaction.jenis.toLowerCase().includes('setor')
            ? 'Saldo rekening bertambah sesuai nominal setoran.'
            : transaction.jenis.toLowerCase().includes('tarik')
                ? 'Saldo rekening berkurang sesuai nominal penarikan.'
                : 'Transaksi berhasil diproses.';

    const handlePrint = () => {
        if (receiptRef.current) {
            const printContent = receiptRef.current.innerHTML;
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Struk Transaksi</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                                font-family: 'Courier New', monospace;
                                padding: 20px;
                                background: white;
                                display: flex;
                                justify-content: center;
                            }
                            .receipt-container {
                                max-width: 380px;
                                margin: 0 auto;
                                background: white;
                                padding: 20px;
                            }
                            .receipt-header {
                                text-align: center;
                                border-bottom: 2px dashed #333;
                                padding-bottom: 15px;
                                margin-bottom: 20px;
                            }
                            .bank-name {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 5px;
                            }
                            .receipt-title {
                                font-size: 12px;
                                font-weight: bold;
                                text-transform: uppercase;
                            }
                            .receipt-body {
                                margin-bottom: 20px;
                            }
                            .receipt-row {
                                display: flex;
                                justify-content: space-between;
                                margin: 8px 0;
                                font-size: 12px;
                                padding: 3px 0;
                            }
                            .receipt-label {
                                font-weight: bold;
                                color: #333;
                            }
                            .receipt-value {
                                text-align: right;
                                font-weight: bold;
                                color: #333;
                                max-width: 200px;
                                word-wrap: break-word;
                            }
                            .amount-row {
                                border-top: 1px solid #333;
                                border-bottom: 1px solid #333;
                                padding: 10px 0;
                                margin: 15px 0;
                                font-size: 16px;
                                font-weight: bold;
                            }
                            .receipt-footer {
                                text-align: center;
                                border-top: 2px dashed #333;
                                padding-top: 15px;
                                font-size: 10px;
                                color: #666;
                            }
                            .success-text {
                                text-align: center;
                                margin: 10px 0;
                                font-weight: bold;
                                color: #333;
                                font-size: 12px;
                            }
                            @media print {
                                body { padding: 10px; }
                                @page { margin: 0.5cm; size: auto; }
                                .receipt-container {
                                    padding: 15px;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                            <div class="receipt-header">
                                <div class="bank-name">${bankName}</div>
                                <div class="receipt-title">Struk Transaksi</div>
                            </div>
                            
                            <div class="receipt-body">
                                <div class="receipt-row">
                                    <span class="receipt-label">Jenis Transaksi:</span>
                                    <span class="receipt-value">${transaction.jenis}</span>
                                </div>

                                ${transaction.nomor_rekening_pengirim && transaction.nomor_rekening_penerima ? `
                                    <div class="receipt-row">
                                        <span class="receipt-label">Dari Rekening:</span>
                                        <span class="receipt-value">${transaction.nomor_rekening_pengirim}</span>
                                    </div>
                                    <div class="receipt-row">
                                        <span class="receipt-label">Nama:</span>
                                        <span class="receipt-value">${transaction.nama_pengirim}</span>
                                    </div>
                                    <div class="receipt-row">
                                        <span class="receipt-label">Ke Rekening:</span>
                                        <span class="receipt-value">${transaction.nomor_rekening_penerima}</span>
                                    </div>
                                    <div class="receipt-row">
                                        <span class="receipt-label">Nama:</span>
                                        <span class="receipt-value">${transaction.nama_penerima}</span>
                                    </div>
                                ` : `
                                    <div class="receipt-row">
                                        <span class="receipt-label">No. Rekening:</span>
                                        <span class="receipt-value">${transaction.nomor_rekening}</span>
                                    </div>
                                    <div class="receipt-row">
                                        <span class="receipt-label">Nama Nasabah:</span>
                                        <span class="receipt-value">${transaction.nama}</span>
                                    </div>
                                `}

                                <div class="amount-row">
                                    <span class="receipt-label">JUMLAH:</span>
                                    <span class="receipt-value">${formatRupiah(transaction.jumlah)}</span>
                                </div>

                                <div class="success-text">*** TRANSAKSI BERHASIL ***</div>

                                <div class="receipt-row">
                                    <span class="receipt-label">Tanggal & Waktu:</span>
                                    <span class="receipt-value">${timestamp}</span>
                                </div>
                                <div class="receipt-row">
                                    <span class="receipt-label">Kode Transaksi:</span>
                                    <span class="receipt-value">TRX${Date.now().toString().slice(-8)}</span>
                                </div>
                            </div>

                            <div class="receipt-footer">
                                <div>Terima kasih atas kepercayaan Anda</div>
                                <div>Simpan struk ini sebagai bukti transaksi</div>
                                <div style="margin-top: 5px;">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
                            </div>
                        </div>
                        <script>
                            window.onload = () => {
                                window.print();
                                window.onafterprint = () => window.close();
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 transition-opacity bg-black/50 backdrop-blur-sm"></div>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                    <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full pointer-events-auto transform transition-all border border-gray-100 overflow-hidden">
                        {/* Modal Header */}
                        <div className="relative px-8 pt-10 pb-6 text-center">
                            {/* Receipt Icon */}
                            <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                            </div>
                            
                            {/* Title */}
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Struk Transaksi</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bankName}</p>
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

                        {/* Receipt Content */}
                        <div className="px-8 pb-8 space-y-6">
                            {/* Main Receipt Card */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm" ref={receiptRef}>
                                {/* Transaction Type */}
                                <div className="text-center mb-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Jenis Transaksi</p>
                                    <p className="text-xl font-black text-gray-900 uppercase tracking-tight">{transaction.jenis}</p>
                                </div>

                                {/* Account Info */}
                                {transaction.nomor_rekening_pengirim && transaction.nomor_rekening_penerima ? (
                                    <div className="space-y-4 mb-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Dari</p>
                                                <p className="text-[10px] font-mono font-black text-gray-900 truncate">{transaction.nomor_rekening_pengirim}</p>
                                                <p className="text-[9px] font-black text-blue-600 mt-1 truncate uppercase tracking-tight">{transaction.nama_pengirim}</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Ke</p>
                                                <p className="text-[10px] font-mono font-black text-gray-900 truncate">{transaction.nomor_rekening_penerima}</p>
                                                <p className="text-[9px] font-black text-emerald-600 mt-1 truncate uppercase tracking-tight">{transaction.nama_penerima}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</p>
                                                <p className="text-sm font-mono font-black text-gray-900 tracking-tighter">{transaction.nomor_rekening}</p>
                                                <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-tight">{transaction.nama}</p>
                                            </div>
                                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m3 0h6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Amount Display */}
                                <div className="text-center mb-6">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Jumlah Transaksi</p>
                                    <p className="text-3xl font-black text-blue-600 tracking-tighter">{formatRupiah(transaction.jumlah)}</p>
                                </div>

                                {/* Transaction Info */}
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-gray-400">Waktu Transaksi</span>
                                        <span className="text-gray-900 text-right">{timestamp}</span>
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
                                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-0.5">Transaksi Berhasil</p>
                                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-tight leading-relaxed">{keterangan}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-3.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Cetak Struk
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
