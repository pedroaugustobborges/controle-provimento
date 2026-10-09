import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Convocacao } from '@/types/vaga';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, UserX, UserMinus, ShieldOff,
} from 'lucide-react';

type Devolutiva = 'aceitou' | 'recusou' | 'faltou' | 'desistiu' | 'desclassificado';

interface DevolutivaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocacao: Convocacao;
}

const OPCOES: {
  value: Devolutiva;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    value: 'aceitou',
    label: 'Aceitou',
    icon: CheckCircle2,
    activeClass: 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-emerald-200',
    inactiveClass: 'border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50',
  },
  {
    value: 'recusou',
    label: 'Recusou',
    icon: XCircle,
    activeClass: 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white shadow-rose-200',
    inactiveClass: 'border-slate-200 text-slate-600 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50',
  },
  {
    value: 'faltou',
    label: 'Faltou',
    icon: UserX,
    activeClass: 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-amber-200',
    inactiveClass: 'border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50',
  },
  {
    value: 'desistiu',
    label: 'Desistiu',
    icon: UserMinus,
    activeClass: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white shadow-orange-200',
    inactiveClass: 'border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50',
  },
  {
    value: 'desclassificado',
    label: 'Desclassificado',
    icon: ShieldOff,
    activeClass: 'bg-slate-600 hover:bg-slate-700 border-slate-600 text-white shadow-slate-200',
    inactiveClass: 'border-slate-200 text-slate-600 hover:border-slate-500 hover:text-slate-700 hover:bg-slate-100',
  },
];

const STATUS_MAP: Record<Devolutiva, string> = {
  aceitou: 'aceite',
  recusou: 'recusa_unidade',
  faltou: 'faltou',
  desistiu: 'desistiu',
  desclassificado: 'desclassificado',
};

export function DevolutivaDialog({ open, onOpenChange, convocacao }: DevolutivaDialogProps) {
  const { updateConvocacao, updateVaga, updateBanco, addAlerta } = useVagasStore();
  const [devolutiva, setDevolutiva] = useState<Devolutiva>(convocacao.devolutiva || 'aceitou');
  const [motivoRecusa, setMotivoRecusa] = useState(convocacao.motivo_recusa || 'recusa_unidade');
  const [observacao, setObservacao] = useState(convocacao.observacao_devolutiva || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date().toISOString().split('T')[0];

    const status = devolutiva === 'recusou' ? (motivoRecusa as any) : STATUS_MAP[devolutiva];

    updateConvocacao(convocacao.id, {
      devolutiva,
      motivo_recusa: devolutiva === 'recusou' ? motivoRecusa : undefined,
      observacao_devolutiva: observacao,
      status,
    });

    if (devolutiva === 'aceitou') {
      addAlerta({
        id: `a-acc-${Date.now()}`,
        titulo: 'Convocação ACEITA',
        mensagem: `O candidato ${convocacao.nome_candidato} aceitou a convocação para a vaga ${convocacao.cargo} (${convocacao.requisicao}).`,
        tipo: 'informativo',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`,
      });

      if (convocacao.banco_relacionado) {
        updateBanco(convocacao.banco_relacionado, {
          status: 'CONVOCADO',
          data_convocacao: today,
          unidade_convocacao: convocacao.unidade,
        });
      }

      if (convocacao.vaga_id) {
        updateVaga(convocacao.vaga_id, { status: 'em_documentacao' });
      }

      toast.success('Devolutiva de ACEITE registrada. Vaga movida para "Em Documentação".');
    } else if (devolutiva === 'recusou') {
      addAlerta({
        id: `a-rec-${Date.now()}`,
        titulo: 'Convocação RECUSADA',
        mensagem: `O candidato ${convocacao.nome_candidato} recusou a convocação. Motivo: ${motivoRecusa}.`,
        tipo: 'critico',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`,
      });
      toast.warning('Devolutiva de RECUSA registrada.');
    } else if (devolutiva === 'faltou') {
      addAlerta({
        id: `a-fal-${Date.now()}`,
        titulo: 'Candidato FALTOU',
        mensagem: `O candidato ${convocacao.nome_candidato} não compareceu à convocação para ${convocacao.cargo} (${convocacao.requisicao}).`,
        tipo: 'critico',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`,
      });
      toast.warning('Devolutiva registrada: candidato FALTOU.');
    } else if (devolutiva === 'desistiu') {
      addAlerta({
        id: `a-des-${Date.now()}`,
        titulo: 'Candidato DESISTIU',
        mensagem: `O candidato ${convocacao.nome_candidato} desistiu da convocação para ${convocacao.cargo} (${convocacao.requisicao}).`,
        tipo: 'critico',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`,
      });
      toast.warning('Devolutiva registrada: candidato DESISTIU.');
    } else if (devolutiva === 'desclassificado') {
      addAlerta({
        id: `a-dcl-${Date.now()}`,
        titulo: 'Candidato DESCLASSIFICADO',
        mensagem: `O candidato ${convocacao.nome_candidato} foi desclassificado da convocação para ${convocacao.cargo} (${convocacao.requisicao}).`,
        tipo: 'critico',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`,
      });
      toast.warning('Devolutiva registrada: candidato DESCLASSIFICADO.');
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Registrar Devolutiva Final</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Candidate summary */}
          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm space-y-0.5">
            <p className="font-semibold text-slate-800">{convocacao.nome_candidato}</p>
            <p className="text-slate-500 text-xs">{convocacao.cargo} · {convocacao.unidade}</p>
          </div>

          {/* Outcome selector */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Resultado da Convocação
            </Label>

            {/* Row 1 — primary outcomes */}
            <div className="grid grid-cols-2 gap-2.5">
              {OPCOES.slice(0, 2).map(({ value, label, icon: Icon, activeClass, inactiveClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDevolutiva(value)}
                  className={`
                    flex flex-col items-center justify-center gap-2 h-[72px] rounded-xl border-2
                    font-semibold text-sm transition-all duration-150 shadow-sm
                    ${devolutiva === value ? `${activeClass} shadow-md` : inactiveClass}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Row 2 — secondary outcomes */}
            <div className="grid grid-cols-3 gap-2.5">
              {OPCOES.slice(2).map(({ value, label, icon: Icon, activeClass, inactiveClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDevolutiva(value)}
                  className={`
                    flex flex-col items-center justify-center gap-2 h-[72px] rounded-xl border-2
                    font-semibold text-xs transition-all duration-150 shadow-sm
                    ${devolutiva === value ? `${activeClass} shadow-md` : inactiveClass}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Motivo — only for "Recusou" */}
          {devolutiva === 'recusou' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="motivo_recusa" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Motivo da Recusa
              </Label>
              <Select value={motivoRecusa} onValueChange={(v: any) => setMotivoRecusa(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recusa_unidade">Recusa Unidade</SelectItem>
                  <SelectItem value="recusa_horario">Recusa Horário</SelectItem>
                  <SelectItem value="recusa_plantao">Recusa Plantão</SelectItem>
                  <SelectItem value="outros">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacao_devolutiva" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Observações
            </Label>
            <Textarea
              id="observacao_devolutiva"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Descreva detalhes do contato, justificativas ou observações importantes..."
              className="min-h-[90px] resize-none text-sm"
            />
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="font-bold">
              Salvar Devolutiva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
