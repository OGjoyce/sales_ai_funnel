<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Services\PayPalSubscriptionService;

trait SharesBillingPageData
{
    /**
     * @return array<string, mixed>
     */
    protected function billingPageProps(?User $user): array
    {
        $paypal = app(PayPalSubscriptionService::class);

        return [
            'supportEmail' => config('velora.support_email'),
            'calendlyUrl' => config('velora.calendly_url'),
            'whatsapp' => config('velora.whatsapp'),
            'subscriptionStatus' => $user?->subscription_status ?? 'unknown',
            'trialEndsAt' => $user?->trial_ends_at?->toDateString(),
            'trialDaysRemaining' => $user?->trialDaysRemaining(),
            'isOnTrial' => $user?->isOnTrial() ?? false,
            /** Paid subscription (not trial / comped). */
            'hasPaidPlan' => $user !== null && $user->subscription_status === 'active',
            'hasAccess' => $user?->hasActiveSubscription() ?? false,
            'trialDays' => (int) config('velora.trial_days', 7),
            'planName' => config('velora.plan_name'),
            'paypalConfigured' => $paypal->isConfigured(),
            'paypalClientId' => config('paypal.client_id'),
            'planLabel' => config('paypal.plan_label'),
            'planPrice' => config('paypal.plan_price'),
            'planCurrency' => config('paypal.currency'),
            'subscribeUrl' => route('billing.paypal.subscribe'),
        ];
    }
}
