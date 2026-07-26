# Panduan Format Struk Transaksi

## Format Struk Baru

Struk transaksi telah diperbarui dengan format yang lebih detail dan sesuai dengan standar bank mini sekolah.

### Struktur Struk

```
┌────────────────────────────────────┐
│        EBANK SCHOOL                │
│     SMK NEGERI 1 CIAMIS            │
│     KABUPATEN CIAMIS               │
│        (0265) 771204               │
├────────────────────────────────────┤
│   23/07/2026 13:35:41              │
├────────────────────────────────────┤
│      TRANSAKSI KREDIT              │
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
- **Nama Sekolah**: SMK NEGERI 1 CIAMIS (hardcoded sesuai kebutuhan)
- **Kabupaten**: Diambil dari setting `bank_city`
- **No Telepon**: Diambil dari setting `phone`

#### 2. Tanggal Transaksi
- Format: `DD/MM/YYYY HH:MM:SS`
- Contoh: `23/07/2026 13:35:41`

#### 3. Tipe Transaksi
- **TRANSAKSI KREDIT**: Untuk setor, terima pembayaran, bunga
- **TRANSAKSI DEBIT**: Untuk tarik, transfer, bayar, biaya admin

#### 4. Informasi Nasabah
- **Rekening**: Nomor rekening nasabah
- **Nama**: Nama lengkap nasabah (UPPERCASE)
- **Kelas**: 
  - Untuk siswa: Menampilkan kelas dari rombel (contoh: "X RPL 1")
  - Untuk lainnya: Menampilkan tipe user (contoh: "GURU", "KARYAWAN", "ORGANISASI")

#### 5. Detail Transaksi
- **No. Trans**: Nomor urut transaksi dalam hari tersebut
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

| Jenis Transaksi | Klasifikasi | Keterangan |
|----------------|-------------|------------|
| Setor | KREDIT | Penambahan saldo |
| Tarik | DEBIT | Pengurangan saldo |
| Transfer (Pengirim) | DEBIT | Pengurangan saldo pengirim |
| Transfer (Penerima) | KREDIT | Penambahan saldo penerima |
| Bayar | DEBIT | Pembayaran ke akun pembayaran |
| Terima Bayar | KREDIT | Penerimaan pembayaran |
| Bunga | KREDIT | Bunga tabungan bulanan |
| Biaya Admin | DEBIT | Biaya administrasi bulanan |

### Kustomisasi

Untuk mengubah informasi bank di header struk:
1. Login sebagai Superadmin
2. Buka menu **Pengaturan**
3. Edit bagian **UMUM**:
   - **Nama Bank**: Nama bank yang akan ditampilkan
   - **Alamat**: Alamat lengkap bank
   - **Kota**: Nama kota/kabupaten
   - **No Telepon**: Nomor telepon bank

Perubahan akan langsung terlihat di struk transaksi berikutnya.

### Cetak Struk

Struk dapat dicetak dalam 2 cara:
1. **Cetak Struk** (Print): Mencetak struk ke printer biasa atau simpan sebagai PDF
2. **Cetak Buku** (Passbook Print): Mencetak langsung ke printer dot-matrix buku tabungan (memerlukan Passbook Bridge)

---

**Catatan**: Format struk ini dirancang untuk kompatibilitas dengan printer thermal 58mm dan printer dot-matrix standar.
