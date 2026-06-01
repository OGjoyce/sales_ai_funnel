import { Head } from '@inertiajs/react';
import { BillingPanel, type BillingPanelProps } from '@/components/billing-panel';
import AuthLayout from '@/layouts/auth-layout';

export default function Billing(props: BillingPanelProps) {
    return (
        <AuthLayout
            title="Activar Velora"
            description={
                props.hasActivePlan
                    ? 'Tu plan y facturación.'
                    : props.isOnTrial
                      ? 'Estás en tu prueba gratuita.'
                      : 'Tu prueba terminó. Activa tu plan para continuar.'
            }
        >
            <Head title="Facturación" />
            <BillingPanel {...props} />
        </AuthLayout>
    );
}
