import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    total: number;
    url?: string;
    filters?: Record<string, any>;
    onPageChange?: (page: number) => void;
    itemLabel?: string;
}

export default function Pagination({
    currentPage = 1,
    lastPage = 1,
    total = 0,
    url,
    filters = {},
    onPageChange,
    itemLabel = 'Data',
}: PaginationProps) {
    const [inputVal, setInputVal] = useState(currentPage?.toString() || '1');

    useEffect(() => {
        setInputVal(currentPage?.toString() || '1');
    }, [currentPage]);

    const maxPage = lastPage && lastPage > 0 ? lastPage : 1;

    const handleNavigate = (targetPage: number) => {
        if (isNaN(targetPage) || targetPage < 1 || targetPage > maxPage) {
            setInputVal(currentPage?.toString() || '1');
            return;
        }

        if (onPageChange) {
            onPageChange(targetPage);
        } else if (url) {
            router.get(url, { ...filters, page: targetPage }, {
                preserveState: true,
                preserveScroll: true,
            });
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
            {/* Left side: Page status & Total data */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <span>Total:</span>
                    <strong className="font-black text-slate-900 text-xs">{total || 0}</strong>
                    <span>{itemLabel}</span>
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
