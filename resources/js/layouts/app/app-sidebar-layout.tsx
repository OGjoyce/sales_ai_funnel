import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { TrialBanner } from '@/components/trial-banner';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="glass-inset animate-in fade-in slide-in-from-bottom-1 overflow-x-hidden duration-500 dark:border-arc/15"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <TrialBanner />
                {children}
            </AppContent>
        </AppShell>
    );
}
