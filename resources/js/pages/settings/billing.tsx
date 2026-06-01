import { Head } from '@inertiajs/react';
import { BillingPanel, type BillingPanelProps } from '@/components/billing-panel';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function SettingsBilling(props: BillingPanelProps) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Facturación', href: '/settings/billing' }]}>
            <Head title="Facturación" />
            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        title="Facturación"
                        description="Prueba gratis, plan Pro y pago seguro con PayPal (tarjeta aceptada)."
                    />
                    <BillingPanel {...props} compact />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
