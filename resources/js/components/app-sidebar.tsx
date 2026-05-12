import { Link } from '@inertiajs/react';
import {
    Bot,
    GraduationCap,
    Kanban,
    LayoutGrid,
    BarChart3,
    MessageCircle,
    Package,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { agent, kanban, products, training } from '@/routes/crm';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard.url(),
        icon: LayoutGrid,
    },
    {
        title: 'Embudo CRM',
        href: kanban.url(),
        icon: Kanban,
    },
    {
        title: 'Productos',
        href: products.url(),
        icon: Package,
    },
    {
        title: 'Métricas',
        href: '/crm/metrics',
        icon: BarChart3,
    },
    {
        title: 'Centro del agente',
        href: agent.url(),
        icon: Bot,
    },
    {
        title: 'Entrenar tu IA',
        href: training.url(),
        icon: GraduationCap,
    },
    {
        title: 'Prueba tu agente',
        href: '/crm/playground',
        icon: MessageCircle,
    },
];


export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard.url()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* External links removed for productized build */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
