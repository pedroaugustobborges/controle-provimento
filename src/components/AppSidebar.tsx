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
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminStore } from '@/store/adminStore';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const UNIDADES_POR_REGIAO = {
  'Goiás': ['CRER', 'AGIR', 'HUGOL', 'HECAD', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'TEIA APARECIDA', 'TEIA GOIÂNIA', 'TEIA CANEDO'],
  'Espírito Santo': ['SÃO PEDRO', 'SUÁ', 'BENTO FERREIRA', 'SERRA'],
  'Demais Unidades': ['Hospital Central (GO)', 'Hospital das Clínicas']
};

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
              <SelectContent className="bg-[#112240] border-white/10 text-white max-h-[300px]">
                <SelectItem value="all" className="text-xs font-bold hover:bg-blue-500/20 focus:bg-blue-500/20">Todas as Unidades</SelectItem>
                {Object.entries(UNIDADES_POR_REGIAO).map(([regiao, unidades]) => (
                  <SelectGroup key={regiao}>
                    <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-blue-400 py-2 px-3 bg-blue-500/5">{regiao}</SelectLabel>
                    {unidades.map(u => (
                      <SelectItem key={u} value={u} className="text-xs hover:bg-blue-500/20 focus:bg-blue-500/20 pl-6">{u}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-500/60 mb-6 flex items-center gap-2">
            <div className="h-[1px] w-4 bg-blue-500/20" />
            Fluxo de Provimento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {mainItems.map((item) => {
                const active = isParentActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    {item.subMenu ? (
                      <div className="flex flex-col gap-1">
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                              active 
                                ? "bg-blue-500/15 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] border border-blue-500/20" 
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active 
                                ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" 
                                : "text-slate-500 group-hover:text-blue-400 group-hover:scale-110"
                            )} />
                            {!collapsed && (
                              <span className={cn(
                                "text-[13.5px] font-medium tracking-tight",
                                active ? "font-bold" : "group-hover:translate-x-0.5 transition-transform duration-300"
                              )}>
                                {item.title}
                              </span>
                            )}
                            {active && !collapsed && (
                              <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,1)]" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {!collapsed && (
                          <SidebarMenuSub className="ml-5 mt-1 border-l-2 border-blue-500/10 space-y-1.5 py-2 pl-4">
                            {item.subMenu.map((sub) => {
                              const subActive = isUrlActive(sub.url);
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={sub.url}
                                      className={cn(
                                        "text-[12.5px] py-2 px-4 rounded-lg transition-all duration-300 block relative select-none overflow-hidden group/sub",
                                        subActive 
                                          ? "text-white font-bold bg-blue-600 shadow-lg shadow-blue-900/40 translate-x-1" 
                                          : "text-slate-500 hover:text-white hover:bg-white/5 hover:translate-x-1"
                                      )}
                                    >
                                      {subActive && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-white animate-pulse" />
                                      )}
                                      <span className="relative z-10 block leading-tight">{sub.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </div>
                    ) : (
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                            active 
                              ? "bg-blue-500/15 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] border border-blue-500/20" 
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active 
                              ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" 
                              : "text-slate-500 group-hover:text-blue-400 group-hover:scale-110"
                          )} />
                          {!collapsed && (
                            <span className={cn(
                              "text-[13.5px] font-medium tracking-tight",
                              active ? "font-bold" : "group-hover:translate-x-0.5 transition-transform duration-300"
                            )}>
                              {item.title}
                            </span>
                          )}
                          {active && !collapsed && (
                            <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,1)]" />
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
          <SidebarGroup className="mt-8 px-3">
            <SidebarGroupLabel className="px-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-500/60 mb-6 flex items-center gap-2">
              <div className="h-[1px] w-4 bg-blue-500/20" />
              Apoio Administrativo
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {secondaryItems.map((item) => {
                  const active = isParentActive(item);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                            active 
                              ? "bg-blue-500/15 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] border border-blue-500/20" 
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active 
                              ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" 
                              : "text-slate-500 group-hover:text-blue-400 group-hover:scale-110"
                          )} />
                          {!collapsed && (
                            <span className={cn(
                              "text-[13.5px] font-medium tracking-tight",
                              active ? "font-bold" : "group-hover:translate-x-0.5 transition-transform duration-300"
                            )}>
                              {item.title}
                            </span>
                          )}
                          {active && !collapsed && (
                            <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,1)]" />
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

      <SidebarFooter className="border-t border-white/10 p-5 mt-auto bg-black/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ajuda">
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 transition-all group overflow-hidden border border-transparent hover:border-white/5">
                <div className="relative">
                  <HelpCircle className="h-5 w-5 group-hover:text-white group-hover:rotate-12 transition-transform duration-500" />
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {!collapsed && <span className="text-sm font-semibold tracking-tight group-hover:text-white">Suporte Interno</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
