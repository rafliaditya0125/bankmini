<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\NasabahLookupController;
use App\Http\Controllers\Api\NasabahPassbookController;
use App\Http\Controllers\Api\TransactionCodeController;

Route::middleware('api')->group(function () {
    Route::get('/nasabah/by-rekening/{rekening}', [NasabahLookupController::class, 'show']);
    Route::get('/nasabah/search', [NasabahLookupController::class, 'search']);
    Route::get('/nasabah/baris-buku', [NasabahPassbookController::class, 'getBarisBuku']);
    Route::post('/nasabah/baris-buku', [NasabahPassbookController::class, 'updateBarisBuku']);
    Route::get('/kode-transaksi/check', [TransactionCodeController::class, 'check']);
});
