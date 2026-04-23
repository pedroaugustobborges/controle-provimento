import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Convocacao } from '@/types/vaga';
import { useVagasStore } from '@/store/vagasStore';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface DevolutivaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocacao: Convocacao;
}

export function DevolutivaDialog({ open, onOpenChange, convocacao }: DevolutivaDialogProps) {
  const { updateConvocacao, updateVaga, updateBanco, addAlerta } = useVagasStore();
  const [devolutiva, setDevolutiva] = useState<'aceitou' | 'recusou'>(convocacao.devolutiva || 'aceitou');
  const [motivoRecusa, setMotivoRecusa] = useState(convocacao.motivo_recusa || 'recusa_unidade');
  const [observacao, setObservacao] = useState(convocacao.observacao_devolutiva || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Update the convocation
    updateConvocacao(convocacao.id, {
      devolutiva,
      motivo_recusa: devolutiva === 'recusou' ? motivoRecusa : undefined,
      observacao_devolutiva: observacao,
      status: devolutiva === 'aceitou' ? 'aceite' : (motivoRecusa as any)
    });

    // Side effects logic
    if (devolutiva === 'aceitou') {
      // Aceitou
      addAlerta({
        id: `a-acc-${Date.now()}`,
        titulo: 'Convocação ACEITA',
        mensagem: `O candidato ${convocacao.nome_candidato} aceitou a convocação para a vaga ${convocacao.cargo} (${convocacao.requisicao}).`,
        tipo: 'informativo',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`
      });

      // Update banco if linked
      if (convocacao.banco_relacionado) {
        updateBanco(convocacao.banco_relacionado, { 
          status: 'CONVOCADO', 
          data_convocacao: today, 
          unidade_convocacao: convocacao.unidade 
        });
      }

      // Move vacancy to documentation
      if (convocacao.vaga_id) {
        updateVaga(convocacao.vaga_id, { status: 'em_documentacao' });
      }
      
      toast.success('Devolutiva de ACEITE registrada. Vaga movida para "Em Documentação".');
    } else {
      // Recusou
      toast.warning('Devolutiva de RECUSA registrada.');
      
      // Check if there's still candidates in the bank (simplification: notify analyst)
      addAlerta({
        id: `a-rec-${Date.now()}`,
        titulo: 'Convocação RECUSADA',
        mensagem: `O candidato ${convocacao.nome_candidato} recusou a convocação. Motivo: ${motivoRecusa}.`,
        tipo: 'critico',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Analista da unidade',
        link: `/vagas/${convocacao.vaga_id}`
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Registrar Devolutiva Final</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-muted/30 p-3 rounded-lg border border-border/60 text-sm">
            <p><strong>Candidato:</strong> {convocacao.nome_candidato}</p>
            <p><strong>Vaga:</strong> {convocacao.cargo} - {convocacao.unidade}</p>
          </div>

          <div className="space-y-3">
            <Label>Resultado da Convocação</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="button"
                variant={devolutiva === 'aceitou' ? 'default' : 'outline'}
                className={`h-20 flex-col gap-2 ${devolutiva === 'aceitou' ? 'bg-success hover:bg-green-700' : ''}`}
                onClick={() => setDevolutiva('aceitou')}
              >
                <CheckCircle2 className="h-6 w-6" />
                Aceitou
              </Button>
              <Button 
                type="button"
                variant={devolutiva === 'recusou' ? 'default' : 'outline'}
                className={`h-20 flex-col gap-2 ${devolutiva === 'recusou' ? 'bg-destructive hover:bg-red-700' : ''}`}
                onClick={() => setDevolutiva('recusou')}
              >
                <XCircle className="h-6 w-6" />
                Recusou
              </Button>
            </div>
          </div>

          {devolutiva === 'recusou' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="motivo_recusa">Motivo da Recusa</Label>
              <Select value={motivoRecusa} onValueChange={(v: any) => setMotivoRecusa(v)}>
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="observacao_devolutiva">Observações da Analista</Label>
            <Textarea 
              id="observacao_devolutiva" 
              value={observacao} 
              onChange={e => setObservacao(e.target.value)}
              placeholder="Descreva detalhes do contato, justificativas ou observações importantes..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="font-bold">Salvar Devolutiva</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
