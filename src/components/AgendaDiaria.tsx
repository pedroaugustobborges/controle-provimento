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
          <p className="text-sm text-muted-foreground font-medium">Motivo: {bloqueio.motivo}</p>
          {bloqueio.link_teams && (
            <div className="flex justify-center mt-2">
              <Button variant="outline" size="sm" className="gap-2 bg-primary/5 border-primary/20 text-primary font-bold" asChild>
                <a href={bloqueio.link_teams} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" /> Entrar na Reunião do Teams
                </a>
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-2">Bloqueado por {bloqueio.criado_por}</p>
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

  // For non-Goiânia bases: free schedule view grouped by time
  if (!isGoianiaBase) {
    // Group convocações by horário, sorted chronologically
    const byHorario: Record<string, Convocacao[]> = {};
    const sortedConvs = [...convocacoes].sort((a, b) => a.horario.localeCompare(b.horario));
    sortedConvs.forEach(c => {
      if (!byHorario[c.horario]) byHorario[c.horario] = [];
      byHorario[c.horario].push(c);
    });
    const horariosOrdenados = Object.keys(byHorario).sort();

    return (
      <div className="space-y-4">
        <DayHeader date={selectedDate} total={totalAgendados} blocked={0} />
        {convocacoes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground text-sm italic">
            Nenhuma convocação agendada para este dia.
          </div>
        ) : (
          <div className="space-y-3">
            {horariosOrdenados.map((horario) => {
              const convsNoHorario = byHorario[horario];
              return (
                <div key={horario} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  {/* Horário header com título descritivo */}
                  <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Horário: {horario}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {convsNoHorario.length} agendamento{convsNoHorario.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Convocações nesse horário */}
                  <div className="divide-y divide-border">
                    {convsNoHorario.map(conv => (
                      <ConvocacaoRow key={conv.id} conv={conv} onEdit={onEditConvocacao} onDevolutiva={onDevolutiva} showHorario={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              blockedCount={0}
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
function ConvocacaoRow({ conv, onEdit, onDevolutiva, showHorario = true }: { conv: Convocacao; onEdit: (c: Convocacao) => void; onDevolutiva: (c: Convocacao) => void; showHorario?: boolean }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-accent/30 transition-colors">
      {showHorario && (
        <div className="flex items-center gap-2 w-24 shrink-0">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">{conv.horario}</span>
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground break-words leading-tight">{conv.nome_candidato}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Briefcase className="h-3 w-3" /> {conv.cargo}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
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

function HorarioRow({ horario, convocacoes, blocked, blockedCount = 0, blocks = [], onEdit, onDevolutiva, onRemoveBloqueio, isLast }: HorarioRowProps) {
  const count = convocacoes.length;
  const livresRaw = MAX_SLOTS - count - (blocked ? (MAX_SLOTS - count) : blockedCount);
  const livres = Math.max(0, livresRaw);

  const statusColor = blocked
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : blockedCount > 0 && livres > 0
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : count === 0
        ? 'bg-muted text-muted-foreground border-border'
        : (count + blockedCount) >= MAX_SLOTS
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const statusLabel = blocked
    ? 'Bloqueado'
    : blockedCount > 0 && (count + blockedCount) >= MAX_SLOTS
      ? 'Lotado (Bloq.)'
      : count === 0 && blockedCount === 0
        ? '5 livres'
        : livres === 0
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
              <span className="text-sm text-destructive flex items-center gap-1.5 font-medium">
                <Lock className="h-3.5 w-3.5" /> {blocks[0]?.motivo || 'Bloqueado'}
              </span>
            ) : blockedCount > 0 ? (
              <div className="flex flex-col gap-0.5 min-w-0">
                 <span className="text-xs text-orange-600 font-semibold flex items-center gap-1">
                   <Lock className="h-2.5 w-2.5" /> {blockedCount} vaga{blockedCount !== 1 ? 's' : ''} bloqueada{blockedCount !== 1 ? 's' : ''}
                 </span>
                 <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {convocacoes.slice(0, 2).map(c => (
                    <span key={c.id} className="flex items-center gap-1 break-words leading-tight max-w-[150px]">
                      <User className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" />
                      {c.nome_candidato}
                    </span>
                  ))}
                  {count > 2 && <span className="text-[10px] font-medium text-muted-foreground">+{count - 2}</span>}
                </div>
              </div>
            ) : count > 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {convocacoes.slice(0, 3).map(c => (
                  <span key={c.id} className="flex items-center gap-1 break-words leading-tight max-w-[160px]">
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

        {blocks.length > 0 && (
          <div className="p-4 space-y-4 bg-orange-50/50 border-b border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 text-sm font-bold uppercase tracking-tight">
              <Lock className="h-4 w-4" />
              <span>Bloqueio Ativo</span>
            </div>
            {blocks.map(b => (
              <div key={b.id} className="space-y-2 p-3 bg-white border border-orange-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-orange-800 break-words">
                      Motivo: <span className="font-medium text-orange-700">{b.motivo}</span>
                    </p>
                    {b.link_teams && (
                      <div className="flex items-center gap-1.5 p-1.5 bg-primary/5 border border-primary/10 rounded mt-1">
                        <Video className="h-3 w-3 text-primary shrink-0" />
                        <a 
                          href={b.link_teams} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[11px] font-bold text-primary hover:underline truncate"
                        >
                          Acessar Reunião no Teams
                        </a>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onRemoveBloqueio(b.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-orange-100/50">
                  <span>Por {b.criado_por}</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-orange-100 text-orange-800 border-orange-200 font-bold">
                    {b.vagas_bloqueadas === 5 || b.dia_inteiro ? 'Bloqueio Total' : `${b.vagas_bloqueadas} Vagas`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="divide-y divide-border">
          {Array.from({ length: MAX_SLOTS }).map((_, i) => {
            const conv = convocacoes[i];
            
            // Check if this slot is covered by a block
            // Simple logic: blocks are cumulative from the end or start?
            // Usually, they block a number of slots. We'll show slots as "Blocked" if i >= (MAX_SLOTS - totalBlocked)
            const isSlotBlocked = !conv && (blocked || (i >= (MAX_SLOTS - blockedCount)));

            return (
              <div key={i} className={`px-4 py-3 flex items-center gap-3 ${isSlotBlocked ? 'bg-destructive/5' : ''}`}>
                <span className={`text-xs font-bold w-5 shrink-0 ${conv ? 'text-primary' : isSlotBlocked ? 'text-destructive' : 'text-muted-foreground/40'}`}>{i + 1}</span>
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
                ) : isSlotBlocked ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                      <Lock className="h-3 w-3" /> Bloqueado
                    </span>
                    <span className="text-[10px] text-destructive/60 italic truncate max-w-[150px]">
                      {blocks[0]?.motivo}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50 italic">Disponível</span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
