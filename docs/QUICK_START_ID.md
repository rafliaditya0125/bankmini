# Panduan Memulai Cepat - Bank Mini

**🌐 Language:** [English](./QUICK_START.md) | Bahasa Indonesia

---

## Daftar Isi
1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Langkah Instalasi](#langkah-instalasi)
3. [Konfigurasi](#konfigurasi)
4. [Menjalankan Aplikasi](#menjalankan-aplikasi)
5. [Kredensial Default](#kredensial-default)
6. [Gambaran Dashboard](#gambaran-dashboard)
7. [Perintah Umum](#perintah-umum)
8. [Troubleshooting](#troubleshooting)

---

## Persyaratan Sistem

Sebelum memulai, pastikan sistem Anda memenuhi persyaratan berikut:

**Software yang Diperlukan:**
- PHP 8.2 atau lebih tinggi
- Composer (versi terbaru)
- Node.js 18+ dan npm
- MySQL 8.0+ atau MariaDB 10.4+
- Web server (Apache/Nginx)

**Ekstensi PHP yang Diperlukan:**
- OpenSSL
- PDO
- Mbstring
- Tokenizer
- XML
- Ctype
- JSON
- BCMath
- Fileinfo
- GD

**Direkomendasikan:**
- Git untuk version control
- Redis untuk caching (opsional)
- Supervisor untuk queue workers (opsional)

---

## Langkah Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/bankmini.git
cd bankmini
```

### 2. Install Dependensi PHP
```bash
composer install
```

Jika mengalami error memory limit:
```bash
COMPOSER_MEMORY_LIMIT=-1 composer install
```

### 3. Install Dependensi Node
```bash
npm install
```

Untuk instalasi lebih cepat, gunakan:
```bash
npm ci  # Menggunakan package-lock.json dengan tepat
```

### 4. Setup Environment
```bash
# Copy file environment
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 5. Setup Database

**Buat Database:**
```sql
CREATE DATABASE bankmini_smk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Konfigurasi .env:**
Edit file `.env` dan atur kredensial database:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bankmini_smk
DB_USERNAME=username_anda
DB_PASSWORD=password_anda
```

### 6. Jalankan Migrations dan Seeders
```bash
# Jalankan semua migrations
php artisan migrate

# Seed database dengan data sample
php artisan db:seed

# Atau jalankan keduanya sekaligus
php artisan migrate --seed
```

Seeder akan membuat:
- Akun admin default (Superadmin, Admin, Teller)
- Sample jurusan
- Sample kelas (Rombel)
- Sample akun nasabah
- Sample transaksi

### 7. Storage Link
Buat symbolic link untuk upload file:
```bash
php artisan storage:link
```

### 8. Build Frontend Assets

**Untuk Production:**
```bash
npm run build
```

**Untuk Development:**
```bash
npm run dev
```

---

## Konfigurasi

### Konfigurasi Email (Opsional)
Untuk notifikasi email dan verifikasi OTP:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=username_anda
MAIL_PASSWORD=password_anda
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@bankmini.smk
MAIL_FROM_NAME="${APP_NAME}"
```

### Konfigurasi WhatsApp OTP (Opsional)
Untuk verifikasi OTP WhatsApp:

```env
FONNTE_TOKEN=token_fonnte_anda
```

### Konfigurasi Session
```env
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

### Konfigurasi Cache
```env
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
```

---

## Menjalankan Aplikasi

### Mode Development

Buka **dua terminal terpisah**:

**Terminal 1 - Laravel Development Server:**
```bash
php artisan serve
```
Ini akan menjalankan Laravel di `http://localhost:8000`

**Terminal 2 - Vite Development Server (Opsional tapi Direkomendasikan):**
```bash
npm run dev
```
Ini mengaktifkan hot module replacement (HMR) untuk update frontend secara instan.

### Mode Production

**1. Build Assets:**
```bash
npm run build
```

**2. Konfigurasi Web Server:**

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name bankmini.local;
    root /path/to/bankmini/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

**3. Atur Permissions:**
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## Kredensial Default

Setelah seeding, Anda dapat login dengan akun berikut:

| Role | Email/Username | Password | Deskripsi |
|------|----------------|----------|-----------|
| **Superadmin** | admin@bankmini.smk | superadmin | Akses penuh sistem |
| **Admin** | admin2@bankmini.smk | admin | Manajemen akun & transaksi |
| **Teller** | teller1@bankmini.smk | teller123 | Operasi transaksi harian |
| **Nasabah (Siswa)** | 2023001 (NIS) | 2023001 | Akun siswa |
| **Nasabah (Guru)** | 1990001 (NIP) | 1990001 | Akun guru |

**⚠️ Peringatan Keamanan:** Ubah semua password default di production!

---

## Gambaran Dashboard

### Dashboard Superadmin
**Akses:** Kontrol penuh sistem

**Fitur:**
- Statistik seluruh sistem (total nasabah, staf, saldo)
- Ringkasan transaksi hari ini (setor, tarik, transfer, bayar)
- Manajemen nasabah (operasi CRUD)
- Manajemen staf (Admin & Teller)
- Manajemen Jurusan dan Kelas
- Pengaturan sistem
- Audit trail
- Laporan komprehensif

**Menu Utama:**
- Dashboard
- Nasabah
- Petugas
- Jurusan
- Kelas
- Transaksi
- Laporan
- Audit Trail
- Pengaturan
- Profil

### Dashboard Admin
**Akses:** Manajemen nasabah dan transaksi

**Fitur:**
- Mirip dengan Superadmin tapi akses terbatas
- Tidak bisa mengelola akun staf lain
- Tidak bisa akses pengaturan sistem
- Kemampuan transaksi penuh

### Dashboard Teller
**Akses:** Operasi transaksi harian

**Fitur:**
- Statistik transaksi hari ini
- Tombol transaksi cepat
- Form setoran
- Form penarikan
- Form transfer
- Form pembayaran
- Riwayat transaksi (transaksi sendiri saja)
- Pencarian nasabah

**Menu Utama:**
- Dashboard
- Setor
- Tarik
- Transfer
- Bayar
- Riwayat Transaksi
- Profil

### Dashboard Nasabah
**Akses:** Lihat akun dan riwayat transaksi

**Fitur:**
- Tampilan saldo akun
- Nomor rekening
- Transaksi terbaru (5 terakhir)
- Riwayat transaksi lengkap
- Struk transaksi
- Manajemen profil
- Verifikasi email
- Ganti password

**Menu Utama:**
- Dashboard
- Transaksi
- Pembukuan
- Profil

---

## Perintah Umum

### Operasi Database
```bash
# Reset database sepenuhnya
php artisan migrate:fresh --seed

# Jalankan seeder tertentu
php artisan db:seed --class=UserSeeder

# Buat backup database
php artisan backup:run
```

### Manajemen Cache
```bash
# Hapus semua cache
php artisan optimize:clear

# Atau hapus secara individual
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rebuild cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Pembuatan Kode
```bash
# Buat controller
php artisan make:controller UserController

# Buat model dengan migration
php artisan make:model Customer -m

# Buat migration
php artisan make:migration create_customers_table

# Buat seeder
php artisan make:seeder CustomerSeeder
```

### Queue Workers (Jika Menggunakan Queue)
```bash
# Jalankan queue worker
php artisan queue:work

# Jalankan queue tertentu
php artisan queue:work --queue=emails

# Restart semua workers
php artisan queue:restart
```

### Mode Maintenance
```bash
# Aktifkan mode maintenance
php artisan down

# Aktifkan dengan secret bypass
php artisan down --secret="1630542a-246b-4b66-afa1-dd72a4c43515"

# Nonaktifkan mode maintenance
php artisan up
```

---

## Troubleshooting

### Error: "Base table or view not found"
**Penyebab:** Tabel database belum dibuat

**Solusi:**
```bash
php artisan migrate
# atau
php artisan migrate:fresh --seed
```

### Error: "Class not found" atau "Class does not exist"
**Penyebab:** File autoload tidak terupdate

**Solusi:**
```bash
composer dump-autoload
php artisan clear-compiled
php artisan config:clear
```

### Error: "Vite manifest not found"
**Penyebab:** Frontend assets belum di-build

**Solusi:**
```bash
npm run build
# atau untuk development
npm run dev
```

### Error: "npm command not found"
**Penyebab:** Node.js belum terinstall

**Solusi:**
- Install Node.js dari https://nodejs.org/
- Versi yang direkomendasikan: LTS (18.x atau lebih tinggi)

### Error: "SQLSTATE[HY000] [1045] Access denied"
**Penyebab:** Kredensial database salah

**Solusi:**
- Cek pengaturan database di file `.env`
- Verifikasi username dan password MySQL
- Test koneksi: `mysql -u username -p`

### Error: "Maximum execution time exceeded"
**Penyebab:** PHP timeout saat composer install

**Solusi:**
```bash
# Tingkatkan time limit
php -d max_execution_time=300 /usr/local/bin/composer install
```

### Error: "The stream or file could not be opened"
**Penyebab:** Masalah permission pada folder storage

**Solusi:**
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Halaman Menampilkan "419 | Page Expired"
**Penyebab:** CSRF token expired

**Solusi:**
- Hapus cache browser
- Atau: `php artisan config:clear`

### Frontend Tidak Update
**Penyebab:** Cache browser atau masalah build

**Solusi:**
```bash
# Hapus cache browser (Ctrl+Shift+R)
# Rebuild frontend
npm run build
# Hapus cache Laravel
php artisan optimize:clear
```

---

## Langkah Selanjutnya

Setelah instalasi berhasil:

1. **Ubah Password Default** - Prioritas keamanan!
2. **Konfigurasi Pengaturan Email** - Untuk notifikasi
3. **Setup Jurusan** - Tambahkan jurusan sekolah Anda
4. **Buat Kelas** - Setup struktur kelas (Rombel)
5. **Import Siswa** - Gunakan fitur import Excel
6. **Test Transaksi** - Coba setor, tarik, transfer, bayar
7. **Review Audit Trail** - Cek fungsi logging
8. **Explore Laporan** - Test laporan keuangan

## Resource Tambahan

- 📖 [Dokumentasi Fitur Lengkap](./FEATURES.md)
- 💳 [Panduan Sistem Pembayaran](./PAYMENT_SYSTEM.md)
- 🔧 Dokumentasi Laravel: https://laravel.com/docs
- ⚛️ Dokumentasi React: https://react.dev
- 🎨 Tailwind CSS: https://tailwindcss.com

---

**📅 Last Updated:** 18 Juni 2026  
**📝 Version:** 1.0.0  
**👥 Contributors:** Tim Pengembangan Bank Mini
