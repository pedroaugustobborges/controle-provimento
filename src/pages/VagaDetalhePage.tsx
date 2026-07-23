import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ConvocacaoDetalhesModal } from "@/components/ConvocacaoDetalhesModal";
import { supabase } from "@/integrations/supabase/client";
import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import {
  calcDiasAberto,
  formatDate,
  getValidacaoColor,
  getEtapaColor,
  getStatusColor,
} from "@/lib/vagaUtils";
import {
  TIPO_VAGA_LABELS,
  STATUS_VAGA_LABELS,
  ETAPA_LABELS,
  StatusVaga,
  EtapaEdital,
  STATUS_EDITAL_COLORS,
  STATUS_LABELS,
  Vaga,
  Convocacao,
  Edital,
  VagaCronograma,
  TODAS_AS_ETAPAS,
  isTeiaUnit,
  TratativaVaga,
  EtapaVaga,
  StatusProcesso,
  VagaFluxoItem,
} from "@/types/vaga";
import {
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Hash,
  Calendar,
  CheckCircle2,
  XCircle,
  Minus,
  FileSpreadsheet,
  Info,
  Building2,
  Plus,
  AlertCircle,
  Activity,
  Check,
  Save,
  Users,
  Search as SearchIcon,
  Zap,
  UserCheck,
  CheckCircle,
  Send,
  Search,
  AlertTriangle,
  ArrowRightCircle,
  ExternalLink,
  Edit,
  Copy,
  ArrowLeftRight,
  Crown,
  Target,
  ChevronRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, useMemo, useRef, ChangeEvent } from "react";
import { ConvocacaoDialog } from "@/components/ConvocacaoDialog";
import { usePermissions } from "@/hooks/usePermissions";
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
import { RequestUpdateDialog } from "@/components/RequestUpdateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Workflow constants ─────────────────────────────────────────────────────
const TRATATIVAS = [
  "Aproveitamento de Banco de Talentos",
  "Publicação de Edital",
  "Movimentação Interna",
  "Vaga de Liderança",
  "Aguardando Unidade",
] as const;

const ETAPAS_POR_TRATATIVA: Record<string, string[]> = {
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

const STATUS_PROCESSO_CONFIG: Record<
  StatusProcesso,
  { dot: string; bg: string; text: string; border: string; iconBg: string }
> = {
  Solicitada: {
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    iconBg: "bg-slate-100",
  },
  "Em Andamento": {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
  },
  Cancelada: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    iconBg: "bg-red-100",
  },
  Suspensa: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
  },
  Concluída: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
  },
};

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

// ─── Multi-vaga flow helpers ──────────────────────────────────────────────────

function getFluxoItems(vaga: Vaga): VagaFluxoItem[] {
  const count = Math.max(Number(vaga.numero_vagas || vaga.quantidade) || 1, 1);
  const stored = Array.isArray(vaga.distribuicao_vagas)
    ? (vaga.distribuicao_vagas as VagaFluxoItem[])
    : [];
  return Array.from({ length: count }, (_, i) => {
    const slot = i + 1;
    const found = stored.find((e) => e.slot === slot);
    // slot 1 falls back to root vaga fields for backward compatibility
    const root: Partial<VagaFluxoItem> =
      slot === 1
        ? {
            tratativa: vaga.tratativa,
            etapa: vaga.etapa,
            status_processo: vaga.status_processo || "Solicitada",
          }
        : { status_processo: "Solicitada" };
    return { ...root, ...found, slot } as VagaFluxoItem;
  });
}

// ─── Observations ────────────────────────────────────────────────────────────

interface ObsItem {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string; // ISO or '' for legacy
}

function parseObsItems(raw: string | null | undefined): ObsItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ObsItem[];
  } catch {}
  // Plain text → treat as legacy "OBS do RM" entry
  return [
    {
      id: "legacy-rm",
      text: raw.trim(),
      author_id: "rm",
      author_name: "OBS do RM",
      author_avatar: null,
      created_at: "",
    },
  ];
}

function obsRelativeTime(iso: string): string {
  if (!iso) return "Registro vindo do RM para o GDP";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function ObsAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const initials =
    name === "OBS do RM"
      ? "RM"
      : name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "?";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }
  const isRm = name === "OBS do RM";
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 ring-white shadow-sm shrink-0 ${isRm ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    getVaga,
    getEditalByVaga,
    getValidacaoByVaga,
    updateVaga,
    updateVagaAsync,
    updateEdital,
    updateValidacao,
    addEdital,
    addValidacao,
    getBancoByVaga,
    addBanco,
    addTarefa,
    addAlerta,
    convocacoes,
    addConvocacao,
    trackEditing,
    stopTrackingEditing,
    editingUsers,
  } = useVagasStore();
  const { currentUser, addAuditLog, users, fetchUsers } = useAdminStore();
  const permissions = usePermissions();

  const [isConvocacaoDialogOpen, setIsConvocacaoDialogOpen] = useState(false);
  const [isCreateBancoDialogOpen, setIsCreateBancoDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isEditingIndicators, setIsEditingIndicators] = useState(false);
  const [newObsText, setNewObsText] = useState("");
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [activeFluxoSlot, setActiveFluxoSlot] = useState(() => {
    const slot = parseInt(searchParams.get("slot") || "1", 10);
    return isNaN(slot) || slot < 1 ? 1 : slot;
  });
  const [fluxoDraft, setFluxoDraft] = useState<
    Record<
      number,
      { tratativa?: string; etapa?: string; status_processo?: string }
    >
  >({});
  const [fluxoDirty, setFluxoDirty] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  const [isQuickConvocacaoOpen, setIsQuickConvocacaoOpen] = useState(false);
  const [matchedBanco, setMatchedBanco] = useState<any>(null);
  const [isRequestUpdateOpen, setIsRequestUpdateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

  const [indicators, setIndicators] = useState({
    total_inscritos: 0,
    aprovados_triagem: 0,
    convocados_entrevista: 0,
    aprovados_finais: 0,
  });

  const vaga = getVaga(id!);

  const isAtrasada = useMemo(() => {
    if (!vaga) return false;
    const status = (vaga.status || vaga.status_geral) as string;
    if (
      ["encerrada", "finalizada", "cancelada", "admissao_efetivada"].includes(
        status,
      )
    )
      return false;
    const lastHist = vaga.historico?.[vaga.historico.length - 1];
    const baseDate =
      lastHist?.data || vaga.data_recebimento || vaga.data_abertura;
    return calcDiasAberto(baseDate) > 10;
  }, [vaga]);

  const vagaConvocacoes = useMemo(
    () => convocacoes.filter((c) => c.vaga_id === vaga?.id),
    [vaga?.id, convocacoes],
  );

  const hasAceite = vagaConvocacoes.some((c) => c.status === "aceite");
  const hasRecusa = vagaConvocacoes.some((c) =>
    [
      "recusa_plantao",
      "recusa_unidade",
      "recusa_horario",
      "desistiu",
      "faltou",
    ].includes(c.status),
  );
  const isConcluido = [
    "encerrada",
    "finalizada",
    "admissao_efetivada",
  ].includes(vaga?.status || vaga?.status_geral || "");

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.nome_completo && u.avatar_url) map.set(u.nome_completo, u.avatar_url);
    });
    return map;
  }, [users]);

  useEffect(() => {
    if (vaga) {
      setIndicators({
        total_inscritos: vaga.total_inscritos || 0,
        aprovados_triagem: vaga.aprovados_triagem || 0,
        convocados_entrevista: vaga.convocados_entrevista || 0,
        aprovados_finais: vaga.aprovados_finais || 0,
      });
    }
  }, [vaga?.id]);

  useEffect(() => {
    if (id) {
      trackEditing(id);
      return () => {
        stopTrackingEditing();
      };
    }
  }, [id, trackEditing, stopTrackingEditing]);

  // Keep a ref so event listeners always read the latest value without re-registering
  // Covers both: unsaved fluxo changes AND unsubmitted obs text
  const fluxoDirtyRef = useRef(false);
  useEffect(() => {
    fluxoDirtyRef.current = fluxoDirty || newObsText.trim() !== "";
  }, [fluxoDirty, newObsText]);

  useEffect(() => {
    // 1. Browser close / hard refresh
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!fluxoDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    // 2. Sidebar <Link> clicks and any other anchor-based navigation
    const handleLinkClick = (e: MouseEvent) => {
      if (!fluxoDirtyRef.current) return;
      const anchor = (e.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      // Ignore external links, hash-only, or same page
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("#")
      )
        return;
      if (anchor.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setPendingNav(() => () => navigate(anchor.pathname + anchor.search));
      setShowUnsavedAlert(true);
    };
    document.addEventListener("click", handleLinkClick, { capture: true });

    // 3. Browser back / forward buttons
    const handlePopState = () => {
      if (!fluxoDirtyRef.current) return;
      // Push the current URL back so the address bar doesn't change
      window.history.pushState(null, "", window.location.href);
      setPendingNav(() => () => navigate(-1));
      setShowUnsavedAlert(true);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", handleLinkClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]); // stable — reads dirty state via ref

  const editingUser = id ? editingUsers[id] : null;
  const isAnotherUserEditing =
    editingUser && editingUser.userId !== currentUser?.id;

  if (!vaga)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Vaga não encontrada.
      </div>
    );

  const edital = getEditalByVaga(vaga.id);
  const validacao = getValidacaoByVaga(vaga.id);
  const banco = getBancoByVaga(vaga.id);

  const canEdit = [
    "Admin",
    "Administrador",
    "Analista",
    "Analista de RH",
    "Analista Administrativo",
    "Analista de Edital",
    "Analista das Convocações",
    "Assistente de RH",
    "Gerência",
    "Coordenação",
    "Supervisão",
  ].includes(currentUser?.perfil || "");
  const isAssistente =
    currentUser?.perfil === "Assistente" ||
    currentUser?.perfil === "Assistente de RH";

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "encerrada" || newStatus === "finalizada") {
      setPendingStatus(newStatus);
      setIsCreateBancoDialogOpen(true);
      return;
    }
    applyStatusChange(newStatus);
  };

  const applyStatusChange = async (newStatus: string, createBanco = false) => {
    const oldStatus = vaga.status || vaga.status_geral;
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const updateData: Partial<any> = {
      status: newStatus as StatusVaga,
      historico: [
        ...vaga.historico,
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Status alterado para ${STATUS_LABELS[newStatus as StatusVaga]}`,
          usuario: currentUser?.nome_completo || "Analista",
        },
      ],
    };

    if (newStatus === "encerrada" || newStatus === "finalizada") {
      updateData.data_encerramento = today;
    }

    if (createBanco) {
      const bancoId = `b-${Date.now()}`;
      const novoBanco = {
        id: bancoId,
        unidade: vaga.unidade,
        cargo: vaga.cargo,
        secao: vaga.secao,
        numero_edital:
          vaga.numero_edital || "ED-" + (vaga.requisicao || vaga.id),
        data_abertura_edital: today,
        data_validade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 6 months
        is_prorrogado: false,
        status: "CADASTRO RESERVA" as const,
        observacoes: `Banco criado a partir da vaga ${vaga.requisicao || vaga.id}`,
        numero_processo: vaga.numero_processo,
        quantidade_banco:
          vaga.acompanhamento?.quantidade_banco ||
          indicators.aprovados_finais ||
          0,
      };

      addBanco(novoBanco);
      updateData.tem_banco_valido = true;
      updateData.banco_id = bancoId;

      // Section 8.4: Create task and alert for assistant
      const tarefaId = `t-${Date.now()}`;
      addTarefa({
        id: tarefaId,
        titulo: `Complementar dados do banco: ${vaga.cargo}`,
        descricao: `Complementar dados do banco gerado para a vaga ${vaga.requisicao}. Conferir quantidade e finalizar inclusão no cadastro reserva.`,
        status: "pendente",
        prioridade: "media",
        data_criacao: today,
        atribuido_a: "Assistente",
        relacionado_a: { tipo: "vaga", id: vaga.id },
      });

      addAlerta({
        id: `a-${Date.now()}`,
        titulo: "Novo Banco Gerado",
        mensagem: `Foi gerado um banco para a vaga ${vaga.cargo} (${vaga.requisicao}). Uma tarefa foi atribuída para complementação dos dados.`,
        tipo: "informativo",
        status: "nao_lido",
        data_criacao: today,
        destinatario: "Assistente",
        link: `/vagas/${vaga.id}`,
      });

      toast.info("Banco de Talentos criado e tarefas atribuídas à assistência");
    }

    await updateVagaAsync(vaga.id, updateData);

    addAuditLog({
      usuario_nome: currentUser?.nome_completo || "Sistema",
      usuario_email: currentUser?.email || "sistema@sistema.com",
      perfil: currentUser?.perfil || "Sistema",
      data: today,
      hora: new Date().toLocaleTimeString(),
      acao: "Alteração de Status",
      modulo: "Vagas",
      registro_afetado: vaga.requisicao || vaga.numero_requisicao || vaga.id,
      valor_anterior: oldStatus,
      valor_novo: newStatus,
    });

    toast.success("Status atualizado");
    setPendingStatus(null);
  };

  const handleTratativaChange = async (tratativa: string) => {
    const today = new Date().toISOString().split("T")[0];
    const currentSP = vaga.status_processo;
    await updateVagaAsync(vaga.id, {
      tratativa: (tratativa || undefined) as TratativaVaga | undefined,
      status_processo:
        currentSP === "Concluída" || currentSP === "Cancelada"
          ? currentSP
          : "Em Andamento",
      historico: [
        ...(vaga.historico || []),
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Tratativa definida: ${tratativa || "Não definida"}`,
          usuario: currentUser?.nome_completo || "Sistema",
        },
      ],
    });
  };

  const handleEtapaChange = async (etapa: string) => {
    const today = new Date().toISOString().split("T")[0];
    const isAdmissao = etapa === "Admissão Efetivada";
    const currentSP = vaga.status_processo;
    const novoStatus: StatusProcesso = isAdmissao
      ? "Concluída"
      : currentSP === "Concluída" || currentSP === "Cancelada"
        ? currentSP
        : "Em Andamento";
    await updateVagaAsync(vaga.id, {
      etapa: (etapa || undefined) as EtapaVaga | undefined,
      status_processo: novoStatus,
      historico: [
        ...(vaga.historico || []),
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Etapa: ${etapa || "Não definida"}${isAdmissao ? " → Status: Concluída" : ""}`,
          usuario: currentUser?.nome_completo || "Sistema",
        },
      ],
    });
  };

  const handleStatusProcessoChange = async (sp: string) => {
    const today = new Date().toISOString().split("T")[0];
    await updateVagaAsync(vaga.id, {
      status_processo: sp as StatusProcesso,
      historico: [
        ...(vaga.historico || []),
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Status do processo: ${sp}`,
          usuario: currentUser?.nome_completo || "Sistema",
        },
      ],
    });
  };

  const handleFluxoSlotChange = async (
    slot: number,
    field: "tratativa" | "etapa" | "status_processo",
    value: string,
  ) => {
    const vagaCount = Math.max(
      Number(vaga.numero_vagas || vaga.quantidade) || 1,
      1,
    );
    if (vagaCount <= 1) {
      if (field === "tratativa") {
        await handleTratativaChange(value);
        return;
      }
      if (field === "etapa") {
        await handleEtapaChange(value);
        return;
      }
      if (field === "status_processo") {
        await handleStatusProcessoChange(value);
        return;
      }
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const items = getFluxoItems(vaga);
    const isAdmissao = field === "etapa" && value === "Admissão Efetivada";
    const updated = items.map((item) => {
      if (item.slot !== slot) return item;
      const newSP: StatusProcesso =
        field === "status_processo"
          ? (value as StatusProcesso)
          : isAdmissao
            ? "Concluída"
            : item.status_processo === "Concluída" ||
                item.status_processo === "Cancelada"
              ? item.status_processo
              : "Em Andamento";
      return { ...item, [field]: value || undefined, status_processo: newSP };
    });
    const fieldLabel =
      field === "tratativa"
        ? "Tratativa"
        : field === "etapa"
          ? "Etapa"
          : "Status";
    await updateVagaAsync(vaga.id, {
      distribuicao_vagas: updated as any,
      historico: [
        ...(vaga.historico || []),
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Vaga ${slot} — ${fieldLabel}: ${value || "Não definido"}`,
          usuario: currentUser?.nome_completo || "Sistema",
        },
      ],
    });
  };

  const handleRequestUpdate = (recordId: string, description: string) => {
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
    toast.success("Solicitação de atualização enviada");
  };

  const handleQuickConvocacao = () => {
    const bancoFound = getBancoByVaga(vaga.id);
    if (bancoFound) {
      setMatchedBanco(bancoFound);
      setIsQuickConvocacaoOpen(true);
    } else {
      toast.error(
        `Banco não encontrado para a vaga ${vaga.cargo}, unidade ${vaga.unidade}`,
        {
          description:
            "É necessário ter um edital vigente ou cadastro reserva para realizar convocações.",
          action: {
            label: "Criar Edital",
            onClick: () => handlePublicarEdital(),
          },
        },
      );
    }
  };

  const confirmQuickConvocacao = () => {
    const today = new Date().toISOString().split("T")[0];

    // 1. Register convocacao
    const novaConvocacao: Convocacao = {
      id: `c-${Date.now()}`,
      vaga_id: vaga.id,
      banco_relacionado: matchedBanco.id,
      data_convocacao: today,
      horario: "08:00",
      nome_candidato: `Pendente (Banco: ${matchedBanco.numero_edital})`,
      classificacao: 1,
      tipo_convocacao: "Telefone/E-mail",
      cargo: vaga.cargo,
      unidade: vaga.unidade,
      requisicao: vaga.requisicao || vaga.id,
      status: "pendente" as const,
      responsavel: currentUser?.nome_completo || "Analista",
      observacoes: "Convocação iniciada via Ação Rápida",
    };

    addConvocacao(novaConvocacao);

    // 2. Update vaga status
    const updateData = {
      status: "convocacao" as StatusVaga,
      historico: [
        ...vaga.historico,
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: `Convocação iniciada via Ação Rápida. Banco vinculado: ${matchedBanco.numero_edital}`,
          usuario: currentUser?.nome_completo || "Analista",
        },
      ],
      tem_banco_valido: true,
      banco_id: matchedBanco.id,
    };

    updateVaga(vaga.id, updateData);

    // 3. Add audit log
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || "Sistema",
      usuario_email: currentUser?.email || "sistema@sistema.com",
      perfil: currentUser?.perfil || "Sistema",
      data: today,
      hora: new Date().toLocaleTimeString(),
      acao: "Realizar Convocação (Ação Rápida)",
      modulo: "Vagas",
      registro_afetado: vaga.requisicao || vaga.id,
      valor_novo: "convocacao",
    });

    toast.success("Convocação iniciada com sucesso!");
    setIsQuickConvocacaoOpen(false);

    // 4. Redirect to daily convocations tab
    setTimeout(() => {
      navigate("/convocacoes?tab=diaria");
    }, 1500);
  };

  const handlePublicarEdital = () => {
    const today = new Date().toISOString().split("T")[0];

    const updateData = {
      status: "PUBLICAR EDITAL" as StatusVaga,
      status_edital: "Fila de Publicação" as any,
      historico: [
        ...vaga.historico,
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: "Encaminhado para publicação de edital via Ação Rápida",
          usuario: currentUser?.nome_completo || "Analista",
        },
      ],
    };

    updateVaga(vaga.id, updateData);

    // Add to editais store if not exists
    if (!edital) {
      addEdital({
        id: `e-${Date.now()}`,
        vaga_id: vaga.id,
        numero_processo: vaga.numero_processo || "",
        numero_edital: vaga.numero_edital || "",
        data_abertura_edital: today,
        etapa_atual: "inscricoes",
        total_inscritos: 0,
        aprovados_triagem: 0,
        convocados_entrevista: 0,
        aprovados_finais: 0,
        possui_banco_talentos: false,
        status_publicacao: "pendente",
      });
    }
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || "Sistema",
      usuario_email: currentUser?.email || "sistema@sistema.com",
      perfil: currentUser?.perfil || "Sistema",
      data: today,
      hora: new Date().toLocaleTimeString(),
      acao: "Enviar para Fila de Editais (Ação Rápida)",
      modulo: "Vagas",
      registro_afetado: vaga.requisicao || vaga.id,
      valor_novo: "publicar_novo_edital",
    });

    toast.success("Vaga encaminhada para Fila de Editais");

    setTimeout(() => {
      navigate("/fila-editais");
    }, 1500);
  };
  {
    isAnotherUserEditing && (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 animate-pulse">
        <User className="h-5 w-5" />
        <span className="text-sm font-semibold">
          {editingUser.userName} está visualizando/editando este registro agora.
        </span>
      </div>
    );
  }

  const handleSaveIndicators = () => {
    updateVaga(vaga.id, indicators);
    setIsEditingIndicators(false);
    toast.success("Indicadores atualizados");
  };

  const handleAddObs = async () => {
    if (!newObsText.trim() || !currentUser) return;
    setIsSavingObs(true);
    const currentRaw = vaga.observacoes_internas || vaga.observacoes || "";
    const existing = parseObsItems(currentRaw);
    const newItem: ObsItem = {
      id: crypto.randomUUID(),
      text: newObsText.trim(),
      author_id: currentUser.id,
      author_name: currentUser.nome_completo,
      author_avatar: (currentUser as any).avatar_url || null,
      created_at: new Date().toISOString(),
    };
    const updated = [newItem, ...existing];
    const serialized = JSON.stringify(updated);
    const ok = await updateVagaAsync(vaga.id, {
      observacao: serialized,
      observacoes_internas: serialized,
    } as any);
    if (ok) {
      setNewObsText("");
      toast.success("Observação adicionada");
    }
    setIsSavingObs(false);
  };

  const safeNavigate = (action: () => void) => {
    if (fluxoDirty) {
      setPendingNav(() => action);
      setShowUnsavedAlert(true);
    } else {
      action();
    }
  };

  const handleFluxoDraftChange = (
    slot: number,
    field: "tratativa" | "etapa" | "status_processo",
    value: string,
  ) => {
    setFluxoDraft((prev) => {
      const curr = prev[slot] || {};
      const next: typeof curr = { ...curr, [field]: value || undefined };
      if (field === "tratativa") delete next.etapa; // reset etapa when tratativa changes
      return { ...prev, [slot]: next };
    });
    setFluxoDirty(true);
  };

  const handleFluxoSave = async () => {
    const vagaCount = Math.max(
      Number(vaga.numero_vagas || vaga.quantidade) || 1,
      1,
    );
    const today = new Date().toISOString().split("T")[0];

    if (vagaCount <= 1) {
      const draft = fluxoDraft[1] || {};
      const updates: any = {};
      const histParts: string[] = [];

      if ("tratativa" in draft) {
        updates.tratativa = draft.tratativa || undefined;
        histParts.push(`Tratativa: ${draft.tratativa || "Não definida"}`);
      }
      if ("etapa" in draft) {
        updates.etapa = draft.etapa || undefined;
        histParts.push(`Etapa: ${draft.etapa || "Não definida"}`);
      }
      if ("status_processo" in draft) {
        updates.status_processo = draft.status_processo;
        histParts.push(`Status: ${draft.status_processo}`);
      }
      // Auto-promote to Concluída on Admissão Efetivada
      if (draft.etapa === "Admissão Efetivada") {
        updates.status_processo = "Concluída";
      } else if (
        !("status_processo" in draft) &&
        ("tratativa" in draft || "etapa" in draft)
      ) {
        const sp = vaga.status_processo;
        if (sp !== "Concluída" && sp !== "Cancelada")
          updates.status_processo = "Em Andamento";
      }

      if (Object.keys(updates).length > 0) {
        await updateVagaAsync(vaga.id, {
          ...updates,
          historico: [
            ...(vaga.historico || []),
            {
              id: `h-${Date.now()}`,
              data: today,
              descricao: histParts.join(" | "),
              usuario: currentUser?.nome_completo || "Sistema",
            },
          ],
        });
      }
    } else {
      const items = getFluxoItems(vaga);
      const histParts: string[] = [];
      const updated = items.map((item) => {
        const draft = fluxoDraft[item.slot];
        if (!draft) return item;
        const merged: any = { ...item, ...draft };
        if (draft.etapa === "Admissão Efetivada")
          merged.status_processo = "Concluída";
        histParts.push(
          `Vaga ${item.slot}: ${Object.entries(draft)
            .map(([k, v]) => `${k}=${v || "—"}`)
            .join(", ")}`,
        );
        return merged;
      });
      await updateVagaAsync(vaga.id, {
        distribuicao_vagas: updated as any,
        historico: [
          ...(vaga.historico || []),
          {
            id: `h-${Date.now()}`,
            data: today,
            descricao: `Fluxo atualizado — ${histParts.join("; ")}`,
            usuario: currentUser?.nome_completo || "Sistema",
          },
        ],
      });
    }

    setFluxoDraft({});
    setFluxoDirty(false);
    toast.success("Fluxo do processo salvo com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeNavigate(() => navigate(-1))}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">
                {vaga.cargo}
              </h2>
              {vaga.reabertura_suspeita && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-600 border-amber-200 font-bold"
                >
                  REABERTURA
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {vaga.requisicao || vaga.numero_requisicao} · {vaga.unidade}
              {vaga.trace_key && (
                <span className="ml-2 text-[11px] text-slate-400 font-mono opacity-60">
                  ID Rastro: {vaga.trace_key}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {isAtrasada && (
              <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse font-bold px-3 py-1 uppercase text-[11px] tracking-wider">
                <AlertCircle className="h-3 w-3 mr-1" /> Etapa em Atraso
              </Badge>
            )}
            {hasAceite && (
              <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[11px] uppercase">
                Convocação Aceita
              </Badge>
            )}
            {hasRecusa && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[11px] uppercase">
                Convocação Recusada
              </Badge>
            )}
            {vaga.tem_banco_valido && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[11px] uppercase">
                Banco Gerado
              </Badge>
            )}
            {vaga.status === "publicar_novo_edital" && (
              <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[11px] uppercase">
                Necessidade de Novo Edital
              </Badge>
            )}
            {isConcluido && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[11px] uppercase">
                Processo Concluído
              </Badge>
            )}

            {vaga.status_edital && (
              <Badge
                className={`${STATUS_EDITAL_COLORS[vaga.status_edital as any] || "bg-slate-100"} font-bold text-xs px-3 py-1`}
              >
                {vaga.status_edital}
              </Badge>
            )}
            <StatusBadge
              status={
                (vaga.status_processo ||
                  vaga.status ||
                  vaga.status_geral ||
                  "aberta") as any
              }
            />
          </div>
          {permissions.canRequestUpdate() && (
            <Button
              variant="outline"
              className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-2 font-bold"
              onClick={() => setIsRequestUpdateOpen(true)}
            >
              <AlertCircle className="h-4 w-4" /> Solicitar Atualização
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: Calendar,
            label: "Abertura",
            value: formatDate(vaga.data_abertura),
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: Clock,
            label: "Dias Aberto",
            value: `${calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias`,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            icon: FileSpreadsheet,
            label: "Origem",
            value: vaga.origem_importacao || "Manual",
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            icon: Building2,
            label: "Qtd. Vagas",
            value: vaga.numero_vagas || vaga.quantidade || 0,
            color: "text-primary",
            bg: "bg-primary/5",
          },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
              <div className={`${item.bg} p-2 rounded-lg`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-slate-700">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h3 className="font-bold text-slate-800">Tratativas</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Aproveitamento do Banco de Talentos */}
          <Button
            onClick={async () => {
              setActiveTab("banco");
              if (vaga.tratativa !== "Aproveitamento de Banco de Talentos") {
                await handleTratativaChange(
                  "Aproveitamento de Banco de Talentos",
                );
              }
            }}
            className="h-auto py-4 px-6 justify-between border-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 bg-white text-primary group transition-all"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">
                  Aproveitamento do Banco de Talentos
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Ver candidatos com perfil similar a esta vaga
                </p>
              </div>
            </div>
            <ArrowRightCircle className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Button>

          {/* Publicação de Edital — em breve */}
          <button
            disabled
            className="h-auto py-4 px-6 flex items-center justify-between border-2 border-rose-100 bg-white rounded-md text-rose-400 opacity-60 cursor-not-allowed transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-rose-50 p-2 rounded-lg">
                <Send className="h-6 w-6 text-rose-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Publicação de Edital</p>
                <p className="text-xs text-slate-400 font-medium">
                  Encaminhar para fila de novos editais/publicações
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-500 px-2 py-0.5 rounded-full shrink-0">
              Em breve
            </span>
          </button>

          {/* Movimentação Interna — em breve */}
          <button
            disabled
            className="h-auto py-4 px-6 flex items-center justify-between border-2 border-purple-100 bg-white rounded-md text-purple-400 opacity-60 cursor-not-allowed transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-50 p-2 rounded-lg">
                <ArrowLeftRight className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Movimentação Interna</p>
                <p className="text-xs text-slate-400 font-medium">
                  Transferência entre unidades da rede
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-500 px-2 py-0.5 rounded-full shrink-0">
              Em breve
            </span>
          </button>

          {/* Vaga de Liderança — em breve */}
          <button
            disabled
            className="h-auto py-4 px-6 flex items-center justify-between border-2 border-amber-100 bg-white rounded-md text-amber-400 opacity-60 cursor-not-allowed transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-amber-50 p-2 rounded-lg">
                <Crown className="h-6 w-6 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Vaga de Liderança</p>
                <p className="text-xs text-slate-400 font-medium">
                  Processo seletivo para cargos de gestão
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-500 px-2 py-0.5 rounded-full shrink-0">
              Em breve
            </span>
          </button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6"
          >
            Dados da Vaga
          </TabsTrigger>
          <TabsTrigger
            value="edital"
            disabled
            className="font-bold px-6 opacity-50 cursor-not-allowed flex-col gap-0"
          >
            Edital e Fila
            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full leading-tight">
              Em breve
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="acompanhamento"
            disabled
            className="font-bold px-6 opacity-50 cursor-not-allowed flex-col gap-0"
          >
            Acompanhamento
            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full leading-tight">
              Em breve
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="banco"
            className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6"
          >
            Banco de Talentos
          </TabsTrigger>
          <TabsTrigger
            value="convocacoes"
            className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6"
          >
            Convocações
          </TabsTrigger>
          <TabsTrigger
            value="validacao"
            className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6"
          >
            Validação
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Unidade
                  </label>
                  <p className="text-sm font-semibold text-slate-700">
                    {vaga.unidade}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Seção
                  </label>
                  <p className="text-sm font-semibold text-slate-700">
                    {vaga.secao || "Não informada"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Recebimento
                  </label>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(vaga.data_recebimento!)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Analista Resp.
                  </label>
                  {vaga.analista_responsavel ? (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const avatarUrl = userAvatarMap.get(vaga.analista_responsavel);
                        const initials = vaga.analista_responsavel
                          .split(' ').filter(Boolean).slice(0, 2)
                          .map((n: string) => n[0].toUpperCase()).join('');
                        return avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={vaga.analista_responsavel}
                            className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 ring-2 ring-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-indigo-600">{initials}</span>
                          </div>
                        );
                      })()}
                      <span className="text-sm font-semibold text-slate-700">{vaga.analista_responsavel}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Não atribuído</p>
                  )}
                </div>
                {vaga.assistentes && vaga.assistentes.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Assistentes
                    </label>
                    <p className="text-sm font-semibold text-slate-700">
                      {vaga.assistentes.join(", ")}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Banco Ativo?
                  </label>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-bold ${banco ? "text-green-600" : "text-slate-500"}`}
                    >
                      {banco ? `Sim (${banco.numero_edital})` : "Não"}
                    </p>
                    {banco && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1.5 border-green-200 text-green-700 bg-green-50"
                      >
                        {String(banco.status || "SEM STATUS").toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Nº Edital
                  </label>
                  <p className="text-sm font-bold text-primary">
                    {vaga.numero_edital || "Pendente"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Nº Processo
                  </label>
                  <p className="text-sm font-bold text-primary">
                    {vaga.numero_processo || "Pendente"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Nº Requisição
                  </label>
                  <p className="text-sm font-bold text-slate-700 font-mono">
                    {vaga.requisicao || vaga.numero_requisicao}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Indicadores do Processo
                  </h4>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        isEditingIndicators
                          ? handleSaveIndicators()
                          : setIsEditingIndicators(true)
                      }
                      className="h-7 px-2 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {isEditingIndicators
                        ? "Salvar Indicadores"
                        : "Editar Indicadores"}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Inscritos
                    </label>
                    {isEditingIndicators ? (
                      <Input
                        type="number"
                        value={indicators.total_inscritos}
                        onChange={(e) =>
                          setIndicators({
                            ...indicators,
                            total_inscritos: +e.target.value,
                          })
                        }
                        className="h-8 bg-white"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">
                        {vaga.total_inscritos || 0}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Triagem
                    </label>
                    {isEditingIndicators ? (
                      <Input
                        type="number"
                        value={indicators.aprovados_triagem}
                        onChange={(e) =>
                          setIndicators({
                            ...indicators,
                            aprovados_triagem: +e.target.value,
                          })
                        }
                        className="h-8 bg-white"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">
                        {vaga.aprovados_triagem || 0}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Em Entrevista
                    </label>
                    {isEditingIndicators ? (
                      <Input
                        type="number"
                        value={indicators.convocados_entrevista}
                        onChange={(e) =>
                          setIndicators({
                            ...indicators,
                            convocados_entrevista: +e.target.value,
                          })
                        }
                        className="h-8 bg-white"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">
                        {vaga.convocados_entrevista || 0}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Aprovados
                    </label>
                    {isEditingIndicators ? (
                      <Input
                        type="number"
                        value={indicators.aprovados_finais}
                        onChange={(e) =>
                          setIndicators({
                            ...indicators,
                            aprovados_finais: +e.target.value,
                          })
                        }
                        className="h-8 bg-white"
                      />
                    ) : (
                      <p className="text-xl font-bold text-green-600">
                        {vaga.aprovados_finais || 0}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Info className="h-4 w-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Informações Complementares
                  </h4>
                </div>

                {/* Import metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Origem Importação
                    </label>
                    <p className="text-sm font-medium text-slate-600">
                      {vaga.origem_importacao || "Lançamento Manual"}
                    </p>
                    {vaga.data_importacao && (
                      <p className="text-[11px] text-slate-400">
                        Importado em:{" "}
                        {new Date(vaga.data_importacao).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Lote de Importação
                    </label>
                    <p className="text-sm font-mono text-slate-600">
                      {vaga.lote_importacao || "—"}
                    </p>
                  </div>
                </div>

                {/* ── Fluxo do Processo ──────────────────────────────────── */}
                {(() => {
                  const vagaCount = Math.max(
                    Number(vaga.numero_vagas || vaga.quantidade) || 1,
                    1,
                  );
                  const isMulti = vagaCount > 1;
                  const fluxoItems = getFluxoItems(vaga);
                  const safeSlot = Math.min(activeFluxoSlot, vagaCount);
                  const activeItem = fluxoItems[safeSlot - 1] ?? fluxoItems[0];
                  const sp: StatusProcesso =
                    activeItem?.status_processo || "Solicitada";
                  const spCfg =
                    STATUS_PROCESSO_CONFIG[sp] ??
                    STATUS_PROCESSO_CONFIG["Solicitada"];
                  const canEditFlow = canEdit || isAssistente;

                  // Panels renderer — shared for single and multi
                  const renderPanels = (item: VagaFluxoItem) => {
                    // Merge persisted data with local draft
                    const draft = fluxoDraft[item.slot] || {};
                    const effectiveTratativa =
                      "tratativa" in draft
                        ? draft.tratativa || ""
                        : item.tratativa || "";
                    const effectiveEtapa =
                      "etapa" in draft ? draft.etapa || "" : item.etapa || "";
                    const effectiveSP = (draft.status_processo ||
                      item.status_processo ||
                      "Solicitada") as StatusProcesso;

                    const availableEtapas = effectiveTratativa
                      ? ETAPAS_POR_TRATATIVA[effectiveTratativa] || []
                      : [];
                    const etapaLocked = !effectiveTratativa;

                    // If current etapa is not valid for new tratativa, it displays as empty
                    const etapaValue =
                      effectiveTratativa &&
                      availableEtapas.includes(effectiveEtapa)
                        ? effectiveEtapa
                        : "";

                    const iCfg =
                      STATUS_PROCESSO_CONFIG[effectiveSP] ??
                      STATUS_PROCESSO_CONFIG["Solicitada"];

                    return (
                      <div className="divide-y divide-slate-100">
                        {/* TRATATIVA + ETAPA row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                          {/* TRATATIVA */}
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <Target className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Tratativa
                              </span>
                              <span className="text-[9px] font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                                Obrigatório
                              </span>
                            </div>
                            {canEditFlow ? (
                              <Select
                                value={effectiveTratativa || "__none__"}
                                onValueChange={(v) =>
                                  handleFluxoDraftChange(
                                    item.slot,
                                    "tratativa",
                                    v === "__none__" ? "" : v,
                                  )
                                }
                              >
                                <SelectTrigger className="h-9 bg-white border-slate-200 text-sm font-semibold">
                                  <SelectValue placeholder="Selecionar tratativa..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    <span className="text-slate-400">
                                      Selecionar tratativa...
                                    </span>
                                  </SelectItem>
                                  {TRATATIVAS.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm font-semibold text-slate-700 min-h-[36px] flex items-center">
                                {effectiveTratativa || (
                                  <span className="text-slate-400 italic">
                                    Não definida
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* ETAPA */}
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                  etapaLocked
                                    ? "bg-slate-50 border-slate-100"
                                    : "bg-purple-50 border-purple-100",
                                )}
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3.5 w-3.5 transition-colors",
                                    etapaLocked
                                      ? "text-slate-300"
                                      : "text-purple-500",
                                  )}
                                />
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider transition-colors",
                                  etapaLocked
                                    ? "text-slate-300"
                                    : "text-slate-400",
                                )}
                              >
                                Etapa
                              </span>
                              {etapaLocked && canEditFlow && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                                  Selecione a Tratativa primeiro
                                </span>
                              )}
                            </div>
                            {canEditFlow ? (
                              <Select
                                value={etapaValue || "__none__"}
                                disabled={etapaLocked}
                                onValueChange={(v) =>
                                  handleFluxoDraftChange(
                                    item.slot,
                                    "etapa",
                                    v === "__none__" ? "" : v,
                                  )
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-9 text-sm font-semibold transition-all",
                                    etapaLocked
                                      ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                      : "bg-white border-slate-200",
                                  )}
                                >
                                  <SelectValue
                                    placeholder={
                                      etapaLocked
                                        ? "— Selecione a tratativa —"
                                        : "Selecionar etapa..."
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    <span className="text-slate-400">
                                      Selecionar etapa...
                                    </span>
                                  </SelectItem>
                                  {availableEtapas.map((e) => (
                                    <SelectItem key={e} value={e}>
                                      {e}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm font-semibold text-slate-700 min-h-[36px] flex items-center">
                                {effectiveEtapa || (
                                  <span className="text-slate-400 italic">
                                    Não definida
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* STATUS DO PROCESSO row */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full ${iCfg.iconBg} border ${iCfg.border} flex items-center justify-center shrink-0`}
                            >
                              <CheckCircle
                                className={`h-3.5 w-3.5 ${iCfg.text}`}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              Status do Processo
                            </span>
                          </div>
                          {canEditFlow ? (
                            <Select
                              value={effectiveSP}
                              onValueChange={(v) =>
                                handleFluxoDraftChange(
                                  item.slot,
                                  "status_processo",
                                  v,
                                )
                              }
                            >
                              <SelectTrigger
                                className={`h-9 text-sm font-bold border ${iCfg.border} ${iCfg.bg} ${iCfg.text} max-w-xs`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  Object.keys(
                                    STATUS_PROCESSO_CONFIG,
                                  ) as StatusProcesso[]
                                ).map((s) => {
                                  const c = STATUS_PROCESSO_CONFIG[s];
                                  return (
                                    <SelectItem key={s} value={s}>
                                      <span className="flex items-center gap-2 font-semibold">
                                        <span
                                          className={`w-2 h-2 rounded-full ${c.dot}`}
                                        />
                                        {s}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${iCfg.bg} ${iCfg.text} ${iCfg.border}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${iCfg.dot}`}
                              />
                              {effectiveSP}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      {/* Header */}
                      <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            Fluxo do Processo
                          </span>
                          {isMulti && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {vagaCount} vagas
                            </span>
                          )}
                          {fluxoDirty && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Não salvo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${spCfg.bg} ${spCfg.text} ${spCfg.border}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${spCfg.dot}`}
                            />
                            {sp}
                          </span>
                          {canEditFlow && (
                            <Button
                              size="sm"
                              onClick={handleFluxoSave}
                              disabled={!fluxoDirty}
                              className={cn(
                                "h-7 px-3 text-xs gap-1.5 font-bold transition-all",
                                fluxoDirty
                                  ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100",
                              )}
                            >
                              <Save className="h-3.5 w-3.5" />
                              Salvar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Slot tabs — only for multi-vaga */}
                      {isMulti && (
                        <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-100 bg-white overflow-x-auto">
                          {fluxoItems.map((item) => {
                            const iSP = item.status_processo || "Solicitada";
                            const iCfg =
                              STATUS_PROCESSO_CONFIG[iSP] ??
                              STATUS_PROCESSO_CONFIG["Solicitada"];
                            const isActive = item.slot === safeSlot;
                            return (
                              <button
                                key={item.slot}
                                onClick={() => setActiveFluxoSlot(item.slot)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all whitespace-nowrap",
                                  isActive
                                    ? "border-primary text-primary bg-primary/5"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                                )}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${iCfg.dot}`}
                                />
                                Vaga {item.slot}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Panels for active slot */}
                      {renderPanels(activeItem)}
                    </div>
                  );
                })()}
              </div>

              {/* ── Observações Internas ── */}
              {(() => {
                const obsItems = parseObsItems(
                  vaga.observacoes_internas || vaga.observacoes,
                );
                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                        Observações Internas
                      </label>
                      {obsItems.length > 0 && (
                        <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {obsItems.length}
                        </span>
                      )}
                    </div>

                    {/* New observation input */}
                    {canEdit && (
                      <div className="flex gap-3">
                        <ObsAvatar
                          name={currentUser?.nome_completo || ""}
                          avatarUrl={(currentUser as any)?.avatar_url || null}
                        />
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={newObsText}
                            onChange={(e) => setNewObsText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                                handleAddObs();
                            }}
                            className="min-h-[72px] text-sm resize-none bg-white border-slate-200 focus:border-primary/50 transition-colors"
                            placeholder="Adicione uma observação interna... (Ctrl+Enter para enviar)"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={handleAddObs}
                              disabled={!newObsText.trim() || isSavingObs}
                              className="h-7 px-3 text-xs gap-1.5"
                            >
                              {isSavingObs ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Publicar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feed */}
                    {obsItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                        <MessageSquare className="h-7 w-7 opacity-25" />
                        <p className="text-xs">
                          Nenhuma observação registrada.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 pt-1">
                        {obsItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`flex gap-3 p-3 rounded-xl transition-colors ${idx === 0 ? "bg-slate-50/80 border border-slate-100" : "hover:bg-slate-50/60"}`}
                          >
                            <ObsAvatar
                              name={item.author_name}
                              avatarUrl={item.author_avatar}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs font-semibold text-slate-800">
                                  {item.author_name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {obsRelativeTime(item.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Criado por:{" "}
                  <span className="text-slate-500">Sistema</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Data Criação:{" "}
                  <span className="text-slate-500">
                    {formatDate(vaga.data_abertura)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Última alteração por:{" "}
                  <span className="text-slate-500">
                    {vaga.historico[vaga.historico.length - 1]?.usuario ||
                      "Sistema"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Última atualização:{" "}
                  <span className="text-slate-500">
                    {formatDate(
                      vaga.historico[vaga.historico.length - 1]?.data ||
                        vaga.data_abertura,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edital">
          <EditalTab vagaId={vaga.id} edital={edital} />
        </TabsContent>

        <TabsContent value="acompanhamento">
          <AcompanhamentoTab vaga={vaga} />
        </TabsContent>

        <TabsContent value="banco">
          <AproveitamentoBancoTab vaga={vaga} />
        </TabsContent>

        <TabsContent value="convocacoes">
          <ConvocacoesTab
            vagaId={vaga.id}
            onNewConvocacao={() => setIsConvocacaoDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="validacao">
          <ValidacaoTab vagaId={vaga.id} validacao={validacao} />
        </TabsContent>

        <TabsContent value="historico">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Linha do Tempo
              </CardTitle>
              <div className="flex gap-2">
                <Badge
                  variant={vaga.origem === "manual" ? "default" : "outline"}
                >
                  {vaga.origem === "manual"
                    ? "Origem Manual"
                    : "Origem Importada"}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  Criado em:{" "}
                  {formatDate(vaga.data_criacao || vaga.data_abertura)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-100">
                {vaga.historico
                  .slice()
                  .reverse()
                  .map((h, idx) => (
                    <div
                      key={h.id}
                      className="flex gap-4 items-start relative pl-8"
                    >
                      <div
                        className={`absolute left-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? "bg-primary ring-4 ring-primary/10" : "bg-slate-300"}`}
                      />
                      <div className="flex-1 pb-4 border-b last:border-0 border-slate-50">
                        <p className="text-sm font-semibold text-slate-700">
                          {h.descricao}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{" "}
                            {formatDate(h.data)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {h.usuario}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConvocacaoDialog
        open={isConvocacaoDialogOpen}
        onOpenChange={setIsConvocacaoDialogOpen}
        vaga={vaga}
      />

      <AlertDialog
        open={isCreateBancoDialogOpen}
        onOpenChange={setIsCreateBancoDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              Criar Banco de Talentos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A vaga está sendo encerrada. Deseja criar um novo Banco de
              Talentos a partir dos aprovados deste processo seletivo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                applyStatusChange(pendingStatus!);
                setIsCreateBancoDialogOpen(false);
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                applyStatusChange(pendingStatus!, true);
                setIsCreateBancoDialogOpen(false);
              }}
            >
              Sim, criar banco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isQuickConvocacaoOpen}
        onOpenChange={setIsQuickConvocacaoOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserCheck className="h-5 w-5" />
              Confirmar Convocação Operacional
            </DialogTitle>
            <DialogDescription>
              O sistema identificou um banco de talentos compatível para esta
              vaga.
            </DialogDescription>
          </DialogHeader>

          {matchedBanco && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Banco Identificado
                  </p>
                  <p className="font-bold text-slate-700">
                    {matchedBanco.numero_edital}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[11px] uppercase">
                  {matchedBanco.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Cargo do Banco
                  </p>
                  <p className="text-xs font-semibold text-slate-600 truncate">
                    {matchedBanco.cargo}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Validade
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    {formatDate(matchedBanco.data_validade)}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Unidade Origem
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {matchedBanco.unidade}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 leading-relaxed">
                Ao confirmar, o status da vaga será alterado para{" "}
                <span className="font-bold">Convocações</span> e uma nova
                convocação pendente será registrada no sistema.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsQuickConvocacaoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmQuickConvocacao}
              className="gap-2 bg-primary"
            >
              <CheckCircle className="h-4 w-4" /> Iniciar Convocação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RequestUpdateDialog
        isOpen={isRequestUpdateOpen}
        onClose={() => setIsRequestUpdateOpen(false)}
        recordId={vaga.id}
        recordTitle={vaga.cargo}
        type="vaga"
        onConfirm={handleRequestUpdate}
      />

      {/* ── Unsaved Fluxo Changes Alert ── */}
      <AlertDialog
        open={showUnsavedAlert}
        onOpenChange={(open) => {
          if (!open) {
            setPendingNav(null);
            setShowUnsavedAlert(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Você tem alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 space-y-2 text-sm">
                <p>Se sair agora, as seguintes informações serão perdidas:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  {fluxoDirty && (
                    <li>
                      Alterações no{" "}
                      <strong className="text-slate-700">
                        Fluxo do Processo
                      </strong>{" "}
                      (Tratativa / Etapa / Status)
                    </li>
                  )}
                  {newObsText.trim() !== "" && (
                    <li>
                      Observação interna digitada:{" "}
                      <em className="text-slate-700">
                        "{newObsText.trim().slice(0, 60)}
                        {newObsText.trim().length > 60 ? "…" : ""}"
                      </em>
                    </li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => {
                setPendingNav(null);
                setShowUnsavedAlert(false);
              }}
              className="w-full sm:w-auto"
            >
              Voltar e Salvar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFluxoDirty(false);
                setFluxoDraft({});
                setNewObsText("");
                setShowUnsavedAlert(false);
                pendingNav?.();
                setPendingNav(null);
              }}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// TODAS_AS_ETAPAS is now imported from @/types/vaga

const CRONOGRAMA_KEYS: Record<EtapaEdital, keyof VagaCronograma> = {
  validacao_edital: "data_validacao_edital",
  inscricoes: "data_inscricao",
  triagem: "data_triagem",
  resultado_da_triagem: "data_resultado_triagem",
  avaliacao_especifica_online: "data_avaliacao_especifica_online",
  resultado_preliminar_avaliacao_especifica_online:
    "data_resultado_preliminar_avaliacao_especifica",
  recurso_avaliacao_especifica_online: "data_recurso_avaliacao_especifica",
  resultado_recurso_avaliacao_especifica_online:
    "data_resultado_recurso_avaliacao_especifica",
  resultado_final_avaliacao_especifica_online:
    "data_resultado_final_avaliacao_especifica",
  envio_certificados_titulos: "data_envio_certificados_titulos",
  declaracao_experiencia: "data_declaracao_experiencia",
  analise_curricular_preliminar: "data_analise_curricular_preliminar",
  recurso_analise_curricular: "data_recurso_analise_curricular",
  resultado_recurso_analise_curricular:
    "data_resultado_recurso_analise_curricular",
  analise_curricular_final: "data_analise_curricular_final",
  entrevistas: "data_entrevistas",
  resultado_final: "data_resultado_final",
  convocacao_do_edital: "data_convocacao",
  encerramento: "data_encerramento_processo",
  banco_gerado: "data_encerramento_processo",
  sem_exito: "data_encerramento_processo",
  aguardar_anuencia: "data_encerramento_processo",
  publicar_novo_edital: "data_encerramento_processo",
};

function AcompanhamentoTab({ vaga }: { vaga: Vaga }) {
  const { updateVaga } = useVagasStore();
  const [form, setForm] = useState<any>(
    vaga.acompanhamento || {
      etapa_atual: "inscricoes",
      total_inscritos: 0,
      aprovados_triagem: 0,
      aprovados_avaliacao_especifica: 0,
      convocados_entrevista: 0,
      aprovados_finais: 0,
      gerou_banco: false,
      quantidade_banco: 0,
      situacao_etapa: "pendente",
      observacoes_etapa: "",
      etapas_habilitadas: [
        "validacao_edital",
        "inscricoes",
        "triagem",
        "resultado_da_triagem",
        "entrevistas",
        "resultado_final",
      ],
    },
  );

  const [cronograma, setCronograma] = useState<any>(vaga.cronograma || {});

  const autoUpdateEtapa = useMemo(() => {
    if (!form.historico_etapas || form.historico_etapas.length === 0)
      return form.etapa_atual;

    const habilitadas = form.etapas_habilitadas || [];
    const sortedHabilitadas = TODAS_AS_ETAPAS.filter((e) =>
      habilitadas.includes(e),
    );

    // Find the last completed stage in the sequence
    let lastCompletedIndex = -1;
    for (let i = 0; i < sortedHabilitadas.length; i++) {
      const etapa = sortedHabilitadas[i];
      const status = form.historico_etapas.find((h: any) => h.etapa === etapa);
      if (status?.concluida) {
        lastCompletedIndex = i;
      } else {
        break; // Sequence broken
      }
    }

    // The current stage is the one after the last completed one
    if (lastCompletedIndex + 1 < sortedHabilitadas.length) {
      return sortedHabilitadas[lastCompletedIndex + 1];
    }

    return sortedHabilitadas[sortedHabilitadas.length - 1];
  }, [form.historico_etapas, form.etapas_habilitadas]);

  useEffect(() => {
    if (autoUpdateEtapa !== form.etapa_atual) {
      setForm((prev) => ({ ...prev, etapa_atual: autoUpdateEtapa }));
    }
  }, [autoUpdateEtapa]);

  const { currentUser } = useAdminStore();

  const toggleEtapa = (etapa: EtapaEdital) => {
    const habilitadas = form.etapas_habilitadas || [];
    if (habilitadas.includes(etapa)) {
      setForm({
        ...form,
        etapas_habilitadas: habilitadas.filter((e) => e !== etapa),
      });
    } else {
      setForm({ ...form, etapas_habilitadas: [...habilitadas, etapa] });
    }
  };

  const markStageAsCompleted = (etapa: EtapaEdital, dataReal: string) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString();

    // Check if on time (before 2pm on the scheduled date)
    const scheduledDate = cronograma[CRONOGRAMA_KEYS[etapa]];
    let noPrazo = true;
    if (scheduledDate === today) {
      const currentHour = new Date().getHours();
      if (currentHour >= 14) {
        noPrazo = false;
      }
    } else if (scheduledDate && scheduledDate < today) {
      noPrazo = false;
    }

    const newHistory = [...(form.historico_etapas || [])];
    const existingIndex = newHistory.findIndex((h: any) => h.etapa === etapa);

    const entry = {
      etapa,
      concluida: true,
      data_conclusao: dataReal,
      usuario_conclusao: currentUser?.nome_completo || "Analista",
      timestamp_conclusao: `${today} ${now}`,
      no_prazo: noPrazo,
    };

    if (existingIndex >= 0) {
      newHistory[existingIndex] = entry;
    } else {
      newHistory.push(entry);
    }

    setForm({ ...form, historico_etapas: newHistory });
    toast.success(`${ETAPA_LABELS[etapa]} marcada como concluída!`);
  };

  const applyTemplate = (type: "comum" | "especifico") => {
    if (type === "comum") {
      setForm({
        ...form,
        etapas_habilitadas: [
          "validacao_edital",
          "inscricoes",
          "triagem",
          "resultado_da_triagem",
          "avaliacao_especifica_online",
          "resultado_final_avaliacao_especifica_online",
          "entrevistas",
          "resultado_final",
        ],
      });
    } else {
      setForm({
        ...form,
        etapas_habilitadas: [
          "validacao_edital",
          "inscricoes",
          "triagem",
          "envio_certificados_titulos",
          "declaracao_experiencia",
          "analise_curricular_preliminar",
          "recurso_analise_curricular",
          "analise_curricular_final",
          "entrevistas",
          "resultado_final",
        ],
      });
    }
  };

  const save = () => {
    updateVaga(vaga.id, {
      acompanhamento: form,
      cronograma: cronograma,
      total_inscritos: form.total_inscritos,
      aprovados_triagem: form.aprovados_triagem,
      aprovados_finais: form.aprovados_finais,
      convocados_entrevista: form.convocados_entrevista,
      // Update overall status to help with monitoring
      status_edital:
        form.etapa_atual === "encerramento" ? "Encerrada" : "Em andamento",
    });
    toast.success("Acompanhamento operacional atualizado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Painel Operacional do Edital
                </CardTitle>
                <Badge
                  className={`${getEtapaColor(form.etapa_atual)} font-bold px-3 py-1`}
                >
                  Etapa:{" "}
                  {ETAPA_LABELS[form.etapa_atual as EtapaEdital] ||
                    form.etapa_atual}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Acompanhamento de Etapas
                  </h4>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Marque a conclusão para atualizar o fluxo
                  </div>
                </div>

                <div className="space-y-3">
                  {TODAS_AS_ETAPAS.filter((e) =>
                    (form.etapas_habilitadas || []).includes(e),
                  ).map((e) => {
                    const status = (form.historico_etapas || []).find(
                      (h: any) => h.etapa === e,
                    );
                    const isCompleted = status?.concluida;
                    const isCurrent = form.etapa_atual === e;
                    const scheduledDate = cronograma[CRONOGRAMA_KEYS[e]];

                    return (
                      <div
                        key={e}
                        className={`p-4 rounded-xl border transition-all ${
                          isCompleted
                            ? "bg-green-50/30 border-green-100"
                            : isCurrent
                              ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                              : "bg-white border-slate-100"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isCompleted
                                  ? "bg-green-500 text-white"
                                  : isCurrent
                                    ? "bg-primary text-white animate-pulse"
                                    : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                TODAS_AS_ETAPAS.indexOf(e) + 1
                              )}
                            </div>
                            <div>
                              <p
                                className={`font-bold text-sm ${isCompleted ? "text-green-700" : isCurrent ? "text-primary" : "text-slate-700"}`}
                              >
                                {ETAPA_LABELS[e]}
                              </p>
                              {scheduledDate && (
                                <p className="text-[11px] text-slate-400 font-medium uppercase">
                                  Previsto: {formatDate(scheduledDate)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <div className="text-right">
                                <p className="text-[11px] font-bold text-green-600 uppercase">
                                  Concluído em: {status.data_conclusao}
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  Por: {status.usuario_conclusao}
                                </p>
                                {status.no_prazo === false && (
                                  <Badge className="bg-red-50 text-red-600 border-red-100 text-[8px] h-4 mt-0.5">
                                    ATRASO
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={cn(
                                        "h-8 w-40 justify-start text-left font-semibold border-slate-200 hover:bg-slate-50 transition-all rounded-lg shadow-sm text-[11px]",
                                      )}
                                    >
                                      <Calendar className="mr-2 h-3 w-3 text-primary" />
                                      {document.getElementById(`date-${e}`)
                                        ? (
                                            document.getElementById(
                                              `date-${e}`,
                                            ) as HTMLInputElement
                                          ).value
                                        : format(new Date(), "dd/MM/yyyy")}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0 z-[9999]"
                                    align="end"
                                    sideOffset={8}
                                  >
                                    <CalendarComponent
                                      mode="single"
                                      onSelect={(date) => {
                                        if (date) {
                                          const isoDate = date
                                            .toISOString()
                                            .split("T")[0];
                                          const input = document.getElementById(
                                            `date-${e}`,
                                          ) as HTMLInputElement;
                                          if (input) input.value = isoDate;
                                          // Trigger a re-render if needed, but here we just use the ref/id
                                        }
                                      }}
                                      initialFocus
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <input
                                  type="hidden"
                                  id={`date-${e}`}
                                  defaultValue={
                                    new Date().toISOString().split("T")[0]
                                  }
                                />
                                <Button
                                  size="sm"
                                  className="h-8 text-[11px] font-bold uppercase bg-primary hover:bg-primary/90 rounded-lg shadow-sm"
                                  onClick={() => {
                                    const dateInput = document.getElementById(
                                      `date-${e}`,
                                    ) as HTMLInputElement;
                                    markStageAsCompleted(
                                      e,
                                      dateInput.value ||
                                        new Date().toISOString().split("T")[0],
                                    );
                                  }}
                                >
                                  Marcar Concluída
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Indicadores de Funil
                  </h4>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Preenchimento operacional
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    {
                      label: "Inscritos",
                      key: "total_inscritos",
                      icon: Users,
                      color: "text-blue-600",
                    },
                    {
                      label: "Triagem OK",
                      key: "aprovados_triagem",
                      icon: SearchIcon,
                      color: "text-purple-600",
                    },
                    {
                      label: "Avaliação OK",
                      key: "aprovados_avaliacao_especifica",
                      icon: Zap,
                      color: "text-cyan-600",
                    },
                    {
                      label: "Entrevista",
                      key: "convocados_entrevista",
                      icon: UserCheck,
                      color: "text-amber-600",
                    },
                    {
                      label: "Aprovados",
                      key: "aprovados_finais",
                      icon: CheckCircle,
                      color: "text-green-600",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          {item.label}
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={form[item.key] || 0}
                        onChange={(e) =>
                          setForm({ ...form, [item.key]: +e.target.value })
                        }
                        className="h-8 bg-white border-slate-200 font-bold text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Observações Operacionais / Próximos Passos
                </label>
                <Textarea
                  value={form.observacoes_etapa}
                  onChange={(e) =>
                    setForm({ ...form, observacoes_etapa: e.target.value })
                  }
                  placeholder="Registre aqui detalhes sobre o andamento, problemas encontrados ou decisões tomadas nesta etapa..."
                  className="min-h-[100px] bg-white border-slate-200"
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">
                    Geração de Banco de Talentos
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium italic">
                    Marque se este edital resultou em um banco para cadastro
                    reserva.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.gerou_banco}
                    onChange={(e) =>
                      setForm({ ...form, gerou_banco: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  {form.gerou_banco && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-amber-700 uppercase">
                        Qtd:
                      </span>
                      <Input
                        type="number"
                        value={form.quantidade_banco}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            quantidade_banco: +e.target.value,
                          })
                        }
                        className="h-8 w-16 bg-white border-amber-200 font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Configuração e Cronograma
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate("comum")}
                  className="h-8 border-2"
                >
                  Template Comum
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate("especifico")}
                  className="h-8 border-2"
                >
                  Template Saúde/Títulos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm({ ...form, etapas_habilitadas: TODAS_AS_ETAPAS })
                  }
                  className="h-8 text-primary"
                >
                  Habilitar Todas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-slate-600 gap-1.5"
                  onClick={() => {
                    const etapasAtivas = (form.etapas_habilitadas ||
                      []) as EtapaEdital[];
                    const primeiraData = etapasAtivas
                      .map((e) => cronograma[CRONOGRAMA_KEYS[e]])
                      .find(Boolean);
                    if (!primeiraData) {
                      toast.error(
                        "Defina ao menos uma data antes de replicar.",
                      );
                      return;
                    }
                    const novosCronograma = { ...cronograma };
                    etapasAtivas.forEach((e) => {
                      const key = CRONOGRAMA_KEYS[e];
                      if (!novosCronograma[key]) {
                        novosCronograma[key] = primeiraData;
                      }
                    });
                    setCronograma(novosCronograma);
                    toast.success("Datas replicadas para etapas sem data.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Replicar Datas
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {TODAS_AS_ETAPAS.map((etapa) => {
                  const isHabilitada = (form.etapas_habilitadas || []).includes(
                    etapa,
                  );
                  const cronoKey = CRONOGRAMA_KEYS[etapa];

                  return (
                    <div
                      key={etapa}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isHabilitada ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-dashed border-slate-200 opacity-60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isHabilitada}
                          onChange={() => toggleEtapa(etapa)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span
                          className={`text-xs font-bold ${isHabilitada ? "text-slate-700" : "text-slate-400"}`}
                        >
                          {ETAPA_LABELS[etapa]}
                        </span>
                      </div>
                      {isHabilitada && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-32 justify-start text-left font-semibold border-slate-200 hover:bg-slate-50 transition-all rounded-lg shadow-sm text-[11px]",
                              )}
                            >
                              <Calendar className="mr-2 h-3 w-3 text-primary" />
                              {cronograma[cronoKey]
                                ? format(
                                    parseLocalDate(cronograma[cronoKey]),
                                    "dd/MM/yyyy",
                                  )
                                : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0 z-[9999]"
                            align="end"
                            sideOffset={8}
                          >
                            <CalendarComponent
                              mode="single"
                              selected={
                                cronograma[cronoKey]
                                  ? parseLocalDate(cronograma[cronoKey])
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (date) {
                                  setCronograma({
                                    ...cronograma,
                                    [cronoKey]: formatLocalDate(date),
                                  });
                                }
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Resumo Visual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
                {TODAS_AS_ETAPAS.filter((e) =>
                  (form.etapas_habilitadas || []).includes(e),
                ).map((e) => {
                  const status = (form.historico_etapas || []).find(
                    (h: any) => h.etapa === e,
                  );
                  const isCompleted = status?.concluida;
                  const isCurrent = form.etapa_atual === e;
                  const cronoKey = CRONOGRAMA_KEYS[e];
                  const date = cronograma[cronoKey];

                  return (
                    <div key={e} className="relative">
                      <div
                        className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                          isCurrent
                            ? "border-primary scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                            : isCompleted
                              ? "border-green-500 bg-green-500"
                              : "border-slate-300"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-bold ${isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-slate-500"}`}
                        >
                          {ETAPA_LABELS[e]}
                        </span>
                        {date && (
                          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">
                            Previsto: {formatDate(date)}
                          </span>
                        )}
                        {isCompleted && status.data_conclusao && (
                          <span className="text-[9px] text-green-600 font-bold uppercase">
                            Realizado: {formatDate(status.data_conclusao)}
                          </span>
                        )}
                        {isCurrent && (
                          <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/10">
                            <p className="text-[9px] font-bold text-primary uppercase">
                              Etapa em andamento
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
              Ações
            </h4>
            <div className="flex flex-col gap-3">
              <Button
                onClick={save}
                className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold h-12"
              >
                Salvar Acompanhamento
              </Button>
            </div>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              As alterações serão registradas no histórico da vaga.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditalTab({ vagaId, edital }: { vagaId: string; edital: any }) {
  const { updateEdital, addEdital } = useVagasStore();
  const [form, setForm] = useState(
    edital || {
      id: `e-${Date.now()}`,
      vaga_id: vagaId,
      numero_processo: "",
      numero_edital: "",
      data_abertura_edital: "",
      data_prova: "",
      data_entrevista: "",
      data_encerramento_edital: "",
      etapa_atual: "inscricoes",
      total_inscritos: 0,
      aprovados_triagem: 0,
      convocados_entrevista: 0,
      aprovados_finais: 0,
      possui_banco_talentos: false,
      status_publicacao: "pendente",
    },
  );
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const save = () => {
    if (edital) {
      updateEdital(edital.id, form);
    } else {
      addEdital(form);
    }
    toast.success("Edital salvo!");
  };

  const handleViewFile = async () => {
    if (!form.arquivo_path) return;
    setIsLoadingFile(true);
    try {
      const { data, error } = await supabase.storage
        .from("editais")
        .createSignedUrl(form.arquivo_path, 3600);
      if (error || !data?.signedUrl) {
        toast.error("Arquivo não encontrado. Faça o upload novamente.");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Erro ao gerar link do arquivo.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Apenas arquivos PDF são aceitos para editais.");
      return;
    }
    setIsUploading(true);
    try {
      const path = `${vagaId}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error } = await supabase.storage
        .from("editais")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const updated = { ...form, arquivo_path: path, arquivo_nome: file.name };
      setForm(updated);
      if (edital) {
        updateEdital(edital.id, updated);
      } else {
        addEdital(updated);
      }
      toast.success("Arquivo do edital salvo com sucesso.");
    } catch (err: any) {
      toast.error(`Erro ao fazer upload: ${err.message || "Tente novamente."}`);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nº Processo Administrativo
            </label>
            <Input
              value={form.numero_processo}
              onChange={(e) =>
                setForm({ ...form, numero_processo: e.target.value })
              }
              className="bg-white border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nº Edital de Seleção
            </label>
            <Input
              value={form.numero_edital}
              onChange={(e) =>
                setForm({ ...form, numero_edital: e.target.value })
              }
              className="bg-white border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Data de Publicação
            </label>
            <Input
              type="date"
              value={form.data_abertura_edital}
              onChange={(e) =>
                setForm({ ...form, data_abertura_edital: e.target.value })
              }
              className="bg-white border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Etapa Atual do Edital
            </label>
            <Select
              value={form.etapa_atual}
              onValueChange={(v) => setForm({ ...form, etapa_atual: v })}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ETAPA_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">
              Total Inscritos
            </label>
            <Input
              type="number"
              value={form.total_inscritos}
              onChange={(e) =>
                setForm({ ...form, total_inscritos: +e.target.value })
              }
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">
              Aprovados Triagem
            </label>
            <Input
              type="number"
              value={form.aprovados_triagem}
              onChange={(e) =>
                setForm({ ...form, aprovados_triagem: +e.target.value })
              }
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">
              Entrevistados
            </label>
            <Input
              type="number"
              value={form.convocados_entrevista}
              onChange={(e) =>
                setForm({ ...form, convocados_entrevista: +e.target.value })
              }
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">
              Aprovados Finais
            </label>
            <Input
              type="number"
              value={form.aprovados_finais}
              onChange={(e) =>
                setForm({ ...form, aprovados_finais: +e.target.value })
              }
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">
              Gerou Banco?
            </label>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={form.gerou_banco}
                onChange={(e) =>
                  setForm({ ...form, gerou_banco: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {form.gerou_banco && (
                <Input
                  type="number"
                  placeholder="Qtd."
                  value={form.quantidade_banco}
                  onChange={(e) =>
                    setForm({ ...form, quantidade_banco: +e.target.value })
                  }
                  className="h-8 w-20 bg-white"
                />
              )}
            </div>
          </div>
        </div>
        {/* Arquivo do Edital */}
        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Arquivo do Edital (PDF)
          </label>
          {form.arquivo_path ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate">
                  {form.arquivo_nome || form.arquivo_path}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleViewFile}
                disabled={isLoadingFile}
              >
                {isLoadingFile ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />{" "}
                    Abrindo...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir PDF
                  </>
                )}
              </Button>
              <label className="cursor-pointer">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  disabled={isUploading}
                >
                  <span>{isUploading ? "Enviando..." : "Substituir"}</span>
                </Button>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          ) : (
            <label className="cursor-pointer flex items-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <div className="bg-slate-100 group-hover:bg-primary/10 p-2 rounded-lg transition-colors">
                <FileSpreadsheet className="h-5 w-5 text-slate-400 group-hover:text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600 group-hover:text-primary">
                  {isUploading
                    ? "Enviando arquivo..."
                    : "Clique para anexar o PDF do edital"}
                </p>
                <p className="text-xs text-slate-400">Apenas arquivos PDF</p>
              </div>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 px-8"
          >
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidacaoTab({ vagaId }: { vagaId: string; validacao?: any }) {
  const { getVaga, updateVagaAsync } = useVagasStore();
  const { currentUser } = useAdminStore();
  const vaga = getVaga(vagaId);
  const [confirming, setConfirming] = useState<
    "concluida" | "cancelada" | "suspensa" | null
  >(null);

  const statusProcesso = vaga?.status_processo;
  const isAlreadyClosed =
    statusProcesso === "Concluída" ||
    statusProcesso === "Cancelada" ||
    statusProcesso === "Suspensa";

  const handleAcao = async (acao: "concluida" | "cancelada" | "suspensa") => {
    if (!vaga) return;
    const map = {
      concluida: "Concluída",
      cancelada: "Cancelada",
      suspensa: "Suspensa",
    } as const;
    const novoStatus = map[acao];
    const today = new Date().toISOString().split("T")[0];
    const descMap = {
      concluida: "Convocação finalizada — vaga concluída",
      cancelada: "Vaga cancelada",
      suspensa: "Vaga suspensa",
    };
    await updateVagaAsync(vaga.id, {
      status_processo: novoStatus,
      historico: [
        ...(vaga.historico || []),
        {
          id: `h-${Date.now()}`,
          data: today,
          descricao: descMap[acao],
          usuario: currentUser?.nome_completo || "Sistema",
        },
      ],
    });
    setConfirming(null);
    toast.success(`Status atualizado para "${novoStatus}"`);
  };

  const ACOES = [
    {
      key: "concluida" as const,
      label: "Finalizar Convocação da Vaga",
      desc: "Marca o processo como concluído com sucesso",
      icon: <CheckCircle2 className="h-6 w-6" />,
      color:
        "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      confirmColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      key: "cancelada" as const,
      label: "Cancelar Vaga",
      desc: "Encerra o processo sem preenchimento da vaga",
      icon: <XCircle className="h-6 w-6" />,
      color:
        "border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50",
      iconBg: "bg-red-100",
      badgeBg: "bg-red-50 border-red-200 text-red-700",
      confirmColor: "bg-red-600 hover:bg-red-700 text-white",
    },
    {
      key: "suspensa" as const,
      label: "Suspender Vaga",
      desc: "Pausa temporariamente o processo seletivo",
      icon: <AlertCircle className="h-6 w-6" />,
      color:
        "border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50",
      iconBg: "bg-amber-100",
      badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
      confirmColor: "bg-amber-600 hover:bg-amber-700 text-white",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Encerramento do Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isAlreadyClosed ? (
          <div
            className={`flex items-center gap-3 p-5 rounded-xl border-2 ${
              statusProcesso === "Concluída"
                ? "bg-emerald-50 border-emerald-200"
                : statusProcesso === "Cancelada"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            {statusProcesso === "Concluída" ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
            ) : statusProcesso === "Cancelada" ? (
              <XCircle className="h-7 w-7 text-red-600 shrink-0" />
            ) : (
              <AlertCircle className="h-7 w-7 text-amber-600 shrink-0" />
            )}
            <div>
              <p
                className={`font-bold text-base ${
                  statusProcesso === "Concluída"
                    ? "text-emerald-700"
                    : statusProcesso === "Cancelada"
                      ? "text-red-700"
                      : "text-amber-700"
                }`}
              >
                Vaga {statusProcesso}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                O processo foi encerrado. Para reabrir, altere o status no
                painel "Fluxo do Processo".
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 pb-2">
              Selecione a ação de encerramento para esta vaga. Esta operação irá
              alterar o status do processo.
            </p>
            <div className="grid gap-3">
              {ACOES.map((acao) => (
                <div key={acao.key}>
                  {confirming === acao.key ? (
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border-2 gap-4 ${acao.color}`}
                    >
                      <p className="text-sm font-semibold">
                        Confirmar:{" "}
                        <span className="font-bold">{acao.label}</span>?
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirming(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className={`gap-1.5 ${acao.confirmColor}`}
                          onClick={() => handleAcao(acao.key)}
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(acao.key)}
                      className={`w-full flex items-center justify-between py-4 px-5 rounded-xl border-2 transition-all group ${acao.color}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${acao.iconBg}`}>
                          {acao.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-base">{acao.label}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {acao.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AproveitamentoBancoTab({ vaga }: { vaga: any }) {
  const { bancos } = useVagasStore();
  const [search, setSearch] = useState("");
  const [showFullBanco, setShowFullBanco] = useState(false);
  const [convocacaoInitial, setConvocacaoInitial] = useState<any>(null);
  const [isConvocacaoOpen, setIsConvocacaoOpen] = useState(false);

  const withScores = useMemo(() => {
    return bancos
      .map((b) => ({
        ...b,
        _score: calcSimilarity(vaga.cargo, (b as any).cargo || ""),
      }))
      .filter((b) => b._score > 0)
      .sort((a, b) => {
        if (Math.abs(b._score - a._score) > 0.01) return b._score - a._score;
        return (
          (Number((a as any).classificacao) || 9999) -
          (Number((b as any).classificacao) || 9999)
        );
      })
      .slice(0, 150);
  }, [bancos, vaga.cargo]);

  const hasMatches = withScores.length > 0;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!hasMatches || showFullBanco) {
      // Full banco search mode
      const pool = bancos.map((b) => ({ ...b, _score: 0 as number }));
      const sorted = pool.sort(
        (a, b) =>
          (Number((a as any).classificacao) || 9999) -
          (Number((b as any).classificacao) || 9999),
      );
      if (!s) return sorted.slice(0, 150);
      return sorted
        .filter(
          (b) =>
            ((b as any).nome || "").toLowerCase().includes(s) ||
            ((b as any).cargo || "").toLowerCase().includes(s) ||
            ((b as any).unidade || "").toLowerCase().includes(s),
        )
        .slice(0, 150);
    }
    // Similarity mode
    if (!s) return withScores;
    return withScores.filter(
      (b) =>
        ((b as any).nome || "").toLowerCase().includes(s) ||
        ((b as any).cargo || "").toLowerCase().includes(s) ||
        ((b as any).unidade || "").toLowerCase().includes(s),
    );
  }, [hasMatches, showFullBanco, withScores, bancos, search]);

  const handleConvocar = (candidato: any) => {
    setConvocacaoInitial({
      nome_candidato: candidato.nome || "",
      vaga_id: vaga.id,
      cargo: vaga.cargo,
      unidade: vaga.unidade,
      secao: vaga.secao || "",
      requisicao: vaga.requisicao || vaga.numero_requisicao || "",
      edital_relacionado: candidato.numero_edital || "",
      banco_relacionado: candidato.id,
      classificacao: Number(candidato.classificacao) || 1,
    });
    setIsConvocacaoOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            {showFullBanco
              ? "Banco de Talentos — Busca Manual"
              : "Candidatos com Perfil Similar"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {showFullBanco ? (
              "Exibindo todos os candidatos. Use a busca para filtrar."
            ) : (
              <>
                Ordenados por similaridade com{" "}
                <span className="font-semibold text-slate-700">
                  "{vaga.cargo}"
                </span>
              </>
            )}
          </p>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            className="pl-8 h-8 text-sm bg-white border-slate-200"
            placeholder="Buscar nome, cargo, unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        <span className="font-bold text-slate-700">{filtered.length}</span>{" "}
        candidato(s) encontrado(s)
      </p>

      {!hasMatches && !showFullBanco ? (
        <Card className="border-amber-100 bg-amber-50 shadow-sm">
          <CardContent className="py-10 text-center space-y-4">
            <div className="bg-amber-100 p-4 rounded-full w-fit mx-auto">
              <Users className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-800 font-semibold">
                Nenhum candidato com perfil similar encontrado para{" "}
                <span className="font-bold">"{vaga.cargo}"</span>.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Não foi encontrada correspondência automática com os cargos do
                banco de talentos.
              </p>
            </div>
            <Button
              onClick={() => setShowFullBanco(true)}
              className="gap-2 bg-primary mx-auto"
            >
              <Search className="h-4 w-4" />
              Buscar manualmente no Banco de Talentos
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-slate-500 font-medium">
              Nenhum resultado{search.trim() ? ` para "${search}"` : ""}.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tente outros termos de busca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-16 text-center">Sim.</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Cargo (Banco)</TableHead>
                  <TableHead className="text-center w-16">Class.</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right w-24">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const score = (b as any)._score as number;
                  const scoreLabel = `${Math.round(score * 100)}%`;
                  const scoreStyle =
                    score >= 0.8
                      ? "bg-green-100 text-green-700"
                      : score >= 0.5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600";
                  return (
                    <TableRow
                      key={(b as any).id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${scoreStyle}`}
                        >
                          {scoreLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">
                            {(b as any).nome || "—"}
                          </p>
                          {(b as any).cpf && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {(b as any).cpf}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p
                          className="text-xs text-slate-600 max-w-[220px] truncate"
                          title={(b as any).cargo}
                        >
                          {(b as any).cargo}
                        </p>
                        {(b as any).numero_edital && (
                          <p className="text-[10px] text-slate-400">
                            {(b as any).numero_edital}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {(b as any).classificacao
                          ? `${(b as any).classificacao}º`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {(b as any).unidade || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const st = String(
                            (b as any).status_calculado ||
                              (b as any).status ||
                              "",
                          );
                          const isConvocado =
                            st.toLowerCase().includes("convocado") ||
                            st === "Convocado(a)";
                          return (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${isConvocado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}
                            >
                              {isConvocado ? "Convocado(a)" : st}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-7 text-xs font-bold gap-1.5 bg-primary"
                          onClick={() => handleConvocar(b)}
                        >
                          <Send className="h-3 w-3" />
                          Convocar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {isConvocacaoOpen && (
        <ConvocacaoDialog
          open={isConvocacaoOpen}
          onOpenChange={setIsConvocacaoOpen}
          vaga={vaga}
          initialData={convocacaoInitial}
        />
      )}
    </div>
  );
}

function ConvocacoesTab({
  vagaId,
  onNewConvocacao,
}: {
  vagaId: string;
  onNewConvocacao: () => void;
}) {
  const { getConvocacoesByVaga, fetchConvocacoes } = useVagasStore();
  const convocacoes = getConvocacoesByVaga(vagaId);
  const [selectedConvocacao, setSelectedConvocacao] =
    useState<Convocacao | null>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);

  useEffect(() => {
    fetchConvocacoes();
  }, [vagaId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Histórico de Convocações
        </h3>
        <Button
          onClick={onNewConvocacao}
          size="sm"
          className="gap-2 bg-primary"
        >
          <Plus className="h-4 w-4" /> Nova Convocação
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Candidato</TableHead>
                <TableHead className="text-center">Class.</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>E-doc</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocacoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {formatDate(c.data_convocacao)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {c.horario}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {c.nome_candidato}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {c.tipo_convocacao}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-600">
                    {c.classificacao}º
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[11px] font-bold">
                      {String(c.status || "SEM STATUS").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-primary font-bold">
                    {c.edoc || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedConvocacao(c);
                        setIsDetalhesOpen(true);
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {convocacoes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 font-medium italic"
                  >
                    Nenhuma convocação realizada para esta vaga.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConvocacaoDetalhesModal
        convocacao={selectedConvocacao}
        open={isDetalhesOpen}
        onOpenChange={setIsDetalhesOpen}
      />
    </div>
  );
}
