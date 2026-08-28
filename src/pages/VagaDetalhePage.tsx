import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
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
  StatusProcessoBadge,
  STATUS_CONFIG as PROCESSO_STATUS_CONFIG,
  getStatusProcessoConfig,
} from "@/components/StatusProcessoBadge";
import {
  calcDiasAberto,
  formatDate,
  getValidacaoColor,
  getEtapaColor,
  getStatusColor,
  unitIsAllowed,
  normalizeUnitName,
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
  ExternalLink,
  Edit,
  Copy,
  Target,
  ChevronRight,
  MessageSquare,
  Loader2,
  ThumbsUp,
  AtSign,
  Trash2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  ChangeEvent,
  useCallback,
} from "react";
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

const TRATATIVAS_TEIA = [
  "Aguardando Unidade",
  "Em Processo Seletivo",
  "Vaga de Liderança",
] as const;

const ETAPAS_TEIA = [
  "Aguardando Unidade",
  "Divulgação",
  "Triagem",
  "Entrevista",
  "Documentação",
  "Enviado para Formalização",
  "Admissão Efetivada",
];

const ETAPAS_POR_TRATATIVA_TEIA: Record<string, string[]> = {
  "Aguardando Unidade": ETAPAS_TEIA,
  "Em Processo Seletivo": ETAPAS_TEIA,
  "Vaga de Liderança": ETAPAS_TEIA,
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

interface ObsLike {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  liked_at: string;
}

interface ObsItem {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string; // ISO or '' for legacy
  likes?: ObsLike[];
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

function ObsLikeButton({
  likes,
  currentUserId,
  onToggle,
}: {
  likes: ObsLike[];
  currentUserId: string;
  onToggle: () => void;
}) {
  const isLiked = likes.some((l) => l.user_id === currentUserId);
  const count = likes.length;

  const btn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`group flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-200 select-none
        ${
          isLiked
            ? "text-blue-500 hover:text-blue-400 hover:bg-blue-50"
            : "text-slate-400 hover:text-blue-400 hover:bg-blue-50/60 opacity-0 group-hover/obs:opacity-100"
        }`}
      aria-label={isLiked ? "Remover curtida" : "Curtir"}
    >
      <ThumbsUp
        className={`h-3.5 w-3.5 transition-all duration-200 ${
          isLiked
            ? "fill-blue-500 stroke-blue-500 scale-110"
            : "fill-transparent stroke-current group-hover:stroke-blue-400"
        }`}
      />
      {count > 0 && (
        <span className="text-[11px] font-semibold tabular-nums">{count}</span>
      )}
    </button>
  );

  if (count === 0) return btn;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="p-0 border-0 shadow-2xl bg-transparent"
        >
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-3 min-w-[148px] max-w-[220px]">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2.5 px-0.5">
              Curtido por
            </p>
            <div className="space-y-1.5">
              {likes.map((like) => (
                <div key={like.user_id} className="flex items-center gap-2">
                  {like.avatar_url ? (
                    <img
                      src={like.avatar_url}
                      alt={like.user_name}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-primary/25 text-primary flex items-center justify-center text-[8px] font-bold ring-1 ring-slate-700 shrink-0">
                      {like.user_name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] text-slate-200 font-medium truncate leading-tight">
                    {like.user_name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Admin delete button ─────────────────────────────────────────────────────

function ObsDeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="absolute top-2.5 right-2.5 opacity-0 group-hover/obs:opacity-100 transition-all duration-150
            p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50
            focus-visible:opacity-100 focus-visible:outline-none"
          aria-label="Excluir observação"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-auto p-0 border-slate-200/80 shadow-xl rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-3.5 pb-1">
          <p className="text-[13px] font-semibold text-slate-800 leading-tight">
            Excluir observação?
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-2">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 h-7 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="flex-1 h-7 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Excluir
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Mention helpers ─────────────────────────────────────────────────────────

/** Inline chip for a resolved @mention — shows avatar + full name on hover */
function ObsMentionChip({ token, users }: { token: string; users: any[] }) {
  // token is "@Pedro_Augusto" — match against the slug of the full name
  const slug = token.slice(1).toLowerCase();
  const user = users.find(
    (u: any) =>
      u.nome_completo?.trim().replace(/\s+/g, "_").toLowerCase() === slug,
  );

  const chip = (
    <span className="inline-flex items-center gap-0.5 text-primary font-semibold bg-primary/10 rounded px-1 py-0 cursor-default align-baseline">
      {token}
    </span>
  );

  if (!user) return chip;

  const initials = user.nome_completo
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="p-0 border-0 shadow-2xl bg-transparent"
        >
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5 min-w-[160px]">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nome_completo}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/25 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-slate-700 shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white leading-tight truncate">
                {user.nome_completo}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight truncate">
                {user.perfil}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Render obs text, replacing @Mention tokens with interactive chips */
function renderObsText(text: string, users: any[]) {
  const parts = text.split(/(@\S+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@\S/.test(part) ? (
          <ObsMentionChip key={i} token={part} users={users} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Extract user objects that are @mentioned in text.
 *  Tokens are stored as @Full_Name slugs so two users with the same
 *  first name resolve to the correct person. */
function extractMentionedUsers(text: string, users: any[]): any[] {
  const matches = text.match(/@(\S+)/g);
  if (!matches) return [];
  const seen = new Map<string, any>();
  matches.forEach((m) => {
    const slug = m.slice(1).toLowerCase(); // e.g. "pedro_augusto"
    const user = users.find(
      (u: any) =>
        u.nome_completo?.trim().replace(/\s+/g, "_").toLowerCase() === slug,
    );
    if (user && !seen.has(user.id)) seen.set(user.id, user);
  });
  return Array.from(seen.values());
}

/** Floating dropdown for @mention autocomplete */
function ObsMentionDropdown({
  users,
  activeIndex,
  onSelect,
}: {
  users: any[];
  activeIndex: number;
  onSelect: (user: any) => void;
}) {
  if (users.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 mb-1.5 z-50 w-full max-w-[280px] bg-white rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden">
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
        <AtSign className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Mencionar
        </span>
      </div>
      <div className="p-1 flex flex-col gap-0.5">
        {users.map((u, i) => (
          <button
            key={u.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // keep textarea focused
              onSelect(u);
            }}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors w-full ${
              i === activeIndex
                ? "bg-primary/10 text-primary"
                : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            {u.avatar_url ? (
              <img
                src={u.avatar_url}
                alt={u.nome_completo}
                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                {(u.nome_completo || "?")
                  .split(" ")
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate leading-tight">
                {u.nome_completo}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {u.perfil}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VagaDetalhePage() {
  const { isDark } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Sync dark mode to body so Radix portals (Select, Popover, Dialog) inherit CSS vars
  useEffect(() => {
    if (isDark) document.body.classList.add("gdp-dark");
    else document.body.classList.remove("gdp-dark");
    return () => document.body.classList.remove("gdp-dark");
  }, [isDark]);
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
    createNotificacao,
  } = useVagasStore();
  const { currentUser, addAuditLog, users, fetchUsers } = useAdminStore();
  const permissions = usePermissions();

  const [isConvocacaoDialogOpen, setIsConvocacaoDialogOpen] = useState(false);
  const [isCreateBancoDialogOpen, setIsCreateBancoDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isEditingIndicators, setIsEditingIndicators] = useState(false);
  const [newObsText, setNewObsText] = useState("");
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const obsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const justificativaTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [justificativaMentionQuery, setJustificativaMentionQuery] = useState<string | null>(null);
  const [justificativaMentionIndex, setJustificativaMentionIndex] = useState(0);
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
  const [showEtapaRequiredAlert, setShowEtapaRequiredAlert] = useState(false);

  const [isQuickConvocacaoOpen, setIsQuickConvocacaoOpen] = useState(false);
  const [matchedBanco, setMatchedBanco] = useState<any>(null);
  const [isRequestUpdateOpen, setIsRequestUpdateOpen] = useState(false);
  const [justificativaDialog, setJustificativaDialog] = useState<{
    slot: number;
    status: "Cancelada" | "Suspensa";
  } | null>(null);
  const [justificativaText, setJustificativaText] = useState("");
  const [isSavingJustificativa, setIsSavingJustificativa] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dados");

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.nome_completo && u.avatar_url)
        map.set(u.nome_completo, u.avatar_url);
    });
    return map;
  }, [users]);

  // Dynamically resolves analyst from unidades_responsavel when analista_responsavel is null
  const resolvedAnalista = useMemo(() => {
    if (vaga?.analista_responsavel) return vaga.analista_responsavel;
    if (!vaga?.unidade) return null;
    const analysts = (users || []).filter(
      (u: any) =>
        Array.isArray(u.unidades_responsavel) &&
        u.unidades_responsavel.length > 0,
    );
    let match = analysts.find((u: any) =>
      unitIsAllowed(vaga.unidade, u.unidades_responsavel),
    );
    if (!match) {
      const normUnidade = normalizeUnitName(vaga.unidade);
      match = analysts.find((u: any) =>
        u.unidades_responsavel.some((s: string) =>
          normUnidade.includes(normalizeUnitName(s)),
        ),
      );
    }
    return match?.nome_completo ?? null;
  }, [vaga?.analista_responsavel, vaga?.unidade, users]);

  // @mention autocomplete: only users who have access to this vaga
  // (same rule as VagasPage: visualiza_todas_unidades OR unit is in unidades_vinculadas)
  const mentionUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const vagaUnidade = vaga?.unidade;
    return (users || [])
      .filter((u: any) => {
        if (u.status !== "ativo") return false;
        if (!u.nome_completo?.toLowerCase().includes(q)) return false;
        if (u.visualiza_todas_unidades) return true;
        return unitIsAllowed(vagaUnidade, u.unidades_vinculadas || []);
      })
      .slice(0, 6);
  }, [mentionQuery, users, vaga?.unidade]);

  const justificativaMentionUsers = useMemo(() => {
    if (justificativaMentionQuery === null) return [];
    const q = justificativaMentionQuery.toLowerCase();
    const vagaUnidade = vaga?.unidade;
    return (users || [])
      .filter((u: any) => {
        if (u.status !== "ativo") return false;
        if (!u.nome_completo?.toLowerCase().includes(q)) return false;
        if (u.visualiza_todas_unidades) return true;
        return unitIsAllowed(vagaUnidade, u.unidades_vinculadas || []);
      })
      .slice(0, 6);
  }, [justificativaMentionQuery, users, vaga?.unidade]);

  const handleObsTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNewObsText(val);
      const cursor = e.target.selectionStart ?? val.length;
      const before = val.slice(0, cursor);
      const match = before.match(/@(\w*)$/);
      if (match) {
        setMentionQuery(match[1]);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
      }
    },
    [],
  );

  const handleSelectMention = useCallback(
    (user: any) => {
      const textarea = obsTextareaRef.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart ?? newObsText.length;
      const before = newObsText.slice(0, cursor);
      const after = newObsText.slice(cursor);
      // Use full name joined by underscores so two users with the same
      // first name (@Pedro_Augusto vs @Pedro_Ivo) are unambiguous.
      const slug = user.nome_completo.trim().replace(/\s+/g, "_");
      const replaced = before.replace(/@(\w*)$/, `@${slug} `);
      setNewObsText(replaced + after);
      setMentionQuery(null);
      setMentionIndex(0);
      setTimeout(() => {
        textarea.focus();
        const pos = replaced.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
      }, 0);
    },
    [newObsText],
  );

  const handleJustificativaTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setJustificativaText(val);
      const cursor = e.target.selectionStart ?? val.length;
      const before = val.slice(0, cursor);
      const match = before.match(/@(\w*)$/);
      if (match) {
        setJustificativaMentionQuery(match[1]);
        setJustificativaMentionIndex(0);
      } else {
        setJustificativaMentionQuery(null);
      }
    },
    [],
  );

  const handleJustificativaSelectMention = useCallback(
    (user: any) => {
      const textarea = justificativaTextareaRef.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart ?? justificativaText.length;
      const before = justificativaText.slice(0, cursor);
      const after = justificativaText.slice(cursor);
      const slug = user.nome_completo.trim().replace(/\s+/g, "_");
      const replaced = before.replace(/@(\w*)$/, `@${slug} `);
      setJustificativaText(replaced + after);
      setJustificativaMentionQuery(null);
      setJustificativaMentionIndex(0);
      setTimeout(() => {
        textarea.focus();
        const pos = replaced.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
      }, 0);
    },
    [justificativaText],
  );

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

  // Derives the top-level status_processo of a multi-vaga requisição from its slots.
  // Rule 1: ALL slots Concluída/Cancelada  → Concluída
  // Rule 2: ANY slot Em Andamento          → Em Andamento
  // Otherwise: preserve the current overall status.
  const deriveOverallStatus = (
    items: VagaFluxoItem[],
    currentStatus: StatusProcesso | undefined,
  ): StatusProcesso => {
    const statuses = items.map(
      (i) => (i.status_processo || "Solicitada") as StatusProcesso,
    );
    if (statuses.every((s) => s === "Concluída" || s === "Cancelada"))
      return "Concluída";
    if (statuses.some((s) => s === "Em Andamento")) return "Em Andamento";
    return currentStatus || "Solicitada";
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
    const overallSP = deriveOverallStatus(updated, vaga.status_processo);
    await updateVagaAsync(vaga.id, {
      distribuicao_vagas: updated as any,
      status_processo: overallSP,
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
    setMentionQuery(null);
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
      // Notify mentioned users
      const mentioned = extractMentionedUsers(newItem.text, users || []);
      for (const u of mentioned) {
        if (u.id !== currentUser.id) {
          const snippet =
            newItem.text.slice(0, 80) + (newItem.text.length > 80 ? "…" : "");
          createNotificacao({
            usuario_id: u.id,
            titulo: `${currentUser.nome_completo} mencionou você`,
            mensagem: `"${snippet}" — ${vaga.cargo || "Vaga"}${vaga.unidade ? " · " + vaga.unidade : ""}`,
            tipo: "mencao",
            registro_id: vaga.id,
          });
        }
      }
    }
    setIsSavingObs(false);
  };

  const handleToggleLike = async (obsId: string) => {
    if (!currentUser) return;
    const currentRaw = vaga.observacoes_internas || vaga.observacoes || "";
    const existing = parseObsItems(currentRaw);
    let targetItem: ObsItem | undefined;
    let isAdding = false;
    const updated = existing.map((item) => {
      if (item.id !== obsId) return item;
      targetItem = item;
      const likes = item.likes || [];
      const alreadyLiked = likes.some((l) => l.user_id === currentUser.id);
      isAdding = !alreadyLiked;
      return {
        ...item,
        likes: alreadyLiked
          ? likes.filter((l) => l.user_id !== currentUser.id)
          : [
              ...likes,
              {
                user_id: currentUser.id,
                user_name: currentUser.nome_completo,
                avatar_url: (currentUser as any).avatar_url || null,
                liked_at: new Date().toISOString(),
              },
            ],
      };
    });
    const serialized = JSON.stringify(updated);
    await updateVagaAsync(vaga.id, {
      observacao: serialized,
      observacoes_internas: serialized,
    } as any);
    // Notify the obs author (skip self-likes)
    if (isAdding && targetItem && targetItem.author_id !== currentUser.id) {
      const snippet =
        targetItem.text.slice(0, 80) + (targetItem.text.length > 80 ? "…" : "");
      createNotificacao({
        usuario_id: targetItem.author_id,
        titulo: `${currentUser.nome_completo} curtiu sua observação`,
        mensagem:
          `"${snippet}" — ${vaga.cargo || "Vaga"} · ${vaga.unidade || ""}`
            .trim()
            .replace(/·\s*$/, ""),
        tipo: "curtida",
        registro_id: vaga.id,
      });
    }
  };

  const handleDeleteObs = async (obsId: string) => {
    const currentRaw = vaga.observacoes_internas || vaga.observacoes || "";
    const existing = parseObsItems(currentRaw);
    const updated = existing.filter((item) => item.id !== obsId);
    const serialized = JSON.stringify(updated);
    const ok = await updateVagaAsync(vaga.id, {
      observacao: serialized,
      observacoes_internas: serialized,
    } as any);
    if (ok) toast.success("Observação excluída");
  };

  const handleConfirmarJustificativa = async () => {
    if (!justificativaDialog || !justificativaText.trim() || !currentUser)
      return;
    setIsSavingJustificativa(true);

    const prefix =
      justificativaDialog.status === "Cancelada"
        ? "[CANCELAMENTO]"
        : "[SUSPENSÃO]";
    const currentRaw = vaga.observacoes_internas || vaga.observacoes || "";
    const existing = parseObsItems(currentRaw);
    const newItem: ObsItem = {
      id: crypto.randomUUID(),
      text: `${prefix} ${justificativaText.trim()}`,
      author_id: currentUser.id,
      author_name: currentUser.nome_completo,
      author_avatar: (currentUser as any).avatar_url || null,
      created_at: new Date().toISOString(),
    };
    const serialized = JSON.stringify([newItem, ...existing]);
    await updateVagaAsync(vaga.id, {
      observacao: serialized,
      observacoes_internas: serialized,
    } as any);

    await handleFluxoSlotChange(
      justificativaDialog.slot,
      "status_processo",
      justificativaDialog.status,
    );

    setIsSavingJustificativa(false);
    setJustificativaDialog(null);
    setJustificativaText("");
    setJustificativaMentionQuery(null);
    toast.success("Status atualizado e justificativa registrada");
  };

  const isAdmin =
    currentUser?.perfil === "Administrador" || currentUser?.perfil === "Admin";

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
      if (field === "tratativa") {
        delete next.etapa; // reset etapa when tratativa changes
        // Auto-advance to "Em Andamento" when a tratativa is selected.
        // Skip if: user has already manually set a status in this session,
        // or the vaga is locked at Concluída / Cancelada.
        const userPickedStatus = "status_processo" in curr;
        const lockedSP =
          vaga.status_processo === "Concluída" ||
          vaga.status_processo === "Cancelada";
        if (value && !userPickedStatus && !lockedSP) {
          next.status_processo = "Em Andamento";
        }
      }
      return { ...prev, [slot]: next };
    });
    setFluxoDirty(true);
  };

  const handleFluxoSave = async () => {
    const vagaCount = Math.max(
      Number(vaga.numero_vagas || vaga.quantidade) || 1,
      1,
    );
    const today = new Date().toISOString();

    // Validate: if tratativa is set, etapa must also be set and valid
    const fluxoItemsForValidation = getFluxoItems(vaga);
    const isTeia =
      vaga.is_teia || (vaga.unidade || "").toUpperCase().includes("TEIA");
    const activeEtapaMapForValidation = isTeia
      ? ETAPAS_POR_TRATATIVA_TEIA
      : ETAPAS_POR_TRATATIVA;
    const slotsToValidate =
      vagaCount <= 1 ? [1] : fluxoItemsForValidation.map((i) => i.slot);
    for (const slot of slotsToValidate) {
      const draft = fluxoDraft[slot] || {};
      // Skip slots the user hasn't touched in this session — don't block
      // saving other slots because of pre-existing incomplete data elsewhere.
      if (Object.keys(draft).length === 0) continue;

      const item = fluxoItemsForValidation.find((i) => i.slot === slot);
      const effectiveTratativa =
        "tratativa" in draft ? draft.tratativa || "" : item?.tratativa || "";
      const availableEtapas = effectiveTratativa
        ? activeEtapaMapForValidation[effectiveTratativa] || []
        : [];
      // When the user changed tratativa but didn't re-pick etapa, fall back
      // to the saved etapa if it is still valid for the new tratativa.
      // This keeps the validation consistent with what the UI already shows.
      const effectiveEtapa =
        "etapa" in draft
          ? draft.etapa || ""
          : "tratativa" in draft
            ? availableEtapas.includes(item?.etapa || "")
              ? item?.etapa || ""
              : ""
            : item?.etapa || "";
      if (
        effectiveTratativa &&
        (!effectiveEtapa || !availableEtapas.includes(effectiveEtapa))
      ) {
        setShowEtapaRequiredAlert(true);
        return;
      }
    }

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
              descricao: `Fluxo atualizado: ${histParts.join(" | ")}`,
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
      const overallSP = deriveOverallStatus(updated, vaga.status_processo);
      await updateVagaAsync(vaga.id, {
        distribuicao_vagas: updated as any,
        status_processo: overallSP,
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
    <div
      className={`space-y-6${isDark ? " gdp-dark" : ""}`}
      style={isDark ? { background: "linear-gradient(150deg, #07091d 0%, #0d1630 50%, #080c1e 100%)", minHeight: "100%", padding: "1px 0" } : undefined}
    >
      <div
        className="flex flex-col md:flex-row md:items-center gap-4 justify-between p-4 rounded-xl border shadow-sm"
        style={isDark
          ? { background: "rgba(11,16,34,0.85)", borderColor: "rgba(255,255,255,0.09)" }
          : { background: "#ffffff", borderColor: "#e2e8f0" }}
      >
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
            <StatusProcessoBadge
              status={vaga.status_processo}
              tratativa={vaga.tratativa}
              etapa={vaga.etapa}
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
                  {resolvedAnalista ? (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const avatarUrl = userAvatarMap.get(resolvedAnalista);
                        const initials = resolvedAnalista
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n: string) => n[0].toUpperCase())
                          .join("");
                        return avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={resolvedAnalista}
                            className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 ring-2 ring-violet-200 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-white">
                              {initials}
                            </span>
                          </div>
                        );
                      })()}
                      <span className="text-sm font-semibold text-slate-700">
                        {resolvedAnalista}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Não atribuído
                    </p>
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

              {(vaga.is_teia ||
                (vaga.unidade || "").toUpperCase().includes("TEIA")) && (
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
              )}

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
                  const canEditFlow = canEdit || isAssistente;

                  // Panels renderer — shared for single and multi
                  const isTeia =
                    vaga.is_teia ||
                    (vaga.unidade || "").toUpperCase().includes("TEIA");
                  const activeTratativas = isTeia
                    ? TRATATIVAS_TEIA
                    : TRATATIVAS;
                  const activeEtapaMap = isTeia
                    ? ETAPAS_POR_TRATATIVA_TEIA
                    : ETAPAS_POR_TRATATIVA;

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
                      ? activeEtapaMap[effectiveTratativa] || []
                      : [];
                    const etapaLocked = !effectiveTratativa;

                    // If current etapa is not valid for new tratativa, it displays as empty
                    const etapaValue =
                      effectiveTratativa &&
                      availableEtapas.includes(effectiveEtapa)
                        ? effectiveEtapa
                        : "";

                    const iCfg = getStatusProcessoConfig(effectiveSP);

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
                                  {activeTratativas.map((t) => (
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
                              style={{
                                background: iCfg.bg,
                                border: `1px solid ${iCfg.border}`,
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            >
                              <iCfg.Icon
                                size={14}
                                style={{ color: iCfg.text }}
                                aria-hidden="true"
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              Status do Processo
                            </span>
                          </div>
                          {canEditFlow ? (
                            <Select
                              value={effectiveSP}
                              onValueChange={(v) => {
                                if (v === "Cancelada" || v === "Suspensa") {
                                  setJustificativaDialog({
                                    slot: item.slot,
                                    status: v,
                                  });
                                  setJustificativaText("");
                                } else {
                                  handleFluxoDraftChange(
                                    item.slot,
                                    "status_processo",
                                    v,
                                  );
                                }
                              }}
                            >
                              <SelectTrigger
                                style={{
                                  background: iCfg.bg,
                                  color: iCfg.text,
                                  border: `1px solid ${iCfg.border}`,
                                }}
                                className="h-9 text-sm font-bold max-w-xs"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  Object.keys(
                                    PROCESSO_STATUS_CONFIG,
                                  ) as StatusProcesso[]
                                ).map((s) => {
                                  const c = PROCESSO_STATUS_CONFIG[s];
                                  return (
                                    <SelectItem key={s} value={s}>
                                      <span className="flex items-center gap-2 font-semibold">
                                        <c.Icon
                                          size={12}
                                          style={{ color: c.text }}
                                          aria-hidden="true"
                                        />
                                        {s}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusProcessoBadge status={effectiveSP} />
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
                          <StatusProcessoBadge status={sp} />
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
                            const tabCfg = getStatusProcessoConfig(iSP);
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
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: tabCfg.dotHex,
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
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

      {/* ── Observações Internas (persistente em todas as abas) ── */}
      {(() => {
        const obsItems = parseObsItems(
          vaga.observacoes_internas || vaga.observacoes,
        );
        return (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
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
                      <div className="relative">
                        <Textarea
                          ref={obsTextareaRef}
                          value={newObsText}
                          onChange={handleObsTextChange}
                          onKeyDown={(e) => {
                            // Mention navigation
                            if (
                              mentionQuery !== null &&
                              mentionUsers.length > 0
                            ) {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setMentionIndex((i) =>
                                  Math.min(i + 1, mentionUsers.length - 1),
                                );
                                return;
                              }
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setMentionIndex((i) => Math.max(i - 1, 0));
                                return;
                              }
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                handleSelectMention(mentionUsers[mentionIndex]);
                                return;
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setMentionQuery(null);
                                return;
                              }
                            }
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                              handleAddObs();
                          }}
                          className="min-h-[72px] text-sm resize-none bg-white border-slate-200 focus:border-primary/50 transition-colors"
                          placeholder="Adicione uma observação... use @ para mencionar alguém (Ctrl+Enter para enviar)"
                        />
                        <ObsMentionDropdown
                          users={mentionUsers}
                          activeIndex={mentionIndex}
                          onSelect={handleSelectMention}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <AtSign className="h-3 w-3" />
                          Digite @ para mencionar um colega
                        </span>
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
                    <p className="text-xs">Nenhuma observação registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-1 pt-1">
                    {obsItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`group/obs relative flex gap-3 p-3 rounded-xl transition-colors ${idx === 0 ? "bg-slate-50/80 border border-slate-100" : "hover:bg-slate-50/60"}`}
                      >
                        <ObsAvatar
                          name={item.author_name}
                          avatarUrl={item.author_avatar}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-800 leading-none">
                              {item.author_name}
                            </span>
                            <span className="text-[10px] text-slate-400 leading-none">
                              {obsRelativeTime(item.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {renderObsText(item.text, users || [])}
                          </p>
                          <div className="flex justify-end mt-1.5">
                            <ObsLikeButton
                              likes={item.likes || []}
                              currentUserId={currentUser?.id || ""}
                              onToggle={() => handleToggleLike(item.id)}
                            />
                          </div>
                        </div>

                        {/* Admin delete — appears on hover */}
                        {isAdmin && (
                          <ObsDeleteButton
                            onConfirm={() => handleDeleteObs(item.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

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

      {/* ── Justificativa de Cancelamento / Suspensão ── */}
      <Dialog
        open={!!justificativaDialog}
        onOpenChange={(open) => {
          if (!open) {
            setJustificativaDialog(null);
            setJustificativaText("");
            setJustificativaMentionQuery(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
          {justificativaDialog &&
            (() => {
              const isCancelada = justificativaDialog.status === "Cancelada";
              const cfg = PROCESSO_STATUS_CONFIG[justificativaDialog.status];
              const Icon = cfg.Icon;
              const minChars = 10;
              const charCount = justificativaText.trim().length;
              const isValid = charCount >= minChars;

              return (
                <>
                  {/* Coloured header */}
                  <div
                    className="px-6 pt-6 pb-5"
                    style={{
                      background: cfg.bg,
                      borderBottom: `1.5px solid ${cfg.border}`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{
                          background: "white",
                          border: `1.5px solid ${cfg.border}`,
                        }}
                      >
                        <Icon size={18} style={{ color: cfg.text }} />
                      </div>
                      <div>
                        <h2
                          className="text-base font-black leading-tight"
                          style={{ color: cfg.text }}
                        >
                          {isCancelada
                            ? "Cancelar processo"
                            : "Suspender processo"}
                        </h2>
                        <p
                          className="text-[12px] font-medium mt-0.5"
                          style={{ color: cfg.text, opacity: 0.7 }}
                        >
                          Uma justificativa é obrigatória para continuar
                        </p>
                      </div>
                    </div>

                    {/* Context chip */}
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.6)",
                        color: cfg.text,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      <Building2 size={11} />
                      {vaga.cargo} ·{" "}
                      {vaga.unidade?.split(" - ")[0] || vaga.unidade}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-4 bg-white">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare size={11} />
                        Motivo da {isCancelada ? "Cancelamento" : "Suspensão"}
                      </label>
                      <div className="relative">
                        <Textarea
                          ref={justificativaTextareaRef}
                          autoFocus
                          value={justificativaText}
                          onChange={handleJustificativaTextChange}
                          onKeyDown={(e) => {
                            if (justificativaMentionQuery !== null && justificativaMentionUsers.length > 0) {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setJustificativaMentionIndex((i) => Math.min(i + 1, justificativaMentionUsers.length - 1));
                                return;
                              }
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setJustificativaMentionIndex((i) => Math.max(i - 1, 0));
                                return;
                              }
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                handleJustificativaSelectMention(justificativaMentionUsers[justificativaMentionIndex]);
                                return;
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setJustificativaMentionQuery(null);
                                return;
                              }
                            }
                          }}
                          placeholder={
                            isCancelada
                              ? "Descreva o motivo pelo qual esta vaga está sendo cancelada..."
                              : "Descreva o motivo pelo qual este processo está sendo suspenso..."
                          }
                          className="min-h-[110px] resize-none text-sm bg-slate-50 border-slate-200 focus:border-primary/50 transition-colors leading-relaxed"
                        />
                        <ObsMentionDropdown
                          users={justificativaMentionUsers}
                          activeIndex={justificativaMentionIndex}
                          onSelect={handleJustificativaSelectMention}
                        />
                      </div>
                      {/* Character counter + hint */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400">
                          Mínimo de {minChars} caracteres
                        </p>
                        <span
                          className={`text-[10px] font-bold tabular-nums transition-colors ${
                            isValid
                              ? "text-emerald-600"
                              : charCount > 0
                                ? "text-amber-500"
                                : "text-slate-300"
                          }`}
                        >
                          {charCount} / {minChars}+
                        </span>
                      </div>
                    </div>

                    {/* Info box */}
                    <div
                      className="flex items-start gap-2.5 p-3 rounded-lg text-[12px] leading-relaxed"
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.text,
                        opacity: 0.9,
                      }}
                    >
                      <Info size={13} className="shrink-0 mt-0.5" />
                      <span>
                        Esta justificativa será registrada nas{" "}
                        <strong>Observações Internas</strong> com o prefixo{" "}
                        <strong>
                          [{isCancelada ? "CANCELAMENTO" : "SUSPENSÃO"}]
                        </strong>
                        .
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-4 text-slate-500 hover:text-slate-700 font-semibold"
                      onClick={() => {
                        setJustificativaDialog(null);
                        setJustificativaText("");
                        setJustificativaMentionQuery(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      disabled={!isValid || isSavingJustificativa}
                      onClick={handleConfirmarJustificativa}
                      className="h-9 px-5 gap-2 font-bold shadow-sm transition-all"
                      style={
                        isValid ? { background: cfg.text, color: "white" } : {}
                      }
                    >
                      {isSavingJustificativa ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Confirmar e Registrar
                    </Button>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

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

      {/* ── Etapa obrigatória ───────────────────────────────────────── */}
      <AlertDialog
        open={showEtapaRequiredAlert}
        onOpenChange={setShowEtapaRequiredAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Etapa obrigatória
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 space-y-2 text-sm">
                <p>
                  Não é possível salvar uma alteração de{" "}
                  <strong className="text-slate-700">Fluxo do Processo</strong>{" "}
                  sem especificar uma etapa.
                </p>
                <p className="text-slate-500">
                  Você selecionou a{" "}
                  <strong className="text-slate-700">Tratativa</strong>, mas não
                  escolheu a <strong className="text-slate-700">Etapa</strong>{" "}
                  correspondente. Selecione a etapa antes de salvar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowEtapaRequiredAlert(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Entendido, vou escolher a Etapa
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

function getBancoUnidadeFilter(vaga: any): (b: any) => boolean {
  const vagaUnidadeUpper = (vaga.unidade || "").trim().toUpperCase();
  const isTeia =
    vaga.is_teia || vagaUnidadeUpper.includes("TEIA");

  // Rule 8: TEIA units — filter by is_teia flag on banco_candidatos
  if (isTeia) {
    return (b: any) => !!(b as any).is_teia;
  }

  const sw = (prefix: string) =>
    vagaUnidadeUpper.startsWith(prefix.toUpperCase());

  // Rule 5: Jataí - GO (must be checked before plain AGIR)
  if (sw("HEJ") || sw("AGIR RIO VERDE")) {
    return (b: any) => ((b as any).unidade || "") === "Jataí - GO";
  }

  // Rule 1: Goiânia - GO
  if (
    sw("HUGOL") ||
    sw("HECAD") ||
    sw("CRER") ||
    sw("AGIR") ||
    sw("HDS")
  ) {
    return (b: any) => ((b as any).unidade || "") === "Goiânia - GO";
  }

  // Rule 2: Dourados - MS
  if (sw("CHRD")) {
    return (b: any) => ((b as any).unidade || "") === "Dourados - MS";
  }

  // Rule 3: Manaus - AM
  if (sw("CHS")) {
    return (b: any) => ((b as any).unidade || "") === "Manaus - AM";
  }

  // Rule 4: Cáceres - MT
  if (sw("HRC")) {
    return (b: any) => ((b as any).unidade || "") === "Cáceres - MT";
  }

  // Rule 6: Cidade de Goiás - GO
  if (sw("POL GOIAS")) {
    return (b: any) => ((b as any).unidade || "") === "Cidade de Goiás - GO";
  }

  // Rule 7: Vitória - ES
  if (sw("UPA SAO PEDRO") || sw("UPA PRAIA DO SUA")) {
    return (b: any) => ((b as any).unidade || "") === "Vitória - ES";
  }

  // No specific rule → show all
  return () => true;
}

function AproveitamentoBancoTab({ vaga }: { vaga: any }) {
  const { bancos } = useVagasStore();
  const [search, setSearch] = useState("");
  const [showFullBanco, setShowFullBanco] = useState(false);
  const [convocacaoInitial, setConvocacaoInitial] = useState<any>(null);
  const [isConvocacaoOpen, setIsConvocacaoOpen] = useState(false);

  const bancoFilter = useMemo(() => getBancoUnidadeFilter(vaga), [vaga.unidade, vaga.is_teia]);

  const filteredBancos = useMemo(
    () => bancos.filter(bancoFilter),
    [bancos, bancoFilter],
  );

  const withScores = useMemo(() => {
    return filteredBancos
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
  }, [filteredBancos, vaga.cargo]);

  const hasMatches = withScores.length > 0;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!hasMatches || showFullBanco) {
      // Full banco search mode
      const pool = filteredBancos.map((b) => ({ ...b, _score: 0 as number }));
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
  }, [hasMatches, showFullBanco, withScores, filteredBancos, search]);

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
                  <TableHead>Proc. Seletivo</TableHead>
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
                        <p className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {(b as any).numero_processo_seletivo || "—"}
                        </p>
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
