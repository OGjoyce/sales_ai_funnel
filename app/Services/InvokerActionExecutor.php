<?php

namespace App\Services;

use App\Models\AgentLog;
use App\Models\FunnelStage;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\LinaGenerationRun;
use App\Models\Product;
use App\Models\Scopes\BelongsToAuthenticatedUser;
use App\Models\User;
use Illuminate\Support\Str;

class InvokerActionExecutor
{
    /**
     * @return list<string>
     */
    public static function allowedTools(): array
    {
        return [
            'list_leads',
            'list_funnel_stages',
            'update_lead_stage',
            'update_lead',
            'list_products',
            'grant_user_trial',
            'set_user_subscription',
            'log_interaction',
            'get_agent_logs',
            'get_lina_runs',
        ];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed, error?: string}
     */
    public function execute(string $name, array $arguments, User $admin): array
    {
        if (! in_array($name, self::allowedTools(), true)) {
            return ['ok' => false, 'error' => "Tool no permitida: {$name}"];
        }

        try {
            return match ($name) {
                'list_leads' => $this->listLeads($arguments),
                'list_funnel_stages' => $this->listFunnelStages(),
                'update_lead_stage' => $this->updateLeadStage($arguments, $admin),
                'update_lead' => $this->updateLead($arguments, $admin),
                'list_products' => $this->listProducts($arguments),
                'grant_user_trial' => $this->grantUserTrial($arguments),
                'set_user_subscription' => $this->setUserSubscription($arguments),
                'log_interaction' => $this->logInteraction($arguments, $admin),
                'get_agent_logs' => $this->getAgentLogs($arguments),
                'get_lina_runs' => $this->getLinaRuns($arguments),
                default => ['ok' => false, 'error' => 'Tool desconocida'],
            };
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function listLeads(array $arguments): array
    {
        $query = Lead::query()
            ->withoutGlobalScope(BelongsToAuthenticatedUser::class)
            ->with('funnelStage')
            ->orderByDesc('updated_at');
        $q = isset($arguments['query']) ? trim((string) $arguments['query']) : '';
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'ilike', "%{$q}%")
                    ->orWhere('email', 'ilike', "%{$q}%")
                    ->orWhere('company', 'ilike', "%{$q}%");
            });
        }
        $limit = min(50, max(1, (int) ($arguments['limit'] ?? 20)));

        return [
            'ok' => true,
            'result' => $query->limit($limit)->get()->map(fn (Lead $l) => [
                'id' => $l->id,
                'name' => $l->name,
                'email' => $l->email,
                'stage' => $l->funnelStage?->name,
                'score' => $l->score,
            ]),
        ];
    }

    /**
     * @return array{ok: bool, result?: mixed}
     */
    private function listFunnelStages(): array
    {
        return [
            'ok' => true,
            'result' => FunnelStage::query()->orderBy('sort_order')->get(['id', 'name', 'sort_order']),
        ];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function updateLeadStage(array $arguments, User $admin): array
    {
        $leadId = (int) ($arguments['lead_id'] ?? 0);
        $lead = Lead::query()
            ->withoutGlobalScope(BelongsToAuthenticatedUser::class)
            ->findOrFail($leadId);

        $stageName = (string) ($arguments['stage_name'] ?? '');
        $stage = FunnelStage::query()
            ->where('name', 'ilike', $stageName)
            ->orWhere('name', 'ilike', '%'.$stageName.'%')
            ->first();

        if ($stage === null) {
            return ['ok' => false, 'error' => "Etapa no encontrada: {$stageName}"];
        }

        $prev = $lead->funnel_stage_id;
        $lead->funnel_stage_id = $stage->id;
        $lead->save();

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'stage_change',
            'direction' => 'outbound',
            'content' => 'Invoker: '.($arguments['reason'] ?? 'stage update'),
            'sent_by' => 'invoker',
            'status' => 'ok',
            'metadata' => [
                'admin_id' => $admin->id,
                'from_stage_id' => $prev,
                'to_stage_id' => $stage->id,
            ],
        ]);

        return ['ok' => true, 'result' => ['lead_id' => $lead->id, 'stage' => $stage->name]];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function updateLead(array $arguments, User $admin): array
    {
        $lead = Lead::query()
            ->withoutGlobalScope(BelongsToAuthenticatedUser::class)
            ->findOrFail((int) $arguments['lead_id']);
        $patch = [];
        foreach (['name', 'email', 'phone', 'company', 'notes'] as $field) {
            if (array_key_exists($field, $arguments)) {
                $patch[$field] = $arguments[$field];
            }
        }
        if (isset($arguments['score'])) {
            $patch['score'] = (int) $arguments['score'];
        }
        $lead->update($patch);

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'note',
            'direction' => 'outbound',
            'content' => 'Invoker actualizó campos del lead',
            'sent_by' => 'invoker',
            'status' => 'ok',
            'metadata' => ['admin_id' => $admin->id, 'fields' => array_keys($patch)],
        ]);

        return ['ok' => true, 'result' => $lead->fresh()->load('funnelStage')];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function listProducts(array $arguments): array
    {
        $query = Product::query()
            ->withoutGlobalScope(BelongsToAuthenticatedUser::class)
            ->orderBy('title');
        $q = isset($arguments['query']) ? trim((string) $arguments['query']) : '';
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('title', 'ilike', "%{$q}%")
                    ->orWhere('code', 'ilike', "%{$q}%");
            });
        }
        $limit = min(30, max(1, (int) ($arguments['limit'] ?? 15)));

        return ['ok' => true, 'result' => $query->limit($limit)->get(['id', 'title', 'code', 'price'])];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function grantUserTrial(array $arguments): array
    {
        $user = User::query()->where('email', $arguments['email'] ?? '')->firstOrFail();
        $days = max(1, (int) ($arguments['days'] ?? 7));
        $user->forceFill([
            'subscription_status' => 'trial',
            'trial_ends_at' => now()->addDays($days),
        ])->save();

        return ['ok' => true, 'result' => ['email' => $user->email, 'trial_ends_at' => $user->trial_ends_at]];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function setUserSubscription(array $arguments): array
    {
        $status = (string) ($arguments['status'] ?? '');
        if (! in_array($status, ['trial', 'active', 'comped', 'expired'], true)) {
            return ['ok' => false, 'error' => 'status inválido'];
        }

        $user = User::query()->where('email', $arguments['email'] ?? '')->firstOrFail();
        $user->forceFill(['subscription_status' => $status]);
        if ($status === 'comped' || $status === 'active') {
            $user->trial_ends_at = null;
        }
        $user->save();

        return ['ok' => true, 'result' => ['email' => $user->email, 'subscription_status' => $status]];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function logInteraction(array $arguments, User $admin): array
    {
        $interaction = Interaction::create([
            'lead_id' => (int) $arguments['lead_id'],
            'type' => (string) ($arguments['type'] ?? 'note'),
            'direction' => 'outbound',
            'content' => (string) ($arguments['content'] ?? ''),
            'sent_by' => 'invoker',
            'status' => 'ok',
            'metadata' => ['admin_id' => $admin->id],
        ]);

        return ['ok' => true, 'result' => ['interaction_id' => $interaction->id]];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function getAgentLogs(array $arguments): array
    {
        $query = AgentLog::query()->orderByDesc('id');
        if (! empty($arguments['lead_id'])) {
            $query->where('lead_id', (int) $arguments['lead_id']);
        }
        $limit = min(50, max(1, (int) ($arguments['limit'] ?? 20)));

        return ['ok' => true, 'result' => $query->limit($limit)->get()];
    }

    /**
     * @param  array<string, mixed>  $arguments
     * @return array{ok: bool, result?: mixed}
     */
    private function getLinaRuns(array $arguments): array
    {
        $limit = min(30, max(1, (int) ($arguments['limit'] ?? 10)));

        return [
            'ok' => true,
            'result' => LinaGenerationRun::query()->orderByDesc('created_at')->limit($limit)->get([
                'id', 'status', 'leads_created', 'error', 'created_at',
            ]),
        ];
    }

    /**
     * @return list<array{name: string, arguments: array<string, mixed>}>
     */
    public function parseToolCallsFromContent(string $content): array
    {
        $content = trim($content);
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/m', $content, $m)) {
            $content = trim($m[1]);
        }

        $decoded = json_decode($content, true);
        if (! is_array($decoded)) {
            if (preg_match('/\{[\s\S]*"tool_calls"[\s\S]*\}/', $content, $m)) {
                $decoded = json_decode($m[0], true);
            }
        }

        if (! is_array($decoded) || ! isset($decoded['tool_calls']) || ! is_array($decoded['tool_calls'])) {
            return [];
        }

        $out = [];
        foreach ($decoded['tool_calls'] as $tc) {
            if (! is_array($tc) || empty($tc['name'])) {
                continue;
            }
            $args = $tc['arguments'] ?? [];
            if (! is_array($args)) {
                $args = [];
            }
            $out[] = ['name' => (string) $tc['name'], 'arguments' => $args];
        }

        return $out;
    }
}
