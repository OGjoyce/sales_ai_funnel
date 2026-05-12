import { Head, Link, usePage } from '@inertiajs/react';
import * as echarts from 'echarts';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { crmFetch } from '@/lib/crm-api';

type StageRow = { id: number; name: string; count: number };

type ConversionRow = {
    from_stage_id: number;
    to_stage_id: number;
    from: string;
    to: string;
    rate: number | null;
};

export default function CrmMetrics() {
    const { csrf_token: csrfToken } = usePage().props as { csrf_token: string };

    const [stages, setStages] = useState<StageRow[]>([]);
    const [conversions, setConversions] = useState<ConversionRow[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chartEl = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const res = await crmFetch(csrfToken, '/metrics/funnel', { method: 'GET' });
        const d = await res.json().catch(() => ({}));

        if (!res.ok) {
            setError(d.error ?? 'No se pudieron cargar métricas.');
            setStages([]);
            setConversions([]);
            setTotal(0);
            setLoading(false);
            return;
        }

        setStages(d.stages ?? []);
        setConversions(d.conversions ?? []);
        setTotal(d.total_leads ?? 0);
        setLoading(false);
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const chartData = useMemo(
        () => (stages ?? []).map((s) => ({ name: s.name, value: s.count })),
        [stages],
    );

    useEffect(() => {
        if (!chartEl.current) return;

        if (!chartRef.current) {
            chartRef.current = echarts.init(chartEl.current);
        }

        const chart = chartRef.current;

        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (p: any) => `${p.name}: <b>${p.value}</b>`,
            },
            series: [
                {
                    name: 'Funnel',
                    type: 'funnel',
                    orient: 'horizontal',
                    left: 16,
                    right: 16,
                    top: 16,
                    bottom: 16,
                    height: 'auto',
                    min: 0,
                    sort: 'none',
                    gap: 8,
                    label: {
                        show: true,
                        position: 'inside',
                        color: '#241818',
                        fontWeight: 600,
                        fontSize: 11,
                        formatter: (p: any) => `${p.name}\n${p.value}`,
                    },
                    labelLine: { show: false },
                    itemStyle: {
                        borderColor: 'rgba(36, 24, 24, 0.10)',
                        borderWidth: 1,
                        shadowBlur: 24,
                        shadowColor: 'rgba(5, 5, 6, 0.08)',
                    },
                    emphasis: {
                        label: { fontSize: 14 },
                    },
                    color: [
                        'rgba(107, 31, 42, 0.28)',
                        'rgba(107, 31, 42, 0.22)',
                        'rgba(107, 31, 42, 0.18)',
                        'rgba(107, 31, 42, 0.14)',
                        'rgba(107, 31, 42, 0.10)',
                    ],
                    data: chartData,
                },
            ],
        });

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [chartData]);

    const fmtPct = (rate: number | null) => {
        if (rate == null) return '—';
        return `${(rate * 100).toFixed(1)}%`;
    };

    return (
        <>
            <Head title="Métricas" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            Métricas
                        </h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Conversión por etapas del embudo (visual) + ratios entre pasos.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/crm/kanban">
                                <ArrowLeft className="size-4" />
                                Volver
                            </Link>
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void load()}
                            disabled={loading}
                        >
                            <RefreshCw className="size-4" />
                            Refrescar
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="glass-panel rounded-2xl p-4 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="glass-panel p-5 lg:col-span-2">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <BarChart3 className="size-4 text-primary" />
                                Funnel visual (ECharts)
                            </h2>
                            <span className="text-xs text-muted-foreground">
                                Total leads: <b className="text-foreground">{total}</b>
                            </span>
                        </div>
                        <div
                            ref={chartEl}
                            className="h-[340px] w-full rounded-2xl border border-border/60 bg-background/60"
                        />
                    </section>

                    <section className="glass-panel p-5">
                        <h2 className="mb-3 text-sm font-semibold">Etapas</h2>
                        <ul className="space-y-2">
                            {(stages ?? []).map((s) => (
                                <li
                                    key={s.id}
                                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                                >
                                    <span className="text-muted-foreground">
                                        {s.name}
                                    </span>
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {s.count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <section className="glass-panel p-5">
                    <h2 className="mb-3 text-sm font-semibold">Conversión entre pasos</h2>
                    {conversions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Aún no hay suficientes etapas o leads para calcular conversión.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background/60">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-border/60">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">De</th>
                                        <th className="px-3 py-2 font-semibold">A</th>
                                        <th className="px-3 py-2 font-semibold">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conversions.map((c) => (
                                        <tr key={`${c.from_stage_id}-${c.to_stage_id}`} className="border-b border-border/40 last:border-0">
                                            <td className="px-3 py-2 text-muted-foreground">{c.from}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{c.to}</td>
                                            <td className="px-3 py-2 font-semibold text-foreground tabular-nums">{fmtPct(c.rate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

CrmMetrics.layout = {
    breadcrumbs: [{ title: 'Métricas', href: '/crm/metrics' }],
};
