import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DashboardLayout from '@/layouts/DashboardLayout';
import type { Nasabah, Transaksi, User as UserType } from '@/types';

interface SuperadminDashboardProps {
    stats: {
        total_nasabah: number;
        total_petugas: number;
        total_transaksi_hari_ini: number;
        total_saldo: number;
        total_setor: number;
        total_tarik: number;
        total_transfer: number;
        total_bayar: number;
    };
    recent_transactions: Transaksi[];
    recent_nasabah: (Nasabah & { user: UserType })[];
    transaction_chart_data: Array<{
        date: string;
        setor_count: number;
        tarik_count: number;
        setor_total: number;
        tarik_total: number;
    }>;
    monthly_chart_data: Array<{
        month: string;
        setor_count: number;
        tarik_count: number;
        setor_total: number;
        tarik_total: number;
    }>;
    volume_trend_data: Array<{
        date: string;
        volume: number;
    }>;
}

export default function SuperadminDashboard({
    stats,
    recent_transactions,
    recent_nasabah,
    transaction_chart_data,
    monthly_chart_data,
    volume_trend_data
}: SuperadminDashboardProps) {
    const [periodFilter, setPeriodFilter] = useState<'minggu' | 'bulan' | 'tahun'>('minggu');
    const [saldoFilter, setSaldoFilter] = useState<'minggu' | 'bulan' | 'tahun'>('minggu');

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

    const nasabahAktif = recent_nasabah.filter(n => n.status === 'aktif').length;

    // Get real transaction chart data based on period filter
    const getTransactionDataByPeriod = () => {
        if (periodFilter === 'minggu') {
            // Use real 7-day data from backend
            return transaction_chart_data.map(item => ({
                name: new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                setor: item.setor_count || 0,
                tarik: item.tarik_count || 0
            }));
        } else if (periodFilter === 'bulan') {
            // Use real monthly data from backend
            return monthly_chart_data.map(item => ({
                name: new Date(item.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                setor: item.setor_count || 0,
                tarik: item.tarik_count || 0
            }));
        } else {
            // Last 12 months - use real monthly data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const currentMonth = new Date().getMonth();
            const monthData = [];

            // Fill with real data where available, otherwise 0
            for (let i = 11; i >= 0; i--) {
                const monthIndex = (currentMonth - i + 12) % 12;
                const monthStr = `${new Date().getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`;
                const realData = monthly_chart_data.find(item => item.month === monthStr);

                monthData.push({
                    name: months[monthIndex],
                    setor: realData ? realData.setor_count : 0,
                    tarik: realData ? realData.tarik_count : 0
                });
            }
            return monthData;
        }
    };

    const jumlahTransaksiData = getTransactionDataByPeriod();

    // Total Saldo Chart Data (Balance trend by period)
    const getSaldoDataByPeriod = () => {
        if (saldoFilter === 'minggu') {
            // Use real 7-day volume trend data (same as teller)
            return volume_trend_data.map((item: any) => ({
                name: item.date,
                volume: item.volume || 0
            }));
        } else if (saldoFilter === 'bulan') {
            // Use real 4-week volume trend data (same as teller)
            const weeklyData: any = {};

            // Group by week
            volume_trend_data.forEach((item: any) => {
                const date = new Date(item.date);
                const weekNum = Math.ceil(date.getDate() / 7);
                const weekKey = `Minggu ${weekNum}`;

                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += item.volume || 0;
            });

            const weeks = Object.keys(weeklyData).map((key: string) => ({
                name: key,
                volume: weeklyData[key]
            }));

            return weeks;
        } else {
            // Use real 12-month volume trend data (same as teller)
            const monthlyData: any = {};

            // Group by month
            volume_trend_data.forEach((item: any) => {
                const date = new Date(item.date);
                const monthKey = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += item.volume || 0;
            });

            const months = Object.keys(monthlyData)
                .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime())
                .map((key: string) => ({
                    name: key,
                    volume: monthlyData[key]
                }));

            return months;
        }
    };

    const totalSaldoData = getSaldoDataByPeriod();

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Dashboard Superadmin</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Selamat Datang di Dashboard Superadmin</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Pantau statistik, kelola data, dan nikmati tampilan modern bernuansa hijau seperti teller.</p>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Main Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card: Total Nasabah */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Nasabah</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total_nasabah}</p>
                                <p className="mt-1 text-xs text-emerald-600 font-medium">{nasabahAktif} aktif</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Petugas */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Petugas</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total_petugas}</p>
                                <p className="mt-1 text-xs text-gray-400">Teller & Admin</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Transaksi Hari Ini */}
                    <div className="rounded-xl bg-linear-to-br from-rose-50 to-white p-5 border border-rose-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-rose-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Transaksi Hari Ini</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total_transaksi_hari_ini}</p>
                                <p className="mt-1 text-xs text-gray-400">Total aktivitas</p>
                            </div>
                        </div>
                    </div>
                    {/* Card: Total Saldo */}
                    <div className="rounded-xl bg-linear-to-br from-emerald-50 to-white p-5 border border-emerald-100 shadow flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Saldo</p>
                                <p className="mt-1 text-3xl font-bold text-gray-900">{formatRupiah(stats.total_saldo)}</p>
                                <p className="mt-1 text-xs text-gray-400">Seluruh nasabah</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Charts */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Jumlah Transaksi Chart */}
                    <div className="rounded-xl bg-white p-5 border border-emerald-100 shadow">
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

                    {/* Total Saldo Chart */}
                    <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Trend Volume Transaksi</h2>
                                    <p className="text-xs text-gray-500 mt-1">Perkembangan volume transaksi (setor + tarik)</p>
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
                            <LineChart data={totalSaldoData}>
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
                                    {formatRupiah(Math.min(...totalSaldoData.map((d: any) => d.volume)))}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Volume Tertinggi</p>
                                <p className="text-sm font-bold text-gray-900 mt-1">
                                    {formatRupiah(Math.max(...totalSaldoData.map((d: any) => d.volume)))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Breakdown */}
                <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Statistik Transaksi Hari Ini</h2>
                    <div className="grid gap-2 sm:grid-cols-4">
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-2 items-center">
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

                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 flex gap-2 items-center">
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

                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-2 items-center">
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

                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex gap-2 items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-amber-600 uppercase">Pembayaran</p>
                                    <p className="text-xl font-bold text-amber-900">{formatRupiah(stats.total_bayar)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions and Nasabah */}
                <div className="grid gap-2 lg:grid-cols-2">
                    {/* Recent Transactions */}
                    <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Transaksi Terbaru</h2>
                            <a href="/superadmin/transaksi" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                                Lihat Semua &rarr;
                            </a>
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

                    {/* Recent Nasabah */}
                    <div className="rounded-2xl bg-white/95 p-4 border border-slate-200/70 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Nasabah Terbaru</h2>
                            <a href="/superadmin/nasabah" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                                Lihat Semua &rarr;
                            </a>
                        </div>
                        <div className="overflow-hidden">
                            {recent_nasabah.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-400">Belum ada nasabah</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="pb-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">No. Rekening</th>
                                                <th className="pb-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Nama</th>
                                                <th className="pb-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Saldo</th>
                                                <th className="pb-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {recent_nasabah.map((nasabah) => (
                                                <tr key={nasabah.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 text-sm font-medium text-gray-900">{nasabah.nomor_rekening}</td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0">
                                                                <span className="text-xs font-bold text-white">
                                                                    {nasabah.user.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-900 font-medium">{nasabah.user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-sm font-bold text-gray-900 text-right">{formatRupiah(nasabah.saldo)}</td>
                                                    <td className="py-3 text-center">
                                                        {nasabah.status === 'aktif' ? (
                                                            <div className="inline-flex items-center gap-1">
                                                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-xs font-semibold text-emerald-700">Status</div>
                                                                    <div className="text-[10px] text-emerald-600">Aktif</div>
                                                                </div>
                                                            </div>
                                                        ) : nasabah.status === 'nonaktif' ? (
                                                            <div className="inline-flex items-center gap-1">
                                                                <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-xs font-semibold text-gray-700">Status</div>
                                                                    <div className="text-[10px] text-gray-600">Nonaktif</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1">
                                                                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-xs font-semibold text-red-700">Status</div>
                                                                    <div className="text-[10px] text-red-600 capitalize">{nasabah.status}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

