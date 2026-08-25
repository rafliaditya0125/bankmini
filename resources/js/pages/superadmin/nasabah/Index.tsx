import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout';
import Modal from '@/components/Modal';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import type { Nasabah, User } from '@/types';
import { formatRupiah, formatNumber, parseNumber } from '@/lib/utils';

interface NasabahIndexProps {
    nasabah: {
        data: (Nasabah & { user: User })[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
        tingkat?: string;
        jurusan_id?: string;
        rombel_id?: string;
        user_type?: string;
    };
    available_jurusan: { id: number; nama: string; kode: string }[];
    available_rombels: { id: number; nama: string; jurusan_id: number; tingkat: number }[];
}

type NasabahUserType = 'siswa' | 'kelas' | 'organisasi' | 'guru' | 'pembayaran';

export default function NasabahIndex({ nasabah, filters, available_jurusan = [], available_rombels = [] }: NasabahIndexProps) {
    const { auth } = usePage<any>().props;
    const rolePrefix = auth.user.role === 'superadmin' ? 'superadmin' : 'admin';

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [tingkatFilter, setTingkatFilter] = useState(filters.tingkat || 'all');
    const [jurusanFilter, setJurusanFilter] = useState(filters.jurusan_id || 'all');
    const [rombelFilter, setRombelFilter] = useState(filters.rombel_id || 'all');
    const [typeFilter, setTypeFilter] = useState(filters.user_type || 'all');

    const [modalOpen, setModalOpen] = useState(false);
    const [promoteBatchModalOpen, setPromoteBatchModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [bulkKelasModalOpen, setBulkKelasModalOpen] = useState(false);
    const [targetJurusanFilter, setTargetJurusanFilter] = useState('all');
    const [targetRombelId, setTargetRombelId] = useState('');
    const [isUpdatingKelas, setIsUpdatingKelas] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<(Nasabah & { user: User }) | null>(null);
    const [viewKelasModalOpen, setViewKelasModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Excluded students search states for batch promote
    const [excludedStudents, setExcludedStudents] = useState<{ id: number; name: string; identifier: string; rombel: string }[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
    const [isSearchingStudent, setIsSearchingStudent] = useState(false);
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentSearchRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper for input masking
    const [displaySaldoAwal, setDisplaySaldoAwal] = useState('');
    const userTypeLabel: Record<NasabahUserType, string> = {
        siswa: 'Siswa',
        kelas: 'Kelas',
        organisasi: 'Organisasi',
        guru: 'Guru',
        pembayaran: 'Pembayaran',
    };

    const getIdentifier = (item: Nasabah & { user: User }) => {
        if (item.user.user_type === 'siswa') return item.user.nis;
        if (item.user.user_type === 'guru') return item.user.nip;
        return item.nomor_rekening;
    };

    const handleSaldoAwalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatNumber(val);
        setDisplaySaldoAwal(formatted);
        setData('saldo_awal', String(parseNumber(formatted)));
    };

    // Filtered rombels based on tingkat and jurusan
    const filteredRombels = available_rombels.filter(r => {
        const matchTingkat = tingkatFilter === 'all' || r.tingkat.toString() === tingkatFilter;
        const matchJurusan = jurusanFilter === 'all' || r.jurusan_id.toString() === jurusanFilter;
        return matchTingkat && matchJurusan;
    });

    // Realtime search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const queryParams: any = {};
            if (search) queryParams.search = search;
            if (statusFilter !== 'all') queryParams.status = statusFilter;
            if (tingkatFilter !== 'all') queryParams.tingkat = tingkatFilter;
            if (jurusanFilter !== 'all') queryParams.jurusan_id = jurusanFilter;
            if (rombelFilter !== 'all') queryParams.rombel_id = rombelFilter;
            if (typeFilter !== 'all') queryParams.user_type = typeFilter;

            // Only navigate if filters changed from prop values
            if (
                search !== (filters.search || '') ||
                statusFilter !== (filters.status || 'all') ||
                tingkatFilter !== (filters.tingkat || 'all') ||
                jurusanFilter !== (filters.jurusan_id || 'all') ||
                rombelFilter !== (filters.rombel_id || 'all') ||
                typeFilter !== (filters.user_type || 'all')
            ) {
                setSelectedIds([]);
                router.get(`/${rolePrefix}/nasabah`, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true
                });
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, statusFilter, tingkatFilter, jurusanFilter, rombelFilter, typeFilter, rolePrefix, filters]);

    // Sync state if props change externally
    useEffect(() => {
        setSearch(filters.search || '');
        setStatusFilter(filters.status || 'all');
        setTingkatFilter(filters.tingkat || 'all');
        setJurusanFilter(filters.jurusan_id || 'all');
        setRombelFilter(filters.rombel_id || 'all');
        setTypeFilter(filters.user_type || 'all');
        setSelectedIds([]);
    }, [filters]);

    const handleJurusanFilterChange = (val: string) => {
        setJurusanFilter(val);
        setRombelFilter('all'); // Reset rombel when jurusan changes
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
    };

    // Checkbox selection handlers
    const isAllSelected = nasabah.data.length > 0 && nasabah.data.every(item => selectedIds.includes(item.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected && nasabah.data.some(item => selectedIds.includes(item.id));

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            const allIds = nasabah.data.map(item => item.id);
            setSelectedIds(allIds);
        }
    };

    const handleBulkPromote = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            show: true,
            title: 'Naikkan Kelas Massal',
            message: `Apakah Anda yakin ingin menaikkan kelas untuk ${selectedIds.length} nasabah yang dipilih? (Nasabah non-siswa otomatis dilewati).`,
            variant: 'info',
            onConfirm: () => {
                router.post(`/${rolePrefix}/nasabah/bulk-promote`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const handleBulkUpdateKelas = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRombelId || selectedIds.length === 0) return;

        setIsUpdatingKelas(true);
        router.post(`/${rolePrefix}/nasabah/bulk-kelas`, {
            ids: selectedIds,
            rombel_id: parseInt(targetRombelId),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setBulkKelasModalOpen(false);
                setTargetRombelId('');
                setTargetJurusanFilter('all');
                setSelectedIds([]);
                setIsUpdatingKelas(false);
            },
            onError: () => {
                setIsUpdatingKelas(false);
            },
            onFinish: () => {
                setIsUpdatingKelas(false);
            }
        });
    };

    const handleBulkStatus = (targetStatus: 'aktif' | 'nonaktif') => {
        if (selectedIds.length === 0) return;
        const action = targetStatus === 'aktif' ? 'mengaktifkan' : 'menonaktifkan';
        setConfirmModal({
            show: true,
            title: targetStatus === 'aktif' ? 'Aktifkan Akun Massal' : 'Nonaktifkan Akun Massal',
            message: `Apakah Anda yakin ingin ${action} ${selectedIds.length} nasabah yang dipilih?${targetStatus === 'nonaktif' ? ' Nasabah tidak akan bisa login.' : ''}`,
            variant: targetStatus === 'nonaktif' ? 'warning' : 'success',
            onConfirm: () => {
                router.post(`/${rolePrefix}/nasabah/bulk-status`, { ids: selectedIds, status: targetStatus }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            show: true,
            title: 'Hapus Rekening Massal',
            message: `Apakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedIds.length} rekening nasabah yang dipilih? Rekening yang masih memiliki sisa saldo akan otomatis dilewati demi keamanan.`,
            variant: 'danger',
            onConfirm: () => {
                router.post(`/${rolePrefix}/nasabah/bulk-delete`, { ids: selectedIds }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setConfirmModal(prev => ({ ...prev, show: false }));
                    }
                });
            }
        });
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        nomor_rekening: '',
        phone: '',
        user_type: 'siswa' as NasabahUserType,
        nis: '',
        nip: '',
        jurusan_id: '',
        rombel_id: '',
        alamat: '',
        saldo_awal: '',
    });

    const isFormValid = (() => {
        if (!data.name || !data.nomor_rekening || !data.email) return { valid: false, message: 'lengkapi semua data' };
        if (data.user_type === 'siswa') {
            if (!data.nis) return { valid: false, message: 'lengkapi semua data' };
            if (!data.jurusan_id || data.jurusan_id === '') return { valid: false, message: 'pilih jurusan' };
            if (!data.rombel_id || data.rombel_id === '') return { valid: false, message: 'pilih kelas' };
            if (!data.saldo_awal) return { valid: false, message: 'isi saldo awal' };
        } else if (data.user_type === 'kelas') {
            if (!data.jurusan_id || data.jurusan_id === '') return { valid: false, message: 'pilih jurusan' };
            if (!data.rombel_id || data.rombel_id === '') return { valid: false, message: 'pilih kelas' };
            if (!data.saldo_awal) return { valid: false, message: 'isi saldo awal' };
        } else if (data.user_type === 'organisasi') {
            if (!data.saldo_awal) return { valid: false, message: 'isi saldo awal' };
        } else if (data.user_type === 'guru') {
            if (!data.nip) return { valid: false, message: 'lengkapi semua data' };
        }
        return { valid: true, message: 'Buka Rekening' };
    })();

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        name: '',
        email: '',
        nomor_rekening: '',
        phone: '',
        user_type: 'siswa' as NasabahUserType,
        nis: '',
        nip: '',
        password: '',
        password_confirmation: '',
        jurusan_id: '',
        rombel_id: '',
        alamat: '',
        status: 'aktif' as 'aktif' | 'nonaktif',
    });

    const isEditFormValid = (() => {
        if (!editData.name || !editData.nomor_rekening || !editData.email) return { valid: false, message: 'lengkapi semua data' };
        if (editData.user_type === 'siswa') {
            if (!editData.nis) return { valid: false, message: 'lengkapi semua data' };
            if (!editData.jurusan_id || editData.jurusan_id === '') return { valid: false, message: 'pilih jurusan' };
            if (!editData.rombel_id || editData.rombel_id === '') return { valid: false, message: 'pilih kelas' };
        } else if (editData.user_type === 'kelas') {
            if (!editData.jurusan_id || editData.jurusan_id === '') return { valid: false, message: 'pilih jurusan' };
            if (!editData.rombel_id || editData.rombel_id === '') return { valid: false, message: 'pilih kelas' };
        } else if (editData.user_type === 'guru') {
            if (!editData.nip) return { valid: false, message: 'lengkapi semua data' };
        }
        return { valid: true, message: 'Simpan Perubahan' };
    })();

    const { data: batchData, setData: setBatchData, post: postBatch, processing: batchProcessing, reset: resetBatch } = useForm({
        scope: 'all' as 'all' | 'jurusan' | 'rombel',
        jurusan_id: '',
        rombel_id: '',
        kelas_asal: 'all',
        exclude_jurusan_ids: [] as number[],
        exclude_rombel_ids: [] as number[],
        exclude_nasabah_ids: [] as number[],
    });

    // Confirmation modal states
    const [confirmModal, setConfirmModal] = useState<{show: boolean; title: string; message: string; variant: 'danger'|'warning'|'info'|'success'; onConfirm: () => void}>({show: false, title: '', message: '', variant: 'info', onConfirm: () => {}});

    const { data: importData, setData: setImportData, post: postImport, processing: importProcessing } = useForm({
        files: [] as File[],
    });

    const handleToggleStatus = (id: number, name: string, currentStatus: string) => {
        const action = currentStatus === 'aktif' ? 'menonaktifkan' : 'mengaktifkan';
        setConfirmModal({
            show: true,
            title: action === 'menonaktifkan' ? 'Nonaktifkan Akun' : 'Aktifkan Akun',
            message: `Apakah Anda yakin ingin ${action} nasabah ${name}?${action === 'menonaktifkan' ? ' Nasabah tidak akan bisa login.' : ''}`,
            variant: action === 'menonaktifkan' ? 'warning' : 'success',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/nasabah/${id}`, { preserveScroll: true });
                setConfirmModal(prev => ({...prev, show: false}));
            }
        });
    };

    const handleDeleteRekening = (id: number, name: string, saldo: number) => {
        if (saldo > 0) {
            setConfirmModal({
                show: true,
                title: 'Saldo Masih Tersisa',
                message: `Rekening ${name} masih memiliki saldo ${formatRupiah(saldo)}. Silakan lakukan penarikan seluruh saldo terlebih dahulu.`,
                variant: 'warning',
                onConfirm: () => {
                    setConfirmModal(prev => ({...prev, show: false}));
                    router.get(`/${rolePrefix}/tarik`, { search: name });
                }
            });
            return;
        }
        setConfirmModal({
            show: true,
            title: 'Hapus Rekening Permanen',
            message: `Apakah Anda yakin ingin MENGHAPUS PERMANEN rekening nasabah ${name}? Data akan dihapus dari database dan tidak dapat dikembalikan.`,
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/${rolePrefix}/nasabah/${id}/delete-rekening`, { preserveScroll: true });
                setConfirmModal(prev => ({...prev, show: false}));
            }
        });
    };

    const handlePromote = (id: number, name: string) => {
        setConfirmModal({
            show: true,
            title: 'Naik Kelas',
            message: `Naikkan kelas nasabah ${name}?`,
            variant: 'info',
            onConfirm: () => {
                router.post(`/${rolePrefix}/nasabah/${id}/promote`, {}, { preserveScroll: true });
                setConfirmModal(prev => ({...prev, show: false}));
            }
        });
    };

    // Debounced search for excluded students
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
                setIsStudentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!studentSearchQuery || studentSearchQuery.trim().length < 2) {
            setStudentSearchResults([]);
            setIsStudentDropdownOpen(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsSearchingStudent(true);
            axios.get(`/api/nasabah/search?q=${encodeURIComponent(studentSearchQuery.trim())}`)
                .then(res => {
                    const data = (res.data || []).filter((item: any) => {
                        const isStudent = item.user?.user_type === 'siswa' || !item.user?.user_type;
                        const notExcluded = !batchData.exclude_nasabah_ids.includes(item.id);
                        return isStudent && notExcluded;
                    });
                    setStudentSearchResults(data);
                    setIsStudentDropdownOpen(true);
                })
                .catch(err => console.error(err))
                .finally(() => setIsSearchingStudent(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [studentSearchQuery, batchData.exclude_nasabah_ids]);

    const handleAddExcludedStudent = (student: any) => {
        const studentInfo = {
            id: student.id,
            name: student.user?.name || student.name || 'Siswa',
            identifier: student.user?.nis || student.nomor_rekening || '',
            rombel: student.rombel_rel?.nama || student.rombelRel?.nama || student.jurusan_rel?.kode || '',
        };
        setExcludedStudents(prev => [...prev, studentInfo]);
        setBatchData('exclude_nasabah_ids', [...batchData.exclude_nasabah_ids, student.id]);
        setStudentSearchQuery('');
        setIsStudentDropdownOpen(false);
    };

    const handleRemoveExcludedStudent = (id: number) => {
        setExcludedStudents(prev => prev.filter(s => s.id !== id));
        setBatchData('exclude_nasabah_ids', batchData.exclude_nasabah_ids.filter(item => item !== id));
    };

    const handleToggleExcludeJurusan = (jurusanId: number) => {
        if (batchData.exclude_jurusan_ids.includes(jurusanId)) {
            setBatchData('exclude_jurusan_ids', batchData.exclude_jurusan_ids.filter(id => id !== jurusanId));
        } else {
            setBatchData('exclude_jurusan_ids', [...batchData.exclude_jurusan_ids, jurusanId]);
        }
    };

    const handleToggleExcludeRombel = (rombelId: number) => {
        if (batchData.exclude_rombel_ids.includes(rombelId)) {
            setBatchData('exclude_rombel_ids', batchData.exclude_rombel_ids.filter(id => id !== rombelId));
        } else {
            setBatchData('exclude_rombel_ids', [...batchData.exclude_rombel_ids, rombelId]);
        }
    };

    const handlePromoteBatchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postBatch(`/${rolePrefix}/nasabah/promote-batch`, {
            preserveScroll: true,
            onSuccess: () => {
                setPromoteBatchModalOpen(false);
                resetBatch();
                setExcludedStudents([]);
            },
        });
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postImport(`/${rolePrefix}/nasabah/import`, {
            preserveScroll: true,
            onSuccess: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onFinish: () => {
                setImportModalOpen(false);
                setImportData('files', []);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/${rolePrefix}/nasabah`, {
            onSuccess: () => {
                setModalOpen(false);
                reset();
                setDisplaySaldoAwal('');
            },
        });
    };

    const openEditModal = (item: Nasabah & { user: User }) => {
        setEditTarget(item);
        // Set default values based on target item
        setEditData('name', item.user.name);
        setEditData('email', item.user.email);
        setEditData('user_type', item.user.user_type as any);
        setEditData('nis', item.user.nis || '');
        setEditData('nip', item.user.nip || '');
        setEditData('nomor_rekening', item.nomor_rekening);
        setEditData('phone', item.user.phone || '');
        setEditData('alamat', item.alamat || '');
        setEditData('status', item.status as 'aktif' | 'nonaktif');
        
        // Populate Jurusan ID from direct field OR relationship
        const rombel = (item as any).rombel_rel || (item as any).rombelRel;
        const initialJurusanId = (item as any).jurusan_id?.toString() || rombel?.jurusan_id?.toString() || '';
        setEditData('jurusan_id', initialJurusanId);
        setEditData('rombel_id', (item as any).rombel_id?.toString() || '');
        setEditData('password', ''); // Always empty on init
        setEditData('password_confirmation', '');
        
        setEditOpen(true);

    };

    const closeEditModal = () => {
        setEditOpen(false);
        resetEdit('password', 'password_confirmation');
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        putEdit(`/${rolePrefix}/nasabah/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                resetEdit();
            },
            onError: (errors) => {
                // Errors are automatically set in editErrors by Inertia
                // Just log for debugging
                console.error('Validation errors:', errors);
            },
        });
    };

    return (
        <DashboardLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Kelola Nasabah</h1>
                        <p className="mt-1 text-sm text-slate-500">Manajemen data nasabah dan rekening</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-50/70 text-emerald-700 border border-emerald-200/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] hover:bg-emerald-100/80 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import Excel
                        </button>
                        <button
                            onClick={() => {
                                resetBatch();
                                setExcludedStudents([]);
                                setPromoteBatchModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-50/70 text-emerald-700 border border-emerald-200/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] hover:bg-emerald-100/80 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Naik Kelas Batch
                        </button>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Nasabah
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Kelola Nasabah" />

            <div className="space-y-6">
                {/* Filters Section */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/70 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="lg:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Cari Nasabah</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Nama atau nomor rekening..."
                                    maxLength={255}
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 outline-none transition-all"
                                />
                                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Tipe</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA TIPE</option>
                                <option value="siswa">SISWA</option>
                                <option value="kelas">KELAS</option>
                                <option value="organisasi">ORGANISASI</option>
                                <option value="guru">GURU</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Tingkat</label>
                            <select
                                value={tingkatFilter}
                                onChange={(e) => {
                                    setTingkatFilter(e.target.value);
                                    setRombelFilter('all'); // Reset rombel when tingkat changes
                                }}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA TINGKAT</option>
                                <option value="10">TINGKAT 10</option>
                                <option value="11">TINGKAT 11</option>
                                <option value="12">TINGKAT 12</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Jurusan</label>
                            <select
                                value={jurusanFilter}
                                onChange={(e) => {
                                    setJurusanFilter(e.target.value);
                                    setRombelFilter('all'); // Reset rombel when jurusan changes
                                }}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA JURUSAN</option>
                                {available_jurusan.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Kelas (Rombel)</label>
                            <select
                                value={rombelFilter}
                                onChange={(e) => setRombelFilter(e.target.value)}
                                className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] appearance-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 transition-all"
                            >
                                <option value="all">SEMUA KELAS</option>
                                {filteredRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                            <p className="text-[9px] text-slate-400 mt-1 ml-1">
                                {filteredRombels.length} kelas tersedia
                                {(tingkatFilter !== 'all' || jurusanFilter !== 'all') && ' (terfilter)'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1 tracking-[0.2em]">Filter Status</label>
                        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-full self-start mt-1">
                            {['all', 'aktif', 'nonaktif'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusFilter(s)}
                                    className={`px-4 py-1.5 text-[10px] font-semibold rounded-full transition-all uppercase tracking-[0.2em] ${
                                        statusFilter === s
                                            ? 'bg-white text-slate-900 border border-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center bg-emerald-500 text-slate-900 font-black text-xs h-7 min-w-7 px-2 rounded-xl">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                                Nasabah Terpilih
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleBulkPromote}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Naikkan Kelas
                            </button>
                            <button
                                onClick={() => {
                                    setTargetRombelId('');
                                    setTargetJurusanFilter('all');
                                    setBulkKelasModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Ubah Kelas
                            </button>
                            <button
                                onClick={() => handleBulkStatus('aktif')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aktifkan
                            </button>
                            <button
                                onClick={() => handleBulkStatus('nonaktif')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Nonaktifkan
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus Rekening
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {/* Table Card */}
                <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80 border-b border-slate-200/70">
                                <tr>
                                    <th className="px-4 py-4 text-center w-12 border-b border-slate-200/70">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                                            title="Pilih Semua di Halaman Ini"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">No. Rekening</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Nasabah</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Tipe</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Kelas</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Saldo</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nasabah.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Tidak ada data nasabah ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    nasabah.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}
                                        >
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono font-semibold text-emerald-700 uppercase tracking-tighter">{item.nomor_rekening}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-semibold text-white">
                                                            {item.user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-slate-900 tracking-tight">{item.user.name}</p>
                                                            {item.user.is_email_verified ? (
                                                                <div className="flex items-center justify-center p-0.5 rounded-full bg-emerald-100 text-emerald-600 shadow-sm" title="Email Terverifikasi">
                                                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center p-0.5 rounded-full bg-slate-100 text-slate-400" title="Email Belum Terverifikasi">
                                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">{getIdentifier(item) || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-semibold border uppercase tracking-[0.2em] ${
                                                    item.user.user_type === 'siswa'
                                                        ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                                        : item.user.user_type === 'guru'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                                            : 'bg-violet-50 text-violet-700 border-violet-200/70'
                                                }`}>
                                                    {userTypeLabel[item.user.user_type as NasabahUserType] || item.user.user_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {((item as any).rombel_rel || (item as any).rombelRel) ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200/70 uppercase tracking-[0.2em]">
                                                        {((item as any).rombel_rel || (item as any).rombelRel).nama_kelas || 
                                                         `${((item as any).rombel_rel || (item as any).rombelRel).nama_kelas || ((item as any).rombel_rel || (item as any).rombelRel).tingkat + ' ' + (((item as any).rombel_rel || (item as any).rombelRel).jurusan?.kode || ((item as any).rombel_rel || (item as any).rombelRel).jurusan_rel?.kode || '')}`.trim()}
                                                    </span>
                                                ) : (
                                                    ((item as any).jurusan_rel || (item as any).jurusanRel) ? (
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pl-2">
                                                            { ((item as any).jurusan_rel || (item as any).jurusanRel).kode } (BELUM ADA KELAS)
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest pl-2">-</span>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-black text-gray-900">{formatRupiah(item.saldo)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-[0.2em] ${
                                                    item.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' :
                                                    'bg-rose-50 text-rose-700 border-rose-200/70'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center">
                                                    <Dropdown
                                                        trigger={
                                                            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                </svg>
                                                            </button>
                                                        }
                                                    >
                                                        <DropdownItem
                                                            href={`/${rolePrefix}/nasabah/${item.id}`}
                                                            className="text-gray-500 hover:text-blue-600"
                                                            icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest">Profil Akun</span>
                                                        </DropdownItem>
                                                        <DropdownItem
                                                            onClick={() => openEditModal(item)}
                                                            className="text-gray-500 hover:text-amber-600"
                                                            icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                                                        >
                                                            <span className="font-black text-[10px] uppercase tracking-widest">Edit Data</span>
                                                        </DropdownItem>

                                                        {item.status !== 'nonaktif' && (
                                                            <>
                                                                {item.user.user_type === 'siswa' && (
                                                                    <DropdownItem
                                                                        onClick={() => handlePromote(item.id, item.user.name)}
                                                                        className="border-t border-gray-50 text-gray-500 hover:text-indigo-600"
                                                                        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                                                    >
                                                                        <span className="font-black text-[10px] uppercase tracking-widest">Naik Kelas</span>
                                                                    </DropdownItem>
                                                                )}

                                                                <DropdownItem
                                                                    onClick={() => handleToggleStatus(item.id, item.user.name, item.status)}
                                                                    className={item.status === 'aktif' ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
                                                                    icon={item.status === 'aktif'
                                                                        ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                        : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                                >
                                                                    <span className="font-black text-[10px] uppercase tracking-widest">{item.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan Akun'}</span>
                                                                </DropdownItem>

                                                                <DropdownItem
                                                                    onClick={() => handleDeleteRekening(item.id, item.user.name, Number(item.saldo))}
                                                                    className="border-t border-gray-100 text-gray-900 hover:bg-gray-900 hover:text-white"
                                                                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                                                >
                                                                    <span className="font-black text-[10px] uppercase tracking-widest">Hapus Rekening</span>
                                                                </DropdownItem>
                                                            </>
                                                        )}
                                                    </Dropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={nasabah.current_page}
                        lastPage={nasabah.last_page}
                        total={nasabah.total}
                        url={`/${rolePrefix}/nasabah`}
                        filters={{
                            search,
                            status: statusFilter,
                            tingkat: tingkatFilter,
                            jurusan_id: jurusanFilter,
                            rombel_id: rombelFilter,
                            user_type: typeFilter,
                        }}
                        itemLabel="Nasabah"
                    />
                </div>
            </div>

            {/* Modal Tambah Nasabah */}
            <Modal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Registrasi Nasabah Baru"
                description="Lengkapi data untuk membuka rekening baru"
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.name && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.name}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} maxLength={255} placeholder="contoh@email.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm" required />
                            {errors.email && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe Nasabah</label>
                            <select value={data.user_type} onChange={e => {
                                const newType = e.target.value as NasabahUserType;
                                setData(d => ({
                                    ...d,
                                    user_type: newType,
                                    jurusan_id: '',
                                    rombel_id: '',
                                    nis: '',
                                    nip: ''
                                }));
                            }} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                <option value="siswa">Siswa</option>
                                <option value="kelas">Kelas</option>
                                <option value="organisasi">Organisasi</option>
                                <option value="guru">Guru</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</label>
                            <input type="text" value={data.nomor_rekening} onChange={e => setData('nomor_rekening', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} maxLength={50} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold" required />
                            {errors.nomor_rekening && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.nomor_rekening}</p>}
                        </div>
                        {data.user_type === 'siswa' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIS (Nomor Induk Siswa)</label>
                                <input type="text" value={data.nis} onChange={e => setData('nis', e.target.value.replace(/\D/g, ''))} maxLength={20} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold" required />
                                {errors.nis && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.nis}</p>}
                            </div>
                        )}
                        {data.user_type === 'guru' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIP (Nomor Induk Pegawai)</label>
                                <input type="text" value={data.nip} onChange={e => setData('nip', e.target.value.replace(/\D/g, ''))} maxLength={30} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold" required />
                                {errors.nip && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.nip}</p>}
                            </div>
                        )}
                        {(data.user_type === 'siswa' || data.user_type === 'kelas') && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jurusan</label>
                                    <select value={data.jurusan_id} onChange={e => setData(d => ({...d, jurusan_id: e.target.value, rombel_id: ''}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                        <option value="">Pilih Jurusan</option>
                                        {available_jurusan.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                    </select>
                                    {errors.jurusan_id && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.jurusan_id}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kelas</label>
                                    <select value={data.rombel_id} onChange={e => setData('rombel_id', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest">
                                        <option value="">Pilih Kelas</option>
                                        {available_rombels.filter(r => !data.jurusan_id || r.jurusan_id.toString() === data.jurusan_id).map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                    </select>
                                    {errors.rombel_id && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.rombel_id}</p>}
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value.replace(/\D/g, ''))}
                                maxLength={20}
                                placeholder="08xxxxxxxxxx"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                            />
                            {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.phone}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Awal</label>
                            <div className="relative">
                                <span className="absolute left-4 top-2.5 text-gray-400 font-black uppercase tracking-widest text-xs">Rp</span>
                                <input type="text" value={displaySaldoAwal} onChange={handleSaldoAwalChange} maxLength={100} className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-lg" placeholder="0" disabled={data.user_type === 'guru'} />
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={processing || !isFormValid.valid} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400">
                            {processing ? 'Proses...' : isFormValid.message}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={editOpen}
                onClose={closeEditModal}
                title="Edit Data Nasabah"
                description="Perbarui informasi profil dan status rekening"
                maxWidth="4xl"
            >
                <form onSubmit={handleEditSubmit} className="space-y-6">
                    {/* Error Alert */}
                    {Object.keys(editErrors).length > 0 && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                            <div className="flex gap-3">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Terjadi Kesalahan</h3>
                                    <ul className="mt-2 space-y-1">
                                        {Object.entries(editErrors).map(([field, message]) => (
                                            <li key={field} className="text-xs text-rose-700">• {message}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                            <input type="text" value={editData.name} onChange={e => setEditData('name', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm uppercase tracking-tight" />
                            {editErrors.name && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.name}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={editData.email} onChange={e => setEditData('email', e.target.value)} maxLength={255} placeholder="contoh@email.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm" />
                            {editErrors.email && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe Nasabah</label>
                            <select
                                value={editData.user_type}
                                onChange={e => {
                                    const newType = e.target.value as NasabahUserType;
                                    setEditData(form => ({
                                        ...form,
                                        user_type: newType,
                                        jurusan_id: '',
                                        nis: '',
                                        nip: '',
                                        rombel_id: '',
                                    }));
                                }}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                            >
                                <option value="siswa">Siswa</option>
                                <option value="kelas">Kelas</option>
                                <option value="organisasi">Organisasi</option>
                                <option value="guru">Guru</option>
                                <option value="pembayaran">Pembayaran</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Rekening</label>
                            <input type="text" value={editData.nomor_rekening} onChange={e => setEditData('nomor_rekening', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} maxLength={50} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" />
                            {editErrors.nomor_rekening && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.nomor_rekening}</p>}
                        </div>
                        {editData.user_type === 'siswa' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIS (Nomor Induk Siswa)</label>
                                <input type="text" value={editData.nis} onChange={e => setEditData('nis', e.target.value.replace(/\D/g, ''))} maxLength={20} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" />
                                {editErrors.nis && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.nis}</p>}
                            </div>
                        )}
                        {editData.user_type === 'guru' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIP (Nomor Induk Pegawai)</label>
                                <input type="text" value={editData.nip} onChange={e => setEditData('nip', e.target.value.replace(/\D/g, ''))} maxLength={30} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" />
                                {editErrors.nip && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.nip}</p>}
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</label>
                            <input type="text" value={editData.phone} onChange={e => setEditData('phone', e.target.value.replace(/\D/g, ''))} maxLength={20} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-sm" />
                        </div>
                        {(editData.user_type === 'siswa' || editData.user_type === 'kelas') && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jurusan</label>
                                    <select
                                        value={editData.jurusan_id}
                                        onChange={e => setEditData(d => ({...d, jurusan_id: e.target.value, rombel_id: ''}))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                                    >
                                        <option value="">Pilih Jurusan</option>
                                        {available_jurusan.map(j => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                    {editErrors.jurusan_id && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.jurusan_id}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kelas</label>
                                    <select
                                        value={editData.rombel_id}
                                        onChange={e => setEditData('rombel_id', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white"
                                    >
                                        <option value="">Pilih Kelas</option>
                                        {available_rombels.filter(r => !editData.jurusan_id || r.jurusan_id.toString() === editData.jurusan_id).map(r => (
                                            <option key={r.id} value={r.id}>{r.nama}</option>
                                        ))}
                                    </select>
                                    {editErrors.rombel_id && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.rombel_id}</p>}
                                </div>
                            </>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat Lengkap</label>
                            <textarea value={editData.alamat} onChange={e => setEditData('alamat', e.target.value)} maxLength={255} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase tracking-tight" rows={3}></textarea>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reset Password (Opsional)</label>
                            <input type="password" value={editData.password} onChange={e => setEditData('password', e.target.value)} maxLength={100} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" placeholder="Kosongkan jika tidak diubah" />
                            {editErrors.password && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Password Baru</label>
                            <input type="password" value={editData.password_confirmation} onChange={e => setEditData('password_confirmation', e.target.value)} maxLength={100} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-sm" />
                            {editErrors.password_confirmation && <p className="text-[10px] text-rose-500 mt-1 font-black uppercase">{editErrors.password_confirmation}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Rekening</label>
                            <select value={editData.status} onChange={e => setEditData('status', e.target.value as any)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-xs uppercase tracking-widest appearance-none bg-white">
                                <option value="aktif">AKUN AKTIF</option>
                                <option value="nonaktif">NONAKTIF (TIDAK BISA LOGIN)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={closeEditModal} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button type="submit" disabled={editProcessing || !isEditFormValid.valid} className="px-8 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-blue-400">
                            {editProcessing ? 'Menyimpan...' : isEditFormValid.message}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Naik Kelas Batch */}
            <Modal
                show={promoteBatchModalOpen}
                onClose={() => setPromoteBatchModalOpen(false)}
                title="Naik Kelas Batch"
                description="Proses kenaikan tingkat massal dengan fleksibilitas cakupan dan pengecualian"
                maxWidth="3xl"
            >
                <form onSubmit={handlePromoteBatchSubmit} className="space-y-6">
                    {/* Step 1: Pilihan Cakupan (Scope) */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            Pilih Cakupan Kenaikan Kelas <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setBatchData('scope', 'all');
                                    setBatchData('jurusan_id', '');
                                    setBatchData('rombel_id', '');
                                }}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    batchData.scope === 'all'
                                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${
                                    batchData.scope === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Semua Angkatan</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Seluruh jurusan & kelas di sekolah</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setBatchData('scope', 'jurusan');
                                    setBatchData('rombel_id', '');
                                }}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    batchData.scope === 'jurusan'
                                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${
                                    batchData.scope === 'jurusan' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Per Jurusan</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Hanya untuk 1 jurusan tertentu</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setBatchData('scope', 'rombel');
                                    setBatchData('jurusan_id', '');
                                }}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    batchData.scope === 'rombel'
                                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${
                                    batchData.scope === 'rombel' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Satu Kelas</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Hanya untuk 1 rombel spesifik</p>
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Target Selection Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {batchData.scope === 'jurusan' && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Pilih Jurusan <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={batchData.jurusan_id}
                                    onChange={e => setBatchData('jurusan_id', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                    required
                                >
                                    <option value="">-- Pilih Jurusan --</option>
                                    {available_jurusan.map(j => (
                                        <option key={j.id} value={j.id}>{j.kode} - {j.nama}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {batchData.scope === 'rombel' && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Pilih Kelas / Rombel Asal <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={batchData.rombel_id}
                                    onChange={e => setBatchData('rombel_id', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                    required
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {available_rombels.map(r => {
                                        const jur = available_jurusan.find(j => j.id === r.jurusan_id);
                                        return (
                                            <option key={r.id} value={r.id}>
                                                {r.nama} {jur ? `(${jur.kode})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {batchData.scope !== 'rombel' && (
                            <div className={batchData.scope === 'all' ? 'md:col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Tingkat / Kelas Asal
                                </label>
                                <select
                                    value={batchData.kelas_asal}
                                    onChange={e => setBatchData('kelas_asal', e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                >
                                    <option value="all">Semua Tingkat (10, 11, dan 12)</option>
                                    <option value="10">Hanya Tingkat 10 (Naik ke 11)</option>
                                    <option value="11">Hanya Tingkat 11 (Naik ke 12)</option>
                                    <option value="12">Hanya Tingkat 12 (Lulus / Alumni)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Pengecualian (Exclusions) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">!</span>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Pengecualian (Opsional)</p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Kecualikan siswa tinggal kelas / rombel tertentu
                            </span>
                        </div>

                        {/* Pengecualian Siswa */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                Siswa Terkecuali (Tinggal Kelas / Ditahan)
                            </label>
                            <div className="relative" ref={studentSearchRef}>
                                <input
                                    type="text"
                                    value={studentSearchQuery}
                                    onChange={e => setStudentSearchQuery(e.target.value)}
                                    placeholder="Cari nama atau NIS siswa yang tinggal kelas..."
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                />
                                {isSearchingStudent && (
                                    <div className="absolute right-3 top-2.5">
                                        <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Search Suggestions */}
                                {isStudentDropdownOpen && studentSearchResults.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {studentSearchResults.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleAddExcludedStudent(item)}
                                                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-900">{item.user?.name || item.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">
                                                        NIS: {item.user?.nis || '-'} • Rek: {item.nomor_rekening}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {item.rombel_rel?.nama || item.rombelRel?.nama || '-'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Excluded Students Pill List */}
                            {excludedStudents.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2.5">
                                    {excludedStudents.map(student => (
                                        <span
                                            key={student.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold"
                                        >
                                            <span>{student.name}</span>
                                            {student.rombel && <span className="text-[10px] opacity-75">({student.rombel})</span>}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExcludedStudent(student.id)}
                                                className="text-rose-500 hover:text-rose-700 font-black ml-0.5 text-sm"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pengecualian Kelas / Rombel (Tampil jika scope !== 'rombel') */}
                        {batchData.scope !== 'rombel' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    Kelas / Rombel Terkecuali ({batchData.exclude_rombel_ids.length} dipilih)
                                </label>
                                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 flex flex-wrap gap-1.5">
                                    {available_rombels
                                        .filter(r => batchData.scope === 'all' || r.jurusan_id.toString() === batchData.jurusan_id)
                                        .map(r => {
                                            const isExcluded = batchData.exclude_rombel_ids.includes(r.id);
                                            const jur = available_jurusan.find(j => j.id === r.jurusan_id);
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => handleToggleExcludeRombel(r.id)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                        isExcluded
                                                            ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'
                                                    }`}
                                                >
                                                    {isExcluded ? '✕ ' : '+ '}
                                                    {r.nama} {jur ? `(${jur.kode})` : ''}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Pengecualian Jurusan (Tampil jika scope === 'all') */}
                        {batchData.scope === 'all' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    Jurusan Terkecuali ({batchData.exclude_jurusan_ids.length} dipilih)
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {available_jurusan.map(j => {
                                        const isExcluded = batchData.exclude_jurusan_ids.includes(j.id);
                                        return (
                                            <button
                                                key={j.id}
                                                type="button"
                                                onClick={() => handleToggleExcludeJurusan(j.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    isExcluded
                                                        ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm'
                                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                {isExcluded ? '✕ ' : '+ '}
                                                {j.kode} - {j.nama}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 4: Info Peringatan */}
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 flex gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-200/60 text-amber-800 flex items-center justify-center shrink-0">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Catatan Penting</p>
                            <p className="mt-1 text-xs text-amber-800 font-semibold leading-relaxed">
                                Siswa tingkat 10 & 11 akan dipindahkan ke tingkat berikutnya pada jurusan yang sama. Siswa tingkat 12 otomatis lulus berstatus Alumni (akun rekening tetap aktif). Siswa/kelas/jurusan yang dikecualikan tidak akan mengalami perubahan tingkat.
                            </p>
                        </div>
                    </div>

                    {/* Modal Footer Buttons */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setPromoteBatchModalOpen(false)}
                            className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={batchProcessing || (batchData.scope === 'jurusan' && !batchData.jurusan_id) || (batchData.scope === 'rombel' && !batchData.rombel_id)}
                            className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400 flex items-center gap-2"
                        >
                            {batchProcessing && (
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {batchProcessing ? 'Memproses...' : 'Proses Kenaikan Kelas'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Import Excel */}
            <Modal
                show={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Nasabah via Excel"
                description="Tambah nasabah massal melalui berkas Excel"
                maxWidth="4xl"
            >
                <form onSubmit={handleImportSubmit} className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Template & Format</p>
                            <p className="text-sm font-semibold text-slate-900">Ikuti kolom Excel yang disediakan.</p>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={`/${rolePrefix}/nasabah/template`}
                                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Template Excel
                            </a>
                            <button
                                type="button"
                                onClick={() => setViewKelasModalOpen(true)}
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Lihat Daftar Kelas
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                            <input
                                type="file"
                                className="hidden"
                                accept=".xlsx,.xls"
                                multiple
                                ref={fileInputRef}
                                onChange={(e) => setImportData('files', e.target.files ? Array.from(e.target.files) : [])}
                            />
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm shadow-emerald-100">
                                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-widest">
                                    {importData.files.length > 0
                                        ? `${importData.files.length} berkas dipilih (${importData.files.map(f => f.name).join(', ')})`
                                        : 'Klik untuk pilih berkas Excel (.xlsx)'}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Dapat memilih lebih dari 1 file Excel (Maks 2MB per file)</p>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kolom Wajib</p>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-[9px] font-mono text-slate-600">
                                    name,nis_or_nip,norek,user_type,rombel_id,phone,alamat,saldo_awal
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contoh Baris</p>
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-[9px] font-mono text-slate-600">
                                    "Budi",12345,100012345,siswa,5,0812345,"Jl. Merdeka",50000
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Catatan</p>
                                <p className="mt-1 text-xs text-slate-600">
                                    Gunakan <strong>rombel_id</strong> yang sesuai dari daftar kelas. Data duplikat akan dilewati.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewKelasModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all whitespace-nowrap"
                            >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Lihat Daftar Kelas
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={() => setImportModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Batal</button>
                        <button
                            type="submit"
                            disabled={importProcessing || importData.files.length === 0}
                            className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-emerald-400"
                        >
                            {importProcessing ? 'Mengimport...' : 'Mulai Import'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal View Daftar Kelas */}
            <Modal
                show={viewKelasModalOpen}
                onClose={() => setViewKelasModalOpen(false)}
                title="Daftar Kelas (Rombel)"
                description="Referensi ID Kelas untuk Import Nasabah"
                maxWidth="4xl"
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Info</p>
                        <p className="text-xs text-slate-600">
                            Gunakan <strong>ID</strong> pada kolom pertama saat mengisi <strong>rombel_id</strong> di file Excel import nasabah.
                        </p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">ID</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Tingkat</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Jurusan</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Nama Kelas</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest">Tahun Ajaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {available_rombels.length > 0 ? (
                                    available_rombels.map((rombel) => {
                                        const jurusan = available_jurusan.find(j => j.id === rombel.jurusan_id);
                                        return (
                                            <tr key={rombel.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                        {rombel.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                                        rombel.tingkat === 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        rombel.tingkat === 11 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                        {rombel.tingkat}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {jurusan ? jurusan.kode : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-semibold text-slate-900">{rombel.nama}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-600 font-mono">{(rombel as any).tahun_ajaran || '-'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada data kelas</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="pt-2 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setViewKelasModalOpen(false)}
                            className="px-6 py-2.5 bg-slate-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Ubah Kelas Massal */}
            <Modal
                show={bulkKelasModalOpen}
                onClose={() => setBulkKelasModalOpen(false)}
                title="Ubah Kelas Massal"
                description={`Pindahkan kelas untuk ${selectedIds.length} nasabah terpilih`}
                maxWidth="lg"
            >
                <form onSubmit={handleBulkUpdateKelas} className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-black text-blue-900 uppercase tracking-tight">
                                    {selectedIds.length} Nasabah Terpilih
                                </p>
                                <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                                    Jurusan nasabah akan disesuaikan otomatis mengikuti jurusan kelas tujuan.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            Filter Jurusan (Opsional)
                        </label>
                        <select
                            value={targetJurusanFilter}
                            onChange={e => {
                                setTargetJurusanFilter(e.target.value);
                                setTargetRombelId('');
                            }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-800 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                        >
                            <option value="all">Semua Jurusan</option>
                            {available_jurusan.map(j => (
                                <option key={j.id} value={j.id}>
                                    {j.kode} - {j.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            Pilih Kelas / Rombel Tujuan <span className="text-rose-500">*</span>
                        </label>
                        <select
                            required
                            value={targetRombelId}
                            onChange={e => setTargetRombelId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                        >
                            <option value="">-- Pilih Kelas Tujuan --</option>
                            {available_rombels
                                .filter(r => targetJurusanFilter === 'all' || r.jurusan_id.toString() === targetJurusanFilter)
                                .map(r => {
                                    const jurusan = available_jurusan.find(j => j.id === r.jurusan_id);
                                    return (
                                        <option key={r.id} value={r.id}>
                                            {r.nama} {jurusan ? `(${jurusan.kode})` : ''}
                                        </option>
                                    );
                                })}
                        </select>
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setBulkKelasModalOpen(false)}
                            className="px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={!targetRombelId || isUpdatingKelas}
                            className="px-8 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-blue-300 disabled:shadow-none flex items-center gap-2"
                        >
                            {isUpdatingKelas && (
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {isUpdatingKelas ? 'Menyimpan...' : `Pindahkan (${selectedIds.length} Nasabah)`}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                show={confirmModal.show}
                onClose={() => setConfirmModal(prev => ({...prev, show: false}))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </DashboardLayout>
    );
}
