import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileUp, MessageCircle, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crmFetch } from '@/lib/crm-api';
import { kanban as kanbanRoute, training as trainingRoute } from '@/routes/crm';

type AgentFileRow = {
    id: number;
    original_name: string;
    extension: string | null;
    size_bytes: number;
    status: 'queued' | 'processing' | 'ready' | 'error';
    error: string | null;
    chunks_count: number;
    created_at: string;
};

export default function CrmTraining() {
    const { csrf_token: csrfToken } = usePage().props;

    const [files, setFiles] = useState<AgentFileRow[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [q, setQ] = useState('');
    const [answer, setAnswer] = useState<string>('');
    const [hits, setHits] = useState<
        { content: string; score: number; meta: Record<string, unknown> | null }[]
    >([]);

    const prettySize = useMemo(
        () => (bytes: number) => {
            const mb = bytes / (1024 * 1024);
            return `${mb.toFixed(2)} MB`;
        },
        [],
    );

    const load = useCallback(async () => {
        setErr(null);
        const res = await crmFetch(csrfToken, '/agent-kb/files', { method: 'GET' });
        if (!res.ok) {
            setErr('No se pudieron cargar los archivos.');
            return;
        }
        const d = await res.json();
        setFiles(d.files ?? []);
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const onUpload = async (file: File) => {
        setBusy(true);
        setErr(null);
        try {
            const form = new FormData();
            form.append('file', file);

            const res = await fetch('/api/agent-kb/files', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': String(csrfToken ?? ''),
                    Accept: 'application/json',
                },
                body: form,
            });

            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErr(d.error ?? 'Error subiendo archivo.');
                return;
            }

            await load();
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async (id: number) => {
        setBusy(true);
        setErr(null);
        try {
            const res = await crmFetch(csrfToken, `/agent-kb/files/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                setErr('No se pudo eliminar.');
                return;
            }
            await load();
        } finally {
            setBusy(false);
        }
    };

    const onQuery = async () => {
        setBusy(true);
        setErr(null);
        setAnswer('');
        setHits([]);
        try {
            const res = await crmFetch(csrfToken, '/agent-kb/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q, top_k: 8 }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErr(d.error ?? 'No se pudo consultar la base de conocimiento.');
                return;
            }
            setHits(d.hits ?? []);
            setAnswer(
                (d.hits ?? [])
                    .slice(0, 3)
                    .map((h: { content: string }, i: number) => `(${i + 1}) ${h.content}`)
                    .join('\n\n'),
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Head title="Entrenar tu IA" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            Entrenar tu IA
                        </h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Sube procesos, PDFs y documentos para que tu agente tenga
                            contexto. Cada usuario tiene su propia base de conocimiento.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={kanbanRoute.url()}>
                                <ArrowLeft className="size-4" />
                                Volver al tablero
                            </Link>
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={trainingRoute.url()}>
                                <Sparkles className="size-4" />
                                Refrescar
                            </Link>
                        </Button>
                    </div>
                </div>

                {err ? (
                    <div className="glass-panel rounded-2xl p-4 text-sm text-destructive">
                        {err}
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="glass-panel p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <FileUp className="size-4 text-primary" />
                            Archivos del agente (máx. 5, 12MB c/u)
                        </h2>
                        <div className="flex items-center gap-3">
                            <Input
                                type="file"
                                disabled={busy}
                                accept=".pdf,.txt,.docx,.csv,.xlsx,.md,.html,.htm"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void onUpload(f);
                                    e.currentTarget.value = '';
                                }}
                            />
                        </div>

                        <div className="mt-4 space-y-3">
                            {files.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Aún no has subido archivos.
                                </p>
                            ) : (
                                files.map((f) => (
                                    <div
                                        key={f.id}
                                        className="rounded-2xl border border-border/60 bg-background/60 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {f.original_name}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {prettySize(f.size_bytes)} · {f.status}
                                                    {f.chunks_count ? ` · ${f.chunks_count} chunks` : ''}
                                                </p>
                                                {f.error ? (
                                                    <p className="mt-2 text-xs text-destructive">
                                                        {f.error}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busy}
                                                onClick={() => void onDelete(f.id)}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="glass-panel p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <MessageCircle className="size-4 text-primary" />
                            Probar búsqueda (RAG)
                        </h2>
                        <p className="mb-3 text-xs text-muted-foreground">
                            Nota: embeddings/vector search requiere Postgres + pgvector.
                            Si estás en SQLite/MySQL, verás resultados vacíos.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Pregunta sobre tus procesos/archivos…"
                                disabled={busy}
                            />
                            <Button onClick={() => void onQuery()} disabled={busy || !q.trim()}>
                                Buscar
                            </Button>
                        </div>

                        {answer ? (
                            <pre className="mt-4 max-h-[320px] whitespace-pre-wrap rounded-2xl border border-border/60 bg-background/60 p-4 text-xs text-foreground">
                                {answer}
                            </pre>
                        ) : null}

                        {hits.length ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                {hits.length} resultados.
                            </p>
                        ) : null}
                    </section>
                </div>
            </div>
        </>
    );
}

CrmTraining.layout = {
    breadcrumbs: [{ title: 'Entrenar tu IA', href: trainingRoute.url() }],
};
