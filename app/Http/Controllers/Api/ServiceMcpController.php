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
 *
 * Agent sharing model:
 * - Lina (shared): creates leads tagged with user_id via CRM jobs.
 * - Fernando (shared): sales on landing; no per-user CRM rows.
 * - Invoker (admin): CRM-wide via InvokerService.
 * - Personal trained agent: MCP calls must pass X-Velora-User-Id to scope products/leads.
 */
class ServiceMcpController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $userId = $this->resolveVeloraUserId($request);
        $q = (string) $request->query('search', '');
        $limit = min(25, max(1, (int) $request->query('limit', 10)));

        $query = Product::query()
            ->where('user_id', $userId)
            ->active()
            ->orderBy('title');
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
        $userId = $this->resolveVeloraUserId($request);

        if ((int) $lead->user_id !== $userId) {
            abort(404);
        }

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
        $userId = $this->resolveVeloraUserId($request);

        if ((int) $lead->user_id !== $userId) {
            abort(404);
        }

        $data = $request->validate([
            'funnel_stage_id' => 'required|exists:funnel_stages,id',
            'reason' => 'nullable|string',
        ]);

        $lead->funnel_stage_id = (int) $data['funnel_stage_id'];
        $lead->save();

        return response()->json(['lead' => $lead->fresh()->load('funnelStage')]);
    }

    private function resolveVeloraUserId(Request $request): int
    {
        $header = $request->header('X-Velora-User-Id');
        $query = $request->query('user_id');

        $raw = $header !== null && $header !== '' ? $header : $query;

        if ($raw === null || $raw === '' || ! is_numeric($raw)) {
            abort(422, 'X-Velora-User-Id header (or user_id query) is required for MCP service calls.');
        }

        $userId = (int) $raw;

        if ($userId < 1) {
            abort(422, 'Invalid Velora user id.');
        }

        return $userId;
    }
}
