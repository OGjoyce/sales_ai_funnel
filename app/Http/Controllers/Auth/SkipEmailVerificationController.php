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

        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return redirect()->intended(route('crm.help'));
    }
}
