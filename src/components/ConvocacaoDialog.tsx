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
  const { addConvocacao, updateConvocacao, updateVaga, updateBanco, addAlerta, addTarefa } = useVagasStore();
  const { currentUser } = useAdminStore();
  
  const [formData, setFormData] = useState<Partial<Convocacao>>({
    data_convocacao: new Date().toISOString().split('T')[0],
    horario: '',
    nome_candidato: '',
    classificacao: 1,
    tipo_convocacao: 'Presencial',
    status: 'pendente',
    observacoes: '',
    edoc: '',
    responsavel: currentUser?.nome_completo || 'Analista'
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

    const today = new Date().toISOString().split('T')[0];
    const convocacaoId = convocacaoToEdit ? convocacaoToEdit.id : `conv-${Date.now()}`;
    const status = formData.status as string;

    if (convocacaoToEdit) {
      updateConvocacao(convocacaoToEdit.id, formData);
    } else {
      const newConvocacao: Convocacao = {
        ...formData as Convocacao,
        id: convocacaoId,
      };
      addConvocacao(newConvocacao);
    }

    // Section 10.5: Aceite e Recusa Logic
    if (vaga) {
      if (status === 'aceite') {
        // Aceitou: sinalizar ao analista da unidade e permitir fechamento
        addAlerta({
          id: `a-acc-${Date.now()}`,
          titulo: 'Convocação ACEITA',
          mensagem: `O candidato ${formData.nome_candidato} aceitou a convocação para a vaga ${vaga.cargo} (${vaga.requisicao}).`,
          tipo: 'informativo',
          status: 'nao_lido',
          data_criacao: today,
          destinatario: vaga.analista_responsavel,
          link: `/vagas/${vaga.id}`
        });

        // Mudar status no banco para CONVOCADO e remover disponibilidade
        if (formData.banco_relacionado) {
          updateBanco(formData.banco_relacionado, { 
            status: 'CONVOCADO', 
            data_convocacao: today, 
            unidade_convocacao: vaga.unidade 
          });
        }

        // Permitir que a vaga siga para fechamento (mudar para documentação ou admissão)
        updateVaga(vaga.id, { status: 'em_documentacao' });
        toast.success('Convocação ACEITA. Vaga movida para "Em Documentação".');

      } else if (['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(status)) {
        // Recusou: registrar recusa
        toast.warning('Convocação RECUSADA registrada.');
        
        // Verificar se ainda há banco disponível
        const matchedBanco = useVagasStore.getState().getBancoByVaga(vaga.id);
        if (!matchedBanco || !matchedBanco.quantidade_banco || Number(matchedBanco.quantidade_banco) <= 0) {
          // Se não houver banco, habilitar flag para publicar novo edital
          updateVaga(vaga.id, { status: 'publicar_novo_edital' });
          addAlerta({
            id: `a-new-ed-${Date.now()}`,
            titulo: 'Necessidade de Novo Edital',
            mensagem: `Candidato recusou convocação para a vaga ${vaga.cargo} e não há mais banco disponível.`,
            tipo: 'critico',
            status: 'nao_lido',
            data_criacao: today,
            destinatario: 'Analista do edital',
            link: `/vagas/${vaga.id}`
          });
          toast.info('Sem banco disponível. Vaga marcada para "Publicar Novo Edital".');
        } else {
          toast.info('Ainda há candidatos no banco disponível.');
        }
      }
    }
    
    if (convocacaoToEdit) {
      toast.success('Convocação atualizada');
    } else {
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
