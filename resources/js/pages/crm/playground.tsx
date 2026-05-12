import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Loader2,
    SendHorizontal,
    Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';

type LeadRow = {
    id: number;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    funnel_stage_id: number;
};

type Msg = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    kb_hits?: { content: string; score: number; meta: any }[];
    tool_calls?: any[];
};

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Markdown({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            // react-markdown escapes HTML by default unless rehypeRaw is used.
            components={{
                a: ({ ...props }) => (
                    <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline underline-offset-4"
                    />
                ),
                code: ({ className, children, ...props }: any) => {
                    const isBlock = String(className ?? '').includes('language-');
                    return isBlock ? (
                        <code
                            {...props}
                            className={cn(
                                'block overflow-x-auto rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-xs text-foreground',
                                className,
                            )}
                        >
                            {children}
                        </code>
                    ) : (
                        <code
                            {...props}
                            className="rounded-md border border-border/60 bg-background/60 px-1 py-0.5 text-[12px]"
                        >
                            {children}
                        </code>
                    );
                },
            }}
            className={cn(
                'prose prose-sm max-w-none',
                'prose-headings:font-semibold prose-headings:text-foreground',
                'prose-p:text-foreground prose-p:leading-relaxed',
                'prose-strong:text-foreground',
                'prose-ul:my-3 prose-ol:my-3',
                'prose-li:my-1',
                'prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground',
                'prose-hr:border-border/60',
            )}
        >
            {content}
        </ReactMarkdown>
    );
}

function Dots() {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:240ms]" />
        </span>
    );
}

export default function CrmPlayground() {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };

    const [leads, setLeads] = useState<LeadRow[]>([]);
    const [leadId, setLeadId] = useState<number | ''>('');

    const [messages, setMessages] = useState<Msg[]>([
        {
            id: uid(),
            role: 'assistant',
            ts: Date.now(),
            content:
                'Soy tu agente LLM en Velora. Puedo usar tu base de conocimiento (RAG), tus productos y tus leads.\n\nPregunta algo concreto (ej. “¿Qué productos hay?” o “Resume mi CV”).',
        },
    ]);

    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);

    const [leadPickerOpen, setLeadPickerOpen] = useState(false);
    const [leadFilter, setLeadFilter] = useState('');

    const listRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, []);

    const loadLeads = useCallback(async () => {
        const res = await crmFetch(csrfToken, '/leads?limit=50', { method: 'GET' });
        if (!res.ok) return;
        const d = await res.json();
        setLeads(d.leads ?? []);
    }, [csrfToken]);

    useEffect(() => {
        void loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const leadLabel = useMemo(() => {
        if (leadId === '') return 'Sin lead';
        const l = leads.find((x) => x.id === leadId);
        if (!l) return `Lead #${leadId}`;
        return `#${l.id} ${l.name}`;
    }, [leadId, leads]);

    const filteredLeads = useMemo(() => {
        const q = leadFilter.trim().toLowerCase();
        if (!q) return leads;
        return leads.filter((l) => {
            const hay = `${l.id} ${l.name} ${l.company ?? ''} ${l.email ?? ''} ${l.phone ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [leads, leadFilter]);

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;

        setErr(null);
        setBusy(true);

        const userMsg: Msg = {
            id: uid(),
            role: 'user',
            content: text,
            ts: Date.now(),
        };

        // optimistic
        setMessages((m) => [...m, userMsg]);
        setInput('');

        const thinkingId = uid();
        setMessages((m) => [
            ...m,
            {
                id: thinkingId,
                role: 'assistant',
                content: '__THINKING__',
                ts: Date.now(),
            },
        ]);

        try {
            const res = await crmFetch(csrfToken, '/agent-playground/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    lead_id: leadId === '' ? null : leadId,
                }),
            });

            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErr(d.error ?? 'Error del agente.');
                setMessages((m) => m.filter((x) => x.id !== thinkingId));
                return;
            }

            const assistantMsg: Msg = {
                id: uid(),
                role: 'assistant',
                ts: Date.now(),
                content: d.response ?? '(sin respuesta)',
                kb_hits: d.kb_hits ?? [],
                tool_calls: d.tool_calls ?? [],
            };

            setMessages((m) => [
                ...m.filter((x) => x.id !== thinkingId),
                assistantMsg,
            ]);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Head title="Prueba tu agente" />

            <div className="flex flex-1 flex-col">
                {/* Top bar */}
                <div className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-border">
                                <Bot className="size-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Prueba tu agente
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    LLM + RAG + tools (productos y leads)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground sm:flex">
                                <CheckCircle2 className="size-3.5 text-primary" />
                                Contexto: <span className="font-semibold text-foreground">{leadLabel}</span>
                            </div>

                            <Button variant="outline" size="sm" asChild>
                                <Link href="/crm/kanban">
                                    <ArrowLeft className="size-4" />
                                    Volver
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
                    {err ? (
                        <div className="glass-panel rounded-2xl p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                            {err}
                        </div>
                    ) : null}

                    {/* Controls */}
                    <div className="glass-panel rounded-2xl p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">
                                    Contexto
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    (elige un lead si quieres respuestas específicas)
                                </span>
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl"
                                    onClick={() => {
                                        setLeadFilter('');
                                        setLeadPickerOpen(true);
                                    }}
                                >
                                    {leadLabel}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDebug((v) => !v)}
                                >
                                    {showDebug ? (
                                        <ChevronUp className="size-4" />
                                    ) : (
                                        <ChevronDown className="size-4" />
                                    )}
                                    Debug
                                </Button>
                            </div>
                        </div>

                        {showDebug ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 animate-in fade-in slide-in-from-top-1">
                                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                    <p className="text-xs font-semibold text-foreground">
                                        Tips de prompt
                                    </p>
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        <li>• “Lista los productos disponibles”</li>
                                        <li>• “Resume mi CV en 5 bullets”</li>
                                        <li>• “Dame 3 próximos pasos para cerrar este lead”</li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                    <p className="text-xs font-semibold text-foreground">
                                        Estado
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {busy ? 'Agente pensando…' : 'Listo'}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Chat */}
                    <div className="glass-panel flex min-h-[55vh] flex-1 flex-col overflow-hidden rounded-3xl">
                        <Dialog
                            open={leadPickerOpen}
                            onOpenChange={(open) => setLeadPickerOpen(open)}
                        >
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Selecciona un lead</DialogTitle>
                                    <DialogDescription>
                                        Elige un lead para darle contexto al LLM. También puedes usar “Sin lead”.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex gap-2">
                                    <Input
                                        value={leadFilter}
                                        onChange={(e) => setLeadFilter(e.target.value)}
                                        placeholder="Filtrar por nombre, empresa, email, teléfono…"
                                        className="h-11 rounded-2xl"
                                    />
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-2xl"
                                        onClick={() => {
                                            setLeadId('');
                                            setLeadPickerOpen(false);
                                        }}
                                    >
                                        Sin lead
                                    </Button>
                                </div>

                                <div className="mt-4 grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                                    {filteredLeads.length === 0 ? (
                                        <div className="col-span-full rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                                            No hay resultados.
                                        </div>
                                    ) : (
                                        filteredLeads.map((l) => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => {
                                                    setLeadId(l.id);
                                                    setLeadPickerOpen(false);
                                                }}
                                                className={cn(
                                                    'group text-left rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm transition',
                                                    'hover:border-primary/25 hover:bg-background/80 hover:shadow-md',
                                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {l.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            #{l.id}
                                                            {l.company ? ` · ${l.company}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                        score {l.score}
                                                    </span>
                                                </div>

                                                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                                    <p className="truncate">{l.email ?? '—'}</p>
                                                    <p className="truncate">{l.phone ?? '—'}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div
                            ref={listRef}
                            className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6"
                        >
                            {messages.map((m) => {
                                const isUser = m.role === 'user';
                                const isThinking = m.content === '__THINKING__';

                                return (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            'animate-in fade-in slide-in-from-bottom-2 duration-300',
                                            isUser ? 'flex justify-end' : 'flex justify-start',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'max-w-[88%] rounded-3xl border px-4 py-3 text-sm leading-relaxed shadow-sm',
                                                isUser
                                                    ? 'border-primary/20 bg-primary/10 text-foreground'
                                                    : 'border-border/60 bg-background/70 text-foreground',
                                            )}
                                        >
                                            {isThinking ? (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="size-4 animate-spin" />
                                                    <span>Generando respuesta</span>
                                                    <Dots />
                                                </div>
                                            ) : (
                                                <Markdown content={m.content} />
                                            )}

                                            {!isUser && !isThinking ? (
                                                <div className="mt-3 border-t border-border/50 pt-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="rounded-full border border-border/60 bg-card/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                            KB hits: <b className="text-foreground">{m.kb_hits?.length ?? 0}</b>
                                                        </span>
                                                        <span className="rounded-full border border-border/60 bg-card/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                            Tools: <b className="text-foreground">{m.tool_calls?.length ?? 0}</b>
                                                        </span>
                                                    </div>

                                                    {showDebug && (m.kb_hits?.length ?? 0) > 0 ? (
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-[11px] font-semibold text-foreground">
                                                                Fuentes (RAG)
                                                            </p>
                                                            {(m.kb_hits ?? []).slice(0, 3).map((h, idx) => (
                                                                <details
                                                                    key={idx}
                                                                    className="rounded-2xl border border-border/60 bg-background/60 p-3"
                                                                >
                                                                    <summary className="cursor-pointer text-[11px] text-muted-foreground">
                                                                        #{idx + 1} · score {(h.score ?? 0).toFixed?.(3) ?? h.score}
                                                                        {h?.meta?.source ? ` · ${h.meta.source}` : ''}
                                                                    </summary>
                                                                    <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">
                                                                        {h.content}
                                                                    </p>
                                                                </details>
                                                            ))}
                                                        </div>
                                                    ) : null}

                                                    {showDebug && (m.tool_calls?.length ?? 0) > 0 ? (
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-[11px] font-semibold text-foreground">
                                                                Tool calls
                                                            </p>
                                                            <pre className="max-h-56 overflow-auto rounded-2xl border border-border/60 bg-background/60 p-3 text-[11px] text-muted-foreground">
{JSON.stringify(m.tool_calls, null, 2)}
                                                            </pre>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Composer */}
                        <div className="border-t border-border/60 bg-background/70 p-3 backdrop-blur-md sm:p-4">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe tu mensaje…"
                                    disabled={busy}
                                    className="h-11 rounded-2xl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') void send();
                                    }}
                                />
                                <Button
                                    onClick={() => void send()}
                                    disabled={busy || !input.trim()}
                                    className="h-11 rounded-2xl"
                                >
                                    <SendHorizontal className="size-4" />
                                    Enviar
                                </Button>
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                                Tip: para ver fuentes y tools, activa <b>Debug</b>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

CrmPlayground.layout = {
    breadcrumbs: [{ title: 'Prueba tu agente', href: '/crm/playground' }],
};
