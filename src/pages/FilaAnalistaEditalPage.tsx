import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X,
  FileUp, CheckSquare, MessageSquare, Upload, FileDown, Rocket, Check, RotateCcw,
  Minus, Plus
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { HelpGuide } from '@/components/HelpGuide';
import { STATUS_EDITAL_COLORS, StatusEdital, Vaga, UNIDADES_GOIANIA } from '@/types/vaga';
import { formatDate, normalizeUnitName, calcDiasAberto, getCategoriaStatus } from '@/lib/vagaUtils';
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

export default function FilaAnalistaEditalPage() {
  const navigate = useNavigate();
  const { vagas, updateVagaAsync } = useVagasStore();
  const updateVaga = updateVagaAsync;
  const { currentUser, users } = useAdminStore();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');

  // Modal de Redação/Envio para Validação
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [obsEdital, setObsEdital] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [numeroEdital, setNumeroEdital] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [reachrUrl, setReachrUrl] = useState('');
  const [responsavelValidacao, setResponsavelValidacao] = useState<string>('');

  // Modal de Publicação / Cronograma
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
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
  const [unidadeTrabalho, setUnidadeTrabalho] = useState('');
  const [distribuicaoVagas, setDistribuicaoVagas] = useState<Record<string, number>>({});
  const [unidadesBanco, setUnidadesBanco] = useState<string[]>([]);
  const [isTalentBank, setIsTalentBank] = useState(false);

  const editalVagas = useMemo(() => {
    return vagas.filter(v => {
      const vUnitNormalized = normalizeUnitName(v.unidade);
      
      // Unit access restriction
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(vUnitNormalized)) {
          return false;
        }
      }

      // Regra: Mostrar vagas em redação, enviadas para validação ou aprovadas
      const showInThisFlow = [
        'encaminhado_edital', 
        'em_redacao', 
        'enviado_validacao', 
        'aprovado_administrativo',
        'publicado'
      ].includes(v.status_fluxo_edital || '');
      
      if (!showInThisFlow) return false;

      const searchTerm = search.toLowerCase();
      const matchSearch = !search || 
        v.cargo.toLowerCase().includes(searchTerm) || 
        (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm);
      
      const matchUnidade = filterUnidade === 'all' || vUnitNormalized === filterUnidade;

      return matchSearch && matchUnidade;
    });
  }, [vagas, currentUser, search, filterUnidade]);

  const devolvidos = useMemo(() => editalVagas.filter(v => v.status_fluxo_edital === 'em_redacao' && v.observacoes_validacao), [editalVagas]);

  const unidades = useMemo(() => Array.from(new Set(vagas.map(v => normalizeUnitName(v.unidade)))).filter(Boolean).sort(), [vagas]);

  // Analistas elegíveis para validação do edital
  const analistasValidacao = useMemo(() => {
    return (users || []).filter((u: any) => {
      const perfil = (u.perfil || '').toLowerCase();
      const status = (u.status || 'ativo').toLowerCase();
      return status === 'ativo' && (
        perfil.includes('analista') || perfil.includes('admin') || perfil.includes('gestor')
      );
    });
  }, [users]);

  const handleOpenEditModal = (vaga: Vaga) => {
    setSelectedVaga(vaga);
    setObsEdital(vaga.observacoes_edital || '');
    setNumeroEdital(vaga.numero_edital || '');
    setNumeroProcesso(vaga.numero_processo || '');
    setNomeArquivo(vaga.arquivo_edital || '');
    setReachrUrl((vaga as any).url_reachr || '');

    // Pré-preenche o responsável pela validação:
    // 1) usa o já atribuído se existir
    // 2) senão, sugere com base na região da unidade (Goiás+ES → Isaac, etc.)
    if (vaga.validado_por) {
      setResponsavelValidacao(vaga.validado_por);
    } else {
      const sugestao = sugerirResponsavelValidacao(vaga.unidade);
      const match = sugestao?.nome
        ? (users || []).find((u: any) =>
            (u.nome_completo || '').toLowerCase().includes(sugestao.nome.toLowerCase())
          )
        : null;
      setResponsavelValidacao(match?.id || '');
    }

    setIsEditModalOpen(true);
  };

  const handleSaveDraft = () => {
    if (!selectedVaga) return;

    updateVaga(selectedVaga.id, { 
      status_fluxo_edital: 'em_redacao',
      observacoes_edital: obsEdital,
      numero_edital: numeroEdital,
      numero_processo: numeroProcesso,
      arquivo_edital: nomeArquivo,
      url_reachr: reachrUrl,
    });

    toast.success('Rascunho do edital salvo com sucesso!');
  };

  const handleSendToValidation = () => {
    if (!selectedVaga) return;

    if (!nomeArquivo) {
      toast.error('É necessário carregar o arquivo Word do edital antes de enviar.');
      return;
    }

    if (!numeroEdital || !numeroProcesso) {
      toast.error('É necessário informar o número do edital e do processo.');
      return;
    }

    updateVaga(selectedVaga.id, { 
      status_fluxo_edital: 'enviado_validacao',
      status_validacao: 'pendente',
      observacoes_edital: obsEdital,
      numero_edital: numeroEdital,
      numero_processo: numeroProcesso,
      arquivo_edital: nomeArquivo,
      url_reachr: reachrUrl,
      historico: [...selectedVaga.historico, {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Edital redigido e enviado para validação administrativa. Edital: ${numeroEdital}`,
        usuario: currentUser?.nome_completo || 'Analista do Edital'
      }]
    });

    setIsEditModalOpen(false);
    toast.success('Edital enviado com sucesso para validação administrativa!');
  };

  const handleOpenPublishModal = (vaga: Vaga) => {
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
    setUnidadeTrabalho(vaga.unidade_trabalho || vaga.unidade || '');
    setDistribuicaoVagas(vaga.distribuicao_vagas || {});
    setUnidadesBanco(vaga.unidades_banco_talentos || []);
    setIsTalentBank(vaga.acompanhamento?.gerou_banco || false);
    setIsPublishModalOpen(true);
  };

  const handleFinalizePublication = () => {
    if (!selectedVaga) return;

    updateVaga(selectedVaga.id, {
      status_fluxo_edital: 'publicado',
      status: 'EM ANDAMENTO', 
      unidade_trabalho: unidadeTrabalho,
      distribuicao_vagas: distribuicaoVagas,
      unidades_banco_talentos: unidadesBanco,
      cronograma: {
        ...selectedVaga.cronograma,
        ...cronograma
      },
      acompanhamento: {
        ...selectedVaga.acompanhamento,
        gerou_banco: isTalentBank,
      },
      historico: [...selectedVaga.historico, {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Edital PUBLICADO. Unidade de trabalho definida: ${unidadeTrabalho}. ${isTalentBank ? 'Banco de talentos habilitado.' : ''}`,
        usuario: currentUser?.nome_completo || 'Analista do Edital'
      }]
    });

    setIsPublishModalOpen(false);
    toast.success('Edital publicado e cronograma salvo com sucesso!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNomeArquivo(e.target.files[0].name);
    }
  };

  const hasFilters = search !== '' || filterUnidade !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fila do Edital (Redação)"
        helpContent={<HelpGuide />}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aguardando Redação</p>
                <p className="text-2xl font-bold text-slate-800">{editalVagas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {devolvidos.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-md animate-pulse-slow">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse" />
          <div className="flex items-center gap-4 pl-3">
            <div className="bg-amber-100 p-3 rounded-full animate-bounce">
              <RotateCcw className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                ⚠️ {devolvidos.length} edital(is) devolvido(s) para ajuste!
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                A validação devolveu editais que precisam de correção. Verifique as observações e reenvie.
              </p>
            </div>
            <Badge className="bg-amber-500 text-white text-sm font-bold px-3 py-1 animate-pulse">
              {devolvidos.length}
            </Badge>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Vagas para Edital
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cargo ou REQ..." 
                className="pl-9 w-[250px] bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[180px] bg-white">
                <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                  <TableHead>Requisição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Obs. Unidade</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editalVagas.map((v) => (
                  <TableRow key={v.id} className="group">
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {v.requisicao || v.numero_requisicao}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{v.unidade}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{v.cargo}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-xs text-slate-500 truncate" title={v.observacoes_unidade}>
                        {v.observacoes_unidade || 'Sem observações'}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(v.data_recebimento!)}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.status_fluxo_edital === 'enviado_validacao' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-bold bg-purple-50 text-purple-600 border-purple-200">
                          Em Validação
                        </Badge>
                      ) : v.status_fluxo_edital === 'aprovado_administrativo' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-bold bg-green-50 text-green-600 border-green-200">
                          Aprovado
                        </Badge>
                      ) : v.status_fluxo_edital === 'publicado' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-bold bg-blue-600 text-white border-blue-700">
                          Publicado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${v.status_fluxo_edital === 'em_redacao' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {v.status_fluxo_edital === 'em_redacao' ? 'Em Redação' : 'Aguardando'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-primary" 
                          title={v.status_fluxo_edital === 'aprovado_administrativo' ? "Publicar Edital" : "Preparar Edital"} 
                          onClick={() => v.status_fluxo_edital === 'aprovado_administrativo' || v.status_fluxo_edital === 'publicado' ? handleOpenPublishModal(v) : handleOpenEditModal(v)}
                          disabled={v.status_fluxo_edital === 'enviado_validacao'}
                        >
                          {v.status_fluxo_edital === 'aprovado_administrativo' || v.status_fluxo_edital === 'publicado' ? <Rocket className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {editalVagas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-500 font-medium">Nenhuma vaga encaminhada para o edital.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              Preparar Edital
            </DialogTitle>
            <DialogDescription>
              Redija o edital, anexe o arquivo e envie para a validação administrativa.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVaga && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações Recebidas da Unidade</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Cargo</p>
                    <p className="text-sm font-bold text-slate-700">{selectedVaga.cargo}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Unidade</p>
                    <p className="text-sm font-bold text-slate-700">{selectedVaga.unidade}</p>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Observações da Unidade
                  </p>
                  <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                    {selectedVaga.observacoes_unidade || 'Nenhuma observação informada.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numEdital" className="text-sm font-semibold">Número do Edital</Label>
                  <Input 
                    id="numEdital" 
                    placeholder="Ex: 001/2024" 
                    value={numeroEdital}
                    onChange={(e) => setNumeroEdital(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numProcesso" className="text-sm font-semibold">Número do Processo</Label>
                  <Input 
                    id="numProcesso" 
                    placeholder="Ex: 2024.0001" 
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reachr" className="text-sm font-semibold flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-blue-600" /> Link da Vaga no Reachr
                </Label>
                <Input 
                  id="reachr" 
                  placeholder="https://www.reachr.com.br/vaga/..." 
                  value={reachrUrl}
                  onChange={(e) => setReachrUrl(e.target.value)}
                  className="bg-white border-slate-200"
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Opcional: Informe o link da vaga já publicada no portal Reachr.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Edital (Arquivo Word)</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="w-full relative overflow-hidden h-20 border-dashed" asChild>
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-1">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Clique para carregar o arquivo .doc ou .docx</span>
                      <input type="file" className="hidden" accept=".doc,.docx" onChange={handleFileChange} />
                    </label>
                  </Button>
                </div>
                {nomeArquivo && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-sm">
                    <FileDown className="h-4 w-4" />
                    <span className="font-medium truncate flex-1">{nomeArquivo}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-700 hover:text-blue-800" onClick={() => setNomeArquivo('')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="obsAnalista" className="text-sm font-semibold">Observações do Analista do Edital</Label>
                <Textarea 
                  id="obsAnalista" 
                  placeholder="Informações adicionais sobre o preparo do edital..."
                  className="min-h-[80px] resize-none"
                  value={obsEdital}
                  onChange={(e) => setObsEdital(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft}>
                Salvar Rascunho
              </Button>
              <Button onClick={handleSendToValidation} className="bg-primary hover:bg-primary/90">
                <Send className="h-4 w-4 mr-2" />
                Enviar p/ Validação
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-xl">
              <Rocket className="h-6 w-6" />
              Finalizar Publicação e Cronograma
            </DialogTitle>
            <DialogDescription>
              O edital foi aprovado! Agora preencha as datas oficiais para acompanhamento.
            </DialogDescription>
          </DialogHeader>

          {selectedVaga && (
            <div className="space-y-6 py-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-700">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-green-900 text-sm">Edital Aprovado</h4>
                  <p className="text-xs text-green-700 mt-0.5">Validado por: {selectedVaga.validado_por} em {formatDate(selectedVaga.data_validacao!)}</p>
                </div>
              </div>

              {/* Distribuição e Unidade de Trabalho (Item 4) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Distribuição e Ordem de Trabalho</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Unidade da vez (Trabalha a vaga agora)</Label>
                    <Select value={unidadeTrabalho} onValueChange={setUnidadeTrabalho}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a unidade..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectedVaga.unidade}>{selectedVaga.unidade} (Original)</SelectItem>
                        {UNIDADES_GOIANIA.filter(u => u !== selectedVaga.unidade).map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end pb-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isTalentBank" 
                        checked={isTalentBank} 
                        onCheckedChange={(checked) => setIsTalentBank(checked as boolean)} 
                      />
                      <Label htmlFor="isTalentBank" className="text-sm font-bold cursor-pointer">Haverá Banco de Talentos</Label>
                    </div>
                  </div>
                </div>

                {selectedVaga.numero_vagas && selectedVaga.numero_vagas > 1 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Distribuir Vagas por Unidade ({selectedVaga.numero_vagas} total)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {UNIDADES_GOIANIA.filter(u => u === selectedVaga.unidade || true).map(u => {
                        const count = distribuicaoVagas[u] || 0;
                        if (count === 0 && !UNIDADES_GOIANIA.includes(u)) return null;
                        return (
                          <div key={u} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                            <span className="text-[10px] font-medium text-slate-600 truncate mr-1">{u}</span>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => setDistribuicaoVagas({...distribuicaoVagas, [u]: Math.max(0, count - 1)})}
                              >
                                <Minus className="h-2 w-2" />
                              </Button>
                              <span className="text-xs font-bold w-4 text-center">{count}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => {
                                  const totalDist = Object.values(distribuicaoVagas).reduce((a, b) => a + b, 0);
                                  if (totalDist < (selectedVaga.numero_vagas || 0)) {
                                    setDistribuicaoVagas({...distribuicaoVagas, [u]: count + 1});
                                  } else {
                                    toast.error('Limite de vagas atingido.');
                                  }
                                }}
                              >
                                <Plus className="h-2 w-2" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isTalentBank && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Unidades que podem convocar do banco</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {UNIDADES_GOIANIA.map(u => (
                        <Badge 
                          key={u} 
                          variant={unidadesBanco.includes(u) ? "default" : "outline"}
                          className={`cursor-pointer text-[10px] ${unidadesBanco.includes(u) ? 'bg-primary' : 'bg-white'}`}
                          onClick={() => {
                            if (unidadesBanco.includes(u)) {
                              setUnidadesBanco(unidadesBanco.filter(item => item !== u));
                            } else {
                              setUnidadesBanco([...unidadesBanco, u]);
                            }
                          }}
                        >
                          {u}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Data de Publicação</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_publicacao_edital} 
                    onChange={(e) => setCronograma({...cronograma, data_publicacao_edital: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Início Inscrições</Label>
                    <Input 
                      type="date" 
                      value={cronograma.data_inicio_inscricao} 
                      onChange={(e) => setCronograma({...cronograma, data_inicio_inscricao: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Fim Inscrições</Label>
                    <Input 
                      type="date" 
                      value={cronograma.data_fim_inscricao} 
                      onChange={(e) => setCronograma({...cronograma, data_fim_inscricao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Data da Triagem</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_triagem} 
                    onChange={(e) => setCronograma({...cronograma, data_triagem: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Avaliação Específica Online</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_avaliacao_especifica_online} 
                    onChange={(e) => setCronograma({...cronograma, data_avaliacao_especifica_online: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Resultado Preliminar</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_resultado_preliminar_avaliacao_especifica} 
                    onChange={(e) => setCronograma({...cronograma, data_resultado_preliminar_avaliacao_especifica: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Prazo para Recurso</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_recurso_avaliacao_especifica} 
                    onChange={(e) => setCronograma({...cronograma, data_recurso_avaliacao_especifica: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Resultado do Recurso</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_resultado_recurso_avaliacao_especifica} 
                    onChange={(e) => setCronograma({...cronograma, data_resultado_recurso_avaliacao_especifica: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Resultado Final Avaliação</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_resultado_final_avaliacao_especifica} 
                    onChange={(e) => setCronograma({...cronograma, data_resultado_final_avaliacao_especifica: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Data da Entrevista</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_entrevistas} 
                    onChange={(e) => setCronograma({...cronograma, data_entrevistas: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Res. Final Processo Seletivo</Label>
                  <Input 
                    type="date" 
                    value={cronograma.data_resultado_final_seletivo} 
                    onChange={(e) => setCronograma({...cronograma, data_resultado_final_seletivo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleFinalizePublication} className="bg-primary hover:bg-primary/90">
              {selectedVaga?.status_fluxo_edital === 'publicado' ? 'Atualizar Cronograma' : 'Publicar Edital'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
