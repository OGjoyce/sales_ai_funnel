<?php

use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());
    config(['velora.allow_skip_email_verification' => true]);
});

test('unverified user can skip to dashboard with trial', function () {
    $user = User::factory()->unverified()->create([
        'subscription_status' => null,
        'trial_ends_at' => null,
    ]);

    $this->actingAs($user)
        ->post(route('verification.skip'))
        ->assertRedirect(route('dashboard', absolute: false));

    $user->refresh();
    expect($user->hasVerifiedEmail())->toBeTrue()
        ->and($user->subscription_status)->toBe('trial')
        ->and($user->trial_ends_at)->not->toBeNull();
});

test('admin skip goes to invoker', function () {
    $user = User::factory()->unverified()->create([
        'is_admin' => true,
        'subscription_status' => 'comped',
    ]);

    $this->actingAs($user)
        ->post(route('verification.skip'))
        ->assertRedirect(route('admins.invoker', absolute: false));
});

test('skip is forbidden when disabled', function () {
    config(['velora.allow_skip_email_verification' => false]);
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->post(route('verification.skip'))
        ->assertForbidden();
});
