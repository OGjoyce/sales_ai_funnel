<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayPalSubscriptionService
{
    public function isConfigured(): bool
    {
        return filled(config('paypal.client_id'))
            && filled(config('paypal.client_secret'))
            && filled(config('paypal.plan_id'));
    }

    public function apiBase(): string
    {
        return config('paypal.mode') === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    /**
     * @return array{subscription_id: string, approval_url: string}
     */
    public function createSubscription(User $user): array
    {
        $token = $this->accessToken();
        $returnUrl = route('billing.paypal.return');
        $cancelUrl = route('billing.paypal.cancel');

        $response = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->post($this->apiBase().'/v1/billing/subscriptions', [
                'plan_id' => config('paypal.plan_id'),
                'custom_id' => 'velora_user_'.$user->id,
                'application_context' => [
                    'brand_name' => config('app.name', 'Velora'),
                    'locale' => 'es-GT',
                    'shipping_preference' => 'NO_SHIPPING',
                    'user_action' => 'SUBSCRIBE_NOW',
                    'return_url' => $returnUrl,
                    'cancel_url' => $cancelUrl,
                ],
            ])
            ->throw();

        $body = $response->json();
        $subscriptionId = (string) ($body['id'] ?? '');
        $approvalUrl = $this->extractLink($body['links'] ?? [], 'approve');

        if ($subscriptionId === '' || $approvalUrl === '') {
            throw new \RuntimeException('PayPal no devolvió enlace de aprobación.');
        }

        $user->forceFill(['paypal_subscription_id' => $subscriptionId])->save();

        return [
            'subscription_id' => $subscriptionId,
            'approval_url' => $approvalUrl,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getSubscription(string $subscriptionId): array
    {
        $token = $this->accessToken();

        $response = Http::withToken($token)
            ->acceptJson()
            ->get($this->apiBase().'/v1/billing/subscriptions/'.urlencode($subscriptionId))
            ->throw();

        return $response->json();
    }

    public function syncUserFromSubscription(User $user, ?array $subscription = null): bool
    {
        $subscriptionId = $user->paypal_subscription_id;
        if ($subscriptionId === null || $subscriptionId === '') {
            return false;
        }

        try {
            $subscription ??= $this->getSubscription($subscriptionId);
        } catch (RequestException $e) {
            Log::warning('PayPal: no se pudo leer suscripción', [
                'user_id' => $user->id,
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        $status = strtoupper((string) ($subscription['status'] ?? ''));

        if (in_array($status, ['ACTIVE', 'APPROVED'], true)) {
            $user->forceFill([
                'subscription_status' => 'active',
                'trial_ends_at' => null,
                'subscription_ends_at' => null,
            ])->save();

            return true;
        }

        if (in_array($status, ['CANCELLED', 'EXPIRED', 'SUSPENDED'], true)) {
            $user->forceFill([
                'subscription_status' => 'expired',
                'subscription_ends_at' => now(),
            ])->save();

            return false;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleWebhookEvent(string $eventType, array $payload): void
    {
        $resource = $payload['resource'] ?? [];
        if (! is_array($resource)) {
            return;
        }

        $subscriptionId = (string) ($resource['id'] ?? $resource['billing_agreement_id'] ?? '');
        if ($subscriptionId === '') {
            return;
        }

        $user = User::query()->where('paypal_subscription_id', $subscriptionId)->first();
        if ($user === null) {
            $customId = (string) ($resource['custom_id'] ?? '');
            if (preg_match('/velora_user_(\d+)/', $customId, $m)) {
                $user = User::query()->find((int) $m[1]);
                if ($user !== null) {
                    $user->forceFill(['paypal_subscription_id' => $subscriptionId])->save();
                }
            }
        }

        if ($user === null) {
            return;
        }

        match ($eventType) {
            'BILLING.SUBSCRIPTION.ACTIVATED',
            'BILLING.SUBSCRIPTION.RE-ACTIVATED' => $user->forceFill([
                'subscription_status' => 'active',
                'trial_ends_at' => null,
                'subscription_ends_at' => null,
            ])->save(),
            'BILLING.SUBSCRIPTION.CANCELLED',
            'BILLING.SUBSCRIPTION.EXPIRED',
            'BILLING.SUBSCRIPTION.SUSPENDED' => $user->forceFill([
                'subscription_status' => 'expired',
                'subscription_ends_at' => now(),
            ])->save(),
            default => null,
        };
    }

    public function verifyWebhookSignature(
        string $transmissionId,
        string $timestamp,
        string $webhookId,
        string $eventBody,
        string $signature,
        string $certUrl,
        string $authAlgo,
    ): bool {
        if (! filled(config('paypal.webhook_id'))) {
            return false;
        }

        try {
            $token = $this->accessToken();
            $response = Http::withToken($token)
                ->acceptJson()
                ->asJson()
                ->post($this->apiBase().'/v1/notifications/verify-webhook-signature', [
                    'transmission_id' => $transmissionId,
                    'transmission_time' => $timestamp,
                    'cert_url' => $certUrl,
                    'auth_algo' => $authAlgo,
                    'transmission_sig' => $signature,
                    'webhook_id' => $webhookId,
                    'webhook_event' => json_decode($eventBody, true, 512, JSON_THROW_ON_ERROR),
                ])
                ->throw();

            return ($response->json('verification_status') ?? '') === 'SUCCESS';
        } catch (\Throwable $e) {
            Log::warning('PayPal webhook verification failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function accessToken(): string
    {
        $cacheKey = 'paypal_access_token_'.config('paypal.mode');

        return Cache::remember($cacheKey, 3000, function () {
            $clientId = config('paypal.client_id');
            $secret = config('paypal.client_secret');

            $response = Http::asForm()
                ->withBasicAuth($clientId, $secret)
                ->post($this->apiBase().'/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ])
                ->throw();

            return (string) $response->json('access_token');
        });
    }

    /**
     * @param  list<array{rel?: string, href?: string}>  $links
     */
    private function extractLink(array $links, string $rel): string
    {
        foreach ($links as $link) {
            if (($link['rel'] ?? '') === $rel && filled($link['href'] ?? null)) {
                return (string) $link['href'];
            }
        }

        return '';
    }
}
