<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class SyncFernandoDocsCommand extends Command
{
    protected $signature = 'velora:sync-fernando-docs {--dest= : Destination docs directory}';

    protected $description = 'Sync Velora markdown into Fernando OpenClaw workspace docs';

    public function handle(): int
    {
        $script = base_path('docker/sync-fernando-docs.sh');
        if (! is_file($script)) {
            $this->error('Missing docker/sync-fernando-docs.sh');

            return self::FAILURE;
        }

        $dest = $this->option('dest')
            ?: base_path('openclaw/workspace-fernando/docs');

        $env = [
            'REPO_ROOT' => base_path(),
        ];

        $process = new Process(['sh', $script, $dest], base_path(), $env);
        $process->run();

        $this->line($process->getOutput());

        if (! $process->isSuccessful()) {
            $this->error($process->getErrorOutput());

            return self::FAILURE;
        }

        $this->info('Fernando docs synced.');

        return self::SUCCESS;
    }
}
