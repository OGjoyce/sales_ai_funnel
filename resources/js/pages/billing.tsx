import { Head, Link } from '@inertiajs/react';
import { Calendar, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function Billing({
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
        <AuthLayout
            title="Activar Velora"
            description="Tu prueba terminó o necesitas un plan activo."
        >
            <Head title="Facturación" />
            <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                    Estado actual:{' '}
                    <span className="font-medium text-foreground">
                        {subscriptionStatus}
                    </span>
                    {trialEndsAt ? (
                        <>
                            {' '}
                            (trial hasta {trialEndsAt})
                        </>
                    ) : null}
                </p>
                <p>
                    El pago con Stripe estará disponible pronto. Mientras tanto,
                    contáctanos para activar tu cuenta o extender la prueba.
                </p>
                <div className="flex flex-col gap-2">
                    <Button asChild variant="default">
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
            </div>
        </AuthLayout>
    );
}
