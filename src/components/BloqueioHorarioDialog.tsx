import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { HORARIOS_FIXOS_CONVOCACAO } from '@/lib/convocacaoUtils';
import { BloqueioHorario } from '@/types/vaga';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

interface BloqueioHorarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function BloqueioHorarioDialog({ open, onOpenChange, defaultDate }: BloqueioHorarioDialogProps) {
  const { addBloqueio, convocacoes, addAlerta } = useVagasStore();
  const { currentUser } = useAdminStore();

  const [data, setData] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [horariosSelected, setHorariosSelected] = useState<string[]>([]);
  const [vagasBloqueadas, setVagasBloqueadas] = useState(5);
  const [motivo, setMotivo] = useState('');
  const [linkTeams, setLinkTeams] = useState('');

  const toggleHorario = (h: string) => {
    setHorariosSelected(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!diaInteiro && horariosSelected.length === 0) {
      toast.error('Selecione ao menos um horário ou marque "Bloquear dia inteiro".');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Informe o motivo do bloqueio.');
      return;
    }

    const horariosToBlock = diaInteiro ? [undefined] : horariosSelected;

    horariosToBlock.forEach(horario => {
      const bloqueio: BloqueioHorario = {
        id: `bloq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        data,
        horario,
        dia_inteiro: diaInteiro,
        motivo,
        vagas_bloqueadas: diaInteiro ? 5 : vagasBloqueadas,
        link_teams: linkTeams.trim() || undefined,
        criado_por: currentUser?.nome_completo || 'Analista',
        created_at: new Date().toISOString(),
      };
      addBloqueio(bloqueio);

      // Check for existing convocations in this slot
      const affected = convocacoes.filter(c => {
        if (c.data_convocacao !== data) return false;
        if (diaInteiro) return true;
        return c.horario === horario;
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
        toast.warning(`${affected.length} convocação(ões) afetada(s) pelo bloqueio. Alertas gerados.`);
      }
    });

    toast.success(diaInteiro ? 'Dia inteiro bloqueado com sucesso.' : `${horariosSelected.length} horário(s) bloqueado(s).`);
    onOpenChange(false);
    setHorariosSelected([]);
    setMotivo('');
    setLinkTeams('');
    setVagasBloqueadas(5);
    setDiaInteiro(false);
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
            Bloqueie horários específicos ou o dia inteiro para impedir novos agendamentos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="dia-inteiro"
              checked={diaInteiro}
              onCheckedChange={(v) => setDiaInteiro(!!v)}
            />
            <Label htmlFor="dia-inteiro" className="cursor-pointer text-sm">
              Bloquear dia inteiro
            </Label>
          </div>

          {!diaInteiro && (
            <div className="space-y-2">
              <Label>Horários a bloquear</Label>
              <div className="flex flex-wrap gap-2">
                {HORARIOS_FIXOS_CONVOCACAO.map(h => (
                  <Button
                    key={h}
                    type="button"
                    variant={horariosSelected.includes(h) ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-3 text-xs font-bold"
                    onClick={() => toggleHorario(h)}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!diaInteiro && (
            <div className="space-y-2">
              <Label htmlFor="vagas-bloq">Quantidade de vagas por horário *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <Button
                    key={v}
                    type="button"
                    variant={vagasBloqueadas === v ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-8 text-xs font-bold"
                    onClick={() => setVagasBloqueadas(v)}
                  >
                    {v === 5 ? 'Todas (5)' : v}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Selecione quantas vagas de cada horário escolhido acima serão bloqueadas.
              </p>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="link-teams">Link do Teams (opcional)</Label>
            <Input
              id="link-teams"
              type="url"
              value={linkTeams}
              onChange={e => setLinkTeams(e.target.value)}
              placeholder="https://teams.microsoft.com/..."
            />
            <p className="text-[10px] text-muted-foreground italic">
              Se o atendimento desse horário for online, insira o link aqui.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gap-2">
              <Lock className="h-4 w-4" /> Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
