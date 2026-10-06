import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import { BancoTalentos, Convocacao } from "@/types/vaga";
import { toast } from "sonner";
import { getHorariosDisponiveis, getBaseForUnidade } from "@/lib/convocacaoUtils";
import { cn } from "@/lib/utils";
import {
  Clock,
  Info,
  User,
  Building2,
  FileText,
  Phone,
  ChevronLeft,
  CheckCircle2,
  MessageSquare,
  Loader2,
  Users,
  AlertTriangle,
  Minus,
  Plus,
  ChevronRight,
  CheckCheck,
  XCircle,
  Send,
} from "lucide-react";

// ── Tatodesk API (same credentials as ConvocacaoDialog) ───────────────────────
const TATODESK_API_KEY  = "04717fac-95e0-45cc-856d-57a67abd8a41";
const TATODESK_APP_ID   = "c36a03c9-2122-4381-975c-b479b4a1da0e";
const TATODESK_TEMPLATE_ID = "76864409-b6de-4a3e-a2ad-27f97f4f9a0a";

async function sendWhatsappMessage(phone: string, vaga: string): Promise<void> {
  const digits   = phone.replace(/\D/g, "");
  const fullPhone = digits.startsWith("55") ? digits : `55${digits}`;
  const res = await fetch("https://api.tatodesk.com/dl/v1/whatsapp/messages", {
    method: "POST",
    headers: { "TATODESK-API-KEY": TATODESK_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      appID: TATODESK_APP_ID,
      templateID: TATODESK_TEMPLATE_ID,
      whatsapp: {
        type: "template",
        to: fullPhone,
        templatePayload: { body: { params: [{ type: "TEXT", text: vaga }] } },
      },
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || "Erro ao enviar WhatsApp");
}

// ── Shared constants ─────────────────────────────────────────────────────────
const UNIDADES_ALTERNATIVAS = [
  "AGIR", "CHRD", "CHS", "CRER", "HECAD", "HDS", "HEJ", "HRCAC", "HUGOL",
  "PA Praia do Suá", "PA São Pedro", "Policlínica - Goiás",
  "TEIA", "TEIA - Aparecida", "TEIA - Manaus I", "TEIA - Manaus II",
  "TEIA - Manaus III", "TEIA - Senador Canedo",
];

// ── TimeInput (duplicated from ConvocacaoDialog) ──────────────────────────────
function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(value);
  useEffect(() => { setRawInput(value); }, [value]);

  const selectedHour = value ? value.split(":")[0] : null;
  const selectedMin  = value ? value.split(":")[1] : null;
  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const hourRefs   = useRef<Record<string, HTMLButtonElement | null>>({});
  const minuteRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (selectedHour && hourRefs.current[selectedHour])
        hourRefs.current[selectedHour]!.scrollIntoView({ block: "center" });
      if (selectedMin && minuteRefs.current[selectedMin])
        minuteRefs.current[selectedMin]!.scrollIntoView({ block: "center" });
    }, 50);
    return () => clearTimeout(t);
  }, [open, selectedHour, selectedMin]);

  const applyTime = (h: string, m: string) => {
    const v = `${h}:${m}`; onChange(v); setRawInput(v);
  };
  const pickHour   = (hr: string) => applyTime(hr, selectedMin ?? "00");
  const pickMinute = (mn: string) => { applyTime(selectedHour ?? "08", mn); setOpen(false); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9:]/g, "");
    if (v.length === 2 && !v.includes(":") && rawInput.length < 2) v = v + ":";
    setRawInput(v);
    const match = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) onChange(`${match[1].padStart(2,"0")}:${match[2].padStart(2,"0")}`);
  };
  const handleInputBlur = () => {
    const match = rawInput.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) { const f = `${match[1].padStart(2,"0")}:${match[2].padStart(2,"0")}`; setRawInput(f); onChange(f); }
    else setRawInput(value);
  };

  return (
    <div className="flex gap-1.5">
      <div className="relative flex-1">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input value={rawInput} onChange={handleInputChange} onBlur={handleInputBlur}
          placeholder="HH:MM" className="pl-9 font-mono tracking-widest" maxLength={5} />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" title="Abrir seletor de horário"
            className="shrink-0 border-slate-200 hover:bg-primary/5 hover:border-primary/30">
            <Clock className="h-4 w-4 text-primary/70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0 shadow-xl rounded-xl overflow-hidden" align="end">
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="text-xl font-bold text-white tracking-widest font-mono">{value || "--:--"}</span>
            <span className="text-[10px] text-white/50 uppercase font-bold">24h</span>
          </div>
          <div className="flex border-b border-slate-100 bg-slate-50">
            <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hora</div>
            <div className="w-px bg-slate-200" />
            <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Min</div>
          </div>
          <div className="flex">
            <ScrollArea className="flex-1 h-52">
              <div className="py-1">
                {hours.map(hr => (
                  <button key={hr} ref={el => { hourRefs.current[hr] = el; }} type="button" onClick={() => pickHour(hr)}
                    className={cn("w-full text-sm py-2 text-center transition-colors font-mono",
                      selectedHour === hr ? "bg-primary text-white font-bold" : "text-slate-700 hover:bg-primary/10")}>
                    {hr}
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="w-px bg-slate-100" />
            <ScrollArea className="flex-1 h-52">
              <div className="py-1">
                {minutes.map(mn => (
                  <button key={mn} ref={el => { minuteRefs.current[mn] = el; }} type="button" onClick={() => pickMinute(mn)}
                    className={cn("w-full text-sm py-2 text-center transition-colors font-mono",
                      selectedMin === mn ? "bg-primary text-white font-bold" : "text-slate-700 hover:bg-primary/10")}>
                    {mn}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── EDOC formatter ────────────────────────────────────────────────────────────
function formatEdoc(raw: string): string {
  const digits = raw.replace(/\./g, "").replace(/\D/g, "");
  if (digits.length <= 8) return digits;
  return digits.slice(0, 8) + "." + digits.slice(8, 13);
}

// ── Read-only info field ───────────────────────────────────────────────────────
function InfoField({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div className="space-y-0.5 min-w-0">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
        {icon}{label}
      </span>
      <p className="text-sm font-semibold text-slate-700 truncate">{value || "—"}</p>
    </div>
  );
}

// ── WA status icon ────────────────────────────────────────────────────────────
type WaStatus = "idle" | "sending" | "success" | "error" | "skipped";

function WaStatusIcon({ status }: { status: WaStatus }) {
  if (status === "sending") return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "error")   return <XCircle      className="h-3.5 w-3.5 text-red-500" />;
  if (status === "skipped") return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  return null;
}

// ── Candidate row (compact list) ──────────────────────────────────────────────
function CandidateListRow({
  candidate,
  position,
  banco,
  waStatus,
  showWa,
}: {
  candidate: any;
  position: number;
  banco: BancoTalentos;
  waStatus?: WaStatus;
  showWa?: boolean;
}) {
  const hasPhone = !!(candidate.telefone && candidate.telefone.trim());
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/80 transition-colors group">
      {/* Position badge */}
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-[10px] font-black text-white tabular-nums">{position}°</span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight truncate">
          {candidate.nome || "Não identificado"}
        </p>
        <p className="text-[10px] text-slate-400 font-medium">
          {candidate.cpf ? `CPF: ${candidate.cpf}` : "CPF não informado"}
        </p>
      </div>

      {/* Classificação original */}
      <div className="text-center shrink-0 hidden sm:block">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Class.</p>
        <p className="text-xs font-black text-slate-600 tabular-nums">{candidate.classificacao}°</p>
      </div>

      {/* Nº Proc. Seletivo */}
      <div className="text-center shrink-0 hidden md:block">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Proc. Seletivo</p>
        <p className="text-xs font-semibold text-slate-600 truncate max-w-[90px]">
          {banco.numero_processo_seletivo || "—"}
        </p>
      </div>

      {/* Edital */}
      <div className="text-center shrink-0 hidden md:block">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edital</p>
        <p className="text-xs font-semibold text-slate-600 truncate max-w-[70px]">
          {banco.numero_edital || "—"}
        </p>
      </div>

      {/* Telefone */}
      <div className="flex items-center gap-1.5 shrink-0">
        {hasPhone ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <Phone className="h-3 w-3 text-slate-400" />
            {candidate.telefone}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            Sem telefone
          </span>
        )}
        {showWa && waStatus && waStatus !== "idle" && (
          <WaStatusIcon status={waStatus} />
        )}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface ConvocacaoLoteModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  banco: BancoTalentos;
  /** Ordered candidates (from drag-and-drop), already sliced/sorted */
  candidates: any[];
  fetchBancos: () => Promise<void>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function ConvocacaoLoteModal({
  open,
  onOpenChange,
  banco,
  candidates,
  fetchBancos,
}: ConvocacaoLoteModalProps) {
  const { addConvocacao, updateBancoAsync, convocacoes } = useVagasStore();
  const { currentUser } = useAdminStore();

  const total = candidates.length;

  // ── Step & sending state ─────────────────────────────────────────────────
  const [step, setStep]             = useState<"form" | "confirm">("form");
  const [isSending, setIsSending]   = useState(false);
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);
  const [waResults, setWaResults]   = useState<Record<string, WaStatus>>({});

  // ── Quantity ─────────────────────────────────────────────────────────────
  const [qtd, setQtd] = useState(total);
  const clampQtd = (v: number) => Math.min(total, Math.max(1, v));

  // ── Scheduling form data ─────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    data_convocacao:    today,
    horario:            "",
    tipo_atendimento:   "presencial" as "presencial" | "online",
    unidade_alternativa: "",
    edoc:               "",
    observacoes:        "",
  });

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep("form");
    setQtd(total);
    setEnviarWhatsapp(false);
    setIsSending(false);
    setWaResults({});
    setFormData({
      data_convocacao:     today,
      horario:             "",
      tipo_atendimento:    "presencial",
      unidade_alternativa: "",
      edoc:                "",
      observacoes:         "",
    });
  }, [open, total]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCandidates = useMemo(() => candidates.slice(0, qtd), [candidates, qtd]);

  const horariosDisponiveis = useMemo(() => {
    if (!formData.data_convocacao || !banco.unidade) return [];
    return getHorariosDisponiveis(formData.data_convocacao, banco.unidade, convocacoes);
  }, [formData.data_convocacao, banco.unidade, convocacoes]);

  const baseName  = useMemo(() => getBaseForUnidade(banco.unidade), [banco.unidade]);
  const isGoiania = baseName === "Goiânia";

  const candidatesWithPhone    = selectedCandidates.filter(c => c.telefone?.trim());
  const candidatesWithoutPhone = selectedCandidates.filter(c => !c.telefone?.trim());

  const fmtDate = (iso: string | undefined) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const tipoLabel = formData.tipo_atendimento === "online" ? "Online" : "Presencial";

  // ── Validation ────────────────────────────────────────────────────────────
  const handleProsseguir = () => {
    if (!formData.data_convocacao || !formData.horario) {
      toast.error("Preencha os campos obrigatórios: Data e Horário da convocação");
      return;
    }
    setStep("confirm");
  };

  // ── Confirm & send ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsSending(true);
    const author = currentUser?.nome_completo || currentUser?.nome || "Analista";

    // 1) Create a convocação record for each selected candidate
    for (let i = 0; i < selectedCandidates.length; i++) {
      const c = selectedCandidates[i];
      const newConv: Convocacao = {
        id:                     `conv-lote-${Date.now()}-${i}`,
        vaga_id:                "",
        status:                 "pendente",
        tipo_convocacao:        "Convocação do Banco de Talentos",
        nome_candidato:         c.nome || "",
        classificacao:          i + 1,
        cargo:                  banco.cargo,
        unidade:                banco.unidade,
        secao:                  banco.secao || "",
        requisicao:             "",
        edital_relacionado:     banco.numero_edital || "",
        banco_relacionado:      c.id,
        responsavel:            author,
        observacoes:            formData.observacoes,
        data_convocacao:        formData.data_convocacao,
        horario:                formData.horario,
        tipo_atendimento:       formData.tipo_atendimento,
        unidade_alternativa:    formData.unidade_alternativa || undefined,
        edoc:                   formData.edoc || undefined,
        ...({ banco_id: c.id, numero_processo_seletivo: banco.numero_processo_seletivo || "" } as any),
      };
      addConvocacao(newConv);

      // 2) Update this candidate's status in the banco
      updateBancoAsync(c.id, {
        status:            "Convocado(a)",
        status_calculado:  "Convocado(a)",
        data_convocacao:   formData.data_convocacao,
        unidade_convocacao: banco.unidade,
      } as any);
    }

    // 3) Send WhatsApp messages if requested
    if (enviarWhatsapp && candidatesWithPhone.length > 0) {
      // Initialise all as "sending"
      const initialResults: Record<string, WaStatus> = {};
      selectedCandidates.forEach(c => {
        initialResults[c.id] = c.telefone?.trim() ? "sending" : "skipped";
      });
      setWaResults(initialResults);

      await Promise.allSettled(
        candidatesWithPhone.map(async (c) => {
          try {
            await sendWhatsappMessage(c.telefone, banco.cargo);
            setWaResults(prev => ({ ...prev, [c.id]: "success" }));
          } catch {
            setWaResults(prev => ({ ...prev, [c.id]: "error" }));
          }
        })
      );

      // Wait briefly so the user sees the status icons
      await new Promise(r => setTimeout(r, 800));

      const finalResults = await new Promise<Record<string, WaStatus>>(resolve => {
        setWaResults(prev => { resolve(prev); return prev; });
      });
      const errors = Object.values(finalResults).filter(s => s === "error").length;
      if (errors > 0) {
        toast.warning(`${selectedCandidates.length} convocações criadas. ${errors} mensagem(ns) WhatsApp falharam.`);
      } else {
        toast.success(`${selectedCandidates.length} convocações criadas e WhatsApp enviado com sucesso!`);
      }
    } else {
      toast.success(`${selectedCandidates.length} convocação(ões) criadas com sucesso!`);
    }

    await fetchBancos();
    setIsSending(false);
    onOpenChange(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={v => { if (!isSending) onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-0 shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {step === "form" ? "Convocar em Lote" : "Confirmar Convocações em Lote"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === "form"
                  ? "Selecione quantos candidatos convocar e preencha os detalhes do agendamento."
                  : "Revise todos os dados antes de confirmar. Esta ação não pode ser desfeita."}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {(["form", "confirm"] as const).map((s, idx) => (
              <React.Fragment key={s}>
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all",
                  step === s
                    ? "bg-primary text-white"
                    : idx < (step === "confirm" ? 1 : 0)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
                )}>
                  {idx < (step === "confirm" ? 1 : 0)
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <span>{idx + 1}</span>
                  }
                  {s === "form" ? "Configurar" : "Confirmar"}
                </div>
                {idx < 1 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════════════════════════════════════ STEP: FORM ══════════ */}
          {step === "form" && (
            <div className="p-6 space-y-5">

              {/* VAGA (read-only) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                <InfoField label="Vaga"           value={banco.cargo}     icon={<FileText  className="h-3 w-3" />} />
                <InfoField label="Unidade Origem" value={banco.unidade}   icon={<Building2 className="h-3 w-3" />} />
                <InfoField label="Requisição"     value={"—"} />
                <InfoField label="Seção"          value={banco.secao || "—"} />
              </div>

              {/* Quantity selector */}
              <div className="border border-primary/20 bg-primary/[0.03] rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Quantidade de candidatos a convocar
                </h3>

                <div className="flex items-center gap-4">
                  {/* Stepper */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQtd(v => clampQtd(v - 1))}
                      disabled={qtd <= 1}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                    >
                      <Minus className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={total}
                      value={qtd}
                      onChange={e => setQtd(clampQtd(Number(e.target.value)))}
                      className="h-8 w-14 text-center text-base font-black text-slate-900 border border-primary/30 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setQtd(v => clampQtd(v + 1))}
                      disabled={qtd >= total}
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <span className="text-sm text-slate-500 font-medium">
                      de <span className="font-bold text-slate-700">{total}</span> candidatos
                    </span>
                  </div>

                  {/* Quick chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 3, 5, total].filter((v, i, a) => a.indexOf(v) === i && v <= total).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setQtd(v)}
                        className={cn(
                          "h-6 px-2.5 rounded-full text-[10px] font-bold transition-all border",
                          qtd === v
                            ? "bg-primary text-white border-primary shadow-sm shadow-primary/25"
                            : "bg-white text-slate-500 border-slate-200 hover:border-primary/40 hover:text-primary"
                        )}
                      >
                        {v === total ? "Todos" : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums w-4">1</span>
                  <input
                    type="range"
                    min={1}
                    max={total}
                    value={qtd}
                    onChange={e => setQtd(Number(e.target.value))}
                    className="flex-1 accent-primary h-1.5 rounded-full"
                  />
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums w-4">{total}</span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Os <span className="font-bold text-primary">{qtd}</span> primeiros candidatos da lista serão convocados.
                </p>
              </div>

              {/* Selected candidates list */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Candidatos selecionados
                  <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">
                    {qtd}
                  </span>
                </h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {selectedCandidates.map((c, idx) => (
                    <CandidateListRow
                      key={c.id}
                      candidate={c}
                      position={idx + 1}
                      banco={banco}
                    />
                  ))}
                </div>
                {candidatesWithoutPhone.length > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 font-medium">
                      <span className="font-bold">{candidatesWithoutPhone.length}</span> candidato(s) sem telefone cadastrado
                      {candidatesWithoutPhone.length === 1 ? " não receberá" : " não receberão"} a mensagem WhatsApp.
                    </p>
                  </div>
                )}
              </div>

              {/* Scheduling details (shared for all) */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Detalhes do Agendamento
                  <span className="ml-1 text-[9px] font-normal text-primary/60 normal-case">(aplicado a todos os candidatos)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data */}
                  <div className="space-y-2">
                    <Label htmlFor="lote_data">Data da Convocação <span className="text-red-500">*</span></Label>
                    <Input
                      id="lote_data"
                      type="date"
                      value={formData.data_convocacao}
                      onChange={e => setFormData(p => ({ ...p, data_convocacao: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Horário */}
                  <div className="space-y-2">
                    <Label>
                      Horário da Convocação <span className="text-red-500">*</span>
                      <span className="ml-1 text-[10px] font-normal text-slate-400">(Horário de Brasília)</span>
                    </Label>
                    {isGoiania ? (
                      <>
                        <Select value={formData.horario} onValueChange={v => setFormData(p => ({ ...p, horario: v }))}>
                          <SelectTrigger className="bg-white border-primary/20">
                            <SelectValue placeholder="Selecione um horário com vagas" />
                          </SelectTrigger>
                          <SelectContent>
                            {horariosDisponiveis.length > 0
                              ? horariosDisponiveis.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)
                              : <SelectItem value="none" disabled>Nenhum horário disponível (limite atingido)</SelectItem>
                            }
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500 italic flex gap-1">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          Base Goiânia: máximo 5 agendamentos por horário.
                        </p>
                      </>
                    ) : (
                      <>
                        <TimeInput value={formData.horario} onChange={v => setFormData(p => ({ ...p, horario: v }))} />
                        <p className="text-[10px] text-slate-500 italic flex gap-1">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          Digite o horário (ex: 14:30) ou use o <Clock className="h-3 w-3 mx-0.5 inline" /> para selecionar.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Tipo de atendimento */}
                  <div className="space-y-2">
                    <Label>Tipo de Atendimento <span className="text-red-500">*</span></Label>
                    <Select value={formData.tipo_atendimento} onValueChange={v => setFormData(p => ({ ...p, tipo_atendimento: v as any }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unidade alternativa */}
                  <div className="space-y-2">
                    <Label>Unidade Alternativa <span className="ml-1 text-[10px] font-normal text-slate-400">(opcional)</span></Label>
                    <Select
                      value={formData.unidade_alternativa || "__none__"}
                      onValueChange={v => setFormData(p => ({ ...p, unidade_alternativa: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className="bg-white border-slate-200">
                        <SelectValue placeholder="Selecione uma unidade…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__"><span className="text-slate-400">Nenhuma</span></SelectItem>
                        {UNIDADES_ALTERNATIVAS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Template (read-only) */}
                  <div className="space-y-2">
                    <Label>Template Tatodesk</Label>
                    <Input value="Convocação do Banco de Talentos" readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                  </div>

                  {/* EDOC */}
                  <div className="space-y-2">
                    <Label>Nº EDOC <span className="ml-1 text-[10px] font-normal text-slate-400">(opcional)</span></Label>
                    <Input
                      value={formData.edoc}
                      onChange={e => setFormData(p => ({ ...p, edoc: formatEdoc(e.target.value) }))}
                      placeholder="20260000.00000"
                      className="font-mono tracking-wider"
                      maxLength={14}
                    />
                    <p className="text-[10px] text-slate-400">Formato: 00000000.00000</p>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label>Observações <span className="ml-1 text-[10px] font-normal text-slate-400">(opcional)</span></Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Informações adicionais sobre a convocação..."
                    className="min-h-[72px] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ STEP: CONFIRM ═══════ */}
          {step === "confirm" && (
            <div className="p-6 space-y-5">

              {/* VAGA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                <InfoField label="Vaga"           value={banco.cargo}     icon={<FileText  className="h-3 w-3" />} />
                <InfoField label="Unidade Origem" value={banco.unidade}   icon={<Building2 className="h-3 w-3" />} />
                <InfoField label="Requisição"     value={"—"} />
                <InfoField label="Seção"          value={banco.secao || "—"} />
              </div>

              {/* Detalhes do Agendamento (read-only summary) */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Detalhes do Agendamento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoField label="Data da Convocação"  value={fmtDate(formData.data_convocacao)} />
                  <InfoField label="Horário (Brasília)"  value={formData.horario} />
                  <InfoField label="Tipo de Atendimento" value={tipoLabel} />
                  <InfoField label="Unidade Alternativa" value={formData.unidade_alternativa || "—"} />
                  <InfoField label="Template Tatodesk"   value="Convocação do Banco de Talentos" />
                  <InfoField label="Nº EDOC"             value={formData.edoc || "—"} />
                </div>
                {formData.observacoes && (
                  <div className="space-y-0.5 pt-2 border-t border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Observações</span>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{formData.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Candidates (confirm list) */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Candidatos({selectedCandidates.length}) que serão convocados
                </h3>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedCandidates.map((c, idx) => (
                    <CandidateListRow
                      key={c.id}
                      candidate={c}
                      position={idx + 1}
                      banco={banco}
                      showWa={enviarWhatsapp}
                      waStatus={waResults[c.id] ?? "idle"}
                    />
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <div className={cn(
                "flex items-start gap-3 p-4 rounded-xl border transition-colors",
                enviarWhatsapp ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
              )}>
                <Checkbox
                  id="lote_whatsapp"
                  checked={enviarWhatsapp}
                  onCheckedChange={v => setEnviarWhatsapp(!!v)}
                  className="mt-0.5"
                  disabled={candidatesWithPhone.length === 0 || isSending}
                />
                <div className="space-y-1 min-w-0">
                  <label
                    htmlFor="lote_whatsapp"
                    className={cn(
                      "text-sm font-semibold cursor-pointer select-none flex items-center gap-1.5",
                      enviarWhatsapp ? "text-green-700" : "text-slate-700",
                      candidatesWithPhone.length === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Enviar WhatsApp para todos os candidatos
                  </label>
                  {candidatesWithPhone.length > 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Será enviada uma mensagem via template{" "}
                      <em>Convocação do Banco de Talentos</em> para{" "}
                      <strong>{candidatesWithPhone.length}</strong> candidato(s) com telefone cadastrado.
                      {candidatesWithoutPhone.length > 0 && (
                        <span className="text-amber-600 font-semibold">
                          {" "}{candidatesWithoutPhone.length} candidato(s) sem telefone serão ignorados.
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 font-medium">
                      Nenhum dos candidatos selecionados possui telefone cadastrado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-between gap-3">
          {step === "form" ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancelar
              </Button>
              <Button type="button" className="px-6 font-bold gap-1.5" onClick={handleProsseguir}>
                Prosseguir
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("form")} disabled={isSending} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isSending}
                className="px-6 font-bold gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    Confirmar {selectedCandidates.length} Convocação{selectedCandidates.length !== 1 ? "ões" : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
