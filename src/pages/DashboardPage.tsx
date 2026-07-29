import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  calcDiasAberto,
  normalizeUnitName,
  unitIsAllowed,
  getCategoriaStatus,
  getValidVacancyBase,
  filterByRegionAndUnit,
  getRegionForUnit,
  normStatus,
} from "@/lib/vagaUtils";
import {
  Briefcase,
  FileText,
  Clock,
  Activity,
  Users,
  Building2,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Sigma,
  Play,
  UserCheck,
  AlertCircle,
  ArrowLeftRight,
  ChevronRight,
  ChevronDown,
  RefreshCcw,
  Search,
  X,
  Check,
  Calendar,
  TrendingUp,
  Zap,
  Sun,
  Moon,
  MessageSquare,
  Plus,
  GitBranch,
  Puzzle,
  Accessibility,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

// ─── Module-level constants ──────────────────────────────────────────────────

const UNIT_MAPPING = [
  { bank: "HRD", vacancies: ["DOURADOS", "CHRD"], display: "CHRD / DOURADOS" },
  { bank: "HRC", vacancies: ["HRCAC I", "HRCAC II"], display: "HRCAC I / II" },
  { bank: "CHS", vacancies: ["CHS"], display: "CHS" },
  { bank: "HMSA", vacancies: ["HMSA"], display: "HMSA" },
  { bank: "JATAÍ", vacancies: ["JATAÍ", "HEJ"], display: "JATAÍ / HEJ" },
  { bank: "POLICLÍNICA", vacancies: ["POLICLÍNICA"], display: "POLICLÍNICA" },
  {
    bank: "GOIÂNIA",
    vacancies: ["CRER", "HUGOL", "HECAD", "HDS", "AGIR"],
    display: "GOIÂNIA (HOSPITAIS)",
  },
  { bank: "UPA", vacancies: ["SÃO PEDRO", "SUÁ", "UPA"], display: "VITÓRIA" },
];

// Exact unidade names that belong to the Rede TEIA network.
// Normalized (uppercase, no accents) for reliable matching.
const TEIA_UNIDADES = new Set([
  "CLINICA TEIA",
  "TEIA AP. DE GOIANIA - CLINICA TEIA",
  "TEIA MANAUS III - CLINICA TEIA CAIC DR AFRANIO SOARES",
  "TEIA MANAUS II - CLINICA TEIA CAC DR GILSON MOREIRA",
  "TEIA SENADOR CANEDO - CLINICA TEIA",
  "TEIA MANAUS I - CLINICA TEIA CAIC DR JOSE CONTENTE",
  "TEIA ANAPOLIS - CLINICA ESCOLA TEIA",
].map((n) => normalizeUnitName(n)));

const DONUT_COLORS_DARK = [
  "#818cf8",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#a78bfa",
  "#22d3ee",
  "#94a3b8",
];
const DONUT_COLORS_LIGHT = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
];

// ─── Canonical cache ──────────────────────────────────────────────────────────

const canonicalCache = new Map<string, string>();
const resolveCanonicalName = (unitName: string) => {
  if (!unitName) return "";
  if (canonicalCache.has(unitName)) return canonicalCache.get(unitName)!;
  const norm = normalizeUnitName(unitName);
  for (const map of UNIT_MAPPING) {
    if (
      normalizeUnitName(map.bank) === norm ||
      map.vacancies.some((v) => normalizeUnitName(v) === norm)
    ) {
      canonicalCache.set(unitName, map.display);
      return map.display;
    }
  }
  canonicalCache.set(unitName, norm);
  return norm;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const {
    vagas: allVagas = [],
    bancos = [],
    editais = [],
    convocacoes = [],
    tarefas = [],
    fetchAll,
    isLoadingVagas,
    isLoadingBancos,
    isInitialLoad,
  } = useVagasStore();
  const {
    currentUser,
    selectedRegion,
    selectedUnits,
    setSelectedUnits,
    users,
    fetchUsers,
  } = useAdminStore();

  const [chartMode, setChartMode] = useState<"unidade" | "regiao">("unidade");
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const [isUnitPickerOpen, setIsUnitPickerOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activityPage, setActivityPage] = useState(0);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPCD, setFilterPCD] = useState(false);
  const [filterTeia, setFilterTeia] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const clearAllFilters = useCallback(() => {
    setSelectedUnits(["all"]);
    setDateFrom("");
    setDateTo("");
    setFilterPCD(false);
    setFilterTeia(false);
  }, [setSelectedUnits]);

  // Apply user's unit restrictions before any UI filters.
  // Uses prefix matching so "HUGOL" matches "HUGOL - HOSPITAL ESTADUAL...".
  const userScopedVagas = useMemo(() => {
    if (currentUser?.visualiza_todas_unidades) return allVagas;
    const allowed = currentUser?.unidades_vinculadas || [];
    if (allowed.length === 0) return allVagas;
    return allVagas.filter((v) => unitIsAllowed(v.unidade, allowed));
  }, [
    allVagas,
    currentUser?.visualiza_todas_unidades,
    currentUser?.unidades_vinculadas,
  ]);

  // Derive unique unidade names dynamically from the already-scoped vagas.
  // This naturally respects RLS since userScopedVagas is already filtered by the
  // user's unidades_vinculadas. New units appearing in the DB will show up
  // automatically without any code change.
  const dynamicUnits = useMemo(() => {
    const seen = new Set<string>();
    for (const v of userScopedVagas) {
      const name = v.unidade?.trim();
      if (name) seen.add(name);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [userScopedVagas]);

  const filterDashboardRecords = useCallback(
    <T extends { unidade?: string | null }>(records: T[]) => {
      if (selectedUnits.length > 0 && !selectedUnits.includes("all")) {
        // Use unitIsAllowed for prefix-aware matching (short names vs full names)
        return records.filter((r) => unitIsAllowed(r.unidade, selectedUnits));
      }
      return records;
    },
    [selectedUnits],
  );

  // ── Activity feed built from local vaga data (no extra fetch needed) ────────
  type ActivityItem = {
    id: string;
    type: "nova_vaga" | "fluxo" | "observacao";
    vaga: (typeof allVagas)[0];
    time: string;
    usuario?: string;
    avatar_url?: string | null;
    descricao: string;
  };

  // For sorting: date-only strings → end of that local day so they aren't
  // pushed below same-day ISO timestamps that were created earlier in the day.
  const parseTimeForSort = (timeStr: string): number => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(timeStr)) {
      const [y, m, d] = timeStr.split("-").map(Number);
      return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    }
    return new Date(timeStr).getTime();
  };

  const formatActivityTime = (dateStr: string): string => {
    if (!dateStr) return "";
    // Date-only strings from historico (e.g. "2024-01-15")
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
      if (diffDays === 0) return "hoje";
      if (diffDays === 1) return "ontem";
      if (diffDays < 7) return `há ${diffDays}d`;
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
    return formatRelativeTime(dateStr);
  };

  const getInitials = (name: string) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");

  // Build a name→avatar_url lookup from the users list for historico entries
  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.nome_completo && u.avatar_url)
        map.set(u.nome_completo, u.avatar_url);
    });
    return map;
  }, [users]);

  const recentActivities = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    allVagas.forEach((vaga) => {
      // 1. Nova vaga
      const createdAt =
        vaga.created_at || vaga.data_recebimento || vaga.data_criacao;
      if (createdAt) {
        items.push({
          id: `nova-${vaga.id}`,
          type: "nova_vaga",
          vaga,
          time: createdAt,
          descricao: `Nova requisição adicionada ao sistema.`,
        });
      }

      // 2. Historico entries that mention tratativa or etapa changes
      (vaga.historico || []).forEach((h: any) => {
        if (!h?.descricao) return;
        if (/tratativa|etapa|fluxo/i.test(h.descricao)) {
          items.push({
            id: `hist-${vaga.id}-${h.id || h.data}`,
            type: "fluxo",
            vaga,
            time: h.data || "",
            usuario: h.usuario,
            avatar_url: h.usuario
              ? (userAvatarMap.get(h.usuario) ?? null)
              : null,
            descricao: h.descricao,
          });
        }
      });

      // 3. Observacoes internas (stored as JSON array)
      try {
        const raw = vaga.observacoes_internas || (vaga as any).observacao;
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            parsed.forEach((obs: any) => {
              if (obs?.data && obs?.texto) {
                // Prefer stored avatar_url; fall back to live lookup by name
                const resolvedAvatar =
                  obs.avatar_url ||
                  (obs.usuario
                    ? (userAvatarMap.get(obs.usuario) ?? null)
                    : null);
                items.push({
                  id: `obs-${vaga.id}-${obs.id || obs.data}`,
                  type: "observacao",
                  vaga,
                  time: obs.data,
                  usuario: obs.usuario,
                  avatar_url: resolvedAvatar,
                  descricao: obs.texto,
                });
              }
            });
          }
        }
      } catch {
        /* invalid JSON — skip */
      }
    });

    return items
      .filter((a) => a.time)
      .sort((a, b) => parseTimeForSort(b.time) - parseTimeForSort(a.time))
      .slice(0, 50); // keep 50 for pagination
  }, [allVagas, userAvatarMap]);
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredVagas = useMemo(() => {
    let base = filterDashboardRecords(userScopedVagas);
    if (dateFrom)
      base = base.filter((v) => (v.data_abertura || "") >= dateFrom);
    if (dateTo) base = base.filter((v) => (v.data_abertura || "") <= dateTo);
    if (filterPCD)
      base = base.filter(
        (v) => (v as any).tipo_vaga?.toUpperCase().trim() === "PCD",
      );
    if (filterTeia)
      base = base.filter((v) =>
        TEIA_UNIDADES.has(normalizeUnitName(v.unidade || "")),
      );
    return getValidVacancyBase(base, "TODOS", "TODOS");
  }, [
    userScopedVagas,
    filterDashboardRecords,
    dateFrom,
    dateTo,
    filterPCD,
    filterTeia,
  ]);

  const userScopedBancos = useMemo(() => {
    if (currentUser?.visualiza_todas_unidades) return bancos;
    const allowed = currentUser?.unidades_vinculadas || [];
    if (allowed.length === 0) return bancos;
    return bancos.filter((b) => unitIsAllowed((b as any).unidade, allowed));
  }, [
    bancos,
    currentUser?.visualiza_todas_unidades,
    currentUser?.unidades_vinculadas,
  ]);

  const filteredBancos = useMemo(
    () => filterDashboardRecords(userScopedBancos),
    [userScopedBancos, filterDashboardRecords],
  );

  const vagas = filteredVagas;

  const visibleVagaIds = useMemo(
    () => new Set(vagas.map((v) => v.id)),
    [vagas],
  );
  const filteredEditais = useMemo(
    () => editais.filter((e) => visibleVagaIds.has(e.vaga_id)),
    [editais, visibleVagaIds],
  );
  const filteredConvocacoes = useMemo(
    () => convocacoes.filter((c) => visibleVagaIds.has(c.vaga_id)),
    [convocacoes, visibleVagaIds],
  );
  const visibleBancoIds = useMemo(
    () => new Set(filteredBancos.map((b) => b.id)),
    [filteredBancos],
  );
  const visibleEditalIds = useMemo(
    () => new Set(filteredEditais.map((e) => e.id)),
    [filteredEditais],
  );
  const visibleConvocacaoIds = useMemo(
    () => new Set(filteredConvocacoes.map((c) => c.id)),
    [filteredConvocacoes],
  );

  const totalVagas = useMemo(() => vagas.length, [vagas]);

  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      convocacoes: 0,
      concluidas: 0,
      vagas_lideranca: 0,
      aguardando_unidade: 0,
      documentacao: 0,
      movimentacao_interna: 0,
      suspensa: 0,
      cancelada: 0,
      em_admissao: 0,
      atrasadas: 0,
      sem_classificacao: 0,
    };
    const statusConcluidos = [
      "concluida",
      "concluidas",
      "cancelada",
      "canceladas",
      "suspensa",
    ];
    vagas.forEach((v) => {
      const cat = getCategoriaStatus(v);
      if (acc.hasOwnProperty(cat)) acc[cat as keyof typeof acc]++;
      else acc.sem_classificacao++;
      const lastHist =
        v.historico && v.historico.length > 0
          ? v.historico[v.historico.length - 1]
          : null;
      const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
      if (
        !statusConcluidos.includes(normStatus(v.status || "")) &&
        calcDiasAberto(baseDate) > 10
      ) {
        acc.atrasadas++;
      }
    });

    // Convocações: getCategoriaStatus only reads status/status_processo fields,
    // never etapa. Override the count by checking etapa across all fluxo slots.
    acc.convocacoes = vagas.filter((v) => {
      const allEtapas = [
        v.etapa,
        ...(Array.isArray(v.distribuicao_vagas)
          ? (v.distribuicao_vagas as any[]).map((s: any) => s.etapa)
          : []),
      ].filter(Boolean);
      return allEtapas.includes("Convocação");
    }).length;

    return acc;
  }, [vagas]);

  const totalBancosDisponiveis = useMemo(
    () =>
      filteredBancos.filter((b) => {
        const s = normStatus(b.status || "");
        return s !== "vencido" && s !== "convocado";
      }).length,
    [filteredBancos],
  );

  const totalTarefasPendentes = useMemo(() => {
    const shouldIncludeUnscopedTasks = selectedRegion === "all";
    return tarefas.filter((tarefa) => {
      if (tarefa.status !== "pendente") return false;
      if (!tarefa.relacionado_a) return shouldIncludeUnscopedTasks;
      switch (tarefa.relacionado_a.tipo) {
        case "vaga":
          return visibleVagaIds.has(tarefa.relacionado_a.id);
        case "banco":
          return visibleBancoIds.has(tarefa.relacionado_a.id);
        case "convocacao":
          return visibleConvocacaoIds.has(tarefa.relacionado_a.id);
        case "edital":
          return visibleEditalIds.has(tarefa.relacionado_a.id);
        default:
          return shouldIncludeUnscopedTasks;
      }
    }).length;
  }, [
    tarefas,
    selectedRegion,
    visibleVagaIds,
    visibleBancoIds,
    visibleConvocacaoIds,
    visibleEditalIds,
  ]);

  const stats = useMemo(
    () => [
      {
        label: "Total de Vagas",
        value: totalVagas,
        icon: Sigma,
        glowColor: "#0EA5E9",
        iconBg: "rgba(14,165,233,0.18)",
        description: "Base ativa",
      },
      {
        label: "Concluídas",
        value: counts.concluidas,
        icon: BadgeCheck,
        glowColor: "#7C3AED",
        iconBg: "rgba(124,58,237,0.18)",
        description: "Vagas concluídas",
      },
      {
        label: "Em Andamento",
        value: counts.em_andamento,
        icon: Play,
        glowColor: "#D97706",
        iconBg: "rgba(217,119,6,0.18)",
        description: "Processos ativos",
      },
      {
        label: "Convocações",
        value: counts.convocacoes,
        icon: Users,
        glowColor: "#f472b6",
        iconBg: "rgba(244,114,182,0.18)",
        description: "Em convocação",
      },
      {
        label: "Aguardando",
        value: counts.aguardando_unidade,
        icon: Clock,
        glowColor: "#fbbf24",
        iconBg: "rgba(251,191,36,0.18)",
        description: "Aguardando retorno",
      },
      {
        label: "Documentação",
        value: counts.documentacao,
        icon: FileText,
        glowColor: "#fb923c",
        iconBg: "rgba(251,146,60,0.18)",
        description: "Pendência documental",
      },
      {
        label: "Fila de Editais",
        value: counts.fila_edital,
        icon: FileText,
        glowColor: "#fde047",
        iconBg: "rgba(253,224,71,0.16)",
        description: "Aguardando publicação",
      },
      {
        label: "Suspensa",
        value: counts.suspensa,
        icon: AlertTriangle,
        glowColor: "#f87171",
        iconBg: "rgba(248,113,113,0.18)",
        description: "Vagas suspensas",
      },
      {
        label: "Cancelada",
        value: counts.cancelada,
        icon: AlertCircle,
        glowColor: "#94a3b8",
        iconBg: "rgba(148,163,184,0.15)",
        description: "Vagas canceladas",
      },
      {
        label: "Mov. Interna",
        value: counts.movimentacao_interna,
        icon: ArrowLeftRight,
        glowColor: "#22d3ee",
        iconBg: "rgba(34,211,238,0.18)",
        description: "Movimentações internas",
      },
      {
        label: "Em Admissão",
        value: counts.em_admissao,
        icon: UserCheck,
        glowColor: "#2dd4bf",
        iconBg: "rgba(45,212,191,0.18)",
        description: "Fase final",
      },
      {
        label: "Banco Disponível",
        value: totalBancosDisponiveis,
        icon: ShieldCheck,
        glowColor: "#a3e635",
        iconBg: "rgba(163,230,53,0.15)",
        description: "Bancos ativos",
      },
    ],
    [totalVagas, counts, totalBancosDisponiveis, totalTarefasPendentes],
  );

  // Derive bar label from secao: take the segment after the last ' - '.
  // e.g. "SEHIG - SERVICO DE HIGIENIZACAO - HUGOL" → "HUGOL"
  // Falls back to the unit name when secao is absent.
  const secaoBarLabel = (
    secao: string | undefined,
    fallback: string,
  ): string => {
    if (secao && secao.trim()) {
      const parts = secao.split(" - ");
      const last = parts[parts.length - 1].trim();
      if (last) return last;
    }
    return resolveCanonicalName(fallback) || fallback;
  };

  const strategicScopeByUnit = useMemo(() => {
    const unitMap = new Map<string, any>();
    const getEntry = (label: string, unitName: string) => {
      if (!label) return null;
      if (!unitMap.has(label)) {
        const canonical = resolveCanonicalName(unitName) || unitName;
        unitMap.set(label, {
          name: label,
          region: getRegionForUnit(canonical),
          vagas: 0,
          vagasAbertas: 0,
          bancos: 0,
          bancosCR: 0,
          bancosDisponiveis: 0,
          pendencias: 0,
        });
      }
      return unitMap.get(label);
    };
    const statusConcluidos = [
      "concluida",
      "concluidas",
      "cancelada",
      "canceladas",
      "suspensa",
    ];
    vagas.forEach((vaga) => {
      const label = secaoBarLabel(vaga.secao, vaga.unidade);
      const entry = getEntry(label, vaga.unidade);
      if (entry) {
        entry.vagas++;
        const cat = getCategoriaStatus(vaga);
        if (cat !== "concluidas" && cat !== "suspensa" && cat !== "cancelada")
          entry.vagasAbertas++;
        const lastHist =
          vaga.historico && vaga.historico.length > 0
            ? vaga.historico[vaga.historico.length - 1]
            : null;
        const baseDate =
          lastHist?.data || vaga.data_recebimento || vaga.data_abertura;
        if (
          !statusConcluidos.includes(normStatus(vaga.status || "")) &&
          calcDiasAberto(baseDate) > 10
        )
          entry.pendencias++;
      }
    });
    filteredBancos.forEach((banco) => {
      const label = secaoBarLabel((banco as any).secao, banco.unidade);
      const entry = getEntry(label, banco.unidade);
      if (entry) {
        entry.bancos++;
        const s = normStatus(banco.status || "");
        if (s === "cadastro reserva") entry.bancosCR++;
        if (s !== "vencido" && s !== "convocado") entry.bancosDisponiveis++;
        if (s === "vencido" || s === "prorrogado" || banco.is_prorrogado)
          entry.pendencias++;
      }
    });
    return Array.from(unitMap.values())
      .map((e) => ({
        ...e,
        total: e.vagas + e.bancos,
        ativos: e.vagasAbertas + e.bancosDisponiveis,
      }))
      .filter((e) => e.total > 0 || e.pendencias > 0)
      .sort((a, b) => b.total - a.total);
  }, [vagas, filteredBancos]);

  const chartData = useMemo(() => {
    if (chartMode === "regiao") {
      const regionMap = new Map<string, any>();
      if (selectedRegion === "all") {
        ["Goiânia", "Vitória", "Demais Unidades"].forEach((reg) =>
          regionMap.set(reg, {
            name: reg,
            total: 0,
            ativos: 0,
            vagas: 0,
            bancos: 0,
            bancosCR: 0,
            pendencias: 0,
          }),
        );
      }
      strategicScopeByUnit.forEach((entry) => {
        const current = regionMap.get(entry.region) || {
          name: entry.region,
          total: 0,
          ativos: 0,
          vagas: 0,
          bancos: 0,
          bancosCR: 0,
          pendencias: 0,
        };
        current.total += entry.total;
        current.ativos += entry.ativos;
        current.vagas += entry.vagas;
        current.bancos += entry.bancos;
        current.bancosCR += entry.bancosCR;
        current.pendencias += entry.pendencias;
        regionMap.set(entry.region, current);
      });
      return Array.from(regionMap.values())
        .filter((i) => i.total > 0 || i.pendencias > 0)
        .sort((a, b) => b.total - a.total);
    }
    return strategicScopeByUnit;
  }, [chartMode, strategicScopeByUnit, selectedRegion]);

  const vacancyAlerts = useMemo(() => {
    const STALE = 10;
    const done = [
      "concluida",
      "concluidas",
      "cancelada",
      "canceladas",
      "suspensa",
      "admissao efetivada",
    ];
    return vagas
      .filter((v) => {
        const s = normStatus(v.status || "");
        if (done.includes(s)) return false;
        const lastDate =
          v.updated_at ||
          v.data_criacao ||
          v.data_importacao ||
          v.data_recebimento ||
          v.data_abertura;
        if (s === "" || s === "sem status") return true;
        return calcDiasAberto(lastDate) >= STALE;
      })
      .map((v) => {
        const lastDate =
          v.updated_at ||
          v.data_criacao ||
          v.data_importacao ||
          v.data_recebimento ||
          v.data_abertura;
        return {
          ...v,
          daysOpen: calcDiasAberto(lastDate),
          displayId: v.requisicao || v.numero_requisicao || "SEM REQ",
        };
      })
      .sort((a, b) => b.daysOpen - a.daysOpen);
  }, [vagas]);

  const alerts = useMemo(() => {
    const vagaAlerts = vacancyAlerts.map((v) => ({
      id: `vaga-${v.id}`,
      type: "vaga" as const,
      reference: v.displayId,
      title: v.cargo || "Vaga sem cargo informado",
      unit: normalizeUnitName(v.unidade),
      badge: `${v.daysOpen}d`,
      sortValue: 2000 + v.daysOpen,
    }));
    const bancoAlerts = filteredBancos
      .filter((b) => {
        const s = normStatus(b.status || "");
        return s === "vencido" || s === "prorrogado" || b.is_prorrogado;
      })
      .map((b) => {
        const isExpired = normStatus(b.status || "") === "vencido";
        return {
          id: `banco-${b.id}`,
          type: "banco" as const,
          reference: b.numero_edital || b.numero_processo || "BANCO",
          title: b.cargo || b.nome || "Banco de talentos",
          unit: normalizeUnitName(b.unidade),
          badge: isExpired ? "Vencido" : "Prorrogado",
          sortValue: isExpired ? 1000 : 500,
        };
      });
    return [...vagaAlerts, ...bancoAlerts].sort(
      (a, b) => b.sortValue - a.sortValue || a.unit.localeCompare(b.unit),
    );
  }, [vacancyAlerts, filteredBancos]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!selectedUnits.includes("all")) count++;
    if (dateFrom || dateTo) count++;
    if (filterPCD) count++;
    if (filterTeia) count++;
    return count;
  }, [selectedUnits, dateFrom, dateTo, filterPCD, filterTeia]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: {
      month: string;
      key: string;
      abertas: number;
      concluidas: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: d.toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        key,
        abertas: 0,
        concluidas: 0,
      });
    }
    userScopedVagas.forEach((v) => {
      if (v.data_abertura) {
        const e = months.find(
          (m) => m.key === (v.data_abertura as string).slice(0, 7),
        );
        if (e) e.abertas++;
      }
      if (getCategoriaStatus(v) === "concluidas") {
        const lastHist =
          v.historico && v.historico.length > 0
            ? v.historico[v.historico.length - 1]?.data
            : undefined;
        const dc =
          lastHist || (v as any).updated_at || (v as any).data_homologacao;
        if (dc) {
          const e = months.find((m) => m.key === (dc as string).slice(0, 7));
          if (e) e.concluidas++;
        }
      }
    });
    return months.map(({ month, abertas, concluidas }) => ({
      month,
      abertas,
      concluidas,
    }));
  }, [userScopedVagas]);

  const leadTimeData = useMemo(() => {
    const toDate = (s: string | null | undefined): Date | null => {
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const diffDays = (a: Date | null, b: Date | null): number | null => {
      if (!a || !b) return null;
      const d = Math.round((a.getTime() - b.getTime()) / 86400000);
      return d >= 0 ? d : null;
    };

    // Sum the calendar days a vaga spent with tratativa "Aguardando Unidade".
    // Supports both old format "Tratativa definida: ..." and new "Fluxo atualizado: Tratativa: ..."
    const calcWaitingDays = (
      hist: Array<{ data?: string; descricao?: string }>,
      fallbackEndDate: Date,
    ): number => {
      const sorted = hist
        .filter((h) => {
          if (!h.data || !h.descricao) return false;
          return (
            h.descricao.startsWith("Tratativa definida:") ||
            (h.descricao.startsWith("Fluxo atualizado:") &&
              /Tratativa:/i.test(h.descricao))
          );
        })
        .map((h) => ({ date: toDate(h.data!), desc: h.descricao! }))
        .filter((h) => h.date !== null)
        .sort((a, b) => a.date!.getTime() - b.date!.getTime()) as Array<{
        date: Date;
        desc: string;
      }>;

      let waiting = 0;
      let waitStart: Date | null = null;

      for (const { date, desc } of sorted) {
        const isEntering = desc.includes("Aguardando Unidade");
        if (isEntering && waitStart === null) {
          waitStart = date;
        } else if (!isEntering && waitStart !== null) {
          waiting += diffDays(date, waitStart) ?? 0;
          waitStart = null;
        }
      }
      // Still in "Aguardando Unidade" at conclusion time
      if (waitStart !== null) {
        waiting += diffDays(fallbackEndDate, waitStart) ?? 0;
      }
      return waiting;
    };

    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    const byMonth: Record<string, { provimento: number[]; intake: number[] }> =
      {};
    monthKeys.forEach((k) => (byMonth[k] = { provimento: [], intake: [] }));

    const allProvimento: number[] = [];
    const allIntake: number[] = [];

    userScopedVagas.forEach((v) => {
      const hist = (v.historico || []) as Array<{
        data?: string;
        descricao?: string;
      }>;
      const histDates = hist
        .map((h) => toDate(h.data ?? null))
        .filter(Boolean) as Date[];
      if (histDates.length === 0) return;

      const firstEdit = new Date(
        Math.min(...histDates.map((d) => d.getTime())),
      );
      const lastEdit = new Date(Math.max(...histDates.map((d) => d.getTime())));

      // Metric 1: first edit → Concluída, minus any time spent "Aguardando Unidade"
      if (v.status_processo === "Concluída") {
        const rawDays = diffDays(lastEdit, firstEdit);
        if (rawDays !== null) {
          const waitDays = calcWaitingDays(hist, lastEdit);
          const netDays = Math.max(0, rawDays - waitDays);
          allProvimento.push(netDays);
          const mk = `${lastEdit.getFullYear()}-${String(lastEdit.getMonth() + 1).padStart(2, "0")}`;
          if (byMonth[mk]) byMonth[mk].provimento.push(netDays);
        }
      }

      // Metric 2: created_at → first edit in GDP
      const createdDate = toDate(
        v.created_at ?? v.data_recebimento ?? (v as any).data_criacao,
      );
      const intake = diffDays(firstEdit, createdDate);
      if (intake !== null) {
        allIntake.push(intake);
        const mk = `${firstEdit.getFullYear()}-${String(firstEdit.getMonth() + 1).padStart(2, "0")}`;
        if (byMonth[mk]) byMonth[mk].intake.push(intake);
      }
    });

    const avg = (arr: number[]) =>
      arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;

    const monthlyChart = monthKeys.map((mk) => {
      const [y, mo] = mk.split("-");
      const label = new Date(Number(y), Number(mo) - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        .replace(".", "");
      return {
        month: label,
        provimento: avg(byMonth[mk].provimento),
        intake: avg(byMonth[mk].intake),
      };
    });

    return {
      avgProvimento: avg(allProvimento),
      avgIntake: avg(allIntake),
      countProvimento: allProvimento.length,
      countIntake: allIntake.length,
      monthlyChart,
    };
  }, [userScopedVagas]);

  const motivoVagaData = useMemo(() => {
    const map = new Map<string, number>();
    filteredVagas.forEach((v) => {
      const key =
        ((v as any).motivo as string | undefined)?.trim() || "Não informado";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  // ─── Theme-sensitive style values ─────────────────────────────────────────

  const t = {
    // backgrounds
    pageBg: isDark
      ? "linear-gradient(150deg, #07091d 0%, #0d1630 50%, #080c1e 100%)"
      : "transparent",
    panelClass: isDark ? "dash-glass-panel" : "dash-light-panel",
    filterClass: isDark ? "dash-glass-filter" : "dash-light-filter",

    // text
    heading: isDark ? "#ffffff" : "#0f172a",
    headShadow: isDark ? "0 0 40px rgba(129,140,248,0.35)" : "none",
    tx1: isDark ? "rgba(255,255,255,0.90)" : "#1e293b",
    tx2: isDark ? "rgba(255,255,255,0.55)" : "#475569",
    tx3: isDark ? "rgba(255,255,255,0.38)" : "#94a3b8",
    tx4: isDark ? "rgba(255,255,255,0.25)" : "#cbd5e1",
    statLabel: isDark ? "rgba(255,255,255,0.42)" : "#94a3b8",
    statValue: isDark ? "#ffffff" : "#0f172a",
    statDesc: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8",

    // panels / headers
    phBg: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
    phBorder: isDark
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(0,0,0,0.06)",

    // controls
    btnBg: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
    btnBorder: isDark
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(0,0,0,0.09)",
    btnColor: isDark ? "rgba(255,255,255,0.72)" : "#475569",

    inputBg: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
    inputBorder: isDark
      ? "1px solid rgba(255,255,255,0.10)"
      : "1px solid rgba(0,0,0,0.09)",
    inputColor: isDark ? "rgba(255,255,255,0.65)" : "#475569",
    inputScheme: (isDark ? "dark" : "light") as "dark" | "light",

    divider: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    rowHover: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",

    // chips
    chipBg: isDark ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.08)",
    chipBorder: isDark
      ? "1px solid rgba(129,140,248,0.30)"
      : "1px solid rgba(99,102,241,0.2)",
    chipColor: isDark ? "#a5b4fc" : "#6366f1",

    // filter toggles (active/inactive)
    pcdActive: isDark
      ? {
          bg: "rgba(167,139,250,0.28)",
          border: "1px solid rgba(167,139,250,0.55)",
          color: "#c4b5fd",
          shadow: "0 0 16px rgba(167,139,250,0.22)",
        }
      : {
          bg: "rgba(139,92,246,0.10)",
          border: "1px solid rgba(139,92,246,0.35)",
          color: "#7c3aed",
          shadow: "none",
        },
    pcdInactive: isDark
      ? {
          bg: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.55)",
        }
      : {
          bg: "#f8fafc",
          border: "1px solid rgba(0,0,0,0.09)",
          color: "#64748b",
        },
    teiaActive: isDark
      ? {
          bg: "rgba(52,211,153,0.22)",
          border: "1px solid rgba(52,211,153,0.45)",
          color: "#6ee7b7",
          shadow: "0 0 16px rgba(52,211,153,0.18)",
        }
      : {
          bg: "rgba(16,185,129,0.10)",
          border: "1px solid rgba(16,185,129,0.35)",
          color: "#059669",
          shadow: "none",
        },
    teiaInactive: isDark
      ? {
          bg: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.55)",
        }
      : {
          bg: "#f8fafc",
          border: "1px solid rgba(0,0,0,0.09)",
          color: "#64748b",
        },

    // unit picker
    unitActive: isDark
      ? {
          bg: "rgba(129,140,248,0.18)",
          border: "1px solid rgba(129,140,248,0.45)",
          color: "#a5b4fc",
          shadow: "0 0 18px rgba(129,140,248,0.2)",
        }
      : {
          bg: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.35)",
          color: "#6366f1",
          shadow: "none",
        },
    unitInactive: isDark
      ? {
          bg: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.65)",
        }
      : {
          bg: "#f8fafc",
          border: "1px solid rgba(0,0,0,0.09)",
          color: "#475569",
        },

    // popover
    popBg: isDark ? "rgba(10,14,28,0.98)" : "#ffffff",
    popBorder: isDark
      ? "1px solid rgba(255,255,255,0.13)"
      : "1px solid rgba(0,0,0,0.09)",
    popSrchBg: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    popSrchBorder: isDark
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(0,0,0,0.06)",
    popItemHover: isDark ? "rgba(129,140,248,0.12)" : "rgba(99,102,241,0.06)",
    popCheckColor: isDark ? "#818cf8" : "#6366f1",
    popCheckText: isDark ? "#a5b4fc" : "#6366f1",
    popFooterBg: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
    popFooterBorder: isDark
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(0,0,0,0.06)",

    // charts
    gridLine: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
    axisColor: isDark ? "rgba(255,255,255,0.38)" : "#94a3b8",
    legendColor: isDark ? "rgba(255,255,255,0.5)" : "#64748b",
    barPrimary: isDark ? "#818cf8" : "#6366f1",
    barPrimaryLight: isDark ? "#4f46e5" : "#a5b4fc",
    barSecondary: isDark ? "#34d399" : "#10b981",
    areaBlue: isDark ? "#60a5fa" : "#3b82f6",
    areaGreen: isDark ? "#34d399" : "#10b981",
    donutColors: isDark ? DONUT_COLORS_DARK : DONUT_COLORS_LIGHT,
    tooltip: isDark
      ? {
          background: "rgba(8,12,26,0.97)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.55)",
          padding: "12px 14px",
          fontSize: "11px",
          fontWeight: "bold" as const,
          color: "#fff",
        }
      : {
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: "12px",
          boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
          padding: "12px 14px",
          fontSize: "11px",
          fontWeight: "bold" as const,
          color: "#0f172a",
        },

    // dialog
    dlgBg: isDark ? "rgba(10,14,28,0.98)" : "#ffffff",
    dlgBorder: isDark
      ? "1px solid rgba(255,255,255,0.13)"
      : "1px solid rgba(0,0,0,0.09)",
    dlgHdrBg: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
    dlgHdrBorder: isDark
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(0,0,0,0.06)",
    tblHdrBg: isDark ? "rgba(10,14,28,0.95)" : "#f8fafc",
    tblHdrColor: isDark ? "rgba(255,255,255,0.42)" : "#64748b",
    tblBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    dlgFtrBg: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────────────────────────────

  if (isInitialLoad || (isLoadingVagas && allVagas.length === 0)) {
    return (
      <div
        className="relative"
        style={{
          margin: "-2rem",
          padding: "2rem",
          minHeight: "calc(100vh - 100px)",
          background: t.pageBg,
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <Skeleton className={`h-8 w-72 ${isDark ? "bg-white/10" : ""}`} />
            <Skeleton className={`h-4 w-44 ${isDark ? "bg-white/8" : ""}`} />
          </div>
          <Skeleton
            className={`h-14 w-full rounded-2xl ${isDark ? "bg-white/8" : ""}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                  borderRadius: "16px",
                  padding: "16px",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                }}
              >
                <Skeleton
                  className={`h-9 w-9 rounded-xl mb-3 ${isDark ? "bg-white/10" : ""}`}
                />
                <Skeleton
                  className={`h-3 w-16 mb-2 ${isDark ? "bg-white/8" : ""}`}
                />
                <Skeleton
                  className={`h-7 w-12 ${isDark ? "bg-white/10" : ""}`}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                  height: "320px",
                }}
              >
                <Skeleton
                  className={`h-5 w-36 mb-4 ${isDark ? "bg-white/10" : ""}`}
                />
                <Skeleton
                  className={`h-52 w-full rounded-xl ${isDark ? "bg-white/8" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative animate-in fade-in slide-in-from-bottom-2 duration-700"
      style={{
        margin: "-2rem",
        padding: "2rem",
        minHeight: "calc(100vh - 100px)",
        background: t.pageBg,
      }}
    >
      {/* ── Ambient glow blobs (dark only) ─────────────────────────────── */}
      {isDark && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              top: "-18%",
              left: "-8%",
              width: "520px",
              height: "520px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 68%)",
              animation: "dashAmbientFloat 9s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "8%",
              right: "-6%",
              width: "440px",
              height: "440px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 68%)",
              animation: "dashAmbientFloat 11s ease-in-out infinite",
              animationDelay: "-4s",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              left: "32%",
              width: "580px",
              height: "380px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 68%)",
              animation: "dashAmbientFloat 13s ease-in-out infinite",
              animationDelay: "-7s",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-5%",
              right: "20%",
              width: "340px",
              height: "340px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 68%)",
              animation: "dashAmbientFloat 8s ease-in-out infinite",
              animationDelay: "-2s",
            }}
          />
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="dash-neon-dot" />
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                }}
              >
                Monitoramento em Tempo Real
              </p>
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: t.heading,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                textShadow: t.headShadow,
              }}
            >
              Visão Geral do Provimento
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: t.btnBg,
                border: t.btnBorder,
                color: t.btnColor,
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? "rgba(255,255,255,0.14)"
                  : "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.btnBg;
              }}
              title={
                isDark ? "Mudar para modo claro" : "Mudar para modo escuro"
              }
            >
              {isDark ? (
                <Sun
                  style={{ width: "15px", height: "15px", color: "#fbbf24" }}
                />
              ) : (
                <Moon
                  style={{ width: "15px", height: "15px", color: "#6366f1" }}
                />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchAll()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "38px",
                padding: "0 18px",
                borderRadius: "12px",
                background: t.btnBg,
                border: t.btnBorder,
                color: t.btnColor,
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? "rgba(255,255,255,0.14)"
                  : "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.btnBg;
              }}
              title="Atualizar dados"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${isLoadingVagas || isLoadingBancos ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className={`${t.filterClass} flex flex-wrap items-center gap-3`}>
          {/* Date range */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: t.inputBg,
              border: t.inputBorder,
              borderRadius: "12px",
              padding: "8px 14px",
              fontSize: "11px",
              fontWeight: 700,
              color: t.tx2,
            }}
          >
            <Calendar
              style={{
                width: "14px",
                height: "14px",
                flexShrink: 0,
                color: t.tx3,
              }}
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                background: "transparent",
                outline: "none",
                fontSize: "11px",
                fontWeight: 600,
                color: t.inputColor,
                width: "112px",
                cursor: "pointer",
                colorScheme: t.inputScheme,
              }}
              title="Data inicial"
            />
            <span style={{ color: t.tx4 }}>—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                background: "transparent",
                outline: "none",
                fontSize: "11px",
                fontWeight: 600,
                color: t.inputColor,
                width: "112px",
                cursor: "pointer",
                colorScheme: t.inputScheme,
              }}
              title="Data final"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                style={{
                  color: t.tx3,
                  marginLeft: "4px",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X style={{ width: "12px", height: "12px" }} />
              </button>
            )}
          </div>

          <div
            style={{ width: "1px", height: "24px", background: t.divider }}
            className="hidden sm:block"
          />

          {/* Unit picker */}
          <Popover
            open={isUnitPickerOpen}
            onOpenChange={(open) => {
              setIsUnitPickerOpen(open);
              if (open) setTimeout(() => searchInputRef.current?.focus(), 80);
              else setUnitSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "38px",
                  padding: "0 14px",
                  borderRadius: "12px",
                  ...(selectedUnits.includes("all")
                    ? t.unitInactive
                    : t.unitActive),
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: selectedUnits.includes("all")
                    ? "none"
                    : (t.unitActive as any).shadow,
                }}
              >
                <Building2
                  style={{ width: "14px", height: "14px", flexShrink: 0 }}
                />
                <span
                  style={{
                    maxWidth: "180px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedUnits.includes("all")
                    ? "Todas as Unidades"
                    : selectedUnits.length === 1
                      ? selectedUnits[0]
                      : `${selectedUnits.length} unidades`}
                </span>
                {!selectedUnits.includes("all") && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: t.popCheckColor,
                      fontSize: "9px",
                      fontWeight: 900,
                      color: "#fff",
                      padding: "0 4px",
                    }}
                  >
                    {selectedUnits.length}
                  </span>
                )}
                <ChevronDown
                  style={{
                    width: "14px",
                    height: "14px",
                    flexShrink: 0,
                    color: t.tx3,
                    transform: isUnitPickerOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={6}
              className="w-72 p-0 shadow-2xl rounded-xl overflow-hidden border-0"
              style={{
                background: t.popBg,
                backdropFilter: isDark ? "blur(30px)" : "none",
                border: t.popBorder,
                borderRadius: "14px",
              }}
            >
              {/* Search */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  borderBottom: t.popSrchBorder,
                  background: t.popSrchBg,
                }}
              >
                <Search
                  style={{
                    width: "14px",
                    height: "14px",
                    color: t.tx3,
                    flexShrink: 0,
                  }}
                />
                <input
                  ref={searchInputRef}
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Buscar unidade..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: t.tx1,
                    outline: "none",
                  }}
                />
                {unitSearch && (
                  <button
                    onClick={() => setUnitSearch("")}
                    style={{
                      color: t.tx3,
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                )}
              </div>

              {/* Quick actions */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  padding: "8px 12px",
                  borderBottom: `1px solid ${t.divider}`,
                }}
              >
                <button
                  onClick={() => setSelectedUnits(["all"])}
                  style={{
                    flex: 1,
                    height: "26px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: selectedUnits.includes("all")
                      ? isDark
                        ? "rgba(255,255,255,0.9)"
                        : "#1e293b"
                      : t.inputBg,
                    color: selectedUnits.includes("all")
                      ? isDark
                        ? "#0d1630"
                        : "#fff"
                      : t.tx3,
                    border: "none",
                  }}
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedUnits([...dynamicUnits])}
                  style={{
                    flex: 1,
                    height: "26px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      !selectedUnits.includes("all") &&
                      selectedUnits.length === dynamicUnits.length
                        ? t.popCheckColor
                        : t.inputBg,
                    color:
                      !selectedUnits.includes("all") &&
                      selectedUnits.length === dynamicUnits.length
                        ? "#fff"
                        : t.tx3,
                    border: "none",
                  }}
                >
                  Selecionar Todas
                </button>
                {!selectedUnits.includes("all") && (
                  <button
                    onClick={() => setSelectedUnits(["all"])}
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "8px",
                      background: isDark
                        ? "rgba(248,113,113,0.15)"
                        : "rgba(239,68,68,0.08)",
                      color: isDark ? "#f87171" : "#dc2626",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Limpar filtro"
                  >
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                )}
              </div>

              {/* Unit list */}
              <div
                style={{
                  overflowY: "auto",
                  maxHeight: "280px",
                  padding: "4px 0",
                }}
              >
                {(() => {
                  const filteredUnits = unitSearch.trim()
                    ? dynamicUnits.filter((u) =>
                        u.toLowerCase().includes(unitSearch.toLowerCase()),
                      )
                    : dynamicUnits;

                  if (filteredUnits.length === 0) {
                    return (
                      <div
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          fontSize: "12px",
                          color: t.tx3,
                          fontWeight: 500,
                        }}
                      >
                        {dynamicUnits.length === 0
                          ? "Nenhuma unidade disponível"
                          : "Nenhuma unidade encontrada"}
                      </div>
                    );
                  }

                  return filteredUnits.map((unit) => {
                    const isSel =
                      !selectedUnits.includes("all") &&
                      selectedUnits.includes(unit);
                    return (
                      <button
                        key={unit}
                        onClick={() => {
                          let next: string[];
                          if (selectedUnits.includes("all")) next = [unit];
                          else if (selectedUnits.includes(unit)) {
                            next = selectedUnits.filter((u) => u !== unit);
                            if (next.length === 0) next = ["all"];
                          } else next = [...selectedUnits, unit];
                          setSelectedUnits(next);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "6px 14px",
                          textAlign: "left",
                          cursor: "pointer",
                          background: isSel ? t.popItemHover : "transparent",
                          border: "none",
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "5px",
                            border: isSel
                              ? `2px solid ${t.popCheckColor}`
                              : `1.5px solid ${t.divider}`,
                            background: isSel ? t.popCheckColor : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s",
                          }}
                        >
                          {isSel && (
                            <Check
                              style={{
                                width: "10px",
                                height: "10px",
                                color: "#fff",
                              }}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            color: isSel ? t.popCheckText : t.tx2,
                          }}
                        >
                          {unit}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              {!selectedUnits.includes("all") && (
                <div
                  style={{
                    borderTop: `1px solid ${t.divider}`,
                    padding: "8px 14px",
                    background: t.popFooterBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ fontSize: "10px", fontWeight: 700, color: t.tx3 }}
                  >
                    {selectedUnits.length} de {dynamicUnits.length}{" "}
                    selecionadas
                  </span>
                  <button
                    onClick={() => setSelectedUnits(["all"])}
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: t.tx3,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div
            style={{ width: "1px", height: "24px", background: t.divider }}
            className="hidden sm:block"
          />

          {/* PCD toggle */}
          <button
            onClick={() => setFilterPCD(!filterPCD)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 16px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "all 0.2s",
              ...(filterPCD
                ? {
                    background: t.pcdActive.bg,
                    border: t.pcdActive.border,
                    color: t.pcdActive.color,
                    boxShadow: t.pcdActive.shadow,
                  }
                : {
                    background: t.pcdInactive.bg,
                    border: t.pcdInactive.border,
                    color: t.pcdInactive.color,
                  }),
            }}
          >
            <Accessibility style={{ width: "14px", height: "14px" }} /> PCD
          </button>

          {/* Rede TEIA toggle */}
          <button
            onClick={() => setFilterTeia(!filterTeia)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 16px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "all 0.2s",
              ...(filterTeia
                ? {
                    background: t.teiaActive.bg,
                    border: t.teiaActive.border,
                    color: t.teiaActive.color,
                    boxShadow: t.teiaActive.shadow,
                  }
                : {
                    background: t.teiaInactive.bg,
                    border: t.teiaInactive.border,
                    color: t.teiaInactive.color,
                  }),
            }}
          >
            <Puzzle style={{ width: "14px", height: "14px" }} /> Rede Teia
          </button>

          {/* Active filter badge */}
          {activeFilterCount > 0 && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "28px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  background: isDark
                    ? "rgba(129,140,248,0.2)"
                    : "rgba(99,102,241,0.08)",
                  border: isDark
                    ? "1px solid rgba(129,140,248,0.35)"
                    : "1px solid rgba(99,102,241,0.2)",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: t.chipColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: t.popCheckColor,
                    fontSize: "9px",
                    fontWeight: 900,
                    color: "#fff",
                  }}
                >
                  {activeFilterCount}
                </span>
                Filtro{activeFilterCount > 1 ? "s" : ""} Ativo
                {activeFilterCount > 1 ? "s" : ""}
              </span>
              <button
                onClick={clearAllFilters}
                style={{
                  height: "28px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: t.btnBorder,
                  background: t.btnBg,
                  fontSize: "10px",
                  fontWeight: 700,
                  color: t.tx3,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>

        {/* Selected unit chips */}
        {!selectedUnits.includes("all") && selectedUnits.length <= 5 && (
          <div className="flex flex-wrap gap-1.5 -mt-3">
            {selectedUnits.map((unit) => (
              <span
                key={unit}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  height: "24px",
                  padding: "0 10px 0 8px",
                  borderRadius: "999px",
                  background: t.chipBg,
                  border: t.chipBorder,
                  fontSize: "10px",
                  fontWeight: 700,
                  color: t.chipColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {unit}
                <button
                  onClick={() => {
                    const next = selectedUnits.filter((u) => u !== unit);
                    setSelectedUnits(next.length === 0 ? ["all"] : next);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    border: "none",
                    color: t.tx3,
                  }}
                >
                  <X style={{ width: "8px", height: "8px" }} />
                </button>
              </span>
            ))}
          </div>
        )}
        {!selectedUnits.includes("all") && selectedUnits.length > 5 && (
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: t.chipColor,
              paddingLeft: "4px",
              marginTop: "-12px",
              opacity: 0.8,
            }}
          >
            {selectedUnits.length} unidades filtradas —{" "}
            <button
              onClick={() => setSelectedUnits(["all"])}
              style={{
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontWeight: 700,
                fontSize: "inherit",
              }}
            >
              limpar filtro
            </button>
          </p>
        )}

        {/* ── Scorecards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {stats.map((stat, i) => {
            const cardContent = (
              <>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "11px",
                    background: stat.iconBg,
                    boxShadow: isDark
                      ? `0 0 16px ${stat.glowColor}50, inset 0 1px 0 rgba(255,255,255,0.1)`
                      : `0 4px 12px ${stat.glowColor}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "14px",
                    transition: "transform 0.3s",
                  }}
                >
                  <stat.icon
                    style={{
                      width: "17px",
                      height: "17px",
                      color: stat.glowColor,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: t.statLabel,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "4px",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {stat.label}
                </p>
                {isLoadingVagas && allVagas.length === 0 ? (
                  <Skeleton
                    className={`h-7 w-12 my-0.5 ${isDark ? "bg-white/10" : ""}`}
                  />
                ) : (
                  <p
                    key={stat.value}
                    className="dash-stat-number"
                    style={{
                      fontSize: "28px",
                      fontWeight: 900,
                      color: t.statValue,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      textShadow: isDark
                        ? `0 0 24px ${stat.glowColor}70`
                        : "none",
                    }}
                  >
                    {stat.value}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: t.statDesc,
                    marginTop: "6px",
                    fontStyle: "italic",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {stat.description}
                </p>
              </>
            );

            if (isDark) {
              return (
                <div
                  key={stat.label}
                  className="dash-rgb-card-wrap"
                  style={{ animationDelay: `${i * -0.5}s` }}
                >
                  <div className="dash-rgb-card-inner">{cardContent}</div>
                </div>
              );
            }

            return (
              <div
                key={stat.label}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    `0 8px 28px ${stat.glowColor}28`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.06)";
                }}
              >
                <div
                  style={{
                    height: "3px",
                    background: stat.glowColor,
                    opacity: 0.85,
                  }}
                />
                <div style={{ padding: "16px" }}>{cardContent}</div>
              </div>
            );
          })}
        </div>

        {/* ── Top chart row: Visão por Unidade + Motivo da Vaga ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bar chart */}
          <div className={`${t.panelClass} flex flex-col`}>
            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, #818cf8, #22d3ee)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px 12px",
                borderBottom: t.phBorder,
                background: t.phBg,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "2px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "rgba(129,140,248,0.18)",
                      boxShadow: "0 0 12px rgba(129,140,248,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building2
                      style={{
                        width: "15px",
                        height: "15px",
                        color: "#818cf8",
                      }}
                    />
                  </div>
                  <span
                    style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}
                  >
                    Visão por {chartMode === "regiao" ? "Região" : "Unidade"}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: t.tx3,
                    marginLeft: "36px",
                  }}
                >
                  Vagas e bancos consolidados
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: `1px solid ${t.divider}`,
                }}
              >
                {(["unidade", "regiao"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background:
                        chartMode === mode
                          ? isDark
                            ? "rgba(129,140,248,0.4)"
                            : "rgba(99,102,241,0.12)"
                          : "transparent",
                      color:
                        chartMode === mode
                          ? isDark
                            ? "#c4b5fd"
                            : "#6366f1"
                          : t.tx3,
                      border: "none",
                      borderLeft:
                        mode === "regiao" ? `1px solid ${t.divider}` : "none",
                    }}
                  >
                    {mode === "unidade" ? "Unidade" : "Região"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px", flex: 1, position: "relative" }}>
              {(isLoadingVagas || isLoadingBancos) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    background: isDark
                      ? "rgba(7,9,29,0.6)"
                      : "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(2px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0 0 15px 15px",
                  }}
                >
                  <RefreshCcw
                    style={{
                      width: "24px",
                      height: "24px",
                      color: t.tx3,
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              )}
              {chartData.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "240px",
                    gap: "8px",
                  }}
                >
                  <TrendingUp
                    style={{ width: "32px", height: "32px", color: t.tx4 }}
                  />
                  <p
                    style={{ fontSize: "12px", color: t.tx3, fontWeight: 500 }}
                  >
                    Nenhum dado para o filtro atual
                  </p>
                </div>
              ) : (
                <div style={{ overflowY: "auto", maxHeight: "340px" }}>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(200, chartData.length * 36)}
                  >
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 0, right: 48, left: 4, bottom: 0 }}
                      barGap={3}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        horizontal
                        vertical={false}
                        stroke={t.gridLine}
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={90}
                        tick={{
                          fontSize: 9,
                          fontWeight: 700,
                          fill: t.axisColor,
                        }}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                          radius: 4,
                        }}
                        contentStyle={t.tooltip}
                        itemStyle={{ padding: "2px 0", color: t.tooltip.color }}
                        formatter={(value, name) => [
                          `${value} registros`,
                          name === "vagas" ? "Vagas" : "Banco (CR)",
                        ]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{
                          paddingBottom: "12px",
                          fontSize: "9px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: t.legendColor,
                        }}
                      />
                      <Bar
                        dataKey="vagas"
                        name="Vagas"
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {chartData.map((_, idx) => (
                          <Cell
                            key={`cv-${idx}`}
                            fill={idx < 3 ? t.barPrimary : t.barPrimaryLight}
                          />
                        ))}
                        <LabelList
                          dataKey="vagas"
                          position="right"
                          style={{
                            fill: t.axisColor,
                            fontSize: "9px",
                            fontWeight: "bold",
                          }}
                          offset={6}
                          formatter={(v: number) => (v > 0 ? v : "")}
                        />
                      </Bar>
                      <Bar
                        dataKey="bancosDisponiveis"
                        name="Banco (CR)"
                        fill={t.barSecondary}
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        <LabelList
                          dataKey="bancosDisponiveis"
                          position="right"
                          style={{
                            fill: t.barSecondary,
                            fontSize: "9px",
                            fontWeight: "bold",
                          }}
                          offset={6}
                          formatter={(v: number) => (v > 0 ? v : "")}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Motivo da Vaga — donut */}
          <div className={`${t.panelClass} flex flex-col`}>
            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, #a78bfa, #f472b6)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                padding: "16px 18px 12px",
                borderBottom: t.phBorder,
                background: t.phBg,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "2px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "rgba(167,139,250,0.18)",
                    boxShadow: "0 0 12px rgba(167,139,250,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase
                    style={{ width: "15px", height: "15px", color: "#a78bfa" }}
                  />
                </div>
                <span
                  style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}
                >
                  Motivo da Vaga
                </span>
              </div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: t.tx3,
                  marginLeft: "36px",
                }}
              >
                Distribuição por motivo no filtro ativo
              </p>
            </div>
            <div
              style={{
                padding: "16px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {motivoVagaData.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "240px",
                    gap: "8px",
                  }}
                >
                  <Briefcase
                    style={{ width: "32px", height: "32px", color: t.tx4 }}
                  />
                  <p
                    style={{ fontSize: "12px", color: t.tx3, fontWeight: 500 }}
                  >
                    Nenhum dado disponível
                  </p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={motivoVagaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {motivoVagaData.map((_, idx) => (
                          <Cell
                            key={`cd-${idx}`}
                            fill={t.donutColors[idx % t.donutColors.length]}
                            style={
                              isDark
                                ? {
                                    filter: `drop-shadow(0 0 6px ${t.donutColors[idx % t.donutColors.length]}80)`,
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={t.tooltip}
                        itemStyle={{ padding: "2px 0", color: t.tooltip.color }}
                        formatter={(v, n) => [`${v} vagas`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    {motivoVagaData.slice(0, 5).map((item, idx) => {
                      const pct =
                        totalVagas > 0
                          ? Math.round((item.value / totalVagas) * 100)
                          : 0;
                      const color = t.donutColors[idx % t.donutColors.length];
                      return (
                        <div
                          key={item.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: color,
                              boxShadow: isDark ? `0 0 6px ${color}80` : "none",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: t.tx2,
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 900,
                              color: t.tx2,
                            }}
                          >
                            {pct}%
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: t.tx3,
                            }}
                          >
                            ({item.value})
                          </span>
                        </div>
                      );
                    })}
                    {motivoVagaData.length > 5 && (
                      <p
                        style={{
                          fontSize: "9px",
                          color: t.tx3,
                          fontWeight: 500,
                          textAlign: "center",
                          paddingTop: "4px",
                        }}
                      >
                        +{motivoVagaData.length - 5} outros motivos
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Lead Time — Scorecards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            {
              key: "provimento",
              label: "Lead time do provimento de uma vaga",
              sublabel:
                'Primeira edição → "Concluída" (descontado tempo em "Aguardando Unidade")',
              value: leadTimeData.avgProvimento,
              count: leadTimeData.countProvimento,
              countLabel: "vagas concluídas consideradas",
              color: "#f59e0b",
              colorLight: "#d97706",
              gradFrom: "rgba(245,158,11,0.18)",
              gradTo: "rgba(245,158,11,0)",
              glowDark: "rgba(245,158,11,0.25)",
              iconBg: isDark ? "rgba(245,158,11,0.15)" : "#fef3c7",
              sparkData: leadTimeData.monthlyChart.map((m) => ({
                v: m.provimento ?? 0,
              })),
            },
            {
              key: "intake",
              label: "Lead time do início de trabalho de uma vaga no GDP",
              sublabel: "Criação da vaga → primeira edição no GDP",
              value: leadTimeData.avgIntake,
              count: leadTimeData.countIntake,
              countLabel: "vagas com histórico consideradas",
              color: "#818cf8",
              colorLight: "#6366f1",
              gradFrom: "rgba(129,140,248,0.18)",
              gradTo: "rgba(129,140,248,0)",
              glowDark: "rgba(129,140,248,0.25)",
              iconBg: isDark ? "rgba(129,140,248,0.15)" : "#e0e7ff",
              sparkData: leadTimeData.monthlyChart.map((m) => ({
                v: m.intake ?? 0,
              })),
            },
          ].map((card) => {
            const accentColor = isDark ? card.color : card.colorLight;
            const lastThree = card.sparkData
              .slice(-3)
              .map((d) => d.v)
              .filter((v) => v > 0);
            const trend =
              lastThree.length >= 2
                ? lastThree[lastThree.length - 1] - lastThree[0]
                : null;

            const inner = (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: "180px",
                }}
              >
                {/* Top accent bar */}
                <div
                  style={{
                    height: "3px",
                    background: `linear-gradient(90deg, ${card.color}, ${card.color}80)`,
                    flexShrink: 0,
                    borderRadius: "3px 3px 0 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    gap: "16px",
                    padding: "20px",
                  }}
                >
                  {/* Left: icon + numbers */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* Icon + title */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "10px",
                            background: card.iconBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: isDark
                              ? `0 0 14px ${card.glowDark}`
                              : "none",
                          }}
                        >
                          <Clock
                            style={{
                              width: "15px",
                              height: "15px",
                              color: accentColor,
                            }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: t.tx2,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            lineHeight: 1.3,
                          }}
                        >
                          {card.label}
                        </p>
                      </div>

                      {/* Big value */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "52px",
                            fontWeight: 900,
                            lineHeight: 1,
                            color: accentColor,
                            letterSpacing: "-2px",
                            textShadow: isDark
                              ? `0 0 30px ${card.glowDark}`
                              : "none",
                          }}
                        >
                          {card.value !== null ? card.value : "—"}
                        </span>
                        {card.value !== null && (
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 700,
                              color: t.tx3,
                            }}
                          >
                            dias
                          </span>
                        )}
                      </div>

                      {/* Trend pill */}
                      {trend !== null && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "8px",
                            padding: "3px 9px",
                            borderRadius: "20px",
                            background:
                              trend <= 0
                                ? isDark
                                  ? "rgba(52,211,153,0.15)"
                                  : "#d1fae5"
                                : isDark
                                  ? "rgba(248,113,113,0.15)"
                                  : "#fee2e2",
                            border: `1px solid ${trend <= 0 ? (isDark ? "rgba(52,211,153,0.3)" : "#6ee7b7") : isDark ? "rgba(248,113,113,0.3)" : "#fca5a5"}`,
                          }}
                        >
                          <TrendingUp
                            style={{
                              width: "10px",
                              height: "10px",
                              color: trend <= 0 ? "#34d399" : "#f87171",
                              transform: trend <= 0 ? "scaleY(-1)" : "none",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              color: trend <= 0 ? "#34d399" : "#f87171",
                            }}
                          >
                            {trend <= 0
                              ? `↓ ${Math.abs(trend)}d`
                              : `↑ ${trend}d`}{" "}
                            últimos 3m
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: "12px" }}>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: 500,
                          color: t.tx3,
                          lineHeight: 1.5,
                        }}
                      >
                        {card.sublabel}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: t.tx4,
                          marginTop: "3px",
                        }}
                      >
                        {card.count} {card.countLabel}
                      </p>
                    </div>
                  </div>

                  {/* Right: mini sparkline */}
                  <div
                    style={{
                      width: "120px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    <ResponsiveContainer width="100%" height={90}>
                      <AreaChart
                        data={card.sparkData}
                        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id={`spark-${card.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={card.color}
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor={card.color}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke={card.color}
                          strokeWidth={2}
                          fill={`url(#spark-${card.key})`}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );

            if (isDark) {
              return (
                <div
                  key={card.key}
                  className="dash-rgb-card-wrap"
                  style={{ borderRadius: "20px" }}
                >
                  <div
                    className="dash-rgb-card-inner"
                    style={{ borderRadius: "20px", padding: 0 }}
                  >
                    {inner}
                  </div>
                </div>
              );
            }
            return (
              <div
                key={card.key}
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* ── Lead Time — Charts ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            {
              key: "provimento",
              title: "Lead time do provimento de uma vaga",
              subtitle: "Média de dias por mês (vagas concluídas)",
              dataKey: "provimento" as const,
              color: "#f59e0b",
              gradId: "gradProvimento",
            },
            {
              key: "intake",
              title: "Lead time do início de trabalho no GDP",
              subtitle: "Média de dias da criação ao primeiro movimento",
              dataKey: "intake" as const,
              color: isDark ? "#818cf8" : "#6366f1",
              gradId: "gradIntake",
            },
          ].map((cfg) => (
            <div key={cfg.key} className={`${t.panelClass} flex flex-col`}>
              <div
                style={{
                  height: "3px",
                  background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}60)`,
                  flexShrink: 0,
                }}
              />

              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px 18px 12px",
                  borderBottom: t.phBorder,
                  background: t.phBg,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: isDark ? `${cfg.color}22` : `${cfg.color}22`,
                    boxShadow: isDark ? `0 0 12px ${cfg.color}33` : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Zap
                    style={{ width: "14px", height: "14px", color: cfg.color }}
                  />
                </div>
                <div>
                  <p
                    style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}
                  >
                    {cfg.title}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      color: t.tx3,
                      marginTop: "1px",
                    }}
                  >
                    {cfg.subtitle}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div style={{ padding: "16px", flex: 1 }}>
                {leadTimeData.monthlyChart.every(
                  (m) => m[cfg.dataKey] === null,
                ) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "200px",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <Clock
                      style={{ width: "32px", height: "32px", color: t.tx4 }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: t.tx3,
                        fontWeight: 600,
                      }}
                    >
                      Dados insuficientes
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={leadTimeData.monthlyChart}
                      margin={{ top: 8, right: 24, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id={cfg.gradId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={cfg.color}
                            stopOpacity={isDark ? 0.35 : 0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor={cfg.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke={t.gridLine}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: 700,
                          fill: t.axisColor,
                        }}
                        interval={0}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: 700,
                          fill: t.axisColor,
                        }}
                        tickFormatter={(v) => `${v}d`}
                      />
                      <Tooltip
                        contentStyle={t.tooltip}
                        itemStyle={{ padding: "2px 0", color: t.tooltip.color }}
                        formatter={(v: any) =>
                          v !== null ? [`${v} dias`, "Média"] : ["—", "Média"]
                        }
                        labelStyle={{
                          fontWeight: 800,
                          marginBottom: "4px",
                          color: t.tooltip.color,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={cfg.dataKey}
                        name="Média"
                        stroke={cfg.color}
                        strokeWidth={2.5}
                        fill={`url(#${cfg.gradId})`}
                        dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
                        activeDot={{
                          r: 6,
                          fill: cfg.color,
                          stroke: `${cfg.color}40`,
                          strokeWidth: 6,
                        }}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Evolução Mensal — full width ─────────────────────────────── */}
        <div className={`${t.panelClass} flex flex-col`}>
          <div
            style={{
              height: "3px",
              background: "linear-gradient(90deg, #60a5fa, #34d399)",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              padding: "16px 18px 12px",
              borderBottom: t.phBorder,
              background: t.phBg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "2px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(96,165,250,0.18)",
                  boxShadow: "0 0 12px rgba(96,165,250,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp
                  style={{ width: "15px", height: "15px", color: "#60a5fa" }}
                />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}>
                Evolução Mensal
              </span>
            </div>
            <p
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: t.tx3,
                marginLeft: "36px",
              }}
            >
              Vagas abertas vs. concluídas (12 meses)
            </p>
          </div>
          <div style={{ padding: "16px", flex: 1 }}>
            {monthlyData.every((m) => m.abertas === 0 && m.concluidas === 0) ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "240px",
                  gap: "8px",
                }}
              >
                <TrendingUp
                  style={{ width: "32px", height: "32px", color: t.tx4 }}
                />
                <p style={{ fontSize: "12px", color: t.tx3, fontWeight: 500 }}>
                  Sem dados de abertura registrados
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 8, right: 24, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradAbertas"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={t.areaBlue}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={t.areaBlue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradConcluidas"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={t.areaGreen}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={t.areaGreen}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke={t.gridLine}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: t.axisColor }}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: t.axisColor }}
                  />
                  <Tooltip
                    contentStyle={t.tooltip}
                    itemStyle={{ padding: "2px 0", color: t.tooltip.color }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{
                      fontSize: "9px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: t.legendColor,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="abertas"
                    name="Abertas"
                    stroke={t.areaBlue}
                    strokeWidth={2.5}
                    fill="url(#gradAbertas)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: t.areaBlue,
                      stroke: `${t.areaBlue}40`,
                      strokeWidth: 6,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="concluidas"
                    name="Concluídas"
                    stroke={t.areaGreen}
                    strokeWidth={2.5}
                    fill="url(#gradConcluidas)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: t.areaGreen,
                      stroke: `${t.areaGreen}40`,
                      strokeWidth: 6,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Bottom row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Stale vacancies */}
          <div className={`${t.panelClass} flex flex-col`}>
            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, #fbbf24, #f87171)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px 12px",
                borderBottom: t.phBorder,
                background: t.phBg,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "rgba(251,191,36,0.18)",
                    boxShadow: "0 0 12px rgba(251,191,36,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle
                    style={{ width: "15px", height: "15px", color: "#fbbf24" }}
                  />
                </div>
                <div>
                  <p
                    style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}
                  >
                    Vagas sem Movimentação
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      color: t.tx3,
                      marginTop: "1px",
                    }}
                  >
                    Sem status ou paradas há mais de 10 dias
                  </p>
                </div>
              </div>
              {alerts.length > 0 && (
                <span
                  style={{
                    background: "rgba(251,191,36,0.18)",
                    color: isDark ? "#fcd34d" : "#b45309",
                    fontSize: "9px",
                    fontWeight: 900,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(251,191,36,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {alerts.length > 0 ? (
                alerts.slice(0, 6).map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 18px",
                      borderBottom: `1px solid ${t.divider}`,
                      transition: "background 0.15s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = t.rowHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          alert.type === "vaga" ? "#fbbf24" : "#f87171",
                        boxShadow: isDark
                          ? alert.type === "vaga"
                            ? "0 0 8px rgba(251,191,36,0.6)"
                            : "0 0 8px rgba(248,113,113,0.6)"
                          : "none",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: t.tx1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          lineHeight: 1.3,
                        }}
                      >
                        {alert.title}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: t.tx3,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {alert.unit}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: t.tx4,
                        }}
                      >
                        #{alert.reference}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background:
                            alert.type === "vaga"
                              ? isDark
                                ? "rgba(251,191,36,0.15)"
                                : "rgba(251,191,36,0.12)"
                              : isDark
                                ? "rgba(248,113,113,0.15)"
                                : "rgba(248,113,113,0.12)",
                          color:
                            alert.type === "vaga"
                              ? isDark
                                ? "#fcd34d"
                                : "#b45309"
                              : isDark
                                ? "#fca5a5"
                                : "#dc2626",
                          border: `1px solid ${alert.type === "vaga" ? "rgba(251,191,36,0.28)" : "rgba(248,113,113,0.28)"}`,
                        }}
                      >
                        {alert.badge}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: isDark
                        ? "rgba(52,211,153,0.15)"
                        : "rgba(16,185,129,0.08)",
                      boxShadow: isDark
                        ? "0 0 20px rgba(52,211,153,0.2)"
                        : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <ShieldCheck
                      style={{
                        width: "24px",
                        height: "24px",
                        color: "#34d399",
                      }}
                    />
                  </div>
                  <h4
                    style={{ fontSize: "14px", fontWeight: 800, color: t.tx1 }}
                  >
                    Tudo sob controle
                  </h4>
                  <p
                    style={{
                      fontSize: "12px",
                      color: t.tx3,
                      marginTop: "4px",
                      maxWidth: "180px",
                    }}
                  >
                    Nenhuma pendência crítica no recorte selecionado.
                  </p>
                </div>
              )}
            </div>
            <div
              style={{
                padding: "12px",
                borderTop: `1px solid ${t.divider}`,
                background: t.phBg,
              }}
            >
              <button
                onClick={() => setIsStaleModalOpen(true)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "36px",
                  borderRadius: "10px",
                  background: isDark
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  color: isDark ? "#fcd34d" : "#b45309",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(251,191,36,0.18)"
                    : "rgba(251,191,36,0.14)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(251,191,36,0.08)";
                }}
              >
                Ver todas as vagas paradas{" "}
                <ChevronRight style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          {/* Atividades Recentes */}
          <div
            className={`${t.panelClass} flex flex-col`}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, #818cf8, #f472b6, #34d399)",
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px 12px",
                borderBottom: t.phBorder,
                background: t.phBg,
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "rgba(129,140,248,0.18)",
                    boxShadow: "0 0 12px rgba(129,140,248,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Activity
                    style={{ width: "15px", height: "15px", color: "#818cf8" }}
                  />
                </div>
                <div>
                  <p
                    style={{ fontSize: "13px", fontWeight: 800, color: t.tx1 }}
                  >
                    Atividades Recentes
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      color: t.tx3,
                      marginTop: "1px",
                    }}
                  >
                    Novas vagas, fluxo e observações
                  </p>
                </div>
              </div>
              {/* Legend pills */}
              <div style={{ display: "flex", gap: "6px" }}>
                {(
                  [
                    { label: "Vaga", color: "#10b981" },
                    { label: "Fluxo", color: "#818cf8" },
                    { label: "Obs.", color: "#f59e0b" },
                  ] as const
                ).map((l) => (
                  <span
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: isDark ? "rgba(255,255,255,0.45)" : "#94a3b8",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: l.color,
                        flexShrink: 0,
                      }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Feed */}
            {(() => {
              const PAGE_SIZE = 5;
              const totalPages = Math.ceil(recentActivities.length / PAGE_SIZE);
              const safePage = Math.min(
                activityPage,
                Math.max(0, totalPages - 1),
              );
              const pageItems = recentActivities.slice(
                safePage * PAGE_SIZE,
                (safePage + 1) * PAGE_SIZE,
              );

              const CFGS = {
                nova_vaga: {
                  label: "Nova Vaga",
                  dot: "#10b981",
                  iconBg: isDark ? "rgba(16,185,129,0.2)" : "#d1fae5",
                  iconColor: isDark ? "#34d399" : "#059669",
                  badgeBg: isDark ? "rgba(16,185,129,0.15)" : "#d1fae5",
                  badgeColor: isDark ? "#34d399" : "#065f46",
                },
                fluxo: {
                  label: "Fluxo",
                  dot: "#818cf8",
                  iconBg: isDark ? "rgba(129,140,248,0.2)" : "#e0e7ff",
                  iconColor: isDark ? "#818cf8" : "#4f46e5",
                  badgeBg: isDark ? "rgba(129,140,248,0.15)" : "#e0e7ff",
                  badgeColor: isDark ? "#a5b4fc" : "#3730a3",
                },
                observacao: {
                  label: "Observação",
                  dot: "#f59e0b",
                  iconBg: isDark ? "rgba(251,191,36,0.2)" : "#fef3c7",
                  iconColor: isDark ? "#fbbf24" : "#d97706",
                  badgeBg: isDark ? "rgba(251,191,36,0.15)" : "#fef3c7",
                  badgeColor: isDark ? "#fcd34d" : "#92400e",
                },
              } as const;

              return (
                <div
                  style={{ display: "flex", flexDirection: "column", flex: 1 }}
                >
                  {/* Items list */}
                  <div style={{ flex: 1 }}>
                    {isLoadingVagas ? (
                      Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "12px 18px",
                            borderBottom: `1px solid ${t.divider}`,
                          }}
                        >
                          <Skeleton
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              flexShrink: 0,
                            }}
                            className={isDark ? "bg-white/10" : ""}
                          />
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              paddingTop: "4px",
                            }}
                          >
                            <Skeleton
                              className={`h-3 rounded ${isDark ? "bg-white/8" : ""}`}
                              style={{ width: "65%" }}
                            />
                            <Skeleton
                              className={`h-2.5 rounded ${isDark ? "bg-white/6" : ""}`}
                              style={{ width: "85%" }}
                            />
                            <Skeleton
                              className={`h-2.5 rounded ${isDark ? "bg-white/5" : ""}`}
                              style={{ width: "40%" }}
                            />
                          </div>
                        </div>
                      ))
                    ) : pageItems.length > 0 ? (
                      pageItems.map((activity, idx) => {
                        const isLast = idx === pageItems.length - 1;
                        const cfg = CFGS[activity.type];
                        const timeLabel = formatActivityTime(activity.time);
                        const vagaRef = activity.vaga;

                        const renderAvatar = () => {
                          // 1. Real photo from Supabase (stored full URL)
                          if (activity.avatar_url) {
                            return (
                              <img
                                src={activity.avatar_url}
                                alt={activity.usuario || ""}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: `2px solid ${cfg.iconBg}`,
                                  flexShrink: 0,
                                }}
                                onError={(e) => {
                                  (
                                    e.currentTarget as HTMLImageElement
                                  ).style.display = "none";
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement | null
                                  )?.style &&
                                    ((
                                      e.currentTarget
                                        .nextElementSibling as HTMLElement
                                    ).style.display = "flex");
                                }}
                              />
                            );
                          }
                          // 2. System icon (nova_vaga with no user, or unknown)
                          if (!activity.usuario) {
                            const Icon =
                              activity.type === "nova_vaga"
                                ? Plus
                                : activity.type === "fluxo"
                                  ? GitBranch
                                  : MessageSquare;
                            return (
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: cfg.iconBg,
                                  border: `2px solid ${cfg.badgeBg}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: cfg.iconColor,
                                  }}
                                />
                              </div>
                            );
                          }
                          // 3. Initials fallback
                          return (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: cfg.iconBg,
                                border: `2px solid ${cfg.badgeBg}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 800,
                                color: cfg.iconColor,
                                flexShrink: 0,
                                letterSpacing: "0.02em",
                              }}
                            >
                              {getInitials(activity.usuario)}
                            </div>
                          );
                        };

                        return (
                          <div
                            key={activity.id}
                            onClick={() => navigate(`/vagas/${vagaRef.id}`)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                              padding: "11px 18px",
                              borderBottom: isLast
                                ? "none"
                                : `1px solid ${t.divider}`,
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = t.rowHover)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            {/* Avatar + timeline line */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              {renderAvatar()}
                              {!isLast && (
                                <div
                                  style={{
                                    width: "1px",
                                    flex: 1,
                                    minHeight: "10px",
                                    marginTop: "4px",
                                    background: `linear-gradient(to bottom, ${cfg.dot}40, ${t.divider})`,
                                  }}
                                />
                              )}
                            </div>

                            {/* Content */}
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                paddingTop: "2px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: t.tx1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                  }}
                                >
                                  {vagaRef.cargo || "—"}
                                </p>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    color: t.tx4,
                                    flexShrink: 0,
                                  }}
                                >
                                  {timeLabel}
                                </span>
                              </div>
                              {vagaRef.unidade && (
                                <p
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    color: t.tx3,
                                    marginTop: "1px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {vagaRef.unidade}
                                </p>
                              )}
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: t.tx2,
                                  marginTop: "5px",
                                  lineHeight: 1.45,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {activity.type === "observacao"
                                  ? `"${activity.descricao}"`
                                  : activity.descricao}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginTop: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: cfg.badgeColor,
                                    background: cfg.badgeBg,
                                    padding: "2px 7px",
                                    borderRadius: "5px",
                                  }}
                                >
                                  {cfg.label}
                                </span>
                                {activity.usuario && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 500,
                                      color: t.tx3,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {activity.usuario}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "48px 24px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: isDark
                              ? "rgba(255,255,255,0.05)"
                              : "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <Activity
                            style={{
                              width: "24px",
                              height: "24px",
                              color: t.tx4,
                            }}
                          />
                        </div>
                        <h4
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: t.tx2,
                          }}
                        >
                          Nenhuma atividade registrada
                        </h4>
                        <p
                          style={{
                            fontSize: "12px",
                            color: t.tx3,
                            marginTop: "4px",
                            maxWidth: "200px",
                          }}
                        >
                          As ações do sistema aparecerão aqui conforme forem
                          realizadas.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagination footer */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 18px",
                        borderTop: `1px solid ${t.divider}`,
                        background: t.phBg,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() =>
                          setActivityPage((p) => Math.max(0, p - 1))
                        }
                        disabled={safePage === 0}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: safePage === 0 ? t.tx4 : t.tx2,
                          background: "none",
                          border: "none",
                          cursor: safePage === 0 ? "not-allowed" : "pointer",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (safePage !== 0)
                            (e.currentTarget as HTMLElement).style.background =
                              t.rowHover;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "none";
                        }}
                      >
                        <ChevronDown
                          style={{
                            width: 13,
                            height: 13,
                            transform: "rotate(90deg)",
                          }}
                        />{" "}
                        Anterior
                      </button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActivityPage(i)}
                            style={{
                              width: i === safePage ? "20px" : "6px",
                              height: "6px",
                              borderRadius: "3px",
                              background:
                                i === safePage
                                  ? "#818cf8"
                                  : isDark
                                    ? "rgba(255,255,255,0.15)"
                                    : "#cbd5e1",
                              border: "none",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              padding: 0,
                            }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setActivityPage((p) =>
                            Math.min(totalPages - 1, p + 1),
                          )
                        }
                        disabled={safePage === totalPages - 1}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: safePage === totalPages - 1 ? t.tx4 : t.tx2,
                          background: "none",
                          border: "none",
                          cursor:
                            safePage === totalPages - 1
                              ? "not-allowed"
                              : "pointer",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (safePage !== totalPages - 1)
                            (e.currentTarget as HTMLElement).style.background =
                              t.rowHover;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "none";
                        }}
                      >
                        Próximo{" "}
                        <ChevronDown
                          style={{
                            width: 13,
                            height: 13,
                            transform: "rotate(-90deg)",
                          }}
                        />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Stale vacancy full dialog ────────────────────────────────── */}
      <Dialog open={isStaleModalOpen} onOpenChange={setIsStaleModalOpen}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-0"
          style={{
            background: t.dlgBg,
            backdropFilter: isDark ? "blur(40px)" : "none",
            WebkitBackdropFilter: isDark ? "blur(40px)" : "none",
            border: t.dlgBorder,
            borderRadius: "20px",
            boxShadow: isDark
              ? "0 40px 80px rgba(0,0,0,0.7)"
              : "0 20px 60px rgba(0,0,0,0.15)",
          }}
        >
          <DialogHeader
            style={{
              padding: "24px",
              borderBottom: t.dlgHdrBorder,
              background: t.dlgHdrBg,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "rgba(251,191,36,0.18)",
                  boxShadow: isDark ? "0 0 20px rgba(251,191,36,0.3)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle
                  style={{
                    width: "22px",
                    height: "22px",
                    color: isDark ? "#fcd34d" : "#b45309",
                  }}
                />
              </div>
              <div>
                <DialogTitle
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: t.tx1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Vagas sem Movimentação
                </DialogTitle>
                <DialogDescription
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: t.tx3,
                    marginTop: "2px",
                  }}
                >
                  Vagas sem status ou com mais de 10 dias sem movimentação.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Table>
              <TableHeader
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  background: t.tblHdrBg,
                }}
              >
                <TableRow style={{ borderBottom: `1px solid ${t.tblBorder}` }}>
                  {[
                    "Requisição",
                    "Unidade",
                    "Cargo",
                    "Status",
                    "Dias Parado",
                  ].map((h, i) => (
                    <TableHead
                      key={h}
                      style={{
                        fontSize: "10px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: t.tblHdrColor,
                        textAlign:
                          i === 0 || i === 3 || i === 4 ? "center" : "left",
                        padding: "12px 20px",
                      }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingVagas && allVagas.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow
                      key={i}
                      style={{ borderBottom: `1px solid ${t.tblBorder}` }}
                    >
                      {[48, 96, 144, 72, 48].map((w, j) => (
                        <TableCell key={j} style={{ padding: "16px 20px" }}>
                          <Skeleton
                            className={`h-4 rounded ${isDark ? "bg-white/8" : ""}`}
                            style={{ width: `${w}px` }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : vacancyAlerts.length > 0 ? (
                  vacancyAlerts.map((vaga) => (
                    <TableRow
                      key={vaga.id}
                      style={{
                        borderBottom: `1px solid ${t.tblBorder}`,
                        transition: "background 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = t.rowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <TableCell
                        style={{
                          padding: "14px 20px",
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: t.tx3,
                        }}
                      >
                        #{vaga.displayId}
                      </TableCell>
                      <TableCell style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Building2
                            style={{
                              width: "12px",
                              height: "12px",
                              color: t.tx4,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: t.tx2,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {normalizeUnitName(vaga.unidade)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: t.tx1,
                          }}
                        >
                          {vaga.cargo || "Não informado"}
                        </span>
                      </TableCell>
                      <TableCell
                        style={{ padding: "14px 20px", textAlign: "center" }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "8px",
                            background: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "#f1f5f9",
                            border: `1px solid ${t.divider}`,
                            color: t.tx2,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {vaga.status || "Sem status"}
                        </span>
                      </TableCell>
                      <TableCell
                        style={{ padding: "14px 20px", textAlign: "center" }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 900,
                            padding: "4px 10px",
                            borderRadius: "8px",
                            background:
                              vaga.daysOpen > 20
                                ? "rgba(248,113,113,0.15)"
                                : "rgba(251,191,36,0.15)",
                            color:
                              vaga.daysOpen > 20
                                ? isDark
                                  ? "#fca5a5"
                                  : "#dc2626"
                                : isDark
                                  ? "#fcd34d"
                                  : "#b45309",
                            border: `1px solid ${vaga.daysOpen > 20 ? "rgba(248,113,113,0.28)" : "rgba(251,191,36,0.28)"}`,
                          }}
                        >
                          {vaga.daysOpen} dias
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      style={{ height: "192px", textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: isDark
                              ? "rgba(52,211,153,0.15)"
                              : "rgba(16,185,129,0.08)",
                            boxShadow: isDark
                              ? "0 0 20px rgba(52,211,153,0.2)"
                              : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShieldCheck
                            style={{
                              width: "24px",
                              height: "24px",
                              color: "#34d399",
                            }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: t.tx1,
                          }}
                        >
                          Nenhuma vaga parada
                        </p>
                        <p style={{ fontSize: "12px", color: t.tx3 }}>
                          Todas as vagas já possuem status definido.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div
            style={{
              padding: "16px 20px",
              borderTop: t.dlgHdrBorder,
              background: t.dlgFtrBg,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setIsStaleModalOpen(false)}
              style={{
                height: "36px",
                padding: "0 20px",
                borderRadius: "10px",
                background: t.btnBg,
                border: t.btnBorder,
                color: t.btnColor,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? "rgba(255,255,255,0.14)"
                  : "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.btnBg;
              }}
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
