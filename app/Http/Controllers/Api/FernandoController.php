<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OpenClawGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FernandoController extends Controller
{
    public function __construct(
        private OpenClawGateway $openClaw,
    ) {}

    public function status(Request $request): JsonResponse
    {
        $base = config('services.openclaw.gateway_url');
        $token = (string) config('services.openclaw.api_key');
        $fernandoId = $this->openClaw->resolveFernandoAgentSlug();

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

        $probe = $this->openClaw->callFernandoAgent(
            [['role' => 'user', 'content' => 'Responde en una sola frase: OK']],
            $this->userContext($request->user()),
        );

        return response()->json([
            'gateway_url_internal' => $base,
            'gateway_reachable' => $gatewayReachable,
            'gateway_http' => $gatewayHttp,
            'fernando_agent_id' => $fernandoId,
            'support' => [
                'email' => config('velora.support_email'),
                'whatsapp' => config('velora.whatsapp'),
                'calendly_url' => config('velora.calendly_url'),
            ],
            'fernando_probe' => [
                'success' => $probe['success'] ?? false,
                'reply_preview' => isset($probe['reply']) ? mb_substr((string) $probe['reply'], 0, 120) : null,
                'error' => $probe['error'] ?? null,
                'mock' => $probe['mock'] ?? false,
            ],
        ]);
    }

    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:40'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:16000'],
        ]);

        /** @var list<array{role: string, content: string}> $messages */
        $messages = array_values(array_map(fn (array $m) => [
            'role' => $m['role'],
            'content' => $m['content'],
        ], $data['messages']));

        $result = $this->openClaw->callFernandoAgent(
            $messages,
            $this->userContext($request->user()),
        );

        return response()->json($result);
    }

    /**
     * @return array<string, mixed>
     */
    private function userContext(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        return [
            'name' => $user->name,
            'subscription_status' => $user->subscription_status,
        ];
    }
}
