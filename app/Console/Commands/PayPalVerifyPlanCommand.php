<?php

namespace App\Console\Commands;

use App\Services\PayPalSubscriptionService;
use Illuminate\Console\Command;

class PayPalVerifyPlanCommand extends Command
{
    protected $signature = 'velora:paypal-verify';

    protected $description = 'Comprueba que PAYPAL_PLAN_ID existe en el modo (sandbox/live) configurado';

    public function handle(PayPalSubscriptionService $paypal): int
    {
        $result = $paypal->verifyPlan();

        $this->line('Modo: '.$result['mode']);
        $this->line('Plan: '.$result['plan_id']);

        if ($result['ok']) {
            $this->info('OK — plan encontrado: '.($result['name'] ?? '').' ['.($result['status'] ?? '').']');

            return self::SUCCESS;
        }

        $this->error($result['error'] ?? 'Error desconocido');

        return self::FAILURE;
    }
}
