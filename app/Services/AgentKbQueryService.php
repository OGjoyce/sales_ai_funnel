<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use OpenAI\Laravel\Facades\OpenAI;

class AgentKbQueryService
{
    /**
     * @return array<int, array{content:string, score:float, meta:array|null}>
     */
    public function search(int $userId, string $query, int $topK = 8): array
    {
        $driver = DB::getDriverName();
        if ($driver !== 'pgsql') {
            return [];
        }

        $embedding = $this->embed($query);
        $literal = '[' . implode(',', array_map(fn($v) => sprintf('%.8f', (float)$v), $embedding)) . ']';

        // cosine distance: smaller is better.
        $rows = DB::select(
            'SELECT content, meta, (embedding <=> ?::vector) AS distance
             FROM agent_chunks
             WHERE user_id = ? AND embedding IS NOT NULL
             ORDER BY embedding <=> ?::vector
             LIMIT ?',
            [$literal, $userId, $literal, $topK]
        );

        return array_map(function ($r) {
            $dist = (float)($r->distance ?? 1.0);
            $score = 1.0 - $dist;
            return [
                'content' => (string)$r->content,
                'score' => $score,
                'meta' => $r->meta ? json_decode($r->meta, true) : null,
            ];
        }, $rows);
    }

    /**
     * @return array<int, float>
     */
    protected function embed(string $text): array
    {
        $model = config('services.openai.embeddings_model', env('OPENAI_EMBEDDINGS_MODEL', 'text-embedding-3-small'));

        $res = OpenAI::embeddings()->create([
            'model' => $model,
            'input' => $text,
        ]);

        $vec = $res->embeddings[0]->embedding ?? null;
        if (!is_array($vec)) {
            throw new \RuntimeException('Embedding response missing vector');
        }

        return $vec;
    }
}
