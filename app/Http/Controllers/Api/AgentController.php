<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessLeadWithAgent;
use App\Models\AgentLog;
use App\Models\Lead;
use App\Services\AgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    public function run(Request $request, AgentService $agent): JsonResponse
    {
        $data = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'async' => 'nullable|boolean',
            'context' => 'nullable|array',
        ]);

        $lead = Lead::query()->findOrFail($data['lead_id']);

        if ($request->boolean('async')) {
            ProcessLeadWithAgent::dispatch($lead->id, $data['context'] ?? []);

            return response()->json(['queued' => true]);
        }

        $result = $agent->runForLead($lead, $data['context'] ?? []);

        if (($result['ok'] ?? false) !== true) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function chat(Request $request, AgentService $agent): JsonResponse
    {
        $data = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'message' => 'required|string|max:8000',
        ]);

        $lead = Lead::query()->findOrFail($data['lead_id']);

        $result = $agent->runForLead($lead, [
            'operator_message' => $data['message'],
        ]);

        if (($result['ok'] ?? false) !== true) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function logs(Request $request): JsonResponse
    {
        $leadId = $request->query('lead_id');
        $query = AgentLog::query()->orderByDesc('id')->limit(100);

        if ($leadId !== null && $leadId !== '') {
            $query->where('lead_id', (int) $leadId);
        }

        return response()->json(['logs' => $query->get()]);
    }
}
