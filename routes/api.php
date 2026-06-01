<?php

use App\Http\Controllers\Api\Admin\InvokerController;
use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\AgentKbController;
use App\Http\Controllers\Api\AgentKbQueryController;
use App\Http\Controllers\Api\AgentPlaygroundController;
use App\Http\Controllers\Api\FernandoController;
use App\Http\Controllers\Api\FunnelController;
use App\Http\Controllers\Api\IntegrationController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\MetricsController;
use App\Http\Controllers\Api\OpenClawController;
use App\Http\Controllers\Api\OpenClawWebhookController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ServiceMcpController;
use App\Http\Middleware\VerifyServiceToken;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::post('/webhooks/openclaw/whatsapp', [OpenClawWebhookController::class, 'whatsapp']);
Route::post('/webhooks/openclaw/email', [OpenClawWebhookController::class, 'email']);

Route::prefix('service')->middleware([VerifyServiceToken::class])->group(function () {
    Route::get('/products', [ServiceMcpController::class, 'products']);
    Route::get('/leads/{lead}/history', [ServiceMcpController::class, 'leadHistory']);
    Route::patch('/leads/{lead}/stage', [ServiceMcpController::class, 'updateLeadStage']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/fernando/status', [FernandoController::class, 'status']);
    Route::post('/fernando/chat', [FernandoController::class, 'chat']);
});

Route::middleware(['auth:sanctum', 'velora.admin'])->prefix('admins')->group(function () {
    Route::get('/invoker/status', [InvokerController::class, 'status']);
    Route::get('/invoker/channel', [InvokerController::class, 'channel']);
    Route::post('/invoker/chat', [InvokerController::class, 'chat']);
    Route::get('/invoker/logs', [InvokerController::class, 'logs']);
});

Route::middleware(['auth:sanctum', 'subscription'])->group(function () {
    Route::get('/integrations/status', [IntegrationController::class, 'status']);
    Route::get('/openclaw/status', [OpenClawController::class, 'status']);
    Route::post('/openclaw/lina-probe', [OpenClawController::class, 'linaProbe']);

    Route::get('/funnel', [FunnelController::class, 'index']);
    Route::get('/funnel/stages', [FunnelController::class, 'stages']);

    Route::get('/leads', [LeadController::class, 'index']);
    Route::post('/leads', [LeadController::class, 'store']);
    Route::post('/leads/scrape', [LeadController::class, 'scrape']);
    Route::post('/leads/lina', [LeadController::class, 'linaGenerate']);
    Route::get('/leads/lina/{linaGenerationRun}', [LeadController::class, 'linaStatus']);
    Route::get('/leads/{lead}', [LeadController::class, 'show']);
    Route::put('/leads/{lead}', [LeadController::class, 'update']);
    Route::patch('/leads/{lead}/stage', [LeadController::class, 'updateStage']);
    Route::post('/leads/{lead}/comms/whatsapp', [LeadController::class, 'sendWhatsapp']);
    Route::post('/leads/{lead}/comms/email', [LeadController::class, 'sendEmail']);
    Route::delete('/leads/{lead}', [LeadController::class, 'destroy']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::post('/agent/run', [AgentController::class, 'run']);
    Route::post('/agent/chat', [AgentController::class, 'chat']);
    Route::get('/agent/logs', [AgentController::class, 'logs']);

    // Agent Knowledge Base (RAG) — backend only (UI can be added later)
    Route::get('/agent-kb/files', [AgentKbController::class, 'index']);
    Route::post('/agent-kb/files', [AgentKbController::class, 'upload']);
    Route::get('/agent-kb/files/{agentFile}', [AgentKbController::class, 'show']);
    Route::delete('/agent-kb/files/{agentFile}', [AgentKbController::class, 'destroy']);

    Route::post('/agent-kb/query', [AgentKbQueryController::class, 'query']);

    // Playground chat (no CRM/agent page changes required)
    Route::post('/agent-playground/chat', [AgentPlaygroundController::class, 'chat']);

    // Metrics
    Route::get('/metrics/funnel', [MetricsController::class, 'funnel']);
});
