<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Nasabah;
use App\Models\Transaksi;
use App\Services\TransactionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TransactionController extends Controller
{
    protected $transactionService;

    public function __construct(TransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
    }

    private function getRole()
    {
        $user = Auth::user();
        return $user->role === 'superadmin' || $user->role === 'admin' ? $user->role : 'teller';
    }

    private function getRolePrefix()
    {
        $user = Auth::user();
        return $user->role === 'superadmin' || $user->role === 'admin' ? $user->role : 'teller';
    }

    /**
     * Setoran Index
     */
    public function setorIndex(Request $request)
    {
        $nasabah = null;
        if ($request->has('nomor_rekening') && $request->nomor_rekening) {
            $nasabah = Nasabah::with(['user', 'rombelRel'])
                ->where('nomor_rekening', $request->nomor_rekening)
                ->first();

            if (!$nasabah) return back()->with('error', 'Nasabah tidak ditemukan');
            if ($nasabah->status !== 'aktif') return back()->with('error', 'Rekening tidak aktif');
        }

        return Inertia::render('shared/Transaction/Setor', [
            'nasabah' => $nasabah,
            'transactionTypes' => array_map('trim', explode(',', \App\Models\Setting::get('transaction_types', 'Tunai, Transfer, Kliring, Cek / BG'))),
            'bkkBkmMode' => \App\Models\Setting::get('bkk_bkm_mode', 'manual'),
        ]);
    }

    /**
     * Setoran Store
     */
    public function setorStore(Request $request)
    {
        $bkkBkmMode = \App\Models\Setting::get('bkk_bkm_mode', 'manual');
        $minDenomination = (int) \App\Models\Setting::get('min_cash_denomination', 100);

        $rules = [
            'nomor_rekening' => 'required|exists:nasabah,nomor_rekening',
            'jumlah' => [
                'required',
                'numeric',
                'min:' . max(1000, $minDenomination),
                function ($attribute, $value, $fail) use ($minDenomination) {
                    if ($value % $minDenomination !== 0) {
                        $fail('Jumlah harus merupakan kelipatan dari Rp ' . number_format($minDenomination, 0, ',', '.'));
                    }
                }
            ],
            'tanggal_transaksi' => 'required|date',
            'jenis_transaksi' => 'required',
            'keterangan' => 'nullable|string|max:255',
            'nama_petugas' => 'required|string|max:255',
        ];

        $messages = [];
        if ($bkkBkmMode === 'manual') {
            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            $date = $request->filled('tanggal_transaksi')
                ? \Carbon\Carbon::parse($request->tanggal_transaksi, $timezone)
                : now($timezone);
            $paddedNo = str_pad($request->no_bkm, 3, '0', STR_PAD_LEFT);
            $kodeFormatted = 'BKM' . $paddedNo . '/' . $date->format('m') . '/' . $date->format('y');

            $request->merge([
                'no_bkm_formatted' => $kodeFormatted,
            ]);
            $rules['no_bkm'] = 'required|numeric|digits_between:1,50';
            $rules['no_bkm_formatted'] = 'required|unique:transaksi,kode_transaksi';
            $messages['no_bkm_formatted.unique'] = 'Nomor BKM ini (' . $kodeFormatted . ') sudah digunakan.';
        }

        $validated = $request->validate($rules, $messages);
        if ($bkkBkmMode === 'manual') {
            $validated['kode_transaksi'] = $request->no_bkm_formatted;
        }

        try {
            $result = $this->transactionService->setor($validated, $this->getRole());
            return redirect()->route($this->getRolePrefix() . '.setor.index')
                ->with('success', 'Setoran sebesar Rp ' . number_format($validated['jumlah'], 0, ',', '.') . ' ke rekening ' . $validated['nomor_rekening'] . ' berhasil diproses')
                ->with('transaction', $result);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }

    /**
     * Tarik Index
     */
    public function tarikIndex(Request $request)
    {
        $nasabah = null;
        if ($request->has('nomor_rekening') && $request->nomor_rekening) {
            $nasabah = Nasabah::with(['user', 'rombelRel'])
                ->where('nomor_rekening', $request->nomor_rekening)
                ->first();

            if (!$nasabah) return back()->with('error', 'Nasabah tidak ditemukan');
            if ($nasabah->status !== 'aktif') return back()->with('error', 'Rekening tidak aktif');
        }

        return Inertia::render('shared/Transaction/Tarik', [
            'nasabah' => $nasabah,
            'transactionTypes' => array_map('trim', explode(',', \App\Models\Setting::get('transaction_types', 'Tunai, Transfer, Kliring, Cek / BG'))),
            'bkkBkmMode' => \App\Models\Setting::get('bkk_bkm_mode', 'manual'),
            'minWithdraw' => (int) \App\Models\Setting::get('min_withdraw', 1000),
        ]);
    }

    /**
     * Tarik Store
     */
    public function tarikStore(Request $request)
    {
        $bkkBkmMode = \App\Models\Setting::get('bkk_bkm_mode', 'manual');
        $minDenomination = (int) \App\Models\Setting::get('min_cash_denomination', 100);
        $minWithdraw = (int) \App\Models\Setting::get('min_withdraw', 1000);

        $rules = [
            'nomor_rekening' => 'required|exists:nasabah,nomor_rekening',
            'jumlah' => [
                'required',
                'numeric',
                'min:' . max($minWithdraw, $minDenomination),
                function ($attribute, $value, $fail) use ($minDenomination) {
                    if ($value % $minDenomination !== 0) {
                        $fail('Jumlah harus merupakan kelipatan dari Rp ' . number_format($minDenomination, 0, ',', '.'));
                    }
                }
            ],
            'tanggal_transaksi' => 'required|date',
            'jenis_transaksi' => 'required',
            'keterangan' => 'nullable|string|max:255',
            'nama_petugas' => 'required|string|max:255',
        ];

        $messages = [];
        if ($bkkBkmMode === 'manual') {
            $timezone = \App\Models\Setting::get('timezone', 'Asia/Jakarta');
            $date = $request->filled('tanggal_transaksi')
                ? \Carbon\Carbon::parse($request->tanggal_transaksi, $timezone)
                : now($timezone);
            $paddedNo = str_pad($request->no_bkk, 3, '0', STR_PAD_LEFT);
            $kodeFormatted = 'BKK' . $paddedNo . '/' . $date->format('m') . '/' . $date->format('y');

            $request->merge([
                'no_bkk_formatted' => $kodeFormatted,
            ]);
            $rules['no_bkk'] = 'required|numeric|digits_between:1,50';
            $rules['no_bkk_formatted'] = 'required|unique:transaksi,kode_transaksi';
            $messages['no_bkk_formatted.unique'] = 'Nomor BKK ini (' . $kodeFormatted . ') sudah digunakan.';
        }

        $validated = $request->validate($rules, $messages);
        if ($bkkBkmMode === 'manual') {
            $validated['kode_transaksi'] = $request->no_bkk_formatted;
        }

        try {
            $result = $this->transactionService->tarik($validated, $this->getRole());
            return redirect()->route($this->getRolePrefix() . '.tarik.index')
                ->with('success', 'Penarikan sebesar Rp ' . number_format($validated['jumlah'], 0, ',', '.') . ' dari rekening ' . $validated['nomor_rekening'] . ' berhasil diproses')
                ->with('transaction', $result);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }

    /**
     * Transfer Index
     */
    public function transferIndex(Request $request)
    {
        $pengirim = null;
        if ($request->has('pengirim_rekening') && $request->pengirim_rekening) {
            $pengirim = Nasabah::with(['user', 'rombelRel'])->where('nomor_rekening', $request->pengirim_rekening)->first();
        }

        return Inertia::render('shared/Transaction/Transfer', [
            'pengirim' => $pengirim,
            'minWithdraw' => (int) \App\Models\Setting::get('min_deposit', 1000),
        ]);
    }

    /**
     * Transfer Store
     */
    public function transferStore(Request $request)
    {
        $minTransfer = (int) \App\Models\Setting::get('min_deposit', 1000);

        $rules = [
            'pengirim_rekening' => 'required|exists:nasabah,nomor_rekening',
            'penerima_rekening' => 'required|exists:nasabah,nomor_rekening|different:pengirim_rekening',
            'jumlah' => 'required|numeric|min:' . $minTransfer,
            'tanggal_transaksi' => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'nama_petugas' => 'required|string|max:255',
        ];

        $messages = [
            'penerima_rekening.different' => 'Rekening tujuan tidak boleh sama dengan rekening pengirim.',
        ];

        $validated = $request->validate($rules, $messages);

        $validated['kode_transaksi'] = $this->generateKodeTransaksi('TRF');

        try {
            $result = $this->transactionService->transfer($validated, $this->getRole());
            return redirect()->route($this->getRolePrefix() . '.transfer.index')
                ->with('success', 'Transfer sebesar Rp ' . number_format($validated['jumlah'], 0, ',', '.') . ' ke rekening ' . $validated['penerima_rekening'] . ' berhasil diproses')
                ->with('transaction', $result);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }
    /**
     * Bayar Index
     */
    public function bayarIndex(Request $request)
    {
        $pengirim = null;
        if ($request->has('pengirim_rekening') && $request->pengirim_rekening) {
            $pengirim = Nasabah::with(['user', 'rombelRel'])->where('nomor_rekening', $request->pengirim_rekening)->first();
        }

        $pembayaranAccounts = Nasabah::with('user')
            ->whereHas('user', function ($q) {
                $q->where('user_type', 'pembayaran');
            })
            ->where('status', 'aktif')
            ->get();

        return Inertia::render('shared/Transaction/Bayar', [
            'pengirim' => $pengirim,
            'pembayaranAccounts' => $pembayaranAccounts,
            'minBayar' => 1000,
        ]);
    }

    /**
     * Bayar Store
     */
    public function bayarStore(Request $request)
    {
        $minBayar = 1000;

        $rules = [
            'pengirim_rekening' => 'required|exists:nasabah,nomor_rekening',
            'penerima_rekening' => 'required|exists:nasabah,nomor_rekening|different:pengirim_rekening',
            'jumlah' => 'required|numeric|min:' . $minBayar,
            'tanggal_transaksi' => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'nama_petugas' => 'required|string|max:255',
        ];

        $messages = [
            'penerima_rekening.different' => 'Rekening tujuan tidak boleh sama dengan rekening pengirim.',
        ];

        $validated = $request->validate($rules, $messages);

        $validated['kode_transaksi'] = $this->generateKodeTransaksi('BYR');

        try {
            $result = $this->transactionService->bayar($validated, $this->getRole());
            $penerima = Nasabah::where('nomor_rekening', $validated['penerima_rekening'])->first();
            return redirect()->route($this->getRolePrefix() . '.bayar.index')
                ->with('success', 'Pembayaran sebesar Rp ' . number_format($validated['jumlah'], 0, ',', '.') . ' untuk ' . $penerima->user->name . ' berhasil diproses')
                ->with('transaction', $result);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }
    /**
     * Cancel Transaction
     */
    public function cancel(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:255|min:5',
        ], [
            'reason.required' => 'Alasan pembatalan harus diisi.',
            'reason.min' => 'Alasan pembatalan minimal 5 karakter.',
        ]);

        try {
            $this->transactionService->cancel($id, $request->reason, $this->getRole());
            return back()->with('success', 'Transaksi berhasil dibatalkan');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }

    private function generateKodeTransaksi(string $prefix): string
    {
        do {
            $kode = $prefix . now()->format('YmdHis') . str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);
        } while (Transaksi::where('kode_transaksi', $kode)->exists());

        return $kode;
    }
}
