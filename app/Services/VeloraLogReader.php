<?php

namespace App\Services;

use App\Models\AgentLog;
use App\Models\LinaGenerationRun;
use Illuminate\Support\Facades\File;

class VeloraLogReader
{
    /**
     * @return array{laravel: string, agent_logs: string, lina_runs: string}
     */
    public function snapshot(int $laravelLines = 80, int $agentLimit = 25, int $linaLimit = 15): array
    {
        return [
            'laravel' => $this->tailLaravelLog($laravelLines),
            'agent_logs' => $this->formatAgentLogs($agentLimit),
            'lina_runs' => $this->formatLinaRuns($linaLimit),
        ];
    }

    public function contextBlock(int $laravelLines = 80): string
    {
        $s = $this->snapshot($laravelLines);

        return <<<TXT
[LOGS_VELORA]
--- laravel.log (últimas líneas) ---
{$s['laravel']}
--- agent_logs ---
{$s['agent_logs']}
--- lina_generation_runs ---
{$s['lina_runs']}
[/LOGS_VELORA]
TXT;
    }

    private function tailLaravelLog(int $lines): string
    {
        $path = storage_path('logs/laravel.log');
        if (! File::isFile($path)) {
            return '(sin laravel.log)';
        }

        try {
            $content = File::get($path);
            $rows = explode("\n", $content);
            $tail = array_slice($rows, -$lines);

            return implode("\n", $tail);
        } catch (\Throwable $e) {
            return '(no se pudo leer laravel.log: '.$e->getMessage().')';
        }
    }

    private function formatAgentLogs(int $limit): string
    {
        $logs = AgentLog::query()
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        if ($logs->isEmpty()) {
            return '(vacío)';
        }

        return $logs->map(function (AgentLog $log) {
            $preview = mb_substr((string) $log->response, 0, 200);

            return "#{$log->id} lead={$log->lead_id} tokens={$log->tokens_used} ".str_replace("\n", ' ', $preview);
        })->implode("\n");
    }

    private function formatLinaRuns(int $limit): string
    {
        if (! class_exists(LinaGenerationRun::class)) {
            return '(modelo no disponible)';
        }

        $runs = LinaGenerationRun::query()
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        if ($runs->isEmpty()) {
            return '(vacío)';
        }

        return $runs->map(function (LinaGenerationRun $run) {
            return "#{$run->id} status={$run->status} leads_created=".json_encode($run->leads_created ?? []);
        })->implode("\n");
    }
}
