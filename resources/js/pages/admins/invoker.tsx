import { Head, usePage } from '@inertiajs/react';
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';

type ChannelMsg = {
    id: number | string;
    role: 'user' | 'assistant';
    content: string;
    actions_executed?: Array<{
        tool: string;
        ok: boolean;
        error?: string;
    }>;
};

const WELCOME: ChannelMsg = {
    id: 'welcome',
    role: 'assistant',
    content:
        'Soy **Invoker**, operador arcano de Velora. Tengo acceso a logs y puedo aplicar cambios **solo en el CRM** (leads, embudo, productos, trials). ¿Qué necesitas ajustar?',
};

export default function AdminInvoker() {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };
    const [messages, setMessages] = useState<ChannelMsg[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        void (async () => {
            const [statusRes, channelRes] = await Promise.all([
                crmFetch(csrfToken, '/admins/invoker/status', { method: 'GET' }),
                crmFetch(csrfToken, '/admins/invoker/channel', { method: 'GET' }),
            ]);

            if (statusRes.ok) {
                const data = await statusRes.json();
                setGatewayOk(data.invoker_probe?.success === true);
            }

            if (channelRes.ok) {
                const data = await channelRes.json();
                const loaded = (data.messages ?? []) as ChannelMsg[];
                if (loaded.length > 0) {
                    setMessages(loaded);
                }
            }
        })();
    }, [csrfToken]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        setError(null);
        const optimistic: ChannelMsg = {
            id: `tmp-${Date.now()}`,
            role: 'user',
            content: text,
        };
        setMessages((prev) => [...prev, optimistic]);
        setLoading(true);

        try {
            const res = await crmFetch(csrfToken, '/admins/invoker/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(
                    data.error ??
                        'Invoker no respondió. Revisa el gateway OpenClaw.',
                );
                return;
            }

            const assistant: ChannelMsg = {
                id: `reply-${Date.now()}`,
                role: 'assistant',
                content: String(data.reply ?? ''),
                actions_executed: data.actions_executed,
            };
            setMessages((prev) => [...prev, assistant]);
        } catch {
            setError('Error de red al contactar a Invoker.');
        } finally {
            setLoading(false);
        }
    }, [csrfToken, input, loading]);

    return (
        <>
            <Head title="Invoker — Admin Velora" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    <h1 className="text-lg font-semibold">
                        Invoker — Canal velora-admins
                    </h1>
                    {gatewayOk === true ? (
                        <span className="rounded-full bg-jira-success/15 px-2 py-0.5 text-xs text-jira-success">
                            OpenClaw conectado
                        </span>
                    ) : gatewayOk === false ? (
                        <span className="rounded-full bg-jira-danger/15 px-2 py-0.5 text-xs text-jira-danger">
                            Gateway no disponible
                        </span>
                    ) : null}
                </div>

                {error ? (
                    <div className="rounded-md border border-jira-danger/40 bg-jira-danger/10 px-3 py-2 text-sm text-jira-danger">
                        {error}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                        {messages.map((m) => (
                            <div key={String(m.id)} className="space-y-1">
                                <div
                                    className={cn(
                                        'max-w-[90%] rounded-2xl px-4 py-3 text-sm',
                                        m.role === 'user'
                                            ? 'ml-auto bg-primary text-primary-foreground'
                                            : 'mr-auto border border-border/60 bg-background/80',
                                    )}
                                >
                                    {m.role === 'assistant' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            className="prose prose-sm max-w-none dark:prose-invert"
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    ) : (
                                        m.content
                                    )}
                                </div>
                                {m.actions_executed &&
                                m.actions_executed.length > 0 ? (
                                    <ul className="mr-auto max-w-[90%] list-inside list-disc text-xs text-muted-foreground">
                                        {m.actions_executed.map((a, i) => (
                                            <li key={i}>
                                                {a.tool}:{' '}
                                                {a.ok ? 'ok' : a.error ?? 'error'}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        ))}
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Invoker está invocando…
                            </div>
                        ) : null}
                        <div ref={bottomRef} />
                    </div>

                    <form
                        className="flex gap-2 border-t border-border/60 p-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void send();
                        }}
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pide un cambio en Velora o revisa logs…"
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !input.trim()}
                        >
                            <SendHorizontal className="size-4" />
                            Enviar
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}

AdminInvoker.layout = {
    breadcrumbs: [
        { title: 'Admins', href: '/admins' },
        { title: 'Invoker', href: '/admins/invoker' },
    ],
};
