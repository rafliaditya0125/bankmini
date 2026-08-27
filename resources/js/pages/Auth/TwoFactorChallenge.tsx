import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useRef, useEffect, FormEventHandler } from 'react';
import { useHoneypot } from '@/hooks/useHoneypot';
import HoneypotInputs from '@/components/HoneypotInputs';
import TurnstileWidget from '@/components/TurnstileWidget';

interface PageProps {
    status?: string;
    user_name?: string;
    user_email?: string;
}

export default function TwoFactorChallenge({ status, user_name, user_email }: PageProps) {
    const [recovery, setRecovery] = useState(false);
    const { honeypotData } = useHoneypot();
    const [turnstileToken, setTurnstileToken] = useState('');

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        code: '',
        recovery_code: '',
        'cf-turnstile-response': '',
        ...honeypotData,
    });

    const codeInputRef = useRef<HTMLInputElement>(null);
    const recoveryCodeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (recovery) {
            recoveryCodeInputRef.current?.focus();
        } else {
            codeInputRef.current?.focus();
        }
    }, [recovery]);

    const toggleRecovery = () => {
        const next = !recovery;
        setRecovery(next);
        clearErrors();
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.login.store'), {
            onError: () => {
                if (!recovery) {
                    codeInputRef.current?.select();
                } else {
                    recoveryCodeInputRef.current?.select();
                }
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
            <Head title="Verifikasi Dua Langkah (2FA)" />

            {/* Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Header Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/20 mb-4 ring-8 ring-emerald-500/10">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Verifikasi Dua Langkah</h1>
                    <p className="mt-1.5 text-xs font-medium text-slate-400">
                        {user_name ? `Masuk sebagai ${user_name}` : 'Konfirmasi identitas untuk melanjutkan'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="rounded-[2.5rem] bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
                    {status && (
                        <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-black text-emerald-400 text-center">
                            {status}
                        </div>
                    )}

                    <div className="mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4">
                        <p className="text-xs text-slate-300 leading-relaxed text-center font-medium">
                            {!recovery
                                ? 'Buka aplikasi authenticator Anda (Google Authenticator, Microsoft Authenticator, atau Authy) lalu masukkan 6 digit kode yang tampil.'
                                : 'Masukkan salah satu kode pemulihan (Recovery Code) darurat yang telah Anda simpan saat mengaktifkan 2FA.'}
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <HoneypotInputs setData={setData} />
                        {/* Turnstile CAPTCHA */}
                        <TurnstileWidget
                            onVerify={(token) => setTurnstileToken(token)}
                            onExpire={() => setTurnstileToken('')}
                            onError={() => setTurnstileToken('')}
                            theme="dark"
                        />
                        {(errors as any).turnstile && (
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider text-center">
                                {(errors as any).turnstile}
                            </p>
                        )}
                        {!recovery ? (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                    Kode Authenticator (6 Digit)
                                </label>
                                <input
                                    ref={codeInputRef}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={data.code}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setData('code', val);
                                    }}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-center text-3xl font-black tracking-[0.4em] text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono"
                                    placeholder="000000"
                                    autoFocus
                                />
                                {errors.code && (
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider text-center mt-2">
                                        {errors.code}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                    Kode Pemulihan (Recovery Code)
                                </label>
                                <input
                                    ref={recoveryCodeInputRef}
                                    type="text"
                                    value={data.recovery_code}
                                    onChange={(e) => setData('recovery_code', e.target.value)}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-center text-sm font-black tracking-widest text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono uppercase"
                                    placeholder="xxxx-xxxx-xxxx"
                                    autoFocus
                                />
                                {errors.recovery_code && (
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider text-center mt-2">
                                        {errors.recovery_code}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                disabled={processing || (!recovery && data.code.length < 6) || (recovery && !data.recovery_code)}
                                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] cursor-pointer ${processing || (!recovery && data.code.length < 6) || (recovery && !data.recovery_code)
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-500/20'
                                    }`}
                            >
                                {processing ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Memverifikasi...
                                    </div>
                                ) : (
                                    'Verifikasi & Masuk'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={toggleRecovery}
                                className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                                {!recovery ? 'Gunakan Kode Pemulihan (Recovery Code)' : 'Gunakan Kode Authenticator (6 Digit)'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Back to Login */}
                <div className="mt-8 text-center">
                    <Link
                        href={route('login')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Kembali ke Halaman Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
