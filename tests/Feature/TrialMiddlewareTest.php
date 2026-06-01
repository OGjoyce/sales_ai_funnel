<?php

use App\Models\User;

test('expired trial user is redirected from crm kanban to billing', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'subscription_status' => 'trial',
        'trial_ends_at' => now()->subDay(),
    ]);

    $this->actingAs($user)
        ->get(route('crm.kanban'))
        ->assertRedirect(route('billing'));
});

test('active trial user can access crm kanban', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'subscription_status' => 'trial',
        'trial_ends_at' => now()->addDays(3),
    ]);

    $this->actingAs($user)
        ->get(route('crm.kanban'))
        ->assertOk();
});

test('comped user can access funnel api', function () {
    $user = User::factory()->comped()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->getJson('/api/funnel')
        ->assertOk();
});

test('expired trial blocks funnel api with 402', function () {
    $user = User::factory()->expiredTrial()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->getJson('/api/funnel')
        ->assertStatus(402);
});
