import {
    DragDropContext,
    Draggable,
    Droppable,
} from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Head, usePage } from '@inertiajs/react';
import { Bot, Loader2, Mail, MessageCircle, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { crmFetch } from '@/lib/crm-api';
import { cn } from '@/lib/utils';
import { kanban as kanbanRoute } from '@/routes/crm';

type LastIx = {
    id: number;
    type: string;
    direction: string;
    content: string | null;
    created_at: string;
};

type LeadRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    score: number;
    source: string;
    funnel_stage_id: number;
    updated_at: string;
    interactions?: LastIx[];
};

type AgentLogRow = {
    id: number;
    response: string | null;
    tool_calls: unknown;
    created_at: string;
};

type LeadDetail = LeadRow & {
    interactions?: {
        id: number;
        type: string;
        direction: string;
        content: string | null;
        created_at: string;
    }[];
    agent_logs?: AgentLogRow[];
};

type StageRow = {
    id: number;
    name: string;
    sort_order: number;
    color_token: string | null;
    leads: LeadRow[];
};

type CatalogProduct = { id: number; title: string; code: string };

const COLUMN_ACCENT = [
    'border-l-cryoblue',
    'border-l-tealray',
    'border-l-arc',
    'border-l-plasma',
    'border-l-novapink',
    'border-l-core',
    'border-l-pulsar',
    'border-l-cryoblue',
] as const;

function cloneStages(stages: StageRow[]): StageRow[] {
    return stages.map((s) => ({
        ...s,
        leads: [...s.leads],
    }));
}

function timeAgo(iso: string): string {
    const t = new Date(iso).getTime();

    if (Number.isNaN(t)) {
        return '';
    }

    const s = Math.floor((Date.now() - t) / 1000);

    if (s < 45) {
        return 'ahora';
    }

    if (s < 3600) {
        return `hace ${Math.floor(s / 60)} min`;
    }

    if (s < 86400) {
        return `hace ${Math.floor(s / 3600)} h`;
    }

    return `hace ${Math.floor(s / 86400)} d`;
}

function initials(name: string): string {
    const p = name.trim().split(/\s+/).slice(0, 2);

    return p.map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function lastChannel(lead: LeadRow): LastIx | null {
    const ix = lead.interactions?.[0];

    return ix ?? null;
}

function scoreClass(score: number): string {
    if (score >= 70) {
        return 'border-novapink/55 bg-novapink/15 text-novapink';
    }

    if (score >= 40) {
        return 'border-cryoblue/50 bg-cryoblue/10 text-cryoblue';
    }

    return 'border-border bg-muted/40 text-muted-foreground';
}

type TabId = 'resumen' | 'timeline' | 'chat' | 'logs';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CrmKanban() {
    const { csrf_token: csrfToken } = usePage().props;
    const [stages, setStages] = useState<StageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
    const [detail, setDetail] = useState<{ lead: LeadDetail } | null>(null);
    const [sheetTab, setSheetTab] = useState<TabId>('resumen');
    const [chatInput, setChatInput] = useState('');
    const [chatBusy, setChatBusy] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const [commsWaPhone, setCommsWaPhone] = useState('');
    const [commsWaMessage, setCommsWaMessage] = useState('');
    const [commsWaRefineAi, setCommsWaRefineAi] = useState(true);
    const [commsWaBusy, setCommsWaBusy] = useState(false);
    const [commsWaErr, setCommsWaErr] = useState<string | null>(null);
    const [commsWaOk, setCommsWaOk] = useState<string | null>(null);
    const [commsEmailTo, setCommsEmailTo] = useState('');
    const [commsEmailSubject, setCommsEmailSubject] = useState('');
    const [commsEmailBody, setCommsEmailBody] = useState('');
    const [commsEmailRefineAi, setCommsEmailRefineAi] = useState(true);
    const [commsEmailBusy, setCommsEmailBusy] = useState(false);
    const [commsEmailErr, setCommsEmailErr] = useState<string | null>(null);
    const [commsEmailOk, setCommsEmailOk] = useState<string | null>(null);

    const [linaOpen, setLinaOpen] = useState(false);
    const [linaLoading, setLinaLoading] = useState(false);
    const [linaCatalog, setLinaCatalog] = useState<CatalogProduct[]>([]);
    const [linaProductIds, setLinaProductIds] = useState<number[]>([]);
    const [linaSector, setLinaSector] = useState('');
    const [linaNotes, setLinaNotes] = useState('');
    const [linaChannels, setLinaChannels] = useState({
        whatsapp: true,
        email: true,
        website: true,
        gmail: false,
    });
    const [linaSuccessMessage, setLinaSuccessMessage] = useState<string | null>(
        null,
    );
    const linaPollCancelRef = useRef(false);

    const [manualOpen, setManualOpen] = useState(false);
    const [manualLoading, setManualLoading] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualCompany, setManualCompany] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [manualWebsite, setManualWebsite] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await crmFetch(csrfToken, '/funnel', { method: 'GET' });

        if (!res.ok) {
            setError('No se pudo cargar el embudo.');
            setLoading(false);

            return;
        }

        const data = await res.json();
        setStages(data.stages ?? []);
        setLoading(false);
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const l = detail?.lead;

        if (!l) {
            return;
        }

        setCommsWaPhone(l.phone ?? '');
        setCommsEmailTo(l.email ?? '');
        setCommsWaErr(null);
        setCommsWaOk(null);
        setCommsEmailErr(null);
        setCommsEmailOk(null);
    }, [detail?.lead?.id]);

    useEffect(() => {
        if (!linaOpen) {
            return;
        }

        void (async () => {
            const res = await crmFetch(csrfToken, '/products?limit=200', {
                method: 'GET',
            });

            if (res.ok) {
                const data = await res.json();
                setLinaCatalog(data.products ?? []);
            }
        })();
    }, [linaOpen, csrfToken]);

    const toggleLinaProduct = (id: number) => {
        setLinaProductIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const submitLina = async () => {
        const sector = linaSector.trim();

        if (!sector) {
            setError('Indica sector o zona (ej. Guatemala, zona 10).');

            return;
        }

        const ch = linaChannels;

        if (
            !ch.whatsapp &&
            !ch.email &&
            !ch.website &&
            !ch.gmail
        ) {
            setError('Selecciona al menos un tipo de contacto.');

            return;
        }

        setError(null);
        setLinaSuccessMessage(null);
        linaPollCancelRef.current = false;
        setLinaLoading(true);

        try {
            const res = await crmFetch(csrfToken, '/leads/lina', {
                method: 'POST',
                body: JSON.stringify({
                    sector,
                    product_ids: linaProductIds,
                    product_notes: linaNotes.trim() || null,
                    channels: ch,
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.status !== 202 || typeof data.job_id !== 'string') {
                if (res.status === 422) {
                    const msg =
                        typeof data.message === 'string'
                            ? data.message
                            : 'Datos no válidos para Lina.';
                    setError(msg);
                } else {
                    setError(
                        typeof data.error === 'string'
                            ? data.error
                            : 'No se pudo encolar la búsqueda con Lina.',
                    );
                }

                return;
            }

            const jobId = data.job_id as string;
            const deadline = Date.now() + 45 * 60 * 1000;
            const intervalMs = 2500;

            while (Date.now() < deadline && !linaPollCancelRef.current) {
                await sleep(intervalMs);
                const pr = await crmFetch(
                    csrfToken,
                    `/leads/lina/${jobId}`,
                    { method: 'GET' },
                );

                if (pr.status === 401 || pr.status === 404) {
                    setError('No se pudo consultar el estado de Lina.');

                    return;
                }

                if (!pr.ok) {
                    setError('Error al consultar el estado de Lina.');

                    return;
                }

                const st = (await pr.json()) as {
                    status?: string;
                    leads_created?: number[];
                    error?: string | null;
                    mock?: boolean | null;
                };

                if (st.status === 'completed') {
                    const n = Array.isArray(st.leads_created)
                        ? st.leads_created.length
                        : 0;
                    setLinaOpen(false);
                    setLinaSector('');
                    setLinaNotes('');
                    setLinaProductIds([]);
                    setLinaSuccessMessage(
                        n > 0
                            ? `Lina terminó: ${n} lead(s) nuevo(s) en el embudo${st.mock ? ' (simulación)' : ''}.`
                            : `Lina terminó sin leads nuevos${st.mock ? ' (simulación)' : ''}.`,
                    );
                    await load();

                    return;
                }

                if (st.status === 'failed') {
                    setError(
                        typeof st.error === 'string' && st.error !== ''
                            ? st.error
                            : 'Lina falló al generar leads.',
                    );

                    return;
                }
            }

            if (linaPollCancelRef.current) {
                setLinaSuccessMessage(
                    'La ventana se cerró; el trabajo sigue en cola. Recarga el embudo en unos minutos.',
                );

                return;
            }

            setError(
                'Lina sigue trabajando (límite de espera en pantalla). Revisa el embudo más tarde o que `php artisan queue:work` esté en ejecución.',
            );
        } catch {
            setError('Error de red al contactar Lina.');
        } finally {
            setLinaLoading(false);
        }
    };

    const openDetail = async (id: number) => {
        setSelectedLeadId(id);
        setSheetOpen(true);
        setSheetTab('resumen');
        setChatInput('');
        setChatError(null);
        const res = await crmFetch(csrfToken, `/leads/${id}`, { method: 'GET' });

        if (res.ok) {
            const data = await res.json();
            setDetail(data);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) {
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const leadId = Number(draggableId);
        const destStageId = Number(destination.droppableId);
        const sourceStageId = Number(source.droppableId);

        const snapshot = cloneStages(stages);

        setStages((prev) => {
            const next = cloneStages(prev);
            const from = next.find((s) => s.id === sourceStageId);
            const to = next.find((s) => s.id === destStageId);

            if (!from || !to) {
                return prev;
            }

            const [moved] = from.leads.splice(source.index, 1);

            if (!moved) {
                return prev;
            }

            moved.funnel_stage_id = destStageId;
            to.leads.splice(destination.index, 0, moved);

            return next;
        });

        const res = await crmFetch(csrfToken, `/leads/${leadId}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({
                funnel_stage_id: destStageId,
                run_agent: false,
            }),
        });

        if (!res.ok) {
            setStages(snapshot);
            setError('No se pudo mover el lead.');
        }
    };

    const runAgent = async (leadId: number) => {
        setError(null);
        const res = await crmFetch(csrfToken, '/agent/run', {
            method: 'POST',
            body: JSON.stringify({
                lead_id: leadId,
                async: false,
                context: {},
            }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            setError(
                typeof data.error === 'string'
                    ? data.error
                    : 'Agente no disponible (configura OPENAI_API_KEY).',
            );

            return;
        }

        await load();

        if (selectedLeadId === leadId) {
            await openDetail(leadId);
        }
    };

    const sendCommsWhatsapp = async () => {
        if (!detail?.lead) {
            return;
        }

        const msg = commsWaMessage.trim();

        if (!msg) {
            setCommsWaErr('Escribe el mensaje.');

            return;
        }

        setCommsWaErr(null);
        setCommsWaOk(null);
        setCommsWaBusy(true);

        try {
            const res = await crmFetch(
                csrfToken,
                `/leads/${detail.lead.id}/comms/whatsapp`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        message: msg,
                        phone: commsWaPhone.trim() || null,
                        refine_with_ai: commsWaRefineAi,
                    }),
                },
            );
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setCommsWaErr(
                    typeof data.error === 'string'
                        ? data.error
                        : 'No se pudo enviar por WhatsApp.',
                );

                return;
            }

            let waOk =
                typeof data.assistant_reply === 'string' &&
                data.assistant_reply !== ''
                    ? data.assistant_reply
                    : data.mock
                      ? 'Simulación (sin gateway).'
                      : 'Solicitud enviada a Alleria.';

            if (data.refined_with_ai && typeof data.sent_message === 'string') {
                waOk =
                    'La IA mejoró tu texto; Alleria lo envió por WhatsApp.\n«' +
                    data.sent_message +
                    '»';

                if (
                    typeof data.assistant_reply === 'string' &&
                    data.assistant_reply !== ''
                ) {
                    waOk += '\n\nAlleria: ' + data.assistant_reply;
                }
            }

            setCommsWaOk(waOk);
            setCommsWaMessage('');
            await openDetail(detail.lead.id);
        } catch {
            setCommsWaErr('Error de red.');
        } finally {
            setCommsWaBusy(false);
        }
    };

    const sendCommsEmail = async () => {
        if (!detail?.lead) {
            return;
        }

        const sub = commsEmailSubject.trim();
        const body = commsEmailBody.trim();

        if (!sub || !body) {
            setCommsEmailErr('Asunto y cuerpo son obligatorios.');

            return;
        }

        setCommsEmailErr(null);
        setCommsEmailOk(null);
        setCommsEmailBusy(true);

        try {
            const res = await crmFetch(
                csrfToken,
                `/leads/${detail.lead.id}/comms/email`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        subject: sub,
                        body,
                        to: commsEmailTo.trim() || null,
                        refine_with_ai: commsEmailRefineAi,
                    }),
                },
            );
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setCommsEmailErr(
                    typeof data.error === 'string'
                        ? data.error
                        : 'No se pudo enviar el correo.',
                );

                return;
            }

            let emOk =
                typeof data.assistant_reply === 'string' &&
                data.assistant_reply !== ''
                    ? data.assistant_reply
                    : data.mock
                      ? 'Simulación (sin gateway).'
                      : 'Solicitud enviada a Alleria.';

            if (data.refined_with_ai) {
                emOk =
                    'La IA mejoró asunto y cuerpo; Alleria envió el correo.';

                if (typeof data.sent_subject === 'string') {
                    emOk += '\nAsunto: «' + data.sent_subject + '»';
                }

                if (typeof data.sent_body === 'string' && data.sent_body) {
                    const preview =
                        data.sent_body.length > 280
                            ? data.sent_body.slice(0, 280) + '…'
                            : data.sent_body;
                    emOk += '\n\n' + preview;
                }

                if (
                    typeof data.assistant_reply === 'string' &&
                    data.assistant_reply !== ''
                ) {
                    emOk += '\n\nAlleria: ' + data.assistant_reply;
                }
            }

            setCommsEmailOk(emOk);
            setCommsEmailBody('');
            await openDetail(detail.lead.id);
        } catch {
            setCommsEmailErr('Error de red.');
        } finally {
            setCommsEmailBusy(false);
        }
    };

    const sendChat = async () => {
        if (!detail?.lead || !chatInput.trim()) {
            return;
        }

        setChatBusy(true);
        setChatError(null);
        const res = await crmFetch(csrfToken, '/agent/chat', {
            method: 'POST',
            body: JSON.stringify({
                lead_id: detail.lead.id,
                message: chatInput.trim(),
            }),
        });
        const data = await res.json().catch(() => ({}));
        setChatBusy(false);

        if (!res.ok) {
            setChatError(
                typeof data.error === 'string'
                    ? data.error
                    : 'No se pudo enviar el mensaje.',
            );

            return;
        }

        setChatInput('');
        setSheetTab('logs');
        await openDetail(detail.lead.id);
    };

    const submitManualLead = async () => {
        const name = manualName.trim();

        if (!name) {
            setError('Indica el nombre del lead.');

            return;
        }

        setError(null);
        setManualLoading(true);

        try {
            const res = await crmFetch(csrfToken, '/leads', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    email: manualEmail.trim() || null,
                    company: manualCompany.trim() || null,
                    phone: manualPhone.trim() || null,
                    website: manualWebsite.trim() || null,
                    source: 'manual',
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                let msg = 'No se pudo crear el lead.';

                if (
                    data.errors &&
                    typeof data.errors === 'object' &&
                    data.errors !== null
                ) {
                    const first = Object.values(
                        data.errors as Record<string, string[]>,
                    )
                        .flat()
                        .find((x) => typeof x === 'string');

                    if (first) {
                        msg = first;
                    }
                } else if (typeof data.message === 'string') {
                    msg = data.message;
                }

                setError(msg);

                return;
            }

            setManualOpen(false);
            setManualName('');
            setManualEmail('');
            setManualCompany('');
            setManualPhone('');
            setManualWebsite('');
            await load();
        } catch {
            setError('Error de red al crear el lead.');
        } finally {
            setManualLoading(false);
        }
    };

    const tabBtn = (id: TabId, label: string) => (
        <button
            type="button"
            key={id}
            onClick={() => setSheetTab(id)}
            className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                sheetTab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {label}
        </button>
    );

    return (
        <>
            <Head title="Embudo CRM" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                {error ? (
                    <div className="rounded-md border border-jira-danger/40 bg-jira-danger/10 px-3 py-2 text-sm text-jira-danger">
                        {error}
                    </div>
                ) : null}

                {linaSuccessMessage ? (
                    <div className="rounded-md border border-jira-success/40 bg-jira-success/10 px-3 py-2 text-sm text-jira-success">
                        {linaSuccessMessage}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            setLinaSuccessMessage(null);
                            setLinaOpen(true);
                        }}
                    >
                        <UserPlus className="size-4" />
                        Agregar leads
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setError(null);
                            setManualOpen(true);
                        }}
                    >
                        Nuevo lead
                    </Button>
                </div>

                <Dialog
                    open={linaOpen}
                    onOpenChange={(o) => {
                        if (!o && linaLoading) {
                            linaPollCancelRef.current = true;
                        }

                        setLinaOpen(o);
                    }}
                >
                    <DialogContent
                        className={cn(
                            'flex max-h-[min(90vh,calc(100dvh-2rem))] min-h-0 w-full max-w-[calc(100%-2rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
                            'top-[max(0.5rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 sm:top-[5vh]',
                        )}
                    >
                        <div className="relative flex min-h-0 flex-1 flex-col">
                            {linaLoading ? (
                                <div className="bg-background/85 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg backdrop-blur-sm">
                                    <Loader2 className="text-primary size-8 animate-spin" />
                                    <p className="text-muted-foreground px-4 text-center text-sm">
                                        Trabajo en cola: Lina y OpenClaw pueden tardar
                                        varios minutos. Puedes cerrar el modal; el
                                        proceso sigue en el servidor si la cola
                                        está activa.
                                    </p>
                                </div>
                            ) : null}
                            <div className="shrink-0 border-b px-6 pt-6 pb-3 pr-14">
                                <DialogHeader className="text-left">
                                    <DialogTitle>
                                        Agregar leads con Lina
                                    </DialogTitle>
                                    <DialogDescription>
                                        Hasta 3 contactos. La petición se encola;
                                        OpenAI redacta el brief y Lina en OpenClaw
                                        ejecuta en segundo plano (requiere{' '}
                                        <code className="text-xs">queue:work</code>
                                        ).
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label>Productos del catálogo</Label>
                                        <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-border p-2 sm:max-h-36">
                                            {linaCatalog.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Sin productos o cargando…
                                                </p>
                                            ) : (
                                                linaCatalog.map((p) => (
                                                    <label
                                                        key={p.id}
                                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                                    >
                                                        <Checkbox
                                                            disabled={
                                                                linaLoading
                                                            }
                                                            checked={linaProductIds.includes(
                                                                p.id,
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggleLinaProduct(
                                                                    p.id,
                                                                )
                                                            }
                                                        />
                                                        <span>
                                                            {p.title}{' '}
                                                            <span className="text-muted-foreground">
                                                                ({p.code})
                                                            </span>
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lina-notes">
                                            Qué vendemos (notas)
                                        </Label>
                                        <textarea
                                            id="lina-notes"
                                            value={linaNotes}
                                            onChange={(e) =>
                                                setLinaNotes(e.target.value)
                                            }
                                            rows={3}
                                            disabled={linaLoading}
                                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                                            placeholder="Detalle oferta, pack, servicio…"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lina-sector">
                                            Sector / zona *
                                        </Label>
                                        <Input
                                            id="lina-sector"
                                            value={linaSector}
                                            onChange={(e) =>
                                                setLinaSector(e.target.value)
                                            }
                                            disabled={linaLoading}
                                            placeholder="Ej. Guatemala, zona 10"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Buscar señales de</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(
                                                [
                                                    [
                                                        'whatsapp',
                                                        'WhatsApp',
                                                    ] as const,
                                                    [
                                                        'email',
                                                        'Correo empresa',
                                                    ] as const,
                                                    [
                                                        'website',
                                                        'Página web',
                                                    ] as const,
                                                    [
                                                        'gmail',
                                                        'Gmail / personal',
                                                    ] as const,
                                                ] as const
                                            ).map(([key, label]) => (
                                                <label
                                                    key={key}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <Checkbox
                                                        disabled={linaLoading}
                                                        checked={
                                                            linaChannels[key]
                                                        }
                                                        onCheckedChange={(
                                                            v,
                                                        ) =>
                                                            setLinaChannels(
                                                                (c) => ({
                                                                    ...c,
                                                                    [key]:
                                                                        v ===
                                                                        true,
                                                                }),
                                                            )
                                                        }
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-background shrink-0 border-t px-6 py-4">
                                <DialogFooter className="gap-2 sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={linaLoading}
                                        onClick={() => setLinaOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={linaLoading}
                                        className="inline-flex gap-2"
                                        onClick={() => void submitLina()}
                                    >
                                        {linaLoading ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Buscando…
                                            </>
                                        ) : (
                                            'OK'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={manualOpen}
                    onOpenChange={(o) => {
                        if (!manualLoading) {
                            setManualOpen(o);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Nuevo lead</DialogTitle>
                            <DialogDescription>
                                Datos del contacto. El nombre es obligatorio.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="manual-name">Nombre *</Label>
                                <Input
                                    id="manual-name"
                                    value={manualName}
                                    onChange={(e) =>
                                        setManualName(e.target.value)
                                    }
                                    placeholder="Nombre del contacto"
                                    disabled={manualLoading}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="manual-email">Email</Label>
                                <Input
                                    id="manual-email"
                                    type="email"
                                    value={manualEmail}
                                    onChange={(e) =>
                                        setManualEmail(e.target.value)
                                    }
                                    placeholder="correo@empresa.com"
                                    disabled={manualLoading}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="manual-company">Empresa</Label>
                                <Input
                                    id="manual-company"
                                    value={manualCompany}
                                    onChange={(e) =>
                                        setManualCompany(e.target.value)
                                    }
                                    placeholder="Razón social o marca"
                                    disabled={manualLoading}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="manual-phone">Teléfono</Label>
                                <Input
                                    id="manual-phone"
                                    type="tel"
                                    value={manualPhone}
                                    onChange={(e) =>
                                        setManualPhone(e.target.value)
                                    }
                                    placeholder="+502 …"
                                    disabled={manualLoading}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="manual-website">Sitio web</Label>
                                <Input
                                    id="manual-website"
                                    value={manualWebsite}
                                    onChange={(e) =>
                                        setManualWebsite(e.target.value)
                                    }
                                    placeholder="https://…"
                                    disabled={manualLoading}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={manualLoading}
                                onClick={() => setManualOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={manualLoading}
                                className="inline-flex gap-2"
                                onClick={() => void submitManualLead()}
                            >
                                {manualLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Guardando…
                                    </>
                                ) : (
                                    'Guardar'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : (
                    <DragDropContext onDragEnd={(r) => void onDragEnd(r)}>
                        <div className="flex min-h-[58vh] gap-3 overflow-x-auto pb-2">
                            {stages.map((stage) => {
                                const accent =
                                    COLUMN_ACCENT[
                                        (stage.sort_order - 1) %
                                            COLUMN_ACCENT.length
                                    ] ?? 'border-l-arc';

                                return (
                                    <Droppable
                                        key={stage.id}
                                        droppableId={String(stage.id)}
                                    >
                                        {(provided, snap) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={cn(
                                                    'glass-panel flex w-72 shrink-0 flex-col rounded-2xl transition-[box-shadow] duration-300 dark:border-arc/15 dark:bg-nebula/25 dark:shadow-[0_8px_32px_rgba(13,7,32,0.35)]',
                                                    accent,
                                                    snap.isDraggingOver &&
                                                        'ring-2 ring-arc/50 ring-offset-2 ring-offset-transparent dark:shadow-[0_0_24px_rgba(155,110,245,0.25)]',
                                                )}
                                            >
                                                <div className="border-b border-border px-3 py-2">
                                                    <h2 className="text-sm font-semibold text-foreground">
                                                        {stage.name}
                                                    </h2>
                                                    <p className="text-xs text-muted-foreground">
                                                        {stage.leads.length} tarjetas
                                                    </p>
                                                </div>
                                                <div className="flex flex-1 flex-col gap-2 p-2">
                                                    {stage.leads.map(
                                                        (lead, index) => {
                                                            const ix =
                                                                lastChannel(lead);

                                                            return (
                                                                <Draggable
                                                                    key={lead.id}
                                                                    draggableId={String(
                                                                        lead.id,
                                                                    )}
                                                                    index={index}
                                                                >
                                                                    {(p, s) => (
                                                                        <div
                                                                            ref={
                                                                                p.innerRef
                                                                            }
                                                                            {...p.draggableProps}
                                                                            {...p.dragHandleProps}
                                                                            className={cn(
                                                                                // No transition-all: @hello-pangea/dnd drives transform in real time; animating it breaks drag/drop.
                                                                                'cursor-grab rounded-lg border border-border/50 bg-background/80 p-3 text-left shadow-md backdrop-blur-md transition-[border-color,box-shadow,opacity] duration-200 hover:border-primary/25 hover:shadow-lg active:cursor-grabbing dark:border-arc/12 dark:bg-abyss/45 dark:hover:border-arc/35 dark:hover:shadow-md',
                                                                                s.isDragging &&
                                                                                    'ring-2 ring-plasma/60 shadow-xl',
                                                                            )}
                                                                            onClick={() =>
                                                                                void openDetail(
                                                                                    lead.id,
                                                                                )
                                                                            }
                                                                        >
                                                                            <div className="flex gap-2">
                                                                                <div
                                                                                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary"
                                                                                >
                                                                                    {initials(
                                                                                        lead.name,
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <p className="truncate font-medium text-foreground">
                                                                                            {
                                                                                                lead.name
                                                                                            }
                                                                                        </p>
                                                                                        <span
                                                                                            className={cn(
                                                                                                'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                                                                                scoreClass(
                                                                                                    lead.score,
                                                                                                ),
                                                                                            )}
                                                                                        >
                                                                                            {
                                                                                                lead.score
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                                        {lead.company ??
                                                                                            'Sin empresa'}
                                                                                    </p>
                                                                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                                        {ix?.type ===
                                                                                        'whatsapp' ? (
                                                                                            <MessageCircle className="size-3.5 text-tealray" />
                                                                                        ) : ix?.type ===
                                                                                          'email' ? (
                                                                                            <Mail className="size-3.5 text-cryoblue" />
                                                                                        ) : (
                                                                                            <span className="size-3.5" />
                                                                                        )}
                                                                                        <span>
                                                                                            {ix
                                                                                                ? `${ix.type} · ${timeAgo(ix.created_at)}`
                                                                                                : `act. ${timeAgo(lead.updated_at)}`}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-2 flex gap-2 border-t border-border pt-2">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    className="h-7 flex-1 text-xs"
                                                                                    onClick={(
                                                                                        ev,
                                                                                    ) => {
                                                                                        ev.stopPropagation();
                                                                                        void runAgent(
                                                                                            lead.id,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <Bot className="size-3.5" />
                                                                                    Agente
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        },
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </div>
                    </DragDropContext>
                )}

                <Sheet
                    open={sheetOpen}
                    onOpenChange={(o) => {
                        setSheetOpen(o);

                        if (!o) {
                            setSelectedLeadId(null);
                            setDetail(null);
                        }
                    }}
                >
                    <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-arc/20 bg-card sm:max-w-lg md:max-w-xl dark:bg-gradient-to-b dark:from-nebula/45 dark:to-void/95 dark:backdrop-blur-2xl">
                        <SheetHeader className="border-b border-border pb-4 text-left">
                            <SheetTitle className="pr-8">
                                {detail?.lead?.name ?? 'Lead'}
                            </SheetTitle>
                            <SheetDescription className="text-left">
                                Detalle del lead, historial y acciones.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
                            {tabBtn('resumen', 'Resumen')}
                            {tabBtn('timeline', 'Timeline')}
                            {tabBtn('chat', 'Chat')}
                            {tabBtn('logs', 'Registro')}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
                            {!detail?.lead ? (
                                <p className="text-muted-foreground">
                                    Cargando…
                                </p>
                            ) : sheetTab === 'resumen' ? (
                                <div className="space-y-3">
                                    <p>
                                        <span className="text-muted-foreground">
                                            Email
                                        </span>
                                        <br />
                                        {detail.lead.email ?? '—'}
                                    </p>
                                    <p>
                                        <span className="text-muted-foreground">
                                            Teléfono
                                        </span>
                                        <br />
                                        {detail.lead.phone ?? '—'}
                                    </p>
                                    <p>
                                        <span className="text-muted-foreground">
                                            Origen
                                        </span>
                                        <br />
                                        {detail.lead.source}
                                    </p>

                                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                                        <p className="text-xs font-medium text-foreground">
                                            Alleria (OpenClaw)
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Envío autorizado desde el CRM (token
                                            del gateway = operador). Opcional en
                                            .env:{' '}
                                            <code className="text-[10px]">
                                                OPENCLAW_COMMS_OWNER_AGENT_ID=amo
                                            </code>{' '}
                                            si tu gateway exige contexto amo.
                                        </p>

                                        <div className="space-y-2 border-t border-border pt-3">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                WhatsApp
                                            </p>
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="comms-wa-phone"
                                                    className="text-xs"
                                                >
                                                    Teléfono
                                                </Label>
                                                <Input
                                                    id="comms-wa-phone"
                                                    value={commsWaPhone}
                                                    onChange={(e) =>
                                                        setCommsWaPhone(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="+502…"
                                                    disabled={commsWaBusy}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="comms-wa-msg"
                                                    className="text-xs"
                                                >
                                                    Mensaje
                                                </Label>
                                                <textarea
                                                    id="comms-wa-msg"
                                                    value={commsWaMessage}
                                                    onChange={(e) =>
                                                        setCommsWaMessage(
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={3}
                                                    disabled={commsWaBusy}
                                                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    placeholder="Texto a enviar…"
                                                />
                                            </div>
                                            <label className="flex cursor-pointer items-start gap-2 text-xs">
                                                <Checkbox
                                                    checked={commsWaRefineAi}
                                                    disabled={commsWaBusy}
                                                    onCheckedChange={(v) =>
                                                        setCommsWaRefineAi(
                                                            v === true,
                                                        )
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <span>
                                                    Dejar que la IA mejore el
                                                    texto antes de enviar
                                                    (OpenAI → luego Alleria)
                                                </span>
                                            </label>
                                            {commsWaErr ? (
                                                <p className="text-xs text-jira-danger">
                                                    {commsWaErr}
                                                </p>
                                            ) : null}
                                            {commsWaOk ? (
                                                <p className="text-xs whitespace-pre-wrap text-jira-success">
                                                    {commsWaOk}
                                                </p>
                                            ) : null}
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="inline-flex w-full gap-2"
                                                disabled={commsWaBusy}
                                                onClick={() =>
                                                    void sendCommsWhatsapp()
                                                }
                                            >
                                                {commsWaBusy ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        Enviando…
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="size-4" />
                                                        Enviar WhatsApp
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className="space-y-2 border-t border-border pt-3">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Correo
                                            </p>
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="comms-email-to"
                                                    className="text-xs"
                                                >
                                                    Para
                                                </Label>
                                                <Input
                                                    id="comms-email-to"
                                                    type="email"
                                                    value={commsEmailTo}
                                                    onChange={(e) =>
                                                        setCommsEmailTo(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="correo@…"
                                                    disabled={commsEmailBusy}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="comms-email-sub"
                                                    className="text-xs"
                                                >
                                                    Asunto
                                                </Label>
                                                <Input
                                                    id="comms-email-sub"
                                                    value={commsEmailSubject}
                                                    onChange={(e) =>
                                                        setCommsEmailSubject(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={commsEmailBusy}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor="comms-email-body"
                                                    className="text-xs"
                                                >
                                                    Cuerpo
                                                </Label>
                                                <textarea
                                                    id="comms-email-body"
                                                    value={commsEmailBody}
                                                    onChange={(e) =>
                                                        setCommsEmailBody(
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={4}
                                                    disabled={commsEmailBusy}
                                                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <label className="flex cursor-pointer items-start gap-2 text-xs">
                                                <Checkbox
                                                    checked={commsEmailRefineAi}
                                                    disabled={commsEmailBusy}
                                                    onCheckedChange={(v) =>
                                                        setCommsEmailRefineAi(
                                                            v === true,
                                                        )
                                                    }
                                                    className="mt-0.5"
                                                />
                                                <span>
                                                    Dejar que la IA mejore
                                                    asunto y cuerpo antes de
                                                    enviar (OpenAI → luego
                                                    Alleria)
                                                </span>
                                            </label>
                                            {commsEmailErr ? (
                                                <p className="text-xs text-jira-danger">
                                                    {commsEmailErr}
                                                </p>
                                            ) : null}
                                            {commsEmailOk ? (
                                                <p className="text-xs whitespace-pre-wrap text-jira-success">
                                                    {commsEmailOk}
                                                </p>
                                            ) : null}
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                className="inline-flex w-full gap-2"
                                                disabled={commsEmailBusy}
                                                onClick={() =>
                                                    void sendCommsEmail()
                                                }
                                            >
                                                {commsEmailBusy ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        Enviando…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="size-4" />
                                                        Enviar correo
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() =>
                                            void runAgent(detail.lead.id)
                                        }
                                    >
                                        <Bot className="size-4" />
                                        Ejecutar agente
                                    </Button>
                                </div>
                            ) : sheetTab === 'timeline' ? (
                                <ul className="space-y-3 border-l border-border pl-3">
                                    {(
                                        detail.lead.interactions ?? []
                                    ).map((i) => (
                                        <li
                                            key={i.id}
                                            className="text-xs text-muted-foreground"
                                        >
                                            <span className="font-mono text-[10px] text-primary">
                                                {i.type} · {i.direction}
                                            </span>
                                            <span className="ml-2 text-[10px]">
                                                {timeAgo(i.created_at)}
                                            </span>
                                            <p className="mt-0.5 text-foreground">
                                                {i.content ?? '—'}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : sheetTab === 'chat' ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Escribe instrucciones para el agente con
                                        el contexto de este lead.
                                    </p>
                                    {chatError ? (
                                        <p className="text-xs text-jira-danger">
                                            {chatError}
                                        </p>
                                    ) : null}
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) =>
                                            setChatInput(e.target.value)
                                        }
                                        rows={4}
                                        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="Ej.: Resume el lead y sugiere el siguiente paso."
                                    />
                                    <Button
                                        type="button"
                                        disabled={chatBusy}
                                        onClick={() => void sendChat()}
                                    >
                                        {chatBusy ? 'Enviando…' : 'Enviar'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-muted-foreground">
                                        Últimas respuestas y acciones del agente.
                                    </p>
                                    {(detail.lead.agent_logs ?? []).length ===
                                    0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            Aún no hay registro. Usa «Ejecutar
                                            agente» o la pestaña Chat.
                                        </p>
                                    ) : (
                                        (detail.lead.agent_logs ?? []).map(
                                            (log) => (
                                                <div
                                                    key={log.id}
                                                    className="rounded-md border border-border bg-muted/20 p-3 text-xs"
                                                >
                                                    <p className="font-mono text-[10px] text-muted-foreground">
                                                        {log.created_at}
                                                    </p>
                                                    <p className="mt-2 whitespace-pre-wrap text-foreground">
                                                        {log.response ?? '—'}
                                                    </p>
                                                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2 text-[10px] text-muted-foreground">
                                                        {JSON.stringify(
                                                            log.tool_calls,
                                                            null,
                                                            2,
                                                        )}
                                                    </pre>
                                                </div>
                                            ),
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}

CrmKanban.layout = {
    breadcrumbs: [
        { title: 'Embudo CRM', href: kanbanRoute.url() },
    ],
};
