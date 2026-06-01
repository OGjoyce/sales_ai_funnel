<?php

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$id = $argv[1] ?? '';
$run = App\Models\LinaGenerationRun::query()->find($id);
if ($run === null) {
    echo json_encode(['error' => 'run not found']).PHP_EOL;
    exit(1);
}

$run->forceFill([
    'status' => 'pending',
    'error' => null,
    'leads_created' => null,
    'instruction_sent_to_lina' => null,
    'mock' => null,
])->save();

$job = new App\Jobs\RunLinaLeadGenerationJob($run->id);
$job->handle(app(App\Services\LinaLeadGenerationService::class));

$run->refresh();
echo json_encode($run->only([
    'id', 'status', 'leads_created', 'error', 'mock', 'instruction_sent_to_lina',
]), JSON_UNESCAPED_UNICODE).PHP_EOL;
