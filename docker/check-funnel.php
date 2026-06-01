<?php

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$stages = App\Models\FunnelStage::query()->orderBy('sort_order')->withCount('leads')->get();
echo 'stages='.$stages->count().' leads='.App\Models\Lead::count().PHP_EOL;
foreach ($stages as $s) {
    echo $s->id.' '.$s->name.' leads='.$s->leads_count.PHP_EOL;
}

$ctrl = app(App\Http\Controllers\Api\FunnelController::class);
$json = $ctrl->index()->getData(true);
echo 'api_stages='.count($json['stages'] ?? []).PHP_EOL;
echo 'json_bytes='.strlen(json_encode($json)).PHP_EOL;
