<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\AgentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessLeadWithAgent implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public int $leadId,
        public array $context = [],
    ) {
        $this->onQueue('agent');
    }

    public function handle(AgentService $agent): void
    {
        $lead = Lead::query()->find($this->leadId);
        if ($lead === null) {
            return;
        }

        $agent->runForLead($lead, $this->context);
    }
}
