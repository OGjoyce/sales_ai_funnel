<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentChunk extends Model
{
    protected $fillable = [
        'user_id',
        'agent_file_id',
        'chunk_index',
        'content',
        'content_hash',
        'embedding',
        'tokens_estimate',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'tokens_estimate' => 'integer',
        // embedding is stored as pgvector; keep as raw string/array via queries.
    ];

    public function file(): BelongsTo
    {
        return $this->belongsTo(AgentFile::class, 'agent_file_id');
    }
}
