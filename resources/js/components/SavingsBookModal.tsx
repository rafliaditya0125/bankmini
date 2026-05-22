import { useRef } from 'react';
import { formatRupiah } from '@/lib/utils';

interface SavingsBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: {
        nomor_rekening?: string;
        nama?: string;
        jumlah: string;
        jenis: string;
        saldo?: string;
        // For transfer - show sender's record
        nomor_rekening_pengirim?: string;
        nama_pengirim?: string;
    } | null;
}

export default function SavingsBookModal({ isOpen, onClose, transaction }: SavingsBookModalProps) {
    const bookRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !transaction) return null;

    const handlePrint = () => {
        if (bookRef.current) {
            const printContent = bookRef.current.innerHTML;
            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Cetak Buku Tabungan</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                background: white;
                            }
                            .book-container {
                                max-width: 800px;
                                margin: 0 auto;
                                background: white;
                            }
                            .book-header {
                                text-align: center;
                                margin-bottom: 20px;
                                padding-bottom: 15px;
                                border-bottom: 3px solid #000;
                            }
                            .bank-name {
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 5px;
                            }
                            .book-title {
                                font-size: 16px;
                                font-weight: bold;
                                color: #333;
                            }
                            .account-info {
                                margin: 20px 0;
                                padding: 15px;
                                background: #f8f9fa;
                                border-radius: 8px;
                            }
                            .info-row {
                                display: flex;
                                margin: 8px 0;
                            }
                            .info-label {
                                font-weight: bold;
                                width: 150px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #000;
                                padding: 10px;
                                text-align: left;
                            }
                            th {
                                background-color: #e9ecef;
                                font-weight: bold;
                                text-align: center;
                            }
                            td {
                                font-size: 13px;
                            }
                            .text-right {
                                text-align: right;
                            }
                            .text-center {
                                text-align: center;
                            }
                            @media print {
                                body { padding: 10px; }
                                @page { margin: 1cm; }
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent}
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

    const isDebit = transaction.jenis.toLowerCase().includes('tarik');
    const isCredit = transaction.jenis.toLowerCase().includes('setor');

    return (
        <>
            <div className="fixed inset-0 z-40 transition-opacity bg-black/50 backdrop-blur-sm"></div>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                    <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-lg w-full pointer-events-auto transform transition-all border border-gray-100 overflow-hidden">
                        {/* Modal Header */}
                        <div className="relative px-8 pt-10 pb-6 text-center">
                            {/* Book Icon */}
                            <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            
                            {/* Title */}
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Buku Tabungan</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Mini SMK</p>
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

                        {/* Book Content */}
                        <div className="px-8 pb-8 space-y-6">
                            {/* Main Book Card */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm" ref={bookRef}>
                                {/* Book Header */}
                                <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">BUKU TABUNGAN</h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bank Mini SMK</p>
                                </div>

                                {/* Account Info */}
                                <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100 shadow-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</p>
                                            <p className="text-sm font-mono font-black text-gray-900 truncate tracking-tighter">
                                                {transaction.nomor_rekening_pengirim || transaction.nomor_rekening}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Pemilik</p>
                                            <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">
                                                {transaction.nama_pengirim || transaction.nama}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Table */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-3 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                                <th className="px-3 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">D/K</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            <tr>
                                                <td className="px-3 py-4 text-center">
                                                    <div className="text-[10px] font-black text-gray-900 uppercase">
                                                        {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase">
                                                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">{transaction.jenis}</span>
                                                </td>
                                                <td className="px-3 py-4 text-right">
                                                    <span className={`text-[10px] font-black ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {formatRupiah(transaction.jumlah)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-right">
                                                    {transaction.saldo ? (
                                                        <span className="text-[10px] font-black text-gray-900">
                                                            {formatRupiah(transaction.saldo)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Note */}
                                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        Dokumen Sah Bank Mini SMK • {new Date().toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>

                            {/* Status Message */}
                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-0.5">Siap Dicetak</p>
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight leading-relaxed">Gunakan printer pasbook untuk hasil terbaik.</p>
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
                                    Cetak Sekarang
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
