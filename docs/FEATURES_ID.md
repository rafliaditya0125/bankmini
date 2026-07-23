# Bank Mini - Complete Features Documentation

**🌐 Language:** [English](FEATURES.md) | [Bahasa Indonesia](FEATURES_ID.md)

---

## Daftar Isi
1. [Manajemen Pengguna](#manajemen-pengguna-id)
2. [Manajemen Akun](#manajemen-akun-id)
3. [Sistem Transaksi](#sistem-transaksi-id)
4. [Sistem Pembayaran](#sistem-pembayaran-id)
5. [Pelaporan Keuangan](#pelaporan-keuangan-id)
6. [Keamanan & Audit](#keamanan-audit-id)
7. [Dashboard & Analitik](#dashboard-analitik-id)
8. [Fitur Tambahan](#fitur-tambahan-id)

---

## Manajemen Pengguna (ID)

### Kontrol Akses Berbasis Peran
Sistem menerapkan empat peran pengguna yang berbeda dengan izin spesifik:

**1. Superadmin**
- Kontrol penuh sistem
- Manajemen pengguna dan staf
- Manajemen unit akademik (Jurusan/Kelas)
- Konfigurasi pengaturan sistem
- Akses penuh audit trail
- Backup dan restore data

**2. Admin**
- Manajemen akun nasabah
- Pemrosesan transaksi (semua jenis)
- Pelaporan keuangan
- Pengaturan sistem terbatas

**3. Teller**
- Operasi transaksi harian
- Pemrosesan setor, tarik, transfer, bayar
- Cetak struk
- Riwayat transaksi pribadi saja

**4. Nasabah**
- Monitoring saldo
- Melihat riwayat transaksi
- Manajemen profil
- Pemrosesan pembayaran
- Akses struk digital

---

## Manajemen Akun (ID)

### Tipe Akun
Sistem mendukung empat tipe akun nasabah:

**1. Akun Siswa**
- Terhubung dengan NIS (Nomor Induk Siswa)
- Terkait dengan Jurusan dan Kelas
- Dukungan kenaikan kelas otomatis
- Informasi orang tua/wali
- Pelacakan status alumni

**2. Akun Guru**
- Terhubung dengan NIP (Nomor Induk Pegawai)
- Penunjukan fakultas/staf
- Terpisah dari sistem siswa

**3. Akun Kelas**
- Manajemen dana kelas kolektif
- Terhubung dengan kelas tertentu (Rombel)
- Kemungkinan multiple pengguna resmi

**4. Akun Organisasi**
- Dana organisasi sekolah
- Independen dari struktur kelas
- Manajemen berbasis aktivitas

### Fitur Akun
- Pembuatan nomor rekening unik
- Manajemen status akun (Aktif/Nonaktif)
- Pelacakan saldo
- Riwayat transaksi
- Verifikasi email dan telepon
- Fungsi reset password
- Dukungan foto profil

---

## Sistem Transaksi (ID)

### 1. Setoran (Setor)
**Fitur:**
- Setoran tunai ke rekening nasabah
- Dukungan multiple tipe transaksi
- Update saldo real-time
- Pelacakan penugasan teller
- Pembuatan struk (digital & cetak)
- Validasi denominasi minimum
- Pembuatan kode transaksi (BKM)

**Alur Kerja:**
1. Teller masukkan nomor rekening
2. Sistem tampilkan info nasabah
3. Masukkan jumlah setoran
4. Sistem validasi denominasi minimum
5. Generate kode transaksi
6. Update saldo
7. Buat log audit
8. Kirim notifikasi
9. Tampilkan struk

### 2. Penarikan (Tarik)
**Fitur:**
- Penarikan tunai dari rekening nasabah
- Validasi saldo
- Cek jumlah penarikan minimum
- Pembuatan kode transaksi (BKK)
- Cetak struk
- Pencegahan saldo tidak cukup

**Alur Kerja:**
1. Cari akun nasabah
2. Cek saldo saat ini
3. Masukkan jumlah penarikan
4. Validasi saldo mencukupi
5. Generate kode transaksi
6. Debit saldo akun
7. Buat log audit
8. Kirim notifikasi
9. Cetak struk

### 3. Transfer
**Fitur:**
- Transfer uang antar akun
- Validasi pengirim dan penerima
- Record transaksi ganda
- Kedua pihak menerima notifikasi
- Riwayat transaksi untuk kedua akun
- Pembuatan kode transfer
- Pencegahan transfer ke akun sama

**Alur Kerja:**
1. Masukkan nomor rekening pengirim
2. Masukkan nomor rekening penerima
3. Validasi kedua akun aktif
4. Masukkan jumlah transfer
5. Cek saldo pengirim
6. Buat dua record transaksi
7. Update kedua saldo
8. Generate kode transfer
9. Kirim notifikasi ke kedua pihak
10. Tampilkan struk

### 4. Pembayaran (Bayar) ⭐ BARU
**Fitur:**
- Arsitektur transaksi tunggal
- Pembayaran ke akun pembayaran yang ditentukan
- Perspektif ganda (pembayar/penerima)
- Kategorisasi jenis pembayaran
- Struk khusus
- Statistik dashboard

**Alur Kerja:**
1. Masukkan nomor rekening pembayar
2. Pilih jenis pembayaran dari dropdown
3. Masukkan jumlah pembayaran
4. Validasi saldo pembayar
5. Buat satu record transaksi
6. Update kedua saldo
7. Generate kode pembayaran
8. Kirim notifikasi ke pembayar
9. Tampilkan struk

**Karakteristik Unik:**
- Hanya 1 record database per pembayaran
- Penerima bisa lihat riwayat pembayaran
- Struk berbeda untuk pembayar vs penerima
- Muncul di kedua riwayat transaksi
- Statistik dilacak terpisah

[Lihat dokumentasi detail](./PAYMENT_SYSTEM.md)

---

## Sistem Pembayaran (ID)

### Arsitektur
Berbeda dengan transfer (2 record), pembayaran menggunakan arsitektur transaksi tunggal:

**Database:**
- 1 record dengan `nasabah_id` = pembayar
- `nasabah_tujuan_id` = akun pembayaran
- Kedua saldo diperbarui

**Query Riwayat:**
- Pembayar: `WHERE nasabah_id = id_pembayar`
- Penerima: `WHERE nasabah_tujuan_id = id_penerima AND jenis_transaksi = 'bayar'`

**Tampilan:**
- Pembayar melihat: 🔴 "BAYAR" dengan nama jenis pembayaran
- Penerima melihat: 🟢 "TERIMA BAYAR" dengan info pembayar

### Tipe Akun Pembayaran
Contoh:
- Seragam Sekolah
- SPP Bulanan
- Biaya Laboratorium
- Biaya Perpustakaan
- Peralatan Olahraga
- Partisipasi Event
- Tipe pembayaran kustom

---

## Pelaporan Keuangan (ID)

### Laporan yang Tersedia

**1. Laporan Transaksi**
- Ringkasan transaksi harian
- Trend transaksi mingguan
- Analisis transaksi bulanan
- Breakdown tipe transaksi
- Laporan kinerja teller
- Export ke PDF/Excel

**2. Laporan Saldo**
- Total saldo sistem
- Saldo per tipe akun
- Saldo per jurusan
- Saldo per kelas
- Laporan rekening individu

**3. Laporan Audit**
- Log aktivitas pengguna
- Audit trail transaksi
- Riwayat modifikasi data
- Log event keamanan
- Pelacakan percobaan login

**4. Laporan Statistik**
- Trend volume transaksi
- Waktu transaksi puncak
- Akun paling aktif
- Distribusi tipe transaksi
- Analitik tipe pembayaran ⭐ BARU

---

## Keamanan & Audit (ID)

### Autentikasi & Otorisasi
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Manajemen sesi
- Proteksi CSRF
- Pencegahan XSS

### Verifikasi Email & Telepon
- Verifikasi OTP via email
- Dukungan OTP WhatsApp
- Proses ganti email dua langkah
- Verifikasi nomor telepon
- Fungsi kirim ulang OTP

### Audit Trail
- Semua transaksi dicatat
- Pelacakan aktivitas pengguna
- Riwayat modifikasi data
- Log event keamanan
- Record audit tidak dapat diubah
- Pelacakan alamat IP
- Log user agent

### Proteksi Data
- Validasi input
- Pencegahan SQL injection
- Proteksi mass assignment
- Upload file aman
- Enkripsi data at rest
- Enforcement HTTPS

### Proteksi Brute Force
- Pembatasan percobaan login
- Pemblokiran IP sementara
- Mekanisme lockout akun
- Deteksi aktivitas mencurigakan

---

## Dashboard & Analitik (ID)

### Dashboard Teller
**Card Statistik:**
- Jumlah transaksi hari ini
- Total setoran hari ini
- Total penarikan hari ini
- Total transfer hari ini
- Total pembayaran hari ini ⭐ BARU

**Grafik:**
- Trend transaksi harian (7 hari)
- Trend mingguan (4 minggu)
- Trend bulanan (12 bulan)
- Grafik volume transaksi
- Distribusi tipe

**Akses Cepat:**
- Transaksi terbaru (10 terakhir)
- Tombol transaksi cepat
- Pencarian nasabah

### Dashboard Superadmin
**Card Statistik:**
- Total nasabah
- Total staf
- Transaksi hari ini
- Total saldo sistem
- Setor/Tarik/Transfer/Bayar hari ini ⭐ BARU

**Grafik:**
- Sama seperti Teller + data sistem-wide
- Analitik jurusan
- Analitik kelas

**Akses Cepat:**
- Nasabah terbaru
- Transaksi terbaru
- Alert sistem

### Dashboard Nasabah
**Tampilan Informasi:**
- Saldo saat ini
- Status akun
- Transaksi terbaru (5 terakhir)
- Akses pembayaran cepat
- Ringkasan akun

---

## Fitur Tambahan (ID)

### 1. Integrasi Akademik
- Manajemen jurusan
- Struktur kelas (Rombel)
- Tingkat kelas (10, 11, 12)
- Kenaikan kelas otomatis
- Promosi kelas batch
- Pelacakan status alumni
- Periode retensi akun alumni

### 2. Import/Export Data
- Import Excel untuk pembuatan nasabah bulk
- Export transaksi (PDF/Excel)
- Export laporan saldo
- Download template
- Error handling dan validasi

### 3. Struk & Pencetakan
- Tampilan struk digital
- Dukungan thermal printer
- Integrasi passbook printer (WebUSB)
- Kode transaksi di struk
- Pembuatan QR code (opsional)
- Preview cetak
- Kemampuan cetak ulang

### 4. Sistem Notifikasi
- Notifikasi email
- Notifikasi in-app
- Alert transaksi
- Update saldo
- Alert keamanan
- Pengumuman sistem

### 5. Manajemen Profil
- Upload foto
- Edit informasi pribadi
- Ganti password
- Update email dengan verifikasi
- Update nomor telepon
- Manajemen alamat

### 6. Mode Maintenance
- Toggle maintenance sistem-wide
- Pesan maintenance kustom
- Redirect pengguna otomatis
- Bypass administrator
- Dukungan maintenance terjadwal

---

**📅 Last Updated:** 18 Juni 2026  
**📝 Version:** 1.0.0  
**👥 Contributors:** Tim Pengembangan

**📚 Related Documentation:**
- [Detail Sistem Pembayaran](./PAYMENT_SYSTEM_ID.md) - Dokumentasi lengkap sistem pembayaran
- [Panduan Mulai Cepat](./QUICK_START.md) - Panduan Mulai Cepat
- [Dokumentasi API](#) - Dokumentasi API (coming soon)
