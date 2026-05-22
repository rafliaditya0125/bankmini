import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';
import FlashMessage from '@/components/FlashMessage';

interface PageProps extends Record<string, unknown> {
    status?: string;
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        }
    }
}

export default function VerifyEmail() {
    const { status, auth } = usePage<PageProps>().props;
    const { data, setData, post, processing, errors } = useForm({
        otp: '',
    });

    const [timer, setTimer] = useState(0);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const sendOtp: FormEventHandler = (e) => {
        e.preventDefault();
        setSending(true);
        post(route('verification.send'), {
            onFinish: () => {
                setSending(false);
                setTimer(60);
            }
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.verify'));
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center px-4">
            <Head title="Verifikasi Email" />
            <FlashMessage />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_55%)]" />
            <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-200/70 blur-3xl animate-[float-slow_18s_ease-in-out_infinite]" />
            <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl animate-[float-slow_24s_ease-in-out_infinite]" />

            <div className="relative z-10 w-full max-w-md animate-[fade-up_0.7s_ease-out]">
                <div className="bg-white/85 rounded-3xl border border-slate-200/60 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                    <div className="flex justify-center mb-8">
                        <div className="h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>

                    <div className="text-center mb-8 space-y-2">
                        <h1 className="text-2xl font-bold text-slate-900">Verifikasi Email Anda</h1>
                        <p className="text-sm text-slate-500">
                            Halo <span className="font-semibold text-slate-900">{auth.user.name}</span>, silakan verifikasi email <span className="font-semibold text-slate-900">{auth.user.email}</span> untuk dapat mengakses seluruh fitur sistem.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kode OTP (6 Digit)</label>
                                <input
                                    type="text"
                                    value={data.otp}
                                    onChange={e => setData('otp', e.target.value)}
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-emerald-500 shadow-inner"
                                />
                                {errors.otp && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center mt-2">{errors.otp}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || data.otp.length < 6}
                                className={`w-full py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-xl ${
                                    (processing || data.otp.length < 6)
                                    ? 'bg-slate-300 text-slate-100 cursor-not-allowed shadow-none'
                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                }`}
                            >
                                {processing ? 'Memverifikasi...' : 'Verifikasi Sekarang'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
                        <p className="text-xs text-slate-400 font-medium">Belum menerima kode OTP?</p>
                        <button
                            onClick={sendOtp}
                            disabled={sending || timer > 0}
                            className={`text-xs font-black uppercase tracking-widest transition-all ${
                                (sending || timer > 0)
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-emerald-600 hover:text-emerald-700 active:scale-95'
                            }`}
                        >
                            {sending ? 'Mengirim...' : (timer > 0 ? `Kirim Ulang (${timer}s)` : 'Kirim Kode OTP Baru')}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">SMEA-CIS Bank Mini System &copy; 2026</p>
                </div>
            </div>
        </div>
    );
}
