<?php

namespace App\Services;

use App\Models\AgentLog;
use App\Models\FunnelStage;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\Product;
use App\Models\Proposal;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use OpenAI\Laravel\Facades\OpenAI;
use Throwable;
use App\Services\AgentKbQueryService;

class AgentService
{
    public function __construct(
        private OpenClawGateway $openClaw,
        private AgentKbQueryService $kb,
    ) {}

    /**
     * @param  array<string, mixed>  $extraContext
     * @return array{ok: bool, response?: string, error?: string, tool_calls?: list<array<string, mixed>>}
     */
    public function runForLead(Lead $lead, array $extraContext = []): array
    {
        $apiKey = config('openai.api_key');
        if (! is_string($apiKey) || $apiKey === '') {
            return ['ok' => false, 'error' => 'OPENAI_API_KEY is not configured.'];
        }

        $model = env('OPENAI_MODEL', 'gpt-4o-mini');

        $messages = [
            ['role' => 'system', 'content' => $this->systemPrompt()],
            ['role' => 'user', 'content' => $this->buildUserPayload($lead, $extraContext)],
        ];

        $allToolCalls = [];
        $finalText = '';
        $usageTotal = null;

        try {
            for ($step = 0; $step < 10; $step++) {
                $response = OpenAI::chat()->create([
                    'model' => $model,
                    'messages' => $messages,
                    'tools' => $this->toolDefinitions(),
                ]);

                if ($response->usage !== null) {
                    $usageTotal = $response->usage->toArray();
                }

                $choice = $response->choices[0] ?? null;
                if ($choice === null) {
                    break;
                }

                $msg = $choice->message;

                if ($msg->toolCalls !== []) {
                    $messages[] = $msg->toArray();

                    foreach ($msg->toolCalls as $tc) {
                        $name = $tc->function->name;
                        $args = json_decode($tc->function->arguments, true);
                        if (! is_array($args)) {
                            $args = [];
                        }

                        $result = $this->executeTool($name, $args, $lead);
                        $payload = is_string($result) ? $result : json_encode($result);

                        $allToolCalls[] = [
                            'name' => $name,
                            'arguments' => $args,
                            'result' => $result,
                        ];

                        $messages[] = [
                            'role' => 'tool',
                            'tool_call_id' => $tc->id,
                            'content' => $payload,
                        ];
                    }

                    continue;
                }

                $finalText = (string) ($msg->content ?? '');
                break;
            }
        } catch (Throwable $e) {
            Log::error('AgentService OpenAI error', ['e' => $e->getMessage()]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }

        AgentLog::create([
            'lead_id' => $lead->id,
            'thread_id' => $lead->openai_thread_id,
            'tool_calls' => $allToolCalls,
            'response' => $finalText,
            'tokens_used' => is_array($usageTotal) ? ($usageTotal['total_tokens'] ?? null) : null,
            'metadata' => ['model' => $model],
        ]);

        return [
            'ok' => true,
            'response' => $finalText,
            'tool_calls' => $allToolCalls,
        ];
    }

    /**
     * Playground chat (user-scoped): uses KB (RAG) + products + leads tools.
     *
     * @return array{ok: bool, response?: string, error?: string, tool_calls?: list<array<string, mixed>>}
     */
    public function runForPlayground(int $userId, string $operatorMessage, ?Lead $lead = null): array
    {
        $apiKey = config('openai.api_key');
        if (! is_string($apiKey) || $apiKey === '') {
            return ['ok' => false, 'error' => 'OPENAI_API_KEY is not configured.'];
        }

        $model = env('OPENAI_MODEL', 'gpt-4o-mini');

        $kbHits = [];
        try {
            $kbHits = $this->kb->search($userId, $operatorMessage, 8);
        } catch (Throwable $e) {
            // Non-fatal: KB might be empty or pgvector not available.
            Log::warning('KB search failed', ['e' => $e->getMessage()]);
        }

        $kbText = '';
        if ($kbHits !== []) {
            $kbText = "KB context (top matches):\n";
            foreach ($kbHits as $idx => $hit) {
                $src = $hit['meta']['source'] ?? null;
                $kbText .= sprintf(
                    "[%d] score=%.3f source=%s\n%s\n\n",
                    $idx + 1,
                    (float) ($hit['score'] ?? 0),
                    $src ? (string) $src : '-',
                    mb_substr((string) ($hit['content'] ?? ''), 0, 1400)
                );
            }
        }

        $leadSummary = '';
        if ($lead !== null) {
            $leadSummary = sprintf(
                "Lead context:\n- id: %d\n- name: %s\n- email: %s\n- phone: %s\n- company: %s\n- score: %s\n\n",
                $lead->id,
                $lead->name,
                (string) ($lead->email ?? ''),
                (string) ($lead->phone ?? ''),
                (string) ($lead->company ?? ''),
                (string) ($lead->score ?? '')
            );
        }

        $messages = [
            ['role' => 'system', 'content' => $this->systemPromptPlayground()],
            [
                'role' => 'user',
                'content' => $leadSummary.$kbText."User message:\n".$operatorMessage,
            ],
        ];

        $allToolCalls = [];
        $finalText = '';

        try {
            for ($step = 0; $step < 8; $step++) {
                $response = OpenAI::chat()->create([
                    'model' => $model,
                    'messages' => $messages,
                    'tools' => $this->toolDefinitionsPlayground(),
                ]);

                $choice = $response->choices[0] ?? null;
                if ($choice === null) {
                    break;
                }

                $msg = $choice->message;

                if ($msg->toolCalls !== []) {
                    $messages[] = $msg->toArray();

                    foreach ($msg->toolCalls as $tc) {
                        $name = $tc->function->name;
                        $args = json_decode($tc->function->arguments, true);
                        if (! is_array($args)) {
                            $args = [];
                        }

                        $result = $this->executeToolPlayground($name, $args, $lead);
                        $payload = is_string($result) ? $result : json_encode($result);

                        $allToolCalls[] = [
                            'name' => $name,
                            'arguments' => $args,
                            'result' => $result,
                        ];

                        $messages[] = [
                            'role' => 'tool',
                            'tool_call_id' => $tc->id,
                            'content' => $payload,
                        ];
                    }

                    continue;
                }

                $finalText = (string) ($msg->content ?? '');
                break;
            }
        } catch (Throwable $e) {
            Log::error('Playground agent error', ['e' => $e->getMessage()]);
            return ['ok' => false, 'error' => $e->getMessage()];
        }

        return [
            'ok' => true,
            'response' => $finalText,
            'tool_calls' => $allToolCalls,
            'kb_hits' => $kbHits,
            'metadata' => [
                'model' => $model,
            ],
        ];
    }

    private function systemPromptPlayground(): string
    {
        $company = config('app.name', 'Our company');

        return <<<TXT
You are a premium AI assistant inside {$company}.
You answer using:
- The user's Knowledge Base context (KB context) when provided.
- CRM tools (products, leads) when needed.
Rules:
- Be concise and specific.
- If the user asks "what products are available" (or similar), call get_products with an empty query to list products.
- If KB context is empty, say so briefly and proceed with best-effort using CRM tools.
- Do not invent facts about the user; ask a follow-up question if missing.
TXT;
    }

    private function systemPrompt(): string
    {
        $company = config('app.name', 'Our company');

        return <<<TXT
You are an AI sales assistant for {$company}. You help move leads through the funnel using the provided tools.
Rules:
- Read lead context and history before acting.
- Prefer WhatsApp when phone exists, otherwise email when email exists.
- Do not repeat the exact same outbound message if it already appears in history.
- Use get_products when you need catalog details for proposals.
- When the lead is ready, create_proposal with product line items.
TXT;
    }

    /**
     * @param  array<string, mixed>  $extraContext
     */
    private function buildUserPayload(Lead $lead, array $extraContext): string
    {
        $lead->loadMissing('funnelStage', 'interactions');

        $history = $lead->interactions()
            ->latest()
            ->limit(15)
            ->get()
            ->map(fn (Interaction $i) => sprintf(
                '[%s %s] %s: %s',
                $i->created_at?->toIso8601String() ?? '',
                $i->type,
                $i->direction,
                mb_substr((string) $i->content, 0, 500)
            ))
            ->implode("\n");

        $extra = $extraContext === [] ? '' : json_encode($extraContext, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<TXT
Lead:
- id: {$lead->id}
- name: {$lead->name}
- email: {$lead->email}
- phone: {$lead->phone}
- company: {$lead->company}
- stage: {$lead->funnelStage?->name}
- score: {$lead->score}
- source: {$lead->source}

Recent interactions (newest last in list may vary):
{$history}

Extra context (JSON):
{$extra}

Decide the next best actions and use tools. If nothing is needed, reply with a short summary for the human operator.
TXT;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function toolDefinitionsPlayground(): array
    {
        $schemas = [
            'get_products' => [
                'type' => 'object',
                'properties' => [
                    'query' => [
                        'type' => 'string',
                        'description' => 'Optional search query. If empty, list available active products.',
                    ],
                    'max_results' => ['type' => 'integer'],
                ],
                'required' => [],
            ],
            'list_leads' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string'],
                    'limit' => ['type' => 'integer'],
                ],
                'required' => [],
            ],
            'get_lead_history' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'limit' => ['type' => 'integer'],
                ],
                'required' => ['lead_id'],
            ],
            'update_lead_stage' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'stage_name' => ['type' => 'string', 'description' => 'Exact or partial funnel stage name'],
                    'reason' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'stage_name'],
            ],
            'log_interaction' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'content' => ['type' => 'string'],
                    'type' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'content', 'type'],
            ],
        ];

        $tools = [];
        foreach ($schemas as $name => $parameters) {
            $tools[] = [
                'type' => 'function',
                'function' => [
                    'name' => $name,
                    'description' => 'CRM tool: '.$name,
                    'parameters' => $parameters,
                ],
            ];
        }

        return $tools;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function toolDefinitions(): array
    {
        $schemas = [
            'get_products' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string'],
                    'max_results' => ['type' => 'integer'],
                ],
                'required' => ['query'],
            ],
            'get_lead_history' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'limit' => ['type' => 'integer'],
                ],
                'required' => ['lead_id'],
            ],
            'update_lead_stage' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'stage_name' => ['type' => 'string', 'description' => 'Exact or partial funnel stage name'],
                    'reason' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'stage_name'],
            ],
            'send_whatsapp' => [
                'type' => 'object',
                'properties' => [
                    'phone' => ['type' => 'string'],
                    'message' => ['type' => 'string'],
                    'lead_id' => ['type' => 'integer'],
                ],
                'required' => ['phone', 'message', 'lead_id'],
            ],
            'send_email' => [
                'type' => 'object',
                'properties' => [
                    'to' => ['type' => 'string'],
                    'subject' => ['type' => 'string'],
                    'body' => ['type' => 'string'],
                    'lead_id' => ['type' => 'integer'],
                ],
                'required' => ['to', 'subject', 'body', 'lead_id'],
            ],
            'log_interaction' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'content' => ['type' => 'string'],
                    'type' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'content', 'type'],
            ],
            'qualify_lead' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'score' => ['type' => 'integer', 'description' => '0-100'],
                    'notes' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'score'],
            ],
            'create_proposal' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'integer'],
                    'items' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'product_id' => ['type' => 'integer'],
                                'quantity' => ['type' => 'integer'],
                            ],
                            'required' => ['product_id', 'quantity'],
                        ],
                    ],
                    'notes' => ['type' => 'string'],
                ],
                'required' => ['lead_id', 'items'],
            ],
            'scrape_leads' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string'],
                    'max_results' => ['type' => 'integer'],
                ],
                'required' => ['query'],
            ],
        ];

        $tools = [];
        foreach ($schemas as $name => $parameters) {
            $tools[] = [
                'type' => 'function',
                'function' => [
                    'name' => $name,
                    'description' => 'CRM tool: '.$name,
                    'parameters' => $parameters,
                ],
            ];
        }

        return $tools;
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function executeToolPlayground(string $name, array $args, ?Lead $lead): string
    {
        return match ($name) {
            'get_products' => $this->toolGetProducts($args),
            'list_leads' => $this->toolListLeads($args),
            'get_lead_history' => $this->toolGetLeadHistory($args),
            'update_lead_stage' => $this->toolUpdateLeadStage($args),
            'log_interaction' => $this->toolLogInteraction($args),
            default => json_encode(['error' => 'unknown_tool', 'name' => $name]),
        };
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function executeTool(string $name, array $args, Lead $lead): string
    {
        return match ($name) {
            'get_products' => $this->toolGetProducts($args),
            'get_lead_history' => $this->toolGetLeadHistory($args),
            'update_lead_stage' => $this->toolUpdateLeadStage($args),
            'send_whatsapp' => $this->toolSendWhatsapp($args),
            'send_email' => $this->toolSendEmail($args),
            'log_interaction' => $this->toolLogInteraction($args),
            'qualify_lead' => $this->toolQualifyLead($args),
            'create_proposal' => $this->toolCreateProposal($args),
            'scrape_leads' => $this->toolScrapeLeads($args),
            default => json_encode(['error' => 'unknown_tool', 'name' => $name]),
        };
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolListLeads(array $args): string
    {
        $q = (string) ($args['query'] ?? '');
        $limit = max(1, min(25, (int) ($args['limit'] ?? 12)));

        $rows = Lead::query()
            ->when($q !== '', function ($query) use ($q) {
                $query->where('name', 'like', '%'.$q.'%')
                    ->orWhere('company', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%')
                    ->orWhere('phone', 'like', '%'.$q.'%');
            })
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get(['id', 'name', 'company', 'email', 'phone', 'score', 'funnel_stage_id', 'updated_at']);

        return json_encode(['leads' => $rows]);
    }

    private function toolGetProducts(array $args): string
    {
        $q = (string) ($args['query'] ?? '');
        $max = (int) ($args['max_results'] ?? 8);
        $max = max(1, min(25, $max));

        $query = Product::query()->active();

        if ($q !== '') {
            $query->where(function ($query) use ($q) {
                $query->where('title', 'like', '%'.$q.'%')
                    ->orWhere('code', 'like', '%'.$q.'%')
                    ->orWhere('description', 'like', '%'.$q.'%');
            });
        }

        $products = $query
            ->orderByDesc('id')
            ->limit($max)
            ->get(['id', 'title', 'code', 'price', 'currency', 'active']);

        return json_encode(['products' => $products]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolGetLeadHistory(array $args): string
    {
        $leadId = (int) ($args['lead_id'] ?? 0);
        $limit = max(1, min(50, (int) ($args['limit'] ?? 20)));

        $items = Interaction::query()
            ->where('lead_id', $leadId)
            ->latest()
            ->limit($limit)
            ->get(['id', 'type', 'direction', 'content', 'sent_by', 'created_at']);

        return json_encode(['interactions' => $items]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolUpdateLeadStage(array $args): string
    {
        $leadId = (int) ($args['lead_id'] ?? 0);
        $name = (string) ($args['stage_name'] ?? '');
        $reason = (string) ($args['reason'] ?? '');

        $stage = FunnelStage::query()
            ->where('name', $name)
            ->orWhere('name', 'like', '%'.$name.'%')
            ->orderBy('sort_order')
            ->first();

        if ($stage === null) {
            return json_encode(['error' => 'stage_not_found', 'stage_name' => $name]);
        }

        $l = Lead::query()->find($leadId);
        if ($l === null) {
            return json_encode(['error' => 'lead_not_found']);
        }

        $l->funnel_stage_id = $stage->id;
        $l->save();

        Interaction::create([
            'lead_id' => $l->id,
            'type' => 'stage_change',
            'direction' => 'outbound',
            'content' => 'Moved to '.$stage->name.($reason !== '' ? ': '.$reason : ''),
            'sent_by' => 'agent',
            'status' => 'ok',
            'metadata' => ['stage_id' => $stage->id],
        ]);

        return json_encode(['ok' => true, 'stage' => $stage->name]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolSendWhatsapp(array $args): string
    {
        $phone = (string) ($args['phone'] ?? '');
        $message = (string) ($args['message'] ?? '');
        $leadId = (int) ($args['lead_id'] ?? 0);

        $result = $this->openClaw->callCommunicationAgent('whatsapp', $phone, $message, null, $leadId);

        $lead = Lead::query()->find($leadId);
        if ($lead !== null) {
            Interaction::create([
                'lead_id' => $lead->id,
                'type' => 'whatsapp',
                'direction' => 'outbound',
                'content' => $message,
                'sent_by' => 'agent',
                'status' => ($result['success'] ?? false) ? 'sent' : 'failed',
                'metadata' => $result,
            ]);
        }

        return json_encode($result);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolSendEmail(array $args): string
    {
        $to = (string) ($args['to'] ?? '');
        $subject = (string) ($args['subject'] ?? '');
        $body = (string) ($args['body'] ?? '');
        $leadId = (int) ($args['lead_id'] ?? 0);

        $result = $this->openClaw->callCommunicationAgent('email', $to, $body, $subject, $leadId);

        $lead = Lead::query()->find($leadId);
        if ($lead !== null) {
            Interaction::create([
                'lead_id' => $lead->id,
                'type' => 'email',
                'direction' => 'outbound',
                'content' => $subject."\n\n".$body,
                'sent_by' => 'agent',
                'status' => ($result['success'] ?? false) ? 'sent' : 'failed',
                'metadata' => $result,
            ]);
        }

        return json_encode($result);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolLogInteraction(array $args): string
    {
        $leadId = (int) ($args['lead_id'] ?? 0);
        $content = (string) ($args['content'] ?? '');
        $type = (string) ($args['type'] ?? 'note');

        Interaction::create([
            'lead_id' => $leadId,
            'type' => $type,
            'direction' => 'outbound',
            'content' => $content,
            'sent_by' => 'agent',
            'status' => 'logged',
        ]);

        return json_encode(['ok' => true]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolQualifyLead(array $args): string
    {
        $leadId = (int) ($args['lead_id'] ?? 0);
        $score = (int) ($args['score'] ?? 0);
        $notes = (string) ($args['notes'] ?? '');

        $score = max(0, min(100, $score));

        $l = Lead::query()->find($leadId);
        if ($l === null) {
            return json_encode(['error' => 'lead_not_found']);
        }

        $l->score = $score;
        if ($notes !== '') {
            $l->notes = trim((string) $l->notes."\n".$notes);
        }
        $l->save();

        return json_encode(['ok' => true, 'score' => $score]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolCreateProposal(array $args): string
    {
        $leadId = (int) ($args['lead_id'] ?? 0);
        $items = $args['items'] ?? [];
        if (! is_array($items)) {
            return json_encode(['error' => 'invalid_items']);
        }

        $lead = Lead::query()->find($leadId);
        if ($lead === null) {
            return json_encode(['error' => 'lead_not_found']);
        }

        $lines = [];
        $total = 0.0;

        foreach ($items as $row) {
            if (! is_array($row)) {
                continue;
            }
            $pid = (int) ($row['product_id'] ?? 0);
            $qty = max(1, (int) ($row['quantity'] ?? 1));
            $p = Product::query()->find($pid);
            if ($p === null) {
                continue;
            }
            $lineTotal = (float) $p->price * $qty;
            $total += $lineTotal;
            $lines[] = [
                'product_id' => $p->id,
                'title' => $p->title,
                'code' => $p->code,
                'quantity' => $qty,
                'unit_price' => (float) $p->price,
                'line_total' => $lineTotal,
            ];
        }

        if ($lines === []) {
            return json_encode(['error' => 'no_valid_lines']);
        }

        $proposal = Proposal::create([
            'lead_id' => $lead->id,
            'items' => $lines,
            'total' => $total,
            'status' => 'draft',
        ]);

        return json_encode(['ok' => true, 'proposal_id' => $proposal->id, 'total' => $total]);
    }

    /**
     * @param  array<string, mixed>  $args
     */
    private function toolScrapeLeads(array $args): string
    {
        $query = (string) ($args['query'] ?? '');
        $max = (int) ($args['max_results'] ?? 10);
        $max = max(1, min(10, $max));

        $result = $this->openClaw->callScrapingAgent($query, $max);

        if (! ($result['success'] ?? false)) {
            return json_encode($result);
        }

        $firstStage = FunnelStage::query()->orderBy('sort_order')->first();
        if ($firstStage === null) {
            return json_encode(['error' => 'no_funnel_stages']);
        }

        $created = [];
        foreach ($result['leads'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $email = isset($row["email"]) && is_string($row["email"]) && $row["email"] !== "" ? $row["email"] : ("imported+".Str::lower(Str::random(10))."@placeholder.local");
            $lead = Lead::query()->firstOrCreate(
                ["email" => $email],
                [
                    "funnel_stage_id" => $firstStage->id,
                    "name" => (string) ($row["name"] ?? "Unknown"),
                    "phone" => $row["phone"] ?? null,
                    "company" => $row["company"] ?? null,
                    "website" => $row["website"] ?? null,
                    "linkedin_url" => $row["linkedin_url"] ?? null,
                    "source" => "scraped",
                    "raw_data" => $row,
                ]
            );

            if ($lead->wasRecentlyCreated) {
                $created[] = $lead->id;
            }
        }

        return json_encode([
            'ok' => true,
            'created_lead_ids' => $created,
            'mock' => $result['mock'] ?? false,
        ]);
    }
}
