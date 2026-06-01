<?php

namespace App\Http\Controllers\PayPal;

use App\Http\Controllers\Controller;
use App\Services\PayPalSubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PayPalCheckoutController extends Controller
{
    public function subscribe(Request $request, PayPalSubscriptionService $paypal): RedirectResponse|Response
    {
        $user = $request->user();

        if ($user->hasActiveSubscription() && $user->subscription_status === 'active') {
            return redirect()->route('dashboard')
                ->with('status', 'Tu plan ya está activo.');
        }

        if (! $paypal->isConfigured()) {
            return redirect()->route('billing')
                ->with('error', 'PayPal no está configurado en el servidor. Contacta a soporte.');
        }

        try {
            $result = $paypal->createSubscription($user);

            return $this->redirectToExternal($request, $result['approval_url']);
        } catch (\Throwable $e) {
            Log::error('PayPal subscribe failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('billing')
                ->with('error', $paypal->humanErrorMessage($e));
        }
    }

    public function return(Request $request, PayPalSubscriptionService $paypal): RedirectResponse
    {
        $user = $request->user();
        $subscriptionId = (string) ($request->query('subscription_id') ?? $user->paypal_subscription_id ?? '');

        if ($subscriptionId !== '' && $user->paypal_subscription_id !== $subscriptionId) {
            $user->forceFill(['paypal_subscription_id' => $subscriptionId])->save();
        }

        if ($subscriptionId !== '') {
            try {
                $details = $paypal->getSubscription($subscriptionId);
                $paypal->syncUserFromSubscription($user, $details);
            } catch (\Throwable $e) {
                Log::warning('PayPal return sync failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($user->fresh()->hasActiveSubscription()) {
            return redirect()->route('dashboard')
                ->with('status', '¡Gracias! Tu suscripción Velora Pro está activa.');
        }

        return redirect()->route('billing')
            ->with('status', 'Completaste PayPal. Si el acceso no aparece en un minuto, recarga la página o contacta soporte.');
    }

    public function cancel(): RedirectResponse
    {
        return redirect()->route('billing')
            ->with('status', 'Cancelaste el pago. Puedes intentarlo de nuevo cuando quieras.');
    }

    /**
     * PayPal approval URLs must leave the SPA via full navigation, not XHR follow.
     */
    private function redirectToExternal(Request $request, string $url): RedirectResponse|Response
    {
        if ($request->header('X-Inertia')) {
            return Inertia::location($url);
        }

        return redirect()->away($url);
    }
}
