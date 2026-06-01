<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenClawGateway
{
    private function httpTimeoutSeconds(): int
    {
        $s = (int) config('services.openclaw.http_timeout_seconds', 120);

        return max(1, $s);
    }

    /**
     * @return array{success: bool, leads?: list<array<string, mixed>>, error?: string, mock?: bool}
     */
    public function callScrapingAgent(string $query, int $maxLeads = 10): array
    {
        $base = config('services.openclaw.gateway_url');
        if (! is_string($base) || $base === '') {
            return $this->mockScrapeResult($query, $maxLeads);
        }

        // Placeholder: adapt to your OpenClaw transport (SSE/WebSocket). REST shown as example only.
        try {
            $response = Http::timeout($this->httpTimeoutSeconds())
                ->withToken((string) config('services.openclaw.api_key'))
                ->acceptJson()
                ->post(rtrim($base, '/').'/agents/run', [
                    'agent_id' => config('services.openclaw.scraping_agent_id'),
                    'query' => $query,
                    'max_leads' => $maxLeads,
                ]);

            if (! $response->successful()) {
                return ['success' => false, 'error' => $response->body()];
            }

            $data = $response->json();
            if (! is_array($data)) {
                return ['success' => false, 'error' => 'Invalid JSON from OpenClaw'];
            }

            return $data + ['success' => true];
        } catch (\Throwable $e) {
            Log::error('OpenClaw scraping failed', ['e' => $e->getMessage()]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Agente "Lina" (prospección guiada).
     * OpenClaw real: POST /v1/chat/completions con model openclaw/&lt;slug&gt; (Bearer = gateway token).
     * Compatibilidad: si falla, intenta POST /agents/run (gateways custom).
     *
     * @return array{success: bool, leads?: list<array<string, mixed>>, error?: string, mock?: bool, raw?: mixed}
     */
    public function callLinaAgent(string $instruction, int $maxLeads = 3): array
    {
        $base = config('services.openclaw.gateway_url');
        $agentId = $this->resolveLinaAgentSlug();

        if (! is_string($base) || $base === '') {
            return $this->mockScrapeResult($instruction, $maxLeads);
        }

        $token = (string) config('services.openclaw.api_key');
        if ($token === '') {
            return [
                'success' => false,
                'error' => 'Configura OPENCLAW_API_KEY o OPENCLAW_GATEWAY_TOKEN en .env',
            ];
        }

        $system = <<<TXT
Eres Lina, agente de prospección B2B en OpenClaw con acceso a herramientas (browser, búsqueda web, etc.).

Flujo obligatorio:
1) Usa herramientas del gateway para buscar empresas y contactos REALES y verificables según la instrucción.
2) No inventes datos ni uses placeholders.
3) Cuando termines la investigación, responde ÚNICAMENTE con JSON válido (sin markdown ni texto extra).

Formato exacto: {"leads":[{"name":"string","email":"string|null","phone":"string|null","company":"string|null","website":"string|null","linkedin_url":"string|null"}]}
Máximo {$maxLeads} elementos en "leads". Solo usa "leads":[] si tras buscar no hay candidatos verificables.
TXT;

        try {
            $chatUrl = rtrim($base, '/').'/v1/chat/completions';
            $chatPayload = [
                'model' => $this->openClawModelId($agentId),
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $instruction],
                ],
                'temperature' => 0.35,
                'max_completion_tokens' => 8192,
            ];

            $response = Http::timeout($this->httpTimeoutSeconds())
                ->withToken($token)
                ->acceptJson()
                ->post($chatUrl, $chatPayload);

            $data = $response->json();
            $isJson = is_array($data);

            if ($response->successful() && $isJson && $this->responseLooksLikeOpenAiChat($data)) {
                $leads = $this->leadsFromChatCompletionBody($data);

                return [
                    'success' => true,
                    'leads' => $leads,
                    'raw' => $data,
                ];
            }

            if ($response->successful() && ! $isJson) {
                Log::warning('OpenClaw Lina: /v1/chat/completions no devolvió JSON (¿endpoint desactivado en el gateway?)');
            }

            if (! $response->successful()) {
                Log::warning('OpenClaw Lina: chatCompletions failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500),
                ]);
            }

            $chatError = $this->formatLinaChatFailure($response, $isJson ? $data : null);
            if ($chatError !== null) {
                return ['success' => false, 'error' => $chatError];
            }

            // Fallback solo si chatCompletions no existe (404)
            if ($response->status() !== 404) {
                return [
                    'success' => false,
                    'error' => 'OpenClaw /v1/chat/completions no devolvió leads válidos. Revisa logs del gateway (openclaw) y OPENAI_API_KEY en .env.',
                ];
            }

            // Fallback: gateways que expongan /agents/run
            $legacyPayload = [
                'agent_id' => $agentId,
                'query' => $instruction,
                'instruction' => $instruction,
                'message' => $instruction,
                'max_leads' => $maxLeads,
                'context' => ['agent' => 'Lina'],
            ];

            $legacy = Http::timeout($this->httpTimeoutSeconds())
                ->withToken($token)
                ->acceptJson()
                ->post(rtrim($base, '/').'/agents/run', $legacyPayload);

            if (! $legacy->successful()) {
                $hint = ' Activa gateway.http.endpoints.chatCompletions en OpenClaw o revisa el slug del agente (OPENCLAW_LINA_AGENT_ID).';
                $body = $legacy->body();
                $snippet = strlen($body) > 400 ? substr($body, 0, 400).'…' : $body;

                return [
                    'success' => false,
                    'error' => 'OpenClaw no respondió en /v1/chat/completions ni en /agents/run. '.$hint.' Respuesta: '.$snippet,
                ];
            }

            $legacyData = $legacy->json();
            if (! is_array($legacyData)) {
                return ['success' => false, 'error' => 'Invalid JSON from OpenClaw (/agents/run)'];
            }

            $normalized = $this->normalizeLeadsPayload($legacyData);

            return [
                'success' => true,
                'leads' => $normalized,
                'raw' => $legacyData,
            ];
        } catch (\Throwable $e) {
            Log::error('OpenClaw Lina failed', ['e' => $e->getMessage()]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fernando — ayuda Velora (comportamiento en OpenClaw workspace, sin system prompt largo en PHP).
     *
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $context
     * @return array{success: bool, reply?: string, error?: string, mock?: bool, raw?: mixed}
     */
    public function callFernandoAgent(array $messages, array $context = []): array
    {
        $base = config('services.openclaw.gateway_url');
        $agentId = $this->resolveFernandoAgentSlug();

        if (! is_string($base) || $base === '') {
            return [
                'success' => true,
                'mock' => true,
                'reply' => 'Fernando no está conectado al gateway OpenClaw en este entorno. Revisa OPENCLAW_GATEWAY_URL o abre la landing con ?chat=fernando.',
            ];
        }

        $token = (string) config('services.openclaw.api_key');
        if ($token === '') {
            return [
                'success' => false,
                'error' => 'Configura OPENCLAW_API_KEY o OPENCLAW_GATEWAY_TOKEN en .env',
            ];
        }

        $messages = $this->prependFernandoContext($messages, $context);

        $result = $this->postChatCompletion($agentId, $messages, [
            'temperature' => 0.4,
            'max_completion_tokens' => 4096,
        ]);

        if (! ($result['success'] ?? false)) {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'OpenClaw no respondió.',
            ];
        }

        return [
            'success' => true,
            'reply' => $result['reply'] ?? '',
            'raw' => $result['raw'] ?? null,
        ];
    }

    public function resolveFernandoAgentSlug(): string
    {
        $id = config('services.openclaw.fernando_agent_id');

        return is_string($id) && trim($id) !== '' ? trim($id) : 'fernando';
    }

    /**
     * Invoker — admin Velora operator (OpenClaw agent + Laravel tool execution).
     *
     * @param  list<array{role: string, content: string}>  $messages
     * @return array{success: bool, reply?: string, error?: string, mock?: bool, raw?: mixed}
     */
    public function callInvokerAgent(array $messages): array
    {
        $base = config('services.openclaw.gateway_url');
        $agentId = $this->resolveInvokerAgentSlug();

        if (! is_string($base) || $base === '') {
            return [
                'success' => true,
                'mock' => true,
                'reply' => '{"tool_calls":[]}',
            ];
        }

        $token = (string) config('services.openclaw.api_key');
        if ($token === '') {
            return ['success' => false, 'error' => 'OPENCLAW_GATEWAY_TOKEN no configurado'];
        }

        $result = $this->postChatCompletion($agentId, $messages, [
            'temperature' => 0.25,
            'max_completion_tokens' => 8192,
        ]);

        if (! ($result['success'] ?? false)) {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'OpenClaw Invoker no respondió.',
            ];
        }

        return [
            'success' => true,
            'reply' => $result['reply'] ?? '',
            'raw' => $result['raw'] ?? null,
        ];
    }

    public function resolveInvokerAgentSlug(): string
    {
        $id = config('services.openclaw.invoker_agent_id');

        return is_string($id) && trim($id) !== '' ? trim($id) : 'invoker';
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options
     * @return array{success: bool, reply?: string, raw?: mixed, error?: string}
     */
    private function postChatCompletion(string $agentSlug, array $messages, array $options = []): array
    {
        $base = config('services.openclaw.gateway_url');
        if (! is_string($base) || $base === '') {
            return ['success' => false, 'error' => 'OPENCLAW_GATEWAY_URL no configurado'];
        }

        $token = (string) config('services.openclaw.api_key');
        if ($token === '') {
            return ['success' => false, 'error' => 'OPENCLAW_GATEWAY_TOKEN no configurado'];
        }

        $payload = [
            'model' => $this->openClawModelId($agentSlug),
            'messages' => $messages,
            'temperature' => (float) ($options['temperature'] ?? 0.35),
        ];
        if (isset($options['max_completion_tokens'])) {
            $payload['max_completion_tokens'] = (int) $options['max_completion_tokens'];
        }

        try {
            $response = Http::timeout($this->httpTimeoutSeconds())
                ->withToken($token)
                ->acceptJson()
                ->post(rtrim($base, '/').'/v1/chat/completions', $payload);

            $data = $response->json();
            $isJson = is_array($data);

            if ($response->successful() && $isJson && $this->responseLooksLikeOpenAiChat($data)) {
                return [
                    'success' => true,
                    'reply' => $this->assistantReplyText($data),
                    'raw' => $data,
                ];
            }

            $chatError = $this->formatLinaChatFailure($response, $isJson ? $data : null);

            return [
                'success' => false,
                'error' => $chatError ?? 'OpenClaw /v1/chat/completions falló.',
            ];
        } catch (\Throwable $e) {
            Log::error('OpenClaw chat completion failed', ['agent' => $agentSlug, 'e' => $e->getMessage()]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $context
     * @return list<array{role: string, content: string}>
     */
    private function prependFernandoContext(array $messages, array $context): array
    {
        if ($context === []) {
            return $messages;
        }

        $parts = [];
        if (! empty($context['name'])) {
            $parts[] = 'Usuario: '.$context['name'];
        }
        $parts[] = 'Objetivo comercial: cerrar plan pagado Velora (Pro/Ops); no promover trial gratis';

        if (! empty($context['subscription_status'])) {
            $status = (string) $context['subscription_status'];
            $parts[] = 'Estado cuenta: '.$status;
            if ($status === 'trial') {
                $parts[] = 'Cliente en evaluación — empujar upgrade a Pro, no extender prueba';
            }
        }

        if ($parts === []) {
            return $messages;
        }

        $prefix = '['.implode(' | ', $parts).']';

        $last = count($messages) - 1;
        if ($last >= 0 && ($messages[$last]['role'] ?? '') === 'user') {
            $messages[$last]['content'] = $prefix."\n\n".($messages[$last]['content'] ?? '');

            return $messages;
        }

        $messages[] = ['role' => 'user', 'content' => $prefix];

        return $messages;
    }

    private function resolveLinaAgentSlug(): string
    {
        foreach (
            [
                config('services.openclaw.lina_agent_id'),
                config('services.openclaw.scraping_agent_id'),
                config('services.openclaw.default_agent_id'),
            ] as $candidate
        ) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return 'default';
    }

    /**
     * Modelo agent-first de OpenClaw: openclaw/&lt;slug&gt; o openclaw/default.
     */
    private function openClawModelId(string $agentSlug): string
    {
        $agentSlug = trim($agentSlug);
        if ($agentSlug === '') {
            return 'openclaw/default';
        }
        if (str_starts_with($agentSlug, 'openclaw/')) {
            return $agentSlug;
        }

        return 'openclaw/'.$agentSlug;
    }

    /**
     * @param  mixed  $data
     */
    private function responseLooksLikeOpenAiChat(mixed $data): bool
    {
        return is_array($data)
            && isset($data['choices'])
            && is_array($data['choices'])
            && $data['choices'] !== [];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array<string, mixed>>
     */
    private function leadsFromChatCompletionBody(array $data): array
    {
        $choice = $data['choices'][0] ?? null;
        if (! is_array($choice)) {
            return [];
        }
        $message = $choice['message'] ?? null;
        if (! is_array($message)) {
            return [];
        }
        $content = $message['content'] ?? '';
        if (! is_string($content)) {
            return [];
        }

        return $this->parseAssistantJsonLeads($content);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseAssistantJsonLeads(string $content): array
    {
        $content = trim($content);
        if (preg_match('/^```(?:json)?\s*([\s\S]*?)\s*```/m', $content, $m)) {
            $content = trim($m[1]);
        }

        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            return $this->normalizeLeadsPayload($decoded);
        }

        if (preg_match('/\{[\s\S]*"leads"[\s\S]*\}/', $content, $m)) {
            $decoded = json_decode($m[0], true);
            if (is_array($decoded)) {
                return $this->normalizeLeadsPayload($decoded);
            }
        }

        return [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function normalizeLeadsPayload(array $data): array
    {
        if (isset($data['leads']) && is_array($data['leads'])) {
            return array_values(array_filter($data['leads'], 'is_array'));
        }
        foreach (['data', 'result', 'payload'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                $inner = $data[$key];
                if (isset($inner['leads']) && is_array($inner['leads'])) {
                    return array_values(array_filter($inner['leads'], 'is_array'));
                }
            }
        }

        return [];
    }

    /**
     * WhatsApp / correo vía Alleria (OpenClaw): POST /v1/chat/completions con modelo openclaw/&lt;slug&gt;.
     * El token del gateway actúa como operador; opcional OPENCLAW_COMMS_OWNER_AGENT_ID (ej. amo).
     *
     * @return array{success: bool, error?: string, mock?: bool, assistant_reply?: string, raw?: mixed}
     */
    public function callCommunicationAgent(
        string $channel,
        string $to,
        string $message,
        ?string $subject = null,
        ?int $leadId = null,
    ): array {
        $base = config('services.openclaw.gateway_url');
        if (! is_string($base) || $base === '') {
            return [
                'success' => true,
                'mock' => true,
                'channel' => $channel,
                'to' => $to,
                'lead_id' => $leadId,
            ];
        }

        $token = (string) config('services.openclaw.api_key');
        if ($token === '') {
            return [
                'success' => false,
                'error' => 'Configura OPENCLAW_API_KEY o OPENCLAW_GATEWAY_TOKEN en .env',
            ];
        }

        $agentSlug = $this->resolveAlleriaAgentSlug();
        $system = <<<'TXT'
Eres Alleria, agente principal del gateway OpenClaw (CRM conectado). Esta petición la envía el operador humano del CRM con autorización de amo/dueño.
Debes ejecutar la acción usando tus herramientas reales (WhatsApp, correo/Gmail, etc.):
- No cambies el significado del texto que deben recibir; solo ajustes mínimos que exija el canal.
- Si falta un dato indispensable, dilo claramente.
Responde al CRM en una o dos frases: confirmación de envío o error.
TXT;

        $leadRef = $leadId !== null ? (string) $leadId : '—';
        if ($channel === 'whatsapp') {
            $user = "CANAL: WhatsApp\nDestino: {$to}\nLead CRM id: {$leadRef}\nMensaje a enviar (texto exacto):\n---\n{$message}\n---";
        } else {
            $sub = $subject ?? '(sin asunto)';
            $user = "CANAL: correo electrónico\nPara: {$to}\nAsunto: {$sub}\nLead CRM id: {$leadRef}\nCuerpo:\n---\n{$message}\n---";
        }

        try {
            $chatUrl = rtrim($base, '/').'/v1/chat/completions';
            $payload = [
                'model' => $this->openClawModelId($agentSlug),
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $user],
                ],
                'temperature' => 0.25,
            ];

            $http = Http::timeout($this->httpTimeoutSeconds())
                ->withToken($token)
                ->acceptJson();

            $owner = config('services.openclaw.comms_owner_agent_id');
            if (is_string($owner) && trim($owner) !== '') {
                $http = $http->withHeaders([
                    'x-openclaw-agent-id' => trim($owner),
                ]);
            }

            $response = $http->post($chatUrl, $payload);
            $data = $response->json();

            if ($response->successful()
                && is_array($data)
                && $this->responseLooksLikeOpenAiChat($data)) {
                $reply = $this->assistantReplyText($data);

                return [
                    'success' => true,
                    'assistant_reply' => $reply,
                    'raw' => $data,
                    'channel' => $channel,
                    'to' => $to,
                    'lead_id' => $leadId,
                ];
            }

            $legacyAgent = config('services.openclaw.comms_agent_id')
                ?: $agentSlug;

            $legacy = Http::timeout($this->httpTimeoutSeconds())
                ->withToken($token)
                ->acceptJson()
                ->post(rtrim($base, '/').'/agents/run', [
                    'agent_id' => $legacyAgent,
                    'channel' => $channel,
                    'to' => $to,
                    'message' => $message,
                    'subject' => $subject,
                    'metadata' => ['lead_id' => $leadId],
                ]);

            if (! $legacy->successful()) {
                return [
                    'success' => false,
                    'error' => $legacy->body() ?: $response->body(),
                ];
            }

            $legacyData = $legacy->json();
            if (! is_array($legacyData)) {
                return ['success' => false, 'error' => 'Invalid JSON from OpenClaw (/agents/run)'];
            }

            return $legacyData + ['success' => true];
        } catch (\Throwable $e) {
            Log::error('OpenClaw comms failed', ['e' => $e->getMessage()]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function resolveAlleriaAgentSlug(): string
    {
        foreach (
            [
                config('services.openclaw.alleria_agent_id'),
                config('services.openclaw.comms_agent_id'),
            ] as $candidate
        ) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return 'main';
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assistantReplyText(array $data): string
    {
        $choice = $data['choices'][0] ?? null;
        if (! is_array($choice)) {
            return '';
        }
        $message = $choice['message'] ?? null;
        if (! is_array($message)) {
            return '';
        }
        $content = $message['content'] ?? '';

        return is_string($content) ? trim($content) : '';
    }

    /**
     * Mensaje claro cuando chatCompletions falla (p. ej. OPENAI_API_KEY inválida en el gateway).
     *
     * @param  array<string, mixed>|null  $data
     */
    private function formatLinaChatFailure(\Illuminate\Http\Client\Response $response, ?array $data): ?string
    {
        $status = $response->status();
        $body = $response->body();

        if ($status === 401) {
            return 'OpenClaw rechazó el token (OPENCLAW_GATEWAY_TOKEN). Verifica que coincida con gateway.auth.token en openclaw.json.';
        }

        $snippet = '';
        if (is_array($data)) {
            $snippet = (string) ($data['error']['message'] ?? $data['message'] ?? json_encode($data));
        } elseif ($body !== '') {
            $snippet = strlen($body) > 400 ? substr($body, 0, 400).'…' : $body;
        }

        if (str_contains($snippet, 'invalid_api_key') || str_contains($snippet, 'Incorrect API key')) {
            return 'OpenClaw no pudo llamar a OpenAI: OPENAI_API_KEY inválida o placeholder en /var/www/velora/.env. Actualiza la clave y reinicia openclaw + app.';
        }

        if ($status >= 400 && $status !== 404 && $snippet !== '') {
            return "OpenClaw /v1/chat/completions falló (HTTP {$status}): {$snippet}";
        }

        if ($status === 404) {
            return null;
        }

        if ($status >= 400) {
            return "OpenClaw /v1/chat/completions falló (HTTP {$status}).";
        }

        return null;
    }

    /**
     * @return array{success: true, leads: list<array<string, mixed>>, mock: true}
     */
    private function mockScrapeResult(string $query, int $maxLeads): array
    {
        $n = min(3, max(1, $maxLeads));
        $leads = [];
        for ($i = 1; $i <= $n; $i++) {
            $leads[] = [
                'name' => "Mock Lead {$i}",
                'email' => "mock{$i}.lead@example.test",
                'company' => "Mock Co {$i} ({$query})",
                'phone' => null,
                'website' => 'https://example.test',
            ];
        }

        return ['success' => true, 'leads' => $leads, 'mock' => true];
    }
}
