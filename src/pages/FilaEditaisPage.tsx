import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, Unlink, Link2, MapPin as MapPinIcon } from 'lucide-react';
import { HelpGuide } from '@/components/HelpGuide';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X,
  FileUp, CheckSquare, Undo2
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_EDITAL_COLORS, StatusEdital, Vaga } from '@/types/vaga';
import { formatDate, normalizeUnitName, calcDiasAberto, getCategoriaStatus, filterByRegionAndUnit, UNIDADES_POR_REGIAO, normStatus, getRegiaoAgrupamento, getRegiaoAgrupamentoLabel, getStatusFluxoLabel } from '@/lib/vagaUtils';
import { UNIDADES_GOIANIA } from '@/types/vaga';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ImportStagedDialog } from '@/components/import/ImportStagedDialog';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { PageSkeleton } from '@/components/PageSkeleton';


export default function FilaEditaisPage() {
  const navigate = useNavigate();
  const { vagas, updateVaga, updateVagaAsync, notificarMovimentacaoEdital, isInitialLoad, isLoadingVagas } = useVagasStore();
  const { currentUser } = useAdminStore();
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Grouping control
  const storageKey = `fila-editais-ungrouped:${currentUser?.id || 'anon'}`;
  const [ungrouped, setUngrouped] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setUngrouped(new Set(JSON.parse(raw)));
    } catch {}
  }, [storageKey]);

  const persistUngrouped = (next: Set<string>) => {
    setUngrouped(next);
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
  };

  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleUngroup = (cargoKey: string) => {
    const next = new Set(ungrouped);
    next.add(cargoKey);
    persistUngrouped(next);
    toast.success('Grupo desfeito. Requisições agora aparecem individualmente.');
  };

  // Modal de envio
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [cargoValidado, setCargoValidado] = useState(false);
  const [cargaValidada, setCargaValidada] = useState(false);
  const [salarioValidado, setSalarioValidado] = useState(false);
  const [obsUnidade, setObsUnidade] = useState('');

  // Modal de devolução para Controle de Vagas
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnTargets, setReturnTargets] = useState<Vaga[]>([]);
  const [returnMotivo, setReturnMotivo] = useState<string>('A pedido do analista da unidade');
  const [returnObs, setReturnObs] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const handleOpenReturnModal = (targets: Vaga[]) => {
    if (targets.length === 0) return;
    setReturnTargets(targets);
    setReturnMotivo('A pedido do analista da unidade');
    setReturnObs('');
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (returnObs.trim().length < 10) {
      toast.error('Informe uma observação com pelo menos 10 caracteres.');
      return;
    }
    if (returnTargets.length === 0) return;
    setReturnSubmitting(true);
    let count = 0;
    for (const vaga of returnTargets) {
      const statusRestaurado = (vaga.status_origem as any) || 'SEM STATUS';
      const ok = await updateVagaAsync(vaga.id, {
        status: statusRestaurado,
        status_geral: statusRestaurado,
        status_fluxo_edital: null,
        etapa: null,
        historico: [...(vaga.historico || []), {
          id: `h-${Date.now()}-${vaga.id}`,
          data: new Date().toISOString().split('T')[0],
          descricao: `Devolvida ao Controle de Vagas — Motivo: ${returnMotivo}. Observação: ${returnObs}`,
          usuario: currentUser?.nome_completo || 'Analista'
        }]
      } as any);
      if (ok) count++;
    }
    setReturnSubmitting(false);
    if (count > 0) {
      toast.success(`${count} vaga(s) devolvida(s) ao Controle de Vagas.`);
      setIsReturnModalOpen(false);
      setReturnTargets([]);
      setSelectedRows(new Set());
    } else {
      toast.error('Não foi possível devolver as vagas.');
    }
  };


  const pendingVagas = useMemo(() => {
    return vagas.filter(v => {
      const vUnitNormalized = normalizeUnitName(v.unidade);
      
      // Unit access restriction (Permissions)
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(vUnitNormalized)) {
          return false;
        }
      }

      // Regra: Fila de Editais - Somente status PUBLICAR EDITAL
      const normalizedS = normStatus(v.status || v.status_geral || '');
      if (normalizedS !== 'publicar edital') return false;

      const searchTerm = search.toLowerCase();
      const matchSearch = !search || 
        (v.cargo || '').toLowerCase().includes(searchTerm) || 
        (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm);
      
      const matchUnidade = filterUnidade === 'all' || vUnitNormalized === filterUnidade;

      return matchSearch && matchUnidade;
    });
  }, [vagas, currentUser, search, filterUnidade]);

  const groupedVagas = useMemo(() => {
    // Requirements: "Remover o agrupamento automático na Fila de Editais"
    // Vagas should arrive individually.
    return {
      groupedGoiania: [],
      otherVagas: pendingVagas,
    };
  }, [pendingVagas]);

  // Selected rows -> cargos eligible to regroup (only cargos currently in ungrouped set with 2+ selected of same cargo)
  const regroupableCargos = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedRows.forEach(id => {
      const v = pendingVagas.find(x => x.id === id);
      if (!v) return;
      const goiania = UNIDADES_GOIANIA.includes(normalizeUnitName(v.unidade));
      if (!goiania) return;
      const k = v.cargo.toUpperCase().trim();
      if (!ungrouped.has(k)) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.keys(counts).filter(k => counts[k] >= 2);
  }, [selectedRows, pendingVagas, ungrouped]);

  const handleRegroupSelected = () => {
    const next = new Set(ungrouped);
    regroupableCargos.forEach(c => next.delete(c));
    persistUngrouped(next);
    setSelectedRows(new Set());
    toast.success('Requisições reagrupadas.');
  };

  /** Vagas selecionadas (objetos completos) */
  const selectedVagas = useMemo(
    () => Array.from(selectedRows).map(id => pendingVagas.find(v => v.id === id)).filter(Boolean) as Vaga[],
    [selectedRows, pendingVagas],
  );

  /** Validação: para enviar agrupado, todas devem ser da MESMA REGIÃO de agrupamento.
   *  Goiânia (capital) e Vitória aceitam mix entre suas sub-unidades; demais cidades só agrupam consigo mesmas. */
  const sendGroupedValidation = useMemo(() => {
    if (selectedVagas.length < 2) return { ok: false, reason: '' };
    const regioes = new Set(selectedVagas.map(v => getRegiaoAgrupamento(v.unidade)));
    if (regioes.size > 1) {
      const labels = Array.from(regioes).map(getRegiaoAgrupamentoLabel).join(', ');
      return { ok: false, reason: `Cargos de regiões diferentes (${labels}) não podem ser agrupados no mesmo edital.` };
    }
    return { ok: true, reason: '' };
  }, [selectedVagas]);

  const regiaoSelecionada = useMemo(() => {
    if (selectedVagas.length === 0) return '';
    const regs = Array.from(new Set(selectedVagas.map(v => getRegiaoAgrupamento(v.unidade))));
    return regs.length === 1 ? getRegiaoAgrupamentoLabel(regs[0]) : '';
  }, [selectedVagas]);

  /** Envia múltiplas vagas agrupadas para a Redação como 1 edital único.
   *  Persiste o lote em sessionStorage; a página de Redação detecta e abre
   *  o modal de redação multi-cargo com as vagas mapeadas. */
  const [isBatchSendOpen, setIsBatchSendOpen] = useState(false);
  const [batchObs, setBatchObs] = useState('');
  const [batchValidacoes, setBatchValidacoes] = useState({ cargo: false, carga: false, salario: false });

  const handleOpenBatchSend = () => {
    if (!sendGroupedValidation.ok) {
      toast.error(sendGroupedValidation.reason || 'Não é possível agrupar essas vagas.');
      return;
    }
    setBatchObs('');
    setBatchValidacoes({ cargo: false, carga: false, salario: false });
    setIsBatchSendOpen(true);
  };

  const handleConfirmBatchSend = async () => {
    if (!batchValidacoes.cargo || !batchValidacoes.carga || !batchValidacoes.salario) {
      toast.error('Valide cargo, carga horária e salário antes de enviar.');
      return;
    }
    if (selectedVagas.length === 0) return;

    // 1. Persiste o lote ANTES de qualquer await — garante que está disponível ao navegar
    try {
      const batchPayload = {
        vagaIds: selectedVagas.map(v => v.id),
        unidade: selectedVagas[0].unidade,
        regiao: getRegiaoAgrupamento(selectedVagas[0].unidade),
        timestamp: Date.now(),
        obs: batchObs,
      };
      sessionStorage.setItem('grouped_vagas', JSON.stringify(batchPayload));
    } catch (e) {
      console.error('Erro ao salvar lote no storage:', e);
    }

    // 2. Fecha modal e navega imediatamente — atualizações de status seguem em background
    setIsBatchSendOpen(false);
    const totalCount = selectedVagas.length;
    const vagasParaAtualizar = [...selectedVagas];
    setSelectedRows(new Set());
    toast.success(`${totalCount} cargos encaminhados como edital agrupado para a Redação.`);
    navigate('/fila-analista-edital');

    // 3. Atualiza status em paralelo (sem bloquear UI)
    Promise.all(vagasParaAtualizar.map(vaga =>
      updateVagaAsync(vaga.id, {
        status: 'ACOMPANHAMENTO DE EDITAL',
        status_origem: vaga.status_origem || vaga.status,
        status_fluxo_edital: 'em_redacao',
        etapa: 'em_redacao',
        cargo_validado: true,
        carga_horaria_validada: true,
        salario_validado: true,
        observacoes_unidade: batchObs,
        historico: [...(vaga.historico || []), {
          id: `h-${Date.now()}-${vaga.id}`,
          data: new Date().toISOString().split('T')[0],
          descricao: `Vaga encaminhada para redação como parte de edital agrupado (${totalCount} cargos). Obs: ${batchObs || 'Sem observações'}`,
          usuario: currentUser?.nome_completo || 'Analista da Unidade'
        }]
      } as any).then(ok => {
        if (ok) notificarMovimentacaoEdital(vaga.id, 'em_redacao', batchObs ? `Obs: ${batchObs}` : '');
      })
    )).catch(err => console.error('Erro ao atualizar vagas em lote:', err));
  };

  const unidadesAgrupadas = useMemo(() => {
    const allUnidades = Array.from(new Set(vagas.map(v => normalizeUnitName(v.unidade)))).filter(Boolean);
    
    // Labels conforme solicitado
    const REGION_LABELS: Record<string, string> = {
      'Goiás e Espírito Santo': 'Goiás e Espírito Santo',
      'Amazonas': 'Amazonas',
      'Demais Unidades': 'Outras Unidades'
    };

    return Object.entries(UNIDADES_POR_REGIAO).map(([regiao, units]) => ({
      label: REGION_LABELS[regiao] || regiao,
      units: units.map(u => normalizeUnitName(u)).filter(u => allUnidades.includes(u)).sort()
    })).filter(r => r.units.length > 0);
  }, [vagas]);

  const handleOpenSendModal = (vaga: Vaga) => {
    setSelectedVaga(vaga);
    setCargoValidado(false);
    setCargaValidada(false);
    setSalarioValidado(false);
    setObsUnidade('');
    setIsSendModalOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!selectedVaga) return;

    if (!cargoValidado || !cargaValidada || !salarioValidado) {
      toast.error('É necessário validar cargo, carga horária e salário com a unidade antes de enviar.');
      return;
    }

    const ok = await updateVagaAsync(selectedVaga.id, {
      status: 'ACOMPANHAMENTO DE EDITAL',
      status_origem: selectedVaga.status_origem || selectedVaga.status,
      status_fluxo_edital: 'em_redacao',
      etapa: 'em_redacao',
      cargo_validado: true,
      carga_horaria_validada: true,
      salario_validado: true,
      observacoes_unidade: obsUnidade,
      historico: [...(selectedVaga.historico || []), {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Vaga encaminhada para redação e publicação do edital. Obs: ${obsUnidade || 'Sem observações'}`,
        usuario: currentUser?.nome_completo || 'Analista da Unidade'
      }]
    } as any);

    if (!ok) return;

    // Notify Administrativos, Analistas do Edital and the original requester
    notificarMovimentacaoEdital(selectedVaga.id, 'em_redacao', obsUnidade ? `Obs: ${obsUnidade}` : '');

    setIsSendModalOpen(false);
    toast.success('Vaga encaminhada com sucesso para a redação do edital!');
  };

  const hasFilters = search !== '' || filterUnidade !== 'all';

  if (isInitialLoad || (isLoadingVagas && vagas.length === 0)) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fila de Editais</h1>
          <p className="text-muted-foreground mt-1">Vagas aguardando redação e publicação de novo edital.</p>
          <div className="mt-2"><HelpGuide /></div>
        </div>
        {permissions.canImport() && (
          <div className="flex gap-2">
            <Button variant="default" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={() => setIsImportOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" /> Importar Excel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total na Fila</p>
                <p className="text-2xl font-bold text-foreground">{pendingVagas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aguardando Redação</p>
                <p className="text-2xl font-bold text-foreground">{pendingVagas.filter(v => !v.numero_edital).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(regroupableCargos.length > 0 || selectedRows.size >= 1) && (
        <div className="sticky top-2 z-30 bg-primary text-primary-foreground shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-2">
          <CheckSquare className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            <strong>{selectedRows.size}</strong> selecionada(s)
            {regiaoSelecionada && <span className="ml-2 opacity-80">• Região: <strong>{regiaoSelecionada}</strong></span>}
            {regroupableCargos.length > 0 && <span className="ml-2 opacity-80">• {regroupableCargos.length} elegível(is) p/ reagrupar</span>}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {regroupableCargos.length > 0 && (
              <Button size="sm" variant="secondary" className="h-8 font-semibold" onClick={handleRegroupSelected}>
                <Link2 className="h-4 w-4 mr-1" /> Reagrupar mesmo cargo
              </Button>
            )}
            {selectedRows.size >= 2 && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold"
                onClick={handleOpenBatchSend}
                disabled={!sendGroupedValidation.ok}
                title={!sendGroupedValidation.ok ? sendGroupedValidation.reason : 'Enviar todos selecionados como 1 edital agrupado'}
              >
                <Send className="h-4 w-4 mr-1" /> Enviar {selectedRows.size} agrupados
              </Button>
            )}
            {selectedRows.size >= 1 && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 bg-amber-500 hover:bg-amber-600 text-white border-0 font-semibold"
                onClick={() => handleOpenReturnModal(selectedVagas)}
                title="Devolver vagas selecionadas ao Controle de Vagas"
              >
                <Undo2 className="h-4 w-4 mr-1" /> Devolver ao Controle
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-primary-foreground hover:bg-white/10" onClick={() => setSelectedRows(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Vagas para Publicação
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/80" />
              <Input 
                placeholder="Buscar cargo ou REQ..." 
                className="pl-9 w-[250px] bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[200px] bg-white">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground/80" />
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {unidadesAgrupadas.map((grupo) => (
                  <SelectGroup key={grupo.label}>
                    <SelectLabel>{grupo.label}</SelectLabel>
                    {grupo.units.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterUnidade('all'); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Vagas</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead className="text-center">Dias Aberto</TableHead>
                  <TableHead className="text-center">Status Atual</TableHead>
                  <TableHead>Enviado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Vagas Agrupadas (Consolidadas) */}
                {/* Vagas rendered individually as requested */}

                {/* Demais Vagas (incluindo desagrupadas) */}
                {groupedVagas.otherVagas.map((v) => {
                  const goianiaCargo = UNIDADES_GOIANIA.includes(normalizeUnitName(v.unidade));
                  const cargoKey = v.cargo.toUpperCase().trim();
                  const isUngroupedFromConsolidated = goianiaCargo && ungrouped.has(cargoKey);
                  const isSelected = selectedRows.has(v.id);
                  return (
                    <TableRow key={v.id} className={`group ${isSelected ? 'bg-blue-50/40' : ''}`}>
                      <TableCell className="align-middle">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedRows(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(v.id); else next.delete(v.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary font-bold">
                        {v.requisicao || v.numero_requisicao}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground/80" />
                          <span className="font-medium text-slate-700">{v.unidade}</span>
                          {isUngroupedFromConsolidated && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">desagrupado</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{v.cargo}</TableCell>
                      <TableCell className="text-[11px] font-bold uppercase text-muted-foreground">{v.tipo_vaga}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{v.numero_vagas || v.quantidade}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(v.data_recebimento!)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {calcDiasAberto(v.data_recebimento || v.data_abertura)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 border-blue-200">
                          {v.status || v.status_geral || 'Sem Status'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {v.analista_responsavel || <span className="italic text-muted-foreground/80">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Redigir" onClick={() => navigate(`/vagas/${v.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Encaminhar para Publicação" onClick={() => handleOpenSendModal(v)}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Devolver ao Controle de Vagas" onClick={() => handleOpenReturnModal([v])}>
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pendingVagas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-muted-foreground font-medium">Nenhuma pendência encontrada na fila de editais.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      <Dialog open={isBatchSendOpen} onOpenChange={setIsBatchSendOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" />
              Enviar {selectedVagas.length} cargos agrupados p/ Redação
            </DialogTitle>
            <DialogDescription>
              Estes cargos serão enviados como UM ÚNICO edital. Na Redação você poderá inserir cronogramas independentes para cada cargo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">
                Região: <span className="text-slate-700">{regiaoSelecionada}</span>
                <span className="ml-3">Unidades: <span className="text-slate-700">{Array.from(new Set(selectedVagas.map(v => v.unidade))).join(', ')}</span></span>
              </p>
              <ul className="space-y-1 max-h-[180px] overflow-y-auto">
                {selectedVagas.map(v => (
                  <li key={v.id} className="text-xs flex justify-between gap-2 py-1 border-b border-border/40 last:border-b-0">
                    <span className="font-medium text-slate-700">{v.cargo}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">{v.requisicao || v.numero_requisicao}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Validações obrigatórias (aplicam-se a todos)</Label>
              {[
                { key: 'cargo' as const, label: 'Cargo validado com a unidade' },
                { key: 'carga' as const, label: 'Carga horária validada com a unidade' },
                { key: 'salario' as const, label: 'Salário validado com a unidade' },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center space-x-3 p-2 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setBatchValidacoes(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                >
                  <Checkbox checked={batchValidacoes[item.key]} onCheckedChange={(c) => setBatchValidacoes(prev => ({ ...prev, [item.key]: !!c }))} />
                  <Label className="text-sm cursor-pointer">{item.label}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Observações para a Redação</Label>
              <Textarea
                placeholder="Instruções comuns ao edital agrupado..."
                className="min-h-[80px] resize-none"
                value={batchObs}
                onChange={(e) => setBatchObs(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchSendOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmBatchSend} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar e enviar agrupado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportStagedDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="vagas" />

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" />
              Encaminhar para Redação do Edital
            </DialogTitle>
            <DialogDescription>
              Confirme as informações validadas com a unidade antes de encaminhar a vaga para a redação do edital.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVaga && (
            <div className="space-y-6 py-4">
              <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Unidade:</span>
                  <span className="font-bold text-slate-700">{selectedVaga.unidade}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Cargo:</span>
                  <span className="font-bold text-slate-700">{selectedVaga.cargo}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Validações Obrigatórias
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 rounded-md border border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setCargoValidado(!cargoValidado)}>
                    <Checkbox id="cargo" checked={cargoValidado} onCheckedChange={(checked) => setCargoValidado(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="cargo" className="text-sm font-medium cursor-pointer">Cargo validado com a unidade</Label>
                      <p className="text-xs text-muted-foreground">Confirmo que a nomenclatura do cargo está correta.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setCargaValidada(!cargaValidada)}>
                    <Checkbox id="carga" checked={cargaValidada} onCheckedChange={(checked) => setCargaValidada(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="carga" className="text-sm font-medium cursor-pointer">Carga horária validada com a unidade</Label>
                      <p className="text-xs text-muted-foreground">Confirmo que a jornada semanal está correta.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSalarioValidado(!salarioValidado)}>
                    <Checkbox id="salario" checked={salarioValidado} onCheckedChange={(checked) => setSalarioValidado(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="salario" className="text-sm font-medium cursor-pointer">Salário validado com a unidade</Label>
                      <p className="text-xs text-muted-foreground">Confirmo que a remuneração está atualizada.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs" className="text-sm font-semibold text-foreground">Observações para Redação/Publicação</Label>
                <Textarea 
                  id="obs" 
                  placeholder="Instruções sobre salário, carga horária, urgência ou perfil da vaga..."
                  className="min-h-[100px] resize-none"
                  value={obsUnidade}
                  onChange={(e) => setObsUnidade(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSend} className="bg-primary hover:bg-primary/90">
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Devolver vagas ao Controle de Vagas */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Undo2 className="h-5 w-5" />
              Devolver {returnTargets.length} vaga(s) ao Controle
            </DialogTitle>
            <DialogDescription>
              A(s) vaga(s) voltará(ão) para o Controle de Vagas com o status original. Informe o motivo e uma observação obrigatória.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 max-h-[160px] overflow-y-auto">
              <ul className="space-y-1">
                {returnTargets.map(v => (
                  <li key={v.id} className="text-xs flex justify-between gap-2 py-1 border-b border-border/40 last:border-b-0">
                    <span className="font-medium text-slate-700">{v.cargo} <span className="text-muted-foreground/80">— {v.unidade}</span></span>
                    <span className="text-muted-foreground font-mono text-[10px]">{v.requisicao || v.numero_requisicao}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Motivo</Label>
              <Select value={returnMotivo} onValueChange={setReturnMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A pedido do analista da unidade">A pedido do analista da unidade</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Observação <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Descreva o motivo da devolução (mínimo 10 caracteres)..."
                value={returnObs}
                onChange={(e) => setReturnObs(e.target.value)}
                className="min-h-[90px] resize-none"
              />
              <p className="text-[11px] text-muted-foreground">{returnObs.trim().length}/10 caracteres mínimos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)} disabled={returnSubmitting}>Cancelar</Button>
            <Button
              onClick={handleConfirmReturn}
              disabled={returnSubmitting || returnObs.trim().length < 10}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {returnSubmitting ? 'Devolvendo...' : 'Confirmar devolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
