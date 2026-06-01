<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class BillingPageController extends Controller
{
    public function __invoke(): Response
    {
        $user = request()->user();

        return Inertia::render('billing', [
            'supportEmail' => config('velora.support_email'),
            'calendlyUrl' => config('velora.calendly_url'),
            'whatsapp' => config('velora.whatsapp'),
            'subscriptionStatus' => $user?->subscription_status ?? 'unknown',
            'trialEndsAt' => $user?->trial_ends_at?->toDateString(),
        ]);
    }
}
