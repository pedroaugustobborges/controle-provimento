import { Building2, ClipboardList, LayoutDashboard, FileCheck, FileText, Eye } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Controle de Vagas', url: '/vagas', icon: ClipboardList },
  { title: 'Editais', url: '/editais', icon: FileText },
  { title: 'Validação', url: '/validacao', icon: FileCheck },
  { title: 'Visão Gestor', url: '/gestor', icon: Eye },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-sm text-sidebar-foreground leading-tight">Gestão de Vagas</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Sistema Hospitalar</p>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
