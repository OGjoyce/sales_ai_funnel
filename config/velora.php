<?php

return [

    'support_email' => env('VELORA_SUPPORT_EMAIL', 'soporte@velora.guatemalia.com'),

    'whatsapp' => env('VELORA_WHATSAPP'),

    'calendly_url' => env(
        'VELORA_CALENDLY_URL',
        'https://calendly.com/ownstrpk4/free-consultation',
    ),

    'trial_days' => (int) env('VELORA_TRIAL_DAYS', 7),

    /**
     * Show "Skip verification" on /email/verify (testing / staging only).
     */
    'allow_skip_email_verification' => filter_var(
        env('VELORA_ALLOW_SKIP_EMAIL_VERIFICATION', env('APP_ENV') !== 'production'),
        FILTER_VALIDATE_BOOL,
    ),

];
