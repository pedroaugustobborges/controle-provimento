import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";

import logoAgir from "@/assets/logo-agir-white.png";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  Home,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Briefcase,
  FileText,
  ListOrdered,
  Megaphone,
  ShieldCheck,
  Users,
  Upload,
  LayoutDashboard,
  Mail,
  BriefcaseBusiness,
  Shield,
  MapPin,
  CheckCircle2,
  History,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  Camera,
  FileBarChart,
  KeyRound,
  Eye,
  EyeOff,
  ThumbsUp,
  AtSign,
  Clock,
} from "lucide-react";
import { AgieChat } from "./chat/AgieChat";
import { InactivityLogout } from "./InactivityLogout";
import { UserSessionTracker } from "./UserSessionTracker";
import { UpdateBanner } from "./UpdateBanner";
import { AccessHistoryPopoverContent } from "./AccessHistoryPopoverContent";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/adminStore";
import { useVagasStore } from "@/store/vagasStore";
import { getUnitDisplayName } from "@/lib/vagaUtils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
// ... keep existing code
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const routeContextMap: Record<
  string,
  { color: string; bgLight: string; icon: React.ElementType }
> = {
  vagas: {
    color: "text-blue-600",
    bgLight: "bg-blue-50 border-blue-200",
    icon: Briefcase,
  },
  editais: {
    color: "text-teal-600",
    bgLight: "bg-teal-50 border-teal-200",
    icon: FileText,
  },
  "fila-editais": {
    color: "text-cyan-600",
    bgLight: "bg-cyan-50 border-cyan-200",
    icon: ListOrdered,
  },
  convocacoes: {
    color: "text-amber-600",
    bgLight: "bg-amber-50 border-amber-200",
    icon: Megaphone,
  },
  validacao: {
    color: "text-emerald-600",
    bgLight: "bg-emerald-50 border-emerald-200",
    icon: ShieldCheck,
  },
  gestor: {
    color: "text-purple-600",
    bgLight: "bg-purple-50 border-purple-200",
    icon: Settings,
  },
  "banco-talentos": {
    color: "text-indigo-600",
    bgLight: "bg-indigo-50 border-indigo-200",
    icon: Users,
  },
  importacoes: {
    color: "text-green-600",
    bgLight: "bg-green-50 border-green-200",
    icon: Upload,
  },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Sync dark mode class to body — covers the header and all Radix portals
  useEffect(() => {
    if (isDark) document.body.classList.add("gdp-dark");
    else document.body.classList.remove("gdp-dark");
  }, [isDark]);
  const {
    currentUser,
    fetchCurrentProfile,
    subscribeRealtime: subscribeAdminRealtime,
    unsubscribeRealtime: unsubscribeAdminRealtime,
  } = useAdminStore();
  const { signOut } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);
  const {
    alertas,
    updateAlerta,
    fetchVagas,
    fetchBancos,
    fetchNotificacoes,
    subscribeRealtime,
    unsubscribeRealtime,
    getVaga,
    notificacoes,
    marcarNotificacaoLida,
    marcarTodasLidas,
    bancos,
  } = useVagasStore();
  // personal notifications: curtidas + mencoes targeted to the current user
  const notifPessoais = (notificacoes as any[]).filter(
    (n) =>
      (n.tipo === "curtida" || n.tipo === "mencao") &&
      n.usuario_id === currentUser?.id,
  );
  const unreadNotifPessoaisCount = notifPessoais.filter((n) => !n.lida).length;
  // Compute validity deadline alerts from bancos (val6m = data_resultado + 6 months)
  const validadeAlerts = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const seen = new Set<string>();
    const result: Array<{
      numero_processo_seletivo: string;
      cargo: string;
      val6m: Date;
    }> = [];

    const bancounidades = currentUser?.unidades_banco_talentos;
    const hasBancoFilter =
      !currentUser?.visualiza_todas_unidades &&
      Array.isArray(bancounidades) &&
      bancounidades.length > 0;

    for (const banco of bancos as any[]) {
      // Apply the same banco de talentos unit access restriction used in BancoTalentosPage
      if (hasBancoFilter) {
        const matchesTeia = bancounidades!.includes("Rede TEIA") && !!banco.is_teia;
        const matchesCity = bancounidades!.some(
          (u: string) =>
            u !== "Rede TEIA" &&
            (banco.unidade || "").toLowerCase() === u.toLowerCase(),
        );
        if (!matchesTeia && !matchesCity) continue;
      }

      const ps = banco.numero_processo_seletivo;
      if (!ps || seen.has(ps)) continue;
      seen.add(ps);

      if (banco.is_prorrogado) continue;

      const dataResultado = banco.data_resultado;
      if (!dataResultado) continue;

      let resultadoDate: Date;
      try {
        resultadoDate = parseISO(dataResultado);
        if (isNaN(resultadoDate.getTime())) continue;
      } catch {
        continue;
      }

      const val6m = addMonths(resultadoDate, 6);
      if (val6m >= now && val6m <= in30Days) {
        result.push({
          numero_processo_seletivo: ps,
          cargo: banco.cargo || "",
          val6m,
        });
      }
    }
    return result;
  }, [bancos, currentUser]);

  const unreadAlertsCount =
    alertas.filter((a) => a.status === "nao_lido").length +
    unreadNotifPessoaisCount +
    validadeAlerts.length;
  const mainRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchCurrentProfile();
    fetchVagas();
    fetchBancos();
    fetchNotificacoes();
    subscribeRealtime();
    subscribeAdminRealtime();
    return () => {
      unsubscribeRealtime();
      unsubscribeAdminRealtime();
    };
  }, [
    fetchCurrentProfile,
    fetchVagas,
    fetchBancos,
    fetchNotificacoes,
    subscribeRealtime,
    unsubscribeRealtime,
    subscribeAdminRealtime,
    unsubscribeAdminRealtime,
  ]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .filter(
            (user: any, index: number, self: any[]) =>
              index === self.findIndex((u: any) => u.id === user.id),
          );
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, () => {
        // Presence join events are reflected in the online users counter only.
        // Toasts intentionally suppressed to avoid flicker from reconnects/sync.
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        // Handle leave if needed
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: currentUser.id,
            nome_completo: currentUser.nome_completo,
            perfil: currentUser.perfil,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    const handleScroll = () => {
      const compact = mainEl.scrollTop > 50;
      setIsCompact((prev) => (prev === compact ? prev : compact));
    };
    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  const activeRoute = pathnames[0] || "";
  const routeCtx = routeContextMap[activeRoute];

  const labels: Record<string, string> = {
    vagas: "Controle de Vagas",
    editais: "Editais",
    "fila-editais": "Fila de Editais",
    "fila-analista-edital": "Redação de Edital",
    "validacao-editais": "Validação de Edital",
    "banco-talentos": "Cadastro Reserva",
    convocacoes: "Histórico de Convocação",
    gestor: "Administração",
    importacoes: "Importações",
    monitoramento: "Monitoramento de Prazos",
    "alertas-tarefas": "Alertas e Tarefas",
    mensagens: "Mensagens",
    relatorios: "Módulo de Relatórios",
  };

  const getBreadcrumbLabel = (path: string) => {
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Início", path: "/" }];
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");

    // Explicit overrides based on path requirements and sidebar hierarchy
    if (path === "/vagas") {
      breadcrumbs.push({ label: "Controle de Vagas", path: "/vagas" });
      return breadcrumbs;
    }

    if (pathnames[0] === "vagas" && pathnames.length === 2) {
      const vagaId = pathnames[1];
      const vaga = getVaga(vagaId);
      breadcrumbs.push({ label: "Controle de Vagas", path: "/vagas" });
      breadcrumbs.push({ label: vaga?.cargo || vagaId, path: path });
      return breadcrumbs;
    }

    if (path === "/validacao-editais") {
      breadcrumbs.push({
        label: "Validação de Edital",
        path: "/validacao-editais",
      });
      return breadcrumbs;
    }

    if (path === "/editais") {
      breadcrumbs.push({ label: "Editais", path: "/editais" });
      return breadcrumbs;
    }

    if (path === "/fila-editais" || path === "/fila-analista-edital") {
      if (path === "/fila-editais") {
        breadcrumbs.push({ label: "Fila de Editais", path: "/fila-editais" });
      } else {
        breadcrumbs.push({
          label: "Publicação de Edital",
          path: "/fila-editais",
        });
        breadcrumbs.push({
          label: "Redação de Edital",
          path: "/fila-analista-edital",
        });
      }
      return breadcrumbs;
    }

    if (path === "/banco-talentos") {
      breadcrumbs.push({ label: "Cadastro Reserva", path: "/banco-talentos" });

      // Points 1, 2, 3: Reflect subpages within Cadastro Reserva
      if (tab === "convocados") {
        breadcrumbs.push({
          label: "Histórico de Convocação",
          path: "/banco-talentos?tab=convocados",
        });
      } else if (tab === "vencidos") {
        breadcrumbs.push({
          label: "Bancos Vencidos",
          path: "/banco-talentos?tab=vencidos",
        });
      }
      // Point 4: For the main page (tab=list or others not specified),
      // it stays as "Início > Cadastro Reserva"

      return breadcrumbs;
    }

    if (path === "/convocacoes") {
      // Point 1: Histórico de Convocação should have "Cadastro Reserva" as intermediate clickable link
      breadcrumbs.push({ label: "Cadastro Reserva", path: "/banco-talentos" });
      breadcrumbs.push({
        label: "Histórico de Convocação",
        path: "/convocacoes",
      });
      return breadcrumbs;
    }

    // Default logic for other pages
    if (pathnames.length > 0) {
      pathnames.forEach((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const label = getBreadcrumbLabel(name);
        breadcrumbs.push({ label, path: routeTo });
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleChangeOwnPassword = async () => {
    if (!currentUser) return;
    if (cpNewPassword !== cpConfirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (
      cpNewPassword.length < 8 ||
      !/[A-Za-z]/.test(cpNewPassword) ||
      !/\d/.test(cpNewPassword) ||
      !/[^A-Za-z0-9]/.test(cpNewPassword)
    ) {
      toast.error(
        "A senha deve ter no mínimo 8 caracteres com letra, número e símbolo.",
      );
      return;
    }
    setCpSaving(true);
    try {
      // Verify current password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: cpCurrentPassword,
      });
      if (authError) {
        toast.error("Senha atual incorreta.");
        setCpSaving(false);
        return;
      }
      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: cpNewPassword,
      });
      if (error) throw error;

      // Log to audit (fire-and-forget)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        supabase
          .from("audit_logs")
          .insert({
            usuario_id: user.id,
            acao: "PASSWORD_CHANGED_BY_USER",
            modulo: "usuarios",
            registro_afetado: user.id,
          })
          .then();
      }

      toast.success("Senha alterada com sucesso!");
      setShowChangePassword(false);
      setCpCurrentPassword("");
      setCpNewPassword("");
      setCpConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha.");
    } finally {
      setCpSaving(false);
    }
  };

  const userName =
    currentUser?.nome_completo?.trim().split(/\s+/).filter(Boolean)[0] ||
    "Usuário";
  const initials = currentUser?.nome_completo
    ? currentUser.nome_completo
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <UpdateBanner />
        <UserSessionTracker />
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className="shrink-0 z-20 sticky top-0 transition-all duration-300"
            style={{
              background: isDark
                ? "rgba(7,9,29,0.92)"
                : "hsl(var(--background))",
              backdropFilter: isDark ? "blur(20px)" : undefined,
              WebkitBackdropFilter: isDark ? "blur(20px)" : undefined,
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : undefined,
            }}
          >
            {/* Top bar */}
            <div
              className={`flex items-center justify-between px-6 border-b transition-all duration-300 ${
                isCompact ? "h-12 shadow-sm" : "h-16"
              }`}
              style={{
                background: isDark
                  ? "transparent"
                  : isCompact
                    ? "hsl(var(--background))"
                    : undefined,
                borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-lg border border-border/50" />

                {/* Greeting — hidden when compact */}
                <div
                  className={`hidden md:flex flex-col gap-0.5 transition-all duration-300 overflow-hidden ${
                    isCompact ? "opacity-0 max-w-0" : "opacity-100 max-w-xs"
                  }`}
                >
                  {/* Greeting + name */}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span style={{ fontSize: "14px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.50)" : "#64748b" }}>
                      {getGreeting()},
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      {userName}
                    </span>
                    <span className="dash-neon-dot" />
                  </div>
                  {/* Role / unit sub-line */}
                  <span style={{ fontSize: "9.5px", fontWeight: 600, color: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                    {currentUser?.cargo || "Sistema AGIR"} · {currentUser?.perfil || "Usuário"}
                  </span>
                </div>

                {/* Route context icon — shown when compact */}
                {isCompact && routeCtx && (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: isDark ? "rgba(129,140,248,0.12)" : undefined,
                      border: isDark ? "1px solid rgba(129,140,248,0.22)" : undefined,
                      color: isDark ? "#818cf8" : undefined,
                      fontSize: "11px", fontWeight: 700,
                    }}
                    className={isDark ? "" : `${routeCtx.bgLight} ${routeCtx.color} border`}
                  >
                    <routeCtx.icon style={{ width: "14px", height: "14px" }} />
                    <span>{getBreadcrumbLabel(activeRoute)}</span>
                  </div>
                )}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {currentUser?.perfil === "Administrador" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "5px 13px 5px 10px",
                          borderRadius: "999px",
                          background: isDark ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.07)",
                          border: `1px solid ${isDark ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.22)"}`,
                          color: "#10b981",
                          fontSize: "10px", fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          letterSpacing: "0.04em",
                          boxShadow: isDark ? "0 0 14px rgba(16,185,129,0.12)" : "none",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", flexShrink: 0, animation: "bellPing 2.4s ease-out infinite" }} />
                        <Users style={{ width: "12px", height: "12px" }} />
                        <span>{onlineUsers.length} online</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="p-0 border-none bg-transparent shadow-none w-auto"
                    >
                      <AccessHistoryPopoverContent onlineUsers={onlineUsers} />
                    </PopoverContent>
                  </Popover>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      style={{
                        position: "relative",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: "38px", height: "38px",
                        borderRadius: "12px",
                        background: unreadAlertsCount > 0
                          ? isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.08)"
                          : isDark ? "rgba(255,255,255,0.07)" : "rgba(148,163,184,0.10)",
                        border: `1px solid ${unreadAlertsCount > 0
                          ? isDark ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.25)"
                          : isDark ? "rgba(255,255,255,0.11)" : "rgba(148,163,184,0.22)"}`,
                        color: unreadAlertsCount > 0 ? "#f59e0b" : isDark ? "rgba(255,255,255,0.55)" : "#64748b",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0,
                        boxShadow: unreadAlertsCount > 0 && isDark ? "0 0 16px rgba(245,158,11,0.18)" : "none",
                        outline: "none",
                      }}
                    >
                      {/* Expanding halo ring — only when unread */}
                      {unreadAlertsCount > 0 && (
                        <span
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{
                            background: "rgba(245,158,11,0.18)",
                            animation: "bellPing 2.4s ease-out infinite",
                          }}
                        />
                      )}

                      {/* Bell icon — rings when unread */}
                      <Bell
                        style={{
                          width: "16px", height: "16px", position: "relative",
                          ...(unreadAlertsCount > 0 ? { transformOrigin: "50% 8%", animation: "bellRing 3.2s ease-in-out infinite" } : {}),
                        }}
                      />

                      {/* Numeric count badge */}
                      {unreadAlertsCount > 0 && (
                        <span
                          style={{
                            position: "absolute", top: "-6px", right: "-6px",
                            minWidth: "18px", height: "18px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "999px",
                            background: "#ef4444",
                            fontSize: "9px", fontWeight: 800, color: "#fff",
                            padding: "0 4px",
                            boxShadow: `0 0 0 2px ${isDark ? "rgba(7,9,29,0.9)" : "#fff"}`,
                          }}
                        >
                          {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-[360px] p-0 overflow-hidden shadow-2xl rounded-2xl"
                    style={{
                      background: isDark ? "rgba(11,16,34,0.97)" : "#ffffff",
                      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.70)",
                      backdropFilter: isDark ? "blur(24px)" : undefined,
                    }}
                  >
                    {/* ── Header ── */}
                    <div
                      className="relative px-4 py-3.5 overflow-hidden"
                      style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"}` }}
                    >
                      <div className="absolute inset-0 pointer-events-none" style={{ background: isDark ? "rgba(129,140,248,0.04)" : "rgba(99,102,241,0.03)" }} />
                      <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div style={{ width: 32, height: 32, borderRadius: 12, background: isDark ? "rgba(129,140,248,0.18)" : "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Bell style={{ width: 14, height: 14, color: "#818cf8" }} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.92)" : "#1e293b", lineHeight: 1.2 }}>
                              Notificações
                            </h3>
                            {unreadAlertsCount > 0 ? (
                              <p style={{ fontSize: 10, fontWeight: 600, color: "#818cf8", lineHeight: 1.2 }}>
                                {unreadAlertsCount} não lida{unreadAlertsCount > 1 ? "s" : ""}
                              </p>
                            ) : (
                              <p style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", lineHeight: 1.2 }}>
                                Tudo em dia
                              </p>
                            )}
                          </div>
                        </div>
                        {unreadAlertsCount > 0 && (
                          <button
                            onClick={() => {
                              notifPessoais
                                .filter((n: any) => !n.lida)
                                .forEach((n: any) => marcarNotificacaoLida(n.id));
                              alertas
                                .filter((a) => a.status === "nao_lido")
                                .forEach((a) => updateAlerta(a.id, { status: "lido" }));
                            }}
                            style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.40)" : "#94a3b8", padding: "5px 10px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.2s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#818cf8"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.40)" : "#94a3b8"; }}
                          >
                            Marcar todas como lidas
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── List ── */}
                    <div className="max-h-[420px] overflow-y-auto">
                      {notifPessoais.length === 0 && alertas.length === 0 && validadeAlerts.length === 0 ? (
                        /* Empty state */
                        <div style={{ padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                          <div style={{ width: 64, height: 64, borderRadius: 16, background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "#f1f5f9"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Bell style={{ width: 28, height: 28, color: isDark ? "rgba(255,255,255,0.20)" : "#cbd5e1" }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.50)" : "#64748b" }}>Tudo em dia!</p>
                            <p style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.30)" : "#94a3b8", marginTop: 4 }}>Sem novas notificações.</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Personal: curtidas + menções */}
                          {notifPessoais
                            .slice()
                            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((notif: any) => {
                              const isMencao = notif.tipo === "mencao";
                              const isUnread = !notif.lida;
                              const senderInitial = (notif.remetente_nome || "?")[0].toUpperCase();
                              const accentColor = isMencao ? "#8b5cf6" : "#3b82f6";
                              const bgUnread = isDark
                                ? isMencao ? "rgba(139,92,246,0.08)" : "rgba(59,130,246,0.08)"
                                : isMencao ? "rgba(139,92,246,0.04)" : "rgba(59,130,246,0.04)";
                              return (
                                <Link
                                  key={notif.id}
                                  to={notif.registro_id ? `/vagas/${notif.registro_id}` : "#"}
                                  onClick={() => { if (isUnread) marcarNotificacaoLida(notif.id); }}
                                  style={{
                                    position: "relative", display: "flex", gap: 12,
                                    padding: "14px 16px",
                                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"}`,
                                    background: isUnread ? bgUnread : "transparent",
                                    transition: "background 0.15s",
                                    textDecoration: "none",
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isUnread ? bgUnread : "transparent"; }}
                                >
                                  {isUnread && (
                                    <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: "0 2px 2px 0", background: accentColor }} />
                                  )}
                                  {/* Avatar */}
                                  <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                                    <div style={{
                                      width: 36, height: 36, borderRadius: "50%",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 13, fontWeight: 700,
                                      background: isDark
                                        ? isMencao ? "rgba(139,92,246,0.20)" : "rgba(59,130,246,0.20)"
                                        : isMencao ? "#ede9fe" : "#dbeafe",
                                      color: isMencao ? "#7c3aed" : "#2563eb",
                                    }}>
                                      {senderInitial}
                                    </div>
                                    <span style={{
                                      position: "absolute", bottom: -2, right: -2,
                                      width: 16, height: 16, borderRadius: "50%",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      background: accentColor,
                                      boxShadow: `0 0 0 2px ${isDark ? "rgba(11,16,34,0.97)" : "#fff"}`,
                                    }}>
                                      {isMencao
                                        ? <AtSign style={{ width: 8, height: 8, color: "#fff" }} />
                                        : <ThumbsUp style={{ width: 8, height: 8, color: "#fff" }} />}
                                    </span>
                                  </div>
                                  {/* Text */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, lineHeight: 1.4, fontWeight: isUnread ? 600 : 400, color: isDark ? (isUnread ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.60)") : (isUnread ? "#1e293b" : "#475569"), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                      {notif.titulo}
                                    </p>
                                    {notif.mensagem && (
                                      <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginTop: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {notif.mensagem}
                                      </p>
                                    )}
                                    <p style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.30)" : "#94a3b8", marginTop: 6, fontWeight: 500 }}>
                                      {notif.created_at ? format(parseISO(notif.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR }) : ""}
                                    </p>
                                  </div>
                                  {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: accentColor }} />}
                                </Link>
                              );
                            })}

                          {/* Validity deadline alerts */}
                          {validadeAlerts.map((va) => (
                            <button
                              key={`validade-${va.numero_processo_seletivo}`}
                              onClick={() => navigate(`/banco-talentos?openProcesso=${encodeURIComponent(va.numero_processo_seletivo)}`)}
                              style={{
                                position: "relative", display: "flex", gap: 12,
                                padding: "14px 16px", width: "100%", textAlign: "left",
                                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"}`,
                                background: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.04)",
                                border: "none", cursor: "pointer", transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.04)"; }}
                            >
                              <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: "0 2px 2px 0", background: "#f59e0b" }} />
                              <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, background: isDark ? "rgba(245,158,11,0.18)" : "#fef3c7", color: "#d97706" }}>
                                <Clock style={{ width: 16, height: 16 }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.92)" : "#1e293b" }}>
                                  A validade do processo {va.numero_processo_seletivo} está próxima.
                                </p>
                                <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "#64748b", marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                  O processo seletivo vence em {format(va.val6m, "dd/MM/yyyy")}. Gostaria de prorrogar por mais 6 meses?
                                </p>
                              </div>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: "#f59e0b" }} />
                            </button>
                          ))}

                          {/* System / workflow alerts */}
                          {alertas.map((alerta) => {
                            const isAtraso = alerta.tipo === "atraso";
                            const isCritico = alerta.tipo === "critico";
                            const isUnread = alerta.status === "nao_lido";
                            const iconColor = isAtraso ? "#d97706" : isCritico ? "#dc2626" : "#818cf8";
                            const iconBg = isDark
                              ? isAtraso ? "rgba(245,158,11,0.18)" : isCritico ? "rgba(220,38,38,0.18)" : "rgba(129,140,248,0.18)"
                              : isAtraso ? "#fef3c7" : isCritico ? "#fee2e2" : "#ede9fe";
                            const rowBg = isUnread
                              ? isDark ? "rgba(129,140,248,0.06)" : "rgba(99,102,241,0.03)"
                              : "transparent";
                            return (
                              <Link
                                key={alerta.id}
                                to={alerta.link || "#"}
                                onClick={() => { if (isUnread) updateAlerta(alerta.id, { status: "lido" }); }}
                                style={{
                                  position: "relative", display: "flex", gap: 12,
                                  padding: "14px 16px",
                                  borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"}`,
                                  background: rowBg,
                                  transition: "background 0.15s",
                                  textDecoration: "none",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                              >
                                {isUnread && (
                                  <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: "0 2px 2px 0", background: iconColor }} />
                                )}
                                <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, background: iconBg, color: iconColor }}>
                                  {isAtraso ? <AlertTriangle style={{ width: 16, height: 16 }} /> : isCritico ? <Bell style={{ width: 16, height: 16 }} /> : <Info style={{ width: 16, height: 16 }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 12, lineHeight: 1.4, fontWeight: isUnread ? 600 : 400, color: isDark ? (isUnread ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.60)") : (isUnread ? "#1e293b" : "#475569"), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {alerta.titulo}
                                  </p>
                                  {alerta.mensagem && (
                                    <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {alerta.mensagem}
                                    </p>
                                  )}
                                  <p style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.30)" : "#94a3b8", marginTop: 6, fontWeight: 500 }}>
                                    {format(parseISO(alerta.data_criacao), "dd 'de' MMM", { locale: ptBR })}
                                  </p>
                                </div>
                                {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: iconColor }} />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <div
                  style={{
                    width: "1px", height: "28px", flexShrink: 0, margin: "0 4px",
                    background: isDark ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.30)",
                  }}
                />

                <button
                  onClick={() => setShowProfile(true)}
                  style={{
                    borderRadius: "50%", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: isCompact ? "32px" : "38px",
                    height: isCompact ? "32px" : "38px",
                    outline: "none",
                    boxShadow: isDark
                      ? "0 0 0 2px rgba(129,140,248,0.45), 0 0 12px rgba(129,140,248,0.20)"
                      : "0 0 0 2px rgba(99,102,241,0.35)",
                    transition: "all 0.25s",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {initials}
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Breadcrumb bar */}
            {pathnames.length > 0 && (
              <div
                className={`flex items-center px-6 transition-all duration-300 ${
                  isCompact
                    ? "h-0 opacity-0 overflow-hidden border-0"
                    : "h-10 opacity-100"
                }`}
                style={{
                  background: isDark ? "rgba(7,9,29,0.85)" : "hsl(var(--background))",
                  borderBottom: isDark
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid hsl(var(--border) / 0.30)",
                }}
              >
                <Breadcrumb>
                  <BreadcrumbList className="gap-1">
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to="/"
                          className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Home className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Início</span>
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.slice(1).map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 2;
                      return (
                        <React.Fragment key={crumb.path}>
                          <BreadcrumbSeparator>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-xs font-semibold px-2 py-0.5 text-foreground">
                                {crumb.label}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link
                                  to={crumb.path}
                                  className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
                                >
                                  {crumb.label}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            )}
          </header>

          <main
            ref={mainRef}
            className="flex-1 overflow-auto p-8 max-w-[1600px] mx-auto w-full"
          >
            <div className="animate-in fade-in duration-200">{children}</div>
          </main>
          {/* <AgieChat /> */}
          <InactivityLogout />
        </div>
      </div>

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-background shadow-2xl">
          <div className="relative h-36 bg-primary flex items-center justify-center">
            <img src={logoAgir} alt="AGIR" className="h-14 object-contain" />
            <div className="absolute -bottom-12 left-8 group">
              <div className="h-24 w-24 rounded-full border-4 border-background bg-muted overflow-hidden shadow-lg relative">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {initials}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentUser) return;
                      try {
                        const fileExt = file.name.split(".").pop();
                        const filePath = `${currentUser.id}/${Math.random()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from("avatars")
                          .upload(filePath, file);
                        if (error) throw error;
                        const {
                          data: { publicUrl },
                        } = supabase.storage
                          .from("avatars")
                          .getPublicUrl(filePath);

                        await supabase
                          .from("profiles")
                          .update({ avatar_url: publicUrl })
                          .eq("id", currentUser.id);
                        await fetchCurrentProfile();
                        // Also update admin store if needed, but fetchCurrentProfile should do it
                      } catch (err: any) {
                        console.error("Error uploading avatar:", err);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {currentUser?.nome_completo || userName}
                </h2>
                <p className="text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  {currentUser?.cargo || "Colaborador AGIR"}
                </p>
              </div>
              <Badge
                variant={
                  currentUser?.status === "ativo" ? "default" : "secondary"
                }
                className="capitalize px-3 py-1 text-xs font-bold bg-success/10 text-success border-success/20 hover:bg-success/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success mr-2 animate-pulse" />
                {currentUser?.status || "Ativo"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 transition-all hover:bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      E-mail Corporativo
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {currentUser?.email || "Não informado"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 transition-all hover:bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Perfil de Acesso
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {currentUser?.perfil || "Analista de RH"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Unidades Vinculadas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentUser?.visualiza_todas_unidades ? (
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20 font-bold py-1 px-3"
                      >
                        Todas as Unidades
                      </Badge>
                    ) : currentUser?.unidades_vinculadas &&
                      currentUser.unidades_vinculadas.length > 0 ? (
                      currentUser.unidades_vinculadas.map((unidade, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white text-muted-foreground border-border font-medium"
                        >
                          {getUnitDisplayName(unidade)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Nenhuma unidade vinculada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Sessão autenticada e segura
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setShowChangePassword(true);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-primary hover:underline underline-offset-4 flex items-center gap-1"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Alterar Senha
                  </button>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="text-xs font-bold text-primary hover:underline underline-offset-4"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ALTERAR SENHA PRÓPRIA */}
      <Dialog
        open={showChangePassword}
        onOpenChange={(open) => {
          setShowChangePassword(open);
          if (!open) {
            setCpCurrentPassword("");
            setCpNewPassword("");
            setCpConfirmPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Alterar Minha Senha
            </DialogTitle>
            <DialogDescription>
              Informe sua senha atual e escolha uma nova senha forte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={cpShowCurrent ? "text" : "password"}
                  value={cpCurrentPassword}
                  onChange={(e) => setCpCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setCpShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {cpShowCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={cpShowNew ? "text" : "password"}
                  value={cpNewPassword}
                  onChange={(e) => setCpNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, letra, número, símbolo"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setCpShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {cpShowNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={cpConfirmPassword}
                onChange={(e) => setCpConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="new-password"
              />
              {cpConfirmPassword && cpNewPassword !== cpConfirmPassword && (
                <p className="text-xs text-destructive">
                  As senhas não coincidem.
                </p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Requisitos: mínimo 8 caracteres, incluindo letras, números e ao
              menos um símbolo (@, #, !, etc.).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowChangePassword(false)}
              className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleChangeOwnPassword}
              disabled={
                cpSaving ||
                !cpCurrentPassword ||
                !cpNewPassword ||
                cpNewPassword !== cpConfirmPassword
              }
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              {cpSaving ? "Salvando..." : "Salvar Nova Senha"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
