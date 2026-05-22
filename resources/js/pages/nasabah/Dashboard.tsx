import { Head, Link } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import type { Nasabah, Transaksi } from '@/types';
import { formatRupiah } from '@/lib/utils';

interface NasabahDashboardProps {
    nasabah: Nasabah;
    recent_transactions: Transaksi[];
}

export default function NasabahDashboard({ nasabah, recent_transactions = [] }: NasabahDashboardProps) {
    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="space-y-6">
                        <div>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Dashboard Nasabah</h1>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm text-white">
                            <div className="space-y-8">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-2">Nomor Rekening</p>
                                        <p className="text-2xl font-mono font-black tracking-tighter">{nasabah?.nomor_rekening || '-'}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        nasabah?.status === 'aktif' ? 'bg-emerald-500/20 border-emerald-300/30' : 'bg-rose-500/20 border-rose-300/30'
                                    }`}>
                                        {nasabah?.status || 'Aktif'}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-2">Saldo Tersedia</p>
                                    <p className="text-4xl md:text-5xl font-black tracking-tighter">{formatRupiah(nasabah?.saldo || 0)}</p>
                                </div>

                                <div className="pt-5 border-t border-white/15">
                                    <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Bergabung Sejak</p>
                                    <p className="text-sm font-black uppercase tracking-tight">
                                        {nasabah?.tanggal_buka ? new Date(nasabah.tanggal_buka).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-4">
                {/* Status Notification for Non-Active Accounts */}
                {nasabah?.status !== 'aktif' && (
                    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 flex items-center gap-4 shadow-sm shadow-rose-50">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shadow-sm shadow-rose-100">
                            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-black text-rose-800 uppercase tracking-tight">Pemberitahuan Rekening</p>
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-tight mt-0.5">
                                Rekening Anda saat ini berstatus <span className="underline">{nasabah?.status}</span>.
                                {' Rekening Anda telah dinonaktifkan.'}
                                Silakan hubungi petugas bank untuk informasi lebih lanjut.
                            </p>
                        </div>
                    </div>
                )}

                {/* Recent Transactions List */}
                <div className="rounded-xl bg-white border border-emerald-100 shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaksi Terakhir</h3>
                        <Link href="/nasabah/transaksi" className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest transition-colors">Semua Riwayat</Link>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {(!recent_transactions || recent_transactions.length === 0) ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto h-12 w-12 text-gray-200 mb-4">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada catatan transaksi</p>
                            </div>
                        ) : (
                            recent_transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors group">
                                    <div className="flex items-center gap-5">
                                        {(() => {
                                            const isPositive = Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum);
                                            const colorClass = isPositive ? 'text-emerald-600' : 'text-rose-600';
                                            const bgColorClass = isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
                                            const iconPath = isPositive ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6";

                                            return (
                                                <>
                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${bgColorClass}`}>
                                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={iconPath} />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{tx.jenis_transaksi.replace('_', ' ')}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{tx.kode_transaksi} • {new Date(tx.created_at).toLocaleDateString('id-ID')}</p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black tracking-tighter ${Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {Number(tx.saldo_sesudah) >= Number(tx.saldo_sebelum) ? '+' : '-'} {formatRupiah(tx.jumlah)}
                                        </p>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-0.5 group-hover:text-gray-400 transition-colors">Selesai</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

