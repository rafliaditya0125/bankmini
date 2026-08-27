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

    // 2FA / MFA States
    const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
    const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);
    const [showDisableTwoFactorModal, setShowDisableTwoFactorModal] = useState(false);
    const [twoFactorStep, setTwoFactorStep] = useState<1 | 2 | 3>(1); // 1: QR & Secret, 2: Confirm OTP, 3: Show Recovery Codes
    const [twoFactorQrSvg, setTwoFactorQrSvg] = useState<string>('');
    const [twoFactorSecretKey, setTwoFactorSecretKey] = useState<string>('');
    const [twoFactorOtp, setTwoFactorOtp] = useState<string>('');
    const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
    const [twoFactorLoading, setTwoFactorLoading] = useState(false);
    const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);
    const [recoveryCopied, setRecoveryCopied] = useState(false);

    // Modal Flow States
    const [phoneStep, setPhoneStep] = useState(1); // 1: Input Phone, 2: Input OTP
    const [emailStep, setEmailStep] = useState(1); // 1: Verify Old, 2: Verify New
    const [passwordMode, setPasswordMode] = useState<'change' | 'reset'>('change'); // 'change': requires current_password, 'reset': OTP only
    const [showPassword, setShowPassword] = useState(false);

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

    // 2FA Functions
    const getCsrfToken = () => {
        if (typeof document === 'undefined') return '';
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            const token = metaTag.getAttribute('content');
            if (token) return token;
        }
        const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : '';
    };

    const startTwoFactorSetup = async () => {
        setShowTwoFactorSetupModal(true);
        setTwoFactorStep(1);
        setTwoFactorLoading(true);
        setTwoFactorError(null);
        try {
            const res = await fetch(route(`${routePrefix}.profil.two-factor.enable`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });
            const data = await res.json();
            if (res.ok) {
                setTwoFactorQrSvg(data.svg);
                setTwoFactorSecretKey(data.secretKey);
                setTwoFactorStep(1);
                setTwoFactorOtp('');
            } else {
                setTwoFactorError(data.message || 'Gagal memulai aktivasi 2FA.');
            }
        } catch (err: any) {
            setTwoFactorError(err?.message || 'Terjadi kesalahan koneksi saat memulai 2FA.');
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const confirmTwoFactorOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!twoFactorOtp || twoFactorOtp.length !== 6) {
            setTwoFactorError('Masukkan 6 digit kode dari aplikasi authenticator.');
            return;
        }
        setTwoFactorLoading(true);
        setTwoFactorError(null);
        try {
            const res = await fetch(route(`${routePrefix}.profil.two-factor.confirm`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ code: twoFactorOtp }),
            });
            const data = await res.json();
            if (res.ok) {
                setTwoFactorRecoveryCodes(data.recoveryCodes || []);
                setTwoFactorStep(3);
                router.reload({ preserveScroll: true });
            } else {
                setTwoFactorError(data.message || 'Kode autentikasi tidak valid. Periksa kembali aplikasi Anda.');
            }
        } catch (err: any) {
            setTwoFactorError(err?.message || 'Terjadi kesalahan koneksi saat memverifikasi kode 2FA.');
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const viewRecoveryCodes = async () => {
        setShowRecoveryCodesModal(true);
        setTwoFactorLoading(true);
        setTwoFactorError(null);
        try {
            const res = await fetch(route(`${routePrefix}.profil.two-factor.recovery-codes`), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (res.ok) {
                setTwoFactorRecoveryCodes(data.recoveryCodes || []);
            } else {
                setTwoFactorError(data.message || 'Gagal memuat kode pemulihan.');
            }
        } catch (err: any) {
            setTwoFactorError(err?.message || 'Gagal menghubungi server.');
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const regenerateRecoveryCodes = async () => {
        if (!confirm('Apakah Anda yakin ingin membuat kode pemulihan baru? Semua kode pemulihan sebelumnya tidak akan dapat digunakan lagi.')) return;
        setTwoFactorLoading(true);
        try {
            const res = await fetch(route(`${routePrefix}.profil.two-factor.regenerate-recovery-codes`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });
            const data = await res.json();
            if (res.ok) {
                setTwoFactorRecoveryCodes(data.recoveryCodes || []);
                alert('Kode pemulihan baru berhasil dibuat. Harap salin dan simpan di tempat yang aman.');
            } else {
                alert(data.message || 'Gagal membuat kode baru.');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat membuat kode pemulihan baru.');
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const disableTwoFactor = () => {
        router.delete(route(`${routePrefix}.profil.two-factor.disable`), {
            preserveScroll: true,
            onSuccess: () => {
                setShowDisableTwoFactorModal(false);
                setShowTwoFactorSetupModal(false);
                setShowRecoveryCodesModal(false);
            },
        });
    };

    const copySecretKey = () => {
        if (twoFactorSecretKey) {
            navigator.clipboard.writeText(twoFactorSecretKey);
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2500);
        }
    };

    const copyRecoveryCodes = () => {
        if (twoFactorRecoveryCodes.length > 0) {
            navigator.clipboard.writeText(twoFactorRecoveryCodes.join('\n'));
            setRecoveryCopied(true);
            setTimeout(() => setRecoveryCopied(false), 2500);
        }
    };

    const downloadRecoveryCodesTxt = () => {
        const content = `====================================================
KODE PEMULIHAN 2FA (TWO-FACTOR RECOVERY CODES)
Bank Mini
====================================================
Pengguna : ${user.name} (${user.username || user.email || '-'})
Tanggal  : ${new Date().toLocaleString('id-ID')}

PENTING:
- Simpan kode ini di tempat yang sangat aman.
- Setiap kode hanya dapat digunakan 1 (satu) kali jika Anda kehilangan
  akses ke Google Authenticator, Microsoft Authenticator, atau Authy.
----------------------------------------------------
${twoFactorRecoveryCodes.join('\n')}
====================================================`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bankmini-2fa-recovery-codes-${user.username || 'user'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Auto open 2FA setup if opened with #two-factor or ?setup_2fa=1
    const checkAndTriggerTwoFactor = () => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        if (hash === '#two-factor' || searchParams.get('setup_2fa') === '1' || searchParams.get('action') === '2fa') {
            const el = document.getElementById('two-factor-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
            if (!user.two_factor_enabled) {
                startTwoFactorSetup();
            } else {
                viewRecoveryCodes();
            }
        }
    };

    useEffect(() => {
        checkAndTriggerTwoFactor();
        window.addEventListener('hashchange', checkAndTriggerTwoFactor);
        return () => {
            window.removeEventListener('hashchange', checkAndTriggerTwoFactor);
        };
    }, [user.two_factor_enabled]);

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
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.current_password}
                                    onChange={e => setPasswordData('current_password', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
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
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.password}
                                onChange={e => setPasswordData('password', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
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
                        {passwordErrors.password && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{passwordErrors.password}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Konfirmasi Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.password_confirmation}
                                onChange={e => setPasswordData('password_confirmation', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-black text-slate-700 focus:ring-2 focus:ring-emerald-500"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Phone Button */}
                    <button 
                        onClick={() => setShowPhoneModal(true)}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-100 dark:hover:border-slate-700 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">No. Telepon</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Update nomor HP</p>
                    </button>

                    {/* Email Button */}
                    <button 
                        onClick={() => setShowEmailModal(true)}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-100 dark:hover:border-slate-700 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Email</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Ganti alamat email</p>
                    </button>

                    {/* Password Button */}
                    <button
                        onClick={() => {
                            setIsMandatoryFlow(false);
                            setPasswordMode('change');
                            setShowPasswordModal(true);
                        }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
                    >
                        <div className="h-12 w-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 mb-3 group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Ganti Password</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Update sandi rutin</p>
                    </button>

                    {/* 2FA Quick Action Button */}
                    <button
                        onClick={() => {
                            if (user.two_factor_enabled) {
                                viewRecoveryCodes();
                            } else {
                                startTwoFactorSetup();
                            }
                        }}
                        className={`rounded-[2rem] p-6 border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-all cursor-pointer group ${
                            user.two_factor_enabled
                                ? 'bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-800/40 hover:border-emerald-300'
                                : 'bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200 dark:border-amber-900/40 hover:border-amber-300'
                        }`}
                    >
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${
                            user.two_factor_enabled
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                        }`}>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Otentikasi 2FA</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${
                            user.two_factor_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                            {user.two_factor_enabled ? 'Aktif & Terlindungi' : 'Belum Aktif'}
                        </p>
                    </button>
                </div>

                {/* Dedicated 2FA / MFA Management Card */}
                <div id="two-factor-section" className="rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-3 max-w-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                                    user.two_factor_enabled 
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                                }`}>
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            Otentikasi Dua Faktor (2FA / MFA)
                                        </h3>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                            user.two_factor_enabled
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                        }`}>
                                            {user.two_factor_enabled ? 'Aktif & Terlindungi' : 'Belum Aktif'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Perlindungan ganda akun Anda menggunakan kode OTP 6-digit dari aplikasi authenticator di ponsel Anda.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Google Authenticator
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span> Microsoft Authenticator
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                                    <span className="h-2 w-2 rounded-full bg-red-500"></span> Twilio Authy
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {user.two_factor_enabled ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={viewRecoveryCodes}
                                        disabled={twoFactorLoading}
                                        className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        Kode Pemulihan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDisableTwoFactorModal(true)}
                                        className="px-5 py-3.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95 cursor-pointer"
                                    >
                                        Nonaktifkan 2FA
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startTwoFactorSetup}
                                    disabled={twoFactorLoading}
                                    className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                                >
                                    {twoFactorLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Memuat...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Aktifkan 2FA Sekarang
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
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
            {/* 2FA Setup Modal */}
            <Modal
                show={showTwoFactorSetupModal}
                onClose={() => {
                    if (twoFactorStep === 3) {
                        setShowTwoFactorSetupModal(false);
                    } else if (confirm('Batalkan proses aktivasi 2FA?')) {
                        setShowTwoFactorSetupModal(false);
                        setTwoFactorStep(1);
                        setTwoFactorError(null);
                    }
                }}
                title={
                    twoFactorStep === 1
                        ? '1. Pindai Kode QR Authenticator'
                        : twoFactorStep === 2
                        ? '2. Verifikasi Kode OTP 6-Digit'
                        : '🎉 2FA Berhasil Diaktifkan!'
                }
                description={
                    twoFactorStep === 1
                        ? 'Gunakan Google Authenticator, Microsoft Authenticator, atau Authy'
                        : twoFactorStep === 2
                        ? 'Masukkan kode yang muncul di aplikasi authenticator Anda'
                        : 'Simpan kode pemulihan darurat ini di tempat yang aman'
                }
                maxWidth="md"
            >
                <div className="space-y-6">
                    {twoFactorError && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs font-black text-rose-600 dark:text-rose-400 space-y-2">
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{twoFactorError}</span>
                            </div>
                            {twoFactorStep === 1 && (
                                <button
                                    type="button"
                                    onClick={startTwoFactorSetup}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Coba Lagi
                                </button>
                            )}
                        </div>
                    )}

                    {twoFactorStep === 1 && (
                        <div className="space-y-6 text-center">
                            {/* QR Code container */}
                            <div className="p-4 bg-white rounded-3xl shadow-inner border border-slate-100 dark:border-slate-800 flex justify-center items-center max-w-[240px] mx-auto min-h-[220px]">
                                {twoFactorLoading ? (
                                    <div className="h-48 w-48 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                                        <svg className="animate-spin h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Menyiapkan QR Code...</span>
                                    </div>
                                ) : twoFactorQrSvg ? (
                                    <div
                                        className="[&>svg]:w-full [&>svg]:h-full [&>svg]:rounded-xl"
                                        dangerouslySetInnerHTML={{ __html: twoFactorQrSvg }}
                                    />
                                ) : (
                                    <div className="h-48 w-48 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                        <span>Gagal memuat QR Code.</span>
                                        <button
                                            type="button"
                                            onClick={startTwoFactorSetup}
                                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold"
                                        >
                                            Muat Ulang
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Manual Setup Key */}
                            <div className="space-y-2 text-left">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Kunci Pengaturan Manual (Jika tidak bisa scan QR)
                                </label>
                                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                                    <span className="font-mono text-xs font-black tracking-widest text-slate-800 dark:text-slate-100 break-all select-all">
                                        {twoFactorLoading ? 'Membuat kunci keamanan...' : twoFactorSecretKey || '...'}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={twoFactorLoading || !twoFactorSecretKey}
                                        onClick={copySecretKey}
                                        className="ml-3 shrink-0 px-3 py-1.5 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                                    >
                                        {secretCopied ? 'Tersalin!' : 'Salin'}
                                    </button>
                                </div>
                            </div>

                            {/* App Compatibility Badges */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Kompatibel Dengan:
                                </p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600">
                                        ✓ Google Authenticator
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600">
                                        ✓ Microsoft Authenticator
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600">
                                        ✓ Twilio Authy
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTwoFactorSetupModal(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={twoFactorLoading || !twoFactorQrSvg}
                                    onClick={() => setTwoFactorStep(2)}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                                >
                                    Lanjut ke Verifikasi Kode &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {twoFactorStep === 2 && (
                        <form onSubmit={confirmTwoFactorOtp} className="space-y-6">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                    Masukkan 6 Digit Kode Authenticator
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={twoFactorOtp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setTwoFactorOtp(val);
                                    }}
                                    placeholder="000000"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-center text-3xl font-black tracking-[0.4em] font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                    required
                                />
                                <p className="text-[11px] text-slate-400 text-center font-medium">
                                    Buka aplikasi authenticator dan ketik kode 6-digit yang sedang aktif.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setTwoFactorStep(1)}
                                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                                >
                                    Kembali
                                </button>
                                <button
                                    type="submit"
                                    disabled={twoFactorLoading || twoFactorOtp.length < 6}
                                    className={`flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                                        twoFactorLoading || twoFactorOtp.length < 6
                                            ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 dark:shadow-none'
                                    }`}
                                >
                                    {twoFactorLoading ? 'Memverifikasi...' : 'Konfirmasi & Aktifkan 2FA'}
                                </button>
                            </div>
                        </form>
                    )}

                    {twoFactorStep === 3 && (
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 text-center space-y-1">
                                <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-tight">
                                    Simpan Kode Pemulihan (Recovery Codes)
                                </p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                    Gunakan kode darurat ini jika sewaktu-waktu kehilangan akses ke ponsel atau aplikasi authenticator Anda.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 font-mono text-xs text-center font-black text-slate-800 dark:text-slate-100">
                                {twoFactorRecoveryCodes.map((code, index) => (
                                    <div
                                        key={index}
                                        className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs select-all"
                                    >
                                        {code}
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={copyRecoveryCodes}
                                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    {recoveryCopied ? 'Semua Kode Tersalin!' : 'Salin Semua Kode'}
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadRecoveryCodesTxt}
                                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Unduh (.txt)
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowTwoFactorSetupModal(false);
                                    setTwoFactorStep(1);
                                    setTwoFactorError(null);
                                }}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                            >
                                Selesai & Tutup
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Recovery Codes View & Management Modal */}
            <Modal
                show={showRecoveryCodesModal}
                onClose={() => setShowRecoveryCodesModal(false)}
                title="Kode Pemulihan 2FA (Recovery Codes)"
                description="Gunakan salah satu kode ini jika kehilangan akses ke aplikasi authenticator Anda."
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                            Setiap kode hanya dapat digunakan <b>1 (satu) kali</b> saat login. Simpan di tempat yang aman dan rahasia.
                        </p>
                    </div>

                    {twoFactorLoading ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                            <svg className="animate-spin h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Memuat kode pemulihan...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 font-mono text-xs text-center font-black text-slate-800 dark:text-slate-100">
                            {twoFactorRecoveryCodes.map((code, index) => (
                                <div
                                    key={index}
                                    className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs select-all"
                                >
                                    {code}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            disabled={twoFactorLoading || twoFactorRecoveryCodes.length === 0}
                            onClick={copyRecoveryCodes}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            {recoveryCopied ? 'Semua Kode Tersalin!' : 'Salin Semua Kode'}
                        </button>
                        <button
                            type="button"
                            disabled={twoFactorLoading || twoFactorRecoveryCodes.length === 0}
                            onClick={downloadRecoveryCodesTxt}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Unduh File (.txt)
                        </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={regenerateRecoveryCodes}
                            disabled={twoFactorLoading}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                            Buat Kode Baru (Regenerate)
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRecoveryCodesModal(false)}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Disable 2FA Confirmation Modal */}
            <Modal
                show={showDisableTwoFactorModal}
                onClose={() => setShowDisableTwoFactorModal(false)}
                title="Nonaktifkan Otentikasi 2FA?"
                maxWidth="sm"
            >
                <div className="space-y-6 text-center p-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Peringatan Keamanan
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Menonaktifkan 2FA akan menghapus lapisan keamanan ganda pada akun Anda. Akun Anda hanya akan dilindungi oleh password saja.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowDisableTwoFactorModal(false)}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={disableTwoFactor}
                            className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 dark:shadow-none transition-all cursor-pointer"
                        >
                            Ya, Nonaktifkan 2FA
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
