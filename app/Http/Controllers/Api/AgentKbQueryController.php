<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AgentKbQueryService;
use Illuminate\Http\Request;

class AgentKbQueryController extends Controller
{
    public function query(Request $request, AgentKbQueryService $kb)
    {
        $user = $request->user();

        $validated = $request->validate([
            'q' => ['required', 'string', 'max:5000'],
            'top_k' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $q = $validated['q'];
        $topK = (int)($validated['top_k'] ?? 8);

        $hits = $kb->search($user->id, $q, $topK);

        return response()->json([
            'ok' => true,
            'hits' => $hits,
        ]);
    }
}
