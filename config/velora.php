<?php

/**
 * Velora app config. Testing toggles below — edit in code, not .env.
 *
 * Agent sharing model:
 * - Lina (shared): prospection; leads tagged with user_id.
 * - Fernando (shared): public sales chat on landing; no per-user CRM data.
 * - Invoker (admin): CRM-wide operator tools.
 * - Personal trained agent: per-user products, leads, agent KB; MCP requires X-Velora-User-Id.
 */
$testingAllowSkipEmailVerification = true;

/** @var list<string> */
$testingAdminEmails = [
    'test@example.com',
    // Add your login email here for /admins and Invoker:
    // 'you@company.com',
];

return [

    'support_email' => env('VELORA_SUPPORT_EMAIL', 'soporte@velora.guatemalia.com'),

    'whatsapp' => env('VELORA_WHATSAPP'),

    'calendly_url' => env(
        'VELORA_CALENDLY_URL',
        'https://calendly.com/ownstrpk4/free-consultation',
    ),

    'trial_days' => (int) env('VELORA_TRIAL_DAYS', 7),

    'allow_skip_email_verification' => $testingAllowSkipEmailVerification,

    'admin_emails' => array_values(array_filter(array_map(
        'trim',
        $testingAdminEmails,
    ))),

];
