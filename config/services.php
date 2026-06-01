<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'organization' => env('OPENAI_ORGANIZATION'),
    ],

    'openclaw' => [
        'gateway_url' => env('OPENCLAW_GATEWAY_URL'),
        /** Bearer hacia el gateway; muchas instalaciones usan OPENCLAW_GATEWAY_TOKEN. */
        'api_key' => env('OPENCLAW_API_KEY') ?: env('OPENCLAW_GATEWAY_TOKEN'),
        'scraping_agent_id' => env('OPENCLAW_SCRAPING_AGENT_ID'),
        /** Alleria en openclaw.json suele ser id `main`. */
        'alleria_agent_id' => env('OPENCLAW_ALLERIA_AGENT_ID', 'main'),
        /** Legacy / override; si vacío se usa alleria_agent_id para /agents/run. */
        'comms_agent_id' => env('OPENCLAW_COMMS_AGENT_ID'),
        /**
         * Opcional: cabecera x-openclaw-agent-id (ej. amo) si tu gateway exige contexto amo para envíos.
         * Déjalo vacío si Alleria (main) responde solo con el token de operador.
         */
        'comms_owner_agent_id' => env('OPENCLAW_COMMS_OWNER_AGENT_ID'),
        /** Slug del agente en OpenClaw (ej. lina, main). Ver modelo openclaw/&lt;slug&gt; en la doc del gateway. */
        'lina_agent_id' => env('OPENCLAW_LINA_AGENT_ID'),
        'fernando_agent_id' => env('OPENCLAW_FERNANDO_AGENT_ID', 'fernando'),
        'invoker_agent_id' => env('OPENCLAW_INVOKER_AGENT_ID', 'invoker'),
        /** Si no hay Lina ni scraping, se usa este slug (por defecto el agente default del gateway). */
        'default_agent_id' => env('OPENCLAW_DEFAULT_AGENT_ID', 'default'),
        'webhook_secret' => env('OPENCLAW_WEBHOOK_SECRET'),
        /** Timeout HTTP hacia el gateway (segundos). Jobs largos: 600–900. */
        'http_timeout_seconds' => (int) env('OPENCLAW_HTTP_TIMEOUT_SECONDS', 120),
    ],

    'mcp' => [
        'token' => env('MCP_SERVICE_TOKEN'),
    ],

];
