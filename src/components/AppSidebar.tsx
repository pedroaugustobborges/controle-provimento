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
  FileSpreadsheet,
  Bell
} from 'lucide-react';

import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

const mainItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Vagas', url: '/vagas', icon: Briefcase, subMenu: [
    { title: 'Todas as Vagas', url: '/vagas' },
    { title: 'Acompanhamento do Edital', url: '/vagas?tab=acompanhamento' },
    { title: 'Fila de Editais', url: '/fila-editais' },
  ] },
  { title: 'Banco de Talentos', url: '/banco-talentos', icon: Users, subMenu: [
    { title: 'Cadastro Reserva', url: '/banco-talentos?tab=list' },
    { title: 'Convocados', url: '/banco-talentos?tab=convocados' },
    { title: 'Vencidos', url: '/banco-talentos?tab=vencidos' },
  ] },
  { title: 'Convocações', url: '/convocacoes', icon: Calendar, subMenu: [
    { title: 'Convocação Diária', url: '/convocacoes?tab=diaria' },
    { title: 'Histórico', url: '/convocacoes?tab=list' },
    { title: 'Pendentes', url: '/convocacoes?tab=pending' },
  ] },
  { title: 'Alertas e Tarefas', url: '/alertas-tarefas', icon: Bell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin } = usePermissions();
  const location = useLocation();

  const isUrlActive = (url: string) => {
    const currentUrl = location.pathname + location.search;
    if (url === '/') return currentUrl === '/';
    return currentUrl === url || currentUrl.startsWith(url + '?') || currentUrl.startsWith(url + '/');
  };

  const isParentActive = (item: any) => {
    if (isUrlActive(item.url)) return true;
    return item.subMenu?.some((sub: any) => isUrlActive(sub.url));
  };

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
              {mainItems.map((item) => {
                const active = isParentActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    {item.subMenu ? (
                      <>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative",
                              active ? "bg-white/10 text-white font-bold shadow-lg" : "text-white/70 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active ? "text-primary-foreground scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/50 group-hover:text-white"
                            )} />
                            {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                            {active && !collapsed && (
                              <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {!collapsed && (
                          <SidebarMenuSub className="ml-4 mt-1 border-l border-white/10 space-y-1">
                            {item.subMenu.map((sub) => {
                              const subActive = isUrlActive(sub.url);
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={sub.url}
                                      className={cn(
                                        "text-xs py-2 px-3 rounded-md transition-all duration-200 block relative",
                                        subActive 
                                          ? "text-white font-bold bg-white/5 shadow-inner" 
                                          : "text-white/40 hover:text-white hover:bg-white/5"
                                      )}
                                    >
                                      {sub.title}
                                      {subActive && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_white] animate-pulse" />
                                      )}
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative",
                            active ? "bg-white/10 text-white font-bold shadow-lg" : "text-white/70 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active ? "text-primary-foreground scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/50 group-hover:text-white"
                          )} />
                          {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                          {active && !collapsed && (
                            <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
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