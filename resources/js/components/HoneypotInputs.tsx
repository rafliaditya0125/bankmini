import { usePage } from '@inertiajs/react';
import type { HoneypotConfig } from '@/hooks/useHoneypot';

interface HoneypotInputsProps {
    setData?: (key: string, value: any) => void;
}

export default function HoneypotInputs({ setData }: HoneypotInputsProps) {
    const { honeypot } = usePage<any>().props as { honeypot?: HoneypotConfig };

    if (!honeypot || !honeypot.enabled) {
        return null;
    }

    return (
        <div
            style={{
                opacity: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                height: 0,
                width: 0,
                zIndex: -1,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
            aria-hidden="true"
        >
            <input
                type="text"
                name={honeypot.nameFieldName}
                id={honeypot.nameFieldName}
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
                onChange={(e) => setData?.(honeypot.nameFieldName, e.target.value)}
            />
            <input
                type="text"
                name={honeypot.validFromFieldName}
                id={honeypot.validFromFieldName}
                tabIndex={-1}
                autoComplete="off"
                defaultValue={honeypot.encryptedValidFrom}
                readOnly
            />
        </div>
    );
}
