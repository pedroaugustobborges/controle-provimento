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
  FileText,
  FileCheck,
  Check,
  Search,
  LogOut,
  Circle
} from 'lucide-react';

import logoAgir from '@/assets/logo-agir.png';

import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminStore } from '@/store/adminStore';
import { useAuth } from '@/hooks/useAuth';
import { UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';
import { cn } from '@/lib/utils';
import { useMemo, useState, useCallback, useEffect } from 'react';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin, isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess, getPermissions } = usePermissions();
  const { currentUser, users, selectedRegion, selectedUnit, selectedUnits, setSelectedRegion, setSelectedUnit, setSelectedUnits } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showSupport, setShowSupport] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  }, [signOut, navigate]);

  const mainItems = useMemo(() => [
    { title: 'Visão Geral', url: '/', icon: LayoutDashboard, visible: getPermissions('vagas').canRead },
    { 
      title: 'Controle de Vagas', 
      url: '/vagas', 
      icon: Briefcase, 
      visible: getPermissions('vagas').canRead,
    },
    { 
      title: 'Publicação de Edital', 
      url: '/fila-editais', 
      icon: FileText, 
      visible: getPermissions('publicacao').canRead,
      subMenu: [
        { title: 'Fila de Editais', url: '/fila-editais' },
        { title: 'Redação do Edital', url: '/fila-analista-edital' },
      ]
    },
    { 
      title: 'Validação de Edital', 
      url: '/validacao-editais', 
      icon: FileCheck, 
      visible: getPermissions('validacao').canRead,
    },
    { 
      title: 'Banco de Talentos', 
      url: '/banco-talentos', 
      icon: Users, 
      visible: getPermissions('banco').canRead,
      subMenu: [
        { title: 'Cadastro Reserva', url: '/banco-talentos?tab=list' },
        { title: 'Histórico Conv.', url: '/banco-talentos?tab=convocados' },
        { title: 'Bancos Vencidos', url: '/banco-talentos?tab=vencidos' },
      ]
    },
    { 
      title: 'Convocações', 
      url: '/convocacoes', 
      icon: Calendar, 
      visible: getPermissions('convocacoes').canRead,
      subMenu: [
        { title: 'Convocações Diárias', url: '/convocacoes?tab=diaria' },
        { title: 'Histórico', url: '/convocacoes?tab=list' },
        { title: 'Pendentes', url: '/convocacoes?tab=pending' },
      ]
    },
    { 
      title: 'Alertas e Tarefas', 
      url: '/alertas-tarefas', 
      icon: Bell, 
      visible: getPermissions('alertas').canRead,
    },
  ], [getPermissions]);

  const isUrlActive = useCallback((url: string) => {
    const currentUrl = location.pathname + location.search;
    if (url === '/' || url === '#') return currentUrl === '/';
    
    // For URLs with query parameters, require exact match
    if (url.includes('?')) {
      return currentUrl === url;
    }
    
    // For base URLs, match exactly or as a parent directory
    return currentUrl === url || currentUrl.startsWith(url + '/') || currentUrl.startsWith(url + '?');
  }, [location]);

  const isParentActive = useCallback((item: any) => {
    // If the item itself matches (for exact matches or items without submenus)
    if (item.url !== '#' && isUrlActive(item.url)) {
      // If it has a submenu, we only want it to be "active" if it's the specific base URL match
      // or if one of its children is active.
      if (item.subMenu) {
        const currentUrl = location.pathname + location.search;
        // If we are on the base URL (e.g. /vagas) and it's one of the submenu items
        return currentUrl === item.url || item.subMenu.some((sub: any) => isUrlActive(sub.url));
      }
      return true;
    }
    // Check if any subMenu item is active
    return item.subMenu?.some((sub: any) => isUrlActive(sub.url));
  }, [isUrlActive, location]);

  const secondaryItems = useMemo(() => [
    { title: 'Monitoramento de Prazos', url: '/monitoramento', icon: TrendingUp, visible: getPermissions('monitoramento').canRead },
    { title: 'Importações', url: '/importacoes', icon: FileSpreadsheet, visible: getPermissions('importacoes').canRead },
    { title: 'Administração', url: '/gestor', icon: Settings, visible: getPermissions('administracao').canRead },
  ].filter(item => item.visible), [getPermissions]);

  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    const activeWithSub = mainItems.find(item => item.subMenu && isParentActive(item));
    if (activeWithSub && !openMenus.includes(activeWithSub.title)) {
      setOpenMenus([activeWithSub.title]);
    }
  }, [location.pathname, location.search, mainItems, isParentActive]);

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0A192F] shadow-2xl">
...
      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-white/15" />
            FLUXO DE PROVIMENTO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {mainItems.filter(item => item.visible !== false).map((item) => {
                const active = isParentActive(item);
                const isOpen = openMenus.includes(item.title);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    {item.subMenu ? (
                      <Collapsible
                        open={isOpen}
                        onOpenChange={() => {
                          setOpenMenus(prev => 
                            prev.includes(item.title) ? [] : [item.title]
                          );
                        }}
                        className="w-full"
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton asChild tooltip={item.title}>
                            <div
                              className={cn(
                                "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none cursor-pointer w-full",
                                active 
                                  ? "text-white" 
                                  : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                              )}
                            >
                              <item.icon className={cn(
                                "h-5 w-5 shrink-0 transition-all duration-300",
                                active 
                                  ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
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
                              {!collapsed && (
                                <ChevronDown className={cn(
                                  "absolute right-3 h-3.5 w-3.5 text-white/50 transition-transform duration-300",
                                  isOpen && "rotate-180"
                                )} />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <SidebarMenuSub className="ml-6 mt-1 border-l-2 border-white/20 space-y-0.5 py-1.5 pl-3 relative">
                              {item.subMenu.map((sub) => {
                                const subActive = isUrlActive(sub.url);
                                return (
                                  <SidebarMenuSubItem key={sub.title}>
                                    <SidebarMenuSubButton asChild>
                                      <a
                                        href={sub.url}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          navigate(sub.url);
                                        }}
                                        className={cn(
                                          "text-[11.5px] py-2.5 px-4 rounded-lg transition-all duration-300 block relative select-none group/sub font-bold whitespace-nowrap",
                                          subActive
                                            ? "text-white bg-white/15 shadow-[0_2px_10px_-3px_rgba(255,255,255,0.15)]"
                                            : "text-slate-500 hover:text-slate-200 hover:bg-white/5 hover:translate-x-0.5"
                                        )}
                                      >
                                        <span className="relative z-10 flex items-center gap-2.5 leading-tight">
                                          <span className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0 transition-all duration-300",
                                            subActive ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" : "bg-slate-600"
                                          )} />
                                          {sub.title}
                                        </span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                            active 
                              ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20" 
                              : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active 
                              ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                              : "text-slate-400 group-hover:text-white group-hover:scale-110"
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

        <div className="mx-5 my-3 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <SidebarGroup className="px-3 mt-1">
          <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-white/15" />
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
                              : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-300",
                          active 
                            ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                            : "text-slate-400 group-hover:text-white group-hover:scale-110"
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
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-4 w-4 text-white" />
                  )}
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
              <div className="flex gap-2">
                <button className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/5">
                  Acessar Perfil
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/10"
                  title="Sair do sistema"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              </div>
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
