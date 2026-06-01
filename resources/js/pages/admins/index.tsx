import { Head, Link } from '@inertiajs/react';
import { ExternalLink, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminsIndex() {
    return (
        <>
            <Head title="Admins — Velora" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">Administración Velora</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Canal OpenClaw <strong>velora-admins</strong> — cambios
                        solo en el CRM Laravel/React.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <a
                        href="/openclaw/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <Button
                            variant="outline"
                            className="h-auto w-full flex-col items-start gap-2 p-4 text-left"
                        >
                            <ExternalLink className="size-5 text-primary" />
                            <span className="font-medium">
                                OpenClaw Control UI
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                                Gateway, agentes (lina, fernando, invoker) y
                                canales. Usa el token del gateway si lo pide.
                            </span>
                        </Button>
                    </a>
                    <Link href="/admins/invoker" className="block">
                        <Button
                            variant="outline"
                            className="h-auto w-full flex-col items-start gap-2 p-4 text-left"
                        >
                            <Sparkles className="size-5 text-primary" />
                            <span className="font-medium">Invoker</span>
                            <span className="text-xs font-normal text-muted-foreground">
                                LLM operador con logs y herramientas CRM en
                                tiempo real.
                            </span>
                        </Button>
                    </Link>
                    <Link href="/admins/logs" className="block">
                        <Button
                            variant="outline"
                            className="h-auto w-full flex-col items-start gap-2 p-4 text-left"
                        >
                            <FileText className="size-5 text-primary" />
                            <span className="font-medium">Logs</span>
                            <span className="text-xs font-normal text-muted-foreground">
                                Vista de laravel.log, agent_logs y colas Lina.
                            </span>
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    );
}

AdminsIndex.layout = {
    breadcrumbs: [{ title: 'Admins', href: '/admins' }],
};
