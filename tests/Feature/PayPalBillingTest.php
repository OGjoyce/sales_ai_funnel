<?php

use App\Models\User;
use App\Services\PayPalSubscriptionService;
use Illuminate\Support\Facades\Http;

test('billing page shows paypal button when configured', function () {
    config([
        'paypal.client_id' => 'test-client',
        'paypal.client_secret' => 'test-secret',
        'paypal.plan_id' => 'P-TESTPLAN',
    ]);

    $user = User::factory()->create([
        'subscription_status' => 'trial',
        'trial_ends_at' => now()->subDay(),
    ]);

    $this->actingAs($user)
        ->get(route('billing'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('billing')
            ->where('paypalConfigured', true)
            ->where('isOnTrial', false)
            ->where('hasActivePlan', false));
});

test('subscribe redirects to paypal approval url', function () {
    Http::fake([
        '*/v1/oauth2/token' => Http::response(['access_token' => 'tok', 'expires_in' => 3600]),
        '*/v1/billing/subscriptions' => Http::response([
            'id' => 'I-TESTSUB',
            'status' => 'APPROVAL_PENDING',
            'links' => [
                ['rel' => 'approve', 'href' => 'https://paypal.test/approve'],
            ],
        ], 201),
    ]);

    config([
        'paypal.client_id' => 'test-client',
        'paypal.client_secret' => 'test-secret',
        'paypal.plan_id' => 'P-TESTPLAN',
    ]);

    $user = User::factory()->expiredTrial()->create();

    $this->actingAs($user)
        ->post(route('billing.paypal.subscribe'))
        ->assertRedirect('https://paypal.test/approve');

    expect($user->fresh()->paypal_subscription_id)->toBe('I-TESTSUB');
});

test('paypal return activates subscription when status is active', function () {
    Http::fake([
        '*/v1/oauth2/token' => Http::response(['access_token' => 'tok', 'expires_in' => 3600]),
        '*/v1/billing/subscriptions/I-ACTIVE' => Http::response([
            'id' => 'I-ACTIVE',
            'status' => 'ACTIVE',
        ]),
    ]);

    config([
        'paypal.client_id' => 'test-client',
        'paypal.client_secret' => 'test-secret',
        'paypal.plan_id' => 'P-TESTPLAN',
    ]);

    $user = User::factory()->expiredTrial()->create([
        'paypal_subscription_id' => 'I-ACTIVE',
    ]);

    $this->actingAs($user)
        ->get(route('billing.paypal.return', ['subscription_id' => 'I-ACTIVE']))
        ->assertRedirect(route('dashboard'));

    $user->refresh();
    expect($user->subscription_status)->toBe('active')
        ->and($user->hasActiveSubscription())->toBeTrue();
});

test('webhook activation marks user active', function () {
    $user = User::factory()->expiredTrial()->create([
        'paypal_subscription_id' => 'I-WH',
    ]);

    app(PayPalSubscriptionService::class)->handleWebhookEvent(
        'BILLING.SUBSCRIPTION.ACTIVATED',
        ['resource' => ['id' => 'I-WH']],
    );

    expect($user->fresh()->subscription_status)->toBe('active');
});
