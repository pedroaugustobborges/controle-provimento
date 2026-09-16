import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Lock, User, Video, Edit, Calendar, Users, MapPin, Briefcase, MessageSquare, Trash2 } from 'lucide-react';
import { Convocacao, BloqueioHorario } from '@/types/vaga';
import { formatDate } from '@/lib/vagaUtils';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';

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
  const totalBloqueados = isDayBlocked ? dayBloqueios.length : dayBloqueios.filter(b => b.horario).length;

  if (isDayBlocked) {
    const bloqueio = dayBloqueios.find(b => b.dia_inteiro)!;
    return (
      <div className="space-y-4">
        <DayHeader date={selectedDate} total={totalAgendados} blocked={totalBloqueados} />
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

  // Group convocações by horário, sorted chronologically (empty horário goes last)
  const byHorario: Record<string, Convocacao[]> = {};
  const sortedConvs = [...convocacoes].sort((a, b) => {
    const ha = a.horario || 'ZZ:ZZ';
    const hb = b.horario || 'ZZ:ZZ';
    return ha.localeCompare(hb);
  });
  sortedConvs.forEach(c => {
    const key = c.horario || '';
    if (!byHorario[key]) byHorario[key] = [];
    byHorario[key].push(c);
  });
  const horariosOrdenados = Object.keys(byHorario).sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <DayHeader date={selectedDate} total={totalAgendados} blocked={totalBloqueados} />
      {convocacoes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground text-sm italic">
          Nenhuma convocação agendada para este dia.
        </div>
      ) : (
        <div className="space-y-3">
          {horariosOrdenados.map((horario) => {
            const convsNoHorario = byHorario[horario];
            return (
              <div key={horario || '__sem_horario'} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {horario ? `Horário: ${horario}` : 'Sem horário definido'}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {convsNoHorario.length} agendamento{convsNoHorario.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {convsNoHorario.map(conv => (
                    <ConvocacaoRow key={conv.id} conv={conv} onEdit={onEditConvocacao} onDevolutiva={onDevolutiva} />
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

/* ── Single convocação row ── */
function ConvocacaoRow({ conv, onEdit, onDevolutiva }: { conv: Convocacao; onEdit: (c: Convocacao) => void; onDevolutiva: (c: Convocacao) => void }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
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
        {conv.observacoes && conv.observacoes.trim() !== '' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-3 w-3" />
                Obs. da Unidade
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Observação da Unidade</p>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{conv.observacoes}</p>
              </div>
            </PopoverContent>
          </Popover>
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
