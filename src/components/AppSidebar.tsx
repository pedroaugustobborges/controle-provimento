import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CheckCircle, 
  TrendingUp,
  Settings,
  HelpCircle,
  Calendar,
  FileSpreadsheet,
  Bell,
  ChevronDown
} from 'lucide-react';

import logoAgir from '@/assets/logo-agir.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from '@/components/ui/sidebar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminStore } from '@/store/adminStore';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const mainItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Vagas', url: '/vagas', icon: Briefcase, subMenu: [
    { title: 'Todas as Vagas', url: '/vagas' },
    { title: 'Acompanhamento do Edital', url: '/vagas?tab=acompanhamento' },
    { title: 'Fila de Editais', url: '/fila-editais' },
    { title: 'Redação do Edital', url: '/fila-analista-edital' },
    { title: 'Validação de Edital', url: '/validacao-editais' },
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
  { title: 'Alertas e Tarefas', url: '/alertas-tarefas', icon: Bell, subMenu: [
    { title: 'Painel de Alertas', url: '/alertas-tarefas' },
    { title: 'Histórico de Mensagens', url: '/alertas-tarefas?tab=historico' },
  ] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin } = usePermissions();
  const { currentUser, users } = useAdminStore();
  const location = useLocation();

  const hasMultipleUnits = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.visualiza_todas_unidades || currentUser.unidades_vinculadas.length > 1;
  }, [currentUser]);

  const availableUnits = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.visualiza_todas_unidades) {
      const allUnits = new Set<string>();
      users.forEach(u => u.unidades_vinculadas.forEach(un => allUnits.add(un)));
      return Array.from(allUnits).sort();
    }
    return currentUser.unidades_vinculadas;
  }, [currentUser, users]);

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
    { title: 'Monitoramento de Prazos', url: '/monitoramento', icon: TrendingUp, visible: true },
    { title: 'Validar Convocações', url: '/validacao', icon: CheckCircle, visible: true },
    { title: 'Importações', url: '/importacoes', icon: FileSpreadsheet, visible: canImport() },
    { title: 'Administração', url: '/gestor', icon: Settings, visible: canAccessAdmin() },
  ].filter(item => item.visible);
  
  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0A192F] shadow-2xl">
      <SidebarHeader className="border-b border-white/10 py-6 px-4">
        <div className="flex items-center gap-4 transition-all duration-300">
          <div className="relative group">
            <div className="absolute -inset-1 bg-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img src={logoAgir} alt="AGIR" className="relative h-9 w-9 shrink-0 rounded-lg object-contain bg-white/5 p-1.5 shadow-inner" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5">
                AGIR
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] leading-tight">
                Provimento de Pessoal
              </span>
            </div>
          )}
        </div>

        {/* Unit selector for multi-unit users */}
        {hasMultipleUnits && !collapsed && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <Select defaultValue="all">
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white/80 text-[11px] font-bold hover:bg-white/10 hover:border-white/20 transition-all shadow-sm">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent className="bg-[#112240] border-white/10 text-white">
                <SelectItem value="all" className="text-xs font-bold hover:bg-blue-500/20 focus:bg-blue-500/20">Todas as Unidades</SelectItem>
                {availableUnits.map(u => (
                  <SelectItem key={u} value={u} className="text-xs hover:bg-blue-500/20 focus:bg-blue-500/20">{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-4">Fluxo de Provimento</SidebarGroupLabel>
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
                              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative select-none",
                              active 
                                ? "bg-white/5 text-white font-semibold" 
                                : "text-white/50 hover:bg-white/[0.03] hover:text-white"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 shrink-0 transition-colors duration-200",
                              active 
                                ? "text-blue-500" 
                                : "text-white/30 group-hover:text-white/70"
                            )} />
                            {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                            {active && !collapsed && (
                              <div className="absolute left-0 w-1 h-5 bg-blue-500/50 rounded-r-full" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {!collapsed && (
                          <SidebarMenuSub className="ml-4.5 mt-1 border-l border-white/10 space-y-1 pb-2">
                            {item.subMenu.map((sub) => {
                              const subActive = isUrlActive(sub.url);
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={sub.url}
                                      className={cn(
                                        "text-[13px] py-1.5 px-3.5 rounded-md transition-all duration-200 block relative select-none",
                                        subActive 
                                          ? "text-white font-semibold bg-[#2563EB]" 
                                          : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                                      )}
                                    >
                                      <span className="relative z-10 block leading-tight">{sub.title}</span>
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
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative select-none",
                            active 
                              ? "bg-white/5 text-white font-semibold" 
                              : "text-white/50 hover:bg-white/[0.03] hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-colors duration-200",
                            active 
                              ? "text-blue-500" 
                              : "text-white/30 group-hover:text-white/70"
                          )} />
                          {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                          {active && !collapsed && (
                            <div className="absolute left-0 w-1 h-5 bg-blue-500/50 rounded-r-full" />
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
            <SidebarGroupLabel className="px-4 text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-4">Apoio Administrativo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryItems.map((item) => {
                  const active = isParentActive(item);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative select-none",
                            active 
                              ? "bg-white/5 text-white font-semibold" 
                              : "text-white/50 hover:bg-white/[0.03] hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-colors duration-200",
                            active 
                              ? "text-blue-500" 
                              : "text-white/30 group-hover:text-white/70"
                          )} />
                          {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}
                          {active && !collapsed && (
                            <div className="absolute left-0 w-1 h-5 bg-blue-500/50 rounded-r-full" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
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
