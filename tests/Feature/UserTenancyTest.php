<?php

use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\Product;
use App\Models\User;
use App\Services\LinaLeadGenerationService;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    FunnelStage::query()->create([
        'name' => 'Nuevo',
        'sort_order' => 1,
        'color_token' => 'neutral',
    ]);
});

test('users only see their own leads in index', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $stageId = FunnelStage::query()->value('id');

    Lead::query()->create([
        'user_id' => $a->id,
        'funnel_stage_id' => $stageId,
        'name' => 'Lead A',
        'email' => 'a@example.com',
    ]);
    Lead::query()->create([
        'user_id' => $b->id,
        'funnel_stage_id' => $stageId,
        'name' => 'Lead B',
        'email' => 'b@example.com',
    ]);

    $response = $this->actingAs($a)->getJson('/api/leads');

    $response->assertOk();
    expect($response->json('leads'))->toHaveCount(1)
        ->and($response->json('leads.0.email'))->toBe('a@example.com');
});

test('user cannot show another users lead', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $stageId = FunnelStage::query()->value('id');

    $lead = Lead::query()->create([
        'user_id' => $a->id,
        'funnel_stage_id' => $stageId,
        'name' => 'Private',
        'email' => 'private@example.com',
    ]);

    $this->actingAs($b)
        ->getJson('/api/leads/'.$lead->id)
        ->assertNotFound();
});

test('users only see their own products', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();

    Product::query()->create([
        'user_id' => $a->id,
        'title' => 'Product A',
        'code' => 'A1',
        'price' => 10,
    ]);
    Product::query()->create([
        'user_id' => $b->id,
        'title' => 'Product B',
        'code' => 'B1',
        'price' => 20,
    ]);

    $response = $this->actingAs($a)->getJson('/api/products');

    $response->assertOk();
    expect($response->json('products'))->toHaveCount(1)
        ->and($response->json('products.0.code'))->toBe('A1');
});

test('lina persist leads assigns user_id', function () {
    Http::fake([
        '*/v1/chat/completions' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => '{"leads":[{"name":"Lina Lead","email":"lina-lead@example.com","company":"Acme"}]}',
                    ],
                ],
            ],
        ], 200),
    ]);

    config([
        'services.openclaw.gateway_url' => 'http://openclaw.test',
        'services.openclaw.api_key' => 'test-token',
    ]);

    $user = User::factory()->create();
    $service = app(LinaLeadGenerationService::class);

    $result = $service->run(
        [
            'sector' => 'Guatemala',
            'channels' => [
                'whatsapp' => true,
                'email' => false,
                'website' => false,
                'gmail' => false,
            ],
        ],
        $user->id,
        '00000000-0000-0000-0000-000000000099',
    );

    expect($result['success'])->toBeTrue()
        ->and($result['leads_created'])->not->toBeEmpty();

    $lead = Lead::query()->find($result['leads_created'][0]);
    expect($lead)->not->toBeNull()
        ->and($lead->user_id)->toBe($user->id)
        ->and($lead->source)->toBe('lina');
});

test('mcp service products require user id header', function () {
    $user = User::factory()->create();
    Product::query()->create([
        'user_id' => $user->id,
        'title' => 'MCP Product',
        'code' => 'MCP1',
        'price' => 99,
        'active' => true,
    ]);

    config(['services.mcp.token' => 'test-mcp-token']);

    $this->getJson('/api/service/products?search=MCP', [
        'Authorization' => 'Bearer test-mcp-token',
    ])->assertStatus(422);

    $response = $this->getJson('/api/service/products?search=MCP', [
        'Authorization' => 'Bearer test-mcp-token',
        'X-Velora-User-Id' => (string) $user->id,
    ]);

    $response->assertOk()
        ->assertJsonPath('products.0.code', 'MCP1');
});
