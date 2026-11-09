import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePage } from '@inertiajs/react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format number/string to Rupiah format with 2 decimals: Rp.XX.XXX,00
 */
export const formatRupiah = (amount: number | string): string => {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(number)) return 'Rp 0,00';

    const isNegative = number < 0;
    const absNumber = Math.abs(number);
    const parts = absNumber.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];

    return `${isNegative ? '-' : ''}Rp ${integerPart},${decimalPart}`;
};

/**
 * Format string to include dots every 3 digits for input masking
 */
export const formatNumber = (value: string | number): string => {
    if (value === undefined || value === null) return '';
    const cleanValue = value.toString().replace(/\D/g, '');
    if (!cleanValue) return '';
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Remove dots from formatted number string to get numeric value
 */
export const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/\./g, '');
    return parseInt(cleanValue, 10) || 0;
};

/**
 * Format nama rombel selalu: tingkat + nama rombel (e.g. "10 RPL 1", "11 RPL 1")
 */
export const formatRombelName = (rombel: any): string => {
    if (!rombel) return '-';
    if (typeof rombel === 'string') {
        return rombel.trim() || '-';
    }
    const tingkat = rombel.tingkat ? String(rombel.tingkat).trim() : '';
    const rawNama = String(rombel.nama || rombel.nama_kelas || '').trim();
    const cleanNama = rawNama.replace(/^(10|11|12)\s*/i, '').trim();

    if (tingkat && cleanNama) {
        return `${tingkat} ${cleanNama}`;
    }
    if (cleanNama) {
        return cleanNama;
    }
    if (tingkat) {
        const jurKode = rombel.jurusan?.kode || rombel.jurusan_rel?.kode || '';
        return `${tingkat} ${jurKode}`.trim();
    }
    return rawNama || '-';
};

/**
 * Format BKM/BKK transaction code according to display format setting
 * @param code e.g. "BKM001/09/26"
 * @param format "full" | "month" | "number_only"
 */
export const formatTransactionCode = (code: string | undefined | null, format: string = 'full'): string => {
    if (!code) return '';
    const trimmed = String(code).trim();
    const upper = trimmed.toUpperCase();
    if (!upper.startsWith('BKM') && !upper.startsWith('BKK')) {
        return trimmed;
    }
    const parts = trimmed.split('/');
    if (parts.length < 2) {
        return trimmed;
    }
    if (format === 'number_only') {
        return parts[0];
    }
    if (format === 'month') {
        return `${parts[0]}/${parts[1]}`;
    }
    return trimmed;
};

/**
 * Hook to get a formatting function using the current page's bkk_bkm_display_format prop
 */
export const useFormatTransactionCode = () => {
    try {
        const page = usePage<any>();
        const format = page?.props?.bkk_bkm_display_format || 'full';
        return (code: string | undefined | null) => formatTransactionCode(code, format);
    } catch {
        return (code: string | undefined | null) => formatTransactionCode(code, 'full');
    }
};
