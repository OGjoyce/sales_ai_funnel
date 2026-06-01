import { Loader2, SendHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';

export type FernandoMsg = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

const FERNANDO_GREETING =
    'Hola, soy **Fernando**, experto en ventas de Velora. Te ayudo a ver por qué **Pro** u **Ops** transforman tu embudo — y el siguiente paso para activar tu plan. ¿Qué vendes hoy y dónde se te pierden los leads?';

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = {
    csrfToken: string;
    /** API path prefix, e.g. `/public/fernando` or `/fernando` */
    apiPrefix?: string;
    compact?: boolean;
    className?: string;
};

export function FernandoChatPanel({
    csrfToken,
    apiPrefix = '/public/fernando',
    compact = false,
    className,
}: Props) {
    const [messages, setMessages] = useState<FernandoMsg[]>([
        { id: uid(), role: 'assistant', content: FERNANDO_GREETING },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        setError(null);
        const userMsg: FernandoMsg = { id: uid(), role: 'user', content: text };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);

        const payload = {
            messages: next.map((m) => ({ role: m.role, content: m.content })),
        };

        try {
            const res = await crmFetch(csrfToken, `${apiPrefix}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(
                    data.error ??
                        'No se pudo contactar a Fernando. Intenta de nuevo en un momento.',
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
    }, [apiPrefix, csrfToken, input, loading, messages]);

    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            {error ? (
                <div className="mb-2 rounded-md border border-jira-danger/40 bg-jira-danger/10 px-3 py-2 text-sm text-jira-danger">
                    {error}
                </div>
            ) : null}

            <div
                className={cn(
                    'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50',
                    compact && 'rounded-xl',
                )}
            >
                <div
                    className={cn(
                        'min-h-0 flex-1 space-y-3 overflow-y-auto p-3',
                        !compact && 'p-4 space-y-4',
                    )}
                >
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={cn(
                                'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                                !compact && 'px-4 py-3',
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
                    className="flex gap-2 border-t border-border/60 p-2 sm:p-3"
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
                        className="flex-1 text-sm"
                    />
                    <Button
                        type="submit"
                        size={compact ? 'icon' : 'default'}
                        disabled={loading || !input.trim()}
                    >
                        <SendHorizontal className="size-4" />
                        {!compact ? <span className="ml-1">Enviar</span> : null}
                    </Button>
                </form>
            </div>
        </div>
    );
}
