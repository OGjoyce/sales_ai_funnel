<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessLeadWithAgent;
use App\Jobs\RunLinaLeadGenerationJob;
use App\Jobs\ScrapeLeadsJob;
use App\Models\FunnelStage;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\LinaGenerationRun;
use App\Services\OpenClawGateway;
use App\Services\OutboundMessageRefinementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LeadController extends Controller
{
    public function index(): JsonResponse
    {
        $leads = Lead::query()
            ->with('funnelStage')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['leads' => $leads]);
    }

    public function show(Lead $lead): JsonResponse
    {
        $lead->load(['funnelStage', 'interactions', 'proposals', 'agentLogs']);

        return response()->json(['lead' => $lead]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'company' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'linkedin_url' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:32',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'notes' => 'nullable|string',
        ]);

        if (empty($data['funnel_stage_id'])) {
            $data['funnel_stage_id'] = FunnelStage::query()->orderBy('sort_order')->value('id');
        }

        $data['source'] = $data['source'] ?? 'manual';

        $lead = Lead::create($data);

        return response()->json(['lead' => $lead->load('funnelStage')], 201);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'company' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'linkedin_url' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:32',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'score' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        $lead->update($data);

        return response()->json(['lead' => $lead->fresh()->load('funnelStage')]);
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return response()->json(['ok' => true]);
    }

    public function updateStage(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'funnel_stage_id' => 'required|exists:funnel_stages,id',
            'reason' => 'nullable|string|max:500',
            'run_agent' => 'nullable|boolean',
        ]);

        $prev = $lead->funnel_stage_id;
        $lead->funnel_stage_id = (int) $data['funnel_stage_id'];
        $lead->save();

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'stage_change',
            'direction' => 'outbound',
            'content' => 'Stage changed'.(isset($data['reason']) ? ': '.$data['reason'] : ''),
            'sent_by' => 'human',
            'status' => 'ok',
            'metadata' => ['from_stage_id' => $prev, 'to_stage_id' => $lead->funnel_stage_id],
        ]);

        if ($request->boolean('run_agent')) {
            ProcessLeadWithAgent::dispatch($lead->id, ['trigger' => 'stage_changed']);
        }

        return response()->json(['lead' => $lead->fresh()->load('funnelStage')]);
    }

    public function scrape(Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => 'required|string|max:500',
            'max' => 'nullable|integer|min:1|max:10',
        ]);

        ScrapeLeadsJob::dispatch($data['query'], (int) ($data['max'] ?? 10));

        return response()->json(['queued' => true]);
    }

    public function linaGenerate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sector' => 'required|string|max:500',
            'product_ids' => 'nullable|array|max:50',
            'product_ids.*' => 'integer|exists:products,id',
            'product_notes' => 'nullable|string|max:2000',
            'channels' => 'required|array',
            'channels.whatsapp' => 'sometimes|boolean',
            'channels.email' => 'sometimes|boolean',
            'channels.website' => 'sometimes|boolean',
            'channels.gmail' => 'sometimes|boolean',
        ]);

        $channels = array_merge(
            [
                'whatsapp' => false,
                'email' => false,
                'website' => false,
                'gmail' => false,
            ],
            $data['channels'],
        );

        $run = LinaGenerationRun::query()->create([
            'user_id' => (int) $request->user()->id,
            'status' => 'pending',
            'payload' => [
                'sector' => $data['sector'],
                'product_ids' => $data['product_ids'] ?? [],
                'product_notes' => $data['product_notes'] ?? null,
                'channels' => $channels,
            ],
        ]);

        RunLinaLeadGenerationJob::dispatch($run->id);

        return response()->json([
            'job_id' => $run->id,
            'status' => 'queued',
        ], 202);
    }

    public function linaStatus(Request $request, LinaGenerationRun $linaGenerationRun): JsonResponse
    {
        if ((int) $linaGenerationRun->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $payload = $linaGenerationRun->payload;
        $leadsFound = is_array($payload) && isset($payload['leads_found'])
            ? (int) $payload['leads_found']
            : null;

        return response()->json([
            'status' => $linaGenerationRun->status,
            'instruction_sent_to_lina' => $linaGenerationRun->instruction_sent_to_lina,
            'leads_created' => $linaGenerationRun->leads_created ?? [],
            'leads_found' => $leadsFound,
            'error' => $linaGenerationRun->error,
            'mock' => $linaGenerationRun->mock,
        ]);
    }

    public function sendWhatsapp(
        Request $request,
        Lead $lead,
        OpenClawGateway $gateway,
        OutboundMessageRefinementService $refiner,
    ): JsonResponse {
        $data = $request->validate([
            'message' => 'required|string|max:8000',
            'phone' => 'nullable|string|max:64',
            'refine_with_ai' => 'nullable|boolean',
        ]);

        $phone = isset($data['phone']) && is_string($data['phone']) && trim($data['phone']) !== ''
            ? trim($data['phone'])
            : trim((string) ($lead->phone ?? ''));

        if ($phone === '') {
            return response()->json([
                'error' => 'Indica un número de teléfono o guárdalo en el lead.',
            ], 422);
        }

        $originalMessage = $data['message'];
        $message = $originalMessage;
        $refinedWithAi = false;

        if ($request->boolean('refine_with_ai')) {
            if (! filled(config('openai.api_key'))) {
                return response()->json([
                    'error' => 'Configura OPENAI_API_KEY para mejorar el texto con IA antes de enviar.',
                ], 422);
            }
            $message = Str::limit($refiner->refineForWhatsapp($originalMessage, $lead), 8000, '');
            $refinedWithAi = true;
        }

        $result = $gateway->callCommunicationAgent(
            'whatsapp',
            $phone,
            $message,
            null,
            $lead->id,
        );

        $meta = array_merge($result, [
            'refined_with_ai' => $refinedWithAi,
            'original_message' => $refinedWithAi ? $originalMessage : null,
        ]);

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'whatsapp',
            'direction' => 'outbound',
            'content' => $message,
            'sent_by' => 'human',
            'status' => ($result['success'] ?? false) ? 'sent' : 'failed',
            'metadata' => $meta,
        ]);

        if (! ($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'No se pudo enviar por WhatsApp.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'assistant_reply' => $result['assistant_reply'] ?? null,
            'mock' => $result['mock'] ?? false,
            'refined_with_ai' => $refinedWithAi,
            'sent_message' => $message,
            'original_message' => $refinedWithAi ? $originalMessage : null,
        ]);
    }

    public function sendEmail(
        Request $request,
        Lead $lead,
        OpenClawGateway $gateway,
        OutboundMessageRefinementService $refiner,
    ): JsonResponse {
        $data = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:16000',
            'to' => 'nullable|email|max:255',
            'refine_with_ai' => 'nullable|boolean',
        ]);

        $to = isset($data['to']) && is_string($data['to']) && trim($data['to']) !== ''
            ? trim($data['to'])
            : trim((string) ($lead->email ?? ''));

        if ($to === '') {
            return response()->json([
                'error' => 'Indica un correo o guárdalo en el lead.',
            ], 422);
        }

        $originalSubject = $data['subject'];
        $originalBody = $data['body'];
        $subject = $originalSubject;
        $body = $originalBody;
        $refinedWithAi = false;

        if ($request->boolean('refine_with_ai')) {
            if (! filled(config('openai.api_key'))) {
                return response()->json([
                    'error' => 'Configura OPENAI_API_KEY para mejorar el texto con IA antes de enviar.',
                ], 422);
            }
            $refined = $refiner->refineForEmail($originalSubject, $originalBody, $lead);
            $subject = Str::limit($refined['subject'], 255, '');
            $body = Str::limit($refined['body'], 16000, '');
            $refinedWithAi = true;
        }

        $result = $gateway->callCommunicationAgent(
            'email',
            $to,
            $body,
            $subject,
            $lead->id,
        );

        $meta = array_merge($result, [
            'refined_with_ai' => $refinedWithAi,
            'original_subject' => $refinedWithAi ? $originalSubject : null,
            'original_body' => $refinedWithAi ? $originalBody : null,
        ]);

        Interaction::create([
            'lead_id' => $lead->id,
            'type' => 'email',
            'direction' => 'outbound',
            'content' => $subject."\n\n".$body,
            'sent_by' => 'human',
            'status' => ($result['success'] ?? false) ? 'sent' : 'failed',
            'metadata' => $meta,
        ]);

        if (! ($result['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'No se pudo enviar el correo.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'assistant_reply' => $result['assistant_reply'] ?? null,
            'mock' => $result['mock'] ?? false,
            'refined_with_ai' => $refinedWithAi,
            'sent_subject' => $subject,
            'sent_body' => $body,
            'original_subject' => $refinedWithAi ? $originalSubject : null,
            'original_body' => $refinedWithAi ? $originalBody : null,
        ]);
    }
}
