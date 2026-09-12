import { useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { useHoneypot } from '@/hooks/useHoneypot';

interface UsePasswordManagementProps {
    initialLogin?: string;
    routePath: string;
    onSuccessCallback?: () => void;
    otpChannel: string;
    method?: 'post' | 'put';
    /** Optional getter for the current Cloudflare Turnstile token */
    getTurnstileToken?: () => string;
}

export const usePasswordManagement = ({ initialLogin = '', routePath, onSuccessCallback, otpChannel, method = 'post', getTurnstileToken }: UsePasswordManagementProps) => {
    const { honeypotData } = useHoneypot();
    const { data, setData, post, put, processing, errors, reset } = useForm({
        login: initialLogin,
        otp: '',
        password: '',
        password_confirmation: '',
        current_password: '', // Only for 'change' mode
        channel: otpChannel || 'whatsapp',
        'cf-turnstile-response': '',
        ...honeypotData,
    });

    const [step, setStep] = useState(1);
    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(0);
    const [targetMasked, setTargetMasked] = useState('');
    const [channel, setChannel] = useState(otpChannel || 'whatsapp');
    const [isCheckingIdentity, setIsCheckingIdentity] = useState(false);

    const validations = {
        length: data.password.length >= 8,
        match: data.password.length > 0 && data.password === data.password_confirmation,
        noMatchUsername: true, // Placeholder for username matching if needed
    };

    const isPasswordValid = validations.length && validations.match;

    useEffect(() => {
        if (timer > 0) {
            const countdown = setTimeout(() => setTimer(timer - 1), 1000);
            return () => clearTimeout(countdown);
        }
    }, [timer]);

    const requestOtp = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // Attach Turnstile token right before submission
        if (getTurnstileToken) {
            setData('cf-turnstile-response', getTurnstileToken());
        }
        setIsCheckingIdentity(true);
        post(route('password.otp'), {
            preserveScroll: true,
            onSuccess: (page: any) => {
                setIsCheckingIdentity(false);
                const flash = page.props.flash || {};
                if (flash.success || page.props.success) {
                    setOtpSent(true);
                    const respChannel = (flash.channel as string) || (page.props.channel as string) || otpChannel || 'whatsapp';
                    if (respChannel === 'totp') {
                        setTimer(0);
                        setTargetMasked('Aplikasi Authenticator (TOTP)');
                    } else {
                        setTimer(60);
                        setTargetMasked((flash.target_masked as string) || (page.props.target_masked as string) || '');
                    }
                    setChannel(respChannel);
                    setData('channel', respChannel);
                    setStep(2);
                }
            },
            onError: () => {
                setIsCheckingIdentity(false);
            },
            onFinish: () => {
                setIsCheckingIdentity(false);
            },
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitFn = method === 'put' ? put : post;
        submitFn(routePath, {
            preserveScroll: true,
            onSuccess: () => {
                setOtpSent(false);
                setTimer(0);
                setStep(1);
                reset();
                if (onSuccessCallback) onSuccessCallback();
            },
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const resetFlow = () => {
        setStep(1);
        setOtpSent(false);
        setTimer(0);
        setTargetMasked('');
        setChannel(otpChannel || 'whatsapp');
        reset();
    };

    return {
        data,
        setData,
        processing,
        errors,
        reset,
        step,
        setStep,
        otpSent,
        timer,
        targetMasked,
        channel,
        isCheckingIdentity,
        validations,
        isPasswordValid,
        isValid: isPasswordValid,
        requestOtp,
        submit,
        resetFlow,
    };
};
