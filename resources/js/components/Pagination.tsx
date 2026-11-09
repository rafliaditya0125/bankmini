import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage?: number;
    url?: string;
    filters?: Record<string, any>;
    onPageChange?: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
    itemLabel?: string;
}

export default function Pagination({
    currentPage = 1,
    lastPage = 1,
    total = 0,
    perPage,
    url,
    filters = {},
    onPageChange,
    onPerPageChange,
    itemLabel = 'Data',
}: PaginationProps) {
    const [inputVal, setInputVal] = useState(currentPage?.toString() || '1');
    const initialPerPage = perPage || (filters?.per_page ? parseInt(filters.per_page, 10) : 15);
    const [currentPerPage, setCurrentPerPage] = useState<number>(initialPerPage);
    const [isCustom, setIsCustom] = useState(false);
    const [customInput, setCustomInput] = useState(initialPerPage.toString());

    useEffect(() => {
        setInputVal(currentPage?.toString() || '1');
    }, [currentPage]);

    useEffect(() => {
        const p = perPage || (filters?.per_page ? parseInt(filters.per_page, 10) : 15);
        setCurrentPerPage(p);
        setCustomInput(p.toString());
        if (![10, 15, 25, 50, 100].includes(p)) {
            setIsCustom(true);
        } else {
            setIsCustom(false);
        }
    }, [perPage, filters?.per_page]);

    const maxPage = lastPage && lastPage > 0 ? lastPage : 1;
    const standardOptions = [10, 15, 25, 50, 100];

    const handleNavigate = (targetPage: number) => {
        if (isNaN(targetPage) || targetPage < 1 || targetPage > maxPage) {
            setInputVal(currentPage?.toString() || '1');
            return;
        }

        if (onPageChange) {
            onPageChange(targetPage);
        } else if (url) {
            router.get(url, { ...filters, per_page: currentPerPage, page: targetPage }, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handlePerPageChange = (newPerPage: number) => {
        const valid = Math.max(1, Math.min(newPerPage, 200));
        setCurrentPerPage(valid);
        setCustomInput(valid.toString());
        if (onPerPageChange) {
            onPerPageChange(valid);
        } else if (url) {
            router.get(url, { ...filters, per_page: valid, page: 1 }, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseInt(customInput, 10);
        if (!isNaN(parsed) && parsed >= 1) {
            handlePerPageChange(parsed);
        } else {
            setCustomInput(currentPerPage.toString());
        }
    };

    const handleJump = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const pageNum = parseInt(inputVal, 10);
        if (isNaN(pageNum) || pageNum < 1) {
            setInputVal(currentPage?.toString() || '1');
            return;
        }
        let targetPage = pageNum;
        if (targetPage > maxPage) {
            targetPage = maxPage;
        }
        setInputVal(targetPage.toString());
        handleNavigate(targetPage);
    };

    return (
        <div className="px-6 py-4 border-t border-slate-200/70 bg-slate-50/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all">
            {/* Left side: Page status & Total data & Per page selector */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <span>Total:</span>
                    <strong className="font-black text-slate-900 text-xs">{total || 0}</strong>
                    <span>{itemLabel}</span>
                </div>

                {/* Per Page (Tampilkan Berapa) */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Tampilkan:
                    </span>
                    <select
                        value={isCustom ? 'custom' : currentPerPage}
                        onChange={(e) => {
                            if (e.target.value === 'custom') {
                                setIsCustom(true);
                            } else {
                                setIsCustom(false);
                                handlePerPageChange(parseInt(e.target.value, 10));
                            }
                        }}
                        className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                        title="Pilih jumlah data yang ditampilkan per halaman"
                    >
                        {standardOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt} data
                            </option>
                        ))}
                        <option value="custom">Kustom...</option>
                    </select>

                    {isCustom && (
                        <form onSubmit={handleCustomSubmit} className="inline-flex items-center gap-1 pl-1.5 border-l border-slate-200">
                            <input
                                type="number"
                                min={1}
                                max={200}
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="Jml"
                                className="w-12 px-1.5 py-0.5 text-center text-xs font-black bg-slate-100 border border-slate-300 rounded-md text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                                title="Ketik angka jumlah data (1-200) lalu tekan Enter atau OK"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-md text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                            >
                                OK
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Right side: Interactive navigation & Jump to page */}
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto w-full lg:w-auto justify-end">
                {/* Prev Button */}
                <button
                    type="button"
                    onClick={() => handleNavigate(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-40 disabled:pointer-events-none disabled:bg-slate-100 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Halaman Sebelumnya"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Prev</span>
                </button>

                {/* Jump Box (Editable Form) */}
                <form onSubmit={handleJump} className="inline-flex items-center gap-1.5 bg-white border-2 border-slate-200/90 hover:border-slate-300 rounded-xl p-1 shadow-2xs transition-all">
                    <span className="text-[10px] font-black text-slate-500 pl-2 uppercase tracking-wider hidden sm:inline">Ke Hal:</span>
                    <input
                        type="number"
                        min={1}
                        max={maxPage}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onBlur={() => {
                            if (!inputVal || isNaN(parseInt(inputVal, 10))) {
                                setInputVal(currentPage?.toString() || '1');
                            }
                        }}
                        placeholder={currentPage?.toString() || '1'}
                        title="Ketik nomor halaman yang dituju lalu tekan Enter atau Go"
                        className="w-14 px-2 py-1 text-center text-xs font-black bg-slate-100 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                    />
                    <span className="text-[11px] font-bold text-slate-400 pr-1">/ {maxPage}</span>
                    <button
                        type="submit"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        title="Pergi ke halaman ini"
                    >
                        <span>Go</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </form>

                {/* Next Button */}
                <button
                    type="button"
                    onClick={() => handleNavigate(currentPage + 1)}
                    disabled={currentPage >= maxPage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-40 disabled:pointer-events-none disabled:bg-slate-100 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Halaman Selanjutnya"
                >
                    <span>Next</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
