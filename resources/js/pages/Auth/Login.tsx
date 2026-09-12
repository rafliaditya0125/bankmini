import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';
import FlashMessage from '@/components/FlashMessage';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Modal from '@/components/Modal';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { useHoneypot } from '@/hooks/useHoneypot';
import HoneypotInputs from '@/components/HoneypotInputs';
import CaptchaWidget from '@/components/CaptchaWidget';

export interface DemoAccount {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    user_type?: string;
    nis?: string;
    nip?: string;
    identifier: string;
    profile_photo_url?: string;
}

interface PageProps {
    status?: string;
    name: string;
    session_lifetime: number;
    otp_channel: string;
    demo_mode?: boolean;
    demo_accounts?: DemoAccount[];
    demo_password?: string;
}

export default function Login() {
    const { status, name, session_lifetime, otp_channel, demo_mode, demo_accounts, demo_password } = usePage<PageProps>().props;
    const { honeypotData } = useHoneypot();
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        login: '',
        password: '',
        remember: false,
        'cf-turnstile-response': '',
        'g-recaptcha-response': '',
        ...honeypotData,
    });

    // Forgot Password Logic using custom hook
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const {
        data: forgotPasswordData,
        setData: setForgotPasswordData,
        processing: forgotPasswordProcessing,
        errors: forgotPasswordErrors,
        reset: resetForgotPassword,
        step: forgotPasswordStep,
        setStep: setForgotPasswordStep,
        otpSent: forgotPasswordOtpSent,
        timer: forgotPasswordTimer,
        targetMasked,
        channel,
        hasTotp,
        availableChannels,
        isCheckingIdentity,
        validations: forgotPasswordValidations,
        isValid: isForgotPasswordValid,
        requestOtp: requestForgotPasswordOtp,
        switchToRecovery,
        switchToTotp,
        switchToOtp,
        submit: submitForgotPasswordReset,
        resetFlow: resetForgotPasswordFlow,
    } = usePasswordManagement({
        routePath: route('password.update'),
        otpChannel: otp_channel,
        onSuccessCallback: () => setShowForgotPasswordModal(false),
    });

    const isPasswordEmpty = forgotPasswordData.password.length === 0;
    const isOtpEmpty = forgotPasswordData.otp.length === 0;
    const isIdentityEmpty = forgotPasswordData.login.length === 0;

    let forgotPasswordSubmitBtnText = '';
    if (forgotPasswordProcessing) {
        forgotPasswordSubmitBtnText = 'Memproses...';
    } else if (isPasswordEmpty) {
        forgotPasswordSubmitBtnText = 'Isi Password Baru';
    } else if (!forgotPasswordValidations.length) {
        forgotPasswordSubmitBtnText = 'Password Terlalu Pendek';
    } else if (!forgotPasswordValidations.match) {
        forgotPasswordSubmitBtnText = 'Konfirmasi Password Salah';
    } else if (isOtpEmpty) {
        forgotPasswordSubmitBtnText = channel === 'totp' 
            ? 'Isi Kode Authenticator' 
            : (channel === 'recovery' ? 'Isi Recovery Code' : 'Isi Kode OTP');
    } else {
        forgotPasswordSubmitBtnText = 'Simpan Password Baru';
    }

    const isForgotPasswordSubmitDisabled = forgotPasswordProcessing || isPasswordEmpty || isOtpEmpty || !isForgotPasswordValid;

    const handleForgotStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isIdentityEmpty || isCheckingIdentity || forgotPasswordProcessing) return;
        requestForgotPasswordOtp(e);
    };

    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

    // Demo Mode state & handlers
    const [quickLoginLoadingId, setQuickLoginLoadingId] = useState<number | null>(null);
    const [demoFilterRole, setDemoFilterRole] = useState<string>('all');
    const [highlightForm, setHighlightForm] = useState(false);

    const handleQuickLogin = (account: DemoAccount) => {
        setQuickLoginLoadingId(account.id);
        router.post(route('demo.login'), {
            user_id: account.id,
        }, {
            onFinish: () => setQuickLoginLoadingId(null),
        });
    };

    const handleUseAccount = (account: DemoAccount) => {
        const cred = account.identifier || account.username || account.email;
        setData((prev: any) => ({
            ...prev,
            login: cred,
            password: demo_password || 'password',
        }));
        setHighlightForm(true);
        setTimeout(() => setHighlightForm(false), 2000);
        const loginInput = document.getElementById('login');
        if (loginInput) {
            loginInput.focus();
        }
    };

    const filteredDemoAccounts = (demo_accounts || []).filter((acc) => {
        if (demoFilterRole === 'all') return true;
        return acc.role === demoFilterRole;
    });

    useEffect(() => {
        if ((errors as any).throttle) {
            setLockoutSeconds(parseInt((errors as any).throttle));
        }
    }, [(errors as any).throttle]);

    useEffect(() => {
        if (lockoutSeconds > 0) {
            const timer = setInterval(() => {
                setLockoutSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        clearErrors('throttle' as any);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [lockoutSeconds, clearErrors]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => {
                reset('password');
                setCaptchaResetKey((k) => k + 1); // reset CAPTCHA after each attempt
            },
        });
    };

    return (
        <>
            <Head title={`Login - ${name}`} />
            <FlashMessage />
            <PWAInstallPrompt />

            <div className="min-h-screen relative overflow-hidden bg-slate-50">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_55%)] dark:hidden" />
                <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-200/70 blur-3xl animate-[float-slow_18s_ease-in-out_infinite] dark:hidden" />
                <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl animate-[float-slow_24s_ease-in-out_infinite] dark:hidden" />

                <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 lg:py-20">
                    <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
                        <div className="hidden lg:flex flex-col gap-8 pr-6 animate-[fade-up_0.7s_ease-out]">
                            <Link href={route('home')} className="inline-flex items-center gap-4">
                                <img
                                    src="/images/bankmini-removebg-preview.png"
                                    alt={`Logo ${name || 'Bank Mini'}`}
                                    className="h-14 w-auto object-contain drop-shadow-lg"
                                />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Bank Mini</p>
                                    <span className="text-2xl font-semibold text-slate-900">{name}</span>
                                </div>
                            </Link>

                            <div className="space-y-4">
                                <h1 className="text-4xl font-semibold leading-tight text-slate-900">
                                    Kelola transaksi siswa dengan cepat, rapi, dan transparan.
                                </h1>
                                <p className="text-base text-slate-600">
                                    Akses pencatatan setoran, penarikan, serta laporan keuangan langsung dari satu dashboard modern.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <p className="text-xs uppercase tracking-widest text-slate-400">Aman</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">Audit trail otomatis</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <p className="text-xs uppercase tracking-widest text-slate-400">Cepat</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">Transaksi real-time</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
                                        </svg>
                                        <p className="text-xs uppercase tracking-widest text-slate-400">Rapi</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">Laporan otomatis</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 8-4-4m8-8a9 9 0 11-12.73 0" />
                                        </svg>
                                        <p className="text-xs uppercase tracking-widest text-slate-400">Modern</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">UI bersih dan fokus</p>
                                </div>
                            </div>

                            {demo_mode && (
                                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-xs backdrop-blur flex items-center gap-3.5">
                                    <div className="flex h-2.5 w-2.5 relative shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-emerald-900">Mode Demo Aktif</p>
                                        <p className="text-xs text-emerald-700/90 mt-0.5">Akun demo uji coba tersedia di bawah formulir login untuk kemudahan evaluasi fitur.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="animate-[fade-up_0.9s_ease-out]">
                            <div className="mb-8 flex items-center gap-3 lg:hidden">
                                <img
                                    src="/images/bankmini-removebg-preview.png"
                                    alt={`Logo ${name || 'Bank Mini'}`}
                                    className="h-10 w-auto object-contain drop-shadow"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                                    <p className="text-xs text-slate-500">Sistem Bank Mini</p>
                                </div>
                            </div>

                            {/* Login Card */}
                            <div className="rounded-3xl border border-slate-200 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
                                <div className="mb-6 space-y-2">
                                    <h2 className="text-2xl font-semibold text-slate-900">Masuk ke akun Anda</h2>
                                    <p className="text-sm text-slate-500">Gunakan username (No. Rekening) atau NIS/NIP atau email sesuai tipe akun.</p>
                                </div>

                                {status && (
                                    <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
                                        {status}
                                    </div>
                                )}

                                <form onSubmit={submit} className="space-y-6">
                                    <HoneypotInputs setData={setData} />
                                    {/* CAPTCHA (primary + automatic fallback) */}
                                    <CaptchaWidget
                                        key={captchaResetKey}
                                        onVerifyTurnstile={(token) => setData('cf-turnstile-response', token)}
                                        onVerifyRecaptcha={(token) => setData('g-recaptcha-response', token)}
                                        onExpireTurnstile={() => setData('cf-turnstile-response', '')}
                                        onExpireRecaptcha={() => setData('g-recaptcha-response', '')}
                                    />
                                    {/* Login Field */}
                                    <div className="space-y-2">
                                        <label htmlFor="login" className="block text-xs font-semibold text-slate-500">
                                            Username / NIS / NIP / Email
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="login"
                                                type="text"
                                                name="login"
                                                value={data.login}
                                                onChange={(e) => setData('login', e.target.value)}
                                                maxLength={254}
                                                className={`block w-full rounded-xl border bg-[#ffffff] dark:bg-[#ffffff] py-3.5 pl-12 pr-4 text-sm font-medium text-[#0f172a] dark:text-[#0f172a] shadow-sm outline-none transition ${
                                                    highlightForm
                                                        ? 'border-emerald-500 ring-4 ring-emerald-400/40 bg-emerald-50/20'
                                                        : 'border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40'
                                                }`}
                                                placeholder="Contoh: 1234567890"
                                                autoComplete="username"
                                                autoFocus
                                            />
                                        </div>
                                        {errors.login && <p className="text-xs font-semibold text-rose-600">{errors.login}</p>}
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="block text-xs font-semibold text-slate-500">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                maxLength={255}
                                                className={`block w-full rounded-xl border bg-[#ffffff] dark:bg-[#ffffff] py-3.5 pl-12 pr-12 text-sm font-medium text-[#0f172a] dark:text-[#0f172a] shadow-sm outline-none transition ${
                                                    highlightForm
                                                        ? 'border-emerald-500 ring-4 ring-emerald-400/40 bg-emerald-50/20'
                                                        : 'border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40'
                                                }`}
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                            >
                                                {showPassword ? (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-xs font-semibold text-rose-600">{errors.password}</p>}
                                    </div>

                                    {/* Remember Me & Forgot Password */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <input
                                                type="checkbox"
                                                name="remember"
                                                checked={data.remember}
                                                onChange={(e) => setData('remember', e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            Ingat saya ({session_lifetime} hari)
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPasswordModal(true)}
                                            className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors"
                                        >
                                            Lupa Password?
                                        </button>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="space-y-3">
                                        {(errors as any).captcha && (
                                            <p className="text-center text-xs font-semibold text-rose-600">
                                                {(errors as any).captcha}
                                            </p>
                                        )}
                                        {lockoutSeconds > 0 && (
                                            <p className="text-center text-xs font-semibold text-rose-600 animate-pulse">
                                                Terlalu banyak percobaan, coba lagi dalam {formatTime(lockoutSeconds)}
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={processing || lockoutSeconds > 0 || !data.login || !data.password}
                                            className="group w-full rounded-xl !bg-emerald-600 dark:!bg-emerald-600 px-6 py-3.5 text-sm font-semibold !text-white dark:!text-white shadow-lg shadow-emerald-600/20 transition hover:!bg-emerald-700 dark:hover:!bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 active:translate-y-0 disabled:cursor-not-allowed disabled:!bg-slate-200 dark:disabled:!bg-slate-200 disabled:!text-slate-500 dark:disabled:!text-slate-500 disabled:shadow-none"
                                        >
                                            {lockoutSeconds > 0 ? (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Terlalu banyak percobaan
                                                </span>
                                            ) : processing ? (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Memproses...
                                                </span>
                                            ) : !data.login && !data.password ? (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    Isi Username / NIS / NIP / Email dan Password
                                                </span>
                                            ) : !data.login ? (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    Isi Username / NIS / NIP / Email
                                                </span>
                                            ) : !data.password ? (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    Isi Password
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center gap-3">
                                                    Masuk
                                                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Demo Accounts Panel */}
                            {demo_mode && demo_accounts && demo_accounts.length > 0 && (
                                <div className="mt-8 rounded-3xl border border-emerald-200/90 bg-white/95 p-6 sm:p-7 shadow-[0_20px_60px_rgba(16,185,129,0.08)] backdrop-blur">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-2.5 w-2.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                                    Akun Demo Uji Coba
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                                        Demo Aktif
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Pilih akun untuk evaluasi sistem tanpa mendaftar.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password Demo:</span>
                                            <code className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                                {demo_password || 'password'}
                                            </code>
                                        </div>
                                    </div>

                                    {/* Role Filter Tabs */}
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'all', label: `Semua (${demo_accounts.length})` },
                                            { id: 'superadmin', label: '👑 Superadmin' },
                                            { id: 'admin', label: '🛡️ Admin' },
                                            { id: 'teller', label: '💼 Teller' },
                                            { id: 'nasabah', label: '🎓 Nasabah' },
                                        ].map((tab) => {
                                            const count = tab.id === 'all'
                                                ? demo_accounts.length
                                                : demo_accounts.filter(a => a.role === tab.id).length;
                                            if (count === 0 && tab.id !== 'all') return null;

                                            const isActive = demoFilterRole === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setDemoFilterRole(tab.id)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                        isActive
                                                            ? 'bg-slate-900 text-white shadow-xs'
                                                            : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                                                    }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Account Cards Grid */}
                                    <div className="mt-4 grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
                                        {filteredDemoAccounts.map((account) => {
                                            const isQuickLoading = quickLoginLoadingId === account.id;
                                            const roleBadgeStyles: Record<string, string> = {
                                                superadmin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                                admin: 'bg-blue-50 text-blue-700 border-blue-200',
                                                teller: 'bg-amber-50 text-amber-700 border-amber-200',
                                                nasabah: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            };
                                            const avatarBgStyles: Record<string, string> = {
                                                superadmin: 'bg-indigo-600',
                                                admin: 'bg-blue-600',
                                                teller: 'bg-amber-600',
                                                nasabah: 'bg-emerald-600',
                                            };

                                            const badgeStyle = roleBadgeStyles[account.role] || 'bg-slate-50 text-slate-700 border-slate-200';
                                            const avatarBg = avatarBgStyles[account.role] || 'bg-slate-600';

                                            return (
                                                <div
                                                    key={account.id}
                                                    className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {account.profile_photo_url ? (
                                                            <img
                                                                src={account.profile_photo_url}
                                                                alt={account.name}
                                                                className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${avatarBg}`}>
                                                                {account.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-slate-900 truncate">{account.name}</p>
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                                                                    {account.role}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                                                                {account.identifier}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUseAccount(account)}
                                                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
                                                            title="Isi identitas & password ke formulir di atas"
                                                        >
                                                            ✏️ Gunakan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={quickLoginLoadingId !== null}
                                                            onClick={() => handleQuickLogin(account)}
                                                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-[11px] font-bold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                                        >
                                                            {isQuickLoading ? (
                                                                <>
                                                                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                    </svg>
                                                                    <span>Masuk...</span>
                                                                </>
                                                            ) : (
                                                                <span>⚡ Masuk Cepat</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            <Modal
                show={showForgotPasswordModal}
                onClose={() => {
                    setShowForgotPasswordModal(false);
                    resetForgotPasswordFlow();
                }}
                title="Ganti Password"
                description={
                    forgotPasswordStep === 1
                        ? "Masukkan identitas akun Anda untuk memulai proses ganti password"
                        : (channel === 'totp'
                            ? "Verifikasi kode Authenticator dan buat password baru"
                            : "Masukkan kode OTP yang dikirim dan buat password baru")
                }
                maxWidth="sm"
            >
                {forgotPasswordStep === 1 ? (
                    <form onSubmit={handleForgotStep1Submit} className="space-y-6">
                        <HoneypotInputs setData={setForgotPasswordData} />
                        {/* CAPTCHA for forgot password */}
                        <CaptchaWidget
                            onVerifyTurnstile={(token) => setForgotPasswordData('cf-turnstile-response' as any, token)}
                            onVerifyRecaptcha={(token) => setForgotPasswordData('g-recaptcha-response' as any, token)}
                            onExpireTurnstile={() => setForgotPasswordData('cf-turnstile-response' as any, '')}
                            onExpireRecaptcha={() => setForgotPasswordData('g-recaptcha-response' as any, '')}
                            theme="light"
                        />
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Username / NIS / NIP / Email / No. Rekening
                                </label>
                                <input
                                    type="text"
                                    value={forgotPasswordData.login}
                                    onChange={(e) => setForgotPasswordData('login', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Masukkan identitas akun"
                                    required
                                    autoFocus
                                />
                                {forgotPasswordErrors.login && (
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                        {forgotPasswordErrors.login}
                                    </p>
                                )}
                                {(forgotPasswordErrors as any).captcha && (
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                        {(forgotPasswordErrors as any).captcha}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForgotPasswordModal(false);
                                    resetForgotPasswordFlow();
                                }}
                                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isIdentityEmpty || isCheckingIdentity || forgotPasswordProcessing}
                                className={`flex-1 py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 ${
                                    isIdentityEmpty || isCheckingIdentity || forgotPasswordProcessing
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                                }`}
                            >
                                {isCheckingIdentity || forgotPasswordProcessing ? 'Memeriksa Akun...' : 'Lanjutkan'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={submitForgotPasswordReset} className="space-y-6">
                        <HoneypotInputs setData={setForgotPasswordData} />

                        {/* Account Identity Summary */}
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identitas Akun</p>
                                <p className="text-sm font-black text-slate-700">{forgotPasswordData.login}</p>
                            </div>
                            <button
                                type="button"
                                onClick={resetForgotPasswordFlow}
                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest cursor-pointer"
                            >
                                Ganti Akun
                            </button>
                        </div>

                        {/* TOTP or OTP or Recovery Info Banner */}
                        {channel === 'totp' ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0 text-base">
                                    🛡️
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">Akun Terproteksi Authenticator (2FA)</p>
                                    <p className="text-xs text-emerald-600 font-medium">Buka Google Authenticator atau Microsoft Authenticator Anda untuk melihat kode 6-digit.</p>
                                </div>
                            </div>
                        ) : channel === 'recovery' ? (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 flex items-center gap-3">
                                <div className="h-10 w-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shrink-0 text-base">
                                    🔑
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Kode Pemulihan Darurat (Recovery Code)</p>
                                    <p className="text-xs text-amber-600 font-medium">Masukkan salah satu kode pemulihan yang Anda simpan saat mengaktifkan 2FA.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 text-base">
                                    {channel === 'email' || channel === 'resend' ? '✉️' : '📱'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-wide">Kode OTP Terkirim</p>
                                    <p className="text-xs text-blue-600 font-medium">
                                        OTP telah dikirim ke {(channel === 'email' || channel === 'resend') ? 'Email' : 'WhatsApp'}: {targetMasked}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Baru</label>
                                <div className="relative">
                                    <input
                                        type={showForgotPassword ? "text" : "password"}
                                        value={forgotPasswordData.password}
                                        onChange={(e) => setForgotPasswordData('password', e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Minimal 8 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        {showForgotPassword ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {forgotPasswordErrors.password && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{forgotPasswordErrors.password}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Konfirmasi Password</label>
                                <div className="relative">
                                    <input
                                        type={showForgotPassword ? "text" : "password"}
                                        value={forgotPasswordData.password_confirmation}
                                        onChange={(e) => setForgotPasswordData('password_confirmation', e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Ulangi password baru"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        {showForgotPassword ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {channel === 'totp' 
                                        ? 'Kode Authenticator TOTP (6 Digit)' 
                                        : (channel === 'recovery' ? 'Kode Pemulihan (Recovery Code)' : 'Kode OTP (6 Digit)')}
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={forgotPasswordData.otp}
                                        onChange={e => setForgotPasswordData('otp', e.target.value)}
                                        className={`w-[60%] bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center tracking-widest focus:ring-2 focus:ring-emerald-500 ${
                                            channel === 'recovery' ? 'font-mono text-sm uppercase' : 'text-xl'
                                        }`}
                                        required
                                        maxLength={channel === 'recovery' ? 24 : 8}
                                        placeholder={channel === 'recovery' ? 'xxxx-xxxx-xxxx' : '000000'}
                                        autoFocus
                                    />
                                    {channel === 'totp' ? (
                                        <div className="w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight flex items-center justify-center px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 select-none">
                                            🛡️ Authenticator
                                        </div>
                                    ) : channel === 'recovery' ? (
                                        <div className="w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight flex items-center justify-center px-3 bg-amber-50 border border-amber-200 text-amber-700 select-none">
                                            🔑 Recovery
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => requestForgotPasswordOtp(undefined, channel)}
                                            disabled={forgotPasswordProcessing || forgotPasswordTimer > 0}
                                            className={`w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 whitespace-nowrap px-4 ${
                                                (forgotPasswordProcessing || forgotPasswordTimer > 0)
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                                            }`}
                                        >
                                            {forgotPasswordOtpSent && forgotPasswordTimer === 0 ? 'Kirim Ulang' : (forgotPasswordProcessing ? 'Memproses...' : (forgotPasswordTimer > 0 ? `${forgotPasswordTimer}s` : 'Kirim Ulang'))}
                                        </button>
                                    )}
                                </div>
                                {forgotPasswordErrors.otp && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{forgotPasswordErrors.otp}</p>}

                                {/* Alternative verification options */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                                    {channel === 'totp' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const pref = availableChannels.email ? 'email' : 'whatsapp';
                                                    switchToOtp(pref);
                                                }}
                                                disabled={forgotPasswordProcessing}
                                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <span>✉️</span>
                                                <span>Kirim kode via {availableChannels.email && availableChannels.whatsapp ? 'Email / WhatsApp' : (availableChannels.email ? 'Email' : 'WhatsApp')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={switchToRecovery}
                                                className="text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>🔑</span>
                                                <span>Gunakan Kode Pemulihan (Recovery Code)</span>
                                            </button>
                                        </>
                                    )}

                                    {channel === 'recovery' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={switchToTotp}
                                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>🛡️</span>
                                                <span>Gunakan Aplikasi Authenticator (TOTP)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const pref = availableChannels.email ? 'email' : 'whatsapp';
                                                    switchToOtp(pref);
                                                }}
                                                disabled={forgotPasswordProcessing}
                                                className="text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <span>✉️</span>
                                                <span>Kirim kode via {availableChannels.email && availableChannels.whatsapp ? 'Email / WhatsApp' : (availableChannels.email ? 'Email' : 'WhatsApp')}</span>
                                            </button>
                                        </>
                                    )}

                                    {(channel === 'email' || channel === 'whatsapp' || channel === 'resend') && (
                                        <>
                                            {(hasTotp || availableChannels.totp) && (
                                                <button
                                                    type="button"
                                                    onClick={switchToTotp}
                                                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span>🛡️</span>
                                                    <span>Gunakan Aplikasi Authenticator (TOTP)</span>
                                                </button>
                                            )}
                                            {(hasTotp || availableChannels.recovery) && (
                                                <button
                                                    type="button"
                                                    onClick={switchToRecovery}
                                                    className="text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span>🔑</span>
                                                    <span>Gunakan Kode Pemulihan (Recovery Code)</span>
                                                </button>
                                            )}
                                            {availableChannels.email && availableChannels.whatsapp && (
                                                <button
                                                    type="button"
                                                    onClick={() => switchToOtp(channel === 'email' || channel === 'resend' ? 'whatsapp' : 'email')}
                                                    disabled={forgotPasswordProcessing}
                                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    <span>{channel === 'email' || channel === 'resend' ? '📱' : '✉️'}</span>
                                                    <span>Kirim kode via {channel === 'email' || channel === 'resend' ? 'WhatsApp' : 'Email'}</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl space-y-2">
                            <div className="space-y-2">
                                {[
                                    { label: 'Min. 8 Karakter', valid: forgotPasswordValidations.length },
                                    { label: 'Konfirmasi Sesuai', valid: forgotPasswordValidations.match },
                                ].map((rule, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${rule.valid ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-tight ${rule.valid ? 'text-emerald-700' : 'text-slate-400'}`}>{rule.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={resetForgotPasswordFlow}
                                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Kembali
                            </button>
                            <button
                                type="submit"
                                disabled={isForgotPasswordSubmitDisabled}
                                className={`flex-1 py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 ${
                                    isForgotPasswordSubmitDisabled
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                                }`}
                            >
                                {forgotPasswordSubmitBtnText}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
