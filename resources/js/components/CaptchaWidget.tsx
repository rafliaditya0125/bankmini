import { useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import TurnstileWidget from '@/components/TurnstileWidget';
import RecaptchaWidget from '@/components/RecaptchaWidget';

interface CaptchaConfig {
    primary: 'turnstile' | 'recaptcha';
    turnstile: { enabled: boolean; siteKey: string };
    recaptcha: { enabled: boolean; siteKey: string };
}

interface CaptchaWidgetProps {
    /** Called when any provider successfully verifies. Updates both token fields. */
    onVerifyTurnstile: (token: string) => void;
    onVerifyRecaptcha: (token: string) => void;
    onExpireTurnstile?: () => void;
    onExpireRecaptcha?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    /** Passed as `key` from parent to force remount (e.g. after failed submission) */
    resetKey?: number;
}

/**
 * Smart CAPTCHA wrapper that:
 * 1. Renders the primary widget (as configured in Settings)
 * 2. If primary script fails to load → automatically shows backup
 * 3. Clears the other provider's token when one verifies
 */
export default function CaptchaWidget({
    onVerifyTurnstile,
    onVerifyRecaptcha,
    onExpireTurnstile,
    onExpireRecaptcha,
    theme = 'light',
}: CaptchaWidgetProps) {
    const { captcha } = usePage<any>().props as { captcha?: CaptchaConfig };
    const [activePrimary, setActivePrimary] = useState<'turnstile' | 'recaptcha'>(
        captcha?.primary ?? 'turnstile',
    );
    const [usingFallback, setUsingFallback] = useState(false);

    const primary   = captcha?.primary ?? 'turnstile';
    const secondary = primary === 'turnstile' ? 'recaptcha' : 'turnstile';

    // Called when primary script fails to load
    const handlePrimaryLoadError = useCallback(() => {
        setActivePrimary(secondary as typeof primary);
        setUsingFallback(true);
    }, [secondary]);

    if (!captcha) return null;

    const showTurnstile = activePrimary === 'turnstile' && captcha.turnstile.enabled && captcha.turnstile.siteKey;
    const showRecaptcha = activePrimary === 'recaptcha' && captcha.recaptcha.enabled && captcha.recaptcha.siteKey;

    return (
        <div className="space-y-2">
            {usingFallback && (
                <p className="text-center text-[10px] text-amber-600 font-semibold">
                    Menggunakan CAPTCHA cadangan ({activePrimary === 'turnstile' ? 'Cloudflare Turnstile' : 'Google reCAPTCHA'})
                </p>
            )}

            {showTurnstile && (
                <TurnstileWidget
                    siteKey={captcha.turnstile.siteKey}
                    enabled={captcha.turnstile.enabled}
                    onVerify={(token) => {
                        onVerifyTurnstile(token);
                        onVerifyRecaptcha(''); // clear backup token
                    }}
                    onExpire={() => {
                        onExpireTurnstile?.();
                    }}
                    onError={() => {
                        onExpireTurnstile?.();
                    }}
                    onLoadError={primary === 'turnstile' ? handlePrimaryLoadError : undefined}
                    theme={theme}
                />
            )}

            {showRecaptcha && (
                <RecaptchaWidget
                    siteKey={captcha.recaptcha.siteKey}
                    onVerify={(token) => {
                        onVerifyRecaptcha(token);
                        onVerifyTurnstile(''); // clear primary token
                    }}
                    onExpire={() => {
                        onExpireRecaptcha?.();
                    }}
                    onError={() => {
                        onExpireRecaptcha?.();
                    }}
                    onLoadError={primary === 'recaptcha' ? handlePrimaryLoadError : undefined}
                    theme={theme === 'auto' ? 'light' : theme}
                />
            )}
        </div>
    );
}
