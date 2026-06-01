<?php

namespace App\Listeners;

use App\Notifications\WelcomeNotification;
use Illuminate\Auth\Events\Verified;

class SendWelcomeNotification
{
    public function handle(Verified $event): void
    {
        $user = $event->user;

        if ($user->welcomed_at !== null) {
            return;
        }

        $user->notify(new WelcomeNotification);
        $user->forceFill(['welcomed_at' => now()])->save();
    }
}
