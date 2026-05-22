import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Head } from '@inertiajs/react';
import { formatRupiah } from '@/lib/utils';

interface FinancialItem {
    code: string;
    name: string;
    amount: number;
}

interface FinancialData {
    neraca: {
        assets: FinancialItem[];
        liabilities: FinancialItem[];
        equity: FinancialItem[];
    };
    laba_rugi: {
        revenue: FinancialItem[];
        expenses: FinancialItem[];
    };
    date: string;
}

interface Props {
    data: FinancialData;
}

export default function FinancialReport({ data }: Props) {
    const exportPdf = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('export', 'pdf');
        url.searchParams.set('print', 'true');
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url.toString();
        document.body.appendChild(iframe);
        iframe.onload = () => {
            setTimeout(() => document.body.removeChild(iframe), 5000);
        };
    };

    const totalAssets = data.neraca.assets.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = data.neraca.liabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalEquity = data.neraca.equity.reduce((sum, item) => sum + item.amount, 0);
    const totalPassiva = totalLiabilities + totalEquity;

    const totalRevenue = data.laba_rugi.revenue.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = data.laba_rugi.expenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div className="mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-l-4 border-emerald-600 pl-4">
                {title}
            </h3>
            {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 pl-4">{subtitle}</p>}
        </div>
    );

    const ReportTable = ({ items, totalLabel, totalValue, variant = 'default' }: { items: FinancialItem[], totalLabel: string, totalValue: number, variant?: 'default' | 'success' | 'danger' }) => (
        <div className="space-y-4">
            <div className="divide-y divide-gray-100">
                {items.map((item) => (
                    <div key={item.code} className="flex justify-between py-3 group hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600 tracking-tighter">[{item.code}]</span>
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-gray-900 tracking-tighter self-center">
                            {formatRupiah(item.amount)}
                        </span>
                    </div>
                ))}
            </div>
            <div className={`flex justify-between p-4 rounded-xl border ${
                variant === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                variant === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                'bg-slate-50 border-slate-100 text-slate-900'
            }`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{totalLabel}</span>
                <span className="text-sm font-black tracking-tighter">{formatRupiah(totalValue)}</span>
            </div>
        </div>
    );

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Laporan Keuangan</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight uppercase">Neraca & Laba Rugi</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Konsolidasi laporan keuangan per {data.date} untuk pemantauan posisi dan kinerja.</p>
                        </div>
                        <button 
                            onClick={exportPdf}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all border border-emerald-400/30"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Cetak Laporan
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Laporan Keuangan" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* NERACA SECTION */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                            </svg>
                        </div>
                        
                        <SectionTitle title="I. Neraca" subtitle="Laporan Posisi Keuangan" />
                        
                        <div className="space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Aset (Aktiva)</h4>
                                <ReportTable 
                                    items={data.neraca.assets} 
                                    totalLabel="Total Aktiva" 
                                    totalValue={totalAssets} 
                                />
                            </div>

                            <div className="pt-6 border-t border-dashed border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Kewajiban & Ekuitas (Passiva)</h4>
                                <div className="space-y-6">
                                    <ReportTable 
                                        items={[...data.neraca.liabilities, ...data.neraca.equity]} 
                                        totalLabel="Total Passiva" 
                                        totalValue={totalPassiva}
                                        variant={totalAssets === totalPassiva ? 'success' : 'default'}
                                    />
                                    {totalAssets !== totalPassiva && (
                                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="text-[10px] font-black text-amber-700 uppercase">Warning: Balance tidak sesuai</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LABA RUGI SECTION */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                            </svg>
                        </div>

                        <SectionTitle title="II. Laba Rugi" subtitle="Laporan Perhitungan Hasil Usaha" />

                        <div className="space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Pendapatan Operasional</h4>
                                <ReportTable 
                                    items={data.laba_rugi.revenue} 
                                    totalLabel="Total Pendapatan" 
                                    totalValue={totalRevenue} 
                                />
                            </div>

                            <div className="pt-6 border-t border-dashed border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Beban Operasional</h4>
                                <ReportTable 
                                    items={data.laba_rugi.expenses} 
                                    totalLabel="Total Beban" 
                                    totalValue={totalExpenses} 
                                />
                            </div>

                            <div className={`p-6 rounded-3xl flex justify-between items-center ${
                                netProfit >= 0 ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-rose-600 text-white shadow-xl shadow-rose-100'
                            }`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Laba / Rugi Bersih</p>
                                    <p className="text-xl font-black mt-1 tracking-tighter">{formatRupiah(netProfit)}</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={netProfit >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"} />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
