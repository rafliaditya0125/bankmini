import { Fragment, PropsWithChildren, ReactNode } from 'react';

interface ModalProps extends PropsWithChildren {
    show: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
    footer?: ReactNode;
    variant?: 'default' | 'dark';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}

export default function Modal({
    show,
    onClose,
    title,
    description,
    maxWidth = 'md',
    children,
    footer,
    variant = 'default',
    closeOnOverlayClick = true,
    showCloseButton = true,
}: ModalProps) {
    if (!show) return null;

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl',
        '5xl': 'sm:max-w-5xl',
    }[maxWidth];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity pointer-events-auto"
                onClick={closeOnOverlayClick ? onClose : undefined}
            ></div>

            {/* Modal Container */}
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Modal Content */}
                <div className={`relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto transition-all ${maxWidthClass}`}>
                    {/* Header */}
                    {(title || description) && (
                        <div className={`sticky top-0 px-6 py-4 flex items-center justify-between z-10 no-print ${
                            variant === 'dark' 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-white border-b border-gray-100 text-gray-900'
                        }`}>
                            <div className="flex items-center gap-3">
                                {variant === 'dark' && (
                                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                <div>
                                    {title && <h2 className={`text-sm font-black uppercase tracking-widest ${variant === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h2>}
                                    {description && <p className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 ${variant === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{description}</p>}
                                </div>
                            </div>
                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className={`transition-colors p-2 rounded-lg ${
                                        variant === 'dark' 
                                            ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className="p-6">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3 z-10">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
