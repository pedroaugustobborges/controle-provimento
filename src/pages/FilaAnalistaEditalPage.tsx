import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X,
  FileUp, CheckSquare, MessageSquare, Upload, FileDown, Rocket, Check, RotateCcw,
  Minus, Plus, ShieldCheck, Layers
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { HelpGuide } from '@/components/HelpGuide';
import { StatusEdital, Vaga, UNIDADES_GOIANIA } from '@/types/vaga';
import { formatDate, normalizeUnitName, calcDiasAberto, getCategoriaStatus, getStatusFluxoLabel } from '@/lib/vagaUtils';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { sugerirResponsavelValidacao } from '@/data/analistasAdministrativos';
import { validateDate } from '@/services/holidayService';
import { EntrevistaDateField, EntrevistaConfig, deriveEntrevistaConfig, primaryEntrevistaDate } from '@/components/EntrevistaDateField';
import { CronogramaImportDialog, CronogramaImportResult } from '@/components/CronogramaImportDialog';
import { parseCronogramaFromDocx, ParsedCronograma, CronogramaParseError } from '@/lib/editalCronogramaParser';

export default function FilaAnalistaEditalPage() {
  const navigate = useNavigate();
  const { vagas, updateVagaAsync, notificarMovimentacaoEdital } = useVagasStore();
  const updateVaga = updateVagaAsync;
  const { currentUser, users } = useAdminStore();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');

  // Modal de Redação/Envio para Validação
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [selectedBatchVagas, setSelectedBatchVagas] = useState<Vaga[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [obsEdital, setObsEdital] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [numeroEdital, setNumeroEdital] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [reachrUrl, setReachrUrl] = useState('');
  const [responsavelValidacao, setResponsavelValidacao] = useState<string>('');

  const [batchCronogramas, setBatchCronogramas] = useState<Record<string, any>>({});
  const [batchEntrevistaConfigs, setBatchEntrevistaConfigs] = useState<Record<string, EntrevistaConfig>>({});

  const [cronograma, setCronograma] = useState<any>({
    data_publicacao_edital: '',
    data_inicio_inscricao: '',
    data_fim_inscricao: '',
    data_triagem: '',
    data_avaliacao_especifica_online: '',
    data_resultado_preliminar_avaliacao_especifica: '',
    data_recurso_avaliacao_especifica: '',
    data_resultado_recurso_avaliacao_especifica: '',
    data_resultado_final_avaliacao_especifica: '',
    data_entrevistas: '',
    data_resultado_final_seletivo: ''
  });

  const [entrevistaConfig, setEntrevistaConfig] = useState<EntrevistaConfig>({ tipo: 'unica', datas: [''] });

  const [batchConsumed, setBatchConsumed] = useState(false);

  useEffect(() => {
    if (batchConsumed) return;
    const batchData = sessionStorage.getItem('grouped_vagas');
    if (!batchData) return;
    // Aguarda vagas carregarem antes de consumir
    if (vagas.length === 0) return;

    try {
      const parsed = JSON.parse(batchData);
      const { vagaIds, timestamp } = parsed;

      // Expira lotes antigos (> 5 min)
      if (timestamp && Date.now() - timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem('grouped_vagas');
        setBatchConsumed(true);
        return;
      }

      const batchVagas = vagas.filter(v => vagaIds.includes(v.id));

      if (batchVagas.length === 0) {
        // IDs ainda não materializados — aguardar próximo render, NÃO remover storage
        console.warn('[grouped_vagas] vagas ainda não disponíveis, aguardando...', vagaIds);
        return;
      }

      if (batchVagas.length < vagaIds.length) {
        console.warn('[grouped_vagas] algumas vagas não encontradas:',
          vagaIds.filter((id: string) => !batchVagas.find(v => v.id === id)));
      }

      setIsBatchMode(true);
      setSelectedBatchVagas(batchVagas);
      setActiveTab(batchVagas[0].id);
      setNumeroEdital(batchVagas[0].numero_edital || '');
      setNumeroProcesso(batchVagas[0].numero_processo || '');
      setObsEdital(batchVagas[0].observacoes_edital || '');

      const cronos: Record<string, any> = {};
      const configs: Record<string, EntrevistaConfig> = {};
      batchVagas.forEach(v => {
        cronos[v.id] = {
          data_publicacao_edital: v.cronograma?.data_publicacao_edital || new Date().toISOString().split('T')[0],
          data_inicio_inscricao: v.cronograma?.data_inicio_inscricao || '',
          data_fim_inscricao: v.cronograma?.data_fim_inscricao || '',
          data_triagem: v.cronograma?.data_triagem || '',
          data_avaliacao_especifica_online: v.cronograma?.data_avaliacao_especifica_online || '',
          data_resultado_preliminar_avaliacao_especifica: v.cronograma?.data_resultado_preliminar_avaliacao_especifica || '',
          data_recurso_avaliacao_especifica: v.cronograma?.data_recurso_avaliacao_especifica || '',
          data_resultado_recurso_avaliacao_especifica: v.cronograma?.data_resultado_recurso_avaliacao_especifica || '',
          data_resultado_final_avaliacao_especifica: v.cronograma?.data_resultado_final_avaliacao_especifica || '',
          data_entrevistas: v.cronograma?.data_entrevistas || '',
          data_resultado_final_seletivo: v.cronograma?.data_resultado_final_seletivo || ''
        };
        configs[v.id] = deriveEntrevistaConfig(
          v.cronograma?.data_entrevistas,
          (v.cronograma as any)?.entrevista_config
        );
      });

      setBatchCronogramas(cronos);
      setBatchEntrevistaConfigs(configs);
      setIsEditModalOpen(true);
      sessionStorage.removeItem('grouped_vagas');
      setBatchConsumed(true);
    } catch (e) {
      console.error('Erro ao processar lote de vagas:', e);
      sessionStorage.removeItem('grouped_vagas');
      setBatchConsumed(true);
    }
  }, [vagas, batchConsumed]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsedCronogramas, setParsedCronogramas] = useState<ParsedCronograma[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseErrorDetails, setParseErrorDetails] = useState<CronogramaParseError | null>(null);
  const [parsingOriginalFile, setParsingOriginalFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingFileName, setParsingFileName] = useState('');

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [unidadeTrabalho, setUnidadeTrabalho] = useState('');
  const [distribuicaoVagas, setDistribuicaoVagas] = useState<Record<string, number>>({});
  const [unidadesBanco, setUnidadesBanco] = useState<string[]>([]);
  const [isTalentBank, setIsTalentBank] = useState(false);

  const editalVagas = useMemo(() => {
    return vagas.filter(v => {
      const vUnitNormalized = normalizeUnitName(v.unidade);
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(vUnitNormalized)) return false;
      }
      const showInThisFlow = ['encaminhado_edital', 'em_redacao', 'enviado_validacao', 'aprovado_administrativo', 'publicado'].includes(v.status_fluxo_edital || '');
      if (!showInThisFlow) return false;
      const searchTerm = search.toLowerCase();
      const matchSearch = !search || v.cargo.toLowerCase().includes(searchTerm) || (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm);
      const matchUnidade = filterUnidade === 'all' || vUnitNormalized === filterUnidade;
      return matchSearch && matchUnidade;
    });
  }, [vagas, currentUser, search, filterUnidade]);

  const devolvidos = useMemo(() => editalVagas.filter(v => v.status_fluxo_edital === 'em_redacao' && v.observacoes_validacao), [editalVagas]);
  const unidades = useMemo(() => Array.from(new Set(vagas.map(v => normalizeUnitName(v.unidade)))).filter(Boolean).sort(), [vagas]);
  const analistasValidacao = useMemo(() => (users || []).filter((u: any) => u.status === 'ativo' && ((u.perfil || '').toLowerCase().includes('analista') || (u.perfil || '').toLowerCase().includes('admin') || (u.perfil || '').toLowerCase().includes('gestor'))), [users]);

  const handleOpenEditModal = (vaga: Vaga) => {
    setIsBatchMode(false);
    setSelectedVaga(vaga);
    setSelectedBatchVagas([vaga]);
    setObsEdital(vaga.observacoes_edital || '');
    setNumeroEdital(vaga.numero_edital || '');
    setNumeroProcesso(vaga.numero_processo || '');
    setNomeArquivo(vaga.arquivo_edital || '');
    setReachrUrl((vaga as any).url_reachr || '');
    const initialCronograma = {
      data_publicacao_edital: vaga.cronograma?.data_publicacao_edital || new Date().toISOString().split('T')[0],
      data_inicio_inscricao: vaga.cronograma?.data_inicio_inscricao || '',
      data_fim_inscricao: vaga.cronograma?.data_fim_inscricao || '',
      data_triagem: vaga.cronograma?.data_triagem || '',
      data_avaliacao_especifica_online: vaga.cronograma?.data_avaliacao_especifica_online || '',
      data_resultado_preliminar_avaliacao_especifica: vaga.cronograma?.data_resultado_preliminar_avaliacao_especifica || '',
      data_recurso_avaliacao_especifica: vaga.cronograma?.data_recurso_avaliacao_especifica || '',
      data_resultado_recurso_avaliacao_especifica: vaga.cronograma?.data_resultado_recurso_avaliacao_especifica || '',
      data_resultado_final_avaliacao_especifica: vaga.cronograma?.data_resultado_final_avaliacao_especifica || '',
      data_entrevistas: vaga.cronograma?.data_entrevistas || '',
      data_resultado_final_seletivo: vaga.cronograma?.data_resultado_final_seletivo || ''
    };
    setCronograma(initialCronograma);
    setBatchCronogramas({ [vaga.id]: initialCronograma });
    const initialConfig = deriveEntrevistaConfig(vaga.cronograma?.data_entrevistas, (vaga.cronograma as any)?.entrevista_config);
    setEntrevistaConfig(initialConfig);
    setBatchEntrevistaConfigs({ [vaga.id]: initialConfig });
    if (vaga.validado_por) {
      setResponsavelValidacao(vaga.validado_por);
    } else {
      const sugestao = sugerirResponsavelValidacao(vaga.unidade);
      const match = sugestao?.nome ? (users || []).find((u: any) => (u.nome_completo || '').toLowerCase().includes(sugestao.nome.toLowerCase())) : null;
      setResponsavelValidacao(match?.id || '');
    }
    setIsEditModalOpen(true);
  };

  const buildCronogramaPayload = (vagaId?: string) => {
    const currentCrono = isBatchMode && vagaId ? batchCronogramas[vagaId] : cronograma;
    const currentConfig = isBatchMode && vagaId ? batchEntrevistaConfigs[vagaId] : entrevistaConfig;
    const baseCrono = isBatchMode && vagaId ? selectedBatchVagas.find(v => v.id === vagaId)?.cronograma : selectedVaga?.cronograma;
    return {
      ...baseCrono,
      ...currentCrono,
      data_entrevistas: primaryEntrevistaDate(currentConfig) || currentCrono.data_entrevistas || '',
      entrevista_config: currentConfig,
    };
  };


  const handleApplyImport = (result: any) => {
    if (isBatchMode && result.porCargo) {
      // MODO MÚLTIPLO: result é CronogramaImportMultiResult
      const newCronos = { ...batchCronogramas };
      const newConfigs = { ...batchEntrevistaConfigs };
      
      Object.entries(result.porCargo).forEach(([vagaId, res]: [string, any]) => {
        newCronos[vagaId] = { ...newCronos[vagaId], ...res.values };
        if (res.entrevistaConfig) {
          newConfigs[vagaId] = res.entrevistaConfig;
        } else if (res.values.data_entrevistas) {
          newConfigs[vagaId] = { tipo: 'unica', datas: [res.values.data_entrevistas] };
        }
      });
      
      setBatchCronogramas(newCronos);
      setBatchEntrevistaConfigs(newConfigs);
      toast.success('Múltiplos cronogramas aplicados.');
    } else {
      // MODO ÚNICO: result é CronogramaImportResult
      const targetId = isBatchMode ? activeTab : selectedVaga?.id;
      if (!targetId) return;
      
      const res = result;
      if (isBatchMode) {
        setBatchCronogramas(prev => ({ 
          ...prev, 
          [targetId]: { ...prev[targetId], ...res.values } 
        }));
        if (res.entrevistaConfig) {
          setBatchEntrevistaConfigs(prev => ({ ...prev, [targetId]: res.entrevistaConfig }));
        }
      } else {
        setCronograma((prev: any) => ({ ...prev, ...res.values }));
        if (res.entrevistaConfig) setEntrevistaConfig(res.entrevistaConfig);
      }
      toast.success('Cronograma aplicado.');
    }
  };


  const handleSaveDraft = async () => {
    const vToUpdate = isBatchMode ? selectedBatchVagas : (selectedVaga ? [selectedVaga] : []);
    if (vToUpdate.length === 0) return;
    let count = 0;
    for (const v of vToUpdate) {
      const ok = await updateVaga(v.id, {
        status_fluxo_edital: 'em_redacao', etapa: 'em_redacao', observacoes_edital: obsEdital,
        numero_edital: numeroEdital, numero_processo: numeroProcesso, arquivo_edital: nomeArquivo,
        url_reachr: reachrUrl, cronograma: buildCronogramaPayload(v.id),
      } as any);
      if (ok) count++;
    }
    if (count > 0) {
      vToUpdate.forEach(v => notificarMovimentacaoEdital(v.id, 'em_redacao', 'Rascunho salvo.'));
      toast.success(`${count} rascunho(s) salvo(s).`);
    }
  };

  const handleSendToValidation = async () => {
    const vToUpdate = isBatchMode ? selectedBatchVagas : (selectedVaga ? [selectedVaga] : []);
    if (vToUpdate.length === 0) return;
    if (!nomeArquivo) return toast.error('Anexe o arquivo Word.');
    if (!numeroEdital || !numeroProcesso) return toast.error('Informe os números do edital/processo.');
    if (!responsavelValidacao) return toast.error('Selecione o validador.');

    for (const v of vToUpdate) {
      const currentCrono = isBatchMode ? batchCronogramas[v.id] : cronograma;
      const dates: Record<string, string> = {
        'Publicação': currentCrono.data_publicacao_edital, 'Inscrições': currentCrono.data_inicio_inscricao,
        'Triagem': currentCrono.data_triagem, 'Avaliação': currentCrono.data_avaliacao_especifica_online,
        'Resultado': currentCrono.data_resultado_final_seletivo,
      };
      for (const [name, val] of Object.entries(dates)) {
        if (val) {
          const res = await validateDate(val, v.unidade);
          if (!res.isValid) return toast.error(`[${v.cargo}] Data de ${name} ${res.message}.`);
        }
      }
    }

    const respUser = (users || []).find((u: any) => u.id === responsavelValidacao);
    const respNome = respUser?.nome_completo || 'Não atribuído';
    let count = 0;
    for (const v of vToUpdate) {
      const ok = await updateVaga(v.id, {
        status_fluxo_edital: 'enviado_validacao', etapa: 'enviado_validacao', status_validacao: 'pendente',
        observacoes_edital: obsEdital, numero_edital: numeroEdital, numero_processo: numeroProcesso,
        arquivo_edital: nomeArquivo, url_reachr: reachrUrl, validado_por: responsavelValidacao,
        cronograma: buildCronogramaPayload(v.id),
        historico: [...(v.historico || []), {
          id: `h-${Date.now()}`, data: new Date().toISOString().split('T')[0],
          descricao: `Enviado para validação. Edital: ${numeroEdital}. Validador: ${respNome}.`,
          usuario: currentUser?.nome_completo || 'Analista'
        }]
      } as any);
      if (ok) {
        count++;
        notificarMovimentacaoEdital(v.id, 'enviado_validacao', `Responsável: ${respNome}.`);
      }
    }
    if (count > 0) {
      setIsEditModalOpen(false);
      toast.success(`${count} cargo(s) enviado(s) para validação.`);
    }
  };

  const handleOpenPublishModal = (vaga: Vaga) => {
    setIsBatchMode(false);
    setSelectedVaga(vaga);
    setCronograma({
      data_publicacao_edital: vaga.cronograma?.data_publicacao_edital || new Date().toISOString().split('T')[0],
      data_inicio_inscricao: vaga.cronograma?.data_inicio_inscricao || '',
      data_fim_inscricao: vaga.cronograma?.data_fim_inscricao || '',
      data_triagem: vaga.cronograma?.data_triagem || '',
      data_avaliacao_especifica_online: vaga.cronograma?.data_avaliacao_especifica_online || '',
      data_resultado_preliminar_avaliacao_especifica: vaga.cronograma?.data_resultado_preliminar_avaliacao_especifica || '',
      data_recurso_avaliacao_especifica: vaga.cronograma?.data_recurso_avaliacao_especifica || '',
      data_resultado_recurso_avaliacao_especifica: vaga.cronograma?.data_resultado_recurso_avaliacao_especifica || '',
      data_resultado_final_avaliacao_especifica: vaga.cronograma?.data_resultado_final_avaliacao_especifica || '',
      data_entrevistas: vaga.cronograma?.data_entrevistas || '',
      data_resultado_final_seletivo: vaga.cronograma?.data_resultado_final_seletivo || ''
    });
    setEntrevistaConfig(deriveEntrevistaConfig(vaga.cronograma?.data_entrevistas, (vaga.cronograma as any)?.entrevista_config));
    setUnidadeTrabalho(vaga.unidade_trabalho || vaga.unidade || '');
    setDistribuicaoVagas(vaga.distribuicao_vagas || {});
    setUnidadesBanco(vaga.unidades_banco_talentos || []);
    setIsTalentBank(vaga.acompanhamento?.gerou_banco || false);
    setIsPublishModalOpen(true);
  };

  const handleFinalizePublication = async () => {
    if (!selectedVaga) return;
    const ok = await updateVaga(selectedVaga.id, {
      status_fluxo_edital: 'publicado', etapa: 'publicado', status: 'EM ANDAMENTO',
      unidade_trabalho: unidadeTrabalho, distribuicao_vagas: distribuicaoVagas,
      unidades_banco_talentos: unidadesBanco, cronograma: buildCronogramaPayload(),
      acompanhamento: { ...selectedVaga.acompanhamento, gerou_banco: isTalentBank },
      historico: [...(selectedVaga.historico || []), {
        id: `h-${Date.now()}`, data: new Date().toISOString().split('T')[0],
        descricao: `Edital PUBLICADO. Unidade: ${unidadeTrabalho}.`,
        usuario: currentUser?.nome_completo || 'Analista'
      }]
    } as any);
    if (ok) {
      notificarMovimentacaoEdital(selectedVaga.id, 'publicado', `Unidade: ${unidadeTrabalho}.`);
      setIsPublishModalOpen(false);
      toast.success('Edital publicado.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    e.target.value = '';
    setIsImportOpen(true);
    setParsing(true);
    setParsingFileName(file.name);
    setParsingOriginalFile(file);
    const result = await parseCronogramaFromDocx(file);
    setParsing(false);
    if (!result.ok) {
      setParseError(result.errorMessage || 'Erro no Word.');
      return;
    }
    setParsedCronogramas(result.cronogramas);
  };

  const renderCronogramaFields = (vagaId?: string) => {
    const currentCrono = isBatchMode && vagaId ? batchCronogramas[vagaId] : cronograma;
    const currentConfig = isBatchMode && vagaId ? batchEntrevistaConfigs[vagaId] : entrevistaConfig;
    const setCrono = (v: any) => isBatchMode && vagaId ? setBatchCronogramas(p => ({ ...p, [vagaId]: v })) : setCronograma(v);
    const setConfig = (v: EntrevistaConfig) => isBatchMode && vagaId ? setBatchEntrevistaConfigs(p => ({ ...p, [vagaId]: v })) : setEntrevistaConfig(v);

    return (
      <div className="space-y-4 p-4 rounded-xl border border-amber-200 bg-amber-50/30">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-amber-600" />
          <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Cronograma</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Publicação</Label><Input type="date" value={currentCrono.data_publicacao_edital} onChange={e => setCrono({ ...currentCrono, data_publicacao_edital: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Início Insc.</Label><Input type="date" value={currentCrono.data_inicio_inscricao} onChange={e => setCrono({ ...currentCrono, data_inicio_inscricao: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Fim Insc.</Label><Input type="date" value={currentCrono.data_fim_inscricao} onChange={e => setCrono({ ...currentCrono, data_fim_inscricao: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Triagem</Label><Input type="date" value={currentCrono.data_triagem} onChange={e => setCrono({ ...currentCrono, data_triagem: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Avaliação</Label><Input type="date" value={currentCrono.data_avaliacao_especifica_online} onChange={e => setCrono({ ...currentCrono, data_avaliacao_especifica_online: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-[11px] font-bold text-slate-500 uppercase">Resultado</Label><Input type="date" value={currentCrono.data_resultado_final_seletivo} onChange={e => setCrono({ ...currentCrono, data_resultado_final_seletivo: e.target.value })} /></div>
          <EntrevistaDateField value={currentConfig} onChange={setConfig} />
        </div>
      </div>
    );
  };

  const hasFilters = search !== '' || filterUnidade !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader title="Fila do Edital (Redação)" helpContent={<HelpGuide />} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-blue-600" /><div><p className="text-xs font-bold text-blue-600 uppercase">Aguardando Redação</p><p className="text-2xl font-bold text-slate-800">{editalVagas.length}</p></div></div></CardContent></Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2"><ListFilter className="h-5 w-5 text-primary" />Vagas para Edital</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Buscar..." className="w-[200px]" value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filterUnidade} onValueChange={setFilterUnidade}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Unidade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Requisição</TableHead><TableHead>Unidade</TableHead><TableHead>Cargo</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {editalVagas.map(v => (
                <TableRow key={v.id} className="group">
                  <TableCell className="font-mono text-xs font-bold">{v.requisicao || v.numero_requisicao}</TableCell>
                  <TableCell>{v.unidade}</TableCell>
                  <TableCell className="font-semibold">{v.cargo}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{getStatusFluxoLabel(v.status_fluxo_edital)}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => v.status_fluxo_edital === 'aprovado_administrativo' ? handleOpenPublishModal(v) : handleOpenEditModal(v)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preparar Edital</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            {(isBatchMode ? selectedBatchVagas.length > 0 : selectedVaga) && (
              <>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{isBatchMode ? `Lote (${selectedBatchVagas.length})` : 'Info Unidade'}</h4>
                  {isBatchMode ? <div className="flex flex-wrap gap-1">{selectedBatchVagas.map(v => <Badge key={v.id} variant="outline">{v.cargo}</Badge>)}</div> : <p className="font-bold">{selectedVaga?.cargo}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Número Edital</Label><Input value={numeroEdital} onChange={e => setNumeroEdital(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Número Processo</Label><Input value={numeroProcesso} onChange={e => setNumeroProcesso(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Link Reachr</Label><Input value={reachrUrl} onChange={e => setReachrUrl(e.target.value)} /></div>
                <div className="space-y-2"><Label>Arquivo Word</Label><Input type="file" onChange={handleFileChange} />{nomeArquivo && <Badge className="mt-2">{nomeArquivo}</Badge>}</div>
                {isBatchMode ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">{selectedBatchVagas.map(v => <TabsTrigger key={v.id} value={v.id} className="text-xs">{v.cargo}</TabsTrigger>)}</TabsList>
                    {selectedBatchVagas.map(v => <TabsContent key={v.id} value={v.id}>{renderCronogramaFields(v.id)}</TabsContent>)}
                  </Tabs>
                ) : renderCronogramaFields()}
                <div className="space-y-2"><Label>Validador</Label><Select value={responsavelValidacao} onValueChange={setResponsavelValidacao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{analistasValidacao.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.nome_completo}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Observações</Label><Textarea value={obsEdital} onChange={e => setObsEdital(e.target.value)} /></div>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button><Button onClick={handleSaveDraft}>Salvar</Button><Button onClick={handleSendToValidation}>Enviar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Publicar Edital</DialogTitle></DialogHeader>
          {selectedVaga && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Unidade Trabalho</Label><Input value={unidadeTrabalho} onChange={e => setUnidadeTrabalho(e.target.value)} /></div>
                <div className="flex items-center space-x-2 pt-6"><Checkbox checked={isTalentBank} onCheckedChange={c => setIsTalentBank(c as boolean)} /><Label>Banco Talentos</Label></div>
              </div>
              {renderCronogramaFields()}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>Cancelar</Button><Button onClick={handleFinalizePublication}>Publicar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <CronogramaImportDialog
        open={isImportOpen} onOpenChange={setIsImportOpen}
        cronogramas={parsedCronogramas} errorMessage={parseError} errorDetails={parseErrorDetails}
        originalFile={parsingOriginalFile} loading={parsing} fileName={parsingFileName}
        onApply={handleApplyImport} onApplyMulti={handleApplyImport}
        cargosAlvo={isBatchMode ? selectedBatchVagas.map(v => ({ id: v.id, cargo: v.cargo })) : undefined}
      />
    </div>
  );
}
