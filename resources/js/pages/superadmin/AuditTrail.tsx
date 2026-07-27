import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useState } from 'react';
import Pagination from '@/components/Pagination';

interface AuditLog {
    id: number;
    user_name: string;
    role: string;
    action: string;
    description: string;
    ip_address: string;
    user_agent: string;
    status: string;
    created_at: string;
}

interface AuditTrailProps {
    logs: {
        data: AuditLog[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        action?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
        order?: 'asc' | 'desc';
    };
}

export default function AuditTrail({ logs, filters }: AuditTrailProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedAction, setSelectedAction] = useState(filters.action || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const actions = [
        { value: '', label: 'Semua Aktivitas' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'create', label: 'Tambah Data' },
        { value: 'update', label: 'Edit Data' },
        { value: 'delete', label: 'Hapus/Nonaktif' },
        { value: 'transaction', label: 'Transaksi' },
    ];

    const applyFilters = () => {
        router.get(`/${rolePrefix}/audit-trail`, {
            search: searchTerm,
            action: selectedAction,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true, preserveScroll: true });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedAction('');
        setDateFrom('');
        setDateTo('');
        router.get(`/${rolePrefix}/audit-trail`);
    };

    const handleSort = (field: string) => {
        const order = filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc';
        router.get(`/${rolePrefix}/audit-trail`, {
            ...filters,
            sort: field,
            order: order,
        }, { preserveState: true, preserveScroll: true });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        return status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200';
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'teller': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getSortIcon = (field: string) => {
        if (filters.sort !== field) return <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
        return filters.order === 'asc' 
            ? <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
            : <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>;
    };

    const showLogDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedLog(null);
    };

    const buildExportUrl = (format: 'excel' | 'pdf') => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (selectedAction) params.set('action', selectedAction);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        params.set('export', format);
        return `/${rolePrefix}/audit-trail?${params.toString()}`;
    };

    const exportToExcel = () => window.open(buildExportUrl('excel'), '_blank');
    const exportToPDF = () => window.open(buildExportUrl('pdf'), '_blank');

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Audit Trail</p>
                            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Audit Trail</h1>
                            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Monitor aktivitas sistem, jejak aksi pengguna, dan status eksekusi secara real-time.</p>
                        </div>
                        <div className="flex gap-2">
                        <button
                            onClick={exportToExcel}
                            className="inline-flex items-center px-4 py-2 text-[10px] font-black text-white bg-emerald-600 border border-emerald-400/30 rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Excel
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="inline-flex items-center px-4 py-2 text-[10px] font-black text-white bg-emerald-700 border border-emerald-400/30 rounded-xl hover:bg-emerald-800 transition-all uppercase tracking-widest"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            PDF
                        </button>
                    </div>
                </div>
                </div>
            }
        >
            <Head title="Audit Trail" />

            <div className="space-y-6">
                {/* Filters Section */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Cari User</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nama user..."
                                    maxLength={255}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                        
                        {/* Action Select */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Aksi</label>
                            <select
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none appearance-none bg-white font-black uppercase tracking-widest text-xs"
                            >
                                {actions.map((action) => (
                                    <option key={action.value} value={action.value}>
                                        {action.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Date From */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Dari</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-black"
                            />
                        </div>
                        
                        {/* Date To */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Sampai</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-black"
                            />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={applyFilters}
                                className="flex-1 px-4 py-2 text-[10px] font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest h-9.5"
                            >
                                Filter
                            </button>
                            {(searchTerm || selectedAction || dateFrom || dateTo) && (
                                <button
                                    onClick={clearFilters}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors border border-slate-200 rounded-xl bg-white h-9.5 w-9.5 flex items-center justify-center"
                                    title="Reset filter"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/70 bg-slate-50/30 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log Aktivitas</h3>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tight">Total {logs.total}</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-200/70">
                                <tr>
                                    <th 
                                        className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('created_at')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Waktu
                                            {getSortIcon('created_at')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('user')}
                                    >
                                        <div className="flex items-center gap-2">
                                            User
                                            {getSortIcon('user')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('action')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Aksi
                                            {getSortIcon('action')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                                        Deskripsi
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('ip_address')}
                                    >
                                        <div className="flex items-center gap-2">
                                            IP Address
                                            {getSortIcon('ip_address')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Status
                                            {getSortIcon('status')}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.data.map((log) => (
                                    <tr 
                                        key={log.id} 
                                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                        onClick={() => showLogDetail(log)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 group-hover:text-emerald-600 transition-colors">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs text-white shadow-sm ${log.role === 'superadmin' ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
                                                    {log.user_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-black text-gray-900 tracking-tight">{log.user_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                                                log.action === 'login' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                log.action === 'logout' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                                log.action.includes('failed') ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                                {log.action.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-600 max-w-xs truncate uppercase tracking-tight" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-emerald-600 uppercase">
                                            {log.ip_address}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${getStatusBadge(log.status)}`}>
                                                {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <Pagination
                        currentPage={logs.current_page}
                        lastPage={logs.last_page}
                        total={logs.total}
                        url={`/${rolePrefix}/audit-trail`}
                        filters={filters}
                        itemLabel="Log"
                    />
                </div>

                {/* Detail Modal */}
                {showDetailModal && selectedLog && (
                    <div className="fixed inset-0 z-60 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen p-4 bg-black/60 backdrop-blur-sm">
                            {/* Modal panel */}
                            <div className="bg-white rounded-4xl text-left overflow-hidden shadow-2xl transform transition-all sm:max-w-lg sm:w-full border border-gray-100">
                                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                        Detail Aktivitas
                                    </h3>
                                    <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Log</label>
                                            <p className="text-sm font-black text-gray-900">#{selectedLog.id}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                                            <div>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${getStatusBadge(selectedLog.status)}`}>
                                                    {selectedLog.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">User</label>
                                            <p className="text-sm font-black text-gray-900 tracking-tight">{selectedLog.user_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</label>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-widest ${getRoleBadge(selectedLog.role)}`}>
                                                {selectedLog.role}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</label>
                                            <div>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                                                    selectedLog.action === 'login' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    selectedLog.action === 'logout' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                                    selectedLog.action.includes('failed') ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {selectedLog.action.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</label>
                                            <p className="text-sm font-black text-gray-900 tracking-tight">{formatDate(selectedLog.created_at)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-50 space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi</label>
                                        <p className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">{selectedLog.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">IP Address</label>
                                            <p className="text-sm font-mono font-black text-emerald-600">{selectedLog.ip_address}</p>
                                        </div>
                                        <div className="space-y-1 overflow-hidden">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">User Agent</label>
                                            <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tighter" title={selectedLog.user_agent}>
                                                {selectedLog.user_agent}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-8 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="button"
                                        className="px-8 py-3 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-800 transition-all active:scale-95 border border-emerald-500/20"
                                        onClick={closeDetailModal}
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
