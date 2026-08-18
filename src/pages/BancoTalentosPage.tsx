import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Calendar,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Download,
  Trash2,
  AlertCircle,
  User,
  Users,
  Briefcase,
  Building,
  FileText,
  ClipboardList,
  CheckCircle,
  ArrowLeft,
  Puzzle,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RequestUpdateDialog } from "@/components/RequestUpdateDialog";
import { ExportButton } from "@/components/ExportButton";
// ... keep existing code

import {
  formatDate,
  normalizeCargo,
  filterByRegionAndUnit,
  UNIDADES_POR_REGIAO,
  normalizeUnitName,
} from "@/lib/vagaUtils";
import { calculateBancoStatus, calculateStats } from "@/lib/bancoTalentosUtils";
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";

const getRegiaoFromUnit = (unidade: string): string | undefined => {
  const normalized = normalizeUnitName(unidade);
  for (const [regiao, units] of Object.entries(UNIDADES_POR_REGIAO)) {
    if (
      units.some(
        (u) =>
          normalizeUnitName(u) === normalized ||
          normalized.includes(normalizeUnitName(u)) ||
          normalizeUnitName(u).includes(normalized),
      )
    ) {
      if (regiao === "GO/ES") return "GO_ES";
      return "OUTRAS_UNIDADES";
    }
  }
  return undefined;
};
import { useSearchParams, useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConvocacaoDialog } from "@/components/ConvocacaoDialog";
import { BancoTalentosDetalhesModal } from "@/components/BancoTalentosDetalhesModal";
import { Convocacao } from "@/types/vaga";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BancoTalentos } from "@/types/vaga";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function BancoTalentosPage() {
  const navigate = useNavigate();
  const {
    bancos,
    importHistory,
    importedFiles,
    deleteBanco,
    fetchBancos,
    fetchImportHistory,
  } = useVagasStore();
  const {
    currentUser,
    selectedRegion,
    selectedUnit: globalUnit,
    users,
    fetchUsers,
  } = useAdminStore();

  useEffect(() => {
    fetchBancos();
    fetchImportHistory();
    fetchUsers();
  }, [fetchBancos, fetchImportHistory, fetchUsers]);
  const permissions = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "list");
  const vagaIdContext = searchParams.get("vagaId");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [convocadosSearch, setConvocadosSearch] = useState("");
  const [regiaoFilter, setRegiaoFilter] = useState("todas");
  const [convocadosUnidadeFilter, setConvocadosUnidadeFilter] =
    useState("todas");
  const [convocadosCargoFilter, setConvocadosCargoFilter] = useState("todos");
  const [isCadastrarEditalOpen, setIsCadastrarEditalOpen] = useState(false);
  const [novoEditalNumero, setNovoEditalNumero] = useState("");
  const [novoNumeroEdital, setNovoNumeroEdital] = useState("");
  const [isTeia, setIsTeia] = useState(false);
  const [savingEdital, setSavingEdital] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bancoParaExcluir, setBancoParaExcluir] = useState<string | null>(null);
  const [selectedBanco, setSelectedBanco] = useState<BancoTalentos | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Dual synchronized scrollbars
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useLayoutEffect(() => {
    if (tableScrollRef.current) {
      const w = tableScrollRef.current.scrollWidth;
      setTableScrollWidth((prev) => (prev !== w ? w : prev));
    }
  });

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

  // Dual synchronized scrollbars — convocados tab
  const convocadosScrollRef = useRef<HTMLDivElement>(null);
  const convocadosTopRef = useRef<HTMLDivElement>(null);
  const convocadosBottomRef = useRef<HTMLDivElement>(null);
  const [convocadosScrollWidth, setConvocadosScrollWidth] = useState(0);

  useLayoutEffect(() => {
    if (convocadosScrollRef.current) {
      const w = convocadosScrollRef.current.scrollWidth;
      setConvocadosScrollWidth((prev) => (prev !== w ? w : prev));
    }
  });

  useEffect(() => {
    const tableEl = convocadosScrollRef.current;
    const topEl = convocadosTopRef.current;
    const bottomEl = convocadosBottomRef.current;
    if (!tableEl || !topEl || !bottomEl || convocadosScrollWidth === 0) return;
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
  }, [convocadosScrollWidth]);

  // Dual synchronized scrollbars — vencidos tab
  const vencidosScrollRef = useRef<HTMLDivElement>(null);
  const vencidosTopRef = useRef<HTMLDivElement>(null);
  const vencidosBottomRef = useRef<HTMLDivElement>(null);
  const [vencidosScrollWidth, setVencidosScrollWidth] = useState(0);

  useLayoutEffect(() => {
    if (vencidosScrollRef.current) {
      const w = vencidosScrollRef.current.scrollWidth;
      setVencidosScrollWidth((prev) => (prev !== w ? w : prev));
    }
  });

  useEffect(() => {
    const tableEl = vencidosScrollRef.current;
    const topEl = vencidosTopRef.current;
    const bottomEl = vencidosBottomRef.current;
    if (!tableEl || !topEl || !bottomEl || vencidosScrollWidth === 0) return;
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
  }, [vencidosScrollWidth]);

  // Pagination for convocados and vencidos tabs
  const [convocadosPage, setConvocadosPage] = useState(1);
  const [vencidosPage, setVencidosPage] = useState(1);
  const tabPageSize = 50;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [isRequestUpdateOpen, setIsRequestUpdateOpen] = useState(false);
  const [bancoForUpdate, setBancoForUpdate] = useState<BancoTalentos | null>(
    null,
  );
  const [isConvocacaoOpen, setIsConvocacaoOpen] = useState(false);
  const [convocacaoInitialData, setConvocacaoInitialData] = useState<
    Partial<Convocacao> | undefined
  >(undefined);

  const handleDelete = () => {
    if (bancoParaExcluir) {
      deleteBanco(bancoParaExcluir);
      toast.success("Banco de talentos excluído com sucesso.");
      setIsDeleteDialogOpen(false);
      setBancoParaExcluir(null);
    }
  };

  const handleRequestUpdate = (recordId: string, description: string) => {
    // In a real app, this would send a notification or create a record.
    // For now, we'll just show a success message.
    toast.success("Solicitação de atualização enviada para a gestão.");
    console.log(`Request update for ${recordId}: ${description}`);
  };

  const handleCadastrarEdital = async () => {
    if (!novoEditalNumero.trim()) {
      toast.error("Informe o número do processo seletivo.");
      return;
    }
    const editalPattern = /^\d{3}\/\d{4}$/;
    if (!isTeia && !editalPattern.test(novoNumeroEdital.trim())) {
      toast.error(
        "Informe o número do edital no formato ###/#### (ex: 055/2026).",
      );
      return;
    }
    setSavingEdital(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("importacoes").insert({
        tipo: "banco",
        numero_edital: isTeia ? null : novoNumeroEdital.trim(),
        arquivo: novoEditalNumero.trim(),
        is_teia: isTeia,
        status: "aguardando_processamento",
        usuario_id: authUser?.id || "",
        quantidade_processada: 0,
        quantidade_inserida: 0,
        quantidade_atualizada: 0,
        quantidade_ignorada: 0,
        quantidade_erro: 0,
      });
      if (error) throw error;
      toast.success(
        "Processo seletivo cadastrado! Os candidatos estarão disponíveis amanhã.",
      );
      setNovoEditalNumero("");
      setNovoNumeroEdital("");
      setIsTeia(false);
      setIsCadastrarEditalOpen(false);
      const { fetchImportHistory } = useVagasStore.getState();
      await fetchImportHistory();
      handleTabChange("history");
    } catch (err: any) {
      toast.error(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setSavingEdital(false);
    }
  };
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["list", "convocados", "vencidos", "history", "audit"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }

    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams((prev) => {
      prev.set("tab", value);
      return prev;
    });
  };

  const filtered = useMemo(() => {
    const baseRecords = filterByRegionAndUnit(
      bancos,
      selectedRegion,
      globalUnit,
    );
    return baseRecords.filter((b) => {
      // Unit access restriction
      if (
        !currentUser?.visualiza_todas_unidades &&
        !currentUser?.unidades_vinculadas.includes(b.unidade)
      ) {
        return false;
      }

      // Exclude convocados from the main list
      if (b.status === "CONVOCADO") return false;

      const normalizedSearch = normalizeCargo(search);
      const matchSearch =
        normalizeCargo(b.cargo).includes(normalizedSearch) ||
        normalizeCargo(b.unidade).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch);

      const matchUnidade =
        unidadeFilter === "todas" || b.unidade === unidadeFilter;

      // Corrigindo o filtro de status para ser mais flexível com case e variações
      const statusLower = (b.status || "").toLowerCase();
      const filterLower = statusFilter.toLowerCase();

      let matchStatus = statusFilter === "todos";
      if (!matchStatus) {
        if (statusFilter === "valido") {
          matchStatus =
            statusLower === "valido" ||
            statusLower === "cadastro reserva" ||
            statusLower === "prorrogado";
        } else if (statusFilter === "vencido") {
          matchStatus = statusLower === "vencido" || statusLower === "vencida";
        } else {
          matchStatus = statusLower === filterLower;
        }
      }

      return matchSearch && matchUnidade && matchStatus;
    });
  }, [bancos, currentUser, search, unidadeFilter, statusFilter]);

  const convocadosFiltered = useMemo(() => {
    return bancos.filter((b) => {
      if (b.status !== "CONVOCADO") return false;

      // Unit access restriction
      if (
        !currentUser?.visualiza_todas_unidades &&
        !currentUser?.unidades_vinculadas.includes(b.unidade)
      ) {
        return false;
      }

      const normalizedSearch = normalizeCargo(convocadosSearch);
      const matchSearch =
        normalizeCargo(b.nome || "").includes(normalizedSearch) ||
        normalizeCargo(b.cargo).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch);

      const matchUnidade =
        convocadosUnidadeFilter === "todas" ||
        b.unidade_convocacao === convocadosUnidadeFilter;
      const matchCargo =
        convocadosCargoFilter === "todos" || b.cargo === convocadosCargoFilter;

      return matchSearch && matchUnidade && matchCargo;
    });
  }, [
    bancos,
    currentUser,
    convocadosSearch,
    convocadosUnidadeFilter,
    convocadosCargoFilter,
  ]);

  useEffect(() => {
    setConvocadosPage(1);
  }, [convocadosSearch, convocadosUnidadeFilter, convocadosCargoFilter]);
  const paginatedConvocados = useMemo(
    () =>
      convocadosFiltered.slice(
        (convocadosPage - 1) * tabPageSize,
        convocadosPage * tabPageSize,
      ),
    [convocadosFiltered, convocadosPage, tabPageSize],
  );
  const convocadosTotalPages = Math.ceil(
    convocadosFiltered.length / tabPageSize,
  );

  const convocadosCargos = useMemo(() => {
    const cargos = [
      ...new Set(
        bancos
          .filter((b) => b.status === "CONVOCADO")
          .map((b) => b.cargo)
          .filter(Boolean),
      ),
    ];
    return cargos.sort();
  }, [bancos]);

  const convocadosUnidades = useMemo(() => {
    const unidades = [
      ...new Set(
        bancos
          .filter((b) => b.status === "CONVOCADO" && b.unidade_convocacao)
          .map((b) => b.unidade_convocacao!),
      ),
    ];
    return unidades.sort();
  }, [bancos]);

  const groupedBancos = useMemo(() => {
    const groups: Record<
      string,
      {
        id: string;
        edital: string;
        processoSeletivo: string;
        unidade: string;
        regiao?: string;
        cargo: string;
        cargoNormalizado: string;
        status: string;
        validade: string;
        isProrrogado: boolean;
        qtdBanco: number;
        candidatos: BancoTalentos[];
      }
    > = {};

    // Use ALL bancos for grouping calculations to ensure cards are accurate
    // regardless of the list filter (which excludes Convocados)
    const baseRecords = filterByRegionAndUnit(
      bancos,
      selectedRegion,
      globalUnit,
    );
    baseRecords.forEach((b) => {
      // Restricted access check
      if (
        !currentUser?.visualiza_todas_unidades &&
        !currentUser?.unidades_vinculadas.includes(b.unidade)
      ) {
        return;
      }

      const calculation = calculateBancoStatus(b);
      const bStatus = calculation.status;

      const cargoNorm = b.cargo_normalizado || normalizeCargo(b.cargo);
      // REGRA DE IDENTIFICAÇÃO DO BANCO (Auditada: PS ou Edital + Unidade + Cargo)
      const key = b.numero_processo_seletivo
        ? `PS-${b.numero_processo_seletivo}`
        : `${b.numero_edital}-${b.unidade}-${cargoNorm}`;

      if (!groups[key]) {
        let qtd = 0;
        const rawQtd = b.quantidade_banco;
        if (typeof rawQtd === "number") {
          qtd = rawQtd;
        } else if (rawQtd) {
          qtd = parseInt(String(rawQtd).replace(/[^\d]/g, "")) || 0;
        }

        groups[key] = {
          id: b.id,
          edital: b.numero_edital,
          processoSeletivo:
            b.numero_processo_seletivo || b.numero_processo || "",
          unidade: b.unidade,
          regiao: b.regiao || getRegiaoFromUnit(b.unidade),
          cargo: b.cargo,
          cargoNormalizado: cargoNorm,
          status: bStatus,
          validade: calculation.dataReferencia,
          isProrrogado: bStatus === "prorrogado",
          // QNTD BANCO: Pegamos a maior quantidade informada para este grupo para evitar erro de leitura
          qtdBanco: qtd,
          candidatos: [],
        };
      } else {
        // Se encontrarmos uma quantidade maior em outra linha do mesmo banco, atualizamos
        const rawQtd = b.quantidade_banco;
        let currentQtd = 0;
        if (typeof rawQtd === "number") currentQtd = rawQtd;
        else if (rawQtd)
          currentQtd = parseInt(String(rawQtd).replace(/[^\d]/g, "")) || 0;

        if (currentQtd > groups[key].qtdBanco) {
          groups[key].qtdBanco = currentQtd;
        }
      }

      groups[key].candidatos.push(b);
    });

    return Object.values(groups).sort((a, b) => a.cargo.localeCompare(b.cargo));
  }, [bancos, currentUser]);

  // filteredGroups for the list display
  const filteredGroups = useMemo(() => {
    return groupedBancos.filter((group) => {
      // Exclude convocados from the main list view tab
      if (group.status === "CONVOCADO") return false;

      const normalizedSearch = normalizeCargo(search);
      const matchSearch =
        normalizeCargo(group.cargo).includes(normalizedSearch) ||
        normalizeCargo(group.unidade).includes(normalizedSearch) ||
        normalizeCargo(group.edital).includes(normalizedSearch);

      const matchUnidade =
        unidadeFilter === "todas" || group.unidade === unidadeFilter;

      const statusLower = (group.status || "").toLowerCase();
      const filterLower = statusFilter.toLowerCase();

      let matchStatus = statusFilter === "todos";
      if (!matchStatus) {
        if (statusFilter === "valido") {
          matchStatus =
            statusLower === "valido" ||
            statusLower === "cadastro reserva" ||
            statusLower === "prorrogado";
        } else if (statusFilter === "vencido") {
          matchStatus = statusLower === "vencido" || statusLower === "vencida";
        } else {
          matchStatus = statusLower === filterLower;
        }
      }

      const matchRegiao =
        regiaoFilter === "todas" || group.regiao === regiaoFilter;

      return matchSearch && matchUnidade && matchStatus && matchRegiao;
    });
  }, [groupedBancos, search, unidadeFilter, statusFilter, regiaoFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, unidadeFilter, statusFilter, regiaoFilter]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredGroups.length / pageSize);

  const selectedGroupCandidates = useMemo(() => {
    if (!selectedBanco) return [];

    const cargoNorm =
      selectedBanco.cargo_normalizado || normalizeCargo(selectedBanco.cargo);
    const selectedKey = selectedBanco.numero_processo_seletivo
      ? `PS-${selectedBanco.numero_processo_seletivo}`
      : `${selectedBanco.numero_edital}-${selectedBanco.unidade}-${cargoNorm}`;

    return filtered
      .filter((b) => {
        const bCargoNorm = b.cargo_normalizado || normalizeCargo(b.cargo);
        const bKey = b.numero_processo_seletivo
          ? `PS-${b.numero_processo_seletivo}`
          : `${b.numero_edital}-${b.unidade}-${bCargoNorm}`;

        return bKey === selectedKey;
      })
      .sort((a, b) => {
        const classA =
          typeof a.classificacao === "number"
            ? a.classificacao
            : parseInt(String(a.classificacao)) || 999;
        const classB =
          typeof b.classificacao === "number"
            ? b.classificacao
            : parseInt(String(b.classificacao)) || 999;
        return classA - classB;
      });
  }, [selectedBanco, filtered]);

  const [vencidosSearch, setVencidosSearch] = useState("");
  const [prorrogandoId, setProrrogandoId] = useState<string | null>(null);

  const vencidosFiltered = useMemo(() => {
    return bancos.filter((b) => {
      if (b.status !== "VENCIDO") return false;
      if (
        !currentUser?.visualiza_todas_unidades &&
        !currentUser?.unidades_vinculadas.includes(b.unidade)
      ) {
        return false;
      }
      if (!vencidosSearch) return true;
      const normalizedSearch = normalizeCargo(vencidosSearch);
      return (
        normalizeCargo(b.nome || "").includes(normalizedSearch) ||
        normalizeCargo(b.cargo).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch)
      );
    });
  }, [bancos, currentUser, vencidosSearch]);

  useEffect(() => {
    setVencidosPage(1);
  }, [vencidosSearch]);
  const paginatedVencidos = useMemo(
    () =>
      vencidosFiltered.slice(
        (vencidosPage - 1) * tabPageSize,
        vencidosPage * tabPageSize,
      ),
    [vencidosFiltered, vencidosPage, tabPageSize],
  );
  const vencidosTotalPages = Math.ceil(vencidosFiltered.length / tabPageSize);

  const canProrrogate = useMemo(() => {
    if (!currentUser) return false;
    const perfil = (currentUser.perfil || "").toLowerCase();
    return (
      perfil.includes("admin") ||
      perfil.includes("gestão") ||
      perfil.includes("gestor") ||
      perfil.includes("gestao")
    );
  }, [currentUser]);

  const handleProrrogacao = async (banco: BancoTalentos) => {
    if (!currentUser) return;
    setProrrogandoId(banco.id);
    try {
      const { supabase } = await import("@/integrations/supabase/client");

      let newValidade = "";
      if (banco.data_validade) {
        const parts = banco.data_validade.split(/[-\/]/);
        let dateObj: Date | null = null;
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            dateObj = new Date(
              parseInt(parts[0]),
              parseInt(parts[1]) - 1,
              parseInt(parts[2]),
            );
          } else {
            dateObj = new Date(
              parseInt(parts[2]),
              parseInt(parts[1]) - 1,
              parseInt(parts[0]),
            );
          }
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          dateObj.setMonth(dateObj.getMonth() + 6);
          newValidade = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
        }
      }

      const updateData: any = {
        is_prorrogado: true,
        status: "prorrogado",
        updated_by: currentUser.id,
        observacao:
          `${banco.observacoes || ""} | Prorrogado por ${currentUser.nome_completo} em ${new Date().toLocaleString("pt-BR")}`.trim(),
      };
      if (newValidade) {
        updateData.data_validade = newValidade;
      }

      const { error } = await supabase
        .from("banco_candidatos")
        .update(updateData)
        .eq("id", banco.id);

      if (error) throw error;

      const { updateBanco } = useVagasStore.getState();
      updateBanco(banco.id, {
        is_prorrogado: true,
        status: "prorrogado",
        data_validade: newValidade || banco.data_validade,
        observacoes: updateData.observacao,
      });

      try {
        await supabase.from("audit_logs").insert({
          usuario_id: currentUser.id,
          usuario_nome: currentUser.nome_completo,
          usuario_email: currentUser.email,
          perfil: currentUser.perfil,
          acao: "Prorrogação de banco",
          modulo: "Banco de Talentos",
          registro_afetado: banco.id,
          valor_anterior: JSON.stringify({
            status: banco.status,
            data_validade: banco.data_validade,
            is_prorrogado: banco.is_prorrogado,
          }),
          valor_novo: JSON.stringify({
            status: "prorrogado",
            data_validade: newValidade,
            is_prorrogado: true,
          }),
        });
      } catch (auditErr) {
        console.warn("Audit log error:", auditErr);
      }

      toast.success(
        `Banco prorrogado com sucesso! Nova validade: ${newValidade ? formatDate(newValidade) : "atualizada"}`,
      );
    } catch (err: any) {
      console.error("Erro ao prorrogar:", err);
      toast.error(`Erro ao prorrogar: ${err.message}`);
    } finally {
      setProrrogandoId(null);
    }
  };

  const historyBT = useMemo(() => {
    return importHistory.filter(
      (h) => h.tipo_importacao === "banco" || (h as any).numero_edital,
    );
  }, [importHistory]);

  // "IMPORTADO POR" helpers
  const batchUserMap = useMemo(() => {
    const map = new Map<string, { nome: string; userId: string }>();
    importHistory.forEach((h) => {
      if (h.id && h.usuario) map.set(h.id, { nome: h.usuario, userId: h.usuario_id || "" });
    });
    return map;
  }, [importHistory]);

  // Map nome_completo → avatar_url (same strategy as VagasPage "Analista Resp.")
  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.nome_completo && u.avatar_url) map.set(u.nome_completo, u.avatar_url);
    });
    return map;
  }, [users]);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CADASTRO RESERVA":
      case "VALIDO":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200 text-[10px] whitespace-nowrap">
            Cad. Reserva
          </Badge>
        );
      case "VENCIDO":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200 text-[10px] whitespace-nowrap">
            Vencido
          </Badge>
        );
      case "PRORROGADO":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200 text-[10px] whitespace-nowrap">
            Prorrogado
          </Badge>
        );
      case "CONVOCADO":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold border-purple-200 text-[10px] whitespace-nowrap">
            Convocado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
            {status || "Indeterminado"}
          </Badge>
        );
    }
  };

  const prepareBancoForExport = (data: BancoTalentos[]) => {
    return data.map((b) => ({
      id: (b as any).id || "",
      nome: (b as any).nome || "",
      cpf: (b as any).cpf || "",
      data_nascimento: (b as any).data_nascimento || "",
      email: (b as any).email || "",
      telefone: (b as any).telefone || "",
      cargo: b.cargo || "",
      cargo_normalizado: b.cargo_normalizado || "",
      secao: (b as any).secao || "",
      unidade: b.unidade || "",
      unidade_convocacao: b.unidade_convocacao || "",
      status: b.status || "",
      status_calculado: (b as any).status_calculado || "",
      status_original: (b as any).status_original || "",
      classificacao: b.classificacao != null ? String(b.classificacao) : "",
      nota_avaliacao: (b as any).nota_avaliacao || "",
      nota_entrevista: (b as any).nota_entrevista || "",
      numero_edital: b.numero_edital || "",
      numero_processo_seletivo:
        b.numero_processo_seletivo || b.numero_processo || "",
      data_publicacao: (b as any).data_publicacao || "",
      data_validade: b.data_validade || "",
      data_convocacao: b.data_convocacao || "",
      is_prorrogado: b.is_prorrogado ? "SIM" : "NÃO",
      quantidade_banco:
        b.quantidade_banco != null ? String(b.quantidade_banco) : "",
      observacao: b.observacoes || (b as any).observacao || "",
      origem: (b as any).origem || "",
      data_importacao: (b as any).data_importacao || "",
      import_batch_id: b.import_batch_id || "",
      created_at: (b as any).created_at || "",
      updated_at: (b as any).updated_at || "",
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banco de Talentos"
        actions={
          <>
            <ExportButton
              data={prepareBancoForExport(filtered)}
              filename="banco_candidatos"
              label="Exportar Excel"
              className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm h-10 px-4 transition-all rounded-xl font-bold"
            />
            {permissions.canIncludeRecords() && (
              <Button
                className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-10 px-4 transition-all rounded-xl font-bold"
                onClick={() => setIsCadastrarEditalOpen(true)}
              >
                <FileText className="h-4 w-4" /> Importar Bancos da Reachr
              </Button>
            )}
          </>
        }
      />

      {vagaIdContext && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0 text-blue-500" />
          <span>
            Você está consultando bancos de talentos a partir de uma vaga. Os
            resultados já foram filtrados pelo cargo.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-7 px-2"
            onClick={() => navigate(`/vagas/${vagaIdContext}`)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar à Vaga
          </Button>
        </div>
      )}

      {/* Cadastrar Edital modal */}
      <Dialog
        open={isCadastrarEditalOpen}
        onOpenChange={(open) => {
          setIsCadastrarEditalOpen(open);
          if (!open) {
            setNovoEditalNumero("");
            setNovoNumeroEdital("");
            setIsTeia(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Importar Banco de
              Talentos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Description */}
            <p className="text-sm text-slate-500 leading-relaxed">
              Informe o{" "}
              <span className="font-semibold text-slate-700">
                Nº do Processo Seletivo
              </span>{" "}
              gerado na Reachr. Se o processo pertence à{" "}
              <span className="font-semibold text-slate-700">Rede Teia</span>,
              ative o botão abaixo e o campo Nº do Edital não será obrigatório.
            </p>

            {/* TEIA toggle card */}
            <button
              type="button"
              onClick={() => {
                setIsTeia((v) => !v);
                if (!isTeia) setNovoNumeroEdital("");
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left select-none"
              style={
                isTeia
                  ? {
                      background: "rgba(16,185,129,0.07)",
                      border: "1.5px solid rgba(16,185,129,0.40)",
                    }
                  : {
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shrink-0"
                  style={
                    isTeia
                      ? {
                          background: "rgba(16,185,129,0.15)",
                          color: "#059669",
                        }
                      : { background: "#f1f5f9", color: "#94a3b8" }
                  }
                >
                  <Puzzle className="h-4 w-4" />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold leading-none"
                    style={{ color: isTeia ? "#059669" : "#475569" }}
                  >
                    Rede Teia
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isTeia
                      ? "Edital não necessário para este processo"
                      : "Clique para marcar como Rede Teia"}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div
                className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
                style={{
                  background: isTeia ? "#10b981" : "#cbd5e1",
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: isTeia ? "calc(100% - 18px)" : "2px" }}
                />
              </div>
            </button>

            {/* Fields */}
            <div
              className={cn(
                "grid gap-4",
                !isTeia ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nº do Processo Seletivo{" "}
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="ex:30102"
                  value={novoEditalNumero}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setNovoEditalNumero(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCadastrarEdital();
                  }}
                  className="h-10 rounded-xl border-slate-200 focus-visible:ring-primary/30 font-mono text-center tracking-widest text-sm"
                  inputMode="numeric"
                  maxLength={5}
                  autoFocus
                />
                {novoEditalNumero.length > 0 && novoEditalNumero.length < 5 && (
                  <p className="text-xs text-amber-500">
                    {novoEditalNumero.length}/5 dígitos
                  </p>
                )}
              </div>

              {!isTeia && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nº do Edital <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="ex:055/2026"
                    value={novoNumeroEdital}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/[^\d]/g, "")
                        .slice(0, 7);
                      const formatted =
                        digits.length <= 3
                          ? digits
                          : digits.slice(0, 3) + "/" + digits.slice(3);
                      setNovoNumeroEdital(formatted);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCadastrarEdital();
                    }}
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-primary/30 font-mono text-center tracking-widest text-sm"
                    maxLength={8}
                  />
                  {novoNumeroEdital.length > 0 &&
                    !/^\d{3}\/\d{4}$/.test(novoNumeroEdital) && (
                      <p className="text-xs text-amber-500">
                        Formato: 055/2026
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setIsCadastrarEditalOpen(false);
                  setNovoEditalNumero("");
                  setNovoNumeroEdital("");
                  setIsTeia(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white"
                onClick={handleCadastrarEdital}
                disabled={
                  savingEdital ||
                  novoEditalNumero.length !== 5 ||
                  (!isTeia && !/^\d{3}\/\d{4}$/.test(novoNumeroEdital))
                }
              >
                {savingEdital ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RequestUpdateDialog
        isOpen={isRequestUpdateOpen}
        onClose={() => {
          setIsRequestUpdateOpen(false);
          setBancoForUpdate(null);
        }}
        recordId={bancoForUpdate?.id || ""}
        recordTitle={bancoForUpdate?.cargo || ""}
        type="banco"
        onConfirm={handleRequestUpdate}
      />

      <ConvocacaoDialog
        open={isConvocacaoOpen}
        onOpenChange={(v) => {
          setIsConvocacaoOpen(v);
          if (!v) setConvocacaoInitialData(undefined);
        }}
        initialData={convocacaoInitialData}
      />

      <BancoTalentosDetalhesModal
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        banco={selectedBanco}
        candidates={selectedGroupCandidates}
        canProrrogate={canProrrogate}
        currentUser={currentUser}
        fetchBancos={fetchBancos}
        onConvocar={(data) => {
          setConvocacaoInitialData(data);
          setIsConvocacaoOpen(true);
        }}
      />


      {/* Dynamic status computation based on business logic */}
      {useMemo(() => {
        const stats = calculateStats(bancos);
        console.log("--- AUDITORIA BANCO (Lógica de Negócio) ---", stats);
        return null;
      }, [bancos])}

      {activeTab === "list" &&
        (() => {
          const stats = calculateStats(bancos);
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-purple-500">
                <CardContent className="pt-6 px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2.5 rounded-lg shrink-0">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Convocados
                      </p>
                      <div className="flex flex-col">
                        <p className="text-2xl font-bold text-slate-900 leading-none">
                          {stats["Total Convocados"]}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-red-500">
                <CardContent className="pt-6 px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2.5 rounded-lg shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Vencidos
                      </p>
                      <div className="flex flex-col">
                        <p className="text-2xl font-bold text-slate-900 leading-none">
                          {stats["Total Vencidos"]}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-green-500">
                <CardContent className="pt-6 px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2.5 rounded-lg shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Total Vigentes
                      </p>
                      <div className="flex flex-col">
                        <p className="text-2xl font-bold text-slate-900 leading-none">
                          {stats["Total Cadastro Reserva"] +
                            stats["Total Prorrogados"]}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-slate-400">
                <CardContent className="pt-6 px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-lg shrink-0">
                      <Calendar className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Banco Total
                      </p>
                      <div className="flex flex-col">
                        <p className="text-2xl font-bold text-slate-900 leading-none">
                          {bancos.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <Filter className="h-4 w-4" /> Cadastro Reserva
          </TabsTrigger>
          <TabsTrigger value="convocados" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Histórico de Convocações
          </TabsTrigger>
          <TabsTrigger value="vencidos" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Vencidos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico de Importações
          </TabsTrigger>
          {permissions.canViewAudit() && (
            <TabsTrigger
              value="audit"
              className="gap-2 text-destructive font-bold"
            >
              <AlertCircle className="h-4 w-4" /> Auditoria de Grupos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por cargo, unidade ou edital..."
                    className="pl-9 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={unidadeFilter}
                    onValueChange={setUnidadeFilter}
                  >
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="todas">Todas Unidades</SelectItem>
                      {/* Units are now derived from the bancos list or common units */}
                      {Array.from(
                        new Set(bancos.map((b) => b.unidade).filter(Boolean)),
                      )
                        .sort()
                        .map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="valido">Válidos</SelectItem>
                      <SelectItem value="vencido">Vencidos</SelectItem>
                      <SelectItem value="prorrogado">Prorrogados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Regiões</SelectItem>
                      <SelectItem value="GO_ES">GO e ES</SelectItem>
                      <SelectItem value="OUTRAS_UNIDADES">
                        Outras Unidades
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Top synchronized scrollbar */}
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

              {/* Table container */}
              <div
                ref={tableScrollRef}
                className="table-hide-scrollbar overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <table className="w-full caption-bottom text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Edital</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Proc. Seletivo</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cargo</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Unidade</TableHead>
                      <TableHead className="whitespace-nowrap text-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</TableHead>
                      <TableHead className="whitespace-nowrap text-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">Qtd.</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Importado por</TableHead>
                      <TableHead className="text-right whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group) => {
                      const batchId = group.candidatos[0]?.import_batch_id;
                      const importer = batchId ? batchUserMap.get(batchId) : undefined;
                      const avatarUrl = importer?.nome ? userAvatarMap.get(importer.nome) : undefined;
                      const firstName = importer?.nome?.split(" ")[0] ?? "";
                      const initials = importer?.nome
                        ? importer.nome.split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join("")
                        : "?";

                      return (
                      <TableRow
                        key={group.id}
                        className="hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-0"
                      >
                        {/* Edital */}
                        <TableCell className="py-3">
                          <span className="text-[12px] font-bold text-primary">
                            {group.edital || "—"}
                          </span>
                        </TableCell>

                        {/* Proc. Seletivo */}
                        <TableCell className="py-3">
                          <span className="text-[12px] font-semibold text-slate-600">
                            {group.processoSeletivo || "—"}
                          </span>
                        </TableCell>

                        {/* Cargo */}
                        <TableCell className="py-3">
                          <p className="text-[12px] font-semibold text-slate-700 leading-tight">
                            {group.cargo}
                          </p>
                          {group.candidatos[0]?.secao && (
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                              {group.candidatos[0].secao}
                            </p>
                          )}
                        </TableCell>

                        {/* Unidade */}
                        <TableCell className="py-3">
                          <span className="text-[12px] font-semibold text-slate-700">
                            {group.unidade}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center py-3">
                          {getStatusBadge(group.status)}
                        </TableCell>

                        {/* Qtd. */}
                        <TableCell className="text-center py-3">
                          <span className="inline-flex items-center justify-center h-6 min-w-[28px] px-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                            {group.qtdBanco || group.candidatos.length}
                          </span>
                        </TableCell>

                        {/* Importado por */}
                        <TableCell className="py-3">
                          {importer ? (
                            <div className="flex items-center gap-2" title={importer.nome}>
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={importer.nome}
                                  className="w-7 h-7 rounded-full object-cover ring-2 ring-violet-200 shrink-0 shadow-sm"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
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
                          ) : (
                            <span className="text-[11px] text-slate-300 italic">—</span>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            {permissions.canRequestUpdate() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-bold text-[11px] text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-8 px-2.5"
                                onClick={() => {
                                  setBancoForUpdate(group.candidatos[0]);
                                  setIsRequestUpdateOpen(true);
                                }}
                              >
                                Solicitar Atualização
                              </Button>
                            )}
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/8 rounded-lg"
                                    onClick={() => {
                                      setSelectedBanco(group.candidatos[0]);
                                      setIsDetailsOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  Ver detalhes
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {permissions.canDeleteRecords() && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                      onClick={() => {
                                        setBancoParaExcluir(group.id);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Excluir banco
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {filteredGroups.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-40 text-center text-slate-400 font-medium italic"
                        >
                          Nenhum banco de talentos encontrado para os filtros
                          aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </table>
              </div>

              {/* Bottom synchronized scrollbar */}
              <div
                ref={bottomScrollRef}
                className="table-scroll-bottom overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#e8edf4",
                  borderTop: "1px solid #dde3ec",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#94a3b8 #e8edf4",
                }}
              >
                <div style={{ width: tableScrollWidth, height: "1px" }} />
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="convocados" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, cargo ou edital..."
                    className="pl-9 bg-white"
                    value={convocadosSearch}
                    onChange={(e) => setConvocadosSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={convocadosUnidadeFilter}
                    onValueChange={setConvocadosUnidadeFilter}
                  >
                    <SelectTrigger className="w-[180px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Unidade Convocada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Unidades</SelectItem>
                      {convocadosUnidades.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={convocadosCargoFilter}
                    onValueChange={setConvocadosCargoFilter}
                  >
                    <SelectTrigger className="w-[180px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Cargos</SelectItem>
                      {convocadosCargos.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                ref={convocadosTopRef}
                className="table-scroll-top overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#221f44",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.3) #2c2960",
                }}
              >
                <div style={{ width: convocadosScrollWidth, height: "1px" }} />
              </div>
              <div
                ref={convocadosScrollRef}
                className="table-hide-scrollbar overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <table className="w-full caption-bottom text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Edital</TableHead>
                      <TableHead className="text-center">Class.</TableHead>
                      <TableHead>Data Conv.</TableHead>
                      <TableHead>Unid. Conv.</TableHead>
                      <TableHead className="text-center">
                        Status / Devolutiva
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedConvocados.map((b) => {
                      // Encontrar a convocação diária relacionada
                      const dailyConvocacao = useVagasStore
                        .getState()
                        .convocacoes.find(
                          (c) =>
                            c.banco_relacionado === b.id ||
                            (c.nome_candidato === b.nome &&
                              c.cargo === b.cargo),
                        );

                      return (
                        <TableRow
                          key={b.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="font-bold text-slate-900 text-xs">
                            {b.nome || "Não identificado"}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700">
                            {b.cargo}
                          </TableCell>
                          <TableCell className="text-primary font-bold text-xs">
                            {b.numero_edital}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="font-bold bg-white text-primary border-primary/20"
                            >
                              {b.classificacao}°
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-green-600">
                            {b.data_convocacao
                              ? formatDate(b.data_convocacao)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Building className="h-3 w-3 text-slate-400" />
                              {b.unidade_convocacao || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {dailyConvocacao ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase ${
                                  dailyConvocacao.status === "aceite"
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : dailyConvocacao.status === "pendente"
                                      ? "bg-amber-100 text-amber-700 border-amber-200"
                                      : "bg-red-100 text-red-700 border-red-200"
                                }`}
                              >
                                {dailyConvocacao.status === "aceite"
                                  ? "Compareceu / Aceitou"
                                  : dailyConvocacao.status === "pendente"
                                    ? "Pendente"
                                    : dailyConvocacao.status === "desistiu"
                                      ? "Desistiu"
                                      : dailyConvocacao.status === "faltou"
                                        ? "Faltou"
                                        : dailyConvocacao.status ===
                                            "recusa_plantao"
                                          ? "Recusa Plantão"
                                          : dailyConvocacao.status ===
                                              "recusa_unidade"
                                            ? "Recusa Unidade"
                                            : dailyConvocacao.status ===
                                                "recusa_horario"
                                              ? "Recusa Horário"
                                              : dailyConvocacao.status}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold bg-slate-50 text-slate-400 border-slate-200"
                              >
                                CONVOCADO
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-bold text-xs text-primary hover:bg-primary/5 h-8"
                              onClick={() => {
                                setSelectedBanco(b);
                                setIsDetailsOpen(true);
                              }}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {convocadosFiltered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-40 text-center text-slate-400 font-medium italic"
                        >
                          Nenhum registro de convocação encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </table>
              </div>
              <div
                ref={convocadosBottomRef}
                className="table-scroll-bottom overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#e8edf4",
                  borderTop: "1px solid #dde3ec",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#94a3b8 #e8edf4",
                }}
              >
                <div style={{ width: convocadosScrollWidth, height: "1px" }} />
              </div>
              <div className="px-6 py-4 border-t text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <span>
                  Exibindo {paginatedConvocados.length} de{" "}
                  {convocadosFiltered.length} registros
                </span>
                {convocadosTotalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setConvocadosPage((p) => Math.max(1, p - 1))
                          }
                          className={
                            convocadosPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {[...Array(convocadosTotalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === convocadosTotalPages ||
                          (page >= convocadosPage - 1 &&
                            page <= convocadosPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={convocadosPage === page}
                                onClick={() => setConvocadosPage(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (
                          page === convocadosPage - 2 ||
                          page === convocadosPage + 2
                        )
                          return <PaginationEllipsis key={page} />;
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setConvocadosPage((p) =>
                              Math.min(convocadosTotalPages, p + 1),
                            )
                          }
                          className={
                            convocadosPage === convocadosTotalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidos" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, cargo ou edital..."
                    className="pl-9 bg-white"
                    value={vencidosSearch}
                    onChange={(e) => setVencidosSearch(e.target.value)}
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {vencidosFiltered.length} banco(s) vencido(s)
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                ref={vencidosTopRef}
                className="table-scroll-top overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#221f44",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.3) #2c2960",
                }}
              >
                <div style={{ width: vencidosScrollWidth, height: "1px" }} />
              </div>
              <div
                ref={vencidosScrollRef}
                className="table-hide-scrollbar overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <table className="w-full caption-bottom text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nome</TableHead>
                      <TableHead className="whitespace-nowrap">Cargo</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Edital
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Unidade
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Class.
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Validade
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVencidos.map((b) => (
                      <TableRow
                        key={b.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="font-bold text-slate-900 text-xs">
                          {b.nome || "Não identificado"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">
                          {b.cargo}
                        </TableCell>
                        <TableCell className="text-primary font-bold text-xs">
                          {b.numero_edital}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">
                          {b.unidade}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="font-bold bg-white text-primary border-primary/20"
                          >
                            {b.classificacao}°
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-red-600">
                          {b.data_validade ? formatDate(b.data_validade) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(b.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canProrrogate && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-bold text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-8 gap-1"
                                disabled={prorrogandoId === b.id}
                                onClick={() => handleProrrogacao(b)}
                              >
                                <Clock className="h-3 w-3" />
                                {prorrogandoId === b.id
                                  ? "Prorrogando..."
                                  : "Prorrogar"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-bold text-xs text-primary hover:bg-primary/5 h-8"
                              onClick={() => {
                                setSelectedBanco(b);
                                setIsDetailsOpen(true);
                              }}
                            >
                              Detalhes
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vencidosFiltered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-40 text-center text-slate-400 font-medium italic"
                        >
                          Nenhum banco vencido encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </table>
              </div>
              <div
                ref={vencidosBottomRef}
                className="table-scroll-bottom overflow-x-scroll overflow-y-hidden"
                style={{
                  height: "20px",
                  background: "#e8edf4",
                  borderTop: "1px solid #dde3ec",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#94a3b8 #e8edf4",
                }}
              >
                <div style={{ width: vencidosScrollWidth, height: "1px" }} />
              </div>
              <div className="px-6 py-4 border-t text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <span>
                  Exibindo {paginatedVencidos.length} de{" "}
                  {vencidosFiltered.length} registros
                </span>
                {vencidosTotalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setVencidosPage((p) => Math.max(1, p - 1))
                          }
                          className={
                            vencidosPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {[...Array(vencidosTotalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === vencidosTotalPages ||
                          (page >= vencidosPage - 1 && page <= vencidosPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={vencidosPage === page}
                                onClick={() => setVencidosPage(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (
                          page === vencidosPage - 2 ||
                          page === vencidosPage + 2
                        )
                          return <PaginationEllipsis key={page} />;
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setVencidosPage((p) =>
                              Math.min(vencidosTotalPages, p + 1),
                            )
                          }
                          className={
                            vencidosPage === vencidosTotalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Edital</TableHead>
                  <TableHead>Proc. Seletivo</TableHead>
                  <TableHead>Cadastrado Por</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyBT.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {h.data_hora
                        ? formatDate(h.data_hora.split("T")[0])
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {h.numero_edital || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {h.arquivo || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {h.usuario}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const s = (h.status || "").toLowerCase();
                        if (s === "aguardando_processamento")
                          return (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[11px]">
                              Aguardando
                            </Badge>
                          );
                        if (s === "em_processamento")
                          return (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                              Processando
                            </Badge>
                          );
                        if (s.startsWith("candidato") || s === "concluído")
                          return (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px]">
                              Concluído
                            </Badge>
                          );
                        if (s === "edital não encontrado na reachr")
                          return (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[11px]">
                              Não encontrado
                            </Badge>
                          );
                        if (s.startsWith("erro"))
                          return (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px]">
                              Erro
                            </Badge>
                          );
                        return (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[11px]">
                            {h.status}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
                {historyBT.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-40 text-center text-slate-400 font-medium italic"
                    >
                      Nenhum edital cadastrado até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {permissions.canViewAudit() && (
          <TabsContent value="audit" className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" /> RESUMO FINAL
                DA AUDITORIA (STATUS CALCULADO)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Este painel reflete o <strong>Status Calculado</strong> em tempo
                real, aplicando as regras de prioridade:
                <span className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">
                  1. Convocado
                </span>
                <span className="mx-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">
                  2. Prorrogação Manual
                </span>
                <span className="mx-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                  3. Prorrogação "SIM"
                </span>
                <span className="mx-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">
                  4. Validade Normal
                </span>
                .
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const stats = calculateStats(bancos);
                const auditItems = [
                  {
                    label: "Cadastro Reserva",
                    value: stats["Cadastro Reserva"],
                    color: "text-primary",
                    description: "Vigente pela validade normal",
                  },
                  {
                    label: "Convocados",
                    value: stats["Convocados"],
                    color: "text-purple-600",
                    description: "Status original CONVOCADO",
                  },
                  {
                    label: 'Prorrogados ("SIM")',
                    value: stats['Prorrogados por "SIM"'],
                    color: "text-blue-600",
                    description: "Coluna prorrogação = SIM",
                  },
                  {
                    label: "Prorrogados (Data)",
                    value: stats["Prorrogados por data manual"],
                    color: "text-indigo-600",
                    description: "Coluna prorrogação = data",
                  },
                  {
                    label: "Prorrogados (Original)",
                    value: stats["Prorrogados por status original"],
                    color: "text-cyan-600",
                    description: "Status/flag já era PRORROGADO",
                  },
                  {
                    label: "Vencidos (Validade)",
                    value: stats["Vencidos por validade normal"],
                    color: "text-red-500",
                    description: "Validade original expirada",
                  },
                  {
                    label: "Vencidos (Prorrog.)",
                    value: stats["Vencidos por prorrogação expirada"],
                    color: "text-red-700",
                    description: "Prorrogação expirada",
                  },
                  {
                    label: "Vencidos (Original)",
                    value: stats["Vencidos por status original"],
                    color: "text-red-900",
                    description: "Status original VENCIDO confirmado",
                  },
                ];

                return auditItems.map((item, i) => (
                  <Card key={i} className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4 px-4 pb-4 flex flex-col items-center justify-center text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>
                        {item.value}
                      </p>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-tighter mt-1">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Detalhamento de Cálculo por Registro
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold uppercase">
                        Candidato / Cargo
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">
                        Status Orig.
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">
                        Prorrog.
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">
                        Validade
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">
                        Status Calc.
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">
                        Motivo do Cálculo
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">
                        Data Ref.
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bancos.slice(0, 100).map((b) => {
                      const calc = calculateBancoStatus(b);
                      return (
                        <TableRow
                          key={b.id}
                          className="text-[11px] hover:bg-slate-50"
                        >
                          <TableCell className="max-w-[200px]">
                            <p className="font-bold truncate" title={b.nome}>
                              {b.nome || "N/A"}
                            </p>
                            <p
                              className="text-slate-400 text-[10px] truncate"
                              title={b.cargo}
                            >
                              {b.cargo}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[9px] h-5">
                              {b.status || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {b.prorrogacao || (b.is_prorrogado ? "SIM" : "NÃO")}
                          </TableCell>
                          <TableCell className="text-center text-slate-500">
                            {b.data_validade
                              ? formatDate(b.data_validade)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(calc.status)}
                          </TableCell>
                          <TableCell className="text-slate-500 italic">
                            {calc.motivo}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700">
                            {calc.dataReferencia
                              ? formatDate(calc.dataReferencia)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {bancos.length > 100 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-4 text-slate-400 italic"
                        >
                          Exibindo apenas os primeiros 100 registros para
                          performance. Total na base: {bancos.length}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir banco de talentos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido
              permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBancoParaExcluir(null)}>
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
    </div>
  );
}
