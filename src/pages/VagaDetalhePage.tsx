import { useParams, useNavigate } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate, getValidacaoColor, getEtapaColor, getStatusColor } from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS, STATUS_VAGA_LABELS, ETAPA_LABELS, StatusVaga, EtapaEdital, STATUS_EDITAL_COLORS, STATUS_LABELS } from '@/types/vaga';
import { ArrowLeft, Clock, User, MapPin, Hash, Calendar, CheckCircle2, XCircle, Minus, FileSpreadsheet, Info, Building2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { ConvocacaoDialog } from '@/components/ConvocacaoDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVaga, getEditalByVaga, getValidacaoByVaga, updateVaga, updateEdital, updateValidacao, addEdital, addValidacao, deleteVaga } = useVagasStore();
  const { currentUser, addAuditLog } = useAdminStore();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvocacaoDialogOpen, setIsConvocacaoDialogOpen] = useState(false);
  const [isCreateBancoDialogOpen, setIsCreateBancoDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isEditingIndicators, setIsEditingIndicators] = useState(false);
  const [indicators, setIndicators] = useState({
    total_inscritos: 0,
    aprovados_triagem: 0,
    convocados_entrevista: 0,
    aprovados_finais: 0
  });

  const vaga = getVaga(id!);
  
  useEffect(() => {
    if (vaga) {
      setIndicators({
        total_inscritos: vaga.total_inscritos || 0,
        aprovados_triagem: vaga.aprovados_triagem || 0,
        convocados_entrevista: vaga.convocados_entrevista || 0,
        aprovados_finais: vaga.aprovados_finais || 0
      });
    }
  }, [vaga?.id]);

  if (!vaga) return <div className="p-8 text-center text-muted-foreground">Vaga não encontrada.</div>;

  const edital = getEditalByVaga(vaga.id);
  const validacao = getValidacaoByVaga(vaga.id);
  const banco = useVagasStore.getState().getBancoByVaga(vaga.id);

  const canDelete = currentUser?.perfil === 'Admin' || currentUser?.pode_excluir_requisicoes;
  const canEdit = currentUser?.perfil === 'Admin' || currentUser?.perfil === 'Analista' || currentUser?.perfil === 'Gerência' || currentUser?.perfil === 'Coordenação' || currentUser?.perfil === 'Supervisão';
  const isAssistente = currentUser?.perfil === 'Assistente';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'encerrada' || newStatus === 'finalizada') {
      setPendingStatus(newStatus);
      setIsCreateBancoDialogOpen(true);
      return;
    }
    applyStatusChange(newStatus);
  };

  const applyStatusChange = (newStatus: string, createBanco = false) => {
    const oldStatus = vaga.status || vaga.status_geral;
    const updateData: Partial<any> = {
      status: newStatus as StatusVaga,
      historico: [...vaga.historico, { 
        id: `h-${Date.now()}`, 
        data: new Date().toISOString().split('T')[0], 
        descricao: `Status alterado para ${STATUS_LABELS[newStatus as StatusVaga]}`, 
        usuario: currentUser?.nome_completo || 'Analista' 
      }],
    };

    if (newStatus === 'encerrada' || newStatus === 'finalizada') {
      updateData.data_encerramento = new Date().toISOString().split('T')[0];
    }

    if (createBanco) {
      const bancoId = `b-${Date.now()}`;
      const novoBanco = {
        id: bancoId,
        unidade: vaga.unidade,
        cargo: vaga.cargo,
        secao: vaga.secao,
        numero_edital: vaga.numero_edital || 'ED-' + (vaga.requisicao || vaga.id),
        data_abertura_edital: new Date().toISOString().split('T')[0],
        data_validade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
        is_prorrogado: false,
        status: 'valido' as const,
        observacoes: `Banco criado a partir da vaga ${vaga.requisicao || vaga.id}`,
        numero_processo: vaga.numero_processo
      };
      useVagasStore.getState().addBanco(novoBanco);
      updateData.tem_banco_valido = true;
      updateData.banco_id = bancoId;
      toast.info('Banco de Talentos criado com sucesso');
    }

    updateVaga(vaga.id, updateData);
    
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@sistema.com',
      perfil: currentUser?.perfil || 'Sistema',
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString(),
      acao: 'Alteração de Status',
      modulo: 'Vagas',
      registro_afetado: vaga.requisicao || vaga.numero_requisicao || vaga.id,
      valor_anterior: oldStatus,
      valor_novo: newStatus
    });

    toast.success('Status atualizado');
    setPendingStatus(null);
  };

  const handleSaveIndicators = () => {
    updateVaga(vaga.id, indicators);
    setIsEditingIndicators(false);
    toast.success('Indicadores atualizados');
  };

  const handleDelete = () => {
    if (vaga && canDelete) {
// ... keep existing code

      deleteVaga(vaga.id);
      addAuditLog({
        usuario_nome: currentUser?.nome_completo || 'Sistema',
        usuario_email: currentUser?.email || 'sistema@sistema.com',
        perfil: currentUser?.perfil || 'Sistema',
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString(),
        acao: 'Excluir Requisição',
        modulo: 'Vagas',
        registro_afetado: vaga.requisicao || vaga.numero_requisicao || vaga.id,
      });
      toast.success('Requisição excluída com sucesso.');
      navigate('/vagas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{vaga.cargo}</h2>
              {vaga.reabertura_suspeita && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold">REABERTURA</Badge>}
            </div>
            <p className="text-sm text-slate-500 font-medium">{vaga.requisicao || vaga.numero_requisicao} · {vaga.unidade}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {vaga.status_edital && (
            <Badge className={`${STATUS_EDITAL_COLORS[vaga.status_edital as any]} font-bold text-xs px-3 py-1`}>
              {vaga.status_edital}
            </Badge>
          )}
          <StatusBadge status={vaga.status || vaga.status_geral || 'aberta'} />
          {canDelete && (
            <Button 
              variant="outline" 
              className="text-destructive border-destructive/20 hover:bg-destructive/5 gap-2"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: Calendar, label: 'Abertura', value: formatDate(vaga.data_abertura), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Clock, label: 'Dias Aberto', value: `${calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: FileSpreadsheet, label: 'Origem', value: vaga.origem_importacao || 'Manual', color: 'text-green-600', bg: 'bg-green-50' },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
              <div className={`${item.bg} p-2 rounded-lg`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-bold text-slate-700">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="dados" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Dados da Vaga</TabsTrigger>
          <TabsTrigger value="edital" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Edital e Fila</TabsTrigger>
          <TabsTrigger value="banco" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Banco de Talentos</TabsTrigger>
          <TabsTrigger value="convocacoes" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Convocações</TabsTrigger>
          <TabsTrigger value="validacao" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Validação</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Histórico</TabsTrigger>

        </TabsList>

        <TabsContent value="dados">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Unidade</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.unidade}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Seção</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.secao || 'Não informada'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Recebimento</label>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(vaga.data_recebimento!)}</p>

                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> Analista Resp.</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.analista_responsavel}</p>
                </div>
                {vaga.assistentes && vaga.assistentes.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> Assistentes</label>
                    <p className="text-sm font-semibold text-slate-700">{vaga.assistentes.join(', ')}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Banco Ativo?</label>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${banco ? 'text-green-600' : 'text-slate-500'}`}>
                      {banco ? `Sim (${banco.numero_edital})` : 'Não'}
                    </p>
                    {banco && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-200 text-green-700 bg-green-50">
                        {banco.status.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Edital</label>
                  <p className="text-sm font-bold text-primary">{vaga.numero_edital || 'Pendente'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Processo</label>
                  <p className="text-sm font-bold text-primary">{vaga.numero_processo || 'Pendente'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Requisição</label>
                  <p className="text-sm font-bold text-slate-700 font-mono">{vaga.requisicao || vaga.numero_requisicao}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Indicadores do Processo</h4>
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => isEditingIndicators ? handleSaveIndicators() : setIsEditingIndicators(true)}
                      className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider"
                    >
                      {isEditingIndicators ? 'Salvar Indicadores' : 'Editar Indicadores'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Inscritos</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.total_inscritos} onChange={(e) => setIndicators({ ...indicators, total_inscritos: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.total_inscritos || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Triagem</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.aprovados_triagem} onChange={(e) => setIndicators({ ...indicators, aprovados_triagem: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.aprovados_triagem || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Em Entrevista</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.convocados_entrevista} onChange={(e) => setIndicators({ ...indicators, convocados_entrevista: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.convocados_entrevista || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aprovados</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.aprovados_finais} onChange={(e) => setIndicators({ ...indicators, aprovados_finais: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-green-600">{vaga.aprovados_finais || 0}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Info className="h-4 w-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Informações Complementares</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Origem Importação</label>
                    <p className="text-sm font-medium text-slate-600">{vaga.origem_importacao || 'Lançamento Manual'}</p>
                    {vaga.data_importacao && <p className="text-[10px] text-slate-400">Importado em: {new Date(vaga.data_importacao).toLocaleDateString()}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lote de Importação</label>
                    <p className="text-sm font-mono text-slate-600">{vaga.lote_importacao || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status Atual</label>
                    <div className="mt-1">
                      <Select 
                        value={(vaga.status || vaga.status_geral) as string} 
                        onValueChange={handleStatusChange}
                        disabled={!canEdit && !isAssistente}
                      >
                        <SelectTrigger className={`h-9 bg-white border-slate-200 ${getStatusColor(vaga.status || (vaga.status_geral as any))}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b mb-1">Fluxo Inicial</div>
                          {['aberta', 'em_triagem', 'entrevista'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b my-1">Processo Seletivo</div>
                          {['publicado_edital', 'em_edital', 'realizar_convocacao'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b my-1">Documentação e Admissão</div>
                          {['documentacao', 'documentacao_ok', 'documentacao_pendente', 'casos_ok', 'admissao', 'admissao_enviada', 'admissao_efetivada'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b my-1">Especiais / Outros</div>
                          {['movimentacao_interna', 'vaga_lideranca', 'aguardando_unidade'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b my-1">Finalização</div>
                          {['suspensa', 'cancelada', 'finalizada', 'encerrada'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Observações Internas</label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 min-h-[100px] text-sm text-slate-600 whitespace-pre-wrap">
                  {vaga.observacoes_internas || vaga.observacoes || 'Nenhuma observação registrada.'}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Criado por: <span className="text-slate-500">Sistema</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Data Criação: <span className="text-slate-500">{formatDate(vaga.data_abertura)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Última alteração por: <span className="text-slate-500">{vaga.historico[vaga.historico.length - 1]?.usuario || 'Sistema'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Última atualização: <span className="text-slate-500">{formatDate(vaga.historico[vaga.historico.length - 1]?.data || vaga.data_abertura)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edital">
          <EditalTab vagaId={vaga.id} edital={edital} />
        </TabsContent>
        
        <TabsContent value="banco">
          <BancoTab vaga={vaga} onStartConvocacao={() => setIsConvocacaoDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="convocacoes">
          <ConvocacoesTab vagaId={vaga.id} onNewConvocacao={() => setIsConvocacaoDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="validacao">
          <ValidacaoTab vagaId={vaga.id} validacao={validacao} />
        </TabsContent>


        <TabsContent value="historico">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Linha do Tempo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-100">
                {vaga.historico.map((h, idx) => (
                  <div key={h.id} className="flex gap-4 items-start relative pl-8">
                    <div className={`absolute left-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-primary' : 'bg-slate-300'}`} />
                    <div className="flex-1 pb-4 border-b last:border-0 border-slate-50">
                      <p className="text-sm font-semibold text-slate-700">{h.descricao}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(h.data)}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {h.usuario}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConvocacaoDialog 
        open={isConvocacaoDialogOpen} 
        onOpenChange={setIsConvocacaoDialogOpen} 
        vaga={vaga} 
      />

      <AlertDialog open={isCreateBancoDialogOpen} onOpenChange={setIsCreateBancoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              Criar Banco de Talentos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A vaga está sendo encerrada. Deseja criar um novo Banco de Talentos a partir dos aprovados deste processo seletivo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { applyStatusChange(pendingStatus!); setIsCreateBancoDialogOpen(false); }}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { applyStatusChange(pendingStatus!, true); setIsCreateBancoDialogOpen(false); }}>Sim, criar banco</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir requisição?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do sistema e esta ação será auditada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditalTab({ vagaId, edital }: { vagaId: string; edital: any }) {
  const { updateEdital, addEdital } = useVagasStore();
  const [form, setForm] = useState(edital || {
    id: `e-${Date.now()}`, vaga_id: vagaId, numero_processo: '', numero_edital: '',
    data_abertura_edital: '', data_prova: '', data_entrevista: '', data_encerramento_edital: '',
    etapa_atual: 'inscricoes', total_inscritos: 0, aprovados_triagem: 0, convocados_entrevista: 0,
    aprovados_finais: 0, possui_banco_talentos: false, status_publicacao: 'pendente',
  });

  const save = () => {
    if (edital) {
      updateEdital(edital.id, form);
    } else {
      addEdital(form);
    }
    toast.success('Edital salvo!');
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Processo Administrativo</label>
            <Input value={form.numero_processo} onChange={(e) => setForm({ ...form, numero_processo: e.target.value })} className="bg-white border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Edital de Seleção</label>
            <Input value={form.numero_edital} onChange={(e) => setForm({ ...form, numero_edital: e.target.value })} className="bg-white border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Publicação</label>
            <Input type="date" value={form.data_abertura_edital} onChange={(e) => setForm({ ...form, data_abertura_edital: e.target.value })} className="bg-white border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Etapa Atual do Edital</label>
            <Select value={form.etapa_atual} onValueChange={(v) => setForm({ ...form, etapa_atual: v })}>
              <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ETAPA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Total Inscritos</label>
            <Input type="number" value={form.total_inscritos} onChange={(e) => setForm({ ...form, total_inscritos: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Aprovados Triagem</label>
            <Input type="number" value={form.aprovados_triagem} onChange={(e) => setForm({ ...form, aprovados_triagem: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Entrevistados</label>
            <Input type="number" value={form.convocados_entrevista} onChange={(e) => setForm({ ...form, convocados_entrevista: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Aprovados Finais</label>
            <Input type="number" value={form.aprovados_finais} onChange={(e) => setForm({ ...form, aprovados_finais: +e.target.value })} className="bg-white" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 px-8">Salvar Alterações</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidacaoTab({ vagaId, validacao }: { vagaId: string; validacao: any }) {
  const { updateValidacao, addValidacao } = useVagasStore();
  const [form, setForm] = useState(validacao || {
    id: `v-${Date.now()}`, vaga_id: vagaId,
    precisa_validacao: true,
    responsavel_validacao: '',
    tipo_validacao: '',
    observacao: '',
    etapa_finalizada: false,
    status_validacao: 'pendente',
  });

  const save = () => {
    if (validacao) {
      updateValidacao(validacao.id, form);
    } else {
      addValidacao(form);
    }
    toast.success('Validação salva!');
  };

  const getIcon = (val: boolean) => {
    if (val === true) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.precisa_validacao ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}
            onClick={() => setForm({ ...form, precisa_validacao: !form.precisa_validacao })}
          >
            <div>
              <p className="text-sm font-bold text-slate-700">Precisa de Validação?</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Requer aprovação de gestor</p>
            </div>
            {getIcon(form.precisa_validacao)}
          </div>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.etapa_finalizada ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}
            onClick={() => setForm({ ...form, etapa_finalizada: !form.etapa_finalizada })}
          >
            <div>
              <p className="text-sm font-bold text-slate-700">Etapa Finalizada?</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Conclusão do processo</p>
            </div>
            {getIcon(form.etapa_finalizada)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável pela Validação</label>
            <Input value={form.responsavel_validacao} onChange={(e) => setForm({ ...form, responsavel_validacao: e.target.value })} className="bg-white border-slate-200" placeholder="Nome do gestor ou analista..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Validação</label>
            <Input value={form.tipo_validacao} onChange={(e) => setForm({ ...form, tipo_validacao: e.target.value })} className="bg-white border-slate-200" placeholder="Ex: Técnica, Comportamental..." />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações e Parecer</label>
          <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="bg-white border-slate-200 min-h-[120px]" placeholder="Descreva os detalhes da validação..." />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 px-8">Salvar Validação</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BancoTab({ vaga, onStartConvocacao }: { vaga: any; onStartConvocacao: () => void }) {
  const { getBancoByVaga } = useVagasStore();
  const banco = getBancoByVaga(vaga.id);

  if (!banco) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <XCircle className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Sem Banco de Talentos</h3>
          <p className="text-sm text-slate-500 max-w-xs mt-1">Não foi encontrado um banco de talentos válido para este cargo e unidade.</p>
          <Button variant="outline" className="mt-6 gap-2">Consultar Outros Bancos</Button>
        </CardContent>
      </Card>
    );
  }

  const isValido = banco.status === 'valido' || banco.status === 'prorrogado';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isValido ? 'bg-green-50' : 'bg-red-50'}`}>
              <CheckCircle2 className={`h-6 w-6 ${isValido ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{banco.numero_edital}</h3>
              <p className="text-xs text-slate-500 font-medium">Validade: {formatDate(banco.nova_data_validade || banco.data_validade)}</p>
            </div>
          </div>
          <Badge className={`${isValido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-bold`}>
            {banco.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Data de Abertura</label>
            <p className="text-sm font-semibold text-slate-700">{formatDate(banco.data_abertura_edital)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Validade Original</label>
            <p className="text-sm font-semibold text-slate-700">{formatDate(banco.data_validade)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prorrogado?</label>
            <p className="text-sm font-semibold text-slate-700">{banco.is_prorrogado ? 'Sim' : 'Não'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Candidatos no Banco</label>
            <p className="text-sm font-bold text-primary">{banco.quantidade_banco || 'Não informado'}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Observações do Banco</label>
          <p className="text-sm text-slate-600">{banco.observacoes || 'Sem observações.'}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" className="text-xs font-bold uppercase tracking-wider">Ver Edital Completo</Button>
          <Button onClick={onStartConvocacao} className="text-xs font-bold uppercase tracking-wider bg-primary">Realizar Convocação</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConvocacoesTab({ vagaId, onNewConvocacao }: { vagaId: string; onNewConvocacao: () => void }) {
  const { getConvocacoesByVaga } = useVagasStore();
  const convocacoes = getConvocacoesByVaga(vagaId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Histórico de Convocações</h3>
        <Button onClick={onNewConvocacao} size="sm" className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Nova Convocação
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Candidato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center">Class.</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">E-doc</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocacoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{formatDate(c.data_convocacao)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{c.horario}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{c.nome_candidato}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{c.tipo_convocacao}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-600">{c.classificacao}º</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {c.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-primary font-bold">{c.edoc || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Ver Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
              {convocacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                    Nenhuma convocação realizada para esta vaga.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
