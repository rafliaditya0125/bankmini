import { useEffect, useRef, useCallback } from 'react';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    /** Called when the Cloudflare script itself fails to load (network error). Use to trigger fallback. */
    onLoadError?: () => void;
    /** Widget appearance size. Defaults to 'flexible'. */
    size?: 'normal' | 'compact' | 'flexible';
    /** Widget theme. Defaults to 'light'. */
    theme?: 'light' | 'dark' | 'auto';
    /** Site key (overrides Inertia prop — used by CaptchaWidget). */
    siteKey?: string;
    /** Whether this widget is enabled (overrides Inertia prop). */
    enabled?: boolean;
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

function ensureScript(onLoad: () => void, onError: () => void) {
    if (document.getElementById(SCRIPT_ID)) {
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
    script.onerror = onError;
    document.head.appendChild(script);
}

export default function TurnstileWidget({
    onVerify,
    onExpire,
    onError,
    onLoadError,
    size = 'flexible',
    theme = 'light',
    siteKey: siteKeyProp,
    enabled: enabledProp,
}: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKeyProp,
            callback: onVerify,
            'expired-callback': () => onExpire?.(),
            'error-callback':   () => onError?.(),
            size,
            theme,
        });
    }, [siteKeyProp, onVerify, onExpire, onError, size, theme]);

    useEffect(() => {
        if (!enabledProp || !siteKeyProp) return;

        ensureScript(renderWidget, () => onLoadError?.());

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabledProp, siteKeyProp]);

    if (!enabledProp || !siteKeyProp) return null;

    return (
        <div
            className="overflow-hidden rounded-xl animate-[fade-up_0.4s_ease-out]"
            aria-label="Cloudflare Turnstile CAPTCHA"
        >
            <div ref={containerRef} />
        </div>
    );
}
