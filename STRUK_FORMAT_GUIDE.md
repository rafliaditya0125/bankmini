# Panduan Format Struk Transaksi

## Format Struk Baru

Struk transaksi telah diperbarui dengan format yang lebih detail dan sesuai dengan standar bank mini sekolah.

### Struktur Struk

```
┌────────────────────────────────────┐
│        EBANK SCHOOL                │
│     SMK NEGERI 1 CIAMIS            │
│     CIAMIS                         │
│  Jl. Jend. Sudirman No. 269        │
│        (0265) 771204               │
├────────────────────────────────────┤
│   23/07/2026 13:35:41              │
├────────────────────────────────────┤
│      TRANSAKSI SETOR               │
├────────────────────────────────────┤
│ Rekening    : 2111T67              │
│ Nama        : DRS. DENNI KUSDENNI  │
│ Kelas       : KARYAWAN             │
├────────────────────────────────────┤
│ No. Trans   : 260723133541         │
│ No BKK/BKM  : BKM001               │
│ Jenis Trans : PENYETORAN           │
│ Nominal     : Rp 200.000,00        │
│              Dua Ratus Ribu Rupiah │
│ Saldo Awal  : Rp 48.996,00         │
│ Saldo sekarang : Rp 248.996,00     │
│ Petugas     : SRI Y                │
├────────────────────────────────────┤
│   STRUK INI ADALAH BUKTI           │
│     TRANSAKSI YANG SAH             │
└────────────────────────────────────┘
```

### Komponen Struk

#### 1. Header Bank
- **Nama Bank**: Diambil dari setting `bank_name`
- **Nama Sekolah**: Diambil dari setting `school_name`
- **Kota/Kabupaten**: Diambil dari setting `bank_city` (tanpa kata "KABUPATEN" otomatis)
  - Anda bisa isi: "CIAMIS", "KOTA TASIKMALAYA", "KABUPATEN BANDUNG", dll
- **Alamat**: Diambil dari setting `address` (alamat lengkap)
- **No Telepon**: Diambil dari setting `phone`

#### 2. Tanggal Transaksi
- Format: `DD/MM/YYYY HH:MM:SS`
- Contoh: `23/07/2026 13:35:41`

#### 3. Tipe Transaksi
- **TRANSAKSI SETOR**: Untuk setoran/deposit
- **TRANSAKSI TARIK**: Untuk penarikan
- **TRANSAKSI TRANSFER**: Untuk transfer antar rekening
- **TRANSAKSI BAYAR**: Untuk pembayaran
- **TRANSAKSI PENERIMAAN**: Untuk penerimaan pembayaran
- **TRANSAKSI BUNGA**: Untuk bunga tabungan bulanan
- **TRANSAKSI BIAYA ADMIN**: Untuk biaya administrasi bulanan

#### 4. Informasi Nasabah
- **Rekening**: Nomor rekening nasabah
- **Nama**: Nama lengkap nasabah (UPPERCASE)
- **Kelas**: 
  - Untuk siswa: Menampilkan kelas dari rombel (contoh: "X RPL 1")
  - Untuk lainnya: Menampilkan tipe user (contoh: "GURU", "KARYAWAN", "ORGANISASI")

#### 5. Detail Transaksi
- **No. Trans**: Nomor urut transaksi dari awal aplikasi berjalan (menggunakan ID auto-increment database)
  - Contoh: 260723133541 (transaksi ke-260723133541 sejak aplikasi dimulai)
  - **Tidak pernah reset**, terus bertambah setiap ada transaksi baru
- **No BKK/BKM**: Kode unik transaksi
- **Jenis Trans**: Jenis transaksi (SETOR TUNAI, PENARIKAN TUNAI, dll)
- **Nominal**: Jumlah transaksi dalam format Rp X.XXX.XXX,XX
- **Terbilang**: Nominal dalam kata-kata (Bahasa Indonesia)
- **Saldo Awal**: Saldo sebelum transaksi
- **Saldo sekarang**: Saldo setelah transaksi
- **Petugas**: Nama petugas yang melakukan transaksi

#### 6. Footer
- Validasi bahwa struk adalah bukti transaksi yang sah

### Format Nominal

Nominal menggunakan format Indonesia:
- **Pemisah Ribuan**: Titik (.)
- **Pemisah Desimal**: Koma (,)
- **Contoh**: 
  - 1.000,00 (Seribu Rupiah)
  - 200.000,00 (Dua Ratus Ribu Rupiah)
  - 1.250.500,50 (Satu Juta Dua Ratus Lima Puluh Ribu Lima Ratus Rupiah Lima Puluh Sen)

### Konversi Terbilang

Aplikasi secara otomatis mengkonversi nominal ke terbilang:
- 200.000 → "Dua Ratus Ribu Rupiah"
- 1.000.000 → "Satu Juta Rupiah"
- 5.500 → "Lima Ribu Lima Ratus Rupiah"

### Klasifikasi Transaksi

| Jenis Transaksi | Header Struk | Keterangan |
|----------------|--------------|------------|
| Setor | TRANSAKSI SETOR | Penambahan saldo |
| Tarik | TRANSAKSI TARIK | Pengurangan saldo |
| Transfer | TRANSAKSI TRANSFER | Transfer antar rekening |
| Bayar | TRANSAKSI BAYAR | Pembayaran ke akun pembayaran |
| Terima Bayar | TRANSAKSI PENERIMAAN | Penerimaan pembayaran |
| Bunga | TRANSAKSI BUNGA | Bunga tabungan bulanan |
| Biaya Admin | TRANSAKSI BIAYA ADMIN | Biaya administrasi bulanan |

### Kustomisasi

Untuk mengubah informasi bank di header struk:
1. Login sebagai Superadmin
2. Buka menu **Pengaturan**
3. Edit bagian **UMUM**:
   - **Nama Bank**: Nama bank yang akan ditampilkan (contoh: "Ebank School")
   - **Nama Sekolah**: Nama lengkap sekolah (contoh: "SMK NEGERI 1 CIAMIS")
   - **Kota**: Nama kota/kabupaten (contoh: "CIAMIS", "KOTA TASIKMALAYA", "KABUPATEN BANDUNG")
   - **Alamat**: Alamat lengkap bank
   - **No Telepon**: Nomor telepon bank

**Contoh Konfigurasi:**

**SMK di Ciamis:**
- Nama Bank: Ebank School
- Nama Sekolah: SMK NEGERI 1 CIAMIS
- Kota: CIAMIS

**SMK di Kota Tasikmalaya:**
- Nama Bank: Bank Mini SMKN 5
- Nama Sekolah: SMK NEGERI 5 TASIKMALAYA
- Kota: KOTA TASIKMALAYA

**SMK di Kabupaten:**
- Nama Bank: Bank Mini SMKN 2
- Nama Sekolah: SMK NEGERI 2 SOREANG
- Kota: KABUPATEN BANDUNG

Perubahan akan langsung terlihat di struk transaksi berikutnya.

### Cetak Struk

Struk dapat dicetak dalam 2 cara:
1. **Cetak Struk** (Print): Mencetak struk ke printer biasa atau simpan sebagai PDF
2. **Cetak Buku** (Passbook Print): Mencetak langsung ke printer dot-matrix buku tabungan (memerlukan Passbook Bridge)

---

**Catatan**: Format struk ini dirancang untuk kompatibilitas dengan printer thermal 58mm dan printer dot-matrix standar.
