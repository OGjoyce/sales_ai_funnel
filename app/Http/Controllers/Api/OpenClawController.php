<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenClawGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OpenClawController extends Controller
{
    public function __construct(
        private OpenClawGateway $openClaw,
    ) {}

    /**
     * Estado del gateway y agente Lina (requiere sesión CRM).
     */
    public function status(): JsonResponse
    {
        $base = config('services.openclaw.gateway_url');
        $token = (string) config('services.openclaw.api_key');
        $linaId = config('services.openclaw.lina_agent_id') ?: 'lina';

        $gatewayReachable = false;
        $gatewayHttp = null;

        if (is_string($base) && $base !== '' && $token !== '') {
            try {
                $probe = Http::timeout(10)
                    ->withToken($token)
                    ->get(rtrim($base, '/').'/');
                $gatewayHttp = $probe->status();
                $gatewayReachable = $probe->successful() || $probe->status() === 404;
            } catch (\Throwable) {
                $gatewayReachable = false;
            }
        }

        $linaProbe = $this->openClaw->callLinaAgent(
            'Prueba rápida: busca 1 empresa real en Guatemala con sitio web público. Usa búsqueda web/browser antes de responder. JSON: {"leads":[{"name":"...","email":null,"phone":null,"company":"...","website":"...","linkedin_url":null}]}',
            1,
        );

        $fernandoId = $this->openClaw->resolveFernandoAgentSlug();
        $fernandoProbe = $this->openClaw->callFernandoAgent(
            [['role' => 'user', 'content' => 'Responde en una sola frase: OK']],
        );

        return response()->json([
            'gateway_url_internal' => $base,
            'gateway_reachable' => $gatewayReachable,
            'gateway_http' => $gatewayHttp,
            'lina_agent_id' => $linaId,
            'fernando_agent_id' => $fernandoId,
            'openai_configured' => filled(config('openai.api_key')),
            'control_ui_public_url' => rtrim((string) config('app.url'), '/').'/openclaw/',
            'lina_probe' => [
                'success' => $linaProbe['success'] ?? false,
                'leads_count' => count($linaProbe['leads'] ?? []),
                'error' => $linaProbe['error'] ?? null,
                'mock' => $linaProbe['mock'] ?? false,
            ],
            'fernando_probe' => [
                'success' => $fernandoProbe['success'] ?? false,
                'reply_preview' => isset($fernandoProbe['reply']) ? mb_substr((string) $fernandoProbe['reply'], 0, 120) : null,
                'error' => $fernandoProbe['error'] ?? null,
                'mock' => $fernandoProbe['mock'] ?? false,
            ],
        ]);
    }

    /**
     * Prueba Lina con instrucción personalizada (body: { "instruction": "...", "max_leads": 3 }).
     */
    public function linaProbe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'instruction' => ['required', 'string', 'max:8000'],
            'max_leads' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        $result = $this->openClaw->callLinaAgent(
            $data['instruction'],
            (int) ($data['max_leads'] ?? 3),
        );

        return response()->json($result);
    }
}
