<?php

namespace App\Jobs;

use App\Models\LinaGenerationRun;
use App\Services\LinaLeadGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class RunLinaLeadGenerationJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;

    public int $tries = 1;

    public function __construct(
        public string $linaGenerationRunId,
    ) {}

    public function handle(LinaLeadGenerationService $lina): void
    {
        $run = LinaGenerationRun::query()->find($this->linaGenerationRunId);
        if ($run === null) {
            return;
        }

        if ($run->status !== 'pending') {
            return;
        }

        $run->forceFill(['status' => 'processing', 'error' => null])->save();

        try {
            /** @var array{sector: string, product_ids?: list<int>, product_notes?: string|null, channels: array{whatsapp: bool, email: bool, website: bool, gmail: bool}} $payload */
            $payload = $run->payload;
            $result = $lina->run($payload);

            if (! ($result['success'] ?? false)) {
                $run->forceFill([
                    'status' => 'failed',
                    'error' => $result['error'] ?? 'Error desconocido',
                    'instruction_sent_to_lina' => $result['instruction_sent_to_lina'] ?? null,
                ])->save();

                return;
            }

            $run->forceFill([
                'status' => 'completed',
                'instruction_sent_to_lina' => $result['instruction_sent_to_lina'] ?? null,
                'leads_created' => $result['leads_created'] ?? [],
                'mock' => $result['mock'] ?? null,
                'error' => null,
            ])->save();
        } catch (Throwable $e) {
            Log::error('RunLinaLeadGenerationJob failed', [
                'run_id' => $this->linaGenerationRunId,
                'e' => $e->getMessage(),
            ]);

            $run->forceFill([
                'status' => 'failed',
                'error' => $e->getMessage(),
            ])->save();
        }
    }
}
