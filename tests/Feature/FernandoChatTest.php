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
                        'content' => 'Hola, soy Fernando. Puedo ayudarte con Velora.',
                    ],
                ],
            ],
        ], 200),
    ]);

    config([
        'services.openclaw.gateway_url' => 'http://openclaw.test',
        'services.openclaw.api_key' => 'test-token',
        'services.openclaw.fernando_agent_id' => 'fernando',
    ]);
});

test('fernando chat requires authentication', function () {
    $this->postJson('/api/fernando/chat', [
        'messages' => [['role' => 'user', 'content' => 'Hola']],
    ])->assertUnauthorized();
});

test('authenticated user can chat with fernando', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/fernando/chat', [
        'messages' => [['role' => 'user', 'content' => '¿Cómo uso el kanban?']],
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('reply', 'Hola, soy Fernando. Puedo ayudarte con Velora.');
});

test('fernando status is reachable when authenticated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/fernando/status')
        ->assertOk()
        ->assertJsonPath('fernando_agent_id', 'fernando');
});
