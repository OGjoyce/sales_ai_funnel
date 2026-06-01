<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Lead;
use App\Models\Product;
use Illuminate\Http\Request;

trait AuthorizesUserOwnedResource
{
    protected function authorizeLead(Request $request, Lead $lead): void
    {
        if ((int) $lead->user_id !== (int) $request->user()->id) {
            abort(404);
        }
    }

    protected function authorizeProduct(Request $request, Product $product): void
    {
        if ((int) $product->user_id !== (int) $request->user()->id) {
            abort(404);
        }
    }
}
