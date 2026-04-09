import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ETAPA_LABELS, EtapaEdital, TODAS_AS_ETAPAS, Vaga } from '@/types/vaga';
import { getEtapaColor } from '@/lib/vagaUtils';
import { Calendar as CalendarIcon, Users, Search, Zap, UserCheck, CheckCircle, Info, Save, X, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AcompanhamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaga: Vaga;
  onSave: (vagaId: string, data: any) => void;
}

export function AcompanhamentoModal({ isOpen, onClose, vaga, onSave }: AcompanhamentoModalProps) {
  const [formData, setFormData] = useState<any>({
    etapa_atual: 'inscricoes',
    total_inscritos: 0,
    aprovados_triagem: 0,
    aprovados_avaliacao_especifica: 0,
    convocados_entrevista: 0,
    aprovados_finais: 0,
    situacao_etapa: 'pendente',
    observacoes_etapa: '',
    data_real_etapa: new Date().toISOString().split('T')[0],
    concluido: false,
  });

  useEffect(() => {
    if (vaga && vaga.acompanhamento) {
      setFormData({
        ...formData,
        ...vaga.acompanhamento,
        // Ensure numbers are numbers
        total_inscritos: vaga.total_inscritos || vaga.acompanhamento.total_inscritos || 0,
        aprovados_triagem: vaga.aprovados_triagem || vaga.acompanhamento.aprovados_triagem || 0,
        aprovados_avaliacao_especifica: vaga.acompanhamento.aprovados_avaliacao_especifica || 0,
        convocados_entrevista: vaga.convocados_entrevista || vaga.acompanhamento.convocados_entrevista || 0,
        aprovados_finais: vaga.aprovados_finais || vaga.acompanhamento.aprovados_finais || 0,
        concluido: vaga.acompanhamento.situacao_etapa === 'concluido',
      });
    }
  }, [vaga, isOpen]);

  const handleSave = () => {
    const finalData = {
      ...formData,
      situacao_etapa: formData.concluido ? 'concluido' : formData.situacao_etapa === 'concluido' ? 'em_andamento' : formData.situacao_etapa,
    };
    onSave(vaga.id, finalData);
    onClose();
  };

  const DatePicker = ({ value, onChange, label }: { value: string, onChange: (date: string) => void, label: string }) => {
    const dateValue = value ? new Date(value) : undefined;
    
    return (
      <div className="space-y-2 flex-1">
        <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-semibold h-10 border-slate-200 hover:bg-slate-50 transition-all rounded-lg shadow-sm",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {dateValue ? format(dateValue, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateValue}
              onSelect={(date) => {
                if (date) {
                  onChange(date.toISOString().split('T')[0]);
                }
              }}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const InputField = ({ icon: Icon, label, value, onChange, color, type = "number" }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 border-l-2 border-primary/30 pl-2 mb-1">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{label}</Label>
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? +e.target.value : e.target.value)}
        className="h-10 bg-white border-slate-200 font-bold text-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-white p-6 border-b border-slate-100">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Atualizar Acompanhamento
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  {vaga.cargo} · <span className="text-primary font-bold">{vaga.numero_edital || vaga.requisicao}</span>
                </p>
              </div>
              <Badge className={cn(getEtapaColor(formData.etapa_atual as EtapaEdital), "font-black px-4 py-1.5 text-xs uppercase tracking-wider shadow-sm")}>
                {ETAPA_LABELS[formData.etapa_atual as EtapaEdital] || formData.etapa_atual}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">Etapa Atual</Label>
                <Select
                  value={formData.etapa_atual}
                  onValueChange={(val) => setFormData({ ...formData, etapa_atual: val })}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-slate-700 rounded-lg shadow-sm">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {TODAS_AS_ETAPAS.map((etapa) => (
                      <SelectItem key={etapa} value={etapa} className="font-medium">
                        {ETAPA_LABELS[etapa]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-2">
                <DatePicker
                  label="Data da Etapa"
                  value={formData.data_real_etapa}
                  onChange={(val) => setFormData({ ...formData, data_real_etapa: val })}
                />
                
                <div className="flex items-center gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-100/50">
                  <Checkbox
                    id="concluido"
                    checked={formData.concluido}
                    onCheckedChange={(val) => setFormData({ ...formData, concluido: val as boolean })}
                    className="h-5 w-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="concluido" className="text-[11px] font-bold text-slate-700 uppercase cursor-pointer select-none">
                      Concluída / Publicada
                    </Label>
                    <span className="text-[9px] text-slate-500 font-medium">Marque se esta etapa já foi finalizada ou o edital publicado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Resumo Operacional</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  icon={Users}
                  label="Inscritos"
                  value={formData.total_inscritos}
                  onChange={(val: number) => setFormData({ ...formData, total_inscritos: val })}
                  color="text-blue-500"
                />
                <InputField
                  icon={Search}
                  label="Triagem"
                  value={formData.aprovados_triagem}
                  onChange={(val: number) => setFormData({ ...formData, aprovados_triagem: val })}
                  color="text-purple-500"
                />
                <InputField
                  icon={Zap}
                  label="Avaliação"
                  value={formData.aprovados_avaliacao_especifica}
                  onChange={(val: number) => setFormData({ ...formData, aprovados_avaliacao_especifica: val })}
                  color="text-cyan-500"
                />
                <InputField
                  icon={UserCheck}
                  label="Entrevista"
                  value={formData.convocados_entrevista}
                  onChange={(val: number) => setFormData({ ...formData, convocados_entrevista: val })}
                  color="text-amber-500"
                />
              </div>
              <InputField
                icon={CheckCircle}
                label="Resultado Final (Aprovados)"
                value={formData.aprovados_finais}
                onChange={(val: number) => setFormData({ ...formData, aprovados_finais: val })}
                color="text-green-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">
              Observações Operacionais
            </Label>
            <Textarea
              value={formData.observacoes_etapa}
              onChange={(e) => setFormData({ ...formData, observacoes_etapa: e.target.value })}
              placeholder="Descreva o andamento desta etapa ou observações importantes..."
              className="min-h-[100px] bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none p-4"
            />
          </div>
        </div>

        <div className="bg-slate-50/80 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 hover:bg-slate-100">
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20">
            <Save className="mr-2 h-4 w-4" /> Salvar Atualização
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add these to make it work
import { Activity } from 'lucide-react';
