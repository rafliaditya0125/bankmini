import Modal from './Modal';
import { ReactNode, useEffect, useState } from 'react';

interface ConfirmModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title?: string;
    message?: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmModal({
    show,
    onClose,
    onConfirm,
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin?',
    confirmText = 'Ya, Konfirmasi',
    cancelText = 'Batal',
    variant = 'info'
}: ConfirmModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!show) {
            setIsSubmitting(false);
        }
    }, [show]);

    const variantClasses = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-amber-600 hover:bg-amber-700',
        info: 'bg-blue-600 hover:bg-blue-700',
        success: 'bg-emerald-600 hover:bg-emerald-700',
    }[variant];

    const iconClasses = {
        danger: 'text-red-600 bg-red-100',
        warning: 'text-amber-600 bg-amber-100',
        info: 'text-blue-600 bg-blue-100',
        success: 'text-emerald-600 bg-emerald-100',
    }[variant];

    const handleConfirm = () => {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = onConfirm();
            if (result instanceof Promise) {
                result.finally(() => {
                    setIsSubmitting(false);
                });
            }
        } catch {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onClose={() => { if (!isSubmitting) onClose(); }} maxWidth="sm">
            <div className="text-center p-2">
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl mb-6 shadow-lg ${iconClasses.split(' ').filter(c => !c.startsWith('rounded')).join(' ')}`}>
                    {variant === 'danger' && (
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                    {(variant === 'info' || variant === 'warning') && (
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {variant === 'success' && (
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
                <div className="text-xs font-bold text-gray-400 mb-8 px-4 uppercase tracking-tight leading-relaxed">
                    {message}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className={`w-full sm:w-auto px-8 py-3 text-[10px] font-black text-white uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${variantClasses}`}
                    >
                        {isSubmitting ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Memproses...
                            </span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
