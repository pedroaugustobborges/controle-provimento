import { 
  Building2, 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Users, 
  CheckCircle, 
  TrendingUp,
  Settings,
  HelpCircle
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const mainItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Processos Seletivos', url: '/vagas', icon: Briefcase },
  { title: 'Editais e Etapas', url: '/editais', icon: FileText },
  { title: 'Convocações', url: '/convocacoes', icon: Users },
];

const secondaryItems = [
  { title: 'Validações', url: '/validacao', icon: CheckCircle },
  { title: 'Administração', url: '/gestor', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Building2 className="h-6 w-6 text-primary shrink-0" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm text-foreground truncate leading-tight">TalentHub</span>
              <span className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-medium">Gestão Hospitalar</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group"
                      activeClassName="bg-sidebar-accent text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0 transition-colors group-hover:text-primary" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group"
                      activeClassName="bg-sidebar-accent text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0 transition-colors group-hover:text-primary" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações">
              <button className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-all">
                <Settings className="h-4.5 w-4.5" />
                {!collapsed && <span className="text-sm">Configurações</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ajuda">
              <button className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-all">
                <HelpCircle className="h-4.5 w-4.5" />
                {!collapsed && <span className="text-sm">Central de Ajuda</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}