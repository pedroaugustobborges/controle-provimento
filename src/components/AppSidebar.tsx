import { 
  Building2, 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CheckCircle, 
  TrendingUp,
  Settings,
  HelpCircle,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/usePermissions';

const mainItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Vagas', url: '/vagas', icon: Briefcase },
  { title: 'Banco de Talentos', url: '/banco-talentos', icon: Users },
  { title: 'Fila de Editais', url: '/fila-editais', icon: TrendingUp },
  { title: 'Convocações', url: '/convocacoes', icon: Calendar },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin } = usePermissions();

  const secondaryItems = [
    { title: 'Validar Convocações', url: '/validacao', icon: CheckCircle, visible: true },
    { title: 'Importações', url: '/importacoes', icon: FileSpreadsheet, visible: canImport() },
    { title: 'Administração', url: '/gestor', icon: Settings, visible: canAccessAdmin() },
  ].filter(item => item.visible);
  
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-xl">
      <SidebarHeader className="border-b border-sidebar-border/30 py-8">
        <div className="flex items-center gap-3 px-3">
          <div className="bg-white/10 p-2.5 rounded-xl shadow-inner backdrop-blur-sm border border-white/5">
            <Building2 className="h-6 w-6 text-white shrink-0" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-extrabold text-lg text-white truncate leading-tight tracking-tight">AGIR</span>
              <span className="text-[10px] text-white/60 truncate uppercase tracking-[0.2em] font-bold">Provimento Digital</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4">Fluxo de Provimento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-white/10 group text-white/80"
                      activeClassName="bg-white/10 text-white font-bold shadow-md"
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0 transition-colors group-hover:text-white" />
                      {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondaryItems.length > 0 && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4">Apoio Administrativo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-white/10 group text-white/80"
                        activeClassName="bg-white/10 text-white font-bold shadow-md"
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0 transition-colors group-hover:text-white" />
                        {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ajuda">
              <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 text-white/60 transition-all group">
                <HelpCircle className="h-4.5 w-4.5 group-hover:text-white" />
                {!collapsed && <span className="text-sm">Suporte Interno</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}