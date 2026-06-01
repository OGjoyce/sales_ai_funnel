<?php

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$id = $argv[1] ?? '019e8006-d902-734d-87ce-587d77ff22cf';
$run = App\Models\LinaGenerationRun::query()->find($id);

if ($run === null) {
    echo json_encode(['error' => 'not found']).PHP_EOL;
    exit(1);
}

echo json_encode($run->only([
    'id', 'status', 'leads_created', 'error', 'mock',
    'instruction_sent_to_lina', 'created_at', 'updated_at',
]), JSON_UNESCAPED_UNICODE).PHP_EOL;

echo "---recent---".PHP_EOL;
$recent = App\Models\LinaGenerationRun::query()
    ->orderByDesc('created_at')
    ->limit(5)
    ->get(['id', 'status', 'leads_created', 'created_at']);
echo json_encode($recent, JSON_UNESCAPED_UNICODE).PHP_EOL;

$gw = file_get_contents('/app/app/Services/OpenClawGateway.php');
echo 'prompt_has_browser='.(str_contains($gw, 'browser') ? 'yes' : 'no').PHP_EOL;
