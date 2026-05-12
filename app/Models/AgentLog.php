<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentLog extends Model
{
    protected $fillable = [
        'lead_id',
        'thread_id',
        'tool_calls',
        'response',
        'tokens_used',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'tool_calls' => 'array',
            'metadata' => 'array',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
