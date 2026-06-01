<?php

return [

    'support_email' => env('VELORA_SUPPORT_EMAIL', 'soporte@velora.guatemalia.com'),

    'whatsapp' => env('VELORA_WHATSAPP'),

    'calendly_url' => env(
        'VELORA_CALENDLY_URL',
        'https://calendly.com/ownstrpk4/free-consultation',
    ),

    'trial_days' => (int) env('VELORA_TRIAL_DAYS', 7),

];
