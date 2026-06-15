/**
 * Passbook Printer Utility via Local Node.js Bridge
 *
 * Instead of direct WebUSB (which is flaky), we communicate with a small
 * Node.js app running on the teller's machine.
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

const BRIDGE_URL = 'http://localhost:3001';

/**
 * Check if the bridge is supported (always true, but we could do a ping)
 */
export function isSupported(): boolean {
    return true; 
}

/**
 * Check if bridge is online
 */
export async function checkBridgeStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${BRIDGE_URL}/ping`, { 
            method: 'GET',
            mode: 'cors',
            signal: AbortSignal.timeout(1000) 
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Connect/initiate printer - now a simple ping check
 */
export async function connectPrinter(): Promise<boolean> {
    const online = await checkBridgeStatus();
    if (!online) {
        throw new Error(`Aplikasi cetak (Bridge) tidak aktif di ${BRIDGE_URL}. Pastikan aplikasi Node.js sudah dijalankan.`);
    }
    return true;
}

/**
 * Disconnect (no-op for bridge)
 */
export async function disconnectPrinter(): Promise<void> {
    // nothing to do
}

/**
 * Check if a printer is currently "connected" (bridge is online)
 */
export function isConnected(): boolean {
    // We'll rely on the actual print attempt or a periodic ping
    return true;
}

/**
 * Print a transaction entry to the passbook.
 */
export async function printToPassbook(tx: PassbookTransaction): Promise<void> {
    try {
        const response = await fetch(`${BRIDGE_URL}/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify(tx),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Gagal mengirim data ke aplikasi cetak.');
        }
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Aplikasi cetak (Bridge) tidak merespon. Pastikan aplikasi Node.js jalan di localhost:3001.');
        }
        throw new Error('Gagal mencetak: ' + (error.message || error));
    }
}

export default {
    isSupported,
    isConnected,
    connectPrinter,
    disconnectPrinter,
    printToPassbook,
    checkBridgeStatus,
};
