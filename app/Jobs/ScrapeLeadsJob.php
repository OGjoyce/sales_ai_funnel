<?php

namespace App\Jobs;

use App\Models\FunnelStage;
use App\Models\Lead;
use App\Services\OpenClawGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class ScrapeLeadsJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $query,
        public int $maxLeads = 10,
    ) {}

    public function handle(OpenClawGateway $gateway): void
    {
        $result = $gateway->callScrapingAgent($this->query, $this->maxLeads);
        if (! ($result['success'] ?? false)) {
            return;
        }

        $firstStage = FunnelStage::query()->orderBy('sort_order')->first();
        if ($firstStage === null) {
            return;
        }

        foreach ($result['leads'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $email = isset($row['email']) && is_string($row['email']) && $row['email'] !== ''
                ? $row['email']
                : ('imported+'.Str::lower(Str::random(10)).'@placeholder.local');

            Lead::query()->firstOrCreate(
                ['email' => $email],
                [
                    'funnel_stage_id' => $firstStage->id,
                    'name' => (string) ($row['name'] ?? 'Unknown'),
                    'phone' => $row['phone'] ?? null,
                    'company' => $row['company'] ?? null,
                    'website' => $row['website'] ?? null,
                    'linkedin_url' => $row['linkedin_url'] ?? null,
                    'source' => 'scraped',
                    'raw_data' => $row,
                ]
            );
        }
    }
}
