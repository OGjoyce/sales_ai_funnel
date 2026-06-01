<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\FunnelStage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KanbanPageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $userId = (int) $request->user()->id;

        $stages = FunnelStage::query()
            ->orderBy('sort_order')
            ->with([
                'leads' => fn ($q) => $q
                    ->where('user_id', $userId)
                    ->orderByDesc('updated_at')
                    ->with([
                        'interactions' => fn ($iq) => $iq->latest()->limit(1),
                    ]),
            ])
            ->get();

        return Inertia::render('crm/kanban', [
            'initialFunnel' => [
                'stages' => $stages,
            ],
        ]);
    }
}
