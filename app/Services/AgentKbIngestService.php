<?php

namespace App\Services;

use App\Models\AgentChunk;
use App\Models\AgentFile;
use App\Support\TextChunker;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;

class AgentKbIngestService
{
    public function __construct(
        protected AgentFileTextExtractor $extractor,
    ) {
    }

    /**
     * Process an uploaded file into chunks and embeddings.
     */
    public function ingest(AgentFile $file): void
    {
        $file->update(['status' => 'processing', 'error' => null]);

        try {
            $text = $this->extractor->extractText($file);
            $chunks = TextChunker::chunk($text);

            // Clear old chunks if re-processing.
            AgentChunk::query()
                ->where('agent_file_id', $file->id)
                ->delete();

            $driver = DB::getDriverName();
            $canEmbed = $driver === 'pgsql';

            $chunkCount = 0;
            foreach ($chunks as $i => $chunk) {
                $hash = hash('sha256', $chunk);
                $tokens = TextChunker::estimateTokens($chunk);

                $embedding = null;
                if ($canEmbed) {
                    $embedding = $this->embed($chunk);
                }

                $row = AgentChunk::create([
                    'user_id' => $file->user_id,
                    'agent_file_id' => $file->id,
                    'chunk_index' => $i,
                    'content' => $chunk,
                    'content_hash' => $hash,
                    'tokens_estimate' => $tokens,
                    'meta' => [
                        'source' => $file->original_name,
                        'extension' => $file->extension,
                    ],
                ]);

                if ($canEmbed && is_array($embedding)) {
                    // Store embedding using pgvector literal.
                    $literal = '[' . implode(',', array_map(fn($v) => sprintf('%.8f', (float)$v), $embedding)) . ']';
                    DB::statement('UPDATE agent_chunks SET embedding = ?::vector WHERE id = ?', [$literal, $row->id]);
                }

                $chunkCount++;
            }

            $file->update([
                'status' => 'ready',
                'chunks_count' => $chunkCount,
            ]);
        } catch (\Throwable $e) {
            Log::error('Agent KB ingest failed', [
                'agent_file_id' => $file->id,
                'error' => $e->getMessage(),
            ]);
            $file->update([
                'status' => 'error',
                'error' => $e->getMessage(),
            ]);
        }
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

        // openai-php returns array-like object
        $vec = $res->embeddings[0]->embedding ?? null;
        if (!is_array($vec)) {
            throw new \RuntimeException('Embedding response missing vector');
        }

        return $vec;
    }
}
