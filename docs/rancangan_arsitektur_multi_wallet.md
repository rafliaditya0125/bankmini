# Arsitektur & Rancangan Backend: Sistem Multi-Wallet (Model Bank Jago / Pocket System)

Dokumen ini merancang arsitektur backend untuk fitur **Multi-Wallet** yang dinamis, aman (*bank-grade ledger*), dan fleksibel di mana admin dapat menambah atau menonaktifkan tipe wallet tanpa perlu mengubah skema tabel database nasabah.

---

## 1. Perbandingan Konsep: Flat vs Relasional Dinamis

### Pendekatan Lama (Flat Column - Anti-Pattern)
```text
Tabel Users:
[ id | name | saldo_utama | saldo_tabungan | saldo_investasi | ... ]
```
* **Kelemahan:**
  * Setiap admin ingin tipe dompet baru, developer harus menjalankan database migration (`ALTER TABLE ADD COLUMN`).
  * Jika tipe dompet dihapus/dinonaktifkan, kolom tetap ada atau data hilang jika di-drop.
  * Audit transaksi dan mutasi per dompet menjadi sangat kompleks dan rentan *race condition*.

### Pendekatan Bank Jago (Vertical / Pocket-Based)
```text
[ User / CIF ] 1 ─── N [ Wallets / Kantong ] 1 ─── N [ Ledger / Mutasi ]
                               │
                               N
                               │
                               1
                      [ Wallet Types (Admin) ]
```
* **Kelebihan:**
  * Skema database statis & stabil selamanya.
  * Admin bebas menambah, mengedit, atau menonaktifkan tipe wallet via Dashboard Admin.
  * Nasabah bisa memiliki 1 atau banyak kantong sesuai jenis yang diizinkan.
  * Mutasi saldo tercatat per kantong (*ledger double-entry*).

---

## 2. Perancangan Skema Database (Database Schema)

Berikut rancangan DDL (PostgreSQL / MySQL kompatibel):

```sql
-- 1. Definisi Tipe Dompet oleh Admin
CREATE TABLE wallet_types (
    id BIGSERIAL PRIMARY KEY,      -- e.g., 'MAIN', 'SAVINGS', 'LOCKED_DEPOSIT', 'POCKET_SHARED'
    name VARCHAR(100) NOT NULL,             -- e.g., 'Kantong Utama', 'Kantong Nabung', 'Kantong Terkunci'
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,       -- Wallet default saat nasabah registrasi
    is_active BOOLEAN DEFAULT TRUE,        -- Status aktif/nonaktif dari admin
    allow_overdraft BOOLEAN DEFAULT FALSE,  -- Boleh minus atau tidak
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dompet Aktual Milik Nasabah (Baris Vertikal)
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    wallet_number VARCHAR(32) UNIQUE NOT NULL, -- Nomor rekening/kantong virtual (opsional)
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wallet_type_id BIGINT NOT NULL REFERENCES wallet_types(id) ON DELETE RESTRICT,
    custom_name VARCHAR(100),                  -- Nama kustom nasabah (e.g., 'Beli Motor')
    balance NUMERIC(18, 2) DEFAULT 0.00 NOT NULL, -- Cached balance
    status VARCHAR(20) DEFAULT 'ACTIVE',       -- 'ACTIVE', 'FROZEN', 'CLOSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_balance CHECK (balance >= 0 OR allow_overdraft = TRUE)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_status ON wallets(status);

-- 3. Buku Besar / Ledger Transaksi (Audit Trail Mutasi)
CREATE TABLE wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    reference_no VARCHAR(64) UNIQUE NOT NULL, -- Idempotency key / Reference
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL,                -- 'CREDIT' (masuk) atau 'DEBIT' (keluar)
    amount NUMERIC(18, 2) NOT NULL,
    balance_before NUMERIC(18, 2) NOT NULL,
    balance_after NUMERIC(18, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,            -- 'TRANSFER_IN', 'TRANSFER_OUT', 'TOPUP', 'ADMIN_ADJUSTMENT'
    description TEXT,
    metadata JSONB,                           -- Payload opsional (tujuan transfer, IP, device)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_transactions_ref_no ON wallet_transactions(reference_no);
```

---

## 3. Alur Kerja (Workflow & Business Logic)

### A. Lifecycle Registrasi Nasabah Baru
1. Nasabah mendaftar di aplikasi.
2. Sistem mencari `wallet_types` yang memiliki flag `is_default = TRUE`.
3. Sistem membuat satu entri di tabel `wallets` untuk user tersebut:
   * `user_id`: 123
   * `wallet_type_id`: ID kantong utama
   * `custom_name`: "Kantong Utama"
   * `balance`: 0.00

### B. Admin Menambah Tipe Wallet Baru
1. Admin memasukkan data melalui panel admin (contoh: "Kantong Liburan", code: `VACATION`).
2. Data tersimpan di `wallet_types`.
3. **Pilihan Strategi Provisioning:**
   * **Lazy Allocation (Direkomendasikan - Ala Bank Jago):** Wallet baru tidak otomatis dibuatkan untuk seluruh nasabah. Nasabah yang tertarik tinggal menekan tombol *"+ Buat Kantong Baru"* di aplikasi dan memilih tipe "Kantong Liburan".
   * **Eager Allocation:** Worker / batch job meng-insert baris ke `wallets` untuk semua user aktif dengan saldo 0.

### C. Admin Menonaktifkan / Menghapus Tipe Wallet
1. **Aturan Utama:** Jangan pernah melakukan `DELETE` fisik (*hard delete*) pada data `wallet_types` yang sudah memiliki relasi data di tabel `wallets`.
2. Admin mengubah status menjadi `is_active = FALSE`.
3. Nasabah tidak dapat lagi membuat kantong baru dengan tipe tersebut.
4. Untuk kantong milik nasabah yang sudah ada:
   * **Grace Period / Read-Only:** Nasabah hanya bisa menarik/memindahkan dana keluar (*outgoing transfer*), tidak bisa menerima saldo masuk.
   * **Auto-Sweep (Opsional):** Sistem otomatis mentransfer sisa saldo dari dompet yang ditutup ke "Kantong Utama" nasabah, lalu status dompet diubah menjadi `CLOSED`.

---

## 4. Keamanan Transaksi & Integritas Saldo

Dalam sistem multi-wallet perbankan:

1. **Database Locking (`SELECT ... FOR UPDATE`):**
   Saat terjadi mutasi (debit/kredit), row di tabel `wallets` harus di-lock agar tidak terjadi *race condition* (misal dua transaksi penarikan bersamaan).
   ```sql
   BEGIN;
   SELECT id, balance FROM wallets WHERE id = $wallet_id FOR UPDATE;
   -- Validasi kecukupan saldo
   UPDATE wallets SET balance = balance - $amount WHERE id = $wallet_id;
   INSERT INTO wallet_transactions (...) VALUES (...);
   COMMIT;
   ```

2. **Double-Entry Bookkeeping:**
   Setiap mutasi antar-kantong merupakan sepasang debit dan kredit:
   * Transfer dari Kantong A ke Kantong B:
     * DEBIT Kantong A (Saldo berkurang)
     * KREDIT Kantong B (Saldo bertambah)
     * Kedua mutasi diikat dalam satu `transaction_group_id` / `reference_no`.

---

## 5. Rancangan Kontrak RESTful API

### Endpoint Nasabah

#### 1. Mendapatkan Daftar Kantong Milik Nasabah
`GET /api/v1/wallets`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 101,
      "wallet_number": "W-8829102",
      "name": "Tabungan",
      "balance": 1500000.00,
      "status": "ACTIVE"
    },
    {
      "id": 102,
      "wallet_number": "W-8829103",
      "name": "Bayar Kopsis",
      "balance": 7250000.00,
      "status": "ACTIVE"
    }
  ]
}
```

#### 2. Membuat Kantong Baru (Pilihan Tipe dari Admin)
`POST /api/v1/wallets`

**Request:**
```json
{
  "wallet_type_id": 2,
  "custom_name": "Bayar Kopsis"
}
```

### Endpoint Admin

#### 1. Tambah Tipe Wallet Baru
`POST /api/v1/admin/wallet-types`

**Request:**
```json
{
  "code": "INVEST_GOLD",
  "name": "Kantong Investasi Emas",
  "description": "Kantong khusus alokasi pembelian instrumen investasi",
  "is_default": false
}
```

#### 2. Menonaktifkan Tipe Wallet
`PATCH /api/v1/admin/wallet-types/{id}`

**Request:**
```json
{
  "is_active": false
}
```

---

## 6. Ringkasan Solusi untuk Problem UI/Nasabah

Dengan struktur data di atas:
* **Tidak ada lagi kolom saldo tetap** di tabel user (tidak ada `saldo_1`, `saldo_2`, dst).
* Frontend nasabah menerima data dalam bentuk **Array of Objects**, bukan *key-value* kolom kaku.
* Frontend cukup melakukan perulangan (*looping / mapping*) komponen kartu:
  ```javascript
  wallets.map(wallet => <WalletCard key={wallet.id} data={wallet} />)
  ```
* UI nasabah otomatis beradaptasi berapa pun jumlah kantong yang dibuat atau didukung oleh admin secara dinamis dan aman.
