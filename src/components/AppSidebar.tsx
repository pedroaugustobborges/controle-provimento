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
  ChevronDown,
  CornerDownRight,
  FileText,
  FileCheck
} from 'lucide-react';

import logoAgir from '@/assets/logo-agir.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
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
import { useMemo, useState, useCallback } from 'react';

const UNIDADES_POR_REGIAO: Record<string, string[]> = {
  'Goiás e Vitória': ['HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'VITÓRIA (SÃO PEDRO/SUÁ)', 'TEIA ANAPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'],
  'Unidades de Fora': ['DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3']
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin, isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess } = usePermissions();
  const { currentUser, users, selectedRegion, selectedUnit, setSelectedRegion, setSelectedUnit } = useAdminStore();
  const location = useLocation();
  const [showSupport, setShowSupport] = useState(false);

  const mainItems = useMemo(() => [
    { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
    { 
      title: 'Vagas', 
      url: '/vagas', 
      icon: Briefcase, 
      subMenu: [
        { title: 'Todas as Vagas', url: '/vagas' },
        { title: 'Acompanhamento do Edital', url: '/vagas?tab=acompanhamento' },
      ] 
    },
    { 
      title: 'Publicação de Edital', 
      url: '/fila-analista-edital', 
      icon: FileText, 
      visible: hasFullAccess || isManagement() || isAdminAnalyst() || isEditalAnalyst(),
      subMenu: [
        { title: 'Fila de Editais', url: '/fila-editais' },
        { title: 'Redação do Edital', url: '/fila-analista-edital' },
      ]
    },
    { 
      title: 'Validação de Edital', 
      url: '/validacao-editais', 
      icon: FileCheck, 
      visible: hasFullAccess || isManagement() || isAdminAnalyst(),
      subMenu: [
        { title: 'Pendentes de Validação', url: '/validacao-editais' },
        { title: 'Validados / Histórico', url: '/validacao-editais?tab=historico' },
      ]
    },
    { 
      title: 'Banco de Talentos', 
      url: '/banco-talentos', 
      icon: Users, 
      subMenu: [
        { title: 'Cadastro Reserva', url: '/banco-talentos?tab=list' },
        { title: 'Convocados', url: '/banco-talentos?tab=convocados' },
        { title: 'Vencidos', url: '/banco-talentos?tab=vencidos' },
      ] 
    },
    { 
      title: 'Convocações', 
      url: '/convocacoes', 
      icon: Calendar, 
      subMenu: [
        { title: 'Convocação Diária', url: '/convocacoes?tab=diaria' },
        { title: 'Histórico', url: '/convocacoes?tab=list' },
        { title: 'Pendentes', url: '/convocacoes?tab=pending' },
      ] 
    },
    { 
      title: 'Alertas e Tarefas', 
      url: '/alertas-tarefas', 
      icon: Bell, 
      subMenu: [
        { title: 'Painel de Alertas', url: '/alertas-tarefas' },
        { title: 'Histórico de Mensagens', url: '/alertas-tarefas?tab=historico' },
      ] 
    },
  ], [isManagement, isAdminAnalyst, isEditalAnalyst]);

  const hasMultipleUnits = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.visualiza_todas_unidades || currentUser.unidades_vinculadas.length > 1;
  }, [currentUser]);


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
            <div className="absolute -inset-1 bg-blue-500 rounded-lg blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
            <img src={logoAgir} alt="AGIR" className="relative h-11 w-11 shrink-0 rounded-lg object-contain bg-white/5 p-1 shadow-inner" />
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
          <div className="mt-6 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedUnit('all'); }}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white/80 text-[11px] font-bold hover:bg-white/10 hover:border-white/20 transition-all shadow-sm">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent className="bg-[#112240] border-white/10 text-white">
                <SelectItem value="all" className="text-xs font-bold hover:bg-blue-500/20 focus:bg-blue-500/20">Todas as Unidades</SelectItem>
                <SelectItem value="Goiás e Vitória" className="text-xs hover:bg-blue-500/20 focus:bg-blue-500/20">Goiás e Vitória</SelectItem>
                <SelectItem value="Unidades de Fora" className="text-xs hover:bg-blue-500/20 focus:bg-blue-500/20">Unidades de Fora</SelectItem>
              </SelectContent>
            </Select>

            {selectedRegion !== 'all' && (
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-8 bg-blue-500/5 border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 hover:border-blue-500/30 transition-all animate-in zoom-in-95 duration-300">
                  <SelectValue placeholder="Selecionar Unidade" />
                </SelectTrigger>
                <SelectContent className="bg-[#112240] border-white/10 text-white max-h-[250px]">
                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest text-blue-400">Todas de {selectedRegion}</SelectItem>
                  {UNIDADES_POR_REGIAO[selectedRegion]?.map(u => (
                    <SelectItem key={u} value={u} className="text-xs hover:bg-blue-500/20 focus:bg-blue-500/20">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              {mainItems.filter(item => item.visible !== false).map((item) => {
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
                                "text-[13.5px] font-bold tracking-tight",
                                !active && "group-hover:translate-x-0.5 transition-transform duration-300"
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
                          <SidebarMenuSub className="ml-3 mt-1 border-l-2 border-blue-500/10 space-y-1.5 py-2 pl-3">
                            {item.subMenu.map((sub, idx) => {
                              const subActive = isUrlActive(sub.url);
                              const activeIndex = item.subMenu.findIndex(s => isUrlActive(s.url));
                              const hasPassed = activeIndex !== -1 && idx < activeIndex;
                              
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={sub.url}
                                      className={cn(
                                        "text-[11.5px] py-2 px-3 rounded-lg transition-all duration-300 block relative select-none group/sub font-bold whitespace-nowrap",
                                        subActive 
                                          ? "text-white bg-blue-600 shadow-lg shadow-blue-900/40 translate-x-1" 
                                          : hasPassed
                                            ? "text-[#275ac5] bg-[#275ac5]/5 hover:bg-[#275ac5]/10"
                                            : "text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
                                      )}
                                    >
                                      {subActive && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-white animate-pulse" />
                                      )}
                                      {hasPassed && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-[#275ac5]/50" />
                                      )}
                                      <span className="relative z-10 flex items-center gap-2 leading-tight">
                                        <CornerDownRight className={cn(
                                          "h-3 w-3",
                                          subActive ? "text-white" : hasPassed ? "text-[#275ac5]" : "text-slate-600"
                                        )} />
                                        {sub.title}
                                      </span>
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
                              "text-[13.5px] font-bold tracking-tight",
                              !active && "group-hover:translate-x-0.5 transition-transform duration-300"
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
                              "text-[13.5px] font-bold tracking-tight",
                              !active && "group-hover:translate-x-0.5 transition-transform duration-300"
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
            <SidebarMenuButton asChild tooltip="Suporte Interno">
              <button 
                onClick={() => setShowSupport(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 transition-all group overflow-hidden border border-transparent hover:border-white/5"
              >
                <div className="relative">
                  <HelpCircle className="h-5 w-5 group-hover:text-white group-hover:rotate-12 transition-transform duration-500" />
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {!collapsed && <span className="text-sm font-semibold tracking-tight group-hover:text-white">Suporte Interno</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Dialog open={showSupport} onOpenChange={setShowSupport}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Suporte Interno</DialogTitle>
              <DialogDescription>
                Entre em contato com a administração do sistema para suporte.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Administrador do Sistema</p>
                <p className="text-sm text-muted-foreground">Isaac</p>
                <p className="text-sm text-muted-foreground">Para dúvidas, problemas de acesso ou solicitações, entre em contato diretamente com o administrador.</p>
              </div>
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <p className="text-sm font-semibold text-foreground">Dicas rápidas</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Esqueceu a senha? Solicite o reset ao administrador</li>
                  <li>Problemas de permissão? Verifique com seu gestor</li>
                  <li>Recomendamos utilizar o navegador Microsoft Edge</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}