import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Bot, Server, Webhook, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { crmFetch } from '@/lib/crm-api';
import { agent as agentRoute } from '@/routes/crm';
import { kanban as kanbanRoute } from '@/routes/crm';

type AgentLogRow = {
    id: number;
    lead_id: number | null;
    response: string | null;
    tool_calls: unknown;
    created_at: string;
};

const TOOLS_LARAVEL = [
    'get_products',
    'get_lead_history',
    'update_lead_stage',
    'qualify_lead',
    'create_proposal',
    'log_interaction',
    'scrape_leads → OpenClawGateway (scraping)',
    'send_whatsapp → OpenClawGateway (comms)',
    'send_email → OpenClawGateway (comms)',
];

export default function CrmAgentCenter() {
    const { csrf_token: csrfToken } = usePage().props;
    const [status, setStatus] = useState<{
        openai_configured: boolean;
        openclaw_configured: boolean;
    } | null>(null);
    const [logs, setLogs] = useState<AgentLogRow[]>([]);

    const load = useCallback(async () => {
        const [sRes, lRes] = await Promise.all([
            crmFetch(csrfToken, '/integrations/status', { method: 'GET' }),
            crmFetch(csrfToken, '/agent/logs', { method: 'GET' }),
        ]);

        if (sRes.ok) {
            setStatus(await sRes.json());
        }

        if (lRes.ok) {
            const d = await lRes.json();
            setLogs(d.logs ?? []);
        }
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <>
            <Head title="Centro del agente" />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">
                            Centro del agente
                        </h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Vista única para entender cómo el LLM orquesta tools
                            en Laravel y cuándo delega en OpenClaw (scraping /
                            mensajería).
                        </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={kanbanRoute.url()}>
                            <ArrowLeft className="size-4" />
                            Volver al tablero
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <Zap className="size-4 text-primary" />
                            Flujo de orquestación
                        </h2>
                        <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:flex-wrap md:items-center">
                            <span className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-medium text-primary">
                                OpenAI (GPT)
                            </span>
                            <span>→</span>
                            <span className="rounded-md border border-border bg-muted px-3 py-2 font-medium text-foreground">
                                Laravel AgentService
                            </span>
                            <span>→</span>
                            <span className="rounded-md border border-border bg-muted px-3 py-2">
                                function calling (loop)
                            </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-md border border-border bg-background/60 p-3">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <Server className="size-3.5" />
                                    Laravel + base de datos
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Catálogo, etapas, historial, propuestas. MCP
                                    (FastMCP) puede llamar los mismos endpoints
                                    bajo <code>/api/service/*</code>.
                                </p>
                            </div>
                            <div className="rounded-md border border-jira-blue/30 bg-jira-blue/5 p-3">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-jira-blue">
                                    <Bot className="size-3.5" />
                                    OpenClaw (ax86)
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Dos agentes especializados:{' '}
                                    <strong>scraping</strong> y{' '}
                                    <strong>WhatsApp/email</strong>. El gateway
                                    real sustituye el mock cuando configures{' '}
                                    <code>OPENCLAW_GATEWAY_URL</code>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                        <h2 className="mb-3 text-sm font-semibold">
                            Estado de integración
                        </h2>
                        {status ? (
                            <ul className="space-y-2 text-sm">
                                <li className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">
                                        OpenAI
                                    </span>
                                    <span
                                        className={
                                            status.openai_configured
                                                ? 'text-jira-success'
                                                : 'text-muted-foreground'
                                        }
                                    >
                                        {status.openai_configured
                                            ? 'API key OK'
                                            : 'Falta OPENAI_API_KEY'}
                                    </span>
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">
                                        OpenClaw
                                    </span>
                                    <span
                                        className={
                                            status.openclaw_configured
                                                ? 'text-jira-blue'
                                                : 'text-muted-foreground'
                                        }
                                    >
                                        {status.openclaw_configured
                                            ? 'Gateway configurado'
                                            : 'Modo mock'}
                                    </span>
                                </li>
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Cargando…
                            </p>
                        )}
                        <Button
                            className="mt-4 w-full"
                            variant="secondary"
                            size="sm"
                            onClick={() => void load()}
                        >
                            Actualizar
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <h2 className="mb-2 text-sm font-semibold">Tools expuestas al LLM</h2>
                    <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                        {TOOLS_LARAVEL.map((t) => (
                            <li
                                key={t}
                                className="rounded border border-border bg-muted/30 px-2 py-1.5 font-mono text-[11px] text-muted-foreground"
                            >
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Webhook className="size-4 text-muted-foreground" />
                        Webhooks entrantes (OpenClaw → Laravel)
                    </h2>
                    <p className="mb-2 text-xs text-muted-foreground">
                        Cuando un cliente responde, OpenClaw puede notificar:
                    </p>
                    <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
                        <li>POST /api/webhooks/openclaw/whatsapp</li>
                        <li>POST /api/webhooks/openclaw/email</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Cabecera <code>X-OpenClaw-Secret</code> debe coincidir con{' '}
                        <code>OPENCLAW_WEBHOOK_SECRET</code>.
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">
                            Últimos logs globales
                        </h2>
                        <Button variant="ghost" size="sm" onClick={() => void load()}>
                            Refrescar
                        </Button>
                    </div>
                    {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            Sin ejecuciones aún. Usa el tablero: botón{' '}
                            <strong>Orquestador</strong> o la pestaña{' '}
                            <strong>Chat orquestador</strong> en el panel del
                            lead.
                        </p>
                    ) : (
                        <ul className="max-h-[420px] space-y-3 overflow-y-auto">
                            {logs.map((log) => (
                                <li
                                    key={log.id}
                                    className="rounded-md border border-border bg-muted/20 p-3 text-xs"
                                >
                                    <p className="font-mono text-[10px] text-muted-foreground">
                                        #{log.id} · lead {log.lead_id ?? '—'} ·{' '}
                                        {log.created_at}
                                    </p>
                                    <p className="mt-1 text-foreground">
                                        {log.response ?? '—'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}

CrmAgentCenter.layout = {
    breadcrumbs: [
        { title: 'Centro del agente', href: agentRoute.url() },
    ],
};
