<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\NasabahLookupController;
use App\Http\Controllers\Api\TransactionCodeController;

Route::middleware('api')->group(function () {
    Route::get('/nasabah/by-rekening/{rekening}', [NasabahLookupController::class, 'show']);
    Route::get('/kode-transaksi/check', [TransactionCodeController::class, 'check']);
});
