import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { TipoVaga, StatusVaga } from '@/types/vaga';
import { getResponsavelPorUnidade } from '@/data/equipe';
import { toast } from 'sonner';

interface AddVagaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga?: any;
}

export function AddVagaDialog({ open, onOpenChange, vaga }: AddVagaDialogProps) {
  const { addVagas, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  
  const [formData, setFormData] = React.useState({
    unidade: vaga?.unidade || '',
    cargo: vaga?.cargo || '',
    requisicao: vaga?.requisicao || vaga?.numero_requisicao || '',
    tipo_vaga: vaga?.tipo_vaga || 'substituicao' as TipoVaga,
    numero_vagas: vaga?.numero_vagas || vaga?.quantidade || 1,
    secao: vaga?.secao || '',
    data_abertura: vaga?.data_abertura || new Date().toISOString().split('T')[0],
  });

  React.useEffect(() => {
    if (vaga) {
      setFormData({
        unidade: vaga.unidade || '',
        cargo: vaga.cargo || '',
        requisicao: vaga.requisicao || vaga.numero_requisicao || '',
        tipo_vaga: vaga.tipo_vaga || 'substituicao',
        numero_vagas: vaga.numero_vagas || vaga.quantidade || 1,
        secao: vaga.secao || '',
        data_abertura: vaga.data_abertura || new Date().toISOString().split('T')[0],
      });
    } else {
      resetForm();
    }
  }, [vaga, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.unidade || !formData.cargo || !formData.requisicao) {
      toast.error('Preencha os campos obrigatórios: Unidade, Cargo e Requisição.');
      return;
    }

    if (vaga) {
      updateVaga(vaga.id, {
        ...formData,
        numero_requisicao: formData.requisicao,
      });
      toast.success('Vaga atualizada com sucesso.');
      onOpenChange(false);
      return;
    }

    const { analista: defaultAnalista, assistentes } = getResponsavelPorUnidade(formData.unidade, formData.tipo_vaga);
    const now = new Date().toISOString();
    
    const newVaga: any = {
      id: `vaga-manual-${Date.now()}`,
      ...formData,
      numero_requisicao: formData.requisicao,
      data_criacao: now,
      created_at: now,
      status: 'EM ANDAMENTO' as StatusVaga,
      status_geral: 'EM ANDAMENTO' as StatusVaga,
      analista_responsavel: defaultAnalista,
      assistentes: assistentes,
      observacoes_internas: '',
      origem: 'manual',
      tem_banco_valido: false,
      historico: [{
        id: `h-${Date.now()}`,
        data: now.split('T')[0],
        descricao: 'Vaga criada manualmente no sistema',
        usuario: currentUser?.nome_completo || 'Usuário'
      }]
    };

    addVagas([newVaga]);
    toast.success('Vaga criada com sucesso.');
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      unidade: '',
      cargo: '',
      requisicao: '',
      tipo_vaga: 'substituicao',
      numero_vagas: 1,
      secao: '',
      data_abertura: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Vaga (Inclusão Manual)</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar uma nova requisição manualmente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Input id="unidade" name="unidade" value={formData.unidade} onChange={handleInputChange} placeholder="Ex: HUGOL" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requisicao">Requisição *</Label>
              <Input id="requisicao" name="requisicao" value={formData.requisicao} onChange={handleInputChange} placeholder="Ex: 123/2024" required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo *</Label>
            <Input id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} placeholder="Ex: Enfermeiro" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_vaga">Tipo de Vaga</Label>
              <Select value={formData.tipo_vaga} onValueChange={(v) => handleSelectChange('tipo_vaga', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="substituicao">Substituição</SelectItem>
                  <SelectItem value="aumento">Aumento de Quadro</SelectItem>
                  <SelectItem value="lideranca">Liderança</SelectItem>
                  <SelectItem value="movimentacao_interna">Movimentação Interna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_vagas">Qtd. Vagas</Label>
              <Input id="numero_vagas" name="numero_vagas" type="number" min="1" value={formData.numero_vagas} onChange={handleInputChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secao">Seção/Setor</Label>
              <Input id="secao" name="secao" value={formData.secao} onChange={handleInputChange} placeholder="Ex: UTI Adulto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_abertura">Data de Abertura</Label>
              <Input id="data_abertura" name="data_abertura" type="date" value={formData.data_abertura} onChange={handleInputChange} />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Criar Vaga</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
