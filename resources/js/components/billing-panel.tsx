import { Link, usePage } from '@inertiajs/react';
import { Calendar, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BillingPanelProps = {
    supportEmail: string;
    calendlyUrl: string;
    whatsapp: string | null;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
    isOnTrial: boolean;
    hasPaidPlan: boolean;
    hasAccess?: boolean;
    trialDays: number;
    planName: string;
    paypalConfigured: boolean;
    paypalMode?: string;
    paypalPlanValid?: boolean;
    paypalPlanError?: string | null;
    planLabel: string;
    planPrice: string;
    planCurrency: string;
    subscribeUrl: string;
    compact?: boolean;
};

function statusLabel(status: string, isOnTrial: boolean): string {
    if (isOnTrial) {
        return 'Prueba gratis activa';
    }

    return (
        {
            active: 'Plan activo',
            comped: 'Acceso completo',
            trial: 'Prueba finalizada',
            expired: 'Sin plan activo',
        }[status] ?? status
    );
}

export function BillingPanel({
    supportEmail,
    calendlyUrl,
    whatsapp,
    subscriptionStatus,
    trialEndsAt,
    trialDaysRemaining,
    isOnTrial,
    hasPaidPlan,
    trialDays,
    planName,
    paypalConfigured,
    paypalMode = 'sandbox',
    paypalPlanValid = true,
    paypalPlanError = null,
    planLabel,
    planPrice,
    planCurrency,
    subscribeUrl,
    compact = false,
}: BillingPanelProps) {
    const { flash, csrf_token } = usePage().props as {
        flash?: { status?: string; error?: string };
        csrf_token?: string;
    };

    const isComped = subscriptionStatus === 'comped';
    const canPayWithPayPal =
        paypalConfigured && paypalPlanValid && !hasPaidPlan && !isComped;

    return (
        <div className="space-y-6 text-sm text-muted-foreground">
            {flash?.status ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-foreground">
                    {flash.status}
                </p>
            ) : null}
            {flash?.error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                    {flash.error}
                </p>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {planLabel}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                    {planCurrency} ${planPrice}
                    <span className="text-base font-normal text-muted-foreground">
                        {' '}
                        / mes
                    </span>
                </p>
                <p className="mt-2">
                    Estado:{' '}
                    <span className="font-medium text-foreground">
                        {statusLabel(subscriptionStatus, isOnTrial)}
                    </span>
                    {isOnTrial && trialEndsAt ? (
                        <>
                            {' '}
                            — hasta {trialEndsAt}
                            {trialDaysRemaining !== null ? (
                                <> ({trialDaysRemaining} día(s) restantes)</>
                            ) : null}
                        </>
                    ) : null}
                </p>
            </div>

            {hasPaidPlan ? (
                <p className="text-foreground">
                    Tu suscripción <strong>{planName}</strong> está activa. Gracias
                    por confiar en Velora.
                </p>
            ) : isOnTrial ? (
                <p>
                    Tienes <strong>{trialDays} días gratis</strong> con {planName}.
                    Puedes <strong>activar y pagar ahora</strong> para no interrumpir
                    el servicio cuando termine la prueba.
                </p>
            ) : (
                <p className="text-foreground">
                    Tu prueba terminó. Activa {planLabel} para volver al embudo, Lina
                    y el agente.
                </p>
            )}

            {canPayWithPayPal ? (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-foreground">
                        Paga con <strong>PayPal</strong> — tarjeta de débito o
                        crédito (Visa, Mastercard, etc.), con o sin cuenta PayPal.
                    </p>
                    <form method="POST" action={subscribeUrl} className="w-full">
                        <input
                            type="hidden"
                            name="_token"
                            value={csrf_token ?? ''}
                        />
                        <Button
                            type="submit"
                            size="lg"
                            variant="default"
                            className="h-12 w-full text-base font-semibold"
                        >
                            <CreditCard className="size-5" />
                            Pagar ahora con PayPal / tarjeta
                        </Button>
                    </form>
                </div>
            ) : null}

            {paypalConfigured && !paypalPlanValid && paypalPlanError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                    {paypalPlanError}
                    <span className="mt-2 block text-xs">
                        Modo actual del servidor: <strong>{paypalMode}</strong>.
                        Plan Live + credenciales Live, o plan Sandbox + sandbox.
                    </span>
                </p>
            ) : null}

            {!paypalConfigured && !hasPaidPlan && !isComped ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                    El cobro en línea no está configurado en el servidor. Escríbenos
                    a {supportEmail} para activar tu plan.
                </p>
            ) : null}

            {!compact ? (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">¿Necesitas ayuda?</p>
                    <Button asChild variant="outline">
                        <a
                            href={calendlyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Calendar className="size-4" />
                            Agendar 15 min
                        </a>
                    </Button>
                    <Button asChild variant="outline">
                        <a href={`mailto:${supportEmail}`}>
                            <Mail className="size-4" />
                            {supportEmail}
                        </a>
                    </Button>
                    {whatsapp ? (
                        <Button asChild variant="outline">
                            <a
                                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                WhatsApp soporte
                            </a>
                        </Button>
                    ) : null}
                    <Button asChild variant="ghost">
                        <Link href="/?chat=fernando">Hablar con Fernando</Link>
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
