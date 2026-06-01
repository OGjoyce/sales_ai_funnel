// Components
import { Form, Head, router, usePage } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

type VerifyEmailProps = {
    status?: string;
    canSkipEmailVerification?: boolean;
};

export default function VerifyEmail({
    status,
    canSkipEmailVerification = false,
}: VerifyEmailProps) {
    const page = usePage();
    const canSkip =
        canSkipEmailVerification ||
        (page.props as { canSkipEmailVerification?: boolean })
            .canSkipEmailVerification === true;

    const skipVerification = () => {
        router.post('/email/verify/skip');
    };

    return (
        <>
            <Head title="Verificar correo" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Enviamos un nuevo enlace de verificación a tu correo.
                </div>
            )}

            <div className="space-y-6 text-center">
                <div className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">
                        Modo pruebas: entra al CRM sin verificar el correo.
                    </p>
                    <Button
                        type="button"
                        className="w-full"
                        disabled={!canSkip}
                        onClick={skipVerification}
                    >
                        Omitir verificación e ir al dashboard
                    </Button>
                    {!canSkip ? (
                        <p className="text-[11px] text-jira-danger">
                            El servidor tiene desactivado el omitir
                            (VELORA_ALLOW_SKIP_EMAIL_VERIFICATION).
                        </p>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            Activa trial de 7 días si aún no tienes plan.
                            Admins van directo a Invoker.
                        </p>
                    )}
                </div>

                <Form {...send.form()} className="space-y-4">
                    {({ processing }) => (
                        <Button
                            disabled={processing}
                            variant="secondary"
                            className="w-full"
                        >
                            {processing && <Spinner />}
                            Reenviar correo de verificación
                        </Button>
                    )}
                </Form>

                <TextLink href={logout()} className="mx-auto block text-sm">
                    Cerrar sesión
                </TextLink>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verifica tu correo',
    description:
        'Haz clic en el enlace del correo o usa el botón de abajo para omitir (pruebas).',
};
