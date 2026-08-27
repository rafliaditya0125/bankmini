import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

export interface HoneypotConfig {
    enabled: boolean;
    nameFieldName: string;
    validFromFieldName: string;
    encryptedValidFrom: string;
}

export function useHoneypot() {
    const { honeypot } = usePage<any>().props as { honeypot?: HoneypotConfig };

    const honeypotData = useMemo(() => {
        if (!honeypot || !honeypot.enabled) {
            return {};
        }
        return {
            [honeypot.nameFieldName]: '',
            [honeypot.validFromFieldName]: honeypot.encryptedValidFrom,
        };
    }, [honeypot]);

    return {
        honeypot,
        honeypotData,
    };
}
