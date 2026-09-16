import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Vaga, Convocacao } from "@/types/vaga";
import { toast } from "sonner";
import {
  getHorariosDisponiveis,
  getBaseForUnidade,
} from "@/lib/convocacaoUtils";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tatodesk API ──────────────────────────────────────────────────────────────
const TATODESK_API_KEY = "04717fac-95e0-45cc-856d-57a67abd8a41";
const TATODESK_APP_ID = "c36a03c9-2122-4381-975c-b479b4a1da0e";
const TATODESK_TEMPLATE_ID = "76864409-b6de-4a3e-a2ad-27f97f4f9a0a";

async function sendWhatsappMessage(phone: string, vaga: string): Promise<void> {
  const digits = phone.replace(/\D/g, "");
  const fullPhone = digits.startsWith("55") ? digits : `55${digits}`;

  const res = await fetch("https://api.tatodesk.com/dl/v1/whatsapp/messages", {
    method: "POST",
    headers: {
      "TATODESK-API-KEY": TATODESK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appID: TATODESK_APP_ID,
      templateID: TATODESK_TEMPLATE_ID,
      whatsapp: {
        type: "template",
        to: fullPhone,
        templatePayload: {
          body: {
            params: [{ type: "TEXT", text: vaga }],
          },
        },
      },
    }),
  });

  const data = await res.json();
  if (data?.error) {
    throw new Error(data.error.message || "Erro ao enviar WhatsApp");
  }
}

// ── Hospital units list ───────────────────────────────────────────────────────
const UNIDADES_ALTERNATIVAS = [
  "AGIR",
  "CHRD",
  "CHS",
  "CRER",
  "HECAD",
  "HDS",
  "HEJ",
  "HRCAC",
  "HUGOL",
  "PA Praia do Suá",
  "PA São Pedro",
  "Policlínica - Goiás",
  "TEIA",
  "TEIA - Aparecida",
  "TEIA - Manaus I",
  "TEIA - Manaus II",
  "TEIA - Manaus III",
  "TEIA - Senador Canedo",
];

// ── TimeInput: text input + scrollable clock picker ───────────────────────────
function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(value);

  useEffect(() => {
    setRawInput(value);
  }, [value]);

  const selectedHour = value ? value.split(":")[0] : null;
  const selectedMin = value ? value.split(":")[1] : null;

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, "0"),
  );

  const hourRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const minuteRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (selectedHour && hourRefs.current[selectedHour]) {
        hourRefs.current[selectedHour]!.scrollIntoView({ block: "center" });
      }
      if (selectedMin && minuteRefs.current[selectedMin]) {
        minuteRefs.current[selectedMin]!.scrollIntoView({ block: "center" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [open, selectedHour, selectedMin]);

  const applyTime = (h: string, m: string) => {
    const v = `${h}:${m}`;
    onChange(v);
    setRawInput(v);
  };

  const pickHour = (hr: string) => applyTime(hr, selectedMin ?? "00");
  const pickMinute = (mn: string) => {
    applyTime(selectedHour ?? "08", mn);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9:]/g, "");
    // Auto-insert colon after 2 digits if user is typing forward
    if (v.length === 2 && !v.includes(":") && rawInput.length < 2) {
      v = v + ":";
    }
    setRawInput(v);
    const match = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      onChange(`${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`);
    }
  };

  const handleInputBlur = () => {
    const match = rawInput.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      const formatted = `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
      setRawInput(formatted);
      onChange(formatted);
    } else {
      setRawInput(value);
    }
  };

  return (
    <div className="flex gap-1.5">
      {/* Typed input */}
      <div className="relative flex-1">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={rawInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="HH:MM"
          className="pl-9 font-mono tracking-widest"
          maxLength={5}
        />
      </div>

      {/* Clock picker popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Abrir seletor de horário"
            className="shrink-0 border-slate-200 hover:bg-primary/5 hover:border-primary/30"
          >
            <Clock className="h-4 w-4 text-primary/70" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-52 p-0 shadow-xl rounded-xl overflow-hidden"
          align="end"
        >
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="text-xl font-bold text-white tracking-widest font-mono">
              {value || "--:--"}
            </span>
            <span className="text-[10px] text-white/50 uppercase font-bold">
              24h
            </span>
          </div>
          <div className="flex border-b border-slate-100 bg-slate-50">
            <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hora
            </div>
            <div className="w-px bg-slate-200" />
            <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Min
            </div>
          </div>
          <div className="flex">
            <ScrollArea className="flex-1 h-52">
              <div className="py-1">
                {hours.map((hr) => (
                  <button
                    key={hr}
                    ref={(el) => {
                      hourRefs.current[hr] = el;
                    }}
                    type="button"
                    onClick={() => pickHour(hr)}
                    className={cn(
                      "w-full text-sm py-2 text-center transition-colors font-mono",
                      selectedHour === hr
                        ? "bg-primary text-white font-bold"
                        : "text-slate-700 hover:bg-primary/10",
                    )}
                  >
                    {hr}
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="w-px bg-slate-100" />
            <ScrollArea className="flex-1 h-52">
              <div className="py-1">
                {minutes.map((mn) => (
                  <button
                    key={mn}
                    ref={(el) => {
                      minuteRefs.current[mn] = el;
                    }}
                    type="button"
                    onClick={() => pickMinute(mn)}
                    className={cn(
                      "w-full text-sm py-2 text-center transition-colors font-mono",
                      selectedMin === mn
                        ? "bg-primary text-white font-bold"
                        : "text-slate-700 hover:bg-primary/10",
                    )}
                  >
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

// ── EDOC formatting ────────────────────────────────────────────────────────────
function formatEdoc(raw: string): string {
  const digits = raw.replace(/\./g, "").replace(/\D/g, "");
  if (digits.length <= 8) return digits;
  return digits.slice(0, 8) + "." + digits.slice(8, 13);
}

// ── Read-only info field ───────────────────────────────────────────────────────
function InfoField({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5 min-w-0">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </span>
      <p className="text-sm font-semibold text-slate-700 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────────
interface ConvocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga?: Vaga;
  convocacaoToEdit?: Convocacao;
  initialData?: Partial<Convocacao> & {
    telefone?: string;
    numero_processo_seletivo?: string;
  };
}

export function ConvocacaoDialog({
  open,
  onOpenChange,
  vaga,
  convocacaoToEdit,
  initialData,
}: ConvocacaoDialogProps) {
  const {
    addConvocacao,
    updateConvocacao,
    updateVagaAsync,
    updateBancoAsync,
    convocacoes,
  } = useVagasStore();
  const { currentUser } = useAdminStore();

  // ── Step control ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ── Candidate-only display state (not persisted in Convocacao) ────────────
  const [telefone, setTelefone] = useState("");
  const [numeroPS, setNumeroPS] = useState("");

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<Convocacao>>({
    data_convocacao: new Date().toISOString().split("T")[0],
    horario: "",
    nome_candidato: "",
    classificacao: 1,
    tipo_convocacao: "Convocação do Banco de Talentos",
    status: "pendente",
    observacoes: "",
    edoc: "",
    secao: "",
    unidade_alternativa: "",
    tipo_atendimento: "presencial",
    responsavel: currentUser?.nome_completo || "Analista",
  });

  // ── Sync form on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setStep("form");
      setEnviarWhatsapp(false);
      return;
    }

    const base: Partial<Convocacao> = {
      data_convocacao: new Date().toISOString().split("T")[0],
      horario: "",
      nome_candidato: "",
      classificacao: 1,
      tipo_convocacao: "Convocação do Banco de Talentos",
      status: "pendente",
      observacoes: "",
      edoc: "",
      secao: "",
      unidade_alternativa: "",
      tipo_atendimento: "presencial",
      responsavel: currentUser?.nome_completo || "Analista",
    };

    if (convocacaoToEdit) {
      setFormData(convocacaoToEdit);
      setTelefone((convocacaoToEdit as any).telefone || "");
      setNumeroPS((convocacaoToEdit as any).numero_processo_seletivo || "");
    } else if (initialData) {
      setFormData({ ...base, ...initialData });
      setTelefone((initialData as any).telefone || "");
      setNumeroPS((initialData as any).numero_processo_seletivo || "");
    } else if (vaga) {
      const matchedBanco = useVagasStore.getState().getBancoByVaga(vaga.id);
      setFormData({
        ...base,
        vaga_id: vaga.id,
        cargo: vaga.cargo,
        unidade: vaga.unidade,
        secao: vaga.secao || "",
        requisicao: vaga.requisicao || vaga.numero_requisicao || "",
        edital_relacionado:
          matchedBanco?.numero_edital || vaga.numero_edital || "",
        banco_relacionado: matchedBanco?.id || vaga.banco_id || "",
      });
      setTelefone("");
      setNumeroPS(matchedBanco?.numero_processo_seletivo || "");
    } else {
      setFormData(base);
      setTelefone("");
      setNumeroPS("");
    }
  }, [open, vaga, convocacaoToEdit, initialData, currentUser]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const horariosDisponiveis = useMemo(() => {
    if (!formData.data_convocacao || !formData.unidade) return [];
    return getHorariosDisponiveis(
      formData.data_convocacao,
      formData.unidade,
      convocacoes.filter((c) => c.id !== convocacaoToEdit?.id),
    );
  }, [
    formData.data_convocacao,
    formData.unidade,
    convocacoes,
    convocacaoToEdit,
  ]);

  const baseName = useMemo(
    () => (formData.unidade ? getBaseForUnidade(formData.unidade) : ""),
    [formData.unidade],
  );

  const isGoiania = baseName === "Goiânia";

  // ── EDOC handler ──────────────────────────────────────────────────────────
  const handleEdocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEdoc(e.target.value);
    setFormData((prev) => ({ ...prev, edoc: formatted }));
  };

  // ── Validate & proceed to confirm ─────────────────────────────────────────
  const handleCreateClick = () => {
    if (!formData.data_convocacao || !formData.horario) {
      toast.error(
        "Preencha os campos obrigatórios: Data e Horário da convocação",
      );
      return;
    }
    setStep("confirm");
  };

  // ── Final confirm & submit ─────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsSending(true);
    try {
      if (convocacaoToEdit) {
        updateConvocacao(convocacaoToEdit.id, formData);
        toast.success("Convocação atualizada com sucesso");
      } else {
        const newConvocacao: Convocacao = {
          ...(formData as Convocacao),
          id: `conv-${Date.now()}`,
          status: "pendente",
        };
        addConvocacao(newConvocacao);
        toast.success("Convocação criada e enviada para o módulo diário");

        const bancoId =
          formData.banco_id || (formData as any).banco_relacionado;
        if (bancoId) {
          updateBancoAsync(bancoId, {
            status: "Convocado(a)",
            status_calculado: "Convocado(a)",
            data_convocacao: formData.data_convocacao,
            unidade_convocacao: formData.unidade || vaga?.unidade,
          });
        }

        if (vaga) {
          const fromBanco = !!(
            formData.banco_id || (formData as any).banco_relacionado
          );
          updateVagaAsync(vaga.id, {
            status: "EM ANDAMENTO",
            etapa: "Convocação" as any,
            status_processo: "Em Andamento" as any,
            ...(fromBanco && {
              tratativa: "Aproveitamento de Banco de Talentos" as any,
            }),
          });
        }

        // Send WhatsApp if requested
        if (enviarWhatsapp && telefone) {
          try {
            await sendWhatsappMessage(telefone, formData.cargo || "");
            toast.success("WhatsApp enviado com sucesso!");
          } catch (err) {
            toast.warning(
              "Convocação criada, mas houve um erro ao enviar o WhatsApp.",
            );
          }
        }
      }

      setStep("form");
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtDate = (iso: string | undefined) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const tipoLabel =
    formData.tipo_atendimento === "online" ? "Online" : "Presencial";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {convocacaoToEdit
              ? "Editar Agendamento"
              : step === "confirm"
                ? "Confirmar Convocação"
                : "Criar Novo Agendamento de Convocação"}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm"
              ? "Revise todos os dados antes de confirmar."
              : "A convocação preenchida será enviada para o painel de Convocações Diárias para devolutiva final."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP: FORM ─────────────────────────────────────────────────── */}
        {step === "form" && (
          <div className="space-y-5 py-2">
            {/* ── Header: Vaga info (read-only) ─── */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
              <InfoField
                label="Vaga"
                value={formData.cargo}
                icon={<FileText className="h-3 w-3" />}
              />
              <InfoField
                label="Unidade Origem"
                value={formData.unidade}
                icon={<Building2 className="h-3 w-3" />}
              />
              <InfoField label="Requisição" value={formData.requisicao} />
              <InfoField label="Seção" value={formData.secao} />
            </div>

            {/* ── Candidate box (read-only) ─── */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Candidato(a)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <InfoField label="Nome" value={formData.nome_candidato} />
                </div>
                <InfoField
                  label="Classificação"
                  value={
                    formData.classificacao
                      ? `${formData.classificacao}º`
                      : undefined
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoField label="Nº do Processo Seletivo" value={numeroPS} />
                <InfoField label="Edital" value={formData.edital_relacionado} />
                <InfoField
                  label="Telefone"
                  value={telefone}
                  icon={<Phone className="h-3 w-3" />}
                />
              </div>
            </div>

            {/* ── Editable: Detalhes do Agendamento ─── */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Detalhes do Agendamento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data */}
                <div className="space-y-2">
                  <Label htmlFor="data_convocacao">
                    Data da Convocação <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="data_convocacao"
                    type="date"
                    value={formData.data_convocacao || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        data_convocacao: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                {/* Horário */}
                <div className="space-y-2">
                  <Label>
                    Horário da Convocação{" "}
                    <span className="text-red-500">*</span>
                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      (Horário de Brasília)
                    </span>
                  </Label>

                  {isGoiania ? (
                    <>
                      <Select
                        value={formData.horario || ""}
                        onValueChange={(v) =>
                          setFormData((p) => ({ ...p, horario: v }))
                        }
                      >
                        <SelectTrigger className="bg-white border-primary/20">
                          <SelectValue placeholder="Selecione um horário com vagas" />
                        </SelectTrigger>
                        <SelectContent>
                          {horariosDisponiveis.length > 0 ? (
                            horariosDisponiveis.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Nenhum horário disponível (limite de 5 atingido)
                            </SelectItem>
                          )}
                          {convocacaoToEdit &&
                            !horariosDisponiveis.includes(
                              convocacaoToEdit.horario,
                            ) && (
                              <SelectItem value={convocacaoToEdit.horario}>
                                {convocacaoToEdit.horario} (Atual)
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500 italic flex gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Base Goiânia: máximo 5 agendamentos por horário entre
                        todas as unidades.
                      </p>
                    </>
                  ) : (
                    <>
                      <TimeInput
                        value={formData.horario || ""}
                        onChange={(v) =>
                          setFormData((p) => ({ ...p, horario: v }))
                        }
                      />
                      <p className="text-[10px] text-slate-500 italic flex gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Digite o horário (ex: 14:30) ou use o{" "}
                        <Clock className="h-3 w-3 mx-0.5 inline" /> para
                        selecionar.
                      </p>
                    </>
                  )}
                </div>

                {/* Tipo de Atendimento */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_atendimento">
                    Tipo de Atendimento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo_atendimento || "presencial"}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        tipo_atendimento: v as any,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Unidade Alternativa */}
                <div className="space-y-2">
                  <Label htmlFor="unidade_alternativa">
                    Unidade Alternativa
                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      (opcional)
                    </span>
                  </Label>
                  <Select
                    value={formData.unidade_alternativa || "__none__"}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        unidade_alternativa: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue placeholder="Selecione uma unidade…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-slate-400">Nenhuma</span>
                      </SelectItem>
                      {UNIDADES_ALTERNATIVAS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Tatodesk */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_convocacao">
                    Template Tatodesk <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tipo_convocacao"
                    value="Convocação do Banco de Talentos"
                    readOnly
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Nº EDOC */}
                <div className="space-y-2">
                  <Label htmlFor="edoc">
                    Nº EDOC
                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      (opcional)
                    </span>
                  </Label>
                  <Input
                    id="edoc"
                    value={formData.edoc || ""}
                    onChange={handleEdocChange}
                    placeholder="20260000.00000"
                    className="font-mono tracking-wider"
                    maxLength={14}
                  />
                  <p className="text-[10px] text-slate-400">
                    Formato: 00000000.00000
                  </p>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">
                  Observações
                  <span className="ml-1 text-[10px] font-normal text-slate-400">
                    (opcional)
                  </span>
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, observacoes: e.target.value }))
                  }
                  placeholder="Informações adicionais sobre a convocação..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ──────────────────────────────────────────────── */}
        {step === "confirm" && (
          <div className="space-y-4 py-2">
            {/* Vaga header */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
              <InfoField
                label="Vaga"
                value={formData.cargo}
                icon={<FileText className="h-3 w-3" />}
              />
              <InfoField
                label="Unidade Origem"
                value={formData.unidade}
                icon={<Building2 className="h-3 w-3" />}
              />
              <InfoField label="Requisição" value={formData.requisicao} />
              <InfoField label="Seção" value={formData.secao} />
            </div>

            {/* Candidate */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Candidato
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <InfoField label="Nome" value={formData.nome_candidato} />
                </div>
                <InfoField
                  label="Classificação"
                  value={
                    formData.classificacao
                      ? `${formData.classificacao}º`
                      : undefined
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoField label="Nº do Processo Seletivo" value={numeroPS} />
                <InfoField label="Edital" value={formData.edital_relacionado} />
                <InfoField
                  label="Telefone"
                  value={telefone}
                  icon={<Phone className="h-3 w-3" />}
                />
              </div>
            </div>

            {/* Scheduling details */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Detalhes do Agendamento
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoField
                  label="Data da Convocação"
                  value={fmtDate(formData.data_convocacao)}
                />
                <InfoField
                  label="Horário (Brasília)"
                  value={formData.horario}
                />
                <InfoField label="Tipo de Atendimento" value={tipoLabel} />
                <InfoField
                  label="Unidade Alternativa"
                  value={formData.unidade_alternativa || "—"}
                />
                <InfoField
                  label="Template Tatodesk"
                  value="Convocação do Banco de Talentos"
                />
                <InfoField label="Nº EDOC" value={formData.edoc || "—"} />
              </div>
              {formData.observacoes && (
                <div className="space-y-0.5 pt-1 border-t border-primary/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Observações
                  </span>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {formData.observacoes}
                  </p>
                </div>
              )}
            </div>

            {/* WhatsApp checkbox */}
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border transition-colors",
                enviarWhatsapp
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-200",
              )}
            >
              <Checkbox
                id="enviar_whatsapp"
                checked={enviarWhatsapp}
                onCheckedChange={(v) => setEnviarWhatsapp(!!v)}
                className="mt-0.5"
                disabled={!telefone}
              />
              <div>
                <label
                  htmlFor="enviar_whatsapp"
                  className={cn(
                    "text-sm font-semibold cursor-pointer select-none flex items-center gap-1.5",
                    enviarWhatsapp ? "text-green-700" : "text-slate-700",
                    !telefone && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar WhatsApp
                </label>
                {telefone ? (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Será enviada uma mensagem ao candidato no número{" "}
                    <strong>{telefone}</strong> via template{" "}
                    <em>Convocação do Banco de Talentos</em>.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Nenhum telefone cadastrado para este candidato.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DialogFooter className="pt-4 border-t gap-2">
          {step === "form" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="px-8 font-bold"
                onClick={
                  convocacaoToEdit
                    ? () => {
                        updateConvocacao(convocacaoToEdit.id, formData);
                        toast.success("Convocação atualizada com sucesso");
                        onOpenChange(false);
                      }
                    : handleCreateClick
                }
              >
                {convocacaoToEdit ? "Salvar Alterações" : "Criar Convocação"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                className="px-8 font-bold gap-2"
                onClick={handleConfirm}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar Convocação
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
