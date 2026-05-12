<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FunnelStage;
use Illuminate\Http\JsonResponse;

class FunnelController extends Controller
{
    public function index(): JsonResponse
    {
        $stages = FunnelStage::query()
            ->orderBy('sort_order')
            ->with([
                'leads' => fn ($q) => $q
                    ->orderByDesc('updated_at')
                    ->with([
                        'interactions' => fn ($iq) => $iq->latest()->limit(1),
                    ]),
            ])
            ->get();

        return response()->json(['stages' => $stages]);
    }

    public function stages(): JsonResponse
    {
        $stages = FunnelStage::query()->orderBy('sort_order')->get();

        return response()->json(['stages' => $stages]);
    }
}
