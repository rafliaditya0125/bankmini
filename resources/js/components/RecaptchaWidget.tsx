import { useEffect, useRef, useCallback } from 'react';

interface RecaptchaWidgetProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    onLoadError?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact';
}

declare global {
    interface Window {
        grecaptcha?: {
            render: (container: string | HTMLElement, params: Record<string, unknown>) => number;
            reset: (widgetId?: number) => void;
            getResponse: (widgetId?: number) => string;
        };
        onGrecaptchaLoad?: () => void;
    }
}

const SCRIPT_ID = 'google-recaptcha-script';

function ensureScript(onLoad: () => void, onError: () => void) {
    if (document.getElementById(SCRIPT_ID)) {
        if (window.grecaptcha) {
            onLoad();
        } else {
            const prev = window.onGrecaptchaLoad;
            window.onGrecaptchaLoad = () => {
                prev?.();
                onLoad();
            };
        }
        return;
    }

    window.onGrecaptchaLoad = onLoad;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onGrecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = onError;
    document.head.appendChild(script);
}

export default function RecaptchaWidget({
    siteKey,
    onVerify,
    onExpire,
    onError,
    onLoadError,
    theme = 'light',
    size = 'normal',
}: RecaptchaWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.grecaptcha) return;
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey:           siteKey,
            callback:          onVerify,
            'expired-callback': () => onExpire?.(),
            'error-callback':  () => onError?.(),
            theme,
            size,
        });
    }, [siteKey, onVerify, onExpire, onError, theme, size]);

    useEffect(() => {
        if (!siteKey) return;

        ensureScript(renderWidget, () => onLoadError?.());

        return () => {
            widgetIdRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    return (
        <div
            className="flex justify-center animate-[fade-up_0.4s_ease-out]"
            aria-label="Google reCAPTCHA"
        >
            <div ref={containerRef} />
        </div>
    );
}
