/**
 * Passbook Printer Utility via WebUSB API
 *
 * Communicates with a USB dot-matrix / passbook printer using ESC/P commands.
 * Sends a single line entry to be printed on the next row of the passbook.
 */

export interface PassbookTransaction {
    tanggal: string;
    kode_transaksi: string;
    jenis_transaksi: string;
    jumlah: number | string;
    saldo_sesudah: number | string;
    keterangan?: string;
    petugas?: string;
}

interface PrinterState {
    device: USBDevice | null;
    interfaceNumber: number;
    endpointNumber: number;
}

const state: PrinterState = {
    device: null,
    interfaceNumber: 0,
    endpointNumber: 1,
};

/**
 * Check if WebUSB is supported in the current browser
 */
export function isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Find the best interface and OUT endpoint for printing
 */
function findPrinterDetails(device: USBDevice): { interfaceNumber: number, endpointNumber: number } {
    let interfaceNumber = 0;
    let endpointNumber = 1;

    try {
        if (device.configuration) {
            // Priority 1: Find interface with Printer Class (7)
            for (const iface of device.configuration.interfaces) {
                const alternate = iface.alternates[0];
                if (alternate.interfaceClass === 7) {
                    interfaceNumber = iface.interfaceNumber;
                    const ep = alternate.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
                    if (ep) {
                        endpointNumber = ep.endpointNumber;
                        return { interfaceNumber, endpointNumber };
                    }
                }
            }

            // Priority 2: Find any interface with a Bulk OUT endpoint
            for (const iface of device.configuration.interfaces) {
                const alternate = iface.alternates[0];
                const ep = alternate.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
                if (ep) {
                    interfaceNumber = iface.interfaceNumber;
                    endpointNumber = ep.endpointNumber;
                    return { interfaceNumber, endpointNumber };
                }
            }
        }
    } catch (e) {
        console.error("Error finding printer details:", e);
    }

    return { interfaceNumber, endpointNumber };
}

/**
 * Connect to a USB printer. Must be called from a user gesture (button click).
 * Returns true if connected successfully.
 */
export async function connectPrinter(): Promise<boolean> {
    if (!isSupported()) {
        throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    try {
        // Request USB device
        const device = await navigator.usb.requestDevice({ 
            filters: [
                { classCode: 7 }, // Printer class
                { vendorId: 0x04b8 }, // Epson
                { vendorId: 0x0686 }, // OKI
                { vendorId: 0x04f9 }, // Brother
                { vendorId: 0x03f0 }, // HP
            ] 
        }).catch(async () => {
            // Fallback to all devices if filtered request fails or is too restrictive
            return await navigator.usb.requestDevice({ filters: [] });
        });

        await device.open();

        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }

        const details = findPrinterDetails(device);
        
        // Ensure the interface is claimed
        try {
            await device.claimInterface(details.interfaceNumber);
        } catch (e: any) {
            // If already claimed or other error, try to proceed if opened
            if (!device.opened) throw e;
        }

        state.device = device;
        state.interfaceNumber = details.interfaceNumber;
        state.endpointNumber = details.endpointNumber;

        return true;
    } catch (error: any) {
        if (error.name === 'NotFoundError' || error.name === 'SecurityError') {
            // User cancelled or permission denied
            return false;
        }
        throw new Error('Gagal menghubungkan printer: ' + (error.message || error));
    }
}

/**
 * Disconnect the currently connected printer
 */
export async function disconnectPrinter(): Promise<void> {
    if (state.device) {
        try {
            await state.device.releaseInterface(state.interfaceNumber);
            await state.device.close();
        } catch {
            // ignore errors on disconnect
        }
        state.device = null;
    }
}

/**
 * Check if a printer is currently connected
 */
export function isConnected(): boolean {
    return state.device !== null && state.device.opened;
}

/**
 * Format number as Indonesian currency (without Rp prefix)
 */
function formatMoney(amount: number | string): string {
    let num: number;
    if (typeof amount === 'string') {
        // Remove thousands separators if any and convert to float
        const cleanStr = amount.replace(/\./g, '').replace(/,/g, '.');
        num = parseFloat(cleanStr);
    } else {
        num = amount;
    }
    
    if (isNaN(num)) return '0';
    return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Pad or truncate a string to a fixed width
 */
function fixedWidth(str: string, width: number): string {
    str = (str || '').toString();
    if (str.length >= width) return str.substring(0, width);
    return str + ' '.repeat(width - str.length);
}

/**
 * Right-align a string within a fixed width
 */
function rightAlign(str: string, width: number): string {
    str = (str || '').toString();
    if (str.length >= width) return str.substring(0, width);
    return ' '.repeat(width - str.length) + str;
}

/**
 * Build the passbook line as ESC/P byte commands
 */
function buildPassbookData(tx: PassbookTransaction): Uint8Array {
    const encoder = new TextEncoder();

    // ESC/P Initialize (ESC @)
    const INIT = new Uint8Array([0x1b, 0x40]);

    // Set font to condensed/small (SI)
    const CONDENSED_ON = new Uint8Array([0x0f]);
    
    // Carriage Return + Line Feed
    const CRLF = new Uint8Array([0x0d, 0x0a]);

    // Extract date portion and ensure it fits (prefer dd/mm/yy)
    let datePart = tx.tanggal.split(' ')[0] || tx.tanggal;
    if (datePart.length > 8 && datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
            // Convert dd/mm/yyyy to dd/mm/yy
            datePart = `${parts[0]}/${parts[1]}/${parts[2].substring(2)}`;
        }
    }

    // Determine debit/credit
    const jumlahRaw = typeof tx.jumlah === 'string' ? tx.jumlah.replace(/\./g, '').replace(/,/g, '.') : tx.jumlah;
    const jumlah = parseFloat(jumlahRaw as string) || 0;
    
    const isDebit = tx.jenis_transaksi === 'tarik' || tx.jenis_transaksi === 'transfer' || tx.jenis_transaksi === 'biaya_admin';
    const debitStr = isDebit ? formatMoney(jumlah) : '';
    const creditStr = !isDebit ? formatMoney(jumlah) : '';
    const saldoStr = formatMoney(tx.saldo_sesudah);
    
    // Validasi (Nama petugas/inisial)
    const validasiStr = tx.petugas || '-';

    /**
     * Passbook format (Approx 67 chars):
     * TANGGAL(09) | KODE(05) | DEBET(13) | KREDIT(13) | SALDO(15) | VALIDASI(12)
     */
    const line =
        fixedWidth(datePart, 9) + 
        fixedWidth(tx.jenis_transaksi.substring(0, 3).toUpperCase(), 5) + 
        rightAlign(debitStr, 13) + 
        rightAlign(creditStr, 13) + 
        rightAlign(saldoStr, 15) + 
        "  " + fixedWidth(validasiStr, 12);

    const lineBytes = encoder.encode(line);

    // Combine everything: INIT + CONDENSED + LINE + CRLF + CRLF (extra kick)
    const result = new Uint8Array(
        INIT.length + CONDENSED_ON.length + lineBytes.length + (CRLF.length * 2)
    );
    
    let offset = 0;
    result.set(INIT, offset); offset += INIT.length;
    result.set(CONDENSED_ON, offset); offset += CONDENSED_ON.length;
    result.set(lineBytes, offset); offset += lineBytes.length;
    result.set(CRLF, offset); offset += CRLF.length;
    result.set(CRLF, offset);

    return result;
}

/**
 * Print a transaction entry to the passbook.
 */
export async function printToPassbook(tx: PassbookTransaction): Promise<void> {
    if (!isSupported()) {
        throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    // Auto-connect if not connected
    if (!isConnected()) {
        const connected = await connectPrinter();
        if (!connected) {
            throw new Error('Printer tidak dipilih.');
        }
    }

    const data = buildPassbookData(tx);

    try {
        const result = await state.device!.transferOut(state.endpointNumber, data);
        if (result.status !== 'ok') {
            throw new Error(`Transfer status: ${result.status}`);
        }
    } catch (error: any) {
        if (error.name === 'NetworkError' || error.name === 'TransactionError') {
            state.device = null;
        }
        throw new Error('Gagal mencetak ke buku tabungan: ' + (error.message || error));
    }

export default {
    isSupported,
    isConnected,
    connectPrinter,
    disconnectPrinter,
    printToPassbook,
};
