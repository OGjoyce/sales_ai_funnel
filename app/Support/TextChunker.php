<?php

namespace App\Support;

class TextChunker
{
    /**
     * Very fast chunker for RAG.
     * Keeps chunks around ~3-5k chars by default; tokenization is model-specific.
     *
     * @return array<int, string>
     */
    public static function chunk(string $text, int $targetChars = 3500, int $overlapChars = 350): array
    {
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? $text);
        if ($text === '') {
            return [];
        }

        $chunks = [];
        $len = mb_strlen($text);
        $start = 0;

        while ($start < $len) {
            $end = min($len, $start + $targetChars);

            // Prefer ending on sentence boundary if possible.
            $slice = mb_substr($text, $start, $end - $start);
            $lastPeriod = max(mb_strrpos($slice, '. ') ?: 0, mb_strrpos($slice, '? ') ?: 0, mb_strrpos($slice, '! ') ?: 0);
            if ($lastPeriod > (int)($targetChars * 0.6)) {
                $slice = mb_substr($slice, 0, $lastPeriod + 1);
                $end = $start + mb_strlen($slice);
            }

            $slice = trim($slice);
            if ($slice !== '') {
                $chunks[] = $slice;
            }

            if ($end >= $len) {
                break;
            }
            $start = max(0, $end - $overlapChars);
        }

        return $chunks;
    }

    public static function estimateTokens(string $text): int
    {
        // Rough heuristic: ~4 chars per token average in Latin text.
        $chars = mb_strlen($text);
        return (int)ceil($chars / 4);
    }
}
