import { usePage } from '@inertiajs/react';
import { Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FernandoChatPanel } from '@/components/fernando-chat-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    /** Open panel when URL contains ?chat=fernando */
    autoOpenFromQuery?: boolean;
};

export function FernandoChatBubble({ autoOpenFromQuery = true }: Props) {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!autoOpenFromQuery || typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('chat') === 'fernando') {
            setOpen(true);
        }
    }, [autoOpenFromQuery]);

    return (
        <>
            {open ? (
                <div
                    className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85vh,560px)] flex-col rounded-t-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[min(100vw-2rem,400px)] sm:rounded-2xl"
                    role="dialog"
                    aria-label="Chat con Fernando"
                >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Bot className="size-5 text-primary" />
                            <span className="text-sm font-semibold">
                                Fernando — Ventas Velora
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => setOpen(false)}
                            aria-label="Cerrar chat"
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                    <div className="min-h-0 flex-1 p-3">
                        <FernandoChatPanel
                            csrfToken={csrfToken}
                            apiPrefix="/public/fernando"
                            compact
                            className="h-full min-h-[280px]"
                        />
                    </div>
                </div>
            ) : null}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'premium-shimmer-ring fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6',
                    open && 'pointer-events-none opacity-0',
                )}
                aria-label={open ? 'Cerrar chat con Fernando' : 'Hablar con Fernando'}
                aria-expanded={open}
            >
                <Bot className="size-7" />
            </button>
        </>
    );
}
