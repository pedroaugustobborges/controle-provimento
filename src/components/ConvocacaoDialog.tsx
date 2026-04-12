import React, { useState, useEffect, useMemo } from 'react';
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
import { getHorariosDisponiveis, getBaseForUnidade } from '@/lib/convocacaoUtils';
import { Clock, Info, MapPin } from 'lucide-react';

interface ConvocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga?: Vaga;
  convocacaoToEdit?: Convocacao;
}

export function ConvocacaoDialog({ open, onOpenChange, vaga, convocacaoToEdit }: ConvocacaoDialogProps) {
  const { addConvocacao, updateConvocacao, updateVaga, updateBanco, addAlerta, convocacoes } = useVagasStore();
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
    secao: '',
    carga_horaria: '',
    horario_trabalho: '',
    unidade_alternativa: '',
    tipo_atendimento: 'presencial',
    link_teams: '',
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
        secao: vaga.secao || '',
        requisicao: vaga.requisicao || vaga.numero_requisicao || '',
        edital_relacionado: matchedBanco?.numero_edital || vaga.numero_edital || '',
        banco_relacionado: matchedBanco?.id || vaga.banco_id || ''
      }));
    }
  }, [vaga, convocacaoToEdit, open]);

  // Lógica de horários disponíveis
  const horariosDisponiveis = useMemo(() => {
    if (!formData.data_convocacao || !formData.unidade) return [];
    
    // Se estiver editando, o próprio horário da convocação deve estar disponível
    const disponiveis = getHorariosDisponiveis(
      formData.data_convocacao, 
      formData.unidade, 
      convocacoes.filter(c => c.id !== convocacaoToEdit?.id)
    );

    return disponiveis;
  }, [formData.data_convocacao, formData.unidade, convocacoes, convocacaoToEdit]);

  const baseName = useMemo(() => {
    if (!formData.unidade) return '';
    return getBaseForUnidade(formData.unidade);
  }, [formData.unidade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_candidato || !formData.data_convocacao || !formData.horario) {
      toast.error('Preencha os campos obrigatórios (Nome, Data e Horário)');
      return;
    }

    const convocacaoId = convocacaoToEdit ? convocacaoToEdit.id : `conv-${Date.now()}`;

    if (convocacaoToEdit) {
      updateConvocacao(convocacaoToEdit.id, formData);
      toast.success('Convocação atualizada com sucesso');
    } else {
      const newConvocacao: Convocacao = {
        ...formData as Convocacao,
        id: convocacaoId,
        status: 'pendente'
      };
      addConvocacao(newConvocacao);
      toast.success('Convocação criada e enviada para o módulo diário');

      // Atualizar registro do banco para CONVOCADO
      if (formData.banco_relacionado) {
        updateBanco(formData.banco_relacionado, {
          status: 'CONVOCADO',
          data_convocacao: formData.data_convocacao,
          unidade_convocacao: formData.unidade || vaga?.unidade,
        });
      }

      // Se tiver vaga vinculada, atualizar status para CONVOCAÇÕES
      if (vaga) {
        updateVaga(vaga.id, { status: 'CONVOCAÇÕES' });
      }
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {convocacaoToEdit ? 'Editar Agendamento' : 'Criar Novo Agendamento de Convocação'}
          </DialogTitle>
          <DialogDescription>
            A convocação preenchida será enviada para o painel de <strong>Convocações Diárias</strong> para devolutiva final.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Informações da Vaga (Somente leitura para contexto) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Cargo</span>
              <p className="text-sm font-bold text-slate-700">{formData.cargo}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Unidade Origem</span>
              <p className="text-sm font-bold text-slate-700">{formData.unidade}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Requisição</span>
              <p className="text-sm font-bold text-slate-700">{formData.requisicao}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Esquerda: Dados da Agenda */}
            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Agendamento
                </h3>
                
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
                  <Label htmlFor="horario">Horário da Convocação *</Label>
                  
                  {baseName === 'Goiânia' ? (
                    <>
                      <Select 
                        value={formData.horario} 
                        onValueChange={v => setFormData({...formData, horario: v})}
                      >
                        <SelectTrigger className="bg-white border-primary/20">
                          <SelectValue placeholder="Selecione um horário com vagas" />
                        </SelectTrigger>
                        <SelectContent>
                          {horariosDisponiveis.length > 0 ? (
                            horariosDisponiveis.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>Nenhum horário disponível (Limite de 5 por horário excedido)</SelectItem>
                          )}
                          {convocacaoToEdit && !horariosDisponiveis.includes(convocacaoToEdit.horario) && (
                            <SelectItem value={convocacaoToEdit.horario}>{convocacaoToEdit.horario} (Atual)</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500 italic">
                        <Info className="h-3 w-3 inline mr-1" />
                        Base Goiânia: Máximo 5 agendamentos por horário entre todas as unidades (HUGOL, CRER, HDS, HECAD, AGIR).
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Input 
                          id="horario" 
                          value={formData.horario || ''} 
                          onChange={e => setFormData({...formData, horario: e.target.value})}
                          placeholder="Ex: 14:30, 15:00..."
                          className="pl-9"
                          required
                        />
                        <Clock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        <Info className="h-3 w-3 inline mr-1" />
                        Base {baseName || 'não identificada'}: Horário livre. Digite o horário desejado manualmente.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade_alternativa">Unidade Alternativa (Opcional)</Label>
                <Input 
                  id="unidade_alternativa" 
                  value={formData.unidade_alternativa || ''} 
                  onChange={e => setFormData({...formData, unidade_alternativa: e.target.value})}
                  placeholder="Ex: Suá, São Pedro..."
                />
                <p className="text-[10px] text-slate-400">Use este campo se a convocação for para uma variação da unidade principal.</p>
              </div>
            </div>

            {/* Direita: Dados do Candidato e Vaga */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_candidato">Nome do Candidato *</Label>
                <Input 
                  id="nome_candidato" 
                  value={formData.nome_candidato} 
                  onChange={e => setFormData({...formData, nome_candidato: e.target.value})}
                  placeholder="Nome completo do candidato"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secao">Seção</Label>
                  <Input 
                    id="secao" 
                    value={formData.secao || ''} 
                    onChange={e => setFormData({...formData, secao: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classificacao">Classificação</Label>
                  <Input 
                    id="classificacao" 
                    type="number" 
                    value={formData.classificacao} 
                    onChange={e => setFormData({...formData, classificacao: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carga_horaria">Carga Horária</Label>
                  <Input 
                    id="carga_horaria" 
                    value={formData.carga_horaria || ''} 
                    onChange={e => setFormData({...formData, carga_horaria: e.target.value})}
                    placeholder="Ex: 44h/semana"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario_trabalho">Horário de Trabalho</Label>
                  <Input 
                    id="horario_trabalho" 
                    value={formData.horario_trabalho || ''} 
                    onChange={e => setFormData({...formData, horario_trabalho: e.target.value})}
                    placeholder="Ex: 08:00 às 18:00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edoc">Nº EDOC</Label>
                <Input 
                  id="edoc" 
                  value={formData.edoc || ''} 
                  onChange={e => setFormData({...formData, edoc: e.target.value})}
                  placeholder="Nº do processo eletrônico"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_atendimento">Tipo de Atendimento</Label>
                <Select
                  value={formData.tipo_atendimento || 'presencial'}
                  onValueChange={v => setFormData({...formData, tipo_atendimento: v as any})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online (Microsoft Teams)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_atendimento === 'online' && (
                <div className="space-y-2">
                  <Label htmlFor="link_teams">Link do Microsoft Teams</Label>
                  <Input
                    id="link_teams"
                    value={formData.link_teams || ''}
                    onChange={e => setFormData({...formData, link_teams: e.target.value})}
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                    type="url"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Adicionais</Label>
            <Textarea 
              id="observacoes" 
              value={formData.observacoes} 
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Detalhes relevantes sobre a vaga ou o candidato..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="px-8 font-bold">
              {convocacaoToEdit ? 'Salvar Alterações' : 'Confirmar e Criar Convocação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
