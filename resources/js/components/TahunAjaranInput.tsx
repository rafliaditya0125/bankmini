import { useState, useRef } from 'react';

interface TahunAjaranInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
}

export default function TahunAjaranInput({
    value,
    onChange,
    placeholder = "2025/2026",
    required = false,
    error,
}: TahunAjaranInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [tahun1, setTahun1] = useState(value.split('/')[0] || '');
    const [tahun2, setTahun2] = useState(value.split('/')[1] || '');

    const handleTahun1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setTahun1(val);
        updateValue(val, tahun2);

        // Auto-focus to tahun2 when tahun1 is complete
        if (val.length === 4) {
            const tahun2Input = document.getElementById('tahun2-input') as HTMLInputElement;
            tahun2Input?.focus();
        }
    };

    const handleTahun2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setTahun2(val);
        updateValue(tahun1, val);
    };

    const updateValue = (t1: string, t2: string) => {
        if (t1 && t2) {
            onChange(`${t1}/${t2}`);
        } else if (t1) {
            onChange(t1);
        } else {
            onChange('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '/') {
            e.preventDefault();
            const tahun2Input = document.getElementById('tahun2-input') as HTMLInputElement;
            tahun2Input?.focus();
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={tahun1}
                        onChange={handleTahun1Change}
                        onKeyDown={handleKeyDown}
                        placeholder="2025"
                        maxLength={4}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-l-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                        required={required}
                    />
                </div>
                <div className="text-gray-400 font-black text-lg">/</div>
                <div className="flex-1">
                    <input
                        id="tahun2-input"
                        type="text"
                        inputMode="numeric"
                        value={tahun2}
                        onChange={handleTahun2Change}
                        placeholder="2026"
                        maxLength={4}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-r-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                        required={required}
                    />
                </div>
            </div>
            {error && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{error}</p>}
        </div>
    );
}
