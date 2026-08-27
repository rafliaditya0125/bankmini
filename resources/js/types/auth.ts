export type User = {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'superadmin' | 'admin' | 'teller' | 'nasabah';
    phone?: string;
    user_type?: 'guru' | 'siswa' | 'kelas' | 'organisasi';
    nis?: string;
    nip?: string;
    status: 'active' | 'inactive';
    is_active: boolean;
    is_email_verified: boolean;
    two_factor_enabled: boolean;
    two_factor_confirmed_at?: string | null;
    avatar?: string;
    profile_photo_url?: string;
    profile_photo_path?: string;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    nasabah?: Nasabah;
    [key: string]: unknown;
};

export type Jurusan = {
    id: number;
    nama: string;
    kode: string;
    created_at: string;
    updated_at: string;
};

export type Nasabah = {
    id: number;
    user_id: number;
    nomor_rekening: string;
    saldo: number;
    saldo_minimum: number;
    status: 'aktif' | 'nonaktif';
    tanggal_buka: string;
    tanggal_lahir?: string;
    jenis_kelamin?: 'L' | 'P';
    alamat?: string;
    jurusan_id?: number;
    rombel_id?: number;
    jurusan_rel?: { id: number; nama: string; kode: string };
    rombel_rel?: { id: number; nama: string; jurusan_id: number; nama_kelas?: string; tingkat?: number; jurusan?: { kode: string } };
    created_at: string;
    updated_at: string;
    user: User;
};

export type Transaksi = {
    id: number;
    kode_transaksi: string;
    nasabah_id: number;
    user_id: number;
    jenis_transaksi: 'setor' | 'tarik' | 'transfer' | 'bunga' | 'biaya_admin';
    jumlah: number;
    saldo_sebelum: number;
    saldo_sesudah: number;
    nasabah_tujuan_id?: number;
    keterangan?: string;
    created_at: string;
    updated_at: string;
    status?: string;
    cancel_reason?: string;
    posted_at?: string;
    nasabah_name?: string;
    nasabah_norek?: string;
    nasabah_kelas?: string;
    nasabah?: Nasabah;
    user?: User;
    petugas?: User;
    nasabah_tujuan?: Nasabah;
};

export type AuditTrail = {
    id: number;
    user_id: number;
    activity: string;
    model_type?: string;
    model_id?: number;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    user?: User;
};

export type Auth = {
    user: User;
};
