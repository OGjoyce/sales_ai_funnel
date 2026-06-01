<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * When a browser/API request is authenticated, scope rows to the current user.
 * Jobs, webhooks, and MCP use explicit user_id or withoutGlobalScope().
 */
class BelongsToAuthenticatedUser implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (! Auth::check()) {
            return;
        }

        $builder->where($model->getTable().'.user_id', Auth::id());
    }
}
