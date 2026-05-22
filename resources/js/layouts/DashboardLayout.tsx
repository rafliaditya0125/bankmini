import { Link, usePage, router } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import FlashMessage from '@/components/FlashMessage';

type Theme = 'light' | 'dark' | 'system';

import type { User } from '@/types';
import ConfirmModal from '@/components/ConfirmModal';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';

interface DashboardLayoutProps extends PropsWithChildren {
    header?: ReactNode;
}

interface PageProps {
    auth: {
        user: User;
    };
    name: string;
    [key: string]: unknown;
}

interface NavigationItem {
    name: string;
    href?: string;
    icon: string;
    dropdown?: { name: string; href: string }[];
}

interface MobileNavItem {
    name: string;
    href: string;
    icon: string;
    active: boolean;
}

export default function DashboardLayout({ header, children }: DashboardLayoutProps) {
    const pageProps = usePage<PageProps>().props;
    const { auth, name } = pageProps;
    if (!auth || !auth.user) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Sedang memuat data user...</div>;
    }
    const currentUrl = usePage().url;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [kelolaUserDropdownOpen, setKelolaUserDropdownOpen] = useState(false);
    const [transaksiDropdownOpen, setTransaksiDropdownOpen] = useState(false);
    const [laporanDropdownOpen, setLaporanDropdownOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as Theme) || 'system';
        }
        return 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : (auth.user.role === 'admin' ? 'admin' : auth.user.role);
    const hideMobileNavbar = false;

    const isActive = (href: string) => {
        return currentUrl === href || currentUrl.startsWith(href + '/');
    };

    const isKelolaUserActive = () => {
        return currentUrl.startsWith(`/${rolePrefix}/nasabah`) ||
               currentUrl.startsWith(`/${rolePrefix}/petugas`) ||
               currentUrl.startsWith(`/${rolePrefix}/jurusan`);
    };

    const isTransaksiActive = () => {
        return currentUrl.startsWith(`/${rolePrefix}/setor`) || currentUrl.startsWith(`/${rolePrefix}/tarik`) || currentUrl.startsWith(`/${rolePrefix}/transfer`);
    };

    const isLaporanActive = () => {
        return currentUrl.startsWith(`/${rolePrefix}/pembukuan`) || currentUrl.startsWith(`/${rolePrefix}/transaksi`);
    };

    const handleLogout = () => {
        setShowLogoutConfirm(false);
        router.post('/logout');
    };

    const navigation: NavigationItem[] = [
        // Shared between Superadmin and Admin
        ...(['superadmin', 'admin'].includes(auth.user.role) ? [
            { name: 'Dashboard', href: `/${rolePrefix}/dashboard`, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            {
                name: 'Kelola User',
                icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
                dropdown: [
                    { name: 'Kelola Nasabah', href: `/${rolePrefix}/nasabah` },
                    { name: 'Kelola Petugas', href: `/${rolePrefix}/petugas` },
                    { name: 'Kelola Jurusan', href: `/${rolePrefix}/jurusan` },
                ]
            },
            {
                name: 'Transaksi',
                icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
                dropdown: [
                    { name: 'Setor', href: `/${rolePrefix}/setor` },
                    { name: 'Tarik', href: `/${rolePrefix}/tarik` },
                    { name: 'Transfer', href: `/${rolePrefix}/transfer` },
                ]
            },
            {
                name: 'Laporan',
                icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                dropdown: [
                    { name: 'Riwayat Transaksi', href: `/${rolePrefix}/transaksi` },
                    { name: 'Jurnal Umum', href: `/${rolePrefix}/pembukuan?type=jurnal_umum` },
                    { name: 'Buku Besar', href: `/${rolePrefix}/pembukuan?type=buku_besar` },
                    // { name: 'Laporan Keuangan', href: `/${rolePrefix}/pembukuan?type=laporan_keuangan` },
                ]
            },
            { name: 'Audit Trail', href: `/${rolePrefix}/audit-trail`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { name: 'Pengaturan', href: `/${rolePrefix}/pengaturan`, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
        ] : []),

        // Superadmin ONLY
        ...(auth.user.role === 'superadmin' ? [
            { name: 'Backup & Restore', href: '/superadmin/backup', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
        ] : []),

        ...(auth.user.role === 'teller' ? [
            { name: 'Dashboard', href: '/teller/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            {
                name: 'Transaksi',
                icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
                dropdown: [
                    { name: 'Setoran', href: '/teller/setor' },
                    { name: 'Penarikan', href: '/teller/tarik' },
                    { name: 'Transfer', href: '/teller/transfer' },
                ]
            },
            { name: 'Riwayat Transaksi', href: '/teller/transaksi', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        ] : []),
        ...(auth.user.role === 'nasabah' ? [
            { name: 'Dashboard', href: '/nasabah/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { name: 'Riwayat Transaksi', href: '/nasabah/transaksi', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        ] : []),
    ];

    const mobilePrimaryNav: MobileNavItem[] = (() => {
        if (['superadmin', 'admin'].includes(auth.user.role)) {
            return [
                {
                    name: 'Dashboard',
                    href: `/${rolePrefix}/dashboard`,
                    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
                    active: isActive(`/${rolePrefix}/dashboard`),
                },
                {
                    name: 'Transaksi',
                    href: `/${rolePrefix}/setor`,
                    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z',
                    active: isTransaksiActive(),
                },
                {
                    name: 'Laporan',
                    href: `/${rolePrefix}/transaksi`,
                    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2V19a2 2 0 01-2 2z',
                    active: isLaporanActive() || isActive(`/${rolePrefix}/transaksi`),
                },
                {
                    name: 'Profil',
                    href: `/${rolePrefix}/profil`,
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                    active: isActive(`/${rolePrefix}/profil`),
                },
            ];
        }

        if (auth.user.role === 'teller') {
            return [
                {
                    name: 'Dashboard',
                    href: '/teller/dashboard',
                    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
                    active: isActive('/teller/dashboard'),
                },
                {
                    name: 'Setor',
                    href: '/teller/setor',
                    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z',
                    active: isTransaksiActive(),
                },
                {
                    name: 'Riwayat',
                    href: '/teller/transaksi',
                    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                    active: isActive('/teller/transaksi'),
                },
                {
                    name: 'Profil',
                    href: '/teller/profil',
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                    active: isActive('/teller/profil'),
                },
            ];
        }

        return [
            {
                name: 'Dashboard',
                href: '/nasabah/dashboard',
                icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
                active: isActive('/nasabah/dashboard'),
            },
            {
                name: 'Riwayat',
                href: '/nasabah/transaksi',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                active: isActive('/nasabah/transaksi'),
            },
            {
                name: 'Profil',
                href: '/nasabah/profil',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                active: isActive('/nasabah/profil'),
            },
        ];
    })();

    const mobileSheetNavigation = navigation.filter((item) => {
        const normalizedName = item.name.toLowerCase();
        return normalizedName !== 'dashboard' && normalizedName !== 'riwayat transaksi';
    });

    const mobileNavGridClass = mobilePrimaryNav.length + 1 === 4 ? 'grid-cols-4' : 'grid-cols-5';

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
            <FlashMessage ignored={!!usePage<any>().props.flash?.transaction} />

            {/* Navbar */}
            <nav className={`sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-colors duration-200 ${hideMobileNavbar ? 'hidden md:block' : ''}`}>
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo and Brand */}
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/bankmini-removebg-preview.png"
                                alt="Logo Bank Mini SMEACIS"
                                className="h-10 w-auto object-contain"
                            />
                            <span className="hidden sm:inline text-sm font-semibold text-slate-900 dark:text-white tracking-wide">{name}</span>
                        </div>

                        {/* Right side - Navigation and User */}
                        <div className="flex items-center gap-2">
                            {/* Desktop Navigation */}
                            <div className="hidden md:flex md:items-center md:space-x-1">
                                {navigation.map((item) => (
                                    item.dropdown ? (
                                        // Dropdown menu
                                        <div key={item.name} className="relative">
                                            <button
                                                onClick={() => {
                                                    if (item.name === 'Kelola User') {
                                                        setKelolaUserDropdownOpen(!kelolaUserDropdownOpen);
                                                        setTransaksiDropdownOpen(false);
                                                        setLaporanDropdownOpen(false);
                                                    } else if (item.name === 'Transaksi') {
                                                        setTransaksiDropdownOpen(!transaksiDropdownOpen);
                                                        setKelolaUserDropdownOpen(false);
                                                        setLaporanDropdownOpen(false);
                                                    } else if (item.name === 'Laporan') {
                                                        setLaporanDropdownOpen(!laporanDropdownOpen);
                                                        setKelolaUserDropdownOpen(false);
                                                        setTransaksiDropdownOpen(false);
                                                    }
                                                }}
                                                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    (item.name === 'Kelola User' && isKelolaUserActive()) || (item.name === 'Transaksi' && isTransaksiActive()) || (item.name === 'Laporan' && isLaporanActive())
                                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                                </svg>
                                                {item.name}
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {((item.name === 'Kelola User' && kelolaUserDropdownOpen) || (item.name === 'Transaksi' && transaksiDropdownOpen) || (item.name === 'Laporan' && laporanDropdownOpen)) && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => {
                                                            setKelolaUserDropdownOpen(false);
                                                            setTransaksiDropdownOpen(false);
                                                            setLaporanDropdownOpen(false);
                                                        }}
                                                    ></div>
                                                    <div className="absolute left-0 z-20 mt-2 w-48 rounded-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-100 dark:border-gray-800">
                                                        <div className="py-1">
                                                            {item.dropdown.map((subItem) => (
                                                                <Link
                                                                    key={subItem.name}
                                                                    href={subItem.href}
                                                                    className={`block px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                                        isActive(subItem.href)
                                                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                                                                    }`}
                                                                    onClick={() => {
                                                                        setKelolaUserDropdownOpen(false);
                                                                        setTransaksiDropdownOpen(false);
                                                                        setLaporanDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    {subItem.name}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        // Regular menu
                                        <Link
                                            key={item.name}
                                            href={item.href!}
                                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                item.href && isActive(item.href)
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                            </svg>
                                            {item.name}
                                        </Link>
                                    )
                                ))}
                            </div>

                            {/* Notifications Dropdown (Nasabah Only) */}
                            {auth.user.role === 'nasabah' && (
                                <div className="relative ml-2">
                                    <button
                                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                                        className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all focus:outline-none"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        {((auth.user as any).unread_notifications_count > 0) && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white">
                                                {(auth.user as any).unread_notifications_count}
                                            </span>
                                        )}
                                    </button>

                                    {notificationsOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)}></div>
                                            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-100">
                                                <div className="px-4 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Notifikasi</p>
                                                    {((auth.user as any).unread_notifications_count > 0) && (
                                                        <button 
                                                            onClick={() => router.post('/nasabah/notifications/read-all')}
                                                            className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                                                        >
                                                            Tandai Semua Dibaca
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                                                    {((auth.user as any).notifications?.length === 0) ? (
                                                        <div className="p-8 text-center">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tidak ada notifikasi</p>
                                                        </div>
                                                    ) : (
                                                        (auth.user as any).notifications.map((n: any) => (
                                                            <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-emerald-50/30' : ''}`}>
                                                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{n.title}</p>
                                                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                                                                <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                                                                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(n.created_at))}
                                                                </p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                <div className="p-2 border-t border-gray-100 bg-gray-50/30">
                                                    <Link href="/nasabah/notifications" className="block w-full py-2 text-center text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] hover:text-emerald-600 transition-colors">
                                                        Lihat Semua Notifikasi
                                                    </Link>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* User Dropdown */}
                            <div className={`relative ml-2 ${auth.user.role === 'nasabah' ? 'hidden md:block' : ''}`}>
                                <button
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className="flex items-center justify-center h-9 w-9 rounded-xl overflow-hidden bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 focus:outline-none"
                                >
                                    {auth.user.profile_photo_path ? (
                                        <img src={auth.user.profile_photo_url} alt={auth.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        (auth.user.name && typeof auth.user.name === 'string' && auth.user.name.length > 0)
                                            ? auth.user.name.charAt(0).toUpperCase()
                                            : <span className="text-xs">?</span>
                                    )}
                                </button>

                                {userDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setUserDropdownOpen(false)}
                                        ></div>
                                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-100 dark:border-gray-800">
                                            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{auth.user.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">{auth.user.role}</p>
                                            </div>
                                            <div className="py-1">
                                                <Link
                                                    href={`/${rolePrefix}/profil`}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Profil Saya
                                                </Link>
                                                
                                                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-slate-800">
                                                    <div className="flex bg-gray-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg w-full">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTheme('light');
                                                            }}
                                                            className={`flex-1 flex justify-center items-center py-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                            title="Light Mode"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTheme('dark');
                                                            }}
                                                            className={`flex-1 flex justify-center items-center py-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                            title="Dark Mode"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTheme('system');
                                                            }}
                                                            className={`flex-1 flex justify-center items-center py-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                            title="System Theme"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setUserDropdownOpen(false);
                                                        setShowLogoutConfirm(true);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 border-t border-gray-100 dark:border-slate-800 transition-colors"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation Sheet */}
            {mobileMenuOpen && (
                <div className="md:hidden">
                    <div className="fixed inset-0 z-40 bg-slate-900/25" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="fixed inset-x-3 bottom-24 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-slate-300/60">
                        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Menu Navigasi</p>
                                <p className="text-xs font-black uppercase tracking-tight text-slate-900">{auth.user.role}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">Akun Saya</p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-200">
                                    {auth.user.profile_photo_path ? (
                                        <img src={auth.user.profile_photo_url} alt={auth.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        (auth.user.name && typeof auth.user.name === 'string' && auth.user.name.length > 0)
                                            ? auth.user.name.charAt(0).toUpperCase()
                                            : <span className="text-xs">?</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black uppercase tracking-tight text-slate-900">{auth.user.name}</p>
                                    <p className="truncate text-[10px] font-black uppercase tracking-widest text-emerald-700">{auth.user.role}</p>
                                </div>
                                <Link
                                    href={`/${rolePrefix}/profil`}
                                    className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700 transition-colors hover:bg-emerald-100"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Profil
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {mobileSheetNavigation.map((item) => (
                                item.dropdown ? (
                                    <div key={item.name} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">{item.name}</p>
                                        <div className="space-y-1">
                                            {item.dropdown.map((subItem) => (
                                                <Link
                                                    key={subItem.name}
                                                    href={subItem.href}
                                                    className={`flex items-center rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                        isActive(subItem.href)
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'text-slate-600 hover:bg-emerald-100/70 hover:text-slate-900'
                                                    }`}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    {subItem.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <Link
                                        key={item.name}
                                        href={item.href!}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            item.href && isActive(item.href)
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                                : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
                                        }`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                        {item.name}
                                    </Link>
                                )
                            ))}
                        </div>

                        <div className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-3 space-y-3">
                            <div className="flex bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-xl w-full">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                    title="Light Mode"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                    title="Dark Mode"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all ${theme === 'system' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                    title="System Theme"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    setShowLogoutConfirm(true);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-100"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
                <div className={`mx-auto grid max-w-lg ${mobileNavGridClass} gap-1`}>
                    {mobilePrimaryNav.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-black uppercase tracking-wide transition-all ${
                                item.active
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                    : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            <span>{item.name}</span>
                        </Link>
                    ))}

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-black uppercase tracking-wide transition-all ${
                            mobileMenuOpen
                                ? 'bg-slate-800 text-white shadow-md shadow-slate-300/60'
                                : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                        </svg>
                        <span>Menu</span>
                    </button>
                </div>
            </div>

            {/* Main content */}
            <main className="pb-24 pt-10 md:pb-10">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    {header && (
                        <div className="mb-8">
                            {header}
                        </div>
                    )}
                    {children}
                </div>
            </main>

            <PWAInstallPrompt />
            <PushNotificationPrompt />

            <ConfirmModal
                show={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Logout"
                message="Apakah Anda yakin ingin keluar dari sistem?"
                confirmText="Ya, Logout"
                variant="danger"
            />
        </div>
    );
}
