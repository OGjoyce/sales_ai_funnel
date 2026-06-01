<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Http::fake([
        '*/v1/chat/completions' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Diagnóstico listo. Sin cambios pendientes.',
                    ],
                ],
            ],
        ], 200),
    ]);

    config([
        'services.openclaw.gateway_url' => 'http://openclaw.test',
        'services.openclaw.api_key' => 'test-token',
        'services.openclaw.invoker_agent_id' => 'invoker',
    ]);
});

test('invoker admin routes require authentication', function () {
    $this->postJson('/api/admins/invoker/chat', [
        'message' => 'Hola',
    ])->assertUnauthorized();
});

test('non-admin cannot access invoker api', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->postJson('/api/admins/invoker/chat', ['message' => 'Hola'])
        ->assertForbidden();
});

test('admin can chat with invoker', function () {
    $admin = User::factory()->create([
        'is_admin' => true,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($admin)
        ->postJson('/api/admins/invoker/chat', ['message' => 'Estado del CRM'])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('reply', 'Diagnóstico listo. Sin cambios pendientes.');
});

test('admin can load invoker channel and logs', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->getJson('/api/admins/invoker/channel')
        ->assertOk()
        ->assertJsonPath('channel', 'velora-admins');

    $this->actingAs($admin)
        ->getJson('/api/admins/invoker/logs')
        ->assertOk()
        ->assertJsonStructure(['laravel', 'agent_logs', 'lina_runs']);
});

test('admin can open invoker page', function () {
    $admin = User::factory()->create([
        'is_admin' => true,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/admins/invoker')
        ->assertOk();
});

test('non-admin cannot open admins pages', function () {
    $user = User::factory()->create([
        'is_admin' => false,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->get('/admins/invoker')
        ->assertForbidden();
});
