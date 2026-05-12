<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class IntegrationController extends Controller
{
    /**
     * Estado de integraciones (sin exponer secretos).
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'openai_configured' => filled(config('openai.api_key')),
            'openclaw_configured' => filled(config('services.openclaw.gateway_url')),
        ]);
    }
}
