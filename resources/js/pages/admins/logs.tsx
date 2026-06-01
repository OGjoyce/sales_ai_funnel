import { Head, usePage } from '@inertiajs/react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';

type LogSnapshot = {
    laravel?: string;
    agent_logs?: string;
    lina_runs?: string;
};

export default function AdminLogs() {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };
    const [logs, setLogs] = useState<LogSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await crmFetch(csrfToken, '/admins/invoker/logs', {
                method: 'GET',
            });
            if (!res.ok) {
                setError('No se pudieron cargar los logs.');
                return;
            }
            setLogs(await res.json());
        } catch {
            setError('Error de red al cargar logs.');
        } finally {
            setLoading(false);
        }
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <>
            <Head title="Logs — Admin Velora" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <FileText className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Logs Velora</h1>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => void load()}
                    >
                        <RefreshCw
                            className={cn('size-4', loading && 'animate-spin')}
                        />
                        Actualizar
                    </Button>
                </div>

                {error ? (
                    <div className="rounded-md border border-jira-danger/40 bg-jira-danger/10 px-3 py-2 text-sm text-jira-danger">
                        {error}
                    </div>
                ) : null}

                {loading && !logs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Cargando logs…
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-1">
                        <LogBlock title="laravel.log" text={logs?.laravel} />
                        <LogBlock title="agent_logs" text={logs?.agent_logs} />
                        <LogBlock
                            title="lina_generation_runs"
                            text={logs?.lina_runs}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

function LogBlock({ title, text }: { title: string; text?: string }) {
    return (
        <section className="flex min-h-48 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40">
            <h2 className="border-b border-border/60 px-3 py-2 text-sm font-medium">
                {title}
            </h2>
            <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                {text?.trim() || '(vacío)'}
            </pre>
        </section>
    );
}

AdminLogs.layout = {
    breadcrumbs: [
        { title: 'Admins', href: '/admins' },
        { title: 'Logs', href: '/admins/logs' },
    ],
};
