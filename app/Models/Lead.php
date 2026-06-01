<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    protected $fillable = [
        'user_id',
        'lina_generation_run_id',
        'funnel_stage_id',
        'name',
        'email',
        'phone',
        'company',
        'website',
        'linkedin_url',
        'source',
        'score',
        'raw_data',
        'openai_thread_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'raw_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function linaGenerationRun(): BelongsTo
    {
        return $this->belongsTo(LinaGenerationRun::class);
    }

    public function funnelStage(): BelongsTo
    {
        return $this->belongsTo(FunnelStage::class);
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(Interaction::class)->orderByDesc('created_at');
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class);
    }

    public function agentLogs(): HasMany
    {
        return $this->hasMany(AgentLog::class)->orderByDesc('created_at');
    }
}
