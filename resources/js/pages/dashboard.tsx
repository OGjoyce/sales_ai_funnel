import { Head, Link, usePage } from '@inertiajs/react';
import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { crmFetch } from '@/lib/crm-api';
import { dashboard } from '@/routes';
import { kanban } from '@/routes/crm';

type FunnelStageRef = {
    id: number;
    name: string;
};

type ApiLead = {
    id: number;
    name: string;
    email: string | null;
    company: string | null;
    score: number;
    updated_at: string;
    funnel_stage?: FunnelStageRef | null;
};

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

export default function Dashboard() {
    const { csrf_token: csrfToken } = usePage().props as {
        csrf_token: string;
    };
    const [leads, setLeads] = useState<ApiLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await crmFetch(csrfToken, '/leads', { method: 'GET' });

        if (!res.ok) {
            setError('No se pudieron cargar los leads.');
            setLeads([]);
            setLoading(false);

            return;
        }

        const data = (await res.json()) as { leads?: ApiLead[] };
        const list = data.leads ?? [];
        list.sort(
            (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
        );
        setLeads(list.slice(0, 25));
        setLoading(false);
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const leadToDelete = leads.find((l) => l.id === deleteId) ?? null;

    async function confirmDelete() {
        if (deleteId == null) {
            return;
        }

        setDeleting(true);
        setDeleteError(null);
        const res = await crmFetch(csrfToken, `/leads/${deleteId}`, {
            method: 'DELETE',
        });
        setDeleting(false);

        if (!res.ok) {
            setDeleteError('No se pudo eliminar el lead. Inténtalo de nuevo.');

            return;
        }

        setLeads((prev) => prev.filter((l) => l.id !== deleteId));
        setDeleteId(null);
    }

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">
                            Panel
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vista rápida de leads y acciones.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={kanban()}>Ir al embudo CRM</Link>
                    </Button>
                </div>

                <Card className="border-border/70 dark:border-arc/15 dark:bg-gradient-to-b dark:from-nebula/25 dark:to-abyss/40">
                    <CardHeader>
                        <CardTitle>Leads recientes</CardTitle>
                        <CardDescription>
                            Últimos contactos ordenados por actividad. Puedes
                            eliminarlos aquí; también siguen visibles en el
                            kanban hasta que borres o recargues allí.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Cargando…
                            </p>
                        ) : error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : leads.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aún no hay leads. Crea uno desde el embudo o
                                importa datos.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/60 dark:border-arc/10">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead className="border-b border-border bg-muted/50 dark:border-arc/10 dark:bg-abyss/40">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">
                                                Nombre
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                                Empresa
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                                Etapa
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                                Score
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                                Actividad
                                            </th>
                                            <th className="w-24 px-3 py-2 text-right font-medium">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leads.map((lead) => (
                                            <tr
                                                key={lead.id}
                                                className="border-b border-border/60 last:border-0 dark:border-arc/5"
                                            >
                                                <td className="px-3 py-2.5 font-medium text-foreground">
                                                    {lead.name}
                                                </td>
                                                <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">
                                                    {lead.company ?? '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-muted-foreground">
                                                    {lead.funnel_stage
                                                        ?.name ?? '—'}
                                                </td>
                                                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                                                    {lead.score}
                                                </td>
                                                <td className="px-3 py-2.5 text-muted-foreground">
                                                    {timeAgo(lead.updated_at)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            setDeleteError(
                                                                null,
                                                            );
                                                            setDeleteId(
                                                                lead.id,
                                                            );
                                                        }}
                                                        aria-label={`Eliminar ${lead.name}`}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={deleteId != null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteId(null);
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Eliminar lead</DialogTitle>
                        <DialogDescription>
                            {leadToDelete
                                ? `¿Seguro que quieres eliminar a «${leadToDelete.name}»? Esta acción no se puede deshacer.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError ? (
                        <p className="text-sm text-destructive">{deleteError}</p>
                    ) : null}
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={deleting}
                            onClick={() => setDeleteId(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleting}
                            onClick={() => void confirmDelete()}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Eliminando…
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
