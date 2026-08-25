import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface FlashMessages {
    success?: string;
    error?: string;
}

interface FlashMessageProps {
    manualSuccess?: string | null;
    manualError?: string | null;
    onClose?: () => void;
    ignored?: boolean;
}

export default function FlashMessage({ manualSuccess, manualError, onClose, ignored = false }: FlashMessageProps) {
    const pageProps = usePage<{ flash?: FlashMessages; errors?: Record<string, string> }>().props;
    const pageFlash = pageProps.flash;
    const pageErrors = pageProps.errors;
    const [visible, setVisible] = useState(false);
    const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (ignored) return;
        const success = manualSuccess || pageFlash?.success;
        
        let error = manualError || pageFlash?.error;
        if (!error && pageErrors && Object.keys(pageErrors).length > 0) {
            const firstErrorKey = Object.keys(pageErrors)[0];
            error = pageErrors[firstErrorKey];
        }

        if (success || error) {
            setLocalMessage(success ? { type: 'success', text: success } : { type: 'error', text: error! });
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                if (onClose) onClose();
            }, 6000);

            return () => clearTimeout(timer);
        }
    }, [pageFlash, pageErrors, manualSuccess, manualError, ignored]);

    if (!visible || !localMessage) {
        return null;
    }

    const { type, text } = localMessage;

    return (
        <div className="fixed top-6 right-6 z-[100] max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
            {type === 'success' ? (
                <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-100 shadow-2xl shadow-emerald-200/50">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-200">
                            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-emerald-800 uppercase tracking-tight">{text}</p>
                        </div>
                        <button
                            onClick={() => setVisible(false)}
                            className="flex-shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl bg-rose-50 p-5 border border-rose-100 shadow-2xl shadow-rose-200/50">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shadow-sm shadow-rose-200">
                            <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-rose-800 uppercase tracking-tight">{text}</p>
                        </div>
                        <button
                            onClick={() => setVisible(false)}
                            className="flex-shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
