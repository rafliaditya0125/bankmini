<?php

namespace App\Console\Commands;

use App\Models\TrustedDevice;
use Illuminate\Console\Command;

class PruneExpiredTrustedDevices extends Command
{
    protected $signature   = 'trusted-devices:prune';
    protected $description = 'Hapus semua record trusted_devices yang sudah expired dari database';

    public function handle(): int
    {
        $deleted = TrustedDevice::where('expires_at', '<', now())->delete();

        $this->info("✓ {$deleted} perangkat expired berhasil dihapus.");

        return self::SUCCESS;
    }
}
