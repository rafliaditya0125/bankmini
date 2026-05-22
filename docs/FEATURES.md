# Fitur Utama Bank Mini SMEACIS

Sistem ini dirancang untuk mengelola operasional perbankan sekolah dengan fitur sebagai berikut:

## 1. Manajemen Pengguna (Role-Based)
*   **Superadmin**: Kontrol penuh sistem, manajemen unit kerja (jurusans/rombels), manajemen petugas, dan audit trail.
*   **Petugas (Teller)**: Operasional transaksi harian (setor, tarik, transfer) dan cetak struk.
*   **Nasabah**: Monitoring saldo, riwayat transaksi, dan manajemen profil.

## 2. Manajemen Akademik (Nasabah)
*   Integrasi dengan **Jurusan** dan **Rombel** (Kelas).
*   Sistem kenaikan kelas (Promote) otomatis yang memperbarui data Rombel.
*   Dukungan untuk berbagai tipe nasabah: Siswa, Guru, Kelas, dan Organisasi.

## 3. Transaksi Keuangan
*   **Setoran Tunai**: Menambah saldo rekening.
*   **Penarikan Tunai**: Mengurangi saldo dengan validasi saldo minimum.
*   **Transfer Sesama**: Kirim dana antar nasabah Bank Mini.
*   **Cetak Struk**: Tersedia format digital dan thermal untuk setiap transaksi.

## 4. Keamanan & Audit
*   **Email & Phone Verification**: Sistem verifikasi OTP via Email dan WhatsApp untuk aktivasi akun dan manajemen perubahan data sensitif.
*   **Dual-Step Email Change**: Proses penggantian email yang aman dengan verifikasi OTP ke email lama dan email baru.
*   **Audit Trail**: Mencatat setiap perubahan data sensitif (log aktivitas tidak dapat dihapus).
*   **Validation**: Validasi input yang ketat termasuk pengecekan NIS/NIP unik dan format rekening.
*   **Security logging**: Pencatatan aktivitas mencurigakan.
*   **Brute Force Protection**: Pembatasan percobaan login dan pemblokiran sementara IP yang mencurigakan.
