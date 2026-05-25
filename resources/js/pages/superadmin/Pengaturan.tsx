import { Head, useForm, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useState } from 'react';

interface PengaturanPageProps {
    settings: any;
    reportHistory: any[];
}

export default function Pengaturan({ settings, reportHistory }: PengaturanPageProps) {
    const { auth } = usePage<any>().props;
    const role = auth.user.role;

    // Filter categories based on role
    const allCategories = [
        { id: 'umum', name: 'Umum', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
        { id: 'keamanan', name: 'Keamanan', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', superadminOnly: true },
        { id: 'transaksi', name: 'Transaksi', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
        { id: 'laporan', name: 'Laporan', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'database', name: 'Database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', superadminOnly: true },
        { id: 'sistem', name: 'Sistem', icon: 'M13 10V3L4 14h7v7l9-11h-7z', superadminOnly: true },
        { id: 'notifikasi', name: 'Notifikasi & OTP', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', superadminOnly: true },
    ];

    const categories = role === 'superadmin'
        ? allCategories
        : allCategories.filter(cat => !cat.superadminOnly);

    const [activeCategory, setActiveCategory] = useState('umum');

    const { data, setData, post, processing } = useForm({
        ...settings
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/${role}/pengaturan`);
    };



    const formatDisplay = (val: any, key: string) => {
        if (val === null || val === undefined || val === '') return '';

        // Only format these keys with thousand separators (Amounts)
        const amountKeys = [
            'min_deposit', 'min_withdraw', 'max_transfer', 'daily_transfer_limit',
            'min_cash_denomination',
            'monthly_admin_fee', 'monthly_admin_fee_siswa', 'monthly_admin_fee_kelas', 'monthly_admin_fee_organisasi', 'monthly_admin_fee_guru',
            'saldo_awal', 'jumlah'
        ];

        if (!amountKeys.includes(key)) return val;

        const str = val.toString().replace(/\./g, '');
        return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const parseDisplay = (val: string) => {
        return val.replace(/\./g, '');
    };

    const getMaxLengthForKey = (key: string): number => {
        const limits: Record<string, number> = {
            bank_name: 255, bank_city: 100, address: 255, phone: 20,
            ip_whitelist: 255, ip_blacklist: 255, transaction_types: 255,
            teacher_responsible_name: 255, db_host: 255, db_name: 255,
            app_url: 255,
        };
        return limits[key] || 100;
    };

    const renderInput = (key: string, label: string, type: string = 'text', props: any = {}) => {
        // A key is "Amount-based" if it ends in _limit, fee, deposit, withdraw etc. normally
        // But for this project, let's explicitly list them or use a condition
        const amountKeys = [
            'min_deposit', 'min_withdraw', 'max_transfer', 'daily_transfer_limit',
            'min_cash_denomination',
            'monthly_admin_fee', 'monthly_admin_fee_siswa', 'monthly_admin_fee_kelas', 'monthly_admin_fee_organisasi', 'monthly_admin_fee_guru'
        ];

        const isAmount = amountKeys.includes(key);
        const displayValue = isAmount ? formatDisplay(data[key], key) : data[key];
        const maxLen = getMaxLengthForKey(key);

        return (
            <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
                <input
                    type={(isAmount || type === 'number') ? 'text' : type}
                    value={displayValue}
                    maxLength={maxLen}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isAmount) {
                            const parsed = parseDisplay(val);
                            if (parsed === '' || !isNaN(Number(parsed))) {
                                setData(key as any, parsed);
                            }
                        } else if (type === 'number') {
                            // Plain numeric cleaning for non-amount number fields
                            const cleaned = val.replace(/\D/g, '');
                            setData(key as any, cleaned);
                        } else {
                            setData(key as any, val);
                        }
                    }}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-black text-sm"
                    {...props}
                />
            </div>
        );
    };

    const renderSelect = (key: string, label: string, options: { value: string, label: string }[]) => (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <select
                value={data[key]}
                onChange={(e) => setData(key as any, e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-black text-xs uppercase tracking-widest appearance-none bg-white"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <DashboardLayout
            header={
                <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-slate-900 to-emerald-800 p-6 md:p-8 text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Pengaturan Sistem</p>
                    <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">Pengaturan Sistem</h1>
                    <p className="mt-2 text-sm text-emerald-100/80 max-w-xl">Kelola konfigurasi dan preferensi sistem perbankan dari satu halaman terpusat.</p>
                </div>
            }
        >
            <Head title="Pengaturan" />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Kategori Pengaturan</h3>
                        <nav className="space-y-2">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => setActiveCategory(category.id)}
                                        className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeCategory === category.id
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={category.icon} />
                                        </svg>
                                        {category.name}
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 p-8">
                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full px-6 py-3 text-[10px] font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 transition-all uppercase tracking-[0.2em] border border-emerald-400/30"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="w-full px-6 py-3 text-[10px] font-black text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-[0.2em]"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                Pengaturan {categories.find(c => c.id === activeCategory)?.name}
                            </h2>
                        </div>
                        <div className="p-8 space-y-10">
                            {activeCategory === 'umum' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderInput('bank_name', 'Nama Bank')}
                                        {renderInput('bank_city', 'Kota')}
                                        <div className="md:col-span-2">
                                            {renderInput('address', 'Alamat Lengkap')}
                                        </div>
                                        {renderInput('phone', 'Nomor Telepon', 'number')}
                                    </div>
                                    <div className="space-y-6 pt-6 border-t border-gray-50">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Retensi Akun Alumni (Kelas Alumni)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderInput('alumni_retention_years', 'Lama Retensi (Tahun)', 'number')}
                                            {renderInput('alumni_retention_days', 'Tambahan Hari (Hari)', 'number')}
                                        </div>
                                        <div className="mt-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-medium">
                                                <strong>Informasi:</strong> Akun siswa akan otomatis dihapus permanen ketika saldo mencapai Rp 0. Tidak ada batasan saldo minimal agar proses penutupan akun dapat dilakukan dengan menarik seluruh saldo.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}



                            {activeCategory === 'keamanan' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderSelect('encryption_method', 'Metode Enkripsi Data', [
                                            { value: 'AES-256', label: 'AES-256 (REKOMENDASI)' },
                                            { value: 'AES-128', label: 'AES-128' },
                                            { value: 'ChaCha20', label: 'ChaCha20' }
                                        ])}
                                        {renderInput('log_retention', 'Retensi Log (Hari)', 'number')}
                                        <div className="md:col-span-2">
                                            {renderInput('ip_whitelist', 'IP Whitelist (Pemisah Koma)', 'text', { placeholder: 'Contoh: 127.0.0.1, 192.168.1.1' })}
                                        </div>
                                        <div className="md:col-span-2">
                                            {renderInput('ip_blacklist', 'IP Blacklist (Pemisah Koma)', 'text', { placeholder: 'Contoh: 1.1.1.1, 8.8.8.8' })}
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-8 border-t border-gray-50">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sesi & Keamanan</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderInput('throttle_login_limit', 'Limit Percobaan Login (per menit)', 'number')}
                                            {renderInput('throttle_transaction_limit', 'Limit Percobaan Transaksi (per menit)', 'number')}
                                            {renderInput('session_lifetime', 'Durasi Sesi / Ingat Saya (Hari)', 'number')}
                                        </div>
                                        <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-medium">
                                                <strong>Informasi:</strong> 
                                                <br/>• Throttling prevent brute-force attacks.
                                                <br/>• Durasi Sesi mengatur seberapa lama user tetap login (default 10080 menit = 1 minggu).
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}



                            {activeCategory === 'transaksi' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        {renderInput('max_transfer', 'Maksimal Transfer (Rp)', 'number')}
                                        {renderInput('daily_transfer_limit', 'Batas Harian Transfer (Rp)', 'number')}
                                        {renderInput('min_deposit', 'Minimal Transfer / Setoran (Rp)', 'number')}
                                        {renderInput('min_withdraw', 'Minimal Penarikan (Rp)', 'number')}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-1">
                                            {renderInput('min_cash_denomination', 'Pecahan Tunai Terkecil (Rp)', 'number')}
                                        </div>
                                        <div className="md:col-span-2">
                                            {renderInput('transaction_types', 'Jenis Transaksi (Pisahkan dengan Koma)', 'text', { placeholder: 'Contoh: Tunai, Transfer, Kliring, Cek' })}
                                        </div>
                                        <div className="md:col-span-1">
                                            {renderSelect('bkk_bkm_mode', 'Mode Nomor BKK & BKM', [
                                                { value: 'manual', label: 'Manual Input' },
                                                { value: 'auto', label: 'Otomatis' }
                                            ])}
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-8 border-t border-gray-50">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sistem Bunga & Biaya Bulanan</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderInput('monthly_interest_rate_siswa', 'Bunga Bulanan Siswa (%)', 'number', { step: '0.01' })}
                                            {renderInput('monthly_admin_fee_siswa', 'Biaya Admin Siswa (Rp)', 'number')}
                                            {renderInput('monthly_interest_rate_kelas', 'Bunga Bulanan Kelas (%)', 'number', { step: '0.01' })}
                                            {renderInput('monthly_admin_fee_kelas', 'Biaya Admin Kelas (Rp)', 'number')}
                                            {renderInput('monthly_interest_rate_organisasi', 'Bunga Bulanan Organisasi (%)', 'number', { step: '0.01' })}
                                            {renderInput('monthly_admin_fee_organisasi', 'Biaya Admin Organisasi (Rp)', 'number')}
                                            {renderInput('monthly_interest_rate_guru', 'Bunga Bulanan Guru (%)', 'number', { step: '0.01' })}
                                            {renderInput('monthly_admin_fee_guru', 'Biaya Admin Guru (Rp)', 'number')}
                                            {renderInput('monthly_process_day', 'Tanggal Proses Bulanan (1-31)', 'number', { min: 1, max: 31 })}
                                            {renderInput('monthly_process_hour', 'Jam Proses Bulanan (0-23)', 'number', { min: 0, max: 23 })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeCategory === 'laporan' && (
                                <div className="grid grid-cols-1 gap-6">
                                    {renderInput('teacher_responsible_name', 'Nama Guru Penanggung Jawab')}
                                </div>
                            )}

                            {activeCategory === 'database' && (
                                <>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderInput('db_host', 'Host Basis Data')}
                                        {renderInput('db_port', 'Port Basis Data', 'number')}
                                        {renderInput('db_name', 'Nama Basis Data')}
                                        {renderInput('db_timeout', 'Waktu Habis Koneksi (Detik)', 'number')}
                                        {renderInput('db_cache_size', 'Ukuran Cache Query (MB)', 'number')}
                                        {renderInput('db_max_connections', 'Maksimal Koneksi Simultan', 'number')}
                                        {renderSelect('db_optimize_schedule', 'Jadwal Pembersihan', [
                                            { value: 'Daily at 02:00', label: 'SETIAP HARI (02:00)' },
                                            { value: 'Weekly on Sunday', label: 'SETIAP MINGGU (AHAD)' },
                                            { value: 'Monthly on 1st', label: 'SETIAP BULAN (TGL 1)' }
                                        ])}
                                        {renderInput('db_log_retention', 'Simpan Log Query (Hari)', 'number')}
                                    </div>
                                </>
                            )}



                            {activeCategory === 'sistem' && (
                                <>

                                    {renderSelect('maintenance_mode', 'Mode Pemeliharaan', [
                                        { value: '0', label: 'OFF (OPERASIONAL PENUH)' },
                                        { value: '1', label: 'ON (MODE PEMELIHARAAN)' }
                                    ])}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-50">
                                        {renderInput('app_url', 'URL Utama Aplikasi', 'url')}
                                        {renderSelect('timezone', 'Zona Waktu Sistem', [
                                            { value: 'Asia/Jakarta', label: 'WIB (ASIA/JAKARTA)' },
                                            { value: 'Asia/Singapore', label: 'SGT (ASIA/SINGAPORE)' },
                                            { value: 'UTC', label: 'UTC (UNIVERSAL)' }
                                        ])}
                                        {renderSelect('language', 'Bahasa Antarmuka', [
                                            { value: 'id', label: 'BAHASA INDONESIA' },
                                            { value: 'en', label: 'ENGLISH (US)' }
                                        ])}
                                        {renderInput('cache_ttl', 'Umur Cache (Menit)', 'number')}
                                        {renderSelect('log_level', 'Tingkat Kepentingan Log', [
                                            { value: 'Debug', label: 'DEBUG (SEMUA)' },
                                            { value: 'Info', label: 'INFO (STANDAR)' },
                                            { value: 'Warning', label: 'WARNING (PERINGATAN)' },
                                            { value: 'Error', label: 'ERROR (KESALAHAN)' }
                                        ])}
                                        {renderInput('max_log_size', 'Ukuran Maksimal File Log (MB)', 'number')}
                                        {renderInput('api_rate_limit', 'Batas Panggilan API (Permintaan/Menit)', 'number')}
                                        {renderInput('api_token_expiry', 'Masa Berlaku Token API (Jam)', 'number')}
                                    </div>
                                </>
                            )}
                            
                            {activeCategory === 'notifikasi' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        {renderSelect('notification_email_active', 'Status Notifikasi Email', [
                                            { value: '1', label: 'AKTIF' },
                                            { value: '0', label: 'NONAKTIF' }
                                        ])}
                                        {renderSelect('notification_whatsapp_active', 'Status Notifikasi WhatsApp', [
                                            { value: '1', label: 'AKTIF' },
                                            { value: '0', label: 'NONAKTIF' }
                                        ])}
                                    </div>
                                    
                                    <div className="mt-2 mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium">
                                            <strong>Informasi:</strong> Jika semua notifikasi dinonaktifkan, maka proses yang membutuhkan pengiriman notifikasi/OTP seperti verifikasi email akan otomatis dilewati dan dianggap selesai secara sistem (bypass).
                                        </p>
                                    </div>

                                    {data.notification_email_active === '1' && (
                                        <div className="space-y-6 pt-8 border-t border-gray-50">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Pengaturan Email</h3>
                                            
                                            {renderSelect('email_provider', 'Provider Email', [
                                                { value: 'resend', label: 'RESEND API' },
                                                { value: 'smtp', label: 'SMTP SERVER' }
                                            ])}

                                            {data.email_provider === 'resend' ? (
                                                <div className="mt-4">
                                                    {renderInput('resend_api_key', 'Resend API Key', 'password', { placeholder: 're_...' })}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                    {renderInput('smtp_host', 'SMTP Host')}
                                                    {renderInput('smtp_port', 'SMTP Port', 'number')}
                                                    {renderInput('smtp_username', 'SMTP Username')}
                                                    {renderInput('smtp_password', 'SMTP Password', 'password')}
                                                    {renderSelect('smtp_encryption', 'Enkripsi', [
                                                        { value: 'tls', label: 'TLS' },
                                                        { value: 'ssl', label: 'SSL' },
                                                        { value: '', label: 'NONE' }
                                                    ])}
                                                    <div className="col-span-2 grid grid-cols-2 gap-6">
                                                        {renderInput('smtp_from_address', 'Alamat Pengirim (From Email)')}
                                                        {renderInput('smtp_from_name', 'Nama Pengirim (From Name)')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </form>
        </DashboardLayout>
    );
}
