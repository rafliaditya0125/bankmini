import { useEffect, useRef, useCallback } from 'react';
import { usePage } from '@inertiajs/react';

interface TurnstileConfig {
    enabled: boolean;
    siteKey: string;
}

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    /** Widget appearance size. Defaults to 'normal'. */
    size?: 'normal' | 'compact' | 'flexible';
    /** Widget theme. Defaults to 'light'. */
    theme?: 'light' | 'dark' | 'auto';
}

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

const SCRIPT_ID = 'cf-turnstile-script';

function ensureScript(onLoad: () => void) {
    if (document.getElementById(SCRIPT_ID)) {
        // Script already in DOM — if Turnstile is already ready, call immediately
        if (window.turnstile) {
            onLoad();
        } else {
            const prev = window.onTurnstileLoad;
            window.onTurnstileLoad = () => {
                prev?.();
                onLoad();
            };
        }
        return;
    }

    window.onTurnstileLoad = onLoad;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

export default function TurnstileWidget({
    onVerify,
    onExpire,
    onError,
    size = 'flexible',
    theme = 'light',
}: TurnstileWidgetProps) {
    const { turnstile } = usePage<any>().props as { turnstile?: TurnstileConfig };
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // already rendered

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: turnstile?.siteKey,
            callback: onVerify,
            'expired-callback': () => {
                onExpire?.();
            },
            'error-callback': () => {
                onError?.();
            },
            size,
            theme,
        });
    }, [turnstile?.siteKey, onVerify, onExpire, onError, size, theme]);

    useEffect(() => {
        if (!turnstile?.enabled || !turnstile?.siteKey) return;

        ensureScript(renderWidget);

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnstile?.enabled, turnstile?.siteKey]);

    if (!turnstile?.enabled) return null;

    return (
        <div
            className="overflow-hidden rounded-xl animate-[fade-up_0.4s_ease-out]"
            aria-label="Cloudflare Turnstile CAPTCHA"
        >
            <div ref={containerRef} />
        </div>
    );
}
