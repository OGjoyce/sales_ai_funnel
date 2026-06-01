<?php

namespace App\Services;

use App\Models\InvokerMessage;
use App\Models\User;

class InvokerService
{
    public function __construct(
        private OpenClawGateway $openClaw,
        private VeloraLogReader $logs,
        private InvokerActionExecutor $actions,
    ) {}

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return array{success: bool, reply?: string, tool_calls?: list<array<string, mixed>>, actions_executed?: list<array<string, mixed>>, error?: string, mock?: bool}
     */
    public function chat(User $admin, array $history): array
    {
        $system = $this->systemPrompt();
        $messages = [['role' => 'system', 'content' => $system]];

        foreach ($history as $msg) {
            if (! in_array($msg['role'] ?? '', ['user', 'assistant'], true)) {
                continue;
            }
            $messages[] = [
                'role' => $msg['role'],
                'content' => (string) ($msg['content'] ?? ''),
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => $this->logs->contextBlock(60)."\n\n[Admin: {$admin->name} | id={$admin->id}]",
        ];

        $allExecuted = [];
        $lastReply = '';
        $allToolCalls = [];
        $mock = false;

        for ($step = 0; $step < 8; $step++) {
            $result = $this->openClaw->callInvokerAgent($messages);
            $mock = $mock || ($result['mock'] ?? false);
            if (! ($result['success'] ?? false)) {
                return [
                    'success' => false,
                    'error' => $result['error'] ?? 'OpenClaw Invoker no respondió',
                    'actions_executed' => $allExecuted,
                ];
            }

            $reply = trim((string) ($result['reply'] ?? ''));
            $toolCalls = $this->actions->parseToolCallsFromContent($reply);

            if ($toolCalls === []) {
                $lastReply = $reply;

                break;
            }

            $allToolCalls = array_merge($allToolCalls, $toolCalls);
            $messages[] = ['role' => 'assistant', 'content' => $reply];

            $results = [];
            foreach ($toolCalls as $tc) {
                $exec = $this->actions->execute($tc['name'], $tc['arguments'], $admin);
                $allExecuted[] = [
                    'tool' => $tc['name'],
                    'arguments' => $tc['arguments'],
                    'ok' => $exec['ok'] ?? false,
                    'result' => $exec['result'] ?? null,
                    'error' => $exec['error'] ?? null,
                ];
                $results[] = [
                    'tool' => $tc['name'],
                    'ok' => $exec['ok'] ?? false,
                    'result' => $exec['result'] ?? null,
                    'error' => $exec['error'] ?? null,
                ];
            }

            $messages[] = [
                'role' => 'user',
                'content' => 'Resultados de herramientas Velora (JSON): '.json_encode($results, JSON_UNESCAPED_UNICODE),
            ];
        }

        if ($lastReply === '' && $allExecuted !== []) {
            $final = $this->openClaw->callInvokerAgent($messages);
            $lastReply = ($final['success'] ?? false)
                ? trim((string) ($final['reply'] ?? 'Acciones ejecutadas.'))
                : 'Acciones ejecutadas (sin resumen del agente).';
        }

        return [
            'success' => true,
            'reply' => $lastReply,
            'tool_calls' => $allToolCalls,
            'actions_executed' => $allExecuted,
            'mock' => $mock,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function channelHistory(User $admin, int $limit = 80): array
    {
        return InvokerMessage::query()
            ->where('user_id', $admin->id)
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (InvokerMessage $m) => [
                'id' => $m->id,
                'role' => $m->role,
                'content' => $m->content,
                'tool_calls' => $m->tool_calls,
                'actions_executed' => $m->actions_executed,
                'created_at' => $m->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    public function persistMessage(
        User $admin,
        string $role,
        string $content,
        ?array $toolCalls = null,
        ?array $actionsExecuted = null,
    ): InvokerMessage {
        return InvokerMessage::create([
            'user_id' => $admin->id,
            'role' => $role,
            'content' => $content,
            'tool_calls' => $toolCalls,
            'actions_executed' => $actionsExecuted,
            'metadata' => ['channel' => 'velora-admins'],
        ]);
    }

    private function systemPrompt(): string
    {
        $tools = implode(', ', InvokerActionExecutor::allowedTools());

        return <<<TXT
Eres Invoker, operador arcano del CRM Velora (admin). Tienes acceso a logs vía [LOGS_VELORA].
Solo puedes modificar datos Velora (Laravel/React): leads, embudo, productos, usuarios trial, interacciones.
Herramientas: {$tools}.
Para ejecutar una o más herramientas responde SOLO JSON: {"tool_calls":[{"name":"...","arguments":{}}]}.
Después de recibir resultados, resume en español qué hiciste. No toques infra ni código.
TXT;
    }
}
