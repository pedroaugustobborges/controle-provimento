import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Vaga, Convocacao, STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { toast } from 'sonner';

interface ConvocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga?: Vaga;
  convocacaoToEdit?: Convocacao;
}

export function ConvocacaoDialog({ open, onOpenChange, vaga, convocacaoToEdit }: ConvocacaoDialogProps) {
  const { addConvocacao, updateConvocacao, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  
  const [formData, setFormData] = useState<Partial<Convocacao>>({
    data_convocacao: new Date().toISOString().split('T')[0],
    horario: '',
    nome_candidato: '',
    classificacao: 1,
    tipo_convocacao: 'Presencial',
    status: 'pendente',
    observacoes: '',
    edoc: ''
  });

  useEffect(() => {
    if (convocacaoToEdit) {
      setFormData(convocacaoToEdit);
    } else if (vaga && open) {
      const matchedBanco = useVagasStore.getState().getBancoByVaga(vaga.id);
      setFormData(prev => ({
        ...prev,
        vaga_id: vaga.id,
        cargo: vaga.cargo,
        unidade: vaga.unidade,
        requisicao: vaga.requisicao || vaga.numero_requisicao,
        edital_relacionado: matchedBanco?.numero_edital || vaga.numero_edital || '',
        banco_relacionado: matchedBanco?.id || vaga.banco_id || ''
      }));
    }
  }, [vaga, convocacaoToEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_candidato || !formData.data_convocacao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (convocacaoToEdit) {
      updateConvocacao(convocacaoToEdit.id, formData);
      toast.success('Convocação atualizada com sucesso');
    } else {
      const newConvocacao: Convocacao = {
        ...formData as Convocacao,
        id: `conv-${Date.now()}`,
      };
      addConvocacao(newConvocacao);
      
      // Se vier de uma vaga, podemos atualizar o status da vaga
      if (vaga) {
        // updateVaga(vaga.id, { status: 'documentacao' });
      }
      
      toast.success('Convocação registrada com sucesso');
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{convocacaoToEdit ? 'Editar Convocação' : 'Nova Convocação'}</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registrar a convocação do candidato.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_convocacao">Data da Convocação *</Label>
              <Input 
                id="data_convocacao" 
                type="date" 
                value={formData.data_convocacao} 
                onChange={e => setFormData({...formData, data_convocacao: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horário</Label>
              <Input 
                id="horario" 
                type="time" 
                value={formData.horario} 
                onChange={e => setFormData({...formData, horario: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_candidato">Nome do Candidato *</Label>
            <Input 
              id="nome_candidato" 
              value={formData.nome_candidato} 
              onChange={e => setFormData({...formData, nome_candidato: e.target.value})}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classificacao">Classificação</Label>
              <Input 
                id="classificacao" 
                type="number" 
                value={formData.classificacao} 
                onChange={e => setFormData({...formData, classificacao: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_convocacao">Tipo/Forma</Label>
              <Select 
                value={formData.tipo_convocacao} 
                onValueChange={v => setFormData({...formData, tipo_convocacao: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input value={formData.unidade || ''} readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={formData.cargo || ''} readOnly className="bg-slate-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edoc">E-doc</Label>
              <Input 
                id="edoc" 
                value={formData.edoc || ''} 
                onChange={e => setFormData({...formData, edoc: e.target.value})}
                placeholder="Nº do processo eletrônico"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={v => setFormData({...formData, status: v as any})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONVOCACAO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea 
              id="observacoes" 
              value={formData.observacoes} 
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Detalhes da convocação, recusa ou outros pontos importantes..."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar Convocação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
