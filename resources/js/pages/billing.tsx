import { Head, Link } from '@inertiajs/react';
import { BillingPanel, type BillingPanelProps } from '@/components/billing-panel';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function Billing(props: BillingPanelProps) {
    const { hasPaidPlan, isOnTrial, hasAccess } = props;

    return (
        <AuthLayout
            title="Facturación Velora"
            description={
                hasPaidPlan
                    ? 'Tu plan está activo.'
                    : isOnTrial
                      ? 'Prueba gratis — puedes pagar cuando quieras.'
                      : 'Activa tu plan para continuar.'
            }
        >
            <Head title="Facturación" />
            <BillingPanel {...props} />
            {hasAccess && !hasPaidPlan ? (
                <div className="mt-6 border-t border-border pt-4">
                    <Button asChild variant="secondary" className="w-full">
                        <Link href="/dashboard">Volver al CRM</Link>
                    </Button>
                </div>
            ) : null}
        </AuthLayout>
    );
}
