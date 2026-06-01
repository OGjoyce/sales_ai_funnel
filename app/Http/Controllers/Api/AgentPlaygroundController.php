<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\AgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentPlaygroundController extends Controller
{
    public function chat(Request $request, AgentService $agent): JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:8000',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        $lead = null;
        if (! empty($data['lead_id'])) {
            $lead = Lead::query()
                ->where('user_id', $request->user()->id)
                ->findOrFail((int) $data['lead_id']);
        }

        $result = $agent->runForPlayground(
            userId: (int) $request->user()->id,
            operatorMessage: (string) $data['message'],
            lead: $lead,
        );

        if (($result['ok'] ?? false) !== true) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }
}
