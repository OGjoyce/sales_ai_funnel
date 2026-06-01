import { Head, usePage } from '@inertiajs/react';
import { Bot, Loader2, SendHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';

type Msg = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CrmHelp() {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };
    const [messages, setMessages] = useState<Msg[]>([
        {
            id: uid(),
            role: 'assistant',
            content:
                'Hola, soy **Fernando**, experto en ventas de Velora. Te ayudo a ver por qué **Pro** u **Ops** transforman tu embudo — y el siguiente paso para activar tu plan. ¿Qué vendes hoy y dónde se te pierden los leads?',
        },
    ]);
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
            const res = await crmFetch(csrfToken, '/fernando/status', {
                method: 'GET',
            });
            if (res.ok) {
                const data = await res.json();
                setGatewayOk(data.fernando_probe?.success === true);
            }
        })();
    }, [csrfToken]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        setError(null);
        const userMsg: Msg = { id: uid(), role: 'user', content: text };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);

        const payload = {
            messages: next.map((m) => ({ role: m.role, content: m.content })),
        };

        try {
            const res = await crmFetch(csrfToken, '/fernando/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(
                    data.error ??
                        'No se pudo contactar a Fernando. Revisa OpenClaw en Integraciones.',
                );
                return;
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: uid(),
                    role: 'assistant',
                    content: String(data.reply ?? ''),
                },
            ]);
        } catch {
            setError('Error de red al contactar a Fernando.');
        } finally {
            setLoading(false);
        }
    }, [csrfToken, input, loading, messages]);

    return (
        <>
            <Head title="Ayuda — Fernando" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Bot className="size-5 text-primary" />
                    <h1 className="text-lg font-semibold">
                        Fernando — Ventas Velora
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
                            <div
                                key={m.id}
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
                        ))}
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Fernando está pensando…
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
                            placeholder="Pregunta sobre Velora…"
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading || !input.trim()}>
                            <SendHorizontal className="size-4" />
                            Enviar
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}

CrmHelp.layout = {
    breadcrumbs: [{ title: 'Fernando / Ayuda', href: '/crm/help' }],
};
