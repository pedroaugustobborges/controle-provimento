import { KanbanBoard } from '@/components/KanbanBoard';
import { AgendaDiaria } from '@/components/AgendaDiaria';
import { BloqueioHorarioDialog } from '@/components/BloqueioHorarioDialog';
import { ConvocacaoDetalhesModal } from '@/components/ConvocacaoDetalhesModal';
import { Button } from '@/components/ui/button';
import {
  Plus, Search, Calendar as CalendarIcon, Building2,
  LayoutGrid, List, AlertCircle, ArrowRight,
  MoreVertical, Eye, Edit, Trash2, X, Clock, Lock,
  Send, UserX, TrendingUp, CheckCircle2,
  XCircle, Users, UserMinus, ShieldOff, Video,
  CalendarDays, Ban,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Convocacao, BloqueioHorario } from '@/types/vaga';
import { ConvocacaoDialog } from '@/components/ConvocacaoDialog';
import { DevolutivaDialog } from '@/components/DevolutivaDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { ExportButton } from '@/components/ExportButton';
import { formatDate, filterByRegionAndUnit } from '@/lib/vagaUtils';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { PageHeader } from '@/components/PageHeader';
import {
  getBaseForUnidade, BASES_CONVOCACAO, UNIDADES_VITORIA,
} from '@/lib/convocacaoUtils';
import { ConvocacoesDashboardContent } from '@/pages/ConvocacoesDashboardPage';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays, parseISO as parseISODate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PageSkeleton } from '@/components/PageSkeleton';
import { cn } from '@/lib/utils';

// ── Status configuration ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bar: string; badge: string; dot: string }> = {
  pendente:       { label: 'Pendente',        bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  aceite:         { label: 'Aceite',          bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  recusa_plantao: { label: 'Recusa Plantão',  bar: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400' },
  recusa_unidade: { label: 'Recusa Unidade',  bar: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400' },
  recusa_horario: { label: 'Recusa Horário',  bar: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  desistiu:       { label: 'Desistiu',        bar: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
  faltou:         { label: 'Faltou',          bar: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
};

const getStatusCfg = (status: string) =>
  STATUS_CONFIG[status] ?? { label: status, bar: 'bg-slate-300', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

const DEVOLUTIVA_CFG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  aceitou:         { label: 'Aceitou',         icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  recusou:         { label: 'Recusou',         icon: XCircle,      cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  faltou:          { label: 'Faltou',          icon: UserX,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  desistiu:        { label: 'Desistiu',        icon: UserMinus,    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  desclassificado: { label: 'Desclassificado', icon: ShieldOff,    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const MOTIVO_DESISTENCIA_LABELS: Record<string, string> = {
  desistencia_horario: 'Horário',
  desistencia_unidade: 'Unidade',
  desistencia_cargo:   'Cargo',
  outros:              'Outro',
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, active, onClick,
}: {
  label: string; value: number; icon: React.ReactNode;
  color: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 group',
        active
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black tabular-nums leading-none text-slate-800">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5 truncate">{label}</p>
      </div>
    </button>
  );
}

// ── Convocação card (list view) ───────────────────────────────────────────────
function ConvocacaoCard({
  c, onEdit, onDevolutiva, onDetalhes, onDesistencia, onDelete, onReenviar,
}: {
  c: Convocacao;
  onEdit: () => void;
  onDevolutiva: () => void;
  onDetalhes: () => void;
  onDesistencia: () => void;
  onDelete: () => void;
  onReenviar: () => void;
}) {
  const cfg = getStatusCfg(c.status);

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const isToday = c.data_convocacao === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="group relative flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      {/* Left status bar */}
      <div className={cn('w-1 shrink-0 rounded-l-xl', cfg.bar)} />

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4 min-w-0">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {c.cargo}
              </span>
              {c.unidade_alternativa && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded">
                  → {c.unidade_alternativa}
                </span>
              )}
            </div>
            <p className="text-base font-black text-slate-800 leading-snug mt-0.5 truncate">
              {c.nome_candidato}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {/* Status badge */}
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
              cfg.badge,
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
            {/* Devolutiva badge */}
            {c.devolutiva && DEVOLUTIVA_CFG[c.devolutiva] && (() => {
              const dv = DEVOLUTIVA_CFG[c.devolutiva!];
              const motivo = (c as any).motivo_recusa as string | undefined;
              const motivoLabel = motivo ? MOTIVO_DESISTENCIA_LABELS[motivo] : null;
              return (
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', dv.cls)}>
                  <dv.icon className="h-2.5 w-2.5" />
                  {dv.label}{motivoLabel ? ` · ${motivoLabel}` : ''}
                </span>
              );
            })()}
            {/* Date + time */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <CalendarIcon className="h-3 w-3" />
              <span className={cn(isToday && 'font-bold text-primary')}>
                {fmtDate(c.data_convocacao)}
              </span>
              {c.horario && (
                <>
                  <span className="text-slate-300">·</span>
                  <Clock className="h-3 w-3" />
                  <span>{c.horario}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {c.unidade}
          </span>
          {c.classificacao && (
            <>
              <span className="text-slate-300">·</span>
              <span>{c.classificacao}º classificado</span>
            </>
          )}
          {c.requisicao && (
            <>
              <span className="text-slate-300">·</span>
              <span>Req. {c.requisicao}</span>
            </>
          )}
          {c.edoc && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-[10px]">EDOC {c.edoc}</span>
            </>
          )}
          {c.tipo_atendimento && (
            <span className={cn(
              'ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              c.tipo_atendimento === 'online'
                ? 'border-blue-100 bg-blue-50 text-blue-600'
                : 'border-slate-100 bg-slate-50 text-slate-500',
            )}>
              {c.tipo_atendimento === 'online' ? 'Online' : 'Presencial'}
            </span>
          )}
        </div>

        {/* Observacoes preview */}
        {c.observacoes && (
          <p className="text-[11px] italic text-slate-400 truncate">
            "{c.observacoes}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 pr-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {c.status === 'pendente' && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-bold border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
            onClick={onDevolutiva}
          >
            Devolutiva <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
          title="Editar"
          onClick={onEdit}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-700">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="gap-2" onClick={onDetalhes}>
              <Eye className="h-4 w-4 text-blue-500" /> Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={onReenviar}>
              <Send className="h-4 w-4 text-primary" /> Reenviar Comunicação
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={onDesistencia}>
              <UserX className="h-4 w-4 text-amber-500" /> Registrar Desistência
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Users className="h-7 w-7 text-slate-300" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

// ── Bloqueios view ────────────────────────────────────────────────────────────
function BloqueiosView({
  bloqueios,
  onAdd,
  onRemove,
}: {
  bloqueios: BloqueioHorario[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    return bloqueios.filter(b => {
      if (filter === 'upcoming') return b.data >= todayStr;
      if (filter === 'past') return b.data < todayStr;
      return true;
    });
  }, [bloqueios, filter, todayStr]);

  // Group by date then sort within each group
  const grouped = useMemo(() => {
    const map: Record<string, BloqueioHorario[]> = {};
    filtered.forEach(b => {
      if (!map[b.data]) map[b.data] = [];
      map[b.data].push(b);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => {
        if (a.dia_inteiro && !b.dia_inteiro) return -1;
        if (!a.dia_inteiro && b.dia_inteiro) return 1;
        return (a.horario || '').localeCompare(b.horario || '');
      }),
    );
    return map;
  }, [filtered]);

  const sortedDates = useMemo(() =>
    Object.keys(grouped).sort((a, b) =>
      filter === 'past' ? b.localeCompare(a) : a.localeCompare(b),
    ),
  [grouped, filter]);

  const stats = useMemo(() => ({
    ativos:     bloqueios.filter(b => b.data >= todayStr).length,
    diaInteiro: bloqueios.filter(b => b.dia_inteiro).length,
    periodos:   bloqueios.filter(b => !b.dia_inteiro).length,
    total:      bloqueios.length,
  }), [bloqueios, todayStr]);

  const fmtDateLabel = (iso: string) => {
    const d = parseISODate(iso);
    const diff = differenceInDays(d, new Date());
    const weekday = format(d, "EEEE", { locale: ptBR });
    const dateStr = format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    let badge: { label: string; cls: string } | null = null;
    if (diff === 0)       badge = { label: 'Hoje',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    else if (diff === 1)  badge = { label: 'Amanhã',  cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    else if (diff > 1)    badge = { label: `em ${diff} dias`, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    else                  badge = { label: 'Passado', cls: 'bg-slate-100 text-slate-400 border-slate-200' };
    return { weekday, dateStr, badge, isPast: diff < 0 };
  };

  return (
    <div className="space-y-5">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bloqueios Ativos',  value: stats.ativos,     color: 'bg-red-50',    icon: <Ban className="h-4 w-4 text-red-500" />,       dot: 'bg-red-400' },
          { label: 'Dias Inteiros',     value: stats.diaInteiro, color: 'bg-rose-50',   icon: <CalendarDays className="h-4 w-4 text-rose-500" />, dot: 'bg-rose-400' },
          { label: 'Períodos',          value: stats.periodos,   color: 'bg-orange-50', icon: <Clock className="h-4 w-4 text-orange-500" />,  dot: 'bg-orange-400' },
          { label: 'Total Histórico',   value: stats.total,      color: 'bg-slate-50',  icon: <Lock className="h-4 w-4 text-slate-400" />,    dot: 'bg-slate-300' },
        ].map(s => (
          <div key={s.label} className={cn('flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3', s.color)}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums leading-none text-slate-800">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter + action row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {([
            { id: 'upcoming', label: 'Próximos' },
            { id: 'past',     label: 'Passados' },
            { id: 'all',      label: 'Todos'    },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all',
                filter === f.id
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-200 transition-all hover:shadow-md hover:shadow-red-200 hover:-translate-y-px active:translate-y-0"
        >
          <Lock className="h-3.5 w-3.5" /> Bloquear Horário
        </button>
      </div>

      {/* ── Empty state ── */}
      {sortedDates.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Lock className="h-8 w-8 text-slate-300" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-500">Nenhum bloqueio {filter === 'upcoming' ? 'ativo' : filter === 'past' ? 'passado' : ''}</p>
            <p className="text-xs text-slate-400">
              {filter === 'upcoming' ? 'Clique em "Bloquear Horário" para adicionar um novo bloqueio.' : 'Nenhum registro encontrado.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Date groups ── */}
      <div className="space-y-4">
        {sortedDates.map(dateStr => {
          const { weekday, dateStr: dateLabel, badge, isPast } = fmtDateLabel(dateStr);
          const list = grouped[dateStr];
          return (
            <div
              key={dateStr}
              className={cn('rounded-2xl border overflow-hidden shadow-sm', isPast ? 'border-slate-200 opacity-70' : 'border-slate-200')}
            >
              {/* Date header */}
              <div className={cn(
                'px-5 py-3 flex items-center justify-between border-b',
                isPast ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100',
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                    isPast ? 'bg-slate-100' : 'bg-primary/10',
                  )}>
                    <CalendarDays className={cn('h-4.5 w-4.5', isPast ? 'text-slate-400' : 'text-primary')} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-black capitalize', isPast ? 'text-slate-500' : 'text-slate-800')}>
                      {weekday}
                    </p>
                    <p className="text-xs text-slate-400 font-medium capitalize">{dateLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {badge && (
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', badge.cls)}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {list.length} bloqueio{list.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Block entries */}
              <div className="divide-y divide-slate-100 bg-white">
                {list.map(b => (
                  <div
                    key={b.id}
                    className={cn(
                      'flex items-start gap-4 px-5 py-4 group transition-colors',
                      b.dia_inteiro
                        ? 'bg-red-50/60 hover:bg-red-50'
                        : 'hover:bg-slate-50/80',
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      b.dia_inteiro ? 'bg-red-100' : 'bg-orange-50 border border-orange-100',
                    )}>
                      {b.dia_inteiro
                        ? <Ban className="h-5 w-5 text-red-500" />
                        : <Clock className="h-5 w-5 text-orange-500" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Time label */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.dia_inteiro ? (
                          <span className="text-sm font-black text-red-700 uppercase tracking-wide">Dia Inteiro</span>
                        ) : (
                          <span className="text-sm font-black text-slate-800 font-mono tabular-nums">
                            {b.horario}{b.horario_fim ? ` – ${b.horario_fim}` : ''}
                          </span>
                        )}
                        {b.dia_inteiro && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                            Bloqueio Total
                          </span>
                        )}
                      </div>

                      {/* Motivo */}
                      <p className="text-sm text-slate-700 font-medium leading-snug">{b.motivo}</p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {b.unidades
                            ? b.unidades.length === 1
                              ? b.unidades[0]
                              : `${b.unidades.length} unidades`
                            : 'Todas as unidades'}
                        </span>
                        <span className="text-slate-200 select-none">·</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Bloqueado por <span className="font-semibold text-slate-600">{b.criado_por}</span>
                        </span>
                        {b.link_teams && (
                          <>
                            <span className="text-slate-200 select-none">·</span>
                            <a
                              href={b.link_teams}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <Video className="h-3 w-3" /> Teams
                            </a>
                          </>
                        )}
                      </div>

                      {/* Unit chips when multiple */}
                      {b.unidades && b.unidades.length > 1 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {b.unidades.map(u => (
                            <span key={u} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                              {u}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => onRemove(b.id)}
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remover bloqueio"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ConvocacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    vagas, convocacoes, bloqueios, isInitialLoad, isConvocacoesLoaded,
    updateConvocacao, fetchConvocacoes, removeBloqueio,
  } = useVagasStore();
  const { currentUser, selectedRegion, selectedUnit: globalUnit, addAuditLog } = useAdminStore();

  const [view, setView] = useState<'diaria' | 'kanban' | 'list' | 'dashboard' | 'bloqueios'>('diaria');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDevolutivaOpen, setIsDevolutivaOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDesistenciaOpen, setIsDesistenciaOpen] = useState(false);
  const [isBloqueioOpen, setIsBloqueioOpen] = useState(false);

  const [selectedVaga, setSelectedVaga] = useState<any>(null);
  const [convocacaoToEdit, setConvocacaoToEdit] = useState<Convocacao | null>(null);
  const [selectedConvocacao, setSelectedConvocacao] = useState<Convocacao | null>(null);
  const [convocacaoParaAcao, setConvocacaoParaAcao] = useState<Convocacao | null>(null);
  const [registroParaExcluir, setRegistroParaExcluir] = useState<string | null>(null);
  const [desistenciaMotivo, setDesistenciaMotivo] = useState('');

  const [search, setSearch] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined, to: undefined,
  });

  // Ensure convocações are loaded — they're not fetched by AppLayout
  useEffect(() => {
    if (!isConvocacoesLoaded) fetchConvocacoes();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['diaria', 'kanban', 'list', 'dashboard'].includes(tab)) setView(tab as any);

    const openParam = searchParams.get('open');
    const vagaIdParam = searchParams.get('vagaId');
    if (openParam === 'true' && vagaIdParam) {
      const vaga = useVagasStore.getState().vagas.find(v => v.id === vagaIdParam);
      if (vaga) { setSelectedVaga(vaga); setIsDialogOpen(true); }
      setSearchParams(prev => { prev.delete('open'); prev.delete('vagaId'); return prev; });
    }
  }, [searchParams]);

  const handleViewChange = (v: string) => {
    setView(v as any);
    setSearchParams({ tab: v });
  };

  // ── Unit options ───────────────────────────────────────────────────────────
  const unidades = useMemo(() => Object.keys(BASES_CONVOCACAO).sort(), []);

  const matchesUnidadeFilter = (unidade: string) => {
    if (selectedUnidade === 'all') return true;
    const norm = unidade?.toUpperCase().trim() || '';
    if (selectedUnidade.toUpperCase() === 'VITÓRIA') {
      return UNIDADES_VITORIA.some(u => u.toUpperCase() === norm) ||
        norm.includes('VITÓRIA') || norm.includes('VITORIA');
    }
    const unidadesNaBase = BASES_CONVOCACAO[selectedUnidade];
    if (unidadesNaBase) {
      return unidadesNaBase.some(u => u.toUpperCase() === norm) ||
        getBaseForUnidade(unidade) === selectedUnidade;
    }
    const normFilter = selectedUnidade.toUpperCase().trim();
    return norm.includes(normFilter) || normFilter.includes(norm);
  };

  // ── Accessible convocações (region/unit access) ────────────────────────────
  const accessibleConvocacoes = useMemo(() => {
    if (!currentUser) return [];
    const base = filterByRegionAndUnit(convocacoes, selectedRegion, globalUnit);
    return base.filter(c =>
      currentUser.visualiza_todas_unidades ||
      (currentUser.unidades_vinculadas ?? []).includes(c.unidade),
    );
  }, [convocacoes, currentUser, selectedRegion, globalUnit]);

  // ── Stats (unfiltered by date, uses unit filter) ───────────────────────────
  const stats = useMemo(() => {
    const base = accessibleConvocacoes.filter(c => matchesUnidadeFilter(c.unidade));
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      hoje: base.filter(c => c.data_convocacao === today).length,
      pendentes: base.filter(c => c.status === 'pendente').length,
      aceites: base.filter(c => c.status === 'aceite').length,
      recusas: base.filter(c =>
        ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status),
      ).length,
    };
  }, [accessibleConvocacoes, selectedUnidade]);

  // ── Filtered convocações (for views) ──────────────────────────────────────
  const filteredConvocacoes = useMemo(() => {
    return accessibleConvocacoes
      .filter(c => {
        // Diária view only needs a date; list/kanban require a complete record (date + time)
        if (!c.data_convocacao) return false;
        if (view !== 'diaria' && !c.horario) return false;
        if (!matchesUnidadeFilter(c.unidade)) return false;

        if (view === 'diaria') {
          return c.data_convocacao === format(selectedDate, 'yyyy-MM-dd');
        }

        if (statusFilter) {
          const isRecusa = ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status);
          if (statusFilter === 'recusas' && !isRecusa) return false;
          if (statusFilter !== 'recusas' && c.status !== statusFilter) return false;
        }

        if (dateRange.from) {
          const convDate = parseISO(c.data_convocacao);
          if (!isWithinInterval(convDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to || dateRange.from),
          })) return false;
        }

        if (search) {
          const s = search.toLowerCase();
          return (
            c.nome_candidato?.toLowerCase().includes(s) ||
            c.cargo?.toLowerCase().includes(s) ||
            c.unidade?.toLowerCase().includes(s) ||
            c.requisicao?.toLowerCase().includes(s)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.data_convocacao).getTime() - new Date(a.data_convocacao).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.horario || '').localeCompare(b.horario || '');
      });
  }, [accessibleConvocacoes, selectedUnidade, view, selectedDate, search, dateRange, statusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNewConvocacao = (vaga?: any) => {
    setSelectedVaga(vaga || null);
    setConvocacaoToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditConvocacao = (c: Convocacao) => {
    setConvocacaoToEdit(c);
    setSelectedVaga(null);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (registroParaExcluir) {
      useVagasStore.getState().deleteConvocacao(registroParaExcluir);
      toast.success('Convocação removida com sucesso.');
      setIsDeleteDialogOpen(false);
      setRegistroParaExcluir(null);
    }
  };

  const handleReenviar = async (c: Convocacao) => {
    toast.success(`Notificação de reenvio registrada para ${c.nome_candidato}.`);
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || '',
      perfil: currentUser?.perfil || '',
      acao: 'Reenviar Convocação',
      modulo: 'Convocações',
      registro_afetado: c.id,
    });
  };

  const handleRegistrarDesistencia = async () => {
    if (!convocacaoParaAcao) return;
    await updateConvocacao(convocacaoParaAcao.id, {
      status: 'desistiu' as any,
      observacoes: desistenciaMotivo || convocacaoParaAcao.observacoes,
    });
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || '',
      perfil: currentUser?.perfil || '',
      acao: 'Registrar Desistência',
      modulo: 'Convocações',
      registro_afetado: convocacaoParaAcao.id,
      valor_novo: { status: 'desistiu', motivo: desistenciaMotivo },
    });
    toast.success('Desistência registrada.');
    setIsDesistenciaOpen(false);
    setConvocacaoParaAcao(null);
    setDesistenciaMotivo('');
  };

  const prepareForExport = (data: Convocacao[]) =>
    data.map(c => ({
      'Data': c.data_convocacao ? formatDate(c.data_convocacao) : '',
      'Hora': c.horario || '',
      'Candidato': c.nome_candidato || '',
      'Vaga': c.cargo || '',
      'Unidade': c.unidade || '',
      'Classificação': c.classificacao ? `${c.classificacao}º` : '',
      'Requisição': c.requisicao || '',
      'EDOC': c.edoc || '',
      'Tipo': c.tipo_atendimento || '',
      'Status': STATUS_CONVOCACAO_LABELS[c.status as keyof typeof STATUS_CONVOCACAO_LABELS] || c.status,
      'Observações': c.observacoes || '',
    }));

  if (isInitialLoad || !currentUser || !isConvocacoesLoaded) return <PageSkeleton />;

  const today = format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Convocações"
        actions={
          <>
            {/* View switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              {([
                { id: 'diaria',    label: 'Diária',    icon: <CalendarIcon className="h-3.5 w-3.5" /> },
                { id: 'kanban',    label: 'Quadro',    icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                { id: 'list',      label: 'Histórico', icon: <List className="h-3.5 w-3.5" /> },
                { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="h-3.5 w-3.5" /> },
                { id: 'bloqueios', label: 'Bloqueios', icon: <Lock className="h-3.5 w-3.5" /> },
              ] as const).map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-3 text-[11px] font-bold uppercase transition-all rounded-lg gap-1.5',
                    view === tab.id
                      ? 'bg-white shadow-sm hover:bg-white text-primary'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                  onClick={() => handleViewChange(tab.id)}
                >
                  {tab.icon} {tab.label}
                </Button>
              ))}
            </div>

            <ExportButton
              data={prepareForExport(filteredConvocacoes)}
              filename="convocacoes_export"
              label="Exportar"
              className="h-10 gap-2 text-xs font-bold rounded-xl border-slate-200"
            />

          </>
        }
      />

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      {view !== 'dashboard' && view !== 'bloqueios' && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Hoje"
          value={stats.hoje}
          icon={<CalendarIcon className="h-4.5 w-4.5 text-primary" />}
          color="bg-primary/10"
          active={view === 'diaria'}
          onClick={() => handleViewChange('diaria')}
        />
        <StatCard
          label="Pendentes"
          value={stats.pendentes}
          icon={<Clock className="h-4.5 w-4.5 text-amber-600" />}
          color="bg-amber-50"
          active={statusFilter === 'pendente'}
          onClick={() => {
            handleViewChange('list');
            setStatusFilter(prev => prev === 'pendente' ? null : 'pendente');
          }}
        />
        <StatCard
          label="Aceites"
          value={stats.aceites}
          icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />}
          color="bg-emerald-50"
          active={statusFilter === 'aceite'}
          onClick={() => {
            handleViewChange('list');
            setStatusFilter(prev => prev === 'aceite' ? null : 'aceite');
          }}
        />
        <StatCard
          label="Recusas / Faltas"
          value={stats.recusas}
          icon={<XCircle className="h-4.5 w-4.5 text-red-500" />}
          color="bg-red-50"
          active={statusFilter === 'recusas'}
          onClick={() => {
            handleViewChange('list');
            setStatusFilter(prev => prev === 'recusas' ? null : 'recusas');
          }}
        />
      </div>}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      {view !== 'dashboard' && view !== 'bloqueios' && <div className="flex flex-col md:flex-row items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar candidato, vaga, unidade…"
            className="w-full pl-10 pr-4 h-10 text-sm rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all outline-none"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              onClick={() => setSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unit filter */}
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 text-xs font-bold text-slate-600">
              <Building2 className="h-3.5 w-3.5 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrar Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Date control */}
          {view === 'diaria' ? (
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1">
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setSelectedDate(prev => {
                  const d = new Date(prev); d.setDate(d.getDate() - 1); return d;
                })}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-8 px-3 gap-2 text-xs font-bold text-primary hover:bg-primary/5 capitalize">
                    <CalendarIcon className="h-3.5 w-3.5" /> {today}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="center" sideOffset={8}>
                  <CalendarComponent
                    mode="single" selected={selectedDate}
                    onSelect={d => d && setSelectedDate(d)}
                    initialFocus locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setSelectedDate(prev => {
                  const d = new Date(prev); d.setDate(d.getDate() + 1); return d;
                })}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-10 px-4 gap-2 text-xs font-bold bg-white border-slate-200 hover:bg-slate-50',
                    dateRange.from ? 'text-primary border-primary/30' : 'text-slate-600',
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange.from ? (
                    dateRange.to
                      ? `${format(dateRange.from, 'dd/MM/yy')} – ${format(dateRange.to, 'dd/MM/yy')}`
                      : format(dateRange.from, 'dd/MM/yy')
                  ) : 'Filtrar Período'}
                  {dateRange.from && (
                    <X className="ml-1 h-3 w-3 hover:text-destructive" onClick={e => {
                      e.stopPropagation();
                      setDateRange({ from: undefined, to: undefined });
                    }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="end" sideOffset={8}>
                <CalendarComponent
                  initialFocus mode="range" defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(r: any) => setDateRange(r || { from: undefined, to: undefined })}
                  numberOfMonths={2} locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Active filter chips */}
          {statusFilter && (
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              {getStatusCfg(statusFilter === 'recusas' ? 'recusa_plantao' : statusFilter).label}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="min-h-[480px]">
        {view === 'diaria' && (
          <AgendaDiaria
            convocacoes={filteredConvocacoes}
            bloqueios={bloqueios}
            selectedDate={format(selectedDate, 'yyyy-MM-dd')}
            onEditConvocacao={c => handleEditConvocacao(c)}
            onDevolutiva={c => { setSelectedConvocacao(c); setIsDevolutivaOpen(true); }}
          />
        )}

        {view === 'kanban' && (
          <KanbanBoard convocacoes={filteredConvocacoes} />
        )}

        {view === 'list' && (
          <div className="space-y-2.5">
            {/* Header row */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {filteredConvocacoes.length} convocaç{filteredConvocacoes.length === 1 ? 'ão' : 'ões'} encontrada{filteredConvocacoes.length !== 1 ? 's' : ''}
              </p>
              {(search || statusFilter || dateRange.from) && (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                  onClick={() => { setSearch(''); setStatusFilter(null); setDateRange({ from: undefined, to: undefined }); }}
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filteredConvocacoes.length === 0 ? (
              <EmptyState label="Nenhuma convocação encontrada para os filtros aplicados." />
            ) : (
              <div className="flex flex-col gap-2">
                {filteredConvocacoes.map(c => (
                  <ConvocacaoCard
                    key={c.id}
                    c={c}
                    onEdit={() => handleEditConvocacao(c)}
                    onDevolutiva={() => { setSelectedConvocacao(c); setIsDevolutivaOpen(true); }}
                    onDetalhes={() => { setConvocacaoParaAcao(c); setIsDetalhesOpen(true); }}
                    onDesistencia={() => { setConvocacaoParaAcao(c); setIsDesistenciaOpen(true); }}
                    onDelete={() => { setRegistroParaExcluir(c.id); setIsDeleteDialogOpen(true); }}
                    onReenviar={() => handleReenviar(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'dashboard' && <ConvocacoesDashboardContent />}

        {view === 'bloqueios' && (
          <BloqueiosView
            bloqueios={bloqueios}
            onAdd={() => setIsBloqueioOpen(true)}
            onRemove={id => { removeBloqueio(id); }}
          />
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <ConvocacaoDialog
        open={isDialogOpen}
        onOpenChange={v => { setIsDialogOpen(v); if (!v) { setConvocacaoToEdit(null); setSelectedVaga(null); } }}
        vaga={selectedVaga}
        convocacaoToEdit={convocacaoToEdit ?? undefined}
      />

      {selectedConvocacao && (
        <DevolutivaDialog
          open={isDevolutivaOpen}
          onOpenChange={v => { setIsDevolutivaOpen(v); if (!v) setSelectedConvocacao(null); }}
          convocacao={selectedConvocacao}
        />
      )}

      <ConvocacaoDetalhesModal
        convocacao={convocacaoParaAcao}
        open={isDetalhesOpen}
        onOpenChange={v => { setIsDetalhesOpen(v); if (!v) setConvocacaoParaAcao(null); }}
      />

      <BloqueioHorarioDialog
        open={isBloqueioOpen}
        onOpenChange={setIsBloqueioOpen}
        defaultDate={format(selectedDate, 'yyyy-MM-dd')}
      />

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Remover convocação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegistroParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Desistência */}
      <AlertDialog open={isDesistenciaOpen} onOpenChange={setIsDesistenciaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <UserX className="h-5 w-5" /> Registrar Desistência
            </AlertDialogTitle>
            <AlertDialogDescription>
              {convocacaoParaAcao && (
                <span>Candidato: <strong>{convocacaoParaAcao.nome_candidato}</strong></span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Motivo da Desistência
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none min-h-[80px]"
              placeholder="Descreva o motivo da desistência..."
              value={desistenciaMotivo}
              onChange={e => setDesistenciaMotivo(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConvocacaoParaAcao(null); setDesistenciaMotivo(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRegistrarDesistencia} className="bg-amber-600 text-white hover:bg-amber-700">
              Confirmar Desistência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
