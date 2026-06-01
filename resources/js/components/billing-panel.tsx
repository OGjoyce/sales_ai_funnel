import { Link, router, usePage } from '@inertiajs/react';
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
    hasActivePlan: boolean;
    trialDays: number;
    planName: string;
    paypalConfigured: boolean;
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
    hasActivePlan,
    trialDays,
    planName,
    paypalConfigured,
    planLabel,
    planPrice,
    planCurrency,
    subscribeUrl,
    compact = false,
}: BillingPanelProps) {
    const { flash } = usePage().props as {
        flash?: { status?: string; error?: string };
    };

    const startPayPal = () => {
        router.post(subscribeUrl);
    };

    return (
        <div className="space-y-4 text-sm text-muted-foreground">
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

            <p>
                Estado:{' '}
                <span className="font-medium text-foreground">
                    {statusLabel(subscriptionStatus, isOnTrial)}
                </span>
                {isOnTrial && trialEndsAt ? (
                    <>
                        {' '}
                        — termina el {trialEndsAt}
                        {trialDaysRemaining !== null ? (
                            <> ({trialDaysRemaining} día(s) restantes)</>
                        ) : null}
                    </>
                ) : null}
            </p>

            {hasActivePlan && subscriptionStatus === 'active' ? (
                <p className="text-foreground">
                    Tu suscripción <strong>{planName}</strong> está activa. Gracias
                    por confiar en Velora.
                </p>
            ) : isOnTrial ? (
                <div className="space-y-2">
                    <p>
                        Tienes <strong>{trialDays} días gratis</strong> para probar
                        Velora con {planName}. Al terminar la prueba, activa tu plan
                        para seguir usando el embudo, Lina y el agente.
                    </p>
                    {paypalConfigured ? (
                        <p>
                            Puedes pagar antes con{' '}
                            <strong>tarjeta de débito o crédito</strong> a través de
                            PayPal (no necesitas cuenta PayPal).
                        </p>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-foreground">
                        Tu prueba gratuita terminó. Activa{' '}
                        <strong>{planLabel}</strong> ({planCurrency} ${planPrice}
                        /mes) para recuperar el acceso.
                    </p>
                    <p>
                        Paga con <strong>PayPal</strong>: acepta tarjeta Visa,
                        Mastercard y más, con o sin cuenta PayPal.
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {paypalConfigured && !hasActivePlan ? (
                    <Button
                        type="button"
                        variant="default"
                        className="w-full"
                        onClick={startPayPal}
                    >
                        <CreditCard className="size-4" />
                        Pagar con PayPal / tarjeta
                    </Button>
                ) : null}

                {!compact ? (
                    <>
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
                            <Link href="/?chat=fernando">
                                Hablar con Fernando
                            </Link>
                        </Button>
                    </>
                ) : null}
            </div>

            {!paypalConfigured && !hasActivePlan ? (
                <p className="text-xs">
                    El cobro en línea se habilitará en breve. Mientras tanto,
                    contáctanos para activar tu cuenta.
                </p>
            ) : null}
        </div>
    );
}
