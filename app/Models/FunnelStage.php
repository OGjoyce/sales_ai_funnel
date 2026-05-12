<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FunnelStage extends Model
{
    protected $fillable = [
        'name',
        'sort_order',
        'color_token',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
