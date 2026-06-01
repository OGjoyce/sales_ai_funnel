<?php

namespace App\Http\Controllers\PayPal;

use App\Http\Controllers\Controller;
use App\Services\PayPalSubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class PayPalWebhookController extends Controller
{
    public function __invoke(Request $request, PayPalSubscriptionService $paypal): Response
    {
        $raw = $request->getContent();
        $payload = json_decode($raw, true);

        if (! is_array($payload)) {
            return response('Invalid payload', 400);
        }

        $webhookId = config('paypal.webhook_id');
        if (filled($webhookId)) {
            $verified = $paypal->verifyWebhookSignature(
                (string) $request->header('Paypal-Transmission-Id', ''),
                (string) $request->header('Paypal-Transmission-Time', ''),
                $webhookId,
                $raw,
                (string) $request->header('Paypal-Transmission-Sig', ''),
                (string) $request->header('Paypal-Cert-Url', ''),
                (string) $request->header('Paypal-Auth-Algo', ''),
            );

            if (! $verified) {
                Log::warning('PayPal webhook rejected: invalid signature');

                return response('Invalid signature', 401);
            }
        } elseif (app()->isProduction()) {
            Log::warning('PayPal webhook rejected: PAYPAL_WEBHOOK_ID not set');

            return response('Webhook not configured', 503);
        }

        $eventType = (string) ($payload['event_type'] ?? '');
        $paypal->handleWebhookEvent($eventType, $payload);

        return response('OK', 200);
    }
}
