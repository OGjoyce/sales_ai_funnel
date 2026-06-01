import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Cloud,
    Code2,
    Cpu,
    Layers,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { home, login, register } from '@/routes';
import { kanban } from '@/routes/crm';

const stack = [
    {
        name: 'AWS',
        role: 'Infraestructura',
        description:
            'Despliegue en la nube: cómputo, red, SSL y operación del entorno de producción.',
        group: 'infra',
    },
    {
        name: 'Laravel',
        role: 'Backend',
        description:
            'API, autenticación, embudo CRM, colas, integraciones y lógica de negocio.',
        group: 'app',
    },
    {
        name: 'React',
        role: 'Frontend',
        description:
            'Interfaz del CRM: kanban, productos, agentes y experiencia de usuario.',
        group: 'app',
    },
    {
        name: 'Vite',
        role: 'Build',
        description:
            'Compilación rápida de assets, HMR en desarrollo y bundles optimizados.',
        group: 'app',
    },
    {
        name: 'OpenClaw',
        role: 'Agentes',
        description:
            'Gateway de agentes (Lina, Fernando): herramientas, workspaces y orquestación.',
        group: 'ai',
    },
    {
        name: 'OpenAI',
        role: 'Modelos',
        description:
            'Chat, embeddings y generación para el agente de ventas y la base de conocimiento.',
        group: 'ai',
    },
    {
        name: 'Anthropic',
        role: 'Modelos',
        description:
            'Modelos Claude disponibles en el stack de agentes cuando el flujo lo requiere.',
        group: 'ai',
    },
] as const;

const groupLabels: Record<string, string> = {
    infra: 'Infraestructura',
    app: 'Aplicación',
    ai: 'Inteligencia artificial',
};

function StackCard({
    name,
    role,
    description,
}: {
    name: string;
    role: string;
    description: string;
}) {
    return (
        <div className="premium-surface rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md motion-reduce:hover:translate-y-0">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-foreground">
                        {name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-primary">
                        {role}
                    </p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border/60">
                    <Layers className="size-4" />
                </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {description}
            </p>
        </div>
    );
}

export default function About({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth, name } = usePage().props as {
        auth: { user: unknown };
        name: string;
    };
    const appName = typeof name === 'string' ? name : 'Velora';
    const isAuth = Boolean(auth?.user);

    const ctaHref = isAuth
        ? kanban()
        : canRegister
          ? register()
          : login();
    const ctaLabel = isAuth ? 'Ir al CRM' : canRegister ? 'Comenzar' : 'Entrar';

    const groups = ['infra', 'app', 'ai'] as const;

    return (
        <>
            <Head title={`Sobre nosotros — ${appName}`} />
            <div className="relative min-h-svh overflow-x-hidden">
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                >
                    <div className="absolute -top-40 left-1/2 h-[34rem] w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl" />
                </div>

                <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 shadow-[0_1px_0_rgba(36,24,24,0.06)] backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <Link
                            href={home()}
                            className="flex items-center gap-2 transition-opacity hover:opacity-80"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-border">
                                <Sparkles className="size-4" />
                            </span>
                            <span className="font-semibold tracking-tight text-foreground">
                                {appName}
                            </span>
                        </Link>
                        <nav className="flex items-center gap-2 sm:gap-3">
                            <Link
                                href={home()}
                                className="premium-navlink inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <ArrowLeft className="size-4" />
                                Inicio
                            </Link>
                            {!isAuth ? (
                                <Link
                                    href={login()}
                                    className="premium-navlink rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Iniciar sesión
                                </Link>
                            ) : null}
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-95"
                            >
                                {ctaLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </nav>
                    </div>
                </header>

                <main className="relative z-10">
                    <section className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-20">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                                <Cpu className="size-3.5 text-primary" />
                                Sobre nosotros
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                                Construimos {appName} con un stack moderno y
                                agentes reales
                            </h1>
                            <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
                                Velora es un CRM de ventas con embudo kanban,
                                catálogo e IA integrada. Operamos en producción
                                con las tecnologías que ves abajo — sin
                                promesas vacías en la landing.
                            </p>
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                        <div className="mb-10 grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    icon: Cloud,
                                    title: 'Cloud-first',
                                    text: 'AWS para hosting, contenedores y despliegue reproducible.',
                                },
                                {
                                    icon: Code2,
                                    title: 'Full stack',
                                    text: 'Laravel + React + Vite: un solo producto, tipado y mantenible.',
                                },
                                {
                                    icon: Cpu,
                                    title: 'Agentes',
                                    text: 'OpenClaw orquesta Lina y Fernando; OpenAI y Anthropic alimentan los modelos.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="premium-surface rounded-2xl border border-border/60 bg-card/55 p-5 text-center"
                                >
                                    <item.icon className="mx-auto size-8 text-primary" />
                                    <p className="mt-3 text-sm font-semibold text-foreground">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <h2 className="mb-2 text-center text-2xl font-semibold text-foreground">
                            Stack actual
                        </h2>
                        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
                            AWS · React · Laravel · Vite · OpenClaw · OpenAI ·
                            Anthropic
                        </p>

                        <div className="space-y-12">
                            {groups.map((group) => {
                                const items = stack.filter(
                                    (s) => s.group === group,
                                );

                                return (
                                    <div key={group}>
                                        <h3 className="mb-4 text-sm font-semibold tracking-wide text-foreground uppercase">
                                            {groupLabels[group]}
                                        </h3>
                                        <div
                                            className={cn(
                                                'grid gap-4',
                                                group === 'ai'
                                                    ? 'sm:grid-cols-2 lg:grid-cols-3'
                                                    : 'sm:grid-cols-2',
                                            )}
                                        >
                                            {items.map((item) => (
                                                <StackCard
                                                    key={item.name}
                                                    name={item.name}
                                                    role={item.role}
                                                    description={
                                                        item.description
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="border-t border-border/60 bg-muted/25 py-16">
                        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6">
                            <p className="max-w-lg text-sm text-muted-foreground">
                                ¿Quieres ver el producto en acción? Agenda una
                                demo o crea tu cuenta.
                            </p>
                            <Link
                                href={ctaHref}
                                className="premium-shimmer-ring premium-cta inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-95"
                            >
                                {ctaLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </section>

                    <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
                        <p>
                            © {new Date().getFullYear()} {appName}.{' '}
                            <Link
                                href={home()}
                                className="underline underline-offset-4 hover:text-foreground"
                            >
                                Inicio
                            </Link>
                            {' · '}
                            <Link
                                href="/about"
                                className="underline underline-offset-4 hover:text-foreground"
                            >
                                Sobre nosotros
                            </Link>
                        </p>
                    </footer>
                </main>
            </div>
        </>
    );
}
