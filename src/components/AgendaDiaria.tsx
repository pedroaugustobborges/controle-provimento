import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Lock, User, Video, Edit, Trash2, Calendar, Users, MapPin, Briefcase } from 'lucide-react';
import { Convocacao, BloqueioHorario } from '@/types/vaga';
import { HORARIOS_FIXOS_CONVOCACAO, getBaseForUnidade } from '@/lib/convocacaoUtils';
import { formatDate } from '@/lib/vagaUtils';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';

const MAX_SLOTS = 5;

interface AgendaDiariaProps {
  convocacoes: Convocacao[];
  bloqueios: BloqueioHorario[];
  selectedDate: string;
  selectedBase?: string;
  onEditConvocacao: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
}

export function AgendaDiaria({ convocacoes, bloqueios, selectedDate, selectedBase, onEditConvocacao, onDevolutiva }: AgendaDiariaProps) {
  const { removeBloqueio } = useVagasStore();
  const dayBloqueios = bloqueios.filter(b => b.data === selectedDate);
  const isDayBlocked = dayBloqueios.some(b => b.dia_inteiro);

  // Determine if we should show fixed grid (Goiânia) or free schedule
  const isGoianiaBase = selectedBase === 'Goiânia' || selectedBase === 'all' || !selectedBase;

  const totalAgendados = convocacoes.length;
  const totalBloqueados = isDayBlocked ? HORARIOS_FIXOS_CONVOCACAO.length : dayBloqueios.filter(b => b.horario).length;

  if (isDayBlocked) {
    const bloqueio = dayBloqueios.find(b => b.dia_inteiro)!;
    return (
      <div className="space-y-4">
        <DayHeader date={selectedDate} total={totalAgendados} blocked={HORARIOS_FIXOS_CONVOCACAO.length} />
        <div className="bg-muted border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-bold text-muted-foreground">Dia Inteiro Bloqueado</h3>
          <p className="text-sm text-muted-foreground">Motivo: {bloqueio.motivo}</p>
          <p className="text-xs text-muted-foreground">Bloqueado por {bloqueio.criado_por}</p>
          <Button variant="outline" size="sm" onClick={() => { removeBloqueio(bloqueio.id); toast.success('Bloqueio removido.'); }}>
            Remover Bloqueio
          </Button>
          {convocacoes.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive font-medium">
              ⚠ {convocacoes.length} convocação(ões) agendada(s) neste dia bloqueado.
            </div>
          )}
        </div>
      </div>
    );
  }

  // For non-Goiânia bases: free schedule view
  if (!isGoianiaBase) {
    return (
      <div className="space-y-4">
        <DayHeader date={selectedDate} total={totalAgendados} blocked={0} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Horário Livre — {totalAgendados} convocação{totalAgendados !== 1 ? 'ões' : ''} agendada{totalAgendados !== 1 ? 's' : ''}
            </span>
          </div>
          {convocacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm italic">
              Nenhuma convocação agendada para este dia.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {convocacoes.map(conv => (
                <ConvocacaoRow key={conv.id} conv={conv} onEdit={onEditConvocacao} onDevolutiva={onDevolutiva} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Goiânia: fixed grid with 5 time slots
  // Separate convocações into fixed-slot and extra
  const fixedSlotConvs = convocacoes.filter(c => HORARIOS_FIXOS_CONVOCACAO.includes(c.horario));
  const extraConvs = convocacoes.filter(c => !HORARIOS_FIXOS_CONVOCACAO.includes(c.horario));

  return (
    <div className="space-y-4">
      <DayHeader date={selectedDate} total={totalAgendados} blocked={totalBloqueados} />
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {HORARIOS_FIXOS_CONVOCACAO.map((horario, idx) => {
          const convsNoSlot = fixedSlotConvs.filter(c => c.horario === horario);
          const blocksForSlot = dayBloqueios.filter(b => b.horario === horario);
          const isFullyBlocked = blocksForSlot.some(b => !b.vagas_bloqueadas || b.vagas_bloqueadas >= MAX_SLOTS);
          const blockedVagasCount = blocksForSlot.reduce((acc, curr) => acc + (curr.vagas_bloqueadas || MAX_SLOTS), 0);
          
          return (
            <HorarioRow
              key={horario}
              horario={horario}
              convocacoes={convsNoSlot}
              blocked={isFullyBlocked}
              blockedCount={blockedVagasCount}
              blocks={blocksForSlot}
              onEdit={onEditConvocacao}
              onDevolutiva={onDevolutiva}
              onRemoveBloqueio={(id) => { removeBloqueio(id); toast.success('Bloqueio removido.'); }}
              isLast={idx === HORARIOS_FIXOS_CONVOCACAO.length - 1 && extraConvs.length === 0}
            />
          );
        })}
      </div>

      {extraConvs.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-5 py-2.5 bg-muted/40 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Horários extras</span>
          </div>
          {extraConvs.map((c, idx) => (
            <HorarioRow
              key={c.id}
              horario={c.horario}
              convocacoes={[c]}
              blocked={false}
              onEdit={onEditConvocacao}
              onDevolutiva={onDevolutiva}
              onRemoveBloqueio={() => {}}
              isLast={idx === extraConvs.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Day Header ── */
function DayHeader({ date, total, blocked }: { date: string; total: number; blocked: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Agenda do Dia — {formatDate(date)}
      </h2>
      <div className="flex gap-2">
        <Badge variant="outline" className="gap-1.5 text-xs font-semibold border-border">
          <Users className="h-3 w-3" /> {total} agendamento{total !== 1 ? 's' : ''}
        </Badge>
        {blocked > 0 && (
          <Badge variant="destructive" className="gap-1.5 text-xs font-semibold">
            <Lock className="h-3 w-3" /> {blocked} bloqueado{blocked !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ── Single convocação row (used in free schedule view) ── */
function ConvocacaoRow({ conv, onEdit, onDevolutiva }: { conv: Convocacao; onEdit: (c: Convocacao) => void; onDevolutiva: (c: Convocacao) => void }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-2 w-16 shrink-0">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">{conv.horario}</span>
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate">{conv.nome_candidato}</span>
        <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Briefcase className="h-3 w-3" /> {conv.cargo}
        </span>
        <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {conv.unidade}
        </span>
        {conv.tipo_atendimento === 'online' && (
          <Badge variant="outline" className="text-[9px] h-5 gap-0.5 bg-primary/10 text-primary border-primary/20">
            <Video className="h-2.5 w-2.5" /> Online
          </Badge>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => onDevolutiva(conv)}>
          Devolutiva
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(conv)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Horário Row (Goiânia fixed grid) ── */
interface HorarioRowProps {
  horario: string;
  convocacoes: Convocacao[];
  blocked: boolean;
  blockedCount?: number;
  blocks?: BloqueioHorario[];
  onEdit: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
  onRemoveBloqueio: (id: string) => void;
  isLast: boolean;
}

function HorarioRow({ horario, convocacoes, blocked, bloqueioMotivo, bloqueioId, onEdit, onDevolutiva, onRemoveBloqueio, isLast }: HorarioRowProps) {
  const count = convocacoes.length;
  const livres = MAX_SLOTS - count;

  const statusColor = blocked
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : count === 0
      ? 'bg-muted text-muted-foreground border-border'
      : count >= MAX_SLOTS
        ? 'bg-primary/10 text-primary border-primary/20'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const statusLabel = blocked
    ? 'Bloqueado'
    : count === 0
      ? '5 livres'
      : count >= MAX_SLOTS
        ? 'Lotado'
        : `${livres} livre${livres !== 1 ? 's' : ''}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all hover:bg-accent/40 cursor-pointer ${
            !isLast ? 'border-b border-border' : ''
          } ${blocked ? 'bg-destructive/5' : ''}`}
        >
          <div className="flex items-center gap-2.5 w-20 shrink-0">
            <div className={`w-2 h-2 rounded-full ${blocked ? 'bg-destructive' : count >= MAX_SLOTS ? 'bg-primary' : count > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
            <span className={`text-base font-bold tabular-nums ${blocked ? 'text-destructive line-through' : 'text-foreground'}`}>
              {horario}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {blocked ? (
              <span className="text-sm text-destructive flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> {bloqueioMotivo || 'Bloqueado'}
              </span>
            ) : count > 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {convocacoes.slice(0, 3).map(c => (
                  <span key={c.id} className="flex items-center gap-1 truncate max-w-[140px]">
                    <User className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    {c.nome_candidato}
                  </span>
                ))}
                {count > 3 && <span className="text-xs font-medium text-muted-foreground">+{count - 3}</span>}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/60 italic">Nenhum agendamento</span>
            )}
          </div>

          <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 font-semibold ${statusColor}`}>
            {statusLabel}
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0" align="start" sideOffset={6}>
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> {horario}
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold">{count}/{MAX_SLOTS} ocupado{count !== 1 ? 's' : ''}</Badge>
          </div>
        </div>

        {blocked && bloqueioId ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Horário bloqueado</span>
            </div>
            <p className="text-sm text-muted-foreground">Motivo: {bloqueioMotivo}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => onRemoveBloqueio(bloqueioId)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover Bloqueio
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from({ length: MAX_SLOTS }).map((_, i) => {
              const conv = convocacoes[i];
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 shrink-0 ${conv ? 'text-primary' : 'text-muted-foreground/40'}`}>{i + 1}</span>
                  {conv ? (
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold text-foreground truncate">{conv.nome_candidato}</span>
                          {conv.tipo_atendimento === 'online' && (
                            <Badge variant="outline" className="text-[9px] h-4 gap-0.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                              <Video className="h-2.5 w-2.5" /> Online
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <Briefcase className="h-3 w-3" /> {conv.cargo}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {conv.unidade}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => onDevolutiva(conv)}>
                          Devolutiva
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => onEdit(conv)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">Disponível</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
