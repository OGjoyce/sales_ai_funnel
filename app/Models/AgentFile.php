<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentFile extends Model
{
    protected $fillable = [
        'user_id',
        'original_name',
        'stored_path',
        'mime_type',
        'extension',
        'size_bytes',
        'status',
        'error',
        'chunks_count',
        'checksum_sha256',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'chunks_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
