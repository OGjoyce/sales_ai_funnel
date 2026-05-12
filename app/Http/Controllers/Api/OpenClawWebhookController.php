<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessLeadWithAgent;
use App\Models\Interaction;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OpenClawWebhookController extends Controller
{
    public function whatsapp(Request $request): JsonResponse
    {
        if (! $this->validSecret($request)) {
            abort(401, 'Invalid webhook secret');
        }

        $data = $request->validate([
            'from' => 'required|string',
            'message' => 'required|string',
        ]);

        $lead = Lead::query()->where('phone', $data['from'])->first();
        if ($lead === null) {
            Log::warning('OpenClaw WhatsApp: lead not found', ['from' => $data['from']]);

            return response()->json(['ok' => false, 'error' => 'lead_not_found'], 404);
        }

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'whatsapp',
            'direction' => 'inbound',
            'content' => $data['message'],
            'sent_by' => 'lead',
            'status' => 'received',
        ]);

        ProcessLeadWithAgent::dispatch($lead->id, [
            'trigger' => 'inbound_whatsapp',
            'inbound_message' => $data['message'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function email(Request $request): JsonResponse
    {
        if (! $this->validSecret($request)) {
            abort(401, 'Invalid webhook secret');
        }

        $data = $request->validate([
            'from' => 'required|email',
            'subject' => 'nullable|string',
            'body' => 'required|string',
        ]);

        $lead = Lead::query()->where('email', $data['from'])->first();
        if ($lead === null) {
            return response()->json(['ok' => false, 'error' => 'lead_not_found'], 404);
        }

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'email',
            'direction' => 'inbound',
            'content' => ($data['subject'] ?? '')."\n\n".$data['body'],
            'sent_by' => 'lead',
            'status' => 'received',
        ]);

        ProcessLeadWithAgent::dispatch($lead->id, [
            'trigger' => 'inbound_email',
            'inbound_message' => $data['body'],
        ]);

        return response()->json(['ok' => true]);
    }

    private function validSecret(Request $request): bool
    {
        $expected = config('services.openclaw.webhook_secret');
        if (! is_string($expected) || $expected === '') {
            return false;
        }

        $got = $request->header('X-OpenClaw-Secret');

        return is_string($got) && hash_equals($expected, $got);
    }
}
