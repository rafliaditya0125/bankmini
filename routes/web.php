<?php

use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Nasabah\DashboardController as NasabahDashboardController;
use App\Http\Controllers\Superadmin\DashboardController as SuperadminDashboardController;
use App\Http\Controllers\Superadmin\NasabahController as SuperadminNasabahController;
use App\Http\Controllers\Superadmin\PetugasController as SuperadminPetugasController;
use App\Http\Controllers\Superadmin\PengaturanController as SuperadminPengaturanController;
use App\Http\Controllers\Superadmin\BackupController as SuperadminBackupController;
use App\Http\Controllers\Superadmin\AuditTrailController as SuperadminAuditTrailController;
use App\Http\Controllers\Superadmin\JurusanController as SuperadminJurusanController;
use App\Http\Controllers\Shared\TransactionController as SharedTransactionController;
use App\Http\Controllers\Shared\ProfileController as SharedProfileController;
use App\Http\Controllers\Teller\DashboardController as TellerDashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

// Authentication Routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->middleware(['log']);

    // Forgot Password Routes
    Route::post('/forgot-password/otp', [\App\Http\Controllers\Auth\ForgotPasswordController::class, 'sendResetOtp'])->name('password.otp');
    Route::post('/reset-password', [\App\Http\Controllers\Auth\ForgotPasswordController::class, 'reset'])->name('password.update');
});

Route::post('/logout', [LoginController::class, 'destroy'])
    ->middleware('auth')
    ->middleware('log')
    ->name('logout');

// Dashboard redirect based on role
Route::get('/dashboard', function () {
    $user = auth()->user();

    if (!$user) {
        return redirect()->route('login');
    }

    return match ($user->role) {
        'superadmin' => redirect()->route('superadmin.dashboard'),
        'admin' => redirect()->route('admin.dashboard'),
        'teller' => redirect()->route('teller.dashboard'),
        'nasabah' => redirect()->route('nasabah.dashboard'),
        default => redirect()->route('login'),
    };
})->middleware('auth')->name('dashboard');

// Web Push Subscription Routes
Route::middleware('auth')->group(function () {
    Route::post('/push/subscribe', [PushSubscriptionController::class, 'store'])->name('push.subscribe');
    Route::delete('/push/unsubscribe', [PushSubscriptionController::class, 'destroy'])->name('push.unsubscribe');
    Route::get('/push/vapid-key', [PushSubscriptionController::class, 'vapidPublicKey'])->name('push.vapid-key');

    // Email Verification via OTP
    Route::get('/verify-email', [EmailVerificationController::class, 'show'])->name('verification.notice');
    Route::post('/verify-email/send', [EmailVerificationController::class, 'sendOtp'])->middleware('throttle:6,1')->name('verification.send');
    Route::post('/verify-email/verify', [EmailVerificationController::class, 'verify'])->middleware('throttle:6,1')->name('verification.verify');
});

// Nasabah Routes
Route::middleware(['auth', 'role:nasabah', 'verified', 'force_password_change'])->prefix('nasabah')->name('nasabah.')->group(function () {
    Route::get('/dashboard', [NasabahDashboardController::class, 'index'])->name('dashboard');
    Route::get('/transaksi', [\App\Http\Controllers\Nasabah\TransaksiController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('transaksi.index');

    // Notification Routes
    Route::get('/notifications', [\App\Http\Controllers\Nasabah\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Nasabah\NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [\App\Http\Controllers\Nasabah\NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Profile Routes
    Route::get('/profil', [SharedProfileController::class, 'index'])->name('profil.index');
    Route::put('/profil', [SharedProfileController::class, 'update'])->name('profil.update');
    Route::post('/profil/phone-otp', [SharedProfileController::class, 'requestPhoneOtp'])->name('profil.phone-otp');
    Route::put('/profil/password', [SharedProfileController::class, 'updatePassword'])->name('profil.password');
    Route::post('/profil/password-otp', [SharedProfileController::class, 'requestPasswordOtp'])->name('profil.password-otp');
    Route::post('/profil/reset-password', [SharedProfileController::class, 'resetPasswordViaOtp'])->name('profil.reset-password');
    Route::post('/profil/photo', [SharedProfileController::class, 'updatePhoto'])->name('profil.photo.update');
    Route::delete('/profil/photo', [SharedProfileController::class, 'removePhoto'])->name('profil.photo.remove');
    Route::post('/profil/email-otp', [SharedProfileController::class, 'requestEmailChangeOtp'])->name('profil.email-otp');
    Route::post('/profil/email-verify-old', [SharedProfileController::class, 'verifyOldEmailOtp'])->name('profil.email-verify-old');
    Route::put('/profil/email', [SharedProfileController::class, 'updateEmail'])->name('profil.email');
});

// Teller Routes
Route::middleware(['auth', 'role:teller', 'verified'])->prefix('teller')->name('teller.')->group(function () {
    Route::get('/dashboard', [TellerDashboardController::class, 'index'])->name('dashboard');

    // Setoran Routes
    Route::get('/setor', [SharedTransactionController::class, 'setorIndex'])->name('setor.index');
    Route::post('/setor', [SharedTransactionController::class, 'setorStore'])->name('setor.store')->middleware('log');

    // Tarik Tunai Routes
    Route::get('/tarik', [SharedTransactionController::class, 'tarikIndex'])->name('tarik.index');
    Route::post('/tarik', [SharedTransactionController::class, 'tarikStore'])->name('tarik.store')->middleware('log');

    // Transfer Routes
    Route::get('/transfer', [SharedTransactionController::class, 'transferIndex'])->name('transfer.index');
    Route::post('/transfer', [SharedTransactionController::class, 'transferStore'])->name('transfer.store')->middleware('log');

    // Bayar Routes
    Route::get('/bayar', [SharedTransactionController::class, 'bayarIndex'])->name('bayar.index');
    Route::post('/bayar', [SharedTransactionController::class, 'bayarStore'])->name('bayar.store')->middleware('log');

    // Transaksi History Routes
    Route::get('/transaksi', [\App\Http\Controllers\Teller\TransaksiController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('transaksi.index');
    Route::post('/transaksi/{id}/cancel', [SharedTransactionController::class, 'cancel'])->name('transaksi.cancel');

    // Profile Routes
    Route::get('/profil', [SharedProfileController::class, 'index'])->name('profil.index');
    Route::put('/profil', [SharedProfileController::class, 'update'])->name('profil.update');
    Route::post('/profil/phone-otp', [SharedProfileController::class, 'requestPhoneOtp'])->name('profil.phone-otp');
    Route::put('/profil/password', [SharedProfileController::class, 'updatePassword'])->name('profil.password');
    Route::post('/profil/password-otp', [SharedProfileController::class, 'requestPasswordOtp'])->name('profil.password-otp');
    Route::post('/profil/reset-password', [SharedProfileController::class, 'resetPasswordViaOtp'])->name('profil.reset-password');
    Route::post('/profil/photo', [SharedProfileController::class, 'updatePhoto'])->name('profil.photo.update');
    Route::delete('/profil/photo', [SharedProfileController::class, 'removePhoto'])->name('profil.photo.remove');
    Route::post('/profil/email-otp', [SharedProfileController::class, 'requestEmailChangeOtp'])->name('profil.email-otp');
    Route::post('/profil/email-verify-old', [SharedProfileController::class, 'verifyOldEmailOtp'])->name('profil.email-verify-old');
    Route::put('/profil/email', [SharedProfileController::class, 'updateEmail'])->name('profil.email');
});

// Admin Routes (Sub-Admin)
Route::middleware(['auth', 'role:admin', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [SuperadminDashboardController::class, 'index'])->name('dashboard');
    Route::post('/nasabah/promote-batch', [SuperadminNasabahController::class, 'promoteBatch'])->name('nasabah.promote-batch');
    Route::post('/nasabah/import', [SuperadminNasabahController::class, 'import'])->name('nasabah.import');
    Route::get('/nasabah/template', [SuperadminNasabahController::class, 'downloadTemplate'])->name('nasabah.template');
    Route::get('/nasabah/rombel-list', [SuperadminNasabahController::class, 'downloadRombelList'])->name('nasabah.rombel-list');
    Route::resource('nasabah', SuperadminNasabahController::class)->except(['edit']);
    Route::post('/nasabah/{nasabah}/promote', [SuperadminNasabahController::class, 'promote'])->name('nasabah.promote');
    Route::delete('/nasabah/{nasabah}/delete-rekening', [SuperadminNasabahController::class, 'deleteRekening'])->name('nasabah.delete-rekening');

    Route::post('/petugas/import', [SuperadminPetugasController::class, 'import'])->name('petugas.import');
    Route::get('/petugas/template', [SuperadminPetugasController::class, 'downloadTemplate'])->name('petugas.template');
    Route::resource('petugas', SuperadminPetugasController::class)->except(['edit']);

    Route::post('/jurusan/import', [SuperadminJurusanController::class, 'import'])->name('jurusan.import');
    Route::get('/jurusan/template', [SuperadminJurusanController::class, 'downloadTemplate'])->name('jurusan.template');
    Route::resource('jurusan', SuperadminJurusanController::class);
    
    // Rombel management per jurusan
    // Rombel import for all jurusan (with jurusan_id)
    Route::post('/jurusan/rombel/import-all', [SuperadminJurusanController::class, 'importRombelAll'])->name('jurusan.rombel.import-all');
    Route::get('/jurusan/rombel/template-all', [SuperadminJurusanController::class, 'downloadRombelTemplateAll'])->name('jurusan.rombel.template-all');

    Route::post('/jurusan/{jurusan}/rombel/import', [SuperadminJurusanController::class, 'importRombel'])->name('jurusan.rombel.import');
    Route::get('/jurusan/{jurusan}/rombel/template', [SuperadminJurusanController::class, 'downloadRombelTemplate'])->name('jurusan.rombel.template');
    Route::get('/jurusan/{jurusan}/rombel', [SuperadminJurusanController::class, 'showRombel'])->name('jurusan.rombel.show');
    Route::post('/jurusan/{jurusan}/rombel', [SuperadminJurusanController::class, 'storeRombel'])->name('jurusan.rombel.store');
    Route::put('/jurusan/{jurusan}/rombel/{rombel}', [SuperadminJurusanController::class, 'updateRombel'])->name('jurusan.rombel.update');
    Route::delete('/jurusan/{jurusan}/rombel/{rombel}', [SuperadminJurusanController::class, 'destroyRombel'])->name('jurusan.rombel.destroy');

    Route::resource('kelas', \App\Http\Controllers\Superadmin\RombelController::class);
    Route::get('/setor', [SharedTransactionController::class, 'setorIndex'])->name('setor.index');
    Route::post('/setor', [SharedTransactionController::class, 'setorStore'])->name('setor.store')->middleware('log');

    // Tarik Tunai Routes
    Route::get('/tarik', [SharedTransactionController::class, 'tarikIndex'])->name('tarik.index');
    Route::post('/tarik', [SharedTransactionController::class, 'tarikStore'])->name('tarik.store')->middleware('log');

    // Transfer Routes
    Route::get('/transfer', [SharedTransactionController::class, 'transferIndex'])->name('transfer.index');
    Route::post('/transfer', [SharedTransactionController::class, 'transferStore'])->name('transfer.store')->middleware('log');

    // Bayar Routes
    Route::get('/bayar', [SharedTransactionController::class, 'bayarIndex'])->name('bayar.index');
    Route::post('/bayar', [SharedTransactionController::class, 'bayarStore'])->name('bayar.store')->middleware('log');

    Route::get('/audit-trail', [SuperadminAuditTrailController::class, 'index'])->name('audit-trail.index');
    Route::get('/laporan', [\App\Http\Controllers\Superadmin\LaporanController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('laporan.index');
    Route::get('/transaksi', [\App\Http\Controllers\Superadmin\LaporanController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('transaksi.index');
    Route::post('/transaksi/{id}/cancel', [SharedTransactionController::class, 'cancel'])->name('transaksi.cancel');
    Route::get('/pembukuan', [\App\Http\Controllers\Shared\PembukuanController::class, 'index'])->name('pembukuan.index');
    Route::post('/pembukuan/post', [\App\Http\Controllers\Shared\PembukuanController::class, 'postToLedger'])->name('pembukuan.post');

    // Settings Routes for Admin
    Route::get('/pengaturan', [SuperadminPengaturanController::class, 'index'])->name('pengaturan.index');
    Route::post('/pengaturan', [SuperadminPengaturanController::class, 'store'])->name('pengaturan.store');

    // Profile Routes
    Route::get('/profil', [SharedProfileController::class, 'index'])->name('profil.index');
    Route::put('/profil', [SharedProfileController::class, 'update'])->name('profil.update');
    Route::post('/profil/phone-otp', [SharedProfileController::class, 'requestPhoneOtp'])->name('profil.phone-otp');
    Route::put('/profil/password', [SharedProfileController::class, 'updatePassword'])->name('profil.password');
    Route::post('/profil/password-otp', [SharedProfileController::class, 'requestPasswordOtp'])->name('profil.password-otp');
    Route::post('/profil/reset-password', [SharedProfileController::class, 'resetPasswordViaOtp'])->name('profil.reset-password');
    Route::post('/profil/photo', [SharedProfileController::class, 'updatePhoto'])->name('profil.photo.update');
    Route::delete('/profil/photo', [SharedProfileController::class, 'removePhoto'])->name('profil.photo.remove');
    Route::post('/profil/email-otp', [SharedProfileController::class, 'requestEmailChangeOtp'])->name('profil.email-otp');
    Route::post('/profil/email-verify-old', [SharedProfileController::class, 'verifyOldEmailOtp'])->name('profil.email-verify-old');
    Route::put('/profil/email', [SharedProfileController::class, 'updateEmail'])->name('profil.email');
});

// Superadmin Exclusive Routes
Route::middleware(['auth', 'role:superadmin', 'verified'])->prefix('superadmin')->name('superadmin.')->group(function () {
    Route::get('/dashboard', [SuperadminDashboardController::class, 'index'])->name('dashboard');
    Route::post('/nasabah/promote-batch', [SuperadminNasabahController::class, 'promoteBatch'])->name('nasabah.promote-batch');
    Route::post('/nasabah/import', [SuperadminNasabahController::class, 'import'])->name('nasabah.import');
    Route::get('/nasabah/template', [SuperadminNasabahController::class, 'downloadTemplate'])->name('nasabah.template');
    Route::get('/nasabah/rombel-list', [SuperadminNasabahController::class, 'downloadRombelList'])->name('nasabah.rombel-list');
    Route::resource('nasabah', SuperadminNasabahController::class)->except(['edit']);
    Route::post('/nasabah/{nasabah}/promote', [SuperadminNasabahController::class, 'promote'])->name('nasabah.promote');
    Route::delete('/nasabah/{nasabah}/delete-rekening', [SuperadminNasabahController::class, 'deleteRekening'])->name('nasabah.delete-rekening');

    Route::post('/petugas/import', [SuperadminPetugasController::class, 'import'])->name('petugas.import');
    Route::get('/petugas/template', [SuperadminPetugasController::class, 'downloadTemplate'])->name('petugas.template');
    Route::resource('petugas', SuperadminPetugasController::class)->except(['edit']);

    Route::post('/jurusan/import', [SuperadminJurusanController::class, 'import'])->name('jurusan.import');
    Route::get('/jurusan/template', [SuperadminJurusanController::class, 'downloadTemplate'])->name('jurusan.template');
    Route::resource('jurusan', SuperadminJurusanController::class);
    
    // Rombel management per jurusan
    // Rombel import for all jurusan (with jurusan_id)
    Route::post('/jurusan/rombel/import-all', [SuperadminJurusanController::class, 'importRombelAll'])->name('jurusan.rombel.import-all');
    Route::get('/jurusan/rombel/template-all', [SuperadminJurusanController::class, 'downloadRombelTemplateAll'])->name('jurusan.rombel.template-all');

    Route::post('/jurusan/{jurusan}/rombel/import', [SuperadminJurusanController::class, 'importRombel'])->name('jurusan.rombel.import');
    Route::get('/jurusan/{jurusan}/rombel/template', [SuperadminJurusanController::class, 'downloadRombelTemplate'])->name('jurusan.rombel.template');
    Route::get('/jurusan/{jurusan}/rombel', [SuperadminJurusanController::class, 'showRombel'])->name('jurusan.rombel.show');
    Route::post('/jurusan/{jurusan}/rombel', [SuperadminJurusanController::class, 'storeRombel'])->name('jurusan.rombel.store');
    Route::put('/jurusan/{jurusan}/rombel/{rombel}', [SuperadminJurusanController::class, 'updateRombel'])->name('jurusan.rombel.update');
    Route::delete('/jurusan/{jurusan}/rombel/{rombel}', [SuperadminJurusanController::class, 'destroyRombel'])->name('jurusan.rombel.destroy');

    Route::resource('kelas', \App\Http\Controllers\Superadmin\RombelController::class);
    Route::get('/setor', [SharedTransactionController::class, 'setorIndex'])->name('setor.index');
    Route::post('/setor', [SharedTransactionController::class, 'setorStore'])->name('setor.store')->middleware('log');

    // Tarik Tunai Routes
    Route::get('/tarik', [SharedTransactionController::class, 'tarikIndex'])->name('tarik.index');
    Route::post('/tarik', [SharedTransactionController::class, 'tarikStore'])->name('tarik.store')->middleware('log');

    // Transfer Routes
    Route::get('/transfer', [SharedTransactionController::class, 'transferIndex'])->name('transfer.index');
    Route::post('/transfer', [SharedTransactionController::class, 'transferStore'])->name('transfer.store')->middleware('log');

    // Bayar Routes
    Route::get('/bayar', [SharedTransactionController::class, 'bayarIndex'])->name('bayar.index');
    Route::post('/bayar', [SharedTransactionController::class, 'bayarStore'])->name('bayar.store')->middleware('log');

    // Audit Trail Routes
    Route::get('/audit-trail', [SuperadminAuditTrailController::class, 'index'])->name('audit-trail.index');

    // Laporan Routes
    Route::get('/laporan', [\App\Http\Controllers\Superadmin\LaporanController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('laporan.index');
    Route::get('/transaksi', [\App\Http\Controllers\Superadmin\LaporanController::class, 'index'])->middleware('throttle:dynamic_transaction')->name('transaksi.index');
    Route::post('/transaksi/{id}/cancel', [SharedTransactionController::class, 'cancel'])->name('transaksi.cancel');
    Route::get('/pembukuan', [\App\Http\Controllers\Shared\PembukuanController::class, 'index'])->name('pembukuan.index');
    Route::post('/pembukuan/post', [\App\Http\Controllers\Shared\PembukuanController::class, 'postToLedger'])->name('pembukuan.post');

    // Settings Routes
    Route::get('/pengaturan', [SuperadminPengaturanController::class, 'index'])->name('pengaturan.index');
    Route::post('/pengaturan', [SuperadminPengaturanController::class, 'store'])->name('pengaturan.store');
    Route::post('/pengaturan/generate-report', [SuperadminPengaturanController::class, 'generateReport'])->name('pengaturan.generate-report');
    Route::get('/pengaturan/download-report/{filename}', [SuperadminPengaturanController::class, 'downloadReport'])->name('pengaturan.download-report');

    // Backup Routes
    Route::get('/backup', [SuperadminBackupController::class, 'index'])->name('backup.index');
    Route::post('/backup/create', [SuperadminBackupController::class, 'create'])->name('backup.create');
    Route::post('/backup/restore', [SuperadminBackupController::class, 'restore'])->name('backup.restore');
    Route::get('/backup/download/{filename}', [SuperadminBackupController::class, 'download'])->name('backup.download');
    Route::delete('/backup/{filename}', [SuperadminBackupController::class, 'destroy'])->name('backup.destroy');

    // Profile Routes
    Route::get('/profil', [SharedProfileController::class, 'index'])->name('profil.index');
    Route::put('/profil', [SharedProfileController::class, 'update'])->name('profil.update');
    Route::post('/profil/phone-otp', [SharedProfileController::class, 'requestPhoneOtp'])->name('profil.phone-otp');
    Route::put('/profil/password', [SharedProfileController::class, 'updatePassword'])->name('profil.password');
    Route::post('/profil/password-otp', [SharedProfileController::class, 'requestPasswordOtp'])->name('profil.password-otp');
    Route::post('/profil/reset-password', [SharedProfileController::class, 'resetPasswordViaOtp'])->name('profil.reset-password');
    Route::post('/profil/photo', [SharedProfileController::class, 'updatePhoto'])->name('profil.photo.update');
    Route::delete('/profil/photo', [SharedProfileController::class, 'removePhoto'])->name('profil.photo.remove');
    Route::post('/profil/email-otp', [SharedProfileController::class, 'requestEmailChangeOtp'])->name('profil.email-otp');
    Route::post('/profil/email-verify-old', [SharedProfileController::class, 'verifyOldEmailOtp'])->name('profil.email-verify-old');
    Route::put('/profil/email', [SharedProfileController::class, 'updateEmail'])->name('profil.email');
});
