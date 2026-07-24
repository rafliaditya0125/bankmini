import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface NasabahSearchBoxProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (rekening: string) => void;
    placeholder?: string;
}

export default function NasabahSearchBox({ value, onChange, onSelect, placeholder = "Cari nama atau nomor rekening..." }: NasabahSearchBoxProps) {
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value || value.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setLoading(true);
            axios.get(`/api/nasabah/search?q=${encodeURIComponent(value)}`)
                .then(res => {
                    setResults(res.data);
                    setIsOpen(true);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [value]);

    return (
        <div className="flex w-full relative" ref={wrapperRef}>
            <div className="relative flex-1 flex items-center">
                <div className="absolute left-4 text-slate-400 z-10">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
                    placeholder={placeholder}
                    maxLength={255}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onSelect(value);
                            setIsOpen(false);
                        }
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 border-r-0 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 rounded-l-2xl rounded-r-none outline-none transition-all font-bold text-[13px] h-12"
                />
            </div>
            <button 
                type="button" 
                className="px-6 bg-slate-900 text-white rounded-r-2xl rounded-l-none font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all h-12 flex items-center" 
                onClick={() => { onSelect(value); setIsOpen(false); }}
            >
                Cari
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[999]">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-semibold">Mencari...</div>
                    ) : results.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {results.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        onChange(item.nomor_rekening);
                                        onSelect(item.nomor_rekening);
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                                >
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm uppercase shrink-0">
                                        {item.user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{item.user.name}</div>
                                        <div className="text-xs text-slate-500 font-semibold">{item.nomor_rekening}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-xs text-slate-500 font-semibold">Nasabah tidak ditemukan</div>
                    )}
                </div>
            )}
        </div>
    );
}
