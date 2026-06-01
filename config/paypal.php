<?php

return [

    'mode' => env('PAYPAL_MODE', 'sandbox'),

    'client_id' => env('PAYPAL_CLIENT_ID'),

    'client_secret' => env('PAYPAL_CLIENT_SECRET'),

    /** Plan ID from PayPal Dashboard → Subscriptions (e.g. P-xxxxxxxx) */
    'plan_id' => env('PAYPAL_PLAN_ID'),

    /** Webhook ID from PayPal Developer → Webhooks (for signature verification) */
    'webhook_id' => env('PAYPAL_WEBHOOK_ID'),

    'plan_label' => env('PAYPAL_PLAN_LABEL', 'Velora Pro'),

    'plan_price' => env('PAYPAL_PLAN_PRICE', '500'),

    'currency' => env('PAYPAL_CURRENCY', 'USD'),

];
