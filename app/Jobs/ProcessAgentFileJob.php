<?php

namespace App\Jobs;

use App\Models\AgentFile;
use App\Services\AgentKbIngestService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessAgentFileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $agentFileId)
    {
    }

    public function handle(AgentKbIngestService $ingest): void
    {
        $file = AgentFile::find($this->agentFileId);
        if (!$file) {
            return;
        }

        $ingest->ingest($file);
    }
}
