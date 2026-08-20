import { useState, useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import { useNavigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import {
  TIPO_VAGA_LABELS,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  StatusGeral,
  TipoVaga,
  STATUS_EDITAL_COLORS,
  Vaga,
  BancoTalentos,
  ETAPA_LABELS,
  EtapaEdital,
  TODAS_AS_ETAPAS,
  VagaFluxoItem,
  StatusProcesso,
} from "@/types/vaga";
import { AcompanhamentoModal } from "@/components/AcompanhamentoModal";
import {
  calcDiasAberto,
  formatDate,
  CATEGORIAS_STATUS,
  isVitoriaUnit,
  normalizeCargo,
  normalizeUnitName,
  unitIsAllowed,
  countVacancies,
  getStatusSummary,
  getCategoriaStatus,
  getMonthNamePtBrUpper,
  getValidVacancyBase,
  getEtapaColor,
  getAutoEtapa,
  filterByRegionAndUnit,
  UNIDADES_POR_REGIAO,
} from "@/lib/vagaUtils";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Sparkles,
  Download,
  Sigma,
  Radar,
} from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
// ... keep existing code

// ─── Fluxo filter constants ───────────────────────────────────────────────────
const TRATATIVAS_FILTER = [
  "Aproveitamento de Banco de Talentos",
  "Publicação de Edital",
  "Movimentação Interna",
  "Vaga de Liderança",
  "Aguardando Unidade",
] as const;

const ETAPAS_POR_TRATATIVA_FILTER: Record<string, string[]> = {
  "Aproveitamento de Banco de Talentos": [
    "Convocação",
    "Documentação",
    "Enviado para Formalização",
    "Admissão Efetivada",
  ],
  "Publicação de Edital": [
    "Publicar novo edital",
    "Em edital",
    "Triagem",
    "Avaliação Específica",
    "Recurso",
    "Entrevista",
    "Análise Curricular",
    "Convocação",
    "Documentação",
    "Enviado para Formalização",
    "Admissão Efetivada",
    "Não logrou êxito",
  ],
  "Movimentação Interna": [
    "Movimentação direta",
    "Processo Seletivo Interno",
    "Documentação",
    "Edoc",
  ],
  "Vaga de Liderança": [
    "Divulgação",
    "Triagem",
    "Entrevista",
    "Documentação",
    "Edoc",
    "Admissão Efetivada",
  ],
  "Aguardando Unidade": ["Aguardando Unidade"],
};

// All unique etapas flattened (for when no tratativa is selected)
const ALL_ETAPAS_FILTER = [
  ...new Set(Object.values(ETAPAS_POR_TRATATIVA_FILTER).flat()),
];

// ─── Multi-vaga fluxo helpers (mirrored from VagaDetalhePage) ────────────────
function getVagaFluxoItems(v: Vaga): VagaFluxoItem[] {
  const count = Math.max(Number(v.numero_vagas || v.quantidade) || 1, 1);
  const stored = Array.isArray(v.distribuicao_vagas)
    ? (v.distribuicao_vagas as VagaFluxoItem[])
    : [];
  return Array.from({ length: count }, (_, i) => {
    const slot = i + 1;
    const found = stored.find((e) => e.slot === slot);
    const root: Partial<VagaFluxoItem> =
      slot === 1
        ? {
            tratativa: v.tratativa,
            etapa: v.etapa,
            status_processo: v.status_processo || "Solicitada",
          }
        : { status_processo: "Solicitada" };
    return { ...root, ...found, slot } as VagaFluxoItem;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  FileText,
  X,
  Building2,
  Filter,
  ListFilter,
  AlertCircle,
  Database,
  CheckCircle2,
  ArrowRight,
  Check,
  Accessibility,
  Puzzle,
} from "lucide-react";
import { toast } from "sonner";
import { VagaHistoryDialog } from "@/components/VagaHistoryDialog";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RequestUpdateDialog } from "@/components/RequestUpdateDialog";
import {
  StatusProcessoBadge,
  STATUS_CONFIG,
} from "@/components/StatusProcessoBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const BANCO_UNIT_GROUPS = [
  [
    "GOIANIA",
    [
      "GOIÂNIA",
      "GOIANIA",
      "CRER",
      "HUGOL",
      "HECAD",
      "HDS",
      "AGIR",
      "TEIA GOIÂNIA",
      "TEIA GOIANIA",
      "TEIA ANÁPOLIS",
      "TEIA ANAPOLIS",
      "TEIA APARECIDA",
      "TEIA CANEDO",
      "TEIA CEN",
      "TEIA MAN",
      "TEIA MAN 2",
      "TEIA MAN 3",
      "TEIA PIN",
    ],
  ],
  [
    "UPA",
    ["UPA", "VITÓRIA", "VITORIA", "SÃO PEDRO", "SAO PEDRO", "SUÁ", "SUA"],
  ],
  ["HRD", ["HRD", "DOURADOS"]],
  ["HRC", ["HRC", "HRCAC I", "HRCAC II"]],
  ["CHS", ["CHS"]],
  ["HMSA", ["HMSA"]],
  ["JATAI", ["JATAÍ", "JATAI"]],
  ["POLICLINICA", ["POLICLÍNICA", "POLICLINICA"]],
] as const;


// Order in which the status_processo scorecards appear
const STATUS_PROCESSO_ORDER = [
  "Solicitada",
  "Em Andamento",
  "Concluída",
  "Suspensa",
  "Cancelada",
] as const;

const getUnitScope = (unit?: string | null) => {
  const normalized = normalizeUnitName(unit || "");
  if (!normalized) return [normalized];

  for (const [canonicalUnit, aliases] of BANCO_UNIT_GROUPS) {
    const normalizedAliases = aliases.map((alias) => normalizeUnitName(alias));
    if (
      normalized === normalizeUnitName(canonicalUnit) ||
      normalizedAliases.includes(normalized)
    ) {
      return [normalizeUnitName(canonicalUnit), ...normalizedAliases];
    }
  }

  return [normalized];
};

const unitsShareBankScope = (
  vagaUnit?: string | null,
  bancoUnit?: string | null,
) => {
  const vagaScope = new Set(getUnitScope(vagaUnit));
  return getUnitScope(bancoUnit).some((unit) => vagaScope.has(unit));
};

const getLookupKeys = (value?: string | null) => {
  const raw = String(value || "").trim();
  const normalized = normalizeCargo(raw);
  return Array.from(new Set([raw, normalized].filter(Boolean)));
};

const pushLookup = <T,>(map: Map<string, T[]>, key: string, value: T) => {
  if (!key) return;
  const list = map.get(key) || [];
  list.push(value);
  map.set(key, list);
};

// ─── Cargo similarity (mirrors VagaDetalhePage) ──────────────────────────────
function calcSimilarity(vagaCargo: string, bancoCargo: string): number {
  if (!vagaCargo || !bancoCargo) return 0;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const tokensVaga = norm(vagaCargo)
    .split(" ")
    .filter((t) => t.length >= 3);
  const normBanco = norm(bancoCargo);
  if (!tokensVaga.length) return 0;
  const matches = tokensVaga.filter((t) => normBanco.includes(t));
  return matches.length / tokensVaga.length;
}

// ─── Reusable multi-select filter popover ────────────────────────────────────
function MultiSelectFilter({
  placeholder,
  options,
  selected,
  onChange,
  width = "w-[180px]",
  icon,
}: {
  placeholder: string;
  options: { value: string; label?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  width?: string;
  icon?: JSX.Element;
}) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`${width} bg-white justify-between h-9 text-xs font-normal px-3`}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {icon}
            <span
              className={`truncate ${selected.length > 0 ? "text-slate-800 font-medium" : "text-slate-400"}`}
            >
              {label}
            </span>
          </span>
          {selected.length > 0 ? (
            <span
              className="ml-1 shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-primary text-white text-[9px] font-bold"
            >
              {selected.length}
            </span>
          ) : (
            <ChevronDown className="h-3 w-3 text-slate-400 ml-1 shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-[230px]" align="start">
        {selected.length > 0 && (
          <button
            className="w-full text-left text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 mb-1 rounded flex items-center gap-1"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3" /> Limpar seleção
          </button>
        )}
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 shrink-0"
              />
              {opt.label ?? opt.value}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function VagasPage() {
  const { isDark } = useTheme();

  // Sync dark mode to body so Radix portals (Select, Popover, Dialog) inherit CSS vars
  useEffect(() => {
    if (isDark) document.body.classList.add("gdp-dark");
    else document.body.classList.remove("gdp-dark");
    return () => document.body.classList.remove("gdp-dark");
  }, [isDark]);

  const {
    vagas,
    bancos,
    deleteVaga,
    updateVaga,
    fetchVagas,
    fetchBancos,
    isLoadingVagas,
    isInitialLoad,
  } = useVagasStore();

  const {
    currentUser,
    addAuditLog,
    selectedRegion,
    selectedUnit: globalUnit,
    users,
    fetchUsers,
  } = useAdminStore();

  useEffect(() => {
    fetchVagas();
    fetchBancos();
    fetchUsers();
  }, [fetchVagas, fetchBancos, fetchUsers]);
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "list";
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = usePermissions();
  const [search, setSearch] = useState("");
  const [filterUnidades, setFilterUnidades] = useState<string[]>([]);
  const [filterMeses, setFilterMeses] = useState<string[]>([]);
  const [filterStatusProcesso, setFilterStatusProcesso] = useState<string[]>(() => {
    const p = new URLSearchParams(window.location.search).get("status");
    return p ? p.split(",") : [];
  });

  const [filterTratativas, setFilterTratativas] = useState<string[]>(() => {
    const p = new URLSearchParams(window.location.search).get("tratativa");
    return p ? [p] : [];
  });
  const [filterEtapa, setFilterEtapa] = useState(() => {
    return new URLSearchParams(window.location.search).get("etapa") ?? "all";
  });
  const [filterAnalista, setFilterAnalista] = useState("all");
  const [filterAssistente, setFilterAssistente] = useState("all");
  const [filterLideranca, setFilterLideranca] = useState("all");
  const [filterVagasNovas, setFilterVagasNovas] = useState(false);
  const [filterComBanco, setFilterComBanco] = useState(false);
  const [filterSemMovimentacao, setFilterSemMovimentacao] = useState(false);
  const [filterTeia, setFilterTeia] = useState(false);
  const [filterPcd, setFilterPcd] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVagaForHistory, setSelectedVagaForHistory] =
    useState<Vaga | null>(null);
  const [vagaParaExcluir, setVagaParaExcluir] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isRequestUpdateOpen, setIsRequestUpdateOpen] = useState(false);
  const [vagaForUpdate, setVagaForUpdate] = useState<Vaga | null>(null);
  const pageSize = 50;

  const canDelete =
    currentUser?.perfil === "Admin" || currentUser?.pode_excluir_requisicoes;

  // ── Dual synchronized scrollbar (top + bottom) ───────────────────────────
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // Measure table content width after every render (handles isInitialLoad flip)
  useLayoutEffect(() => {
    if (tableScrollRef.current) {
      const w = tableScrollRef.current.scrollWidth;
      setTableScrollWidth((prev) => (prev !== w ? w : prev));
    }
  });

  // Attach native scroll sync listeners once we have a real width
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    const topEl = topScrollRef.current;
    const bottomEl = bottomScrollRef.current;
    if (!tableEl || !topEl || !bottomEl || tableScrollWidth === 0) return;

    let syncing = false;
    const fromTable = () => {
      if (syncing) return;
      syncing = true;
      topEl.scrollLeft = tableEl.scrollLeft;
      bottomEl.scrollLeft = tableEl.scrollLeft;
      syncing = false;
    };
    const fromTop = () => {
      if (syncing) return;
      syncing = true;
      tableEl.scrollLeft = topEl.scrollLeft;
      bottomEl.scrollLeft = topEl.scrollLeft;
      syncing = false;
    };
    const fromBottom = () => {
      if (syncing) return;
      syncing = true;
      tableEl.scrollLeft = bottomEl.scrollLeft;
      topEl.scrollLeft = bottomEl.scrollLeft;
      syncing = false;
    };

    tableEl.addEventListener("scroll", fromTable);
    topEl.addEventListener("scroll", fromTop);
    bottomEl.addEventListener("scroll", fromBottom);
    return () => {
      tableEl.removeEventListener("scroll", fromTable);
      topEl.removeEventListener("scroll", fromTop);
      bottomEl.removeEventListener("scroll", fromBottom);
    };
  }, [tableScrollWidth]);

  const handleDelete = () => {
    if (vagaParaExcluir && canDelete) {
      const vaga = vagas.find((v) => v.id === vagaParaExcluir);
      if (vaga) {
        deleteVaga(vagaParaExcluir);
        addAuditLog({
          usuario_nome: currentUser?.nome_completo || "Sistema",
          usuario_email: currentUser?.email || "sistema@sistema.com",
          perfil: currentUser?.perfil || "Sistema",
          data: new Date().toISOString().split("T")[0],
          hora: new Date().toLocaleTimeString(),
          acao: "Excluir Requisição",
          modulo: "Vagas",
          registro_afetado:
            vaga.requisicao || vaga.numero_requisicao || vaga.id,
        });
        toast.success("Requisição excluída com sucesso.");
      }
      setIsDeleteDialogOpen(false);
      setVagaParaExcluir(null);
    }
  };

  const handleRequestUpdate = (recordId: string, description: string) => {
    const vaga = vagas.find((v) => v.id === recordId);
    if (vaga) {
      updateVaga(recordId, {
        historico: [
          ...(vaga.historico || []),
          {
            id: `h-req-${Date.now()}`,
            data: new Date().toISOString().split("T")[0],
            descricao: `[SOLICITAÇÃO DE ATUALIZAÇÃO]: ${description}`,
            usuario: currentUser?.nome_completo || "Analista",
          },
        ],
      });
      toast.success("Solicitação de atualização enviada com sucesso");
    }
  };

  const allUnidades = useMemo(
    () =>
      [...new Set(vagas.map((v) => normalizeUnitName(v.unidade)))]
        .filter(Boolean)
        .sort(),
    [vagas],
  );

  // Restriction by unit — build the list of short unit names the user may see
  const visibleUnidades = useMemo(() => {
    // allUnidades contains short canonical names from UnidadesPicker (e.g. "HUGOL")
    let base: string[];
    if (currentUser?.visualiza_todas_unidades) {
      base = allUnidades;
    } else {
      const allowed = currentUser?.unidades_vinculadas || [];
      // Match using prefix so "HUGOL" matches "HUGOL - HOSPITAL ESTADUAL..."
      base = allUnidades.filter(
        (u) =>
          unitIsAllowed(u, allowed) ||
          allowed.some((a) => unitIsAllowed(a, [u])),
      );
    }

    if (selectedRegion !== "all") {
      const regionUnits = (UNIDADES_POR_REGIAO[selectedRegion] || []).map(
        normalizeUnitName,
      );
      base = base.filter((u) => regionUnits.includes(normalizeUnitName(u)));
    }

    return base;
  }, [currentUser, allUnidades, selectedRegion]);

  const unidades = useMemo(() => {
    return allUnidades.filter((u) => visibleUnidades.includes(u)).sort();
  }, [allUnidades, visibleUnidades]);

  const analistas = useMemo(
    () =>
      [...new Set(vagas.map((v) => v.analista_responsavel))]
        .filter(Boolean)
        .sort(),
    [vagas],
  );
  const assistentes = useMemo(
    () =>
      [...new Set(vagas.flatMap((v) => v.assistentes || []))]
        .filter(Boolean)
        .sort(),
    [vagas],
  );

  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.nome_completo && u.avatar_url) map.set(u.nome_completo, u.avatar_url);
    });
    return map;
  }, [users]);

  /**
   * Dynamically resolves analyst for every unique unidade in vagas.
   * Uses profiles.unidades_responsavel as the source of truth, so new
   * vacancies inserted by the cronjob are automatically covered.
   */
  const unitToAnalistaMap = useMemo(() => {
    const map = new Map<string, string>(); // unidade → nome_completo
    const analysts = (users || []).filter(
      (u: any) => Array.isArray(u.unidades_responsavel) && u.unidades_responsavel.length > 0,
    );
    if (!analysts.length) return map;

    const unidades = [...new Set(vagas.map((v) => v.unidade).filter(Boolean))] as string[];
    for (const unidade of unidades) {
      // 1. Standard prefix + TEIA alias match (handles most units)
      let match = analysts.find((u: any) => unitIsAllowed(unidade, u.unidades_responsavel));
      // 2. Fallback: normalised includes check (handles HRD→CHRD, JATAÍ→HEJ, etc.)
      if (!match) {
        const normUnidade = normalizeUnitName(unidade);
        match = analysts.find((u: any) =>
          u.unidades_responsavel.some((s: string) => normUnidade.includes(normalizeUnitName(s))),
        );
      }
      if (match) map.set(unidade, match.nome_completo);
    }
    return map;
  }, [users, vagas]);

  const vagasComBancoMap = useMemo(() => {
    if (!bancos.length || !vagas.length)
      return new Map<string, BancoTalentos>();

    const bancosById = new Map<string, BancoTalentos>();
    const bancosByProcesso = new Map<string, BancoTalentos[]>();
    const bancosByEdital = new Map<string, BancoTalentos[]>();
    const bancosByCargo = new Map<string, BancoTalentos[]>();

    bancos.forEach((banco) => {
      if (banco.id) bancosById.set(banco.id, banco);

      getLookupKeys(
        banco.numero_processo || banco.numero_processo_seletivo,
      ).forEach((key) => pushLookup(bancosByProcesso, key, banco));
      getLookupKeys(banco.numero_edital).forEach((key) =>
        pushLookup(bancosByEdital, key, banco),
      );

      const cargoKey = normalizeCargo(
        banco.cargo || banco.cargo_normalizado || "",
      );
      if (cargoKey) pushLookup(bancosByCargo, cargoKey, banco);
    });

    const matched = new Map<string, BancoTalentos>();

    vagas.forEach((vaga) => {
      let bancoMatch: BancoTalentos | undefined;

      if (vaga.banco_id) {
        bancoMatch = bancosById.get(vaga.banco_id);
      }

      if (!bancoMatch) {
        const processCandidates = [
          ...getLookupKeys(vaga.numero_processo),
          ...getLookupKeys(vaga.requisicao),
          ...getLookupKeys(vaga.numero_requisicao),
        ].flatMap(
          (key) => bancosByProcesso.get(key) || bancosByEdital.get(key) || [],
        );

        bancoMatch = processCandidates.find((banco) =>
          unitsShareBankScope(vaga.unidade, banco.unidade),
        );
      }

      if (!bancoMatch) {
        const editalCandidates = getLookupKeys(vaga.numero_edital).flatMap(
          (key) => bancosByEdital.get(key) || bancosByProcesso.get(key) || [],
        );
        bancoMatch = editalCandidates.find((banco) =>
          unitsShareBankScope(vaga.unidade, banco.unidade),
        );
      }

      if (!bancoMatch) {
        const cargoKey = normalizeCargo(vaga.cargo || "");
        const cargoCandidates = cargoKey
          ? bancosByCargo.get(cargoKey) || []
          : [];
        bancoMatch = cargoCandidates.find((banco) =>
          unitsShareBankScope(vaga.unidade, banco.unidade),
        );
      }

      if (bancoMatch) {
        matched.set(vaga.id, bancoMatch);
      }
    });

    return matched;
  }, [vagas, bancos]);

  const vagasComBancoSet = useMemo(
    () => new Set(vagasComBancoMap.keys()),
    [vagasComBancoMap],
  );

  // Candidate count per vaga using the unidade-scoped bank rules
  const vagasPossibleCandidatesMap = useMemo(() => {
    if (!bancos.length || !vagas.length) return new Map<string, number>();

    const byCity = (city: string) => bancos.filter((b) => (b.unidade || "") === city);
    const pools = {
      goiania:     byCity("Goiânia - GO"),
      dourados:    byCity("Dourados - MS"),
      manaus:      byCity("Manaus - AM"),
      caceres:     byCity("Cáceres - MT"),
      jatai:       byCity("Jataí - GO"),
      cidadeGoias: byCity("Cidade de Goiás - GO"),
      teia:        bancos.filter((b) => !!(b as any).is_teia),
      all:         bancos,
    };

    const result = new Map<string, number>();

    vagas.forEach((vaga) => {
      const u = (vaga.unidade || "").trim().toUpperCase();
      const isTeia = vaga.is_teia || u.includes("TEIA");

      let pool: BancoTalentos[];
      if (isTeia)                                                pool = pools.teia;
      else if (u.startsWith("HEJ") || u.startsWith("AGIR RIO VERDE")) pool = pools.jatai;
      else if (u.startsWith("HUGOL") || u.startsWith("HECAD") ||
               u.startsWith("CRER")  || u.startsWith("AGIR")  ||
               u.startsWith("HDS"))                             pool = pools.goiania;
      else if (u.startsWith("CHRD"))                            pool = pools.dourados;
      else if (u.startsWith("CHS"))                             pool = pools.manaus;
      else if (u.startsWith("HRC"))                             pool = pools.caceres;
      else if (u.startsWith("POL GOIAS") ||
               u.startsWith("UPA SAO PEDRO") ||
               u.startsWith("UPA PRAIA DO SUA"))                pool = pools.cidadeGoias;
      else                                                       pool = pools.all;

      const count = pool.filter(
        (b) => calcSimilarity(vaga.cargo, (b as any).cargo || "") > 0,
      ).length;
      if (count > 0) result.set(vaga.id, count);
    });

    return result;
  }, [vagas, bancos]);

  // 1. Canonical base for all metrics - exactly matching Excel parity
  const canonicalBase = useMemo(() => {
    // 1. Filtragem por Região e Unidade Global (Sidebar)
    let baseRecords = filterByRegionAndUnit(vagas, selectedRegion, globalUnit);

    // 1b. Filtragem por unidades vinculadas ao usuário
    // Users with visualiza_todas_unidades = true bypass this filter.
    // The check uses prefix matching so that short names stored in
    // unidades_vinculadas ("HUGOL") correctly match full names stored in
    // vagas.unidade ("HUGOL - HOSPITAL ESTADUAL DE URGENCIAS...").
    if (!currentUser?.visualiza_todas_unidades) {
      const allowedUnits = currentUser?.unidades_vinculadas || [];
      if (allowedUnits.length > 0) {
        baseRecords = baseRecords.filter((v) =>
          unitIsAllowed(v.unidade, allowedUnits),
        );
      }
    }

    // 2. Filtro TEIAs / PCD
    if (filterTeia) {
      baseRecords = baseRecords.filter(
        (v) => v.is_teia === true || (v.unidade || "").toUpperCase().includes("TEIA"),
      );
    }
    if (filterPcd) {
      baseRecords = baseRecords.filter(
        (v) => v.is_pcd === true || (v.cargo || "").toUpperCase().includes("PCD"),
      );
    }

    // 3. Filtragem interna da tela — aplica filtro de cargo (sem unit/month)
    let result = getValidVacancyBase(baseRecords, 'all', 'all');

    // 3a. Multi-select de unidade
    if (filterUnidades.length > 0) {
      const normSet = new Set(filterUnidades.map(normalizeUnitName));
      result = result.filter((v) => normSet.has(normalizeUnitName(v.unidade)));
    }

    // 3b. Multi-select de mês de abertura
    if (filterMeses.length > 0) {
      const monthSet = new Set(filterMeses.map((m) => m.toUpperCase().trim()));
      result = result.filter((v) => {
        const month = getMonthNamePtBrUpper(v.data_abertura);
        return monthSet.has(month);
      });
    }

    return result;
  }, [
    vagas,
    selectedRegion,
    globalUnit,
    filterUnidades,
    filterMeses,
    filterTeia,
    filterPcd,
    currentUser?.visualiza_todas_unidades,
    currentUser?.unidades_vinculadas,
  ]);

  // 2. Table filter for UI (Search, Status, etc. applied ON TOP of canonical base)
  const filtered = useMemo(() => {
    const nowTime = new Date().getTime();
    return canonicalBase.filter((v) => {
      const category = v.categoria_status || getCategoriaStatus(v);

      const searchTerm = search.toLowerCase();
      const matchSearch =
        !search ||
        (v.cargo || "").toLowerCase().includes(searchTerm) ||
        (v.requisicao || v.numero_requisicao || "")
          .toLowerCase()
          .includes(searchTerm) ||
        (v.unidade || "").toLowerCase().includes(searchTerm) ||
        (v.analista_responsavel || "").toLowerCase().includes(searchTerm) ||
        (v.nome_requisitante || "").toLowerCase().includes(searchTerm) ||
        (v.motivo || "").toLowerCase().includes(searchTerm);

      const fluxoItems = getVagaFluxoItems(v);
      // Use the same status the table displays (slot 0 overrides v.status_processo
      // when distribuicao_vagas has a stored entry for slot 1).
      const displayedStatus =
        fluxoItems[0]?.status_processo ?? v.status_processo ?? "Solicitada";
      const matchStatus =
        filterStatusProcesso.length === 0 ||
        filterStatusProcesso.includes(displayedStatus);
      const matchTratativa =
        filterTratativas.length === 0 ||
        fluxoItems.some((item) => filterTratativas.includes(item.tratativa as string));
      const matchEtapa =
        filterEtapa === "all" ||
        fluxoItems.some((item) => item.etapa === filterEtapa);
      const matchAnalista =
        filterAnalista === "all" || v.analista_responsavel === filterAnalista;
      const matchAssistente =
        filterAssistente === "all" ||
        (v.assistentes || []).includes(filterAssistente);
      const matchLideranca =
        filterLideranca === "all" ||
        (filterLideranca === "yes"
          ? v.tipo_vaga === "lideranca"
          : v.tipo_vaga !== "lideranca");

      const creationDate = v.created_at || v.data_criacao;
      const creationTime = creationDate ? new Date(creationDate).getTime() : 0;
      const isNew = creationTime > 0 && nowTime - creationTime <= 86400000;
      const matchVagasNovas = !filterVagasNovas || isNew;

      const matchComBanco = !filterComBanco || vagasComBancoSet.has(v.id);

      const isStuck =
        (!v.status ||
          v.status === "SEM STATUS" ||
          !v.status_geral ||
          v.status_geral === "SEM STATUS") &&
        (!v.historico || v.historico.length === 0) &&
        creationTime > nowTime - 30 * 86400000; // Consider "recent" as 30 days
      const matchSemMovimentacao = !filterSemMovimentacao || isStuck;

      return (
        matchSearch &&
        matchStatus &&
        matchTratativa &&
        matchEtapa &&
        matchAnalista &&
        matchAssistente &&
        matchLideranca &&
        matchVagasNovas &&
        matchComBanco &&
        matchSemMovimentacao
      );
    });
  }, [
    canonicalBase,
    search,
    filterStatusProcesso,
    filterTratativas,
    filterEtapa,
    filterAnalista,
    filterAssistente,
    filterLideranca,
    filterVagasNovas,
    filterComBanco,
    filterSemMovimentacao,
    vagasComBancoSet,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    filterUnidades,
    filterMeses,
    filterStatusProcesso,
    filterTratativas,
    filterEtapa,
    filterAnalista,
    filterAssistente,
    filterLideranca,
    filterVagasNovas,
    filterComBanco,
    filterSemMovimentacao,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      concluidas: 0,
      vagas_interrompidas: 0,
      vagas_lideranca: 0,
      convocacao: 0,
      aguardando_unidade: 0,
      documentacao: 0,
      em_admissao: 0,
      movimentacao_interna: 0,
      com_banco_valido: 0,
      vagas_novas: 0,
      sem_movimentacao: 0,
    };

    const nowTime = new Date().getTime();

    canonicalBase.forEach((v) => {
      const cat = v.categoria_status || getCategoriaStatus(v);

      const creationDate = v.created_at || v.data_criacao;
      const creationTime = creationDate ? new Date(creationDate).getTime() : 0;

      if (creationTime > 0 && nowTime - creationTime <= 86400000) {
        acc.vagas_novas++;
      }

      // Sem Movimentação logic
      if (
        (!v.status ||
          v.status === "SEM STATUS" ||
          !v.status_geral ||
          v.status_geral === "SEM STATUS") &&
        (!v.historico || v.historico.length === 0) &&
        creationTime > nowTime - 30 * 86400000
      ) {
        acc.sem_movimentacao++;
      }

      // Correção do mapeamento de categorias para os cards
      if (cat === "suspensa" || cat === "cancelada") {
        acc.vagas_interrompidas++;
      } else if (cat === "convocacoes" || cat === "convocacao") {
        acc.convocacao++;
      } else if (acc[cat as keyof typeof acc] !== undefined) {
        (acc as any)[cat]++;
      } else {
        acc.em_andamento++;
      }

      // Verificação via set pré-computado
      if (vagasComBancoSet.has(v.id)) {
        acc.com_banco_valido++;
      }
    });

    return acc;
  }, [canonicalBase, vagasComBancoSet]);

  const countComBanco = useMemo(
    () => canonicalBase.filter((vaga) => vagasComBancoSet.has(vaga.id)).length,
    [canonicalBase, vagasComBancoSet],
  );
  const countVagasNovas = counts.vagas_novas;
  const countSemMovimentacao = counts.sem_movimentacao;

  // Counts per status_processo for the scorecard row
  const statusProcessoCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const v of canonicalBase) {
      const sp = (v as any).status_processo || "Solicitada";
      acc[sp] = (acc[sp] ?? 0) + 1;
    }
    return acc;
  }, [canonicalBase]);

  const clearFilters = () => {
    setSearch("");
    setFilterUnidades([]);
    setFilterMeses([]);
    setFilterStatusProcesso([]);
    setFilterTratativas([]);
    setFilterEtapa("all");
    setFilterAnalista("all");
    setFilterAssistente("all");
    setFilterLideranca("all");
    setFilterVagasNovas(false);
    setFilterComBanco(false);
    setFilterSemMovimentacao(false);
    setFilterTeia(false);
    setFilterPcd(false);
  };

  const hasFilters =
    search ||
    filterUnidades.length > 0 ||
    filterMeses.length > 0 ||
    filterStatusProcesso.length > 0 ||
    filterTratativas.length > 0 ||
    filterEtapa !== "all" ||
    filterAnalista !== "all" ||
    filterAssistente !== "all" ||
    filterLideranca !== "all" ||
    filterVagasNovas ||
    filterComBanco ||
    filterSemMovimentacao ||
    filterTeia ||
    filterPcd;

  const prepareVagasForExport = (data: Vaga[]) => {
    return data.map((v) => ({
      Requisição: v.requisicao || v.numero_requisicao || "",
      Unidade: v.unidade || "",
      Cargo: v.cargo || "",
      Analista: v.analista_responsavel || "",
      Status: v.status || "",
      Tipo: TIPO_VAGA_LABELS[v.tipo_vaga as TipoVaga] || v.tipo_vaga,
      Recebimento: v.data_recebimento ? formatDate(v.data_recebimento) : "",
      "Dias em Aberto": calcDiasAberto(v.data_recebimento),
    }));
  };

  return (
    // ... keep existing code
    <div
      className={`space-y-4${isDark ? " gdp-dark" : ""}`}
      style={isDark ? { background: "linear-gradient(150deg, #07091d 0%, #0d1630 50%, #080c1e 100%)", minHeight: "100%", padding: "1px 0" } : undefined}
    >
      {isInitialLoad ? (
        <PageSkeleton />
      ) : currentTab === "acompanhamento" ? (
        <AcompanhamentoEditalList />
      ) : (
        <>
          <PageHeader
            title="Controle de Vagas"
            darkMode={isDark}
            actions={
              <>
                <ExportButton
                  data={prepareVagasForExport(filtered)}
                  filename="vagas_export"
                  label="Exportar Excel"
                  className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold shadow-sm h-10 px-6 transition-all rounded-xl"
                />
              </>
            }
          />

          {/* Scorecards por status_processo + atalhos de navegação */}
          <div className="mb-4 space-y-2.5">
            {/* Six scorecards: Total first, then five status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total de Vagas */}
              {(() => {
                const total = canonicalBase.length;
                const allActive = filterStatusProcesso.length === STATUS_PROCESSO_ORDER.length;
                const cardBg = isDark
                  ? (allActive ? "rgba(14,165,233,0.15)" : "rgba(11,16,34,0.82)")
                  : (allActive ? "#F0F9FF" : "#ffffff");
                const cardBorder = isDark
                  ? (allActive ? "rgba(125,211,252,0.45)" : "rgba(255,255,255,0.10)")
                  : (allActive ? "#7DD3FC" : "#e2e8f0");
                return (
                  <button
                    onClick={() =>
                      setFilterStatusProcesso(allActive ? [] : [...STATUS_PROCESSO_ORDER])
                    }
                    className="group relative text-left w-full rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      background: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      boxShadow: allActive
                        ? "0 0 0 3px rgba(125,211,252,0.25), 0 4px 12px rgba(125,211,252,0.20)"
                        : isDark ? "0 1px 4px rgba(0,0,0,0.30)" : "0 1px 4px rgba(0,0,0,0.06)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!allActive) {
                        e.currentTarget.style.boxShadow = isDark ? "0 6px 20px rgba(0,0,0,0.40)" : "0 6px 20px rgba(0,0,0,0.10)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "#7DD3FC";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!allActive) {
                        e.currentTarget.style.boxShadow = isDark ? "0 1px 4px rgba(0,0,0,0.30)" : "0 1px 4px rgba(0,0,0,0.06)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0";
                      }
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "#0EA5E9" }} />
                    <div className="pt-5 pb-4 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
                          style={isDark
                            ? { background: "rgba(14,165,233,0.15)", color: "#7DD3FC", border: "1.5px solid rgba(125,211,252,0.30)" }
                            : { background: "#F0F9FF", color: "#0369A1", border: "1.5px solid #7DD3FC" }}
                        >
                          <Sigma size={16} />
                        </div>
                        <span
                          className="text-[28px] font-black tabular-nums leading-none"
                          style={{ color: allActive ? (isDark ? "#7DD3FC" : "#0369A1") : (isDark ? "rgba(255,255,255,0.90)" : "#0f172a") }}
                        >
                          {total}
                        </span>
                      </div>
                      <p
                        className="text-[10px] font-black uppercase tracking-widest leading-tight"
                        style={{ color: allActive ? (isDark ? "#7DD3FC" : "#0369A1") : (isDark ? "rgba(255,255,255,0.38)" : "#94a3b8") }}
                      >
                        Total de Vagas
                      </p>
                    </div>
                  </button>
                );
              })()}

              {STATUS_PROCESSO_ORDER.map((status) => {
                const cfg = STATUS_CONFIG[status];
                const count = statusProcessoCounts[status] ?? 0;
                const isActive = filterStatusProcesso.includes(status);
                const Icon = cfg.Icon;
                const darkCardBg = isActive ? `${cfg.bg}22` : "rgba(11,16,34,0.82)";
                const darkCardBorder = isActive ? `${cfg.border}88` : "rgba(255,255,255,0.10)";
                return (
                  <button
                    key={status}
                    onClick={() =>
                      setFilterStatusProcesso((prev) =>
                        prev.includes(status)
                          ? prev.filter((s) => s !== status)
                          : [...prev, status],
                      )
                    }
                    className="group relative text-left w-full rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      background: isDark ? darkCardBg : (isActive ? cfg.bg : "#ffffff"),
                      border: `1.5px solid ${isDark ? darkCardBorder : (isActive ? cfg.border : "#e2e8f0")}`,
                      boxShadow: isActive
                        ? `0 0 0 3px ${cfg.shadowColor}, 0 4px 12px ${cfg.shadowColor}`
                        : isDark ? "0 1px 4px rgba(0,0,0,0.30)" : "0 1px 4px rgba(0,0,0,0.06)",
                      transition: "all 0.18s ease",
                      // @ts-ignore
                      "--focus-ring-color": cfg.border,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.boxShadow = isDark ? "0 6px 20px rgba(0,0,0,0.40)" : "0 6px 20px rgba(0,0,0,0.10)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = cfg.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.boxShadow = isDark ? "0 1px 4px rgba(0,0,0,0.30)" : "0 1px 4px rgba(0,0,0,0.06)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0";
                      }
                    }}
                  >
                    {/* Coloured top stripe */}
                    <div
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ background: cfg.dotHex }}
                    />

                    <div className="pt-5 pb-4 px-4">
                      {/* Icon + count */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
                          style={{
                            background: isDark ? `${cfg.bg}22` : cfg.bg,
                            color: cfg.text,
                            border: `1.5px solid ${isDark ? `${cfg.border}66` : cfg.border}`,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <span
                          className="text-[28px] font-black tabular-nums leading-none"
                          style={{ color: isActive ? cfg.text : (isDark ? "rgba(255,255,255,0.90)" : "#0f172a") }}
                        >
                          {count}
                        </span>
                      </div>

                      {/* Status label */}
                      <p
                        className="text-[10px] font-black uppercase tracking-widest leading-tight"
                        style={{ color: isActive ? cfg.text : (isDark ? "rgba(255,255,255,0.38)" : "#94a3b8") }}
                      >
                        {cfg.label}
                      </p>
                    </div>
                  </button>
                );
              })}

            </div>
          </div>

          <Card className="border-slate-200 shadow-sm bg-slate-50/50 rounded-xl">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-col gap-3">
                {/* Row 1 — search + dropdown filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[240px]">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cargo, requisição, unidade, requisitante ou motivo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                  </div>
                  <MultiSelectFilter
                    placeholder="Todas Unidades"
                    options={unidades.map((u) => ({ value: u }))}
                    selected={filterUnidades}
                    onChange={setFilterUnidades}
                    width="w-[180px]"
                  />
                  <MultiSelectFilter
                    placeholder="Todos os Status"
                    options={[
                      "Solicitada",
                      "Em Andamento",
                      "Cancelada",
                      "Suspensa",
                      "Concluída",
                    ].map((s) => ({ value: s }))}
                    selected={filterStatusProcesso}
                    onChange={setFilterStatusProcesso}
                    width="w-[160px]"
                  />
                  <MultiSelectFilter
                    placeholder="Todas as Tratativas"
                    options={TRATATIVAS_FILTER.map((t) => ({ value: t }))}
                    selected={filterTratativas}
                    onChange={(next) => {
                      setFilterTratativas(next);
                      setFilterEtapa("all");
                    }}
                    width="w-[200px]"
                  />
                  <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                    <SelectTrigger
                      className={`w-[190px] bg-white text-xs h-9 ${filterTratativas.length > 0 ? "" : "opacity-60"}`}
                    >
                      <SelectValue placeholder="Etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="all"
                        className="text-xs font-medium text-slate-500"
                      >
                        Todas as Etapas
                      </SelectItem>
                      {(filterTratativas.length > 0
                        ? [
                            ...new Set(
                              filterTratativas.flatMap(
                                (t) =>
                                  ETAPAS_POR_TRATATIVA_FILTER[t] ?? [],
                              ),
                            ),
                          ]
                        : ALL_ETAPAS_FILTER
                      ).map((e) => (
                        <SelectItem key={e} value={e} className="text-xs">
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <MultiSelectFilter
                    placeholder="Todos os Meses"
                    options={[
                      "JANEIRO",
                      "FEVEREIRO",
                      "MARÇO",
                      "ABRIL",
                      "MAIO",
                      "JUNHO",
                      "JULHO",
                      "AGOSTO",
                      "SETEMBRO",
                      "OUTUBRO",
                      "NOVEMBRO",
                      "DEZEMBRO",
                    ].map((m) => ({ value: m }))}
                    selected={filterMeses}
                    onChange={setFilterMeses}
                    width="w-[160px]"
                    icon={<Calendar className="h-3 w-3 text-slate-400 shrink-0" />}
                  />
                </div>

                {/* Row 2 — quick-access toggles, always on their own line */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant={filterTeia ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-[11px] font-bold gap-2 ${filterTeia ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white"}`}
                    onClick={() => setFilterTeia(!filterTeia)}
                  >
                    <Puzzle className={`h-3.5 w-3.5 ${filterTeia ? "text-white" : ""}`} />
                    TEIAs
                  </Button>
                  <Button
                    variant={filterPcd ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-[11px] font-bold gap-2 ${filterPcd ? "bg-blue-600 hover:bg-blue-700" : "border-blue-300 text-blue-700 hover:bg-blue-50 bg-white"}`}
                    onClick={() => setFilterPcd(!filterPcd)}
                  >
                    <Accessibility className={`h-3.5 w-3.5 ${filterPcd ? "text-white" : ""}`} />
                    PCD
                  </Button>
                  <Button
                    variant={filterVagasNovas ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-[11px] font-bold gap-2 ${filterVagasNovas ? "bg-blue-600" : "border-slate-200 text-slate-600 bg-white"}`}
                    onClick={() => setFilterVagasNovas(!filterVagasNovas)}
                  >
                    <Sparkles
                      className={`h-3.5 w-3.5 ${filterVagasNovas ? "text-white" : "text-blue-500"}`}
                    />
                    Vagas Novas (24h){" "}
                    {countVagasNovas > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-4 px-1 text-[9px] bg-blue-100 text-blue-700 border-none"
                      >
                        {countVagasNovas}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant={filterComBanco ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-[11px] font-bold gap-2 ${filterComBanco ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-200 text-slate-600 bg-white"}`}
                    onClick={() => setFilterComBanco(!filterComBanco)}
                  >
                    <Database
                      className={`h-3.5 w-3.5 ${filterComBanco ? "text-white" : "text-emerald-500"}`}
                    />
                    Com Banco{" "}
                    {countComBanco > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-4 px-1 text-[9px] bg-emerald-100 text-emerald-700 border-none"
                      >
                        {countComBanco}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant={filterSemMovimentacao ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-[11px] font-bold gap-2 ${filterSemMovimentacao ? "bg-orange-600 hover:bg-orange-700" : "border-slate-200 text-slate-600 bg-white"}`}
                    onClick={() =>
                      setFilterSemMovimentacao(!filterSemMovimentacao)
                    }
                  >
                    <AlertCircle
                      className={`h-3.5 w-3.5 ${filterSemMovimentacao ? "text-white" : "text-orange-500"}`}
                    />
                    Sem Movimentação{" "}
                    {countSemMovimentacao > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-4 px-1 text-[9px] bg-orange-100 text-orange-700 border-none"
                      >
                        {countSemMovimentacao}
                      </Badge>
                    )}
                  </Button>

                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <X className="h-4 w-4 mr-1" /> Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Top synchronized scrollbar — dark, part of the header visual */}
              <div
                ref={topScrollRef}
                className="table-scroll-top overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#221f44",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.3) #2c2960",
                }}
              >
                <div style={{ width: tableScrollWidth, height: "1px" }} />
              </div>

              {/* Table — raw <table> so tableScrollRef owns the overflow correctly */}
              <div
                ref={tableScrollRef}
                className="table-hide-scrollbar overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <table className="w-full caption-bottom text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">
                        <span className="block leading-tight">Abertura</span>
                        <span className="block leading-tight">Recebimento</span>
                      </TableHead>
                      <TableHead className="min-w-[80px]">Requisição</TableHead>
                      <TableHead className="min-w-[200px]">
                        <span className="block leading-tight">Cargo</span>
                        <span className="block leading-tight">Motivo</span>
                      </TableHead>
                      <TableHead className="min-w-[130px]">
                        <span className="block leading-tight">Unidade</span>
                        <span className="block leading-tight">Seção</span>
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        <span className="block leading-tight">
                          Requisitante
                        </span>
                      </TableHead>
                      <TableHead className="min-w-[160px]">
                        Status Processo
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        Analista Resp.
                      </TableHead>
                      <TableHead className="min-w-[56px] text-center">
                        Vaga(s)
                      </TableHead>
                      <TableHead className="min-w-[56px] text-center">
                        Banco
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((v) => {
                      const categoria =
                        v.categoria_status || getCategoriaStatus(v);
                      const bancoFound = vagasComBancoMap.get(v.id);
                      const possibleCount = vagasPossibleCandidatesMap.get(v.id) ?? 0;
                      const isConsultaOnly = [
                        "concluidas",
                        "cancelada",
                        "suspensa",
                      ].includes(categoria);
                      const canSendToEdital = [
                        "sem_status",
                        "aguardando_unidade",
                        "em_andamento",
                      ].includes(categoria);
                      // Allow calling in initial stages, edital stages, or when specifically in "convocação"
                      // but hide if already in documentation, admission or finished
                      const canCall = [
                        "sem_status",
                        "aguardando_unidade",
                        "fila_edital",
                        "convocacoes",
                        "em_andamento",
                      ].includes(categoria);

                      return (
                        <>
                          <TableRow
                            key={v.id}
                            className="cursor-pointer hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors border-b border-slate-100 group"
                            onClick={() => navigate(`/vagas/${v.id}`)}
                          >
                            <TableCell className="py-3 px-2 h-14">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-slate-600 text-[11px] font-medium leading-tight">
                                  {v.data_abertura
                                    ? formatDate(v.data_abertura)
                                    : "-"}
                                </span>
                                <span className="text-slate-600 text-[11px] font-medium leading-tight">
                                  {v.data_recebimento
                                    ? formatDate(v.data_recebimento)
                                    : "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-2 h-14">
                              <div className="flex flex-col gap-0.5">
                                <div className="font-mono text-[11px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block w-fit">
                                  {v.requisicao || v.numero_requisicao || "-"}
                                </div>
                                {v.source_row_index && (
                                  <span className="text-[9px] text-slate-400 ml-1">
                                    Linha {v.source_row_index}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 h-14">
                              <div className="flex flex-col gap-0.5">
                                <div
                                  className="font-semibold text-slate-800 whitespace-normal break-words leading-tight max-w-[200px] flex items-center flex-wrap gap-2"
                                  title={v.cargo}
                                >
                                  {v.cargo}
                                  {(() => {
                                    const cd = v.created_at || v.data_criacao;
                                    return cd && new Date().getTime() - new Date(cd).getTime() <= 86400000;
                                  })() && (
                                      <Badge
                                        variant="outline"
                                        className="h-4 text-[8px] px-1 bg-blue-50 text-blue-600 border-blue-200 animate-pulse font-bold uppercase"
                                      >
                                        <Sparkles className="h-2 w-2 mr-0.5" />{" "}
                                        Nova Vaga
                                      </Badge>
                                    )}
                                </div>
                                {v.motivo && (
                                  <span
                                    className="text-[10px] text-slate-400 leading-tight whitespace-normal break-words max-w-[200px]"
                                    title={v.motivo}
                                  >
                                    {v.motivo}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 h-14 max-w-[150px]">
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className="font-semibold text-slate-800 text-[11px] whitespace-normal break-words leading-tight"
                                  title={v.unidade}
                                >
                                  {v.unidade
                                    ? v.unidade.includes(" - ")
                                      ? v.unidade.substring(0, v.unidade.indexOf(" - "))
                                      : v.unidade
                                    : "-"}
                                </span>
                                {v.unidade_trabalho &&
                                  v.unidade_trabalho !== v.unidade && (
                                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100 w-fit">
                                      TRABALHANDO: {v.unidade_trabalho}
                                    </span>
                                  )}
                                {v.secao && (
                                  <span
                                    className="text-[10px] text-slate-400 leading-tight whitespace-normal break-words"
                                    title={v.secao}
                                  >
                                    {v.secao.includes(" - ")
                                      ? v.secao.substring(0, v.secao.lastIndexOf(" - "))
                                      : v.secao}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className="py-3 px-4 h-14 max-w-[150px]"
                              title={v.nome_requisitante}
                            >
                              <div className="flex flex-col gap-0.5">
                                {v.nome_requisitante ? (
                                  <span className="text-[11px] text-slate-600 font-medium whitespace-normal break-words leading-tight block">
                                    {v.nome_requisitante}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-300">
                                    —
                                  </span>
                                )}
                                {v.cargo_requisitante && (
                                  <span
                                    className="text-[10px] text-slate-400 leading-tight whitespace-normal break-words"
                                    title={v.cargo_requisitante}
                                  >
                                    {v.cargo_requisitante}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-3 h-14">
                              {(() => {
                                const slot0 = getVagaFluxoItems(v)[0];
                                return (
                                  <StatusProcessoBadge
                                    status={slot0?.status_processo ?? v.status_processo}
                                    tratativa={slot0?.tratativa ?? v.tratativa}
                                    etapa={slot0?.etapa ?? v.etapa}
                                  />
                                );
                              })()}
                            </TableCell>
                            <TableCell className="py-3 px-3 h-14">
                              {(() => {
                                const analista =
                                  unitToAnalistaMap.get(v.unidade || "") ||
                                  v.analista_responsavel ||
                                  null;
                                if (!analista) return <span className="text-[11px] text-slate-300 italic">—</span>;
                                const avatarUrl = userAvatarMap.get(analista);
                                const firstName = analista.split(" ")[0];
                                const initials = analista
                                  .split(" ").filter(Boolean).slice(0, 2)
                                  .map((n: string) => n[0].toUpperCase()).join("");
                                return (
                                  <div className="flex items-center gap-2" title={analista}>
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={analista}
                                        className="w-7 h-7 rounded-full object-cover ring-2 ring-violet-200 shrink-0 shadow-sm"
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 ring-2 ring-violet-200 flex items-center justify-center shrink-0 shadow-sm">
                                        <span className="text-[10px] font-black text-white">{initials}</span>
                                      </div>
                                    )}
                                    <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                                      {firstName}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell
                              className="text-center py-3 px-2 h-14"
                              onClick={(e) => {
                                const count =
                                  Number(v.numero_vagas || v.quantidade) || 0;
                                if (count <= 1) return;
                                e.stopPropagation();
                                setExpandedRows((prev) => {
                                  const next = new Set(prev);
                                  next.has(v.id)
                                    ? next.delete(v.id)
                                    : next.add(v.id);
                                  return next;
                                });
                              }}
                            >
                              {(() => {
                                const count =
                                  Number(v.numero_vagas || v.quantidade) || 0;
                                const isExpanded = expandedRows.has(v.id);
                                if (count <= 1) {
                                  return (
                                    <span className="font-bold text-slate-700 text-sm">
                                      {count}
                                    </span>
                                  );
                                }
                                return (
                                  <button className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary/80 transition-colors group">
                                    <span className="text-sm">{count}</span>
                                    <span
                                      className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                  </button>
                                );
                              })()}
                            </TableCell>
                            <TableCell
                              className="text-center py-3 px-2 h-14"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {bancoFound ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                  title="Realizar Convocação"
                                  onClick={() =>
                                    navigate(
                                      `/convocacoes?open=true&vagaId=${v.id}`,
                                    )
                                  }
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </Button>
                              ) : possibleCount > 0 ? (
                                <div className="relative inline-flex items-center justify-center group">
                                  {/* Sonar ring — slow expand, border-only so it looks like a wavefront */}
                                  <span
                                    className="absolute inline-flex h-9 w-9 rounded-full border border-teal-400/40 animate-ping"
                                    style={{ animationDuration: "2.4s" }}
                                  />
                                  {/* Inner static glow */}
                                  <span className="absolute inline-flex h-6 w-6 rounded-full bg-teal-400/10" />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative h-8 w-8 rounded-full text-teal-500 hover:text-teal-600 hover:bg-teal-50/80 transition-all duration-300 hover:scale-110 active:scale-95"
                                    title={`${possibleCount} candidato${possibleCount !== 1 ? "s" : ""} com perfil similar no Banco de Talentos`}
                                    onClick={() => navigate(`/vagas/${v.id}?tab=banco`)}
                                  >
                                    <Radar className="h-4 w-4" />
                                  </Button>
                                  {/* Count badge */}
                                  <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-teal-500 px-1 text-[9px] font-black text-white shadow-sm ring-1 ring-white">
                                    {possibleCount > 99 ? "99+" : possibleCount}
                                  </span>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-300 hover:bg-slate-50"
                                  title="Nenhum candidato encontrado no Banco de Talentos"
                                  onClick={() =>
                                    toast.error(
                                      `Nenhum candidato encontrado no Banco de Talentos para ${v.cargo}, unidade ${v.unidade}`,
                                    )
                                  }
                                >
                                  <Radar className="h-4 w-4 opacity-30" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* ── Sub-rows for multi-vaga requisições ── */}
                          {expandedRows.has(v.id) &&
                            getVagaFluxoItems(v).map((item) => {
                              const iSP = item.status_processo || "Solicitada";
                              return (
                                <TableRow
                                  key={`${v.id}-slot-${item.slot}`}
                                  className="cursor-pointer bg-slate-50/70 hover:bg-primary/5 border-b border-dashed border-slate-200 transition-colors"
                                  onClick={() =>
                                    navigate(`/vagas/${v.id}?slot=${item.slot}`)
                                  }
                                >
                                  {/* indent: tree line + label spanning first 3 cols */}
                                  <TableCell
                                    colSpan={3}
                                    className="py-2 px-2 pl-8"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-px h-6 bg-slate-300 ml-2 shrink-0" />
                                      <div className="w-4 h-px bg-slate-300 shrink-0" />
                                      <span className="text-[11px] font-bold text-primary/80">
                                        Vaga {item.slot}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 px-4 text-[11px] text-slate-400">
                                    —
                                  </TableCell>
                                  <TableCell className="py-2 px-4 text-[11px] text-slate-400">
                                    —
                                  </TableCell>
                                  {/* status + tratativa + etapa */}
                                  <TableCell className="py-2 px-3">
                                    <StatusProcessoBadge
                                      status={iSP}
                                      tratativa={item.tratativa}
                                      etapa={item.etapa}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 px-3" />
                                  <TableCell className="py-2 px-2" />
                                  <TableCell className="py-2 px-2" />
                                  <TableCell className="py-2 px-4 text-right">
                                    <button
                                      className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 ml-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/vagas/${v.id}?slot=${item.slot}`,
                                        );
                                      }}
                                    >
                                      Ver <ChevronRight className="h-3 w-3" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="px-6 py-20 text-center text-muted-foreground font-medium"
                        >
                          Nenhuma vaga encontrada para os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </table>
              </div>

              {/* Bottom synchronized scrollbar — light, part of the footer visual */}
              <div
                ref={bottomScrollRef}
                className="table-scroll-bottom overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "#e8edf4",
                  borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#dde3ec"}`,
                  scrollbarWidth: "thin",
                  scrollbarColor: isDark ? "rgba(255,255,255,0.20) rgba(255,255,255,0.04)" : "#94a3b8 #e8edf4",
                }}
              >
                <div style={{ width: tableScrollWidth, height: "1px" }} />
              </div>
              <div className="px-6 py-4 border-t text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span>
                    Exibindo {paginatedData.length} de {filtered.length}{" "}
                    filtrados
                  </span>
                  <span className="text-[10px] opacity-70">
                    (Total no sistema: {vagas.length})
                  </span>
                </div>

                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={currentPage === page}
                                onClick={() => setCurrentPage(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <PaginationEllipsis key={page} />;
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}

                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>{" "}
                    Banco Válido
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>{" "}
                    Sem Banco
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <VagaHistoryDialog
            vaga={selectedVagaForHistory}
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
          />

          <RequestUpdateDialog
            isOpen={isRequestUpdateOpen}
            onClose={() => {
              setIsRequestUpdateOpen(false);
              setVagaForUpdate(null);
            }}
            recordId={vagaForUpdate?.id || ""}
            recordTitle={vagaForUpdate?.cargo || ""}
            type="vaga"
            onConfirm={handleRequestUpdate}
          />

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Excluir requisição?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. O registro será removido
                  permanentemente do sistema e esta ação será auditada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setVagaParaExcluir(null)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

function AcompanhamentoEditalList() {
  const { vagas, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  const navigate = useNavigate();
  const [selectedVagaForAcompanhamento, setSelectedVagaForAcompanhamento] =
    useState<Vaga | null>(null);
  const [filterUnidade, setFilterUnidade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSaveAcompanhamento = (vagaId: string, data: any) => {
    const vaga = vagas.find((v) => v.id === vagaId);
    if (vaga) {
      updateVaga(vagaId, {
        acompanhamento: data,
        total_inscritos: data.total_inscritos,
        aprovados_triagem: data.aprovados_triagem,
        convocados_entrevista: data.convocados_entrevista,
        aprovados_finais: data.aprovados_finais,
      });
      toast.success("Acompanhamento atualizado com sucesso");
    }
  };

  const handleUpdateSituacao = (vagaId: string, situacao: any) => {
    const vaga = vagas.find((v) => v.id === vagaId);
    if (vaga) {
      const updatedAcompanhamento = {
        ...(vaga.acompanhamento || { etapa_atual: "" }),
        situacao_etapa: situacao,
      };
      updateVaga(vagaId, { acompanhamento: updatedAcompanhamento });
      toast.success("Situação atualizada com sucesso");
    }
  };

  const canFilterByUnit = useMemo(() => {
    return (
      currentUser?.perfil === "Admin" ||
      currentUser?.perfil === "Gestão" ||
      currentUser?.perfil === "Analista do edital" ||
      currentUser?.visualiza_todas_unidades
    );
  }, [currentUser]);

  const allUnidades = useMemo(() => {
    const relevantVagas = vagas.filter((v) => {
      const cat = getCategoriaStatus(v);
      return [
        "em_andamento",
        "fila_edital",
        "convocacao",
        "documentacao",
      ].includes(cat);
    });

    let units = [
      ...new Set(relevantVagas.map((v) => normalizeUnitName(v.unidade))),
    ]
      .filter(Boolean)
      .sort();

    if (!currentUser?.visualiza_todas_unidades) {
      const allowedUnits = currentUser?.unidades_vinculadas || [];
      units = units.filter((u) => unitIsAllowed(u, allowedUnits));
    }

    return units;
  }, [vagas, currentUser]);

  const editaisEmAndamento = useMemo(() => {
    return vagas.filter((v) => {
      const cat = v.categoria_status || getCategoriaStatus(v);
      const isAcompanhamento = [
        "em_andamento",
        "fila_edital",
        "convocacao",
        "documentacao",
      ].includes(cat);
      if (!isAcompanhamento) return false;

      if (!currentUser?.visualiza_todas_unidades) {
        const allowedUnits = currentUser?.unidades_vinculadas || [];
        if (!unitIsAllowed(v.unidade, allowedUnits)) {
          return false;
        }
      }

      if (
        filterUnidade !== "all" &&
        normalizeUnitName(v.unidade) !== normalizeUnitName(filterUnidade)
      ) {
        return false;
      }

      if (filterStatus !== "all") {
        const situacao = v.acompanhamento?.situacao_etapa || "em_andamento";
        if (situacao !== filterStatus) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCargo = (v.cargo || "").toLowerCase().includes(term);
        const matchEdital = (v.numero_edital || "")
          .toLowerCase()
          .includes(term);
        const matchRequisicao = (v.requisicao || v.numero_requisicao || "")
          .toLowerCase()
          .includes(term);

        if (!matchCargo && !matchEdital && !matchRequisicao) return false;
      }

      return true;
    });
  }, [vagas, currentUser, filterUnidade, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Acompanhamento do Edital"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Busca por Texto */}
          <div className="relative group w-full md:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por cargo ou edital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center gap-2 bg-white p-2 h-10 rounded-xl shadow-sm border border-slate-200">
            <ListFilter className="h-4 w-4 text-slate-400 ml-2" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 font-bold text-slate-600 h-8">
                <SelectValue placeholder="Status/Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">
                  Todos os Status
                </SelectItem>
                <SelectItem value="em_andamento" className="font-medium">
                  Em andamento
                </SelectItem>
                <SelectItem value="pendente" className="font-medium">
                  Pendente
                </SelectItem>
                <SelectItem value="concluido" className="font-medium">
                  Concluído
                </SelectItem>
                <SelectItem value="atrasada" className="font-medium">
                  Atrasado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canFilterByUnit && (
            <div className="flex items-center gap-2 bg-white p-2 h-10 rounded-xl shadow-sm border border-slate-200">
              <Building2 className="h-4 w-4 text-slate-400 ml-2" />
              <Select value={filterUnidade} onValueChange={setFilterUnidade}>
                <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0 font-bold text-slate-600 h-8">
                  <SelectValue placeholder="Filtrar por Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold">
                    Todas as Unidades
                  </SelectItem>
                  {allUnidades.map((u) => (
                    <SelectItem key={u} value={u} className="font-medium">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Nº Edital</TableHead>
                  <TableHead>Etapa Atual</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Triagem</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Entrevista</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead className="text-right">Ação Rápida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editaisEmAndamento.map((v) => {
                  const autoEtapa = getAutoEtapa(v);
                  const displayEtapa =
                    v.acompanhamento?.etapa_atual || autoEtapa;
                  const isSync = v.acompanhamento?.etapa_atual === autoEtapa;

                  return (
                    <TableRow
                      key={v.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700 whitespace-nowrap">
                        {v.unidade}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{v.cargo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {v.requisicao || v.numero_requisicao}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-primary whitespace-nowrap">
                        {v.numero_edital || "—"}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedVagaForAcompanhamento(v)}
                        >
                          <Badge
                            className={`${getEtapaColor(displayEtapa as EtapaEdital)} font-bold text-[11px] uppercase py-0.5 px-2 w-fit`}
                          >
                            {ETAPA_LABELS[displayEtapa as EtapaEdital] ||
                              displayEtapa}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-[11px] font-bold uppercase border-2 ${
                                v.acompanhamento?.situacao_etapa === "atrasada"
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : v.acompanhamento?.situacao_etapa ===
                                      "concluido"
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : v.acompanhamento?.situacao_etapa ===
                                          "em_andamento" ||
                                        !v.acompanhamento?.situacao_etapa
                                      ? "bg-blue-50 text-blue-700 border-blue-100"
                                      : "bg-amber-50 text-amber-700 border-amber-100"
                              }`}
                            >
                              {v.acompanhamento?.situacao_etapa
                                ? v.acompanhamento.situacao_etapa.replace(
                                    "_",
                                    " ",
                                  )
                                : "EM ANDAMENTO"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="center"
                            className="min-w-[120px]"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateSituacao(v.id, "em_andamento")
                              }
                              className="text-[11px] font-bold text-blue-600"
                            >
                              EM ANDAMENTO
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateSituacao(v.id, "pendente")
                              }
                              className="text-[11px] font-bold text-amber-600"
                            >
                              PENDENTE
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateSituacao(v.id, "em_andamento")
                              }
                              className="text-[11px] font-bold text-blue-600"
                            >
                              EM ANDAMENTO
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateSituacao(v.id, "concluido")
                              }
                              className="text-[11px] font-bold text-green-600"
                            >
                              CONCLUÍDO
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateSituacao(v.id, "atrasada")
                              }
                              className="text-[11px] font-bold text-red-600"
                            >
                              ATRASADO
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {v.total_inscritos ||
                          v.acompanhamento?.total_inscritos ||
                          0}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">
                        {v.aprovados_triagem ||
                          v.acompanhamento?.aprovados_triagem ||
                          0}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">
                        {v.acompanhamento?.aprovados_avaliacao_especifica || 0}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">
                        {v.convocados_entrevista ||
                          v.acompanhamento?.convocados_entrevista ||
                          0}
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">
                        {v.aprovados_finais ||
                          v.acompanhamento?.aprovados_finais ||
                          0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-primary font-bold hover:bg-primary/5 px-2 flex items-center gap-1.5"
                          onClick={() => navigate(`/vagas/${v.id}`)}
                        >
                          Atualizar <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {editaisEmAndamento.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="px-6 py-20 text-center text-slate-400 font-medium italic"
                    >
                      Nenhum edital em andamento visível para suas unidades.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedVagaForAcompanhamento && (
        <AcompanhamentoModal
          isOpen={!!selectedVagaForAcompanhamento}
          onClose={() => setSelectedVagaForAcompanhamento(null)}
          vaga={selectedVagaForAcompanhamento}
          onSave={handleSaveAcompanhamento}
        />
      )}
    </div>
  );
}
