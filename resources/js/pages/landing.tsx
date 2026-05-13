import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bot,
    LayoutGrid,
    Mail,
    MessageCircle,
    ShieldCheck,
    Sparkles,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import { kanban } from '@/routes/crm';

const benefits = [
    {
        icon: LayoutGrid,
        title: 'Embudo claro, siempre',
        description:
            'Kanban simple para que nunca pierdas un lead: etapas, prioridades y contexto en un solo lugar.',
    },
    {
        icon: Bot,
        title: 'IA con tus datos',
        description:
            'El asistente trabaja sobre tu catálogo, historial del lead y notas: respuestas más útiles, menos inventos.',
    },
    {
        icon: MessageCircle,
        title: 'Conversaciones alineadas al cierre',
        description:
            'WhatsApp y email enfocados en el siguiente paso: calificar, cotizar, cobrar y entregar.',
    },
    {
        icon: Zap,
        title: 'Velocidad operativa',
        description:
            'Menos fricción: plantillas, seguimiento, y un flujo que empuja a “ID + decisión”.',
    },
] as const;

const steps = [
    {
        title: 'Captura',
        description:
            'Entra el lead desde campañas, formularios o WhatsApp. Todo cae al mismo embudo.',
    },
    {
        title: 'Califica',
        description:
            'La IA pregunta lo mínimo: presupuesto, urgencia, producto/ID y datos de entrega.',
    },
    {
        title: 'Cierra',
        description:
            'Envía opciones, confirma detalles y deja el handoff humano listo cuando toca.',
    },
] as const;

const testimonials = [
    {
        quote: '“Pasamos de perder chats a cerrar con orden: cada lead tiene contexto y siguiente paso.”',
        name: 'Operaciones comerciales',
        title: 'Equipo de ventas',
    },
    {
        quote: '“La IA dejó de responder genérico: ahora usa catálogo, historial y reglas de negocio.”',
        name: 'Owner / Founder',
        title: 'Negocio D2C',
    },
    {
        quote: '“El embudo es rápido y se ve premium. La landing por sí sola ya vende confianza.”',
        name: 'Sales lead',
        title: 'Servicios',
    },
] as const;

const faqs = [
    {
        q: '¿Se puede usar solo por WhatsApp?',
        a: 'Sí. Puedes operar como “WhatsApp-first”: el embudo organiza, la IA califica y el cierre ocurre por chat.',
    },
    {
        q: '¿La IA puede inventar información?',
        a: 'La configuramos para responder solo con datos del sistema (catálogo/lead) y pedir confirmación cuando falte algo.',
    },
    {
        q: '¿Puedo registrar leads en Google Sheets?',
        a: 'Sí. Se puede guardar el lead calificado en una hoja (nombre, teléfono, producto/ID, dirección, etc.).',
    },
    {
        q: '¿Es rápido en móvil?',
        a: 'Sí. La landing y el CRM se diseñan mobile-first: CTAs grandes, lectura clara y carga ligera.',
    },
    {
        q: '¿Qué necesito para empezar?',
        a: 'Un catálogo (CSV/Sheet), tus etapas del embudo y reglas de cierre (ej. depósito/entrega).',
    },
] as const;

function SectionTitle({
    kicker,
    title,
    subtitle,
}: {
    kicker?: string;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="mx-auto max-w-3xl text-center">
            {kicker ? (
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                    <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(107,31,42,0.35)]" />
                    {kicker}
                </p>
            ) : null}
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
                {title}
            </h2>
            {subtitle ? (
                <p className="mx-auto mt-3 max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">
                    {subtitle}
                </p>
            ) : null}
        </div>
    );
}

export default function Landing({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth, name } = usePage().props as {
        auth: { user: unknown };
        name: string;
    };
    const appName = typeof name === 'string' ? name : 'Sales AI Funnel';
    const isAuth = Boolean(auth?.user);

    const primaryCtaHref = isAuth
        ? kanban()
        : canRegister
          ? register()
          : login();
    const primaryCtaLabel = isAuth
        ? 'Abrir embudo'
        : canRegister
          ? 'Comenzar'
          : 'Entrar';

    return (
        <>
            <Head title={appName} />
            <div className="relative min-h-svh overflow-x-hidden">
                {/* Background */}
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                >
                    <div className="absolute -top-40 left-1/2 h-[34rem] w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl" />
                    <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
                </div>

                {/* Header */}
                <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-border">
                                <Sparkles className="size-4" />
                            </span>
                            <span className="font-semibold tracking-tight text-foreground">
                                {appName}
                            </span>
                        </div>
                        <nav className="flex items-center gap-2 sm:gap-3">
                            {isAuth ? (
                                <>
                                    <Link
                                        href={dashboard()}
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Panel
                                    </Link>
                                    <Link
                                        href={kanban()}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-[box-shadow,opacity] hover:opacity-95"
                                    >
                                        Ir al CRM
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Iniciar sesión
                                    </Link>
                                    <Link
                                        href={primaryCtaHref}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-[box-shadow,opacity] hover:opacity-95"
                                    >
                                        {primaryCtaLabel}
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="relative z-10">
                    {/* 1) HERO */}
                    <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
                        <div className="mx-auto max-w-3xl animate-in text-center duration-700 fade-in slide-in-from-bottom-2">
                            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                                <ShieldCheck className="size-3.5 text-primary" />
                                Embudo + IA + multicanal (WhatsApp-first)
                            </p>
                            <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
                                Paz mental para
                                <span className="text-primary">
                                    {' '}
                                    vender mejor
                                </span>
                            </h1>
                            <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
                                Vender es más fácil cuando tu embudo, tu
                                catálogo y tus chats viven en un solo sistema:
                                claro, elegante y rápido.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    href={primaryCtaHref}
                                    className="premium-shimmer-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-95"
                                >
                                    {primaryCtaLabel}
                                    <ArrowRight className="size-4" />
                                </Link>
                                <Link
                                    href={isAuth ? kanban() : login()}
                                    className="premium-outline inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold text-foreground"
                                >
                                    Ver demo
                                </Link>
                            </div>

                            {/* Trust micro-proof */}
                            <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                    <ShieldCheck className="size-3.5 text-primary" />
                                    Reglas anti-inventos
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <Zap className="size-3.5 text-primary" />
                                    Setup rápido
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <MessageCircle className="size-3.5 text-primary" />
                                    WhatsApp-first
                                </span>
                            </div>

                            {/* 2) Social proof */}
                            <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
                                {[
                                    'Seguimiento',
                                    'Kanban',
                                    'Catálogo',
                                    'Handoff humano',
                                ].map((label) => (
                                    <div
                                        key={label}
                                        className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md motion-reduce:hover:translate-y-0"
                                    >
                                        <span className="block text-xs font-semibold tracking-wide text-foreground">
                                            {label}
                                        </span>
                                        <span className="mt-1 block text-xs">
                                            Hecho para cerrar
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3) Visuals / product in action */}
                        <div className="mx-auto mt-12 max-w-5xl animate-in duration-700 fill-mode-both [animation-delay:200ms] fade-in slide-in-from-bottom-2">
                            <div className="grid gap-4 md:grid-cols-12">
                                <div className="md:col-span-7">
                                    <div className="glass-panel relative overflow-hidden rounded-3xl">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6" />
                                        <img
                                            src="/landing/Screenshot_20260512_102554.png"
                                            alt="Dashboard premium"
                                            className="h-[22rem] w-full object-cover opacity-95"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:col-span-5">
                                    <div className="glass-panel relative overflow-hidden rounded-3xl">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6" />
                                        <img
                                            src="/landing/Screenshot_20260512_102707.png"
                                            alt="Insights"
                                            className="h-44 w-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="glass-panel relative overflow-hidden rounded-3xl">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6" />
                                        <img
                                            src="/landing/Screenshot_20260512_102707.png"
                                            alt="Automation"
                                            className="h-44 w-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4) Benefits */}
                    <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
                        <SectionTitle
                            kicker="Beneficios"
                            title="Diseñado para conversión y operación"
                            subtitle="No es solo bonito: cada sección empuja al usuario a decidir, y cada pantalla reduce fricción."
                        />

                        <div className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {benefits.map((b, i) => (
                                <article
                                    key={b.title}
                                    className={cn(
                                        'glass-panel group relative overflow-hidden rounded-2xl p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_70px_rgba(5,5,6,0.10)] motion-reduce:hover:translate-y-0',
                                        'animate-in fill-mode-both fade-in slide-in-from-bottom-2',
                                    )}
                                    style={{
                                        animationDelay: `${100 + i * 75}ms`,
                                        animationDuration: '600ms',
                                    }}
                                >
                                    <b.icon className="mb-3 size-9 rounded-xl bg-background/70 p-2 text-primary ring-1 ring-border" />
                                    <h3 className="font-semibold text-foreground">
                                        {b.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {b.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    {/* 5) How it works */}
                    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <SectionTitle
                            kicker="Cómo funciona"
                            title="Tres pasos, cero drama"
                            subtitle="Un flujo que se entiende rápido y se ejecuta aún más rápido."
                        />
                        <div className="mx-auto mt-10 grid gap-4 lg:grid-cols-3">
                            {steps.map((s, idx) => (
                                <div
                                    key={s.title}
                                    className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-lg backdrop-blur"
                                >
                                    <div className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-border">
                                        <span className="text-sm font-semibold">
                                            {idx + 1}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {s.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {s.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5.5) Integrations + ICP */}
                    <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
                        <SectionTitle
                            kicker="Encaje"
                            title="Hecho para negocios con volumen de chats"
                            subtitle="Si vendes por WhatsApp, DM o email, esto te da orden: pipeline, catálogo, contexto y seguimiento."
                        />

                        <div className="mx-auto mt-10 grid gap-4 lg:grid-cols-12">
                            <div className="glass-panel lg:col-span-7 rounded-3xl p-6">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Ideal para
                                </h3>
                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        {
                                            title: 'D2C / Catálogo',
                                            desc: 'Muchos SKUs, cotización rápida, seguimiento y handoff.',
                                        },
                                        {
                                            title: 'Servicios',
                                            desc: 'Calificación, agenda, propuesta, y “siguiente paso” claro.',
                                        },
                                        {
                                            title: 'Operaciones',
                                            desc: 'Estandariza respuestas, reduce errores y acelera cierres.',
                                        },
                                        {
                                            title: 'Equipos pequeños',
                                            desc: 'Un inbox + reglas + pipeline para no perder oportunidades.',
                                        },
                                    ].map((it) => (
                                        <li
                                            key={it.title}
                                            className="rounded-2xl border border-border/60 bg-card/60 p-4"
                                        >
                                            <p className="text-sm font-semibold text-foreground">
                                                {it.title}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {it.desc}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="glass-panel lg:col-span-5 rounded-3xl p-6">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Integraciones típicas
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Conecta los canales donde ya vendes. (Disponibles según tu
                                    proveedor y flujo.)
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {[
                                        { icon: MessageCircle, label: 'WhatsApp' },
                                        { icon: Mail, label: 'Email / Gmail' },
                                        { icon: LayoutGrid, label: 'Sheets (registro)' },
                                        { icon: Zap, label: 'Webhooks / API' },
                                    ].map((chip) => (
                                        <span
                                            key={chip.label}
                                            className="premium-outline inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-foreground"
                                        >
                                            <chip.icon className="size-3.5 text-primary" />
                                            {chip.label}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-4">
                                    <p className="text-xs font-semibold text-foreground">
                                        Señal de sistema premium
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Cada lead vive en una ficha con contexto, estado y la
                                        acción recomendada (no “mensajes sueltos”).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 6) Testimonials */}
                    <section className="border-y border-border/60 bg-muted/25 py-16">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <SectionTitle
                                kicker="Confianza"
                                title="Se siente premium porque está pensado como sistema"
                                subtitle="Menos improvisación, más cierre."
                            />
                            <div className="mt-10 grid gap-4 lg:grid-cols-3">
                                {testimonials.map((t) => (
                                    <figure
                                        key={t.name}
                                        className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-lg backdrop-blur"
                                    >
                                        <blockquote className="text-sm leading-relaxed text-foreground">
                                            {t.quote}
                                        </blockquote>
                                        <figcaption className="mt-4 text-xs text-muted-foreground">
                                            <span className="font-semibold text-foreground">
                                                {t.name}
                                            </span>
                                            {' — '}
                                            {t.title}
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 7) Pricing / Offer */}
                    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <SectionTitle
                            kicker="Oferta"
                            title="Planes claros (sin sorpresas)"
                            subtitle="Puedes empezar simple y escalar cuando el embudo ya esté funcionando."
                        />
                        <div className="mt-10 grid gap-4 lg:grid-cols-3">
                            {[
                                {
                                    title: 'Starter',
                                    price: 'Demo',
                                    items: [
                                        'Kanban + etapas',
                                        'Leads manuales',
                                        'Catálogo básico',
                                    ],
                                },
                                {
                                    title: 'Pro',
                                    price: 'Recomendado',
                                    items: [
                                        'IA en el CRM',
                                        'Plantillas de seguimiento',
                                        'Handoff humano',
                                    ],
                                },
                                {
                                    title: 'Ops',
                                    price: 'WhatsApp-first',
                                    items: [
                                        'WhatsApp-first',
                                        'Reglas de calificación',
                                        'Logging a Sheets',
                                    ],
                                },
                            ].map((p) => (
                                <div
                                    key={p.title}
                                    className={cn(
                                        'rounded-3xl border border-border/60 bg-card/60 p-6 shadow-lg backdrop-blur',
                                        p.title === 'Pro'
                                            ? 'ring-1 ring-primary/25'
                                            : '',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {p.title}
                                        </h3>
                                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                            {p.price}
                                        </span>
                                    </div>
                                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                                        {p.items.map((it) => (
                                            <li
                                                key={it}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="mt-1 size-1.5 rounded-full bg-primary" />
                                                <span>{it}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={primaryCtaHref}
                                        className="premium-shimmer-ring mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-95"
                                    >
                                        Empezar
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 8) FAQ */}
                    <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
                        <SectionTitle
                            kicker="FAQ"
                            title="Respuestas rápidas"
                            subtitle="Lo que normalmente bloquea un cierre, aquí se responde antes."
                        />
                        <div className="mt-10 grid gap-4 lg:grid-cols-2">
                            {faqs.map((f) => (
                                <div
                                    key={f.q}
                                    className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-lg backdrop-blur"
                                >
                                    <h3 className="font-semibold text-foreground">
                                        {f.q}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {f.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 9) Final CTA */}
                    <section className="border-t border-border/60 bg-muted/25 py-16">
                        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6">
                            <Mail className="size-10 text-primary" />
                            <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                ¿Listo para ordenar tu funnel?
                            </h2>
                            <p className="max-w-md text-sm text-muted-foreground">
                                Entra, configura tus etapas y deja que la IA
                                haga el trabajo repetitivo.
                            </p>
                            <Link
                                href={primaryCtaHref}
                                className="premium-shimmer-ring inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-95"
                            >
                                {primaryCtaLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </section>

                    {/* 10) Footer */}
                    <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
                        <p>
                            © {new Date().getFullYear()} {appName}. Elegant
                            funnel skin: corinto + crema + negro.
                        </p>
                    </footer>
                </main>
            </div>
        </>
    );
}
