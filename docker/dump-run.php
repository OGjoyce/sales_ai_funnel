<?php

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$r = App\Models\LinaGenerationRun::query()->find($argv[1] ?? '');
echo json_encode([
    'status' => $r?->status,
    'leads_created' => $r?->leads_created,
    'payload' => $r?->payload,
], JSON_UNESCAPED_UNICODE).PHP_EOL;
