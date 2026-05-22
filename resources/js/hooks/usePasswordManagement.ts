import { useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';

interface UsePasswordManagementProps {
    initialLogin?: string;
    routePath: string;
    onSuccessCallback?: () => void;
    otpChannel: string;
    method?: 'post' | 'put';
}

export const usePasswordManagement = ({ initialLogin = '', routePath, onSuccessCallback, otpChannel, method = 'post' }: UsePasswordManagementProps) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        login: initialLogin,
        otp: '',
        password: '',
        password_confirmation: '',
        current_password: '', // Only for 'change' mode
        channel: otpChannel || 'whatsapp',
    });

    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(0);
    const [targetMasked, setTargetMasked] = useState('');
    const [channel, setChannel] = useState(otpChannel || 'whatsapp');

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
        post(route('password.otp'), {
            onSuccess: (page: any) => {
                if (page.props.flash.success) {
                    setOtpSent(true);
                    setTimer(60);
                    setTargetMasked(page.props.target_masked as string);
                    setChannel(page.props.channel as string);
                    setData('channel', page.props.channel as string);
                }
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
                reset();
                if (onSuccessCallback) onSuccessCallback();
            },
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return {
        data,
        setData,
        processing,
        errors,
        reset,
        otpSent,
        timer,
        targetMasked,
        channel,
        validations,
        isPasswordValid,
        requestOtp,
        submit,
    };
};
