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
   ShieldCheck,
  LogOut,
  Circle,
  Building2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
import type { Tables } from '@/integrations/supabase/types';
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canImport, canAccessAdmin, isManagement, isAdminAnalyst, isEditalAnalyst, hasFullAccess, getPermissions } = usePermissions();
  const { currentUser, users, selectedRegion, selectedUnit, selectedUnits, setSelectedRegion, setSelectedUnit, setSelectedUnits } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [supportAnalysts, setSupportAnalysts] = useState<Tables<'profiles'>[]>([]);

  useEffect(() => {
    if (showSupport) {
      supabase
        .from('profiles')
        .select('*')
        .eq('status', 'ativo')
        .not('regiao_suporte', 'is', null)
        .then(({ data }) => {
          setSupportAnalysts(data || []);
        });
    }
  }, [showSupport]);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const mainItems = useMemo(() => [
    { title: 'Visão Geral', url: '/', icon: LayoutDashboard, visible: getPermissions('vagas').canRead },
    { 
      title: 'Controle de Vagas', 
      url: '/vagas', 
      icon: Briefcase, 
      visible: getPermissions('vagas').canRead,
      subMenu: [
        { title: 'Todas as Vagas', url: '/vagas' },
        { title: 'Unidades TEIAs', url: '/vagas?filtro=teias' },
        { title: 'Vagas PCD', url: '/vagas?filtro=pcd' },
      ]
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
        { title: 'Agenda Goiânia', url: '/convocacoes?tab=diaria&regiao=goiania' },
        { title: 'Demais Unidades', url: '/convocacoes?tab=diaria&regiao=outras' },
        { title: 'Histórico', url: '/convocacoes?tab=list' },
        { title: 'Pendentes', url: '/convocacoes?tab=pending' },
        { title: 'Dashboard', url: '/convocacoes/dashboard' },
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
    
    // For base URLs without query params: only match exactly or as parent directory
    // Do NOT match when current URL has query params (e.g. /vagas should not be active when on /vagas?filtro=teias)
    return currentUrl === url || currentUrl.startsWith(url + '/');
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
    { title: 'Relatórios', url: '/relatorios', icon: FileSpreadsheet, visible: isManagement || hasFullAccess },
    { title: 'Importações', url: '/importacoes', icon: FileSpreadsheet, visible: getPermissions('importacoes').canRead },
     { title: 'Administração', url: '/gestor', icon: Settings, visible: getPermissions('administracao').canRead },
      { title: 'Gestão Estratégica', url: '/portal-rh', icon: ShieldCheck, visible: isAdminAnalyst || isManagement || hasFullAccess },
     { title: 'Portal da Unidade', url: '/portal-unidade', icon: Building2, visible: true, external: true },
   ].filter(item => item.visible), [getPermissions, isManagement, hasFullAccess, isAdminAnalyst]);

  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [activeParent, setActiveParent] = useState<string | null>(null);

  useEffect(() => {
    const activeWithSub = mainItems.find(item => item.subMenu && isParentActive(item));
    const activeTitle = activeWithSub?.title || null;
    
    // Somente abre o menu automaticamente se mudarmos de uma seção para outra
    if (activeTitle && activeTitle !== activeParent) {
      setOpenMenus([activeTitle]);
      setActiveParent(activeTitle);
    } else if (!activeTitle && activeParent) {
      setActiveParent(null);
    }
  }, [location.pathname, location.search, mainItems, isParentActive, activeParent]);

  return (
      <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar">
        <SidebarHeader className="border-b border-border/50 py-4 px-4">
        <div className="flex items-center gap-3">
          <img src={logoAgir} alt="AGIR" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex flex-col justify-center overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
               <span className="font-black text-xs text-sidebar-foreground uppercase tracking-[0.2em] leading-tight whitespace-nowrap ml-1 opacity-90">
                 Provimento
                 <br />
                  <span className="text-muted-foreground tracking-[0.4em] font-medium text-[9px]">Digital</span>
               </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
           <SidebarGroupLabel className="px-4 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 mb-6 flex items-center gap-3">
             <div className="h-[1px] w-4 bg-border/40" />
             OPERACIONAL
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
                             <NavLink
                               to={item.url}
                               className={cn(
                                 "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative select-none cursor-pointer w-full",
                                 active
                                   ? "text-sidebar-foreground bg-sidebar-accent shadow-sm ring-1 ring-border/30"
                                   : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                               )}
                             >
                               <item.icon className={cn(
                                 "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                                 active
                                   ? "text-primary"
                                   : "text-muted-foreground/60 group-hover:text-sidebar-foreground"
                               )} />
                               {!collapsed && (
                                 <span className={cn(
                                   "text-[13px] font-semibold tracking-tight",
                                   active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                                 )}>
                                   {item.title}
                                 </span>
                               )}
                               {!collapsed && (
                                 <ChevronDown className={cn(
                                   "ml-auto h-3.5 w-3.5 text-muted-foreground/30 transition-transform duration-300",
                                   isOpen && "rotate-180"
                                 )} />
                               )}
                             </NavLink>
                           </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent className="animate-in fade-in slide-in-from-top-1 duration-200">
                           <SidebarMenuSub className="ml-5 mt-1 border-l border-border/60 space-y-1 py-1 pl-4 relative">
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
                                         "text-[12px] py-2 px-3 rounded-lg transition-all duration-300 block relative select-none group/sub font-medium",
                                           subActive
                                             ? "text-primary font-bold bg-sidebar-accent/50"
                                             : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                       )}
                                     >
                                       <span className="relative z-10 flex items-center gap-2.5">
                                         <span className={cn(
                                           "h-1 w-1 rounded-full shrink-0 transition-all duration-300",
                                             subActive ? "bg-primary" : "bg-border group-hover/sub:bg-muted-foreground/30"
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
                           "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative select-none",
                           active
                             ? "bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-border/30"
                             : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                         )}
                       >
                         <item.icon className={cn(
                           "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                           active
                             ? "text-primary"
                             : "text-muted-foreground/60 group-hover:text-sidebar-foreground"
                         )} />
                         {!collapsed && (
                           <span className={cn(
                             "text-[13px] font-semibold tracking-tight",
                             active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                           )}>
                             {item.title}
                           </span>
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

        <div className="mx-5 my-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        <SidebarGroup className="px-3 mt-1">
          <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-border/40" />
            CONTROLE OPERACIONAL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {secondaryItems.map((item) => {
                const active = isParentActive(item);
                const isExternal = (item as any).external === true;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      {isExternal ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                              active
                                ? "bg-success/10 text-success border border-success/20 shadow-sm"
                                : "text-muted-foreground hover:bg-success/5 hover:text-success hover:translate-x-1"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active ? "text-success scale-110" : "text-muted-foreground/50 group-hover:text-success group-hover:scale-110"
                            )} />
                          {!collapsed && (
                            <>
                              <span className="text-[13.5px] font-bold tracking-tight flex-1">{item.title}</span>
                              <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                            </>
                          )}
                        </a>
                      ) : (
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                            active
                              ? "bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-border/30"
                              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            active
                              ? "text-primary scale-110"
                              : "text-muted-foreground/60 group-hover:text-sidebar-foreground group-hover:scale-110"
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
                            <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 py-6 px-4">
        {!collapsed && (
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setShowSupport(true)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-sidebar-accent/30 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all group border border-border/40 shadow-sm"
            >
              <HelpCircle className="h-5 w-5 group-hover:scale-110 transition-transform text-muted-foreground/60 group-hover:text-primary" />
              <span className="text-sm font-bold tracking-tight">Suporte Técnico</span>
            </button>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sidebar-accent/40 to-transparent border border-border/30">
              <div className="flex flex-col overflow-hidden mb-3">
                <span className="text-sm font-bold text-sidebar-foreground truncate leading-tight">
                  {currentUser?.nome_completo || 'Usuário'}
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider truncate leading-tight">
                  {currentUser?.perfil || 'Acesso Restrito'}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg bg-sidebar-accent/50 text-xs font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all border border-border/40">
                  Acessar Perfil
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-all border border-destructive/10"
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
            {[
              { key: 'go_es', label: 'Goiás e Espírito Santo' },
              { key: 'demais', label: 'Demais Unidades' },
            ].map((regiao) => {
              const analysts = supportAnalysts.filter(a => a.regiao_suporte === regiao.key);
              return (
                <div key={regiao.key} className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{regiao.label}</span>
                  {analysts.length === 0 ? (
                    <p className="text-xs text-white/40 italic">Nenhum responsável cadastrado</p>
                  ) : (
                    analysts.map((analyst) => (
                      <div key={analyst.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white overflow-hidden">
                            {analyst.avatar_url ? (
                              <img src={analyst.avatar_url} alt={analyst.nome_completo} className="h-full w-full object-cover" />
                            ) : (
                              analyst.nome_completo?.charAt(0) || '?'
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white leading-tight">{analyst.nome_completo}</h4>
                            <p className="text-xs text-white/50">{analyst.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs">
                            Teams
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs"
                            onClick={() => window.open(`mailto:${analyst.email}`, '_blank')}
                          >
                            E-mail
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} />
    </Sidebar>
  );
}
