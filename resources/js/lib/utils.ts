import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format number/string to Rupiah format: Rp.XX.XXX (No space, dot after Rp)
 */
export const formatRupiah = (amount: number | string): string => {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(number)) return 'Rp.0';
    
    const formatted = Math.floor(number)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
    return `Rp.${formatted}`;
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
