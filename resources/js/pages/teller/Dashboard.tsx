import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DashboardLayout from '@/layouts/DashboardLayout';
import type { Transaksi } from '@/types';

interface TellerDashboardProps {
    stats: {
        transaksi_hari_ini: number;
        total_setor: number;
        total_tarik: number;
        total_transfer: number;
        total_bayar: number;
    };
    recent_transactions: Transaksi[];
    transaction_chart_data: Array<{
        date: string;
        setor_count: number;
        tarik_count: number;
        transfer_count: number;
        setor_total: number;
        tarik_total: number;
        transfer_total: number;
    }>;
    weekly_chart_data: Array<{
        week: string;
        setor_count: number;
        tarik_count: number;
        transfer_count: number;
        setor_total: number;
        tarik_total: number;
        transfer_total: number;
    }>;
    monthly_chart_data: Array<{
        month: string;
        setor_count: number;
        tarik_count: number;
        transfer_count: number;
        setor_total: number;
        tarik_total: number;
        transfer_total: number;
    }>;
    volume_trend_data: Array<{
        date: string;
        volume: number;
    }>;
}

export default function TellerDashboard(props: TellerDashboardProps) {
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.user?.role === 'admin';
    const dashboardLabel = isAdmin ? 'Dashboard Admin' : 'Dashboard Teller';
    const rolePrefix = isAdmin ? 'admin' : 'teller';
    const [periodFilter, setPeriodFilter] = useState<'minggu' | 'bulan' | 'tahun'>('minggu');
    const [saldoFilter, setSaldoFilter] = useState<'minggu' | 'bulan' | 'tahun'>('minggu');
    if (!props || !props.stats || !props.recent_transactions || !props.transaction_chart_data) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Sedang memuat data dashboard teller...</div>;
    }
    const {
        stats,
        recent_transactions,
        transaction_chart_data,
        weekly_chart_data,
        monthly_chart_data,
        volume_trend_data
    } = props;

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    // Jumlah Transaksi Chart Data (Setor & Tarik trend by period)
    const getTransactionDataByPeriod = () => {
        if (periodFilter === 'minggu') {
            // Use real daily data
            return transaction_chart_data.map(item => ({
                name: item.date,
                setor: item.setor_count,
                tarik: item.tarik_count
                // Transfer dihilangkan untuk sama dengan admin
            }));
        } else if (periodFilter === 'bulan') {
            // Use real weekly data
            return weekly_chart_data.map(item => ({
                name: item.week,
                setor: item.setor_count,
                tarik: item.tarik_count
                // Transfer dihilangkan untuk sama dengan admin
            }));
        } else {
            // Use real monthly data
            return monthly_chart_data.map(item => ({
                name: item.month,
                setor: item.setor_count,
                tarik: item.tarik_count
                // Transfer dihilangkan untuk sama dengan admin
            }));
        }
    };

    const jumlahTransaksiData = getTransactionDataByPeriod();

    // Total Transaksi Chart Data (Transaction volume trend by period) - Same as admin
    interface VolumeTrend {
        date: string;
        volume: number;
    }
    interface VolumeChartData { name: string; volume: number; }

    const getVolumeDataByPeriod = (): VolumeChartData[] => {
        if (saldoFilter === 'minggu') {
            // Use real 7-day volume trend data (same as admin)
            return volume_trend_data.map((item: VolumeTrend) => ({
                name: item.date,
                volume: item.volume || 0
            }));
        } else if (saldoFilter === 'bulan') {
            // Use real 4-week volume trend data (same as admin)
            const weeklyData: Record<string, number> = {};
            // Group by week
            volume_trend_data.forEach((item: VolumeTrend) => {
                const date = new Date(item.date);
                const weekNum = Math.ceil(date.getDate() / 7);
                const weekKey = `Minggu ${weekNum}`;
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += item.volume || 0;
            });
            const weeks: VolumeChartData[] = Object.keys(weeklyData).map((key: string) => ({
                name: key,
                volume: weeklyData[key]
            }));
            return weeks;
        } else {
            // Use real 12-month volume trend data (same as admin)
            const monthlyData: Record<string, number> = {};
            // Group by month
            volume_trend_data.forEach((item: VolumeTrend) => {
                const date = new Date(item.date);
                const monthKey = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += item.volume || 0;
            });
            const months: VolumeChartData[] = Object.keys(monthlyData)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                .map((key: string) => ({
                    name: key,
                    volume: monthlyData[key]
                }));
            return months;
        }
    };

    const volumeTransaksiData = getVolumeDataByPeriod();

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">{dashboardLabel}</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Selamat Datang di {dashboardLabel}</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Pantau statistik transaksi, kelola aktivitas teller, dan nikmati tampilan modern bernuansa hijau seperti halaman transaksi.</p>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title={dashboardLabel} />

            <div className="space-y-6">
                {/* Main Stats Grid - Modernized */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card: Transaksi Hari Ini */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Transaksi Hari Ini</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.transaksi_hari_ini}</p>
                                <p className="mt-1 text-xs text-gray-400">Total aktivitas</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Setoran */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Setoran</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{formatRupiah(stats.total_setor)}</p>
                                <p className="mt-1 text-xs text-emerald-600 font-medium">Hari Ini</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Penarikan */}
                    <div className="rounded-xl bg-linear-to-br from-rose-50 to-white p-5 border border-rose-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-rose-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Total Penarikan</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{formatRupiah(stats.total_tarik)}</p>
                                <p className="mt-1 text-xs text-rose-600 font-medium">Hari Ini</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Transfer */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Transfer</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{formatRupiah(stats.total_transfer)}</p>
                                <p className="mt-1 text-xs text-emerald-600 font-medium">Hari Ini</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Pembayaran */}
                    <div className="rounded-xl bg-linear-to-br from-amber-50 to-white p-5 border border-amber-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Total Pembayaran</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{formatRupiah(stats.total_bayar)}</p>
                                <p className="mt-1 text-xs text-amber-600 font-medium">Hari Ini</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Charts */}
                <div className="grid gap-2 lg:grid-cols-2">
                    {/* Jumlah Transaksi Chart */}
                    <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Trend Jumlah Transaksi</h2>
                                    <p className="text-xs text-gray-500 mt-1">Setor dan tarik berdasarkan periode</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPeriodFilter('minggu')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            periodFilter === 'minggu'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Minggu
                                    </button>
                                    <button
                                        onClick={() => setPeriodFilter('bulan')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            periodFilter === 'bulan'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Bulan
                                    </button>
                                    <button
                                        onClick={() => setPeriodFilter('tahun')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            periodFilter === 'tahun'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Tahun
                                    </button>
                                </div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={jumlahTransaksiData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    stroke="#9ca3af"
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    stroke="#9ca3af"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: number | undefined) => value ? `${value} transaksi` : '0'}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                    iconType="line"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="setor"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Setor"
                                    dot={{ fill: '#10b981', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="tarik"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    name="Tarik"
                                    dot={{ fill: '#f43f5e', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Total Setor</p>
                                <p className="text-sm font-bold text-emerald-600 mt-1">
                                    {jumlahTransaksiData.reduce((sum, item) => sum + item.setor, 0)} transaksi
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Total Tarik</p>
                                <p className="text-sm font-bold text-rose-600 mt-1">
                                    {jumlahTransaksiData.reduce((sum, item) => sum + item.tarik, 0)} transaksi
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Total Volume Chart */}
                    <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Trend Volume Transaksi</h2>
                                    <p className="text-xs text-gray-500 mt-1">Total nilai transaksi berdasarkan periode</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSaldoFilter('minggu')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            saldoFilter === 'minggu'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Minggu
                                    </button>
                                    <button
                                        onClick={() => setSaldoFilter('bulan')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            saldoFilter === 'bulan'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Bulan
                                    </button>
                                    <button
                                        onClick={() => setSaldoFilter('tahun')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            saldoFilter === 'tahun'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Tahun
                                    </button>
                                </div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={volumeTransaksiData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    stroke="#9ca3af"
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    stroke="#9ca3af"
                                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}Jt`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: number | undefined) => value ? formatRupiah(value) : 'Rp 0'}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                    iconType="line"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    name="Volume Transaksi"
                                    dot={{ fill: '#10b981', r: 5 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Volume Terendah</p>
                                <p className="text-sm font-bold text-gray-900 mt-1">
                                    {formatRupiah(Math.min(...volumeTransaksiData.map(d => d.volume)))}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Volume Tertinggi</p>
                                <p className="text-sm font-bold text-gray-900 mt-1">
                                    {formatRupiah(Math.max(...volumeTransaksiData.map(d => d.volume)))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Breakdown */}
                <div className="rounded-xl bg-white p-6 border border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Statistik Transaksi Hari Ini</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-emerald-600 uppercase">Setoran</p>
                                    <p className="text-xl font-bold text-emerald-900">{formatRupiah(stats.total_setor)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-rose-600 uppercase">Penarikan</p>
                                    <p className="text-xl font-bold text-rose-900">{formatRupiah(stats.total_tarik)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-emerald-600 uppercase">Transfer</p>
                                    <p className="text-xl font-bold text-emerald-900">{formatRupiah(stats.total_transfer)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="rounded-xl bg-white p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Transaksi Terbaru</h2>
                        <Link
                            href={`/${rolePrefix}/transaksi`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                            Lihat Semua
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="overflow-hidden">
                        {recent_transactions.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-400">Belum ada transaksi</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="pb-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Kode Transaksi</th>
                                            <th className="pb-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Jenis</th>
                                            <th className="pb-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Jumlah</th>
                                            <th className="pb-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Tanggal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recent_transactions.map((transaction) => (
                                            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 text-sm font-medium text-gray-900">{transaction.kode_transaksi}</td>
                                                <td className="py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                                                        transaction.jenis_transaksi === 'setor' ? 'bg-emerald-100 text-emerald-700' :
                                                        transaction.jenis_transaksi === 'tarik' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {transaction.jenis_transaksi === 'setor' && (
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                            </svg>
                                                        )}
                                                        {transaction.jenis_transaksi === 'tarik' && (
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                                            </svg>
                                                        )}
                                                        {transaction.jenis_transaksi === 'transfer' && (
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                            </svg>
                                                        )}
                                                        {transaction.jenis_transaksi}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-sm font-bold text-gray-900 text-right">{formatRupiah(transaction.jumlah)}</td>
                                                <td className="py-3 text-xs text-gray-500 text-right">{formatDate(transaction.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
