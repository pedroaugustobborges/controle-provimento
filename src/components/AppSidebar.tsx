import {
  LayoutDashboard,
  ClipboardList,
  BookUser,
  CheckCircle,
  Settings,
  Calendar,
  Bell,
  ChevronDown,
  FileText,
  FileCheck,
  Check,
  Search,
  Target,
  LogOut,
  Circle,
  Building2,
  ExternalLink,
} from "lucide-react";

import logoAgir from "@/assets/logo-agir.png";

import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdminStore } from "@/store/adminStore";
import { useAuth } from "@/hooks/useAuth";
import { UNIDADES_POR_REGIAO } from "@/lib/vagaUtils";
import { cn } from "@/lib/utils";
import { useMemo, useState, useCallback, useEffect } from "react";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const {
    canImport,
    canAccessAdmin,
    isManagement,
    isAdminAnalyst,
    isEditalAnalyst,
    hasFullAccess,
    getPermissions,
  } = usePermissions();
  const {
    currentUser,
    users,
    selectedRegion,
    selectedUnit,
    selectedUnits,
    setSelectedRegion,
    setSelectedUnit,
    setSelectedUnits,
  } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const mainItems = useMemo(
    () => [
      {
        title: "Visão Geral",
        url: "/",
        icon: LayoutDashboard,
        visible: getPermissions("vagas").canRead,
      },
      {
        title: "Controle de Vagas",
        url: "/vagas",
        icon: ClipboardList,
        visible: getPermissions("vagas").canRead,
        subMenu: [
          { title: "Todas as Vagas", url: "/vagas" },
          { title: "Unidades TEIAs", url: "/vagas?filtro=teias" },
          { title: "Vagas PCD", url: "/vagas?filtro=pcd" },
        ],
      },
      {
        title: "Publicação de Edital",
        url: "/fila-editais",
        icon: FileText,
        visible: getPermissions("publicacao").canRead,
        subMenu: [
          { title: "Fila de Editais", url: "/fila-editais" },
          { title: "Redação do Edital", url: "/fila-analista-edital" },
          { title: "Validação de Edital", url: "/validacao-editais" },
        ],
      },
      {
        title: "Banco de Talentos",
        url: "/banco-talentos",
        icon: BookUser,
        visible: getPermissions("banco").canRead,
        subMenu: [
          { title: "Cadastro Reserva", url: "/banco-talentos?tab=list" },
          { title: "Histórico Conv.", url: "/banco-talentos?tab=convocados" },
          { title: "Bancos Vencidos", url: "/banco-talentos?tab=vencidos" },
        ],
      },
      {
        title: "Convocações",
        url: "/convocacoes",
        icon: Calendar,
        visible: getPermissions("convocacoes").canRead,
        subMenu: [
          {
            title: "Agenda Goiânia",
            url: "/convocacoes?tab=diaria&regiao=goiania",
          },
          {
            title: "Demais Unidades",
            url: "/convocacoes?tab=diaria&regiao=outras",
          },
          { title: "Histórico", url: "/convocacoes?tab=list" },
          { title: "Pendentes", url: "/convocacoes?tab=pending" },
          { title: "Dashboard", url: "/convocacoes/dashboard" },
        ],
      },
      {
        title: "Alertas e Tarefas",
        url: "/alertas-tarefas",
        icon: Bell,
        visible: getPermissions("alertas").canRead,
        comingSoon: true,
      },
    ],
    [getPermissions],
  );

  const isUrlActive = useCallback(
    (url: string) => {
      const currentUrl = location.pathname + location.search;
      if (url === "/" || url === "#") return currentUrl === "/";

      // For URLs with query parameters, require exact match
      if (url.includes("?")) {
        return currentUrl === url;
      }

      // For base URLs without query params: only match exactly or as parent directory
      // Do NOT match when current URL has query params (e.g. /vagas should not be active when on /vagas?filtro=teias)
      return currentUrl === url || currentUrl.startsWith(url + "/");
    },
    [location],
  );

  const isParentActive = useCallback(
    (item: any) => {
      // If the item itself matches (for exact matches or items without submenus)
      if (item.url !== "#" && isUrlActive(item.url)) {
        // If it has a submenu, we only want it to be "active" if it's the specific base URL match
        // or if one of its children is active.
        if (item.subMenu) {
          const currentUrl = location.pathname + location.search;
          // If we are on the base URL (e.g. /vagas) and it's one of the submenu items
          return (
            currentUrl === item.url ||
            item.subMenu.some((sub: any) => isUrlActive(sub.url))
          );
        }
        return true;
      }
      // Check if any subMenu item is active
      return item.subMenu?.some((sub: any) => isUrlActive(sub.url));
    },
    [isUrlActive, location],
  );

  const secondaryItems = useMemo(
    () =>
      [
        {
          title: "Administração",
          url: "/gestor",
          icon: Settings,
          visible: getPermissions("administracao").canRead,
        },
        {
          title: "Gestão Estratégica",
          url: "/portal-rh",
          icon: Target,
          visible: isAdminAnalyst || isManagement || hasFullAccess,
        },
        {
          title: "Portal da Unidade",
          url: "/portal-unidade",
          icon: Building2,
          visible: true,
        },
      ].filter((item) => item.visible),
    [getPermissions, isManagement, hasFullAccess, isAdminAnalyst],
  );

  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [activeParent, setActiveParent] = useState<string | null>(null);

  useEffect(() => {
    const activeWithSub = mainItems.find(
      (item) => item.subMenu && isParentActive(item),
    );
    const activeTitle = activeWithSub?.title || null;

    // Somente abre o menu automaticamente se mudarmos de uma seção para outra
    if (activeTitle && activeTitle !== activeParent) {
      setOpenMenus([activeTitle]);
      setActiveParent(activeTitle);
    } else if (!activeTitle && activeParent) {
      setActiveParent(null);
    }
  }, [
    location.pathname,
    location.search,
    mainItems,
    isParentActive,
    activeParent,
  ]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5 bg-[#0A192F] shadow-2xl"
    >
      <SidebarHeader className="border-b border-white/10 py-6 px-4">
        <div className="flex items-center gap-3 transition-all duration-300">
          {collapsed ? (
            /* ── Collapsed: GDP stacked vertically ─────────────────────── */
            <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
              {'GDP'.split('').map((letter, i) => (
                <span
                  key={i}
                  className="text-[15px] font-black text-white leading-tight tracking-tight select-none"
                >
                  {letter}
                </span>
              ))}
              <span className="mt-1 rounded-full w-1 h-1 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            </div>
          ) : (
            <>
              {/* ── Agir logo — brand mark ──────────────────────────────── */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-white/20 rounded-lg blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
                <img
                  src={logoAgir}
                  alt="AGIR"
                  className="relative h-11 w-11 rounded-lg object-contain bg-white/5 p-1 shadow-inner"
                />
              </div>

              {/* ── Brand-hierarchy divider ──────────────────────────────── */}
              <div className="shrink-0 self-stretch w-px bg-gradient-to-b from-transparent via-white/20 to-transparent mx-2 my-1" />

              {/* ── Product lockup ───────────────────────────────────────── */}
              <div className="flex flex-col justify-center overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                {/* Acronym + accent dot */}
                <div className="flex items-end gap-1 mb-0.5">
                  <span className="leading-none text-white whitespace-nowrap select-none text-2xl font-black tracking-tighter">
                    GDP
                  </span>
                  {/* Cyan neon dot — accent from the dashboard palette */}
                  <span className="shrink-0 rounded-full w-1.5 h-1.5 mb-[3px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8),_0_0_14px_rgba(34,211,238,0.4)]" />
                </div>

                {/* Subtitle */}
                <span className="whitespace-nowrap text-[11px] font-medium text-sky-200/60 tracking-wide mt-0.5">
                  Gestão de Provimento
                </span>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-6 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-5 flex items-center gap-3">
            <div className="h-[1px] w-6 bg-white/15" />
            FLUXO PROVIMENTO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {mainItems
                .filter((item) => item.visible !== false)
                .map((item) => {
                  const active = isParentActive(item);
                  const isOpen = openMenus.includes(item.title);

                  if ((item as any).comingSoon) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <div
                          className="flex items-center gap-3.5 px-3 py-3 rounded-xl opacity-40 cursor-not-allowed select-none"
                          title="Em breve"
                        >
                          <item.icon className="h-5 w-5 shrink-0 text-slate-500" />
                          {!collapsed && (
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span className="text-[13.5px] font-bold tracking-tight text-slate-300 leading-tight">{item.title}</span>
                              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400/70">Em breve</span>
                            </div>
                          )}
                        </div>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      {item.subMenu ? (
                        <Collapsible
                          open={isOpen}
                          onOpenChange={() => {
                            setOpenMenus((prev) =>
                              prev.includes(item.title) ? [] : [item.title],
                            );
                          }}
                          className="w-full"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton asChild tooltip={item.title}>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none cursor-pointer w-full",
                                  active
                                    ? "text-white"
                                    : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1",
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    "h-5 w-5 shrink-0 transition-all duration-300",
                                    active
                                      ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                      : "text-slate-500 group-hover:text-white group-hover:scale-110",
                                  )}
                                />
                                {!collapsed && (
                                  <span
                                    className={cn(
                                      "text-[13.5px] font-bold tracking-tight",
                                      !active &&
                                        "group-hover:translate-x-0.5 transition-transform duration-300",
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                )}
                                {!collapsed && (
                                  <ChevronDown
                                    className={cn(
                                      "absolute right-3 h-3.5 w-3.5 text-white/50 transition-transform duration-300",
                                      isOpen && "rotate-180",
                                    )}
                                  />
                                )}
                              </NavLink>
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
                                              : "text-slate-500 hover:text-slate-200 hover:bg-white/5 hover:translate-x-0.5",
                                          )}
                                        >
                                          <span className="relative z-10 flex items-center gap-2.5 leading-tight">
                                            <span
                                              className={cn(
                                                "h-1.5 w-1.5 rounded-full shrink-0 transition-all duration-300",
                                                subActive
                                                  ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                                                  : "bg-slate-600",
                                              )}
                                            />
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
                            end={item.url === "/"}
                            className={cn(
                              "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative select-none",
                              active
                                ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20"
                                : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1",
                            )}
                          >
                            <item.icon
                              className={cn(
                                "h-5 w-5 shrink-0 transition-all duration-300",
                                active
                                  ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                  : "text-slate-400 group-hover:text-white group-hover:scale-110",
                              )}
                            />
                            {!collapsed && (
                              <span
                                className={cn(
                                  "text-[13.5px] font-bold tracking-tight",
                                  !active &&
                                    "group-hover:translate-x-0.5 transition-transform duration-300",
                                )}
                              >
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
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                              : "text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300 hover:translate-x-1",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active
                                ? "text-emerald-300 scale-110"
                                : "text-slate-400 group-hover:text-emerald-300 group-hover:scale-110",
                            )}
                          />
                          {!collapsed && (
                            <>
                              <span className="text-[13.5px] font-bold tracking-tight flex-1">
                                {item.title}
                              </span>
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
                              ? "bg-white/10 text-white shadow-[0_4px_15px_-5px_rgba(255,255,255,0.1)] border border-white/20"
                              : "text-slate-300 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-300",
                              active
                                ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                : "text-slate-400 group-hover:text-white group-hover:scale-110",
                            )}
                          />
                          {!collapsed && (
                            <span
                              className={cn(
                                "text-[13.5px] font-bold tracking-tight",
                                !active &&
                                  "group-hover:translate-x-0.5 transition-transform duration-300",
                              )}
                            >
                              {item.title}
                            </span>
                          )}
                          {active && !collapsed && (
                            <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" />
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

      <SidebarFooter className="border-t border-white/10 py-6 px-4">
        {!collapsed && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
              <div className="flex flex-col overflow-hidden mb-3">
                <span className="text-sm font-bold text-white truncate leading-tight">
                  {currentUser?.nome_completo || "Usuário"}
                </span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate leading-tight text-center">
                  {currentUser?.perfil || "Acesso Restrito"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-lg bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/10"
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

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
      />
    </Sidebar>
  );
}
