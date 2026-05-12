<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Token-authenticated JSON endpoints for the FastMCP server (machine clients).
 */
class ServiceMcpController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $q = (string) $request->query('search', '');
        $limit = min(25, max(1, (int) $request->query('limit', 10)));

        $query = Product::query()->active()->orderBy('title');
        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', '%'.$q.'%')
                    ->orWhere('code', 'like', '%'.$q.'%');
            });
        }

        return response()->json(['products' => $query->limit($limit)->get()]);
    }

    public function leadHistory(Lead $lead, Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 20)));
        $items = Interaction::query()
            ->where('lead_id', $lead->id)
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json(['interactions' => $items]);
    }

    public function updateLeadStage(Lead $lead, Request $request): JsonResponse
    {
        $data = $request->validate([
            'funnel_stage_id' => 'required|exists:funnel_stages,id',
            'reason' => 'nullable|string',
        ]);

        $lead->funnel_stage_id = (int) $data['funnel_stage_id'];
        $lead->save();

        return response()->json(['lead' => $lead->fresh()->load('funnelStage')]);
    }
}
