import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ETAPA_LABELS, EtapaEdital, TODAS_AS_ETAPAS, Vaga, EtapaStatus } from '@/types/vaga';
import { getEtapaColor } from '@/lib/vagaUtils';
import { Calendar as CalendarIcon, Users, Search, Zap, UserCheck, CheckCircle, Info, Save, X, Calendar, Activity, Bot, ChevronRight, CheckSquare, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    concluida: false,
    historico_etapas: [] as EtapaStatus[],
  });

  useEffect(() => {
    if (vaga) {
      const acompanhamento = (vaga.acompanhamento || {}) as any;
      setFormData({
        ...formData,
        ...acompanhamento,
        total_inscritos: vaga.total_inscritos || acompanhamento.total_inscritos || 0,
        aprovados_triagem: vaga.aprovados_triagem || acompanhamento.aprovados_triagem || 0,
        aprovados_avaliacao_especifica: acompanhamento.aprovados_avaliacao_especifica || 0,
        convocados_entrevista: vaga.convocados_entrevista || acompanhamento.convocados_entrevista || 0,
        aprovados_finais: vaga.aprovados_finais || acompanhamento.aprovados_finais || 0,
        concluida: acompanhamento.situacao_etapa === 'concluido',
        historico_etapas: acompanhamento.historico_etapas || [],
      });
    }
  }, [vaga, isOpen]);

  const handleSave = () => {
    const finalData = {
      ...formData,
      situacao_etapa: formData.concluida ? 'concluido' : formData.situacao_etapa === 'concluido' ? 'em_andamento' : formData.situacao_etapa,
    };
    onSave(vaga.id, finalData);
    onClose();
  };

  const handleAutoFillDates = () => {
    const today = new Date();
    const mockEtapas: EtapaStatus[] = [
      { etapa: 'validacao_edital', data_prevista: format(addDays(today, -5), 'yyyy-MM-dd'), data_realizada: format(addDays(today, -4), 'yyyy-MM-dd'), concluida: true },
      { etapa: 'inscricoes', data_prevista: format(addDays(today, 0), 'yyyy-MM-dd'), data_realizada: '', concluida: false },
      { etapa: 'triagem', data_prevista: format(addDays(today, 7), 'yyyy-MM-dd'), data_realizada: '', concluida: false },
      { etapa: 'entrevistas', data_prevista: format(addDays(today, 15), 'yyyy-MM-dd'), data_realizada: '', concluida: false },
      { etapa: 'resultado_final', data_prevista: format(addDays(today, 25), 'yyyy-MM-dd'), data_realizada: '', concluida: false },
    ];
    
    setFormData({
      ...formData,
      historico_etapas: mockEtapas
    });
    
    toast.success('Datas extraídas do edital com sucesso!');
  };

  const updateEtapaHistorico = (etapa: EtapaEdital, field: keyof EtapaStatus, value: any) => {
    const newHistorico = [...(formData.historico_etapas || [])];
    const index = newHistorico.findIndex(h => h.etapa === etapa);
    
    if (index >= 0) {
      newHistorico[index] = { ...newHistorico[index], [field]: value };
      
      // If marking as concluded, suggest moving to the next logical step
      if (field === 'concluida' && value === true) {
        const currentEtapa = newHistorico[index].etapa;
        const nextIndex = TODAS_AS_ETAPAS.indexOf(currentEtapa as EtapaEdital) + 1;
        if (nextIndex < TODAS_AS_ETAPAS.length) {
          const nextEtapa = TODAS_AS_ETAPAS[nextIndex];
          
          toast(`Etapa "${ETAPA_LABELS[currentEtapa as EtapaEdital]}" concluída!`, {
            description: `Deseja atualizar a Etapa Atual para "${ETAPA_LABELS[nextEtapa]}"?`,
            action: {
              label: "Atualizar",
              onClick: () => setFormData(prev => ({ ...prev, etapa_atual: nextEtapa }))
            },
          });
        }
      }
    } else {
      newHistorico.push({
        etapa,
        concluida: field === 'concluida' ? value : false,
        [field]: value
      });
    }
    
    setFormData({ ...formData, historico_etapas: newHistorico });
  };

  const DatePicker = ({ value, onChange, label }: { value: string, onChange: (date: string) => void, label: string }) => {
    const dateValue = value ? new Date(value) : undefined;
    
    return (
      <div className="space-y-2 flex-1">
        <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-semibold h-10 border-border/60 hover:bg-muted/30 transition-all rounded-lg shadow-sm",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {dateValue ? format(dateValue, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[9999]" align="start" sideOffset={8}>
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
        <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{label}</Label>
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? +e.target.value : e.target.value)}
        className="h-10 bg-white border-border/60 font-bold text-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-white p-6 border-b border-border/40">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Atualizar Acompanhamento
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {vaga.cargo} · <span className="text-primary font-bold">{vaga.numero_edital || vaga.requisicao}</span>
                </p>
              </div>
              <Badge className={cn(getEtapaColor(formData.etapa_atual as EtapaEdital), "font-black px-4 py-1.5 text-xs uppercase tracking-wider shadow-sm")}>
                {ETAPA_LABELS[formData.etapa_atual as EtapaEdital] || formData.etapa_atual}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-0 flex flex-col max-h-[70vh]">
          <Tabs defaultValue="operacional" className="w-full flex flex-col h-full">
            <div className="px-6 border-b border-border/40 bg-muted/30/50">
              <TabsList className="h-12 bg-transparent gap-6 p-0">
                <TabsTrigger 
                  value="operacional" 
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Operacional
                </TabsTrigger>
                <TabsTrigger 
                  value="datas" 
                  className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Datas das Etapas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1">
              <TabsContent value="operacional" className="p-6 m-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">Etapa Atual</Label>
                      <Select
                        value={formData.etapa_atual}
                        onValueChange={(val) => setFormData({ ...formData, etapa_atual: val })}
                      >
                        <SelectTrigger className="h-10 bg-white border-border/60 font-bold text-slate-700 rounded-lg shadow-sm">
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
                      
                      <div className="flex items-center gap-3 p-4 bg-muted/30/80 rounded-xl border border-border/60 shadow-sm transition-all hover:bg-slate-100/50">
                        <Checkbox
                          id="concluida"
                          checked={formData.concluida}
                          onCheckedChange={(val) => setFormData({ ...formData, concluida: val as boolean })}
                          className="h-5 w-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <div className="flex flex-col">
                          <Label htmlFor="concluida" className="text-[11px] font-bold text-slate-700 uppercase cursor-pointer select-none">
                            Concluída / Publicada
                          </Label>
                          <span className="text-[9px] text-muted-foreground font-medium">Marque se esta etapa já foi finalizada ou o edital publicado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30/50 p-4 rounded-xl border border-border/40 space-y-4">
                    <div className="flex items-center gap-2 mb-3 border-b border-border/60 pb-2">
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
                  <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/30 pl-2 mb-1">
                    Observações Operacionais
                  </Label>
                  <Textarea
                    value={formData.observacoes_etapa}
                    onChange={(e) => setFormData({ ...formData, observacoes_etapa: e.target.value })}
                    placeholder="Descreva o andamento desta etapa ou observações importantes..."
                    className="min-h-[100px] bg-white border-border/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none p-4"
                  />
                </div>
              </TabsContent>

              <TabsContent value="datas" className="p-0 m-0">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 p-2 rounded-lg shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900">Leitura Inteligente de Edital</h4>
                        <p className="text-[11px] text-blue-700">Extrair datas e etapas automaticamente do documento anexo.</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-blue-700 text-white font-bold h-9 shadow-sm"
                      onClick={handleAutoFillDates}
                    >
                      <Zap className="h-3.5 w-3.5 mr-2" />
                      Sugerir Datas
                    </Button>
                  </div>

                  <div className="border border-border/40 rounded-xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/30/80">
                        <TableRow className="hover:bg-transparent border-border/40">
                          <TableHead className="w-[30%] text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Etapa do Edital</TableHead>
                          <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Prevista</TableHead>
                          <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Realizada</TableHead>
                          <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Observação</TableHead>
                          <TableHead className="w-[60px] text-center text-[10px] font-black text-muted-foreground uppercase tracking-tighter">OK</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TODAS_AS_ETAPAS.map((etapaKey) => {
                          const item = formData.historico_etapas?.find(h => h.etapa === etapaKey) || {
                            etapa: etapaKey,
                            data_prevista: '',
                            data_realizada: '',
                            concluida: false
                          };

                          return (
                            <TableRow key={etapaKey} className="group hover:bg-muted/30/50 border-slate-50">
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-700">{ETAPA_LABELS[etapaKey]}</span>
                                  {item.observacoes && (
                                    <span className="text-[9px] text-muted-foreground italic">{item.observacoes}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <Input 
                                  type="date"
                                  value={item.data_prevista || ''}
                                  onChange={(e) => updateEtapaHistorico(etapaKey, 'data_prevista', e.target.value)}
                                  className="h-8 text-[11px] font-semibold p-1 border-border/60"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input 
                                  type="date"
                                  value={item.data_realizada || ''}
                                  onChange={(e) => updateEtapaHistorico(etapaKey, 'data_realizada', e.target.value)}
                                  className="h-8 text-[11px] font-semibold p-1 border-border/60"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input 
                                  placeholder="Obs..."
                                  value={item.observacoes || ''}
                                  onChange={(e) => updateEtapaHistorico(etapaKey, 'observacoes', e.target.value)}
                                  className="h-8 text-[10px] font-medium p-1 border-border/60"
                                />
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <Checkbox 
                                  checked={item.concluida}
                                  onCheckedChange={(val) => updateEtapaHistorico(etapaKey, 'concluida', val as boolean)}
                                  className="h-4 w-4 rounded-md"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed border-slate-300">
                    <p className="text-[10px] text-muted-foreground font-medium italic">
                      As etapas acima são as padrão para este tipo de edital. Você pode ajustar as datas conforme o documento oficial.
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-primary">
                      + Adicionar Etapa Personalizada
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="bg-muted/30/80 p-4 border-t border-border/40 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground hover:bg-slate-100">
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
// Removed duplicate Activity import
