<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\InvokerService;
use App\Services\OpenClawGateway;
use App\Services\VeloraLogReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvokerController extends Controller
{
    public function __construct(
        private InvokerService $invoker,
        private OpenClawGateway $openClaw,
        private VeloraLogReader $logs,
    ) {}

    public function status(): JsonResponse
    {
        $probe = $this->openClaw->callInvokerAgent([
            ['role' => 'user', 'content' => 'Responde: Invoker online.'],
        ]);

        return response()->json([
            'invoker_agent_id' => $this->openClaw->resolveInvokerAgentSlug(),
            'channel' => 'velora-admins',
            'invoker_probe' => [
                'success' => $probe['success'] ?? false,
                'reply_preview' => isset($probe['reply']) ? mb_substr((string) $probe['reply'], 0, 120) : null,
                'error' => $probe['error'] ?? null,
            ],
        ]);
    }

    public function channel(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'channel' => 'velora-admins',
            'messages' => $this->invoker->channelHistory($user),
        ]);
    }

    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:16000'],
        ]);

        $admin = $request->user();
        $this->invoker->persistMessage($admin, 'user', $data['message']);

        $history = collect($this->invoker->channelHistory($admin))
            ->map(fn (array $m) => ['role' => $m['role'], 'content' => $m['content']])
            ->filter(fn (array $m) => in_array($m['role'], ['user', 'assistant'], true))
            ->values()
            ->all();

        $result = $this->invoker->chat($admin, $history);

        if (! ($result['success'] ?? false)) {
            return response()->json($result, 422);
        }

        $this->invoker->persistMessage(
            $admin,
            'assistant',
            (string) ($result['reply'] ?? ''),
            $result['tool_calls'] ?? null,
            $result['actions_executed'] ?? null,
        );

        return response()->json($result);
    }

    public function logs(): JsonResponse
    {
        return response()->json($this->logs->snapshot());
    }
}
