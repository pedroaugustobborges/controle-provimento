import React, { useState } from "react";
import { BancoTalentos, Convocacao } from "@/types/vaga";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users,
  Building,
  BookUser,
  FileText,
  Calendar,
  ClipboardList,
  Puzzle,
  Clock,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  ChevronRight,
  CalendarDays,
  UserCheck,
  ArrowRight,
} from "lucide-react";

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const clean = raw.replace(/^data\s*(pub\.?)?\s*:\s*/i, "").trim();
  const brMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return new Date(+brMatch[3], +brMatch[2] - 1, +brMatch[1]);
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  return null;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function addMonths(d: Date, m: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "CADASTRO RESERVA":
    case "VALIDO":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <Hourglass className="h-2.5 w-2.5" />
          Cad. Reserva
        </span>
      );
    case "CONVOCADO":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Convocado
        </span>
      );
    case "VENCIDO":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
          <XCircle className="h-2.5 w-2.5" />
          Vencido
        </span>
      );
    case "PRORROGADO":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
          <Calendar className="h-2.5 w-2.5" />
          Prorrogado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
          {status || "Indeterminado"}
        </span>
      );
  }
}

// ── Score ring for Média Final ────────────────────────────────────────────────

function ScoreRing({ value, max = 100 }: { value: number | null; max?: number }) {
  const pct = value !== null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const strokeColor =
    value === null
      ? "#cbd5e1"
      : value >= 70
      ? "#10b981"
      : value >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90 w-full h-full">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <span
        className="relative text-[11px] font-black tabular-nums leading-none"
        style={{ color: value !== null ? strokeColor : "#94a3b8" }}
      >
        {value !== null ? value.toFixed(0) : "—"}
      </span>
    </div>
  );
}

// ── Rank badge colours ────────────────────────────────────────────────────────

function getRankStyle(_rank: number | string) {
  return { gradient: "from-slate-400 to-slate-500", text: "text-white" };
}

// ── Candidate card ────────────────────────────────────────────────────────────

interface CandidateCardProps {
  candidate: any;
  banco: BancoTalentos;
  onConvocar: (data: Partial<Convocacao>) => void;
}

function CandidateCard({ candidate: c, banco, onConvocar }: CandidateCardProps) {
  const notaAv     = parseFloat((c as any).nota_avaliacao)  || null;
  const notaEnt    = parseFloat((c as any).nota_entrevista) || null;
  const mediaFinal = parseFloat((c as any).media_final)    || null;
  const obs        = (c as any).observacao as string | undefined;
  const hasObs     = !!obs && obs !== "nan" && obs.trim() !== "";
  const rank       = getRankStyle(c.classificacao);


  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">

      {/* ── Profile header ───────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        {/* Rank badge */}
        <div
          className={cn(
            "h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm",
            rank.gradient
          )}
        >
          <span className={cn("text-xs font-black", rank.text)}>
            {c.classificacao}°
          </span>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight truncate">
              {c.nome || "Não identificado"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              {(c as any).cpf ? `CPF: ${(c as any).cpf}` : "CPF não informado"}
            </p>
          </div>
        </div>

        {/* Status chip */}
        <div className="shrink-0">
          <StatusChip status={c.status} />
        </div>
      </div>

      {/* ── Scores row ───────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1fr_auto] divide-x divide-slate-100 border-b border-slate-100">
        {/* Nota Avaliação */}
        <div className="flex flex-col items-center justify-center py-3 px-3 gap-0.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Nota Avaliação
          </p>
          <p
            className={cn(
              "text-lg font-black tabular-nums",
              notaAv === null ? "text-slate-300" : "text-slate-700"
            )}
          >
            {notaAv !== null ? notaAv.toFixed(2) : "—"}
          </p>
        </div>

        {/* Nota Entrevista */}
        <div className="flex flex-col items-center justify-center py-3 px-3 gap-0.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Nota Entrevista
          </p>
          <p
            className={cn(
              "text-lg font-black tabular-nums",
              notaEnt === null ? "text-slate-300" : "text-slate-700"
            )}
          >
            {notaEnt !== null ? notaEnt.toFixed(2) : "—"}
          </p>
        </div>

        {/* Média Final — highlighted with ring */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-br from-primary/5 to-primary/[0.08]">
          <ScoreRing value={mediaFinal} />
          <div>
            <p className="text-[9px] font-bold text-primary/50 uppercase tracking-widest">
              Média Final
            </p>
            <p className="text-2xl font-black tabular-nums text-primary leading-none mt-0.5">
              {mediaFinal !== null ? mediaFinal.toFixed(2) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Contact grid ─────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div className="flex items-start gap-2">
          <Phone className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Telefone
            </p>
            <p className="text-[11px] font-semibold text-slate-700">
              {(c as any).telefone || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Nascimento
            </p>
            <p className="text-[11px] font-semibold text-slate-700">
              {(c as any).data_nascimento
                ? fmtDate(parseDate((c as any).data_nascimento))
                : "—"}
            </p>
          </div>
        </div>
        <div className="col-span-2 flex items-start gap-2">
          <Mail className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              E-mail
            </p>
            <p className="text-[11px] font-semibold text-slate-700 truncate">
              {(c as any).email || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Observação ───────────────────────────────────── */}
      {hasObs && (
        <div className="mx-4 mb-3 mt-1 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">
            Observação
          </p>
          <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">
            {obs}
          </p>
        </div>
      )}

      {/* ── Convocar ─────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-medium">
          {c.classificacao}° classificado
        </p>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0"
          onClick={() =>
            onConvocar({
              nome_candidato: c.nome || "",
              classificacao: Number(c.classificacao) || 1,
              cargo: banco.cargo,
              unidade: banco.unidade,
              secao: banco.secao || "",
              edital_relacionado: banco.numero_edital || "",
              banco_id: c.id,
              requisicao:
                c.numero_processo_seletivo || c.numero_chamada || "",
            })
          }
        >
          <UserCheck className="h-3.5 w-3.5" />
          Convocar
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </div>
    </div>
  );
}

// ── Sidebar field ─────────────────────────────────────────────────────────────

function SideField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

// ── Prorrogar button + rich tooltip ──────────────────────────────────────────

function ProrrogarButton({
  val6m,
  val12m,
  isLoading,
  onClick,
}: {
  val6m: Date | null;
  val12m: Date | null;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={onClick}
            className="h-6 gap-1 text-[10px] font-bold border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-400 bg-amber-500/5 transition-all disabled:opacity-60 px-2"
          >
            <Clock className="h-2.5 w-2.5" />
            {isLoading ? "Prorrogando…" : "Prorrogar"}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-0 w-64 overflow-hidden rounded-xl border-0 shadow-2xl">
          {/* Tooltip header */}
          <div className="flex items-center gap-2 bg-amber-500 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-white shrink-0" />
            <p className="text-xs font-bold text-white">Prorrogar Validade</p>
          </div>
          {/* Tooltip body */}
          <div className="bg-amber-50 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-amber-700 font-medium">De</span>
              <span className="font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded-md">
                {fmtDate(val6m)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-amber-700 font-medium">Para</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                {fmtDate(val12m)}
              </span>
            </div>
            <p className="text-[10px] text-amber-700 leading-relaxed border-t border-amber-200 pt-2">
              Estende a validade em{" "}
              <strong className="text-amber-900">+6 meses</strong>. Esta ação{" "}
              <strong className="text-amber-900">não pode ser desfeita</strong>.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export interface BancoTalentosDetalhesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  banco: BancoTalentos | null;
  candidates: any[];
  canProrrogate: boolean;
  currentUser: any;
  fetchBancos: () => Promise<void>;
  onConvocar: (data: Partial<Convocacao>) => void;
}

export function BancoTalentosDetalhesModal({
  open,
  onOpenChange,
  banco,
  candidates,
  canProrrogate,
  currentUser,
  fetchBancos,
  onConvocar,
}: BancoTalentosDetalhesModalProps) {
  const [prorrogando, setProrrogando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Local optimistic state so the label flips immediately on success
  const [localProrrogado, setLocalProrrogado] = useState(false);
  const [localNovaValidade, setLocalNovaValidade] = useState<string | null>(null);

  if (!banco) return null;

  const pubDate      = parseDate((banco as any).data_publicacao);
  const val6m        = pubDate ? addMonths(pubDate, 6)  : null;
  const val12m       = pubDate ? addMonths(pubDate, 12) : null;
  const isProrrogado = localProrrogado || !!(banco.is_prorrogado || banco.nova_data_validade);
  const novaValidadeStr = localNovaValidade ?? banco.nova_data_validade ?? null;
  const isTeia       = !!(banco as any).is_teia;

  const handleProrrogar = async () => {
    if (!val12m || !currentUser) return;
    setProrrogando(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const novaValidade = `${val12m.getFullYear()}-${String(val12m.getMonth() + 1).padStart(2, "0")}-${String(val12m.getDate()).padStart(2, "0")}`;
      const ids = candidates.map((c) => c.id);
      const { error } = await supabase
        .from("banco_candidatos")
        .update({ is_prorrogado: true, nova_data_validade: novaValidade })
        .in("id", ids);
      if (error) throw error;
      // Flip label immediately without waiting for re-fetch
      setLocalProrrogado(true);
      setLocalNovaValidade(novaValidade);
      setShowConfirm(false);
      toast.success("Validade prorrogada com sucesso!");
      await fetchBancos();
    } catch (e: any) {
      toast.error(`Erro ao prorrogar: ${e.message}`);
    } finally {
      setProrrogando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-0 shadow-2xl">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookUser className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {banco.cargo}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {banco.unidade}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-0.5">
              <StatusChip status={banco.status} />
              {isProrrogado && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  <Calendar className="h-2.5 w-2.5" /> Prorrogado
                </span>
              )}
              {isTeia && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <Puzzle className="h-2.5 w-2.5" /> Rede Teia
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Users className="h-2.5 w-2.5" />
                {candidates.length}{" "}
                {candidates.length !== 1 ? "candidatos" : "candidato"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left sidebar (dark) ──────────────────────── */}
          <div className="w-64 shrink-0 bg-slate-900 overflow-y-auto p-5 space-y-5">

            {/* Edital e Processo */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Edital e Processo
              </h3>
              <div className="space-y-3">
                <SideField
                  label="Nº do Edital"
                  value={
                    isTeia ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Puzzle className="h-3.5 w-3.5" /> Rede Teia
                      </span>
                    ) : (
                      banco.numero_edital || "—"
                    )
                  }
                />
                <SideField
                  label="Nº do Processo Seletivo"
                  value={
                    banco.numero_processo_seletivo ||
                    banco.numero_processo ||
                    "—"
                  }
                />
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Datas Importantes */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Datas Importantes
              </h3>
              <div className="space-y-3">
                <SideField label="Publicação" value={fmtDate(pubDate)} />

                {/* Validade + Prorrogar */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-all">
                    {isProrrogado ? "Validade Prorrogada" : "Validade Original"}
                  </p>
                  {isProrrogado ? (
                    <p className="text-sm font-semibold text-blue-400">
                      {novaValidadeStr
                        ? fmtDate(
                            parseDate(novaValidadeStr) ??
                              new Date(novaValidadeStr)
                          )
                        : fmtDate(val12m)}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-100">
                          {fmtDate(val6m)}
                        </p>
                        {val12m && canProrrogate && !showConfirm && (
                          <ProrrogarButton
                            val6m={val6m}
                            val12m={val12m}
                            isLoading={prorrogando}
                            onClick={() => setShowConfirm(true)}
                          />
                        )}
                      </div>

                      {/* ── Confirmation panel ── */}
                      {showConfirm && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-amber-500/30 shadow-lg shadow-black/30">
                          {/* Header */}
                          <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-2 border-b border-amber-500/20">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                              Confirmar Prorrogação
                            </p>
                          </div>
                          {/* Body */}
                          <div className="bg-slate-800/60 px-3 py-3 space-y-2.5">
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              A validade será estendida em{" "}
                              <span className="font-bold text-slate-200">+6 meses</span>:
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-1 rounded-lg tabular-nums">
                                {fmtDate(val6m)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-amber-400 shrink-0" />
                              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-lg tabular-nums">
                                {fmtDate(val12m)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-2 pt-0.5">
                              <button
                                onClick={() => setShowConfirm(false)}
                                disabled={prorrogando}
                                className="flex-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-all disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleProrrogar}
                                disabled={prorrogando}
                                className="flex-1 text-[11px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 py-1.5 rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-1"
                              >
                                {prorrogando ? (
                                  <>
                                    <Clock className="h-3 w-3 animate-spin" />
                                    Salvando…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Confirmar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {banco.data_convocacao && (
                  <SideField
                    label="Data Convocação"
                    value={
                      <span className="text-green-400">
                        {fmtDate(parseDate(banco.data_convocacao))}
                      </span>
                    }
                  />
                )}
              </div>
            </section>

            {/* Convocação details (conditional) */}
            {(banco.data_convocacao || banco.status === "CONVOCADO") && (
              <>
                <div className="border-t border-slate-800" />
                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ClipboardList className="h-3 w-3" /> Convocação
                  </h3>
                  <div className="space-y-3">
                    {banco.unidade_convocacao && (
                      <SideField
                        label="Unidade de Convocação"
                        value={banco.unidade_convocacao}
                      />
                    )}
                    {banco.numero_chamada && (
                      <SideField
                        label="Nº da Chamada"
                        value={banco.numero_chamada}
                      />
                    )}
                    {banco.numero_vaga_aproveitamento && (
                      <SideField
                        label="Vaga Aproveitamento"
                        value={banco.numero_vaga_aproveitamento}
                      />
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* ── Right: candidates list ───────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Candidatos Classificados
              </h3>
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                {candidates.length}
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Users className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm italic">Nenhum candidato listado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    banco={banco}
                    onConvocar={onConvocar}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
