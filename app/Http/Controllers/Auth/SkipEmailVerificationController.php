<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SkipEmailVerificationController extends Controller
{
    /**
     * Testing only: mark the current user as verified and continue to the CRM.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        if (! config('velora.allow_skip_email_verification')) {
            abort(403, 'Email verification skip is disabled.');
        }

        $user = $request->user();
        if ($user === null) {
            return redirect()->route('login');
        }

        $updates = [];
        if ($user->email_verified_at === null) {
            $updates['email_verified_at'] = now();
        }
        if (! $user->hasActiveSubscription()) {
            $updates['subscription_status'] = 'trial';
            $updates['trial_ends_at'] = now()->addDays(config('velora.trial_days', 7));
        }
        if ($updates !== []) {
            $user->forceFill($updates)->save();
        }

        if ($user->isVeloraAdmin()) {
            return redirect()->intended(route('admins.invoker'));
        }

        return redirect()->intended(route('dashboard'));
    }
}
