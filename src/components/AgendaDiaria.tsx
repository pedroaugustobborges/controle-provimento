import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Lock, User, Video, Edit, Trash2, Calendar, Users } from 'lucide-react';
import { Convocacao, BloqueioHorario } from '@/types/vaga';
import { HORARIOS_FIXOS_CONVOCACAO } from '@/lib/convocacaoUtils';
import { formatDate } from '@/lib/vagaUtils';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';

const MAX_SLOTS = 5;

interface AgendaDiariaProps {
  convocacoes: Convocacao[];
  bloqueios: BloqueioHorario[];
  selectedDate: string;
  onEditConvocacao: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
}

export function AgendaDiaria({ convocacoes, bloqueios, selectedDate, onEditConvocacao, onDevolutiva }: AgendaDiariaProps) {
  const { removeBloqueio } = useVagasStore();
  const dayBloqueios = bloqueios.filter(b => b.data === selectedDate);
  const isDayBlocked = dayBloqueios.some(b => b.dia_inteiro);

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

  return (
    <div className="space-y-4">
      <DayHeader date={selectedDate} total={totalAgendados} blocked={totalBloqueados} />
      <div className="rounded-xl border border-border overflow-hidden">
        {HORARIOS_FIXOS_CONVOCACAO.map((horario, idx) => {
          const convsNoSlot = convocacoes.filter(c => c.horario === horario);
          const blocked = dayBloqueios.some(b => b.horario === horario);
          const bloqueioMotivo = dayBloqueios.find(b => b.horario === horario)?.motivo;
          const bloqueioId = dayBloqueios.find(b => b.horario === horario)?.id;

          return (
            <HorarioRow
              key={horario}
              horario={horario}
              convocacoes={convsNoSlot}
              blocked={blocked}
              bloqueioMotivo={bloqueioMotivo}
              bloqueioId={bloqueioId}
              onEdit={onEditConvocacao}
              onDevolutiva={onDevolutiva}
              onRemoveBloqueio={(id) => { removeBloqueio(id); toast.success('Bloqueio removido.'); }}
              isLast={idx === HORARIOS_FIXOS_CONVOCACAO.length - 1}
            />
          );
        })}
      </div>

      {/* Convocações fora dos horários fixos */}
      {convocacoes
        .filter(c => !HORARIOS_FIXOS_CONVOCACAO.includes(c.horario))
        .length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground">Horários extras</div>
          {convocacoes
            .filter(c => !HORARIOS_FIXOS_CONVOCACAO.includes(c.horario))
            .map(c => (
              <HorarioRow
                key={c.id}
                horario={c.horario}
                convocacoes={[c]}
                blocked={false}
                onEdit={onEditConvocacao}
                onDevolutiva={onDevolutiva}
                onRemoveBloqueio={() => {}}
                isLast
              />
            ))}
        </div>
      )}
    </div>
  );
}

function DayHeader({ date, total, blocked }: { date: string; total: number; blocked: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Agenda do Dia — {formatDate(date)}
      </h2>
      <div className="flex gap-3">
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3 w-3" /> {total} agendamento{total !== 1 ? 's' : ''}
        </Badge>
        {blocked > 0 && (
          <Badge variant="destructive" className="gap-1.5">
            <Lock className="h-3 w-3" /> {blocked} bloqueado{blocked !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface HorarioRowProps {
  horario: string;
  convocacoes: Convocacao[];
  blocked: boolean;
  bloqueioMotivo?: string;
  bloqueioId?: string;
  onEdit: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
  onRemoveBloqueio: (id: string) => void;
  isLast: boolean;
}

function HorarioRow({ horario, convocacoes, blocked, bloqueioMotivo, bloqueioId, onEdit, onDevolutiva, onRemoveBloqueio, isLast }: HorarioRowProps) {
  const count = convocacoes.length;

  const statusColor = blocked
    ? 'bg-destructive/10 text-destructive'
    : count === 0
      ? 'text-muted-foreground'
      : count >= MAX_SLOTS
        ? 'bg-primary/10 text-primary'
        : 'bg-accent text-accent-foreground';

  const statusLabel = blocked
    ? 'Bloqueado'
    : count === 0
      ? 'Livre'
      : count >= MAX_SLOTS
        ? 'Lotado'
        : `${count}/${MAX_SLOTS}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 cursor-pointer ${
            !isLast ? 'border-b border-border' : ''
          } ${blocked ? 'bg-muted/50' : ''}`}
        >
          <div className="flex items-center gap-2 w-16 shrink-0">
            <Clock className={`h-4 w-4 ${blocked ? 'text-destructive' : 'text-primary'}`} />
            <span className={`text-base font-bold ${blocked ? 'text-destructive line-through' : 'text-foreground'}`}>
              {horario}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-2">
            {blocked ? (
              <span className="text-sm text-destructive flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> {bloqueioMotivo || 'Bloqueado'}
              </span>
            ) : count > 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {convocacoes.slice(0, 3).map(c => (
                  <span key={c.id} className="truncate max-w-[120px]">{c.nome_candidato}</span>
                ))}
                {count > 3 && <span>+{count - 3}</span>}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">Horário livre</span>
            )}
          </div>

          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusColor}`}>
            {statusLabel}
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="start">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> {horario}
            </span>
            <Badge variant="outline" className="text-[10px]">{count}/{MAX_SLOTS} slots</Badge>
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
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  {conv ? (
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{conv.nome_candidato}</span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">{conv.cargo}</span>
                        {conv.tipo_atendimento === 'online' && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] h-4 gap-0.5 shrink-0">
                            <Video className="h-2.5 w-2.5" /> Online
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => onDevolutiva(conv)}>
                          Devolutiva
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => onEdit(conv)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Disponível</span>
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
