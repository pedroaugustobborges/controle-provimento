import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';
import { BloqueioHorario } from '@/types/vaga';
import { Lock, Building2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TODAS_AS_UNIDADES = Object.values(UNIDADES_POR_REGIAO).flat();

interface BloqueioHorarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function BloqueioHorarioDialog({ open, onOpenChange, defaultDate }: BloqueioHorarioDialogProps) {
  const { addBloqueio, convocacoes, addAlerta } = useVagasStore();
  const { currentUser } = useAdminStore();

  // Units this user is allowed to see
  const userUnidades = useMemo(() => {
    if (currentUser?.visualiza_todas_unidades) return TODAS_AS_UNIDADES;
    return currentUser?.unidades_vinculadas ?? [];
  }, [currentUser]);

  const hasMultiple = userUnidades.length > 1;

  const [data, setData] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('12:00');
  const [motivo, setMotivo] = useState('');
  const [linkTeams, setLinkTeams] = useState('');
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<string[]>(userUnidades);

  const isTodas =
    unidadesSelecionadas.length === userUnidades.length && userUnidades.length > 0;

  const toggleTodas = () =>
    setUnidadesSelecionadas(isTodas ? [] : [...userUnidades]);

  const toggleUnidade = (u: string) =>
    setUnidadesSelecionadas(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u],
    );

  const timeRangeInvalid =
    !diaInteiro && !!horarioInicio && !!horarioFim && horarioFim <= horarioInicio;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!diaInteiro && !horarioInicio) {
      toast.error('Informe o horário de início.'); return;
    }
    if (!diaInteiro && !horarioFim) {
      toast.error('Informe o horário de fim.'); return;
    }
    if (timeRangeInvalid) {
      toast.error('O horário de fim deve ser após o horário de início.'); return;
    }
    if (!motivo.trim()) {
      toast.error('Informe o motivo do bloqueio.'); return;
    }
    if (unidadesSelecionadas.length === 0 && userUnidades.length > 0) {
      toast.error('Selecione ao menos uma unidade.'); return;
    }

    // Admin selecting "todas" = truly global (undefined). Otherwise store the specific list.
    const bloqueioUnidades =
      currentUser?.visualiza_todas_unidades && isTodas
        ? undefined
        : unidadesSelecionadas;

    const bloqueio: BloqueioHorario = {
      id: `bloq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data,
      horario:     diaInteiro ? undefined : horarioInicio,
      horario_fim: diaInteiro ? undefined : horarioFim,
      dia_inteiro: diaInteiro,
      motivo,
      link_teams: linkTeams.trim() || undefined,
      unidades: bloqueioUnidades,
      criado_por: currentUser?.nome_completo || 'Analista',
      created_at: new Date().toISOString(),
    };

    addBloqueio(bloqueio);

    // Alert for any existing convocações hit by this block
    const affected = convocacoes.filter(c => {
      if (c.data_convocacao !== data) return false;
      if (bloqueioUnidades && c.unidade && !bloqueioUnidades.includes(c.unidade)) return false;
      if (diaInteiro) return true;
      if (!c.horario) return false;
      return c.horario >= horarioInicio && c.horario <= horarioFim;
    });

    if (affected.length > 0) {
      affected.forEach(c => {
        addAlerta({
          id: `alerta-bloq-${Date.now()}-${c.id}`,
          titulo: 'Convocação afetada por bloqueio',
          mensagem: `A convocação de ${c.nome_candidato} (${c.horario}) no dia ${data} foi afetada pelo bloqueio: "${motivo}". Considere reagendar.`,
          tipo: 'critico',
          status: 'nao_lido',
          data_criacao: new Date().toISOString(),
          destinatario: c.responsavel,
        });
      });
      toast.warning(`${affected.length} convocação(ões) afetada(s). Alertas gerados.`);
    }

    toast.success(
      diaInteiro
        ? 'Dia inteiro bloqueado com sucesso.'
        : `Período ${horarioInicio}–${horarioFim} bloqueado com sucesso.`,
    );

    // Reset
    onOpenChange(false);
    setMotivo('');
    setLinkTeams('');
    setDiaInteiro(false);
    setHorarioInicio('08:00');
    setHorarioFim('12:00');
    setUnidadesSelecionadas([...userUnidades]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" />
            Bloquear Horários
          </DialogTitle>
          <DialogDescription>
            Bloqueie um período ou o dia inteiro para impedir novos agendamentos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="bloq-data">Data</Label>
            <Input
              id="bloq-data"
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              required
            />
          </div>

          {/* Dia inteiro */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="dia-inteiro"
              checked={diaInteiro}
              onCheckedChange={v => setDiaInteiro(!!v)}
            />
            <Label htmlFor="dia-inteiro" className="cursor-pointer text-sm">
              Bloquear dia inteiro
            </Label>
          </div>

          {/* Time range — only when not full-day */}
          {!diaInteiro && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="horario-inicio" className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" /> Horário de início
                  </Label>
                  <Input
                    id="horario-inicio"
                    type="time"
                    value={horarioInicio}
                    onChange={e => setHorarioInicio(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="horario-fim" className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" /> Horário de fim
                  </Label>
                  <Input
                    id="horario-fim"
                    type="time"
                    value={horarioFim}
                    onChange={e => setHorarioFim(e.target.value)}
                    className={cn('font-mono', timeRangeInvalid && 'border-red-400 focus-visible:ring-red-300')}
                    required
                  />
                </div>
              </div>
              {timeRangeInvalid && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  O horário de fim deve ser após o horário de início.
                </p>
              )}
            </div>
          )}

          {/* Unidades afetadas — user-scoped */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Unidades afetadas
            </Label>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1 bg-slate-50">
              {/* "Todas" row — only when user has access to multiple units */}
              {hasMultiple && (
                <>
                  <div className={cn(
                    'flex items-center gap-2 px-1 py-1 rounded-md -mx-0.5',
                    isTodas && 'bg-primary/5',
                  )}>
                    <Checkbox
                      id="todas-unidades"
                      checked={isTodas}
                      onCheckedChange={toggleTodas}
                    />
                    <Label htmlFor="todas-unidades" className="cursor-pointer text-xs font-bold text-primary">
                      Todas as unidades
                    </Label>
                  </div>
                  <div className="border-t border-slate-200 my-1" />
                </>
              )}

              {userUnidades.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-1 py-1">
                  Nenhuma unidade vinculada ao seu perfil.
                </p>
              ) : (
                userUnidades.map(u => (
                  <div key={u} className="flex items-center gap-2">
                    <Checkbox
                      id={`unidade-${u}`}
                      checked={unidadesSelecionadas.includes(u)}
                      onCheckedChange={() => toggleUnidade(u)}
                    />
                    <Label htmlFor={`unidade-${u}`} className="cursor-pointer text-xs font-normal">
                      {u}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="bloq-motivo">Motivo do bloqueio *</Label>
            <Textarea
              id="bloq-motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Reunião interna, feriado local, sem sistema..."
              required
            />
          </div>

          {/* Link Teams */}
          <div className="space-y-2">
            <Label htmlFor="link-teams">Link do Teams (opcional)</Label>
            <Input
              id="link-teams"
              type="url"
              value={linkTeams}
              onChange={e => setLinkTeams(e.target.value)}
              placeholder="https://teams.microsoft.com/..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!!timeRangeInvalid} className="gap-2">
              <Lock className="h-4 w-4" /> Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
