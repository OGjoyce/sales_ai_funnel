<?php

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$instruction = 'Busca empresas enterprise en zona 10 Guatemala. Prioriza WhatsApp y email corporativo. Max 3 leads verificables.';
$result = app(\App\Services\OpenClawGateway::class)->callLinaAgent($instruction, 3);

echo json_encode([
    'success' => $result['success'] ?? false,
    'count' => count($result['leads'] ?? []),
    'leads' => $result['leads'] ?? [],
    'error' => $result['error'] ?? null,
], JSON_UNESCAPED_UNICODE).PHP_EOL;
