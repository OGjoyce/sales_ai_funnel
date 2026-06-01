<?php

use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

test('welcome notification is sent once after email verification', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create([
        'welcomed_at' => null,
    ]);

    Event::dispatch(new Verified($user));

    Notification::assertSentTo($user, WelcomeNotification::class);

    expect($user->fresh()->welcomed_at)->not->toBeNull();
});

test('welcome notification is not sent twice', function () {
    Notification::fake();

    $user = User::factory()->create([
        'welcomed_at' => now(),
    ]);

    Event::dispatch(new Verified($user));

    Notification::assertNothingSent();
});
