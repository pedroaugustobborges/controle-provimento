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
  FileCheck,
  Check,
  Search
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
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminStore } from '@/store/adminStore';
import { cn } from '@/lib/utils';
import { useMemo, useState, useCallback } from 'react';

const UNIDADES_POR_REGIAO: Record<string, string[]> = {
  'GOIÁS E VITÓRIA': ['HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'VITÓRIA (SÃO PEDRO/SUÁ)', 'TEIA ANAPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'],
  'OUTRAS UNIDADES': ['DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3']
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin, isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess } = usePermissions();
  const { currentUser, users, selectedRegion, selectedUnit, selectedUnits, setSelectedRegion, setSelectedUnit, setSelectedUnits } = useAdminStore();
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
      url: '/fila-editais', 
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
  ], [isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess]);

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
            <div className="absolute -inset-1 bg-white/20 rounded-lg blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
            <img src={logoAgir} alt="AGIR" className="relative h-11 w-11 shrink-0 rounded-lg object-contain bg-white/5 p-1 shadow-inner" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5">
                AGIR
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </span>
              <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em] leading-tight">
                Provimento Digital
              </span>
            </div>
          )}
        </div>

        {/* Unit selector for multi-unit users */}
        {hasMultipleUnits && !collapsed && (
          <div className="mt-6 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500 px-2">
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedUnits(['all']); }}>
              <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white/90 text-[11px] font-bold hover:bg-white/10 hover:border-white/20 transition-all shadow-lg rounded-xl">
                <SelectValue placeholder="TODAS AS REGIÕES" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A192F] border-white/10 text-white">
                <SelectItem value="all" className="text-xs font-bold hover:bg-white/10 focus:bg-white/10 uppercase">Todas as Regiões</SelectItem>
                <SelectItem value="GOIÁS E VITÓRIA" className="text-xs hover:bg-white/10 focus:bg-white/10 uppercase">GOIÁS E VITÓRIA</SelectItem>
                <SelectItem value="OUTRAS UNIDADES" className="text-xs hover:bg-white/10 focus:bg-white/10 uppercase">OUTRAS UNIDADES</SelectItem>
              </SelectContent>
            </Select>

            {selectedRegion !== 'all' && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between w-full h-10 px-3 bg-white/5 border border-white/10 text-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all rounded-xl">
                    <span className="truncate">
                      {selectedUnits.includes('all') ? `TODAS DE ${selectedRegion}` : `${selectedUnits.length} UNIDADE(S) SELECIONADA(S)`}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 bg-[#0A192F] border-white/10 shadow-2xl" align="start">
                  <div className="p-2 space-y-1">
                    <div 
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => {
                        if (selectedUnits.includes('all')) {
                          setSelectedUnits([]);
                        } else {
                          setSelectedUnits(['all']);
                        }
                      }}
                    >
                      <Checkbox 
                        checked={selectedUnits.includes('all')}
                        className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Todas de {selectedRegion}</span>
                    </div>
                    
                    <div className="h-[1px] bg-white/5 my-1" />
                    
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                      {UNIDADES_POR_REGIAO[selectedRegion]?.map(u => (
                        <div 
                          key={u}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => {
                            let newUnits = [...selectedUnits];
                            if (newUnits.includes('all')) {
                              newUnits = [u];
                            } else if (newUnits.includes(u)) {
                              newUnits = newUnits.filter(x => x !== u);
                              if (newUnits.length === 0) newUnits = ['all'];
                            } else {
                              newUnits.push(u);
                            }
                            setSelectedUnits(newUnits);
                          }}
                        >
                          <Checkbox 
                            checked={selectedUnits.includes(u)}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                          />
                          <span className="text-[11px] text-white/80 font-medium">{u}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-white/10" />
            FLUXO DE PROVIMENTO
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
                                ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20" 
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active 
                                ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                : "text-slate-500 group-hover:text-white group-hover:scale-110"
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
                              <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {!collapsed && (
                          <SidebarMenuSub className="ml-3 mt-1 border-l-2 border-white/10 space-y-1.5 py-2 pl-3">
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
                                          "text-[11.5px] py-2.5 px-4 rounded-lg transition-all duration-300 block relative select-none group/sub font-bold whitespace-nowrap",
                                          subActive 
                                            ? "text-white bg-white/20 shadow-[0_4px_15px_-3px_rgba(255,255,255,0.2)] translate-x-1.5" 
                                            : hasPassed
                                              ? "text-slate-300 bg-white/5 hover:bg-white/10"
                                              : "text-slate-500 hover:text-slate-100 hover:bg-white/5 hover:translate-x-1.5"
                                        )}
                                    >
                                      {subActive && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-white animate-pulse" />
                                      )}
                                      {hasPassed && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-white/20" />
                                      )}
                                      <span className="relative z-10 flex items-center gap-2 leading-tight">
                                        <CornerDownRight className={cn(
                                          "h-3 w-3",
                                          subActive ? "text-white" : hasPassed ? "text-slate-400" : "text-slate-600"
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
                              ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20" 
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active 
                              ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                              : "text-slate-500 group-hover:text-white group-hover:scale-110"
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
                            <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" />
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

        <SidebarGroup className="px-3 mt-4">
          <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-white/10" />
            CONTROLE OPERACIONAL
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
                            ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20" 
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-300",
                          active 
                            ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                            : "text-slate-500 group-hover:text-white group-hover:scale-110"
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
                          <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 py-6 px-4">
        {!collapsed && (
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setShowSupport(true)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all group border border-white/10"
            >
              <HelpCircle className="h-5 w-5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-white" />
              <span className="text-sm font-bold tracking-tight">Suporte Técnico</span>
            </button>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-white truncate leading-tight">
                    {currentUser?.nome_completo || 'Usuário'}
                  </span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate leading-tight">
                    {currentUser?.perfil || 'Acesso Restrito'}
                  </span>
                </div>
              </div>
              <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/5">
                Acessar Perfil
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>

      {/* Modal de Suporte */}
      <Dialog open={showSupport} onOpenChange={setShowSupport}>
        <DialogContent className="max-w-md bg-[#0A192F] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-white" />
              Suporte Técnico
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Entre em contato com o responsável pela sua região.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {useAdminStore.getState().supportConfigs
              .filter(c => c.status === 'ativo' && (selectedRegion === 'all' || c.regiao === selectedRegion))
              .map((config) => (
                <div key={config.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{config.regiao}</span>
                    <div className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white">RESPONSÁVEL</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                      {config.responsavel.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight">{config.responsavel}</h4>
                      <p className="text-xs text-white/50">{config.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs">
                      Teams
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs">
                      E-mail
                    </Button>
                  </div>
                </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
