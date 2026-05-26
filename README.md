# 🏦 Bank Mini

**Sistem Perbankan Digital Sekolah Terintegrasi**

Bank Mini adalah platform perbankan digital modern yang dirancang khusus untuk memenuhi kebutuhan ekosistem keuangan di lingkungan SMK. Aplikasi ini mengintegrasikan manajemen data akademik (Jurusan & Rombel) dengan operasional perbankan harian yang aman, transparan, dan akuntabel.

---

## 🎯 Tujuan Project
Project ini bertujuan untuk menyediakan sistem pengelolaan bank mini sekolah yang modern, paperless, dan memiliki tingkat keamanan serta pelacakan dana (audit trail) yang tinggi.

## 🌟 Fitur Utama yang Diimplementasikan

*   **Manajemen Akun Terpusat**: Pengelolaan untuk berbagai role seperti Superadmin, Admin, Teller, dan Nasabah (terdiri dari tipe Siswa, Guru, Kelas, dan Organisasi).
*   **Transaksi Finansial Lengkap**: 
    *   Setor tunai
    *   Tarik tunai
    *   Transfer antar rekening
    *   Pencatuman biaya admin dan bunga secara terekam
*   **Keamanan Ekstra (MFA & OTP)**: Verifikasi Email dan WhatsApp untuk segala bentuk pembaruan data kredensial, perubahan email, tipe dual-authentication untuk mengganti email (verifikasi OTP lama & baru).
*   **Manajemen Rombel/Kelas Otomatis**: Integrasi manajemen siswa dengan sistem akademik, fitur naik kelas rombongan belajar secara masif (batch promotion).
*   **Audit Trail Inmutable & Laporan**: Seluruh aksi sensitif yang dilakukan oleh admin atau teller akan tercatat secara paten dalam sistem audit yang tidak dapat dihapus, disertai fitur pelaporan PDF dan Export.
*   **Pembukuan**: Laporan mutasi, buku besar (ledger), dan transaksi secara detail.

## 🛠️ Tools & Teknologi (Tech Stack)

Aplikasi dibangun dengan arsitektur Monolith modern menggunakan ekosistem framework terkemuka:
*   **Backend**: Laravel 11.x (PHP 8.2+)
*   **Frontend**: React 18 & TypeScript
*   **Routing & State Bridge**: Inertia.js (Bridges Laravel & React seamless)
*   **Styling**: Tailwind CSS
*   **Database**: MariaDB / MySQL
*   **Authentication**: Laravel Sanctum & Session Auth

## 📚 Dokumentasi Lebih Lanjut

Dokumentasi detail mengenai cara penggunaan, setup, dan daftar fitur spesifik dapat ditemukan di direktori `docs/`:

- 📰 [Daftar Lengkap Fitur (FEATURES.md)](./docs/FEATURES.md)
- 🚀 [Panduan Instalasi & Quick Start (QUICK_START.md)](./docs/QUICK_START.md)

## 👨‍💻 Tim Developer
Aplikasi ini dibuat oleh:

*   [Ihsan Sabana](https://github.com/ihsansabanaa)
*   [Rafli Aditya](https://github.com/rafliaditya0125)

---
*Dibuat untuk kebutuhan administrasi pendidikan dan perbankan ekosistem sekolah.*
