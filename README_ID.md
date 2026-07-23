# 🏦 Bank Mini - Sistem Perbankan Digital Sekolah

**🌐 Language:** [English](./README.md) | Bahasa Indonesia

---

### Gambaran Umum

**Bank Mini** adalah platform perbankan digital modern yang dirancang khusus untuk memenuhi kebutuhan ekosistem keuangan di lingkungan SMK. Aplikasi ini mengintegrasikan manajemen data akademik (Jurusan & Rombel) dengan operasional perbankan harian yang aman, transparan, dan akuntabel.

### 🎯 Tujuan Project

Project ini bertujuan untuk menyediakan sistem pengelolaan bank mini sekolah yang modern, paperless, dan memiliki tingkat keamanan serta pelacakan dana (audit trail) yang tinggi.

### ✨ Fitur Utama

**Manajemen Akun**
- Kontrol akses multi-peran (Superadmin, Admin, Teller, Nasabah)
- Tipe nasabah: Siswa, Guru, Kelas, Organisasi, Pembayaran
- Pembuatan nomor rekening unik
- Manajemen status akun

**Transaksi Finansial**
- Setoran tunai (Setor)
- Penarikan tunai (Tarik)
- Transfer antar rekening
- Sistem pembayaran dengan arsitektur transaksi tunggal ⭐ BARU
- Update saldo real-time
- Pelacakan biaya admin dan bunga

**Keamanan & Autentikasi**
- Multi-factor authentication (MFA & OTP)
- Verifikasi Email dan WhatsApp
- Autentikasi dua langkah untuk perubahan email
- Role-based access control (RBAC)
- Proteksi brute force

**Integrasi Akademik**
- Manajemen jurusan
- Integrasi struktur kelas (Rombel)
- Kenaikan kelas otomatis
- Promosi kelas massal (batch)
- Pelacakan status alumni

**Audit & Pelaporan**
- Audit trail yang tidak dapat diubah
- Laporan keuangan komprehensif
- Riwayat transaksi dengan filter
- Export PDF dan Excel
- Buku besar dan laporan mutasi

**Fitur Tambahan**
- Dashboard responsif dengan analitik
- Notifikasi real-time
- Cetak struk (thermal & passbook)
- Import/export data (Excel)
- Mode maintenance
- Manajemen profil dengan upload foto

### 🛠️ Teknologi yang Digunakan

Dibangun dengan arsitektur monolitik modern menggunakan framework terkemuka:

- **Backend**: Laravel 11.x (PHP 8.2+)
- **Frontend**: React 18 & TypeScript
- **Bridge**: Inertia.js (Integrasi seamless Laravel & React)
- **Styling**: Tailwind CSS
- **Database**: MariaDB / MySQL
- **Authentication**: Laravel Sanctum & Session Auth
- **Build Tools**: Vite

### 📦 Persyaratan Sistem

- PHP 8.2 atau lebih tinggi
- Composer
- Node.js 18+ & npm
- MySQL 8.0+ atau MariaDB 10.4+
- Web server Apache/Nginx

### 🚀 Memulai Cepat

```bash
# Clone repository
git clone https://github.com/yourusername/bankmini.git
cd bankmini

# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Konfigurasi database di .env
# DB_DATABASE=bankmini_smk

# Jalankan migrations dan seeders
php artisan migrate --seed

# Build frontend
npm run build

# Jalankan development server
php artisan serve          # Terminal 1
npm run dev               # Terminal 2 (opsional)
```

Akses aplikasi di `http://localhost:8000`

### 📚 Dokumentasi

Dokumentasi detail mengenai cara penggunaan, setup, dan daftar fitur spesifik:

- 📖 [Daftar Lengkap Fitur](./docs/FEATURES.md)
- 🚀 [Panduan Instalasi & Quick Start](./docs/QUICK_START_ID.md)
- 💳 [Dokumentasi Sistem Pembayaran](./docs/PAYMENT_SYSTEM.md)

### 🔑 Kredensial Default

**Akun Testing:**

| Role | Username/Email | Password |
|------|----------------|----------|
| Superadmin | admin@bankmini.smk | superadmin |
| Admin | admin2@bankmini.smk | admin |
| Teller | teller1@bankmini.smk | teller123 |
| Nasabah (Siswa) | 2023001 | 2023001 |

⚠️ **Peringatan Keamanan:** Ubah semua password default di production!

### 👥 Tim Pengembang

Aplikasi ini dibuat oleh:
- [Ihsan Sabana](https://github.com/ihsansabanaa)
- [Rafli Aditya](https://github.com/rafliaditya0125)

### 📄 Lisensi

Project ini dikembangkan untuk kebutuhan administrasi pendidikan dan perbankan ekosistem sekolah.

---

**📅 Last Updated:** 18 Juni 2026  
**📝 Version:** 1.0.0
