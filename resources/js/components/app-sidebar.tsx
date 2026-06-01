import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    Bot,
    GraduationCap,
    Kanban,
    LayoutGrid,
    BarChart3,
    HelpCircle,
    MessageCircle,
    Package,
    Sparkles,
    FileText,
    Shield,
    ExternalLink,
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
    {
        title: 'Fernando — Ventas',
        href: '/crm/help',
        icon: HelpCircle,
    },
];


const adminNavItems: NavItem[] = [
    {
        title: 'Admins',
        href: '/admins',
        icon: Shield,
    },
    {
        title: 'Invoker',
        href: '/admins/invoker',
        icon: Sparkles,
    },
    {
        title: 'Logs Velora',
        href: '/admins/logs',
        icon: FileText,
    },
    {
        title: 'OpenClaw UI',
        href: '/openclaw/',
        icon: ExternalLink,
    },
];

export function AppSidebar() {
    const { isVeloraAdmin } = usePage().props as { isVeloraAdmin?: boolean };
    const navItems = isVeloraAdmin
        ? [...mainNavItems, ...adminNavItems]
        : mainNavItems;

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
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* External links removed for productized build */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
