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
