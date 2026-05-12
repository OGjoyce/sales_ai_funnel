import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { crmFetch } from '@/lib/crm-api';
import { products as productsRoute } from '@/routes/crm';

type Product = {
    id: number;
    title: string;
    code: string;
    price: string;
    currency: string;
    image_path: string | null;
    image_url?: string | null;
    active: boolean;
};

/** Coincide con `image|max:10240` en el API (10 MiB en kilobytes). */
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

function formatMaxImageHint(): string {
    const mb = (MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)).toFixed(0);

    return `${mb} MB`;
}

export default function CrmProducts() {
    const { csrf_token: csrfToken } = usePage().props;
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await crmFetch(csrfToken, '/products', { method: 'GET' });

        if (res.ok) {
            const data = await res.json();
            setProducts(data.products ?? []);
        }

        setLoading(false);
    }, [csrfToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMsg(null);
        const form = e.currentTarget;
        const imageInput = form.elements.namedItem(
            'image',
        ) as HTMLInputElement | null;
        const file = imageInput?.files?.[0];

        if (file && file.size > MAX_PRODUCT_IMAGE_BYTES) {
            setMsg(
                `La imagen supera el máximo permitido (${formatMaxImageHint()}). Elige un archivo más pequeño o comprímela.`,
            );

            return;
        }

        const fd = new FormData(form);
        let res: Response;

        try {
            res = await crmFetch(csrfToken, '/products', {
                method: 'POST',
                body: fd,
            });
        } catch {
            setMsg(
                'No se pudo enviar el formulario (red o cuerpo demasiado grande). Si subiste imagen, prueba una más pequeña.',
            );

            return;
        }

        if (res.ok) {
            form.reset();
            setMsg('Producto creado.');
            await load();

            return;
        }

        if (res.status === 413) {
            setMsg(
                'El servidor rechazó el archivo por tamaño (413). En php.ini sube `upload_max_filesize` y `post_max_size` a al menos 12M y reinicia PHP.',
            );

            return;
        }

        const err = await res.json().catch(() => ({}));
        setMsg(
            typeof err.message === 'string'
                ? err.message
                : 'Error al crear (revisa código único o campos).',
        );
    };

    return (
        <>
            <Head title="Productos CRM" />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <div>
                    <h1 className="text-lg font-semibold">Catálogo</h1>
                    <p className="text-sm text-muted-foreground">
                        Los productos se usan en las tools del agente (
                        <code className="text-xs">get_products</code>).
                    </p>
                </div>

                {msg ? (
                    <p
                        className={
                            msg.startsWith('Producto creado')
                                ? 'text-sm text-jira-success'
                                : 'text-sm text-jira-danger'
                        }
                    >
                        {msg}
                    </p>
                ) : null}

                <form
                    onSubmit={(e) => void onSubmit(e)}
                    className="grid max-w-xl gap-3 rounded-xl border border-border bg-card/80 p-4"
                >
                    <div className="grid gap-1">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" name="title" required />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="code">Código</Label>
                        <Input id="code" name="code" required />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="price">Precio</Label>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="description">Descripción</Label>
                        <Input id="description" name="description" />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="image">
                            Imagen (opcional, máx. {formatMaxImageHint()})
                        </Label>
                        <Input id="image" name="image" type="file" accept="image/*" />
                    </div>
                    <Button type="submit">Guardar producto</Button>
                </form>

                <div>
                    <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                        Listado
                    </h2>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando…</p>
                    ) : (
                        <ul className="space-y-2">
                            {products.map((p) => (
                                <li
                                    key={p.id}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                                >
                                    <span>
                                        {p.title}{' '}
                                        <span className="text-muted-foreground">
                                            ({p.code})
                                        </span>
                                    </span>
                                    <span className="font-mono text-primary">
                                        {p.price} {p.currency}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}

CrmProducts.layout = {
    breadcrumbs: [
        { title: 'Productos', href: productsRoute.url() },
    ],
};
