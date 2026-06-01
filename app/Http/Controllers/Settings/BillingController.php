<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function edit(): Response
    {
        $user = request()->user();

        return Inertia::render('settings/billing', [
            'supportEmail' => config('velora.support_email'),
            'calendlyUrl' => config('velora.calendly_url'),
            'whatsapp' => config('velora.whatsapp'),
            'subscriptionStatus' => $user?->subscription_status ?? 'unknown',
            'trialEndsAt' => $user?->trial_ends_at?->toDateString(),
        ]);
    }
}
