import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Lock, User, MapPin, Video, Edit, Trash2 } from 'lucide-react';
import { Convocacao, BloqueioHorario } from '@/types/vaga';
import { HORARIOS_FIXOS_CONVOCACAO, getBaseForUnidade } from '@/lib/convocacaoUtils';
import { formatDate } from '@/lib/vagaUtils';
import { useVagasStore } from '@/store/vagasStore';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface AgendaDiariaProps {
  convocacoes: Convocacao[];
  bloqueios: BloqueioHorario[];
  selectedDate: string;
  onEditConvocacao: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
}

export function AgendaDiaria({ convocacoes, bloqueios, selectedDate, onEditConvocacao, onDevolutiva }: AgendaDiariaProps) {
  const { removeBloqueio, deleteConvocacao } = useVagasStore();
  const permissions = usePermissions();

  const dayBloqueios = bloqueios.filter(b => b.data === selectedDate);
  const isDayBlocked = dayBloqueios.some(b => b.dia_inteiro);

  // Group convocacoes by base
  const byBase: Record<string, Convocacao[]> = {};
  convocacoes.forEach(c => {
    const base = getBaseForUnidade(c.unidade);
    if (!byBase[base]) byBase[base] = [];
    byBase[base].push(c);
  });

  const isHorarioBloqueado = (horario: string) => {
    return isDayBlocked || dayBloqueios.some(b => b.horario === horario);
  };

  const getBloqueioMotivo = (horario: string) => {
    if (isDayBlocked) {
      return dayBloqueios.find(b => b.dia_inteiro)?.motivo || 'Dia bloqueado';
    }
    return dayBloqueios.find(b => b.horario === horario)?.motivo;
  };

  const getBloqueioId = (horario: string) => {
    if (isDayBlocked) return dayBloqueios.find(b => b.dia_inteiro)?.id;
    return dayBloqueios.find(b => b.horario === horario)?.id;
  };

  if (isDayBlocked) {
    const bloqueio = dayBloqueios.find(b => b.dia_inteiro)!;
    return (
      <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-slate-400" />
        <h3 className="text-lg font-bold text-slate-600">Dia Inteiro Bloqueado</h3>
        <p className="text-sm text-slate-500">Motivo: {bloqueio.motivo}</p>
        <p className="text-xs text-slate-400">Bloqueado por {bloqueio.criado_por}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            removeBloqueio(bloqueio.id);
            toast.success('Bloqueio removido.');
          }}
        >
          Remover Bloqueio
        </Button>
        {convocacoes.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive font-medium">
            ⚠ {convocacoes.length} convocação(ões) agendada(s) neste dia bloqueado.
          </div>
        )}
      </div>
    );
  }

  // Always show the agenda grid, even when empty
  const showEmptyGrid = Object.keys(byBase).length === 0;

  return (
    <div className="space-y-8">
      {showEmptyGrid ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Agenda do Dia — {formatDate(selectedDate)}
          </h2>
          {HORARIOS_FIXOS_CONVOCACAO.map(horario => {
            const blocked = isHorarioBloqueado(horario);
            return (
              <AgendaSlot
                key={horario}
                horario={horario}
                convocacoes={[]}
                blocked={blocked}
                bloqueioMotivo={getBloqueioMotivo(horario)}
                bloqueioId={getBloqueioId(horario)}
                onEdit={onEditConvocacao}
                onDevolutiva={onDevolutiva}
              />
            );
          })}
        </div>
      ) : (
        Object.entries(byBase).map(([base, baseConvs]) => (
          <div key={base} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">Base: {base}</h2>
              <Badge variant="outline" className="ml-2 bg-slate-50">{baseConvs.length} Agendamentos</Badge>
            </div>

            {HORARIOS_FIXOS_CONVOCACAO.map(horario => {
              const convsNoSlot = baseConvs.filter(c => c.horario === horario);
              const blocked = isHorarioBloqueado(horario);

              return (
                <AgendaSlot
                  key={`${base}-${horario}`}
                  horario={horario}
                  convocacoes={convsNoSlot}
                  blocked={blocked}
                  bloqueioMotivo={getBloqueioMotivo(horario)}
                  bloqueioId={getBloqueioId(horario)}
                  onEdit={onEditConvocacao}
                  onDevolutiva={onDevolutiva}
                />
              );
            })}

            {/* Convocações fora dos horários fixos */}
            {baseConvs
              .filter(c => !HORARIOS_FIXOS_CONVOCACAO.includes(c.horario))
              .map(c => (
                <AgendaSlot
                  key={c.id}
                  horario={c.horario}
                  convocacoes={[c]}
                  blocked={false}
                  onEdit={onEditConvocacao}
                  onDevolutiva={onDevolutiva}
                />
              ))}
          </div>
        ))
      )}
    </div>
  );
}

interface AgendaSlotProps {
  horario: string;
  convocacoes: Convocacao[];
  blocked: boolean;
  bloqueioMotivo?: string;
  bloqueioId?: string;
  onEdit: (conv: Convocacao) => void;
  onDevolutiva: (conv: Convocacao) => void;
}

function AgendaSlot({ horario, convocacoes, blocked, bloqueioMotivo, bloqueioId, onEdit, onDevolutiva }: AgendaSlotProps) {
  const { removeBloqueio } = useVagasStore();

  return (
    <div className={`flex gap-4 items-stretch rounded-xl border transition-all ${
      blocked 
        ? 'bg-slate-100 border-slate-300 border-dashed' 
        : convocacoes.length > 0 
          ? 'bg-white border-slate-200 shadow-sm' 
          : 'bg-slate-50/50 border-slate-100 border-dashed opacity-60'
    }`}>
      {/* Horário */}
      <div className={`flex flex-col items-center justify-center w-20 min-h-[72px] border-r px-3 ${
        blocked ? 'bg-slate-200/50 border-slate-300' : 'bg-primary/5 border-primary/10'
      }`}>
        <Clock className={`h-4 w-4 mb-1 ${blocked ? 'text-slate-400' : 'text-primary'}`} />
        <span className={`text-lg font-bold ${blocked ? 'text-slate-400 line-through' : 'text-primary'}`}>
          {horario}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 py-3 pr-3">
        {blocked ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Bloqueado: {bloqueioMotivo}</span>
            </div>
            {bloqueioId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-400 hover:text-destructive"
                onClick={() => {
                  removeBloqueio(bloqueioId);
                  toast.success('Bloqueio removido.');
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Remover
              </Button>
            )}
          </div>
        ) : convocacoes.length === 0 ? (
          <span className="text-sm text-slate-400 italic">Horário livre</span>
        ) : (
          <div className="space-y-2">
            {convocacoes.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-sm text-slate-800 truncate">{c.nome_candidato}</span>
                  </div>
                  <span className="text-xs text-slate-500 truncate">{c.cargo}</span>
                  <Badge variant="outline" className="text-[9px] h-4 shrink-0">{c.unidade}</Badge>
                  {c.tipo_atendimento === 'online' && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] h-4 shrink-0 gap-1">
                      <Video className="h-2.5 w-2.5" /> Online
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-primary"
                    onClick={() => onDevolutiva(c)}
                  >
                    Devolutiva
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-slate-400"
                    onClick={() => onEdit(c)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
