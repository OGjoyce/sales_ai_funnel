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

                {canSkip ? (
                    <div className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                        <p className="text-xs text-muted-foreground">
                            Modo pruebas: puedes entrar al CRM sin verificar
                            el correo.
                        </p>
                        <Button
                            type="button"
                            className="w-full"
                            onClick={skipVerification}
                        >
                            Omitir verificación y abrir el CRM
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                            Fernando (chat) está en{' '}
                            <span className="font-medium text-foreground">
                                Fernando — Ventas
                            </span>{' '}
                            en el menú lateral.
                        </p>
                    </div>
                ) : null}

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
        'Haz clic en el enlace que enviamos a tu email, o usa omitir si estás en modo pruebas.',
};
