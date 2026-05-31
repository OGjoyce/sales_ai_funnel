<?php

require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$result = app(\App\Services\OpenClawGateway::class)->callLinaAgent('Responde solo JSON: {"leads":[]}', 1);
echo json_encode($result, JSON_UNESCAPED_UNICODE).PHP_EOL;
