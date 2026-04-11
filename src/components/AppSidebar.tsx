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

import logoAgir from '@/assets/logo-agir-white.png';
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
import { useMemo, useState } from 'react';

const UNIDADES_POR_REGIAO: Record<string, string[]> = {
  'Goiás e Vitória': ['HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'VITÓRIA (SÃO PEDRO/SUÁ)', 'TEIA ANAPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'],
  'Unidades de Fora': ['DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3']
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin, isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess } = usePermissions();
  const { currentUser, selectedRegion, selectedUnit, setSelectedRegion, setSelectedUnit } = useAdminStore();
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
    if (url === '/') return location.pathname === '/';
    return currentUrl === url;
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
    <Sidebar collapsible="icon" className="border-r border-[#E5E7EB] bg-white shadow-sm">
      <SidebarHeader className="p-0 overflow-hidden">
        <div className="bg-[#1E293B] py-6 px-4 flex items-center gap-4 transition-all duration-300">
          <div className="relative group">
            <img src={logoAgir} alt="AGIR" className="relative h-11 w-11 shrink-0 rounded-lg object-contain p-1" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5">
                AGIR
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-tight">
                Provimento Digital
              </span>
            </div>
          )}
        </div>

        {/* Unit selector for multi-unit users */}
        {hasMultipleUnits && !collapsed && (
          <div className="mt-4 px-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedUnit('all'); }}>
              <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-[#374151] text-[11px] font-bold hover:bg-slate-100 transition-all shadow-sm">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-xs font-bold hover:bg-slate-50 focus:bg-slate-50">Todas as Unidades</SelectItem>
                <SelectItem value="Goiás e Vitória" className="text-xs hover:bg-slate-50 focus:bg-slate-50">Goiás e Vitória</SelectItem>
                <SelectItem value="Unidades de Fora" className="text-xs hover:bg-slate-50 focus:bg-slate-50">Unidades de Fora</SelectItem>
              </SelectContent>
            </Select>

            {selectedRegion !== 'all' && (
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-8 bg-blue-50 border-blue-100 text-[#1D4ED8] text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100/50 transition-all animate-in zoom-in-95 duration-300">
                  <SelectValue placeholder="Selecionar Unidade" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-[250px]">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest text-[#1D4ED8]">Todas de {selectedRegion}</SelectItem>
                  {UNIDADES_POR_REGIAO[selectedRegion]?.map(u => (
                    <SelectItem key={u} value={u} className="text-xs hover:bg-slate-50 focus:bg-slate-50">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-4 overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF] mb-4 flex items-center gap-2">
            Fluxo de Provimento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.filter(item => item.visible !== false).map((item) => {
                const parentActive = isParentActive(item);
                const itemActive = isUrlActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all duration-200 group relative select-none",
                          itemActive 
                            ? "bg-[#EFF6FF] text-[#1D4ED8] border-l-[3px] border-[#2563EB] rounded-l-none" 
                            : "text-[#374151] hover:bg-[#F9FAFB] hover:text-[#1D4ED8]"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-200",
                          itemActive ? "text-[#2563EB]" : "text-[#6B7280] group-hover:text-[#2563EB]"
                        )} />
                        {!collapsed && (
                          <span className={cn(
                            "text-sm font-medium",
                            itemActive && "font-semibold"
                          )}>
                            {item.title}
                          </span>
                        )}
                        {item.subMenu && !collapsed && (
                          <ChevronDown className={cn(
                            "h-4 w-4 ml-auto transition-transform duration-200",
                            parentActive && "rotate-180"
                          )} />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                    
                    {!collapsed && item.subMenu && (
                      <div className={cn(
                        "overflow-hidden transition-all duration-200",
                        parentActive ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}>
                        <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-4 py-1">
                          {item.subMenu.map((sub) => {
                            const subActive = isUrlActive(sub.url);
                            return (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={sub.url}
                                    className={cn(
                                      "text-[13px] py-1.5 px-3 rounded-lg transition-all duration-200 block relative select-none font-medium",
                                      subActive 
                                        ? "text-[#1D4ED8] bg-[#EFF6FF] font-semibold" 
                                        : "text-[#374151] hover:text-[#1D4ED8] hover:bg-[#F9FAFB]"
                                    )}
                                  >
                                    <span className="flex items-center gap-2">
                                      {sub.title}
                                    </span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondaryItems.length > 0 && (
          <SidebarGroup className="mt-6 px-3">
            <SidebarGroupLabel className="px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF] mb-4 flex items-center gap-2">
              Bancada Administrativa
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {secondaryItems.map((item) => {
                  const itemActive = isUrlActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all duration-200 group relative select-none",
                            itemActive 
                              ? "bg-[#EFF6FF] text-[#1D4ED8] border-l-[3px] border-[#2563EB] rounded-l-none" 
                              : "text-[#374151] hover:bg-[#F9FAFB] hover:text-[#1D4ED8]"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-200",
                            itemActive ? "text-[#2563EB]" : "text-[#6B7280] group-hover:text-[#2563EB]"
                          )} />
                          {!collapsed && (
                            <span className={cn(
                              "text-sm font-medium",
                              itemActive && "font-semibold"
                            )}>
                              {item.title}
                            </span>
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

      <SidebarFooter className="border-t border-[#E5E7EB] p-4 mt-auto">
        <div className="flex flex-col gap-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Suporte Interno">
                <button 
                  onClick={() => setShowSupport(true)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-[#374151] transition-all group overflow-hidden"
                >
                  <HelpCircle className="h-5 w-5 text-[#6B7280] group-hover:text-[#2563EB] transition-colors" />
                  {!collapsed && <span className="text-sm font-medium">Suporte Interno</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {!collapsed && (
            <div className="px-3 text-[10px] text-[#9CA3AF] font-medium flex items-center justify-between">
              <span>v1.0 · AGIR 2025</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
          )}
        </div>

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
