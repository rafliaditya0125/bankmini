import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import type { User } from '@/types';

export default function Profile() {
    const { auth, must_change_password, otp_channel } = usePage<any>().props;
    const user = auth.user as User;

    // Determine route prefix based on role for dynamic routing
    const routePrefix = user.role === 'nasabah' ? 'nasabah' : 
                       (user.role === 'teller' ? 'teller' : 
                       (user.role === 'admin' ? 'admin' : 'superadmin'));

    // Modal States
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(must_change_password || false);
    const [isMandatoryFlow, setIsMandatoryFlow] = useState(must_change_password || false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [stagedPhoto, setStagedPhoto] = useState<File | null>(null);

    // Modal Flow States
    const [phoneStep, setPhoneStep] = useState(1); // 1: Input Phone, 2: Input OTP
    const [emailStep, setEmailStep] = useState(1); // 1: Verify Old, 2: Verify New
    const [passwordMode, setPasswordMode] = useState<'change' | 'reset'>('change'); // 'change': requires current_password, 'reset': OTP only

    // Form states
    const { data: emailData, setData: setEmailData, post: postEmail, put: putEmail, processing: emailProcessing, errors: emailErrors, reset: resetEmail } = useForm({
        email: '',
        otp: '',
    });

    // Form states
    const { data: passwordData, setData: setPasswordData, post: postPassword, put: putPassword, processing: passwordProcessing, errors: passwordErrors, reset: resetPassword } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
        otp: '',
    });

    const { data: infoData, setData: setInfoData, post: postInfo, put: putInfo, processing: infoProcessing, errors: infoErrors } = useForm({
        phone: user.phone || '',
        otp: '',
    });

    // Password Validation Logic
    const [passwordValidations, setPasswordValidations] = useState({
        length: false,
        noMatchUsername: false,
        match: false,
    });

    useEffect(() => {
        const p = passwordData.password;
        const pc = passwordData.password_confirmation;
        setPasswordValidations({
            length: p.length >= 8,
            noMatchUsername: p.length > 0 && p.toLowerCase() !== (user.username || '').toLowerCase() && p.toLowerCase() !== (user.name || '').toLowerCase(),
            match: p.length > 0 && p === pc,
        });
    }, [passwordData.password, passwordData.password_confirmation, user.username, user.name]);

    const isPasswordValid = Object.values(passwordValidations).every(Boolean);

    // Photo Management
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const photoInput = useRef<HTMLInputElement>(null);
    const [photoProcessing, setPhotoProcessing] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Frontend validation for file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                setPhotoError('Ukuran foto maksimal adalah 2MB.');
                return;
            }
            
            setPhotoError(null);
            const reader = new FileReader();
            reader.onload = (e) => setPhotoPreview(e.target?.result as string);
            reader.readAsDataURL(file);
            setStagedPhoto(file);
        }
    };

    const confirmPhotoUpload = () => {
        if (!stagedPhoto) return;
        
        setPhotoError(null);
        setPhotoProcessing(true);
        
        router.post(route(`${routePrefix}.profil.photo.update`), {
            photo: stagedPhoto
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setPhotoProcessing(false);
                setShowPhotoModal(false);
                setStagedPhoto(null);
                setPhotoPreview(null);
            },
            onError: (errors) => {
                setPhotoProcessing(false);
                setPhotoError(errors.photo || 'Gagal mengunggah foto.');
            }
        });
    };

    const cancelPhotoUpload = () => {
        setStagedPhoto(null);
        setPhotoPreview(null);
        setShowPhotoModal(false);
        if (photoInput.current) photoInput.current.value = '';
    };

    const removePhoto = () => {
        if (confirm('Hapus foto profil?')) {
            router.delete(route(`${routePrefix}.profil.photo.remove`), {
                onSuccess: () => setShowPhotoModal(false)
            });
        }
    };

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const targetUrl = passwordMode === 'reset' 
            ? route(`${routePrefix}.profil.reset-password`) 
            : route(`${routePrefix}.profil.password`);
        
        const submitFn = passwordMode === 'reset' ? postPassword : putPassword;
        
        submitFn(targetUrl, {
            preserveScroll: true,
            onSuccess: () => {
                resetPassword();
                setShowPasswordModal(false);
                setIsMandatoryFlow(false);
                setPasswordMode('change');
            },
            onError: (errors) => {
                if (Object.keys(errors).length === 0) {
                    alert('Terjadi kesalahan yang tidak diketahui saat memperbarui password.');
                }
            }
        });
    };

    const [otpSent, setOtpSent] = useState(false);
    const [oldOtpSent, setOldOtpSent] = useState(false);
    const [newOtpSent, setNewOtpSent] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const validateEmail = (email: string) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError(null);

        if (emailStep === 1) {
            postEmail(route(`${routePrefix}.profil.email-verify-old`), {
                preserveScroll: true,
                onSuccess: () => {
                    setEmailStep(2);
                    setNewOtpSent(true);
                    setTimer(60);
                    setEmailData('otp', ''); // Clear OTP field for next step
                },
                onError: (errors) => {
                    if (errors.otp) setOtpError('kode otp email lama salah');
                }
            });
            return;
        }

        putEmail(route(`${routePrefix}.profil.email`), {
            preserveScroll: true,
            onSuccess: () => {
                setShowEmailModal(false);
                resetEmail();
                setOldOtpSent(false);
                setNewOtpSent(false);
                setEmailStep(1);
                setOtpError(null);
                setTimer(0);
                setRequestCount(0);
            },
            onError: (errors) => {
                if (errors.otp) setOtpError('kode otp email baru salah');
            }
        });
    };

    const requestEmailOtp = () => {
        if (!validateEmail(emailData.email) || timer > 0) return;
        
        setOtpError(null);
        
        if (emailStep === 1) {
            postEmail(route(`${routePrefix}.profil.email-otp`), { 
                preserveScroll: true,
                onSuccess: () => {
                    setOldOtpSent(true);
                    const nextCount = requestCount + 1;
                    setRequestCount(nextCount);
                    setTimer(60 * Math.pow(2, nextCount - 1));
                },
            });
        }
    };

    const handleInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (phoneStep === 1) {
            postInfo(route(`${routePrefix}.profil.phone-otp`), {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setPhoneStep(2),
            });
            return;
        }

        putInfo(route(`${routePrefix}.profil.update`), {
            preserveScroll: true,
            onSuccess: () => {
                setShowPhoneModal(false);
                setPhoneStep(1);
            }
        });
    };

    const handleClosePasswordModal = () => {
        if (isMandatoryFlow) {
            setShowPasswordModal(false);
            setShowWarningModal(true);
        } else {
            setShowPasswordModal(false);
            setPasswordMode('change');
        }
    };

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    // Render forms inside Modals
    const renderEmailForm = () => {
        const isEmailValid = validateEmail(emailData.email);
        const isEmailEmpty = emailData.email.length === 0;
        const isOtpEmpty = emailData.otp.length === 0;

        let sendOtpBtnText = 'Kirim Kode OTP';
        if (emailProcessing) sendOtpBtnText = 'Memproses...';
        else if (timer > 0) sendOtpBtnText = `${timer}s`;
        else if (isEmailEmpty) sendOtpBtnText = 'isi email';
        else if (!isEmailValid) sendOtpBtnText = 'isi email dengan benar';

        let submitBtnText = emailStep === 1 ? 'Lanjut' : 'Ubah Email';
        if (emailProcessing) submitBtnText = 'Memproses...';
        else if (isOtpEmpty) submitBtnText = 'isi otp';

        const isSendOtpDisabled = !isEmailValid || emailProcessing || timer > 0;
        const isSubmitDisabled = emailProcessing || isOtpEmpty || (emailStep === 1 && !oldOtpSent);

        return (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Email Baru
                        </label>
                        <input
                            type="email"
                            value={emailData.email}
                            disabled={emailStep === 2}
                            onChange={e => {
                                setEmailData('email', e.target.value);
                                setOldOtpSent(false);
                                setTimer(0);
                                setRequestCount(0);
                            }}
                            className={`w-full border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 ${emailStep === 2 ? 'bg-slate-100 opacity-70' : 'bg-slate-50'}`}
                            required
                            placeholder="nama@email.com"
                        />
                        {emailErrors.email && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{emailErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {emailStep === 1 ? 'Kode OTP (Email Lama)' : 'Kode OTP (Email Baru)'}
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={emailData.otp}
                                onChange={e => {
                                    setEmailData('otp', e.target.value);
                                    setOtpError(null);
                                }}
                                className="w-[60%] bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center text-xl tracking-widest focus:ring-2 focus:ring-emerald-500"
                                required
                                maxLength={6}
                                placeholder="000000"
                            />
                            {emailStep === 1 && (
                                <button
                                    type="button"
                                    onClick={requestEmailOtp}
                                    disabled={isSendOtpDisabled}
                                    className={`w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 whitespace-nowrap px-4 ${
                                        isSendOtpDisabled 
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                                    }`}
                                >
                                    {oldOtpSent && timer === 0 ? 'Kirim Ulang' : sendOtpBtnText}
                                </button>
                            )}
                        </div>
                        {otpError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{otpError}</p>}
                        {emailStep === 1 && oldOtpSent && !otpError && (
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic animate-pulse">OTP dikirim ke email lama: {user.email}</p>
                        )}
                        {emailStep === 2 && newOtpSent && (
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic animate-pulse">OTP dikirim ke email baru: {emailData.email}</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    {emailStep === 2 && (
                        <button
                            type="button"
                            onClick={() => {
                                setEmailStep(1);
                                setOldOtpSent(false);
                                setTimer(0);
                                setEmailData('otp', '');
                            }}
                            className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 ${
                            isSubmitDisabled 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                        }`}
                    >
                        {submitBtnText}
                    </button>
                </div>
            </form>
        );
    };

    const [passwordOtpSent, setPasswordOtpSent] = useState(false);
    const [passwordTimer, setPasswordTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (passwordTimer > 0) {
            interval = setInterval(() => {
                setPasswordTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [passwordTimer]);

    const requestPasswordOtp = () => {
        if (passwordTimer > 0) return;
        
        postPassword(route(`${routePrefix}.profil.password-otp`), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setPasswordOtpSent(true);
                setPasswordTimer(60);
            },
        });
    };

    const renderPasswordForm = () => {
        const isPasswordEmpty = passwordData.password.length === 0;
        const isOtpEmpty = passwordMode === 'reset' && passwordData.otp.length === 0;
        const isCurrentPasswordEmpty = passwordMode === 'change' && passwordData.current_password.length === 0;

        let sendOtpBtnText = 'Kirim Kode OTP';
        if (passwordProcessing) sendOtpBtnText = 'Memproses...';
        else if (passwordTimer > 0) sendOtpBtnText = `${passwordTimer}s`;

        const isSendOtpDisabled = (passwordMode === 'change' && isCurrentPasswordEmpty) || isPasswordEmpty || !isPasswordValid || passwordProcessing || passwordTimer > 0;

        let submitBtnText = '';
        if (passwordProcessing) {
            submitBtnText = 'Memproses...';
        } else if (passwordMode === 'change' && isCurrentPasswordEmpty) {
            submitBtnText = 'Isi Password Saat Ini';
        } else if (isPasswordEmpty) {
            submitBtnText = 'Isi Password Baru';
        } else if (!passwordValidations.length) {
            submitBtnText = 'Password Terlalu Pendek';
        } else if (!passwordValidations.noMatchUsername) {
            submitBtnText = 'Password Tidak Boleh Identitas';
        } else if (!passwordValidations.match) {
            submitBtnText = 'Konfirmasi Password Salah';
        } else if (isOtpEmpty) {
            submitBtnText = 'Isi Kode OTP';
        } else {
            submitBtnText = isMandatoryFlow ? 'Aktifkan Akun Saya' : 'Konfirmasi & Simpan';
        }

        const isSubmitDisabled = passwordProcessing || isPasswordEmpty || isOtpEmpty || !isPasswordValid || (passwordMode === 'change' && isCurrentPasswordEmpty);

        return (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                    {passwordMode === 'change' && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Saat Ini</label>
                            <input
                                type="password"
                                value={passwordData.current_password}
                                onChange={e => setPasswordData('current_password', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                required
                                autoComplete="current-password"
                            />
                            {passwordErrors.current_password && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{passwordErrors.current_password}</p>}
                            <button 
                                type="button"
                                onClick={() => setPasswordMode('reset')}
                                className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors"
                            >
                                Lupa Password Anda?
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Baru</label>
                        <input
                            type="password"
                            value={passwordData.password}
                            onChange={e => setPasswordData('password', e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                            required
                            autoComplete="new-password"
                        />
                        {passwordErrors.password && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{passwordErrors.password}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Konfirmasi Password</label>
                        <input
                            type="password"
                            value={passwordData.password_confirmation}
                            onChange={e => setPasswordData('password_confirmation', e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                            required
                            autoComplete="new-password"
                        />
                        {passwordErrors.password_confirmation && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{passwordErrors.password_confirmation}</p>}
                    </div>

                    {passwordMode === 'reset' && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode OTP (6 Digit)</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={passwordData.otp}
                                    onChange={e => setPasswordData('otp', e.target.value)}
                                    className="w-[60%] bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center text-xl tracking-widest focus:ring-2 focus:ring-emerald-500"
                                    required
                                    maxLength={6}
                                    placeholder="000000"
                                />
                                <button
                                    type="button"
                                    onClick={requestPasswordOtp}
                                    disabled={isSendOtpDisabled}
                                    className={`w-[40%] rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 whitespace-nowrap px-4 ${
                                        isSendOtpDisabled 
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                                    }`}
                                >
                                    {passwordOtpSent && passwordTimer === 0 ? 'Kirim Ulang' : sendOtpBtnText}
                                </button>
                            </div>
                            {passwordErrors.otp && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{passwordErrors.otp}</p>}
                            {passwordOtpSent && !passwordErrors.otp && (
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">OTP telah dikirim ke {(otp_channel === 'email' || otp_channel === 'resend') ? 'Email' : 'WhatsApp'} Anda</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-amber-50 rounded-xl space-y-2">
                    <div className="space-y-2">
                        {[
                            { label: 'Min. 8 Karakter', valid: passwordValidations.length },
                            { label: 'Bukan username/nama', valid: passwordValidations.noMatchUsername },
                            { label: 'Konfirmasi Sesuai', valid: passwordValidations.match },
                        ].map((rule, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${rule.valid ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-tight ${rule.valid ? 'text-emerald-700' : 'text-slate-400'}`}>{rule.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className={`flex-1 py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 ${
                            isSubmitDisabled
                            ? 'bg-slate-300 shadow-none'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                        }`}
                    >
                        {submitBtnText}
                    </button>
                </div>
            </form>
        );
    };

    return (
        <DashboardLayout
            header={
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profil Saya</h1>
                    <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-widest">Informasi akun dan keamanan</p>
                </div>
            }
        >
            <Head title="Profil Saya" />

            <div className="mx-auto space-y-8 pb-12">
                {/* Hero Card */}
                <div className="rounded-[2.5rem] bg-slate-900 p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    
                    <div className="relative flex flex-col md:flex-row gap-10 items-center">
                        <div className="relative group/photo">
                            <div 
                                className="h-40 w-40 rounded-[2.5rem] bg-white/10 p-1.5 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm cursor-pointer"
                                onClick={() => setShowPhotoModal(true)}
                            >
                                {user.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt={user.name} className="h-full w-full object-cover rounded-[2.2rem]" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-5xl font-black text-emerald-400">
                                        {getInitial(user.name)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="absolute -bottom-2 -right-2 flex gap-2">
                                <button
                                    onClick={() => setShowPhotoModal(true)}
                                    className="h-10 w-10 rounded-[1rem] bg-emerald-500 text-white flex items-center justify-center shadow-xl hover:bg-emerald-400 transition-all active:scale-90"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-white tracking-tight">{user.name}</h2>
                                <p className="text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px]">{user.role}</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 border-t border-white/5 pt-6">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Username/ID</p>
                                    <p className="text-sm font-black text-white tracking-widest uppercase">{user.username || user.nis || user.nip || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Email</p>
                                    <p className="text-sm font-black text-white tracking-tight">{user.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">No. Telepon</p>
                                    <p className="text-sm font-black text-white tracking-tight">{user.phone || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Phone Button */}
                    <button 
                        onClick={() => setShowPhoneModal(true)}
                        className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">No. Telepon</h3>
                        <p className="text-[10px] text-slate-500">Update nomor HP</p>
                    </button>

                    {/* Email Button */}
                    <button 
                        onClick={() => setShowEmailModal(true)}
                        className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Email</h3>
                        <p className="text-[10px] text-slate-500">Ganti alamat email</p>
                    </button>

                    {/* Password Button */}
                    <button
                        onClick={() => {
                            setIsMandatoryFlow(false);
                            setPasswordMode('change');
                            setShowPasswordModal(true);
                        }}
                        className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-700 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Ganti Password</h3>
                        <p className="text-[10px] text-slate-500">Update sandi rutin</p>
                    </button>
                </div>
            </div>

            {/* Photo Modal */}
            <Modal
                show={showPhotoModal}
                onClose={cancelPhotoUpload}
                title="Update Foto Profil"
                maxWidth="sm"
            >
                <div className="flex flex-col items-center space-y-6">
                    <div className="h-40 w-40 rounded-[2.5rem] bg-slate-100 p-1.5 border border-slate-200 shadow-xl overflow-hidden relative group">
                        {photoPreview ? (
                            <img src={photoPreview} className="h-full w-full object-cover rounded-[2.2rem]" />
                        ) : user.profile_photo_url ? (
                            <img src={user.profile_photo_url} alt={user.name} className="h-full w-full object-cover rounded-[2.2rem]" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-5xl font-black text-emerald-400">
                                {getInitial(user.name)}
                            </div>
                        )}
                        {!photoPreview && (
                            <div 
                                onClick={() => photoInput.current?.click()}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[2.2rem]"
                            >
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">Ganti</span>
                            </div>
                        )}
                    </div>
                    
                    <input type="file" ref={photoInput} onChange={handlePhotoSelect} className="hidden" accept="image/*" />

                    {!stagedPhoto ? (
                        <div className="w-full flex gap-3">
                            <button
                                type="button"
                                onClick={() => photoInput.current?.click()}
                                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
                            >
                                Pilih Foto
                            </button>
                            {user.profile_photo_url && !user.profile_photo_url.includes('ui-avatars') && (
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 cursor-pointer"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full space-y-3">
                            {photoError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">{photoError}</p>}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={cancelPhotoUpload}
                                    disabled={photoProcessing}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmPhotoUpload}
                                    disabled={photoProcessing}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all cursor-pointer disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    {photoProcessing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Email Modal */}
            <Modal
                show={showEmailModal}
                onClose={() => {
                    setShowEmailModal(false);
                }}
                title="Update Alamat Email"
                maxWidth="sm"
            >
                {renderEmailForm()}
            </Modal>

            {/* Modals */}
            <Modal
                show={showPhoneModal}
                onClose={() => {
                    setShowPhoneModal(false);
                    setPhoneStep(1);
                }}
                title="Update Nomor Telepon"
                maxWidth="sm"
            >
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                    {phoneStep === 1 ? (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Telepon Baru</label>
                            <input
                                type="text"
                                value={infoData.phone}
                                onChange={e => setInfoData('phone', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                placeholder="Contoh: 081234567890"
                            />
                            {infoErrors.phone && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{infoErrors.phone}</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">OTP dikirim ke WhatsApp baru</p>
                                    <p className="text-xs font-black text-emerald-600 tracking-widest uppercase">{infoData.phone}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode OTP (6 Digit)</label>
                                <input
                                    type="text"
                                    value={infoData.otp}
                                    onChange={e => setInfoData('otp', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-700 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-emerald-500"
                                    required
                                    maxLength={6}
                                    placeholder="000000"
                                />
                                {infoErrors.otp && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{infoErrors.otp}</p>}
                            </div>
                        </div>
                    )}
                    <div className="pt-2 flex gap-3">
                        {phoneStep === 2 && (
                            <button
                                type="button"
                                onClick={() => setPhoneStep(1)}
                                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
                            >
                                Kembali
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={infoProcessing}
                            className={`flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                                infoProcessing
                                ? 'bg-slate-300 shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'
                            }`}
                        >
                            {infoProcessing ? 'Memproses...' : (phoneStep === 1 ? 'Kirim Kode OTP' : 'Konfirmasi & Simpan')}
                        </button>
                    </div>
                    </form>
                    </Modal>

                    {/* General Password Modal */}
            <Modal
                show={showPasswordModal}
                onClose={handleClosePasswordModal}
                title={passwordMode === 'reset' ? "Ganti Password" : (isMandatoryFlow ? "Aktivasi Akun" : "Ganti Password")}
                description={passwordMode === 'reset' ? "Gunakan OTP untuk mengganti password" : (isMandatoryFlow ? "Lengkapi password baru Anda" : "Masukkan password lama dan password baru")}
                maxWidth="sm"
                closeOnOverlayClick={!isMandatoryFlow}
            >
                {renderPasswordForm()}
            </Modal>

            {/* Step 1 Mandatory Warning Modal */}
            <Modal
                show={showWarningModal && must_change_password}
                onClose={() => {}}
                maxWidth="md"
                closeable={false}
                showCloseButton={false}
                closeOnOverlayClick={false}
            >
                <div className="text-center p-4">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 mb-6">
                        <svg className="h-10 w-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Wajib Ganti Password</h3>
                    <p className="text-sm font-medium text-slate-500 mb-8">
                        Demi perlindungan dan keamanan data Anda, Anda <b>DIWAJIBKAN</b> mengganti password awal (bawaan) Anda sebelum dapat mengakses dasbor sistem sepenuhnya.
                    </p>
                    
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowWarningModal(false);
                                setIsMandatoryFlow(true);
                                setShowPasswordModal(true);
                            }}
                            className="w-full py-4 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all cursor-pointer"
                        >
                            Saya Mengerti, Ganti Password
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => router.post(route('logout'))}
                            className="w-full py-4 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-rose-600 transition-all rounded-2xl border-2 border-slate-50 hover:border-rose-100 hover:bg-rose-50 cursor-pointer"
                        >
                            Tidak Sekarang (Keluar / Logout)
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
