import { Link, usePage } from '@inertiajs/react';

type BillingShared = {
    is_on_trial?: boolean;
    trial_days_remaining?: number | null;
    trial_ends_at?: string | null;
    has_access?: boolean;
    plan_name?: string;
};

export function TrialBanner() {
    const billing = (usePage().props.billing ?? null) as BillingShared | null;

    if (!billing?.is_on_trial || billing.has_access === false) {
        return null;
    }

    const days = billing.trial_days_remaining;

    return (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100">
            Prueba gratis de <strong>{billing.plan_name ?? 'Velora Pro'}</strong>
            {days !== null && days !== undefined ? (
                <> — {days} día(s) restantes</>
            ) : billing.trial_ends_at ? (
                <> — hasta {billing.trial_ends_at}</>
            ) : null}
            .{' '}
            <Link
                href="/billing"
                className="font-medium underline underline-offset-2"
            >
                Ver plan y pago con PayPal
            </Link>
        </div>
    );
}
