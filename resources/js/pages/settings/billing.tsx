import { Head, Link } from '@inertiajs/react';
import { Calendar, Mail } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Button } from '@/components/ui/button';
import Heading from '@/components/heading';

export default function SettingsBilling({
    supportEmail,
    calendlyUrl,
    whatsapp,
    subscriptionStatus,
    trialEndsAt,
}: {
    supportEmail: string;
    calendlyUrl: string;
    whatsapp: string | null;
    subscriptionStatus: string;
    trialEndsAt: string | null;
}) {
    return (
        <AppLayout>
            <Head title="Facturación" />
            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Facturación"
                        description="Stripe Checkout estará disponible pronto. Mientras tanto, contáctanos para activar tu plan."
                    />
                    <p className="text-sm text-muted-foreground">
                        Estado:{' '}
                        <span className="font-medium text-foreground">
                            {subscriptionStatus}
                        </span>
                        {trialEndsAt ? ` — trial hasta ${trialEndsAt}` : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <a
                                href={calendlyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Calendar className="size-4" />
                                Agendar consulta
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
                                    WhatsApp
                                </a>
                            </Button>
                        ) : null}
                        <Button asChild variant="ghost">
                            <Link href="/crm/help">Fernando / Ayuda</Link>
                        </Button>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
