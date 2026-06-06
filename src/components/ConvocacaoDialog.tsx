import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Vaga, Convocacao } from '@/types/vaga';
import { toast } from 'sonner';
import { getHorariosDisponiveis, getBaseForUnidade } from '@/lib/convocacaoUtils';
import { Clock, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Hospitals list (alphabetical) ─────────────────────────────────────────
const UNIDADES_ALTERNATIVAS = [
  'AGIR',
  'CHRD',
  'CHS',
  'CRER',
  'HECAD',
  'HDS',
  'HEJ',
  'HRCAC',
  'HUGOL',
  'PA Praia do Sua',
  'PA Sao Pedro',
  'Policlínica - Goiás',
  'TEIA',
  'TEIA - Aparecida',
  'TEIA - Manaus I',
  'TEIA - Manaus II',
  'TEIA - Manaus III',
  'TEIA - Senador Canedo',
];

// ── Modern Time Picker ─────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  const selectedHour = value ? value.split(':')[0] : null;
  const selectedMin  = value ? value.split(':')[1] : null;

  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const hourRefs   = useRef<Record<string, HTMLButtonElement | null>>({});
  const minuteRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Scroll selected items into view when popover opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (selectedHour && hourRefs.current[selectedHour]) {
        hourRefs.current[selectedHour]!.scrollIntoView({ block: 'center' });
      }
      if (selectedMin && minuteRefs.current[selectedMin]) {
        minuteRefs.current[selectedMin]!.scrollIntoView({ block: 'center' });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [open, selectedHour, selectedMin]);

  const pickHour = (hr: string) => {
    const mn = selectedMin ?? '00';
    onChange(`${hr}:${mn}`);
  };

  const pickMinute = (mn: string) => {
    const hr = selectedHour ?? '08';
    onChange(`${hr}:${mn}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal bg-white border-slate-200 hover:bg-slate-50',
            !value && 'text-slate-400'
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary/60" />
            {value || 'Selecione o horário'}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-0 shadow-xl rounded-xl overflow-hidden" align="start">
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center justify-between">
          <Clock className="h-4 w-4 text-white/70" />
          <span className="text-xl font-bold text-white tracking-widest font-mono">
            {value || '--:--'}
          </span>
          <span className="text-[10px] text-white/50 uppercase font-bold">24h</span>
        </div>

        {/* Column labels */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hora
          </div>
          <div className="w-px bg-slate-200" />
          <div className="flex-1 text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Min
          </div>
        </div>

        {/* Scroll columns */}
        <div className="flex">
          {/* Hours */}
          <ScrollArea className="flex-1 h-52">
            <div className="py-1">
              {hours.map(hr => (
                <button
                  key={hr}
                  ref={el => { hourRefs.current[hr] = el; }}
                  type="button"
                  onClick={() => pickHour(hr)}
                  className={cn(
                    'w-full text-sm py-2 text-center transition-colors font-mono',
                    selectedHour === hr
                      ? 'bg-primary text-white font-bold'
                      : 'text-slate-700 hover:bg-primary/10'
                  )}
                >
                  {hr}
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="w-px bg-slate-100" />

          {/* Minutes */}
          <ScrollArea className="flex-1 h-52">
            <div className="py-1">
              {minutes.map(mn => (
                <button
                  key={mn}
                  ref={el => { minuteRefs.current[mn] = el; }}
                  type="button"
                  onClick={() => pickMinute(mn)}
                  className={cn(
                    'w-full text-sm py-2 text-center transition-colors font-mono',
                    selectedMin === mn
                      ? 'bg-primary text-white font-bold'
                      : 'text-slate-700 hover:bg-primary/10'
                  )}
                >
                  {mn}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────
interface ConvocacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga?: Vaga;
  convocacaoToEdit?: Convocacao;
  /** Pre-fill form when opening from Banco de Talentos */
  initialData?: Partial<Convocacao>;
}

export function ConvocacaoDialog({ open, onOpenChange, vaga, convocacaoToEdit, initialData }: ConvocacaoDialogProps) {
  const { addConvocacao, updateConvocacao, updateVagaAsync, updateBancoAsync, convocacoes } = useVagasStore();
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
    responsavel: currentUser?.nome_completo || 'Analista',
  });

  useEffect(() => {
    if (!open) return;

    if (convocacaoToEdit) {
      setFormData(convocacaoToEdit);
    } else {
      const base: Partial<Convocacao> = {
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
        responsavel: currentUser?.nome_completo || 'Analista',
      };

      if (initialData) {
        // From Banco de Talentos
        setFormData({ ...base, ...initialData });
      } else if (vaga) {
        const matchedBanco = useVagasStore.getState().getBancoByVaga(vaga.id);
        setFormData({
          ...base,
          vaga_id: vaga.id,
          cargo: vaga.cargo,
          unidade: vaga.unidade,
          secao: vaga.secao || '',
          requisicao: vaga.requisicao || vaga.numero_requisicao || '',
          edital_relacionado: matchedBanco?.numero_edital || vaga.numero_edital || '',
          banco_relacionado: matchedBanco?.id || vaga.banco_id || '',
        });
      } else {
        setFormData(base);
      }
    }
  }, [open, vaga, convocacaoToEdit, initialData, currentUser]);

  const horariosDisponiveis = useMemo(() => {
    if (!formData.data_convocacao || !formData.unidade) return [];
    return getHorariosDisponiveis(
      formData.data_convocacao,
      formData.unidade,
      convocacoes.filter(c => c.id !== convocacaoToEdit?.id)
    );
  }, [formData.data_convocacao, formData.unidade, convocacoes, convocacaoToEdit]);

  const baseName = useMemo(() => {
    if (!formData.unidade) return '';
    return getBaseForUnidade(formData.unidade);
  }, [formData.unidade]);

  const isGoiania = baseName === 'Goiânia';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_candidato || !formData.data_convocacao || !formData.horario) {
      toast.error('Preencha os campos obrigatórios (Nome, Data e Horário)');
      return;
    }

    if (convocacaoToEdit) {
      updateConvocacao(convocacaoToEdit.id, formData);
      toast.success('Convocação atualizada com sucesso');
    } else {
      const newConvocacao: Convocacao = {
        ...formData as Convocacao,
        id: `conv-${Date.now()}`,
        status: 'pendente',
      };
      addConvocacao(newConvocacao);
      toast.success('Convocação criada e enviada para o módulo diário');

      const bancoId = formData.banco_id || (formData as any).banco_relacionado;
      if (bancoId) {
        updateBancoAsync(bancoId, {
          status: 'Convocado(a)',
          status_calculado: 'Convocado(a)',
          data_convocacao: formData.data_convocacao,
          unidade_convocacao: formData.unidade || vaga?.unidade,
        });
      }

      if (vaga) {
        const fromBanco = !!(formData.banco_id || (formData as any).banco_relacionado);
        updateVagaAsync(vaga.id, {
          status: 'EM ANDAMENTO',
          etapa: 'Convocação' as any,
          status_processo: 'Em Andamento' as any,
          ...(fromBanco && { tratativa: 'Aproveitamento de Banco de Talentos' as any }),
        });
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
          {/* Informações da Vaga (contexto somente leitura) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Cargo</span>
              <p className="text-sm font-bold text-slate-700">{formData.cargo || '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Unidade Origem</span>
              <p className="text-sm font-bold text-slate-700">{formData.unidade || '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Requisição</span>
              <p className="text-sm font-bold text-slate-700">{formData.requisicao || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Esquerda: Agendamento */}
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
                    onChange={e => setFormData({ ...formData, data_convocacao: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horário da Convocação *</Label>

                  {isGoiania ? (
                    <>
                      <Select
                        value={formData.horario}
                        onValueChange={v => setFormData({ ...formData, horario: v })}
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
                            <SelectItem value="none" disabled>
                              Nenhum horário disponível (limite de 5 atingido)
                            </SelectItem>
                          )}
                          {convocacaoToEdit && !horariosDisponiveis.includes(convocacaoToEdit.horario) && (
                            <SelectItem value={convocacaoToEdit.horario}>
                              {convocacaoToEdit.horario} (Atual)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500 italic flex gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Base Goiânia: máximo 5 agendamentos por horário entre todas as unidades.
                      </p>
                    </>
                  ) : (
                    <>
                      <TimePicker
                        value={formData.horario || ''}
                        onChange={v => setFormData({ ...formData, horario: v })}
                      />
                      <p className="text-[10px] text-slate-500 italic flex gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Base {baseName || 'não identificada'}: selecione hora e minuto no relógio acima.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Unidade Alternativa */}
              <div className="space-y-2">
                <Label htmlFor="unidade_alternativa">Unidade Alternativa (Opcional)</Label>
                <Select
                  value={formData.unidade_alternativa || '__none__'}
                  onValueChange={v =>
                    setFormData({ ...formData, unidade_alternativa: v === '__none__' ? '' : v })
                  }
                >
                  <SelectTrigger className="bg-white border-slate-200" id="unidade_alternativa">
                    <SelectValue placeholder="Selecione uma unidade…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-slate-400">Nenhuma</span>
                    </SelectItem>
                    {UNIDADES_ALTERNATIVAS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  Use este campo se a convocação for para uma variação da unidade principal.
                </p>
              </div>
            </div>

            {/* Direita: Candidato e Vaga */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_candidato">Nome do Candidato *</Label>
                <Input
                  id="nome_candidato"
                  value={formData.nome_candidato}
                  onChange={e => setFormData({ ...formData, nome_candidato: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, secao: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classificacao">Classificação</Label>
                  <Input
                    id="classificacao"
                    type="number"
                    value={formData.classificacao}
                    onChange={e => setFormData({ ...formData, classificacao: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carga_horaria">Carga Horária</Label>
                  <Select
                    value={formData.carga_horaria || ''}
                    onValueChange={v => setFormData({ ...formData, carga_horaria: v })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20h/semana">20h/semana</SelectItem>
                      <SelectItem value="30h/semana">30h/semana</SelectItem>
                      <SelectItem value="40h/semana">40h/semana</SelectItem>
                      <SelectItem value="44h/semana">44h/semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário de Trabalho</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.horario_trabalho?.split(' às ')[0] || ''}
                      onValueChange={v => {
                        const fim = formData.horario_trabalho?.split(' às ')[1] || '';
                        setFormData({ ...formData, horario_trabalho: fim ? `${v} às ${fim}` : v });
                      }}
                    >
                      <SelectTrigger className="bg-white flex-1">
                        <SelectValue placeholder="Início" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 33 }, (_, i) => {
                          const h = Math.floor(i / 2) + 6;
                          const m = i % 2 === 0 ? '00' : '30';
                          const val = `${String(h).padStart(2, '0')}:${m}`;
                          return <SelectItem key={val} value={val}>{val}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-500 font-medium">às</span>
                    <Select
                      value={formData.horario_trabalho?.split(' às ')[1] || ''}
                      onValueChange={v => {
                        const inicio = formData.horario_trabalho?.split(' às ')[0] || '';
                        setFormData({ ...formData, horario_trabalho: inicio ? `${inicio} às ${v}` : `às ${v}` });
                      }}
                    >
                      <SelectTrigger className="bg-white flex-1">
                        <SelectValue placeholder="Fim" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 33 }, (_, i) => {
                          const h = Math.floor(i / 2) + 6;
                          const m = i % 2 === 0 ? '00' : '30';
                          const val = `${String(h).padStart(2, '0')}:${m}`;
                          return <SelectItem key={val} value={val}>{val}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edoc">Nº EDOC</Label>
                <Input
                  id="edoc"
                  value={formData.edoc || ''}
                  onChange={e => setFormData({ ...formData, edoc: e.target.value })}
                  placeholder="Nº do processo eletrônico"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_atendimento">Tipo de Atendimento</Label>
                <Select
                  value={formData.tipo_atendimento || 'presencial'}
                  onValueChange={v => setFormData({ ...formData, tipo_atendimento: v as any })}
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
                    onChange={e => setFormData({ ...formData, link_teams: e.target.value })}
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
              onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Detalhes relevantes sobre a vaga ou o candidato..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="px-8 font-bold">
              {convocacaoToEdit ? 'Salvar Alterações' : 'Confirmar e Criar Convocação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
