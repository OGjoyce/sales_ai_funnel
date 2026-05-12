<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MetricsController extends Controller
{
    public function funnel(): JsonResponse
    {
        // Stages ordered by sort_order.
        $stages = DB::table('funnel_stages')
            ->orderBy('sort_order')
            ->get(['id', 'name', 'sort_order']);

        $countsByStage = DB::table('leads')
            ->select('funnel_stage_id', DB::raw('COUNT(*)::int AS c'))
            ->groupBy('funnel_stage_id')
            ->pluck('c', 'funnel_stage_id');

        $rows = [];
        foreach ($stages as $s) {
            $count = (int) ($countsByStage[$s->id] ?? 0);
            $rows[] = [
                'id' => (int) $s->id,
                'name' => (string) $s->name,
                'count' => $count,
            ];
        }

        // Conversions between adjacent stages.
        $conversions = [];
        for ($i = 0; $i < count($rows) - 1; $i++) {
            $from = $rows[$i];
            $to = $rows[$i + 1];
            $rate = $from['count'] > 0 ? ($to['count'] / $from['count']) : null;
            $conversions[] = [
                'from_stage_id' => $from['id'],
                'to_stage_id' => $to['id'],
                'from' => $from['name'],
                'to' => $to['name'],
                'rate' => $rate,
            ];
        }

        $total = array_sum(array_map(fn ($r) => (int) $r['count'], $rows));

        return response()->json([
            'ok' => true,
            'total_leads' => $total,
            'stages' => $rows,
            'conversions' => $conversions,
        ]);
    }
}
