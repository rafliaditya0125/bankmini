<?php

namespace App\Console\Commands;

use App\Services\MonthlyFeeService;
use Illuminate\Console\Command;

class ProcessMonthlyFees extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:process-monthly-fees {--force : Force execution regardless of the configured day and time}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process monthly interest and administration fees for all active nasabah';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info("Memeriksa pemrosesan bunga & biaya bulanan...");

        $force = (bool) $this->option('force');
        $result = MonthlyFeeService::process($force);

        if ($result['status'] === 'skipped') {
            $this->warn($result['message']);
            return Command::SUCCESS;
        }

        $this->info($result['message']);
        return Command::SUCCESS;
    }
}
