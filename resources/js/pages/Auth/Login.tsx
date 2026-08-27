import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';
import FlashMessage from '@/components/FlashMessage';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Modal from '@/components/Modal';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { useHoneypot } from '@/hooks/useHoneypot';
import HoneypotInputs from '@/components/HoneypotInputs';
import TurnstileWidget from '@/components/TurnstileWidget';

interface PageProps {
    status?: string;
    name: string;
    session_lifetime: number;
    otp_channel: string;
}

export default function Login() {
    const { status, name, session_lifetime, otp_channel } = usePage<PageProps>().props;
    const { honeypotData } = useHoneypot();
    const [turnstileToken, setTurnstileToken] = useState('');
    const [fpTurnstileToken, setFpTurnstileToken] = useState('');
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        login: '',
        password: '',
        remember: false,
        'cf-turnstile-response': '',
        ...honeypotData,
    });

    // Forgot Password Logic using custom hook
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const {
        data: forgotPasswordData,
        setData: setForgotPasswordData,
        processing: forgotPasswordProcessing,
        errors: forgotPasswordErrors,
        otpSent: forgotPasswordOtpSent,
        timer: forgotPasswordTimer,
        targetMasked,
        channel,
        validations: forgotPasswordValidations,
        isValid: isForgotPasswordValid,
        requestOtp: requestForgotPasswordOtp,
        submit: submitForgotPasswordReset,
    } = usePasswordManagement({
        routePath: route('password.update'),
        otpChannel: otp_channel,
        onSuccessCallback: () => setShowForgotPasswordModal(false),
        getTurnstileToken: () => fpTurnstileToken,
    });

    const isPasswordEmpty = forgotPasswordData.password.length === 0;
    const isOtpEmpty = forgotPasswordData.otp.length === 0;
    const isIdentityEmpty = forgotPasswordData.login.length === 0;

    let forgotPasswordSubmitBtnText = '';
    if (forgotPasswordProcessing) {
        forgotPasswordSubmitBtnText = 'Memproses...';
    } else if (isIdentityEmpty) {
        forgotPasswordSubmitBtnText = 'Isi Identitas Akun';
    } else if (isPasswordEmpty) {
        forgotPasswordSubmitBtnText = 'Isi Password Baru';
    } else if (!forgotPasswordValidations.length) {
        forgotPasswordSubmitBtnText = 'Password Terlalu Pendek';
    } else if (!forgotPasswordValidations.match) {
        forgotPasswordSubmitBtnText = 'Konfirmasi Password Salah';
    } else if (isOtpEmpty) {
        forgotPasswordSubmitBtnText = 'Isi Kode OTP';
    } else {
        forgotPasswordSubmitBtnText = 'Simpan Password';
    }

    const isForgotPasswordSubmitDisabled = forgotPasswordProcessing || isIdentityEmpty || isPasswordEmpty || isOtpEmpty || !isForgotPasswordValid;

    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

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
            onFinish: () => reset('password'),
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
                                    alt="Logo Bank Mini SMEACIS"
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
                        </div>

                        <div className="animate-[fade-up_0.9s_ease-out]">
                            <div className="mb-8 flex items-center gap-3 lg:hidden">
                                <img
                                    src="/images/bankmini-removebg-preview.png"
                                    alt="Logo Bank Mini SMEACIS"
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
                                    {/* Turnstile CAPTCHA */}
                                    <TurnstileWidget
                                        onVerify={(token) => {
                                            setTurnstileToken(token);
                                            setData('cf-turnstile-response', token);
                                        }}
                                        onExpire={() => {
                                            setTurnstileToken('');
                                            setData('cf-turnstile-response', '');
                                        }}
                                        onError={() => {
                                            setTurnstileToken('');
                                            setData('cf-turnstile-response', '');
                                        }}
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
                                                className="block w-full rounded-xl border border-slate-200 dark:border-slate-200 bg-[#ffffff] dark:bg-[#ffffff] py-3.5 pl-12 pr-4 text-sm font-medium text-[#0f172a] dark:text-[#0f172a] shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40"
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
                                                className="block w-full rounded-xl border border-slate-200 dark:border-slate-200 bg-[#ffffff] dark:bg-[#ffffff] py-3.5 pl-12 pr-12 text-sm font-medium text-[#0f172a] dark:text-[#0f172a] shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40"
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
                                        {(errors as any).turnstile && (
                                            <p className="text-center text-xs font-semibold text-rose-600">
                                                {(errors as any).turnstile}
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            <Modal
                show={showForgotPasswordModal}
                onClose={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordStep(1);
                    resetForgotPassword();
                }}
                title="Ganti Password"
                description="Masukkan identitas dan lengkapi form untuk mengganti password"
                maxWidth="sm"
            >
                <form onSubmit={submitForgotPasswordReset} className="space-y-6">
                    <HoneypotInputs setData={setForgotPasswordData} />
                    {/* Turnstile CAPTCHA for OTP request */}
                    <TurnstileWidget
                        onVerify={(token) => setFpTurnstileToken(token)}
                        onExpire={() => setFpTurnstileToken('')}
                        onError={() => setFpTurnstileToken('')}
                        size="compact"
                    />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Username / NIS / NIP / Email / No. Rekening</label>
                            <input
                                type="text"
                                value={forgotPasswordData.login}
                                onChange={(e) => setForgotPasswordData('login', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                placeholder="Masukkan identitas akun"
                                required
                            />
                            {forgotPasswordErrors.login && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{forgotPasswordErrors.login}</p>}
                        </div>

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
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode OTP (6 Digit)</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={forgotPasswordData.otp}
                                    onChange={e => setForgotPasswordData('otp', e.target.value)}
                                    className="w-[60%] bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center text-xl tracking-widest focus:ring-2 focus:ring-emerald-500"
                                    required
                                    maxLength={6}
                                    placeholder="000000"
                                />
                                <button
                                    type="button"
                                    onClick={requestForgotPasswordOtp}
                                    disabled={forgotPasswordProcessing || forgotPasswordTimer > 0 || isIdentityEmpty || isPasswordEmpty || !forgotPasswordValidations.length}
                                    className={`w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 whitespace-nowrap px-4 ${
                                        (forgotPasswordProcessing || forgotPasswordTimer > 0 || isIdentityEmpty || isPasswordEmpty || !forgotPasswordValidations.length)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                                    }`}
                                >
                                    {forgotPasswordOtpSent && forgotPasswordTimer === 0 ? 'Kirim Ulang' : (forgotPasswordProcessing ? 'Memproses...' : (forgotPasswordTimer > 0 ? `${forgotPasswordTimer}s` : 'Kirim Kode OTP'))}
                                </button>
                            </div>
                            {forgotPasswordErrors.otp && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{forgotPasswordErrors.otp}</p>}
                            {forgotPasswordOtpSent && !forgotPasswordErrors.otp && (
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    OTP sent to {(channel === 'email' || channel === 'resend') ? 'Email' : 'WhatsApp'}: {targetMasked}
                                </p>
                            )}
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

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isForgotPasswordSubmitDisabled}
                            className={`w-full py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 ${
                                isForgotPasswordSubmitDisabled
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                            }`}
                        >
                            {forgotPasswordSubmitBtnText}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
