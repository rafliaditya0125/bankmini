# Quick Start Guide - Bank Mini SMK

## Langkah Cepat Setup Sistem

### 1. Persiapan Database
Buat database baru dengan nama `bankmini_smk`:
\`\`\`sql
CREATE DATABASE bankmini_smk;
\`\`\`

### 2. Setup Environment
Edit file `.env` dan sesuaikan:
\`\`\`env
APP_NAME="Bank Mini SMK"
DB_DATABASE=bankmini_smk
\`\`\`

### 3. Install & Setup
Jalankan perintah berikut secara berurutan:

\`\`\`bash
# 1. Install dependencies
composer install
npm install

# 2. Setup environment
cp .env.example .env
php artisan key:generate

# 3. Run migrations & seeders
php artisan migrate --seed

# 4. Build frontend
npm run build
\`\`\`

### 4. Jalankan Aplikasi
Buka 2 terminal:

**Terminal 1 - Laravel Server:**
\`\`\`bash
php artisan serve
\`\`\`

**Terminal 2 - Vite Dev Server:**
\`\`\`bash
npm run dev
\`\`\`

### 5. Akses Aplikasi
Buka browser dan akses: `http://localhost:8000`

### 6. Login
Gunakan kredensial berikut untuk testing:

| Role | Email | Password |
|------|-------|----------|
| Superadmin | admin@bankmini.smk | superadmin |
| Admin | admin@bankmini.smk | admin |
| Teller | budi@bankmini.smk | password |
| Nasabah | 2023101 | 2023101 |

## Troubleshooting

### Error: "Base table or view not found"
**Solusi**: Jalankan migrations
\`\`\`bash
php artisan migrate
\`\`\`

### Error: "Class not found"
**Solusi**: Clear cache dan regenerate autoload
\`\`\`bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
\`\`\`

### Error: "npm command not found"
**Solusi**: Install Node.js dari https://nodejs.org/

### Error: "Vite manifest not found"
**Solusi**: Build ulang frontend
\`\`\`bash
npm run build
\`\`\`

## Struktur Dashboard

### Superadmin Dashboard
- Statistik keseluruhan sistem
- Manajemen nasabah
- Manajemen petugas
- Laporan transaksi
- Audit trail

### Teller Dashboard
- Statistik transaksi harian
- Form setoran
- Form penarikan
- Form transfer
- Riwayat transaksi

### Nasabah Dashboard
- Info saldo rekening
- Nomor rekening
- Riwayat transaksi
- Status rekening

## Commands Berguna

\`\`\`bash
# Reset database (fresh migration + seed)
php artisan migrate:fresh --seed

# Clear all cache
php artisan optimize:clear

# Create new controller
php artisan make:controller NamaController

# Create new model
php artisan make:model NamaModel -m

# Run tests
php artisan test
\`\`\`

## Selamat Mencoba! 🚀
