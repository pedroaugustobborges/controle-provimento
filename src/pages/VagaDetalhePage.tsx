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
import { TIPO_VAGA_LABELS, STATUS_VAGA_LABELS, ETAPA_LABELS, StatusVaga, EtapaEdital, STATUS_EDITAL_COLORS, STATUS_LABELS, Vaga, Convocacao, Edital, VagaCronograma, TODAS_AS_ETAPAS } from '@/types/vaga';
import { 
  ArrowLeft, Clock, User, MapPin, Hash, Calendar, CheckCircle2, XCircle, Minus, 
  FileSpreadsheet, Info, Building2, Plus, Trash2, AlertCircle, Activity, Check, 
  Save, Users, Search as SearchIcon, Zap, UserCheck, CheckCircle, Send, Search,
  AlertTriangle, ArrowRightCircle, ExternalLink, Edit
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { ConvocacaoDialog } from '@/components/ConvocacaoDialog';
import { AddVagaDialog } from '@/components/AddVagaDialog';
import { usePermissions } from '@/hooks/usePermissions';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVaga, getEditalByVaga, getValidacaoByVaga, updateVaga, updateEdital, updateValidacao, addEdital, addValidacao, deleteVaga, getBancoByVaga, addBanco, addTarefa, addAlerta, convocacoes, addConvocacao } = useVagasStore();
  const { currentUser, addAuditLog } = useAdminStore();
  const permissions = usePermissions();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvocacaoDialogOpen, setIsConvocacaoDialogOpen] = useState(false);
  const [isCreateBancoDialogOpen, setIsCreateBancoDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isEditingIndicators, setIsEditingIndicators] = useState(false);
  const [isEditVagaOpen, setIsEditVagaOpen] = useState(false);
  const [isQuickConvocacaoOpen, setIsQuickConvocacaoOpen] = useState(false);
  const [matchedBanco, setMatchedBanco] = useState<any>(null);
  
  const [indicators, setIndicators] = useState({
    total_inscritos: 0,
    aprovados_triagem: 0,
    convocados_entrevista: 0,
    aprovados_finais: 0
  });

  const vaga = getVaga(id!);
  
  const isAtrasada = useMemo(() => {
    if (!vaga) return false;
    const status = (vaga.status || vaga.status_geral) as string;
    if (['encerrada', 'finalizada', 'cancelada', 'admissao_efetivada'].includes(status)) return false;
    const lastHist = vaga.historico?.[vaga.historico.length - 1];
    const baseDate = lastHist?.data || vaga.data_recebimento || vaga.data_abertura;
    return calcDiasAberto(baseDate) > 10;
  }, [vaga]);

  const vagaConvocacoes = useMemo(() => 
    convocacoes.filter(c => c.vaga_id === vaga?.id)
  , [vaga?.id, convocacoes]);

  const hasAceite = vagaConvocacoes.some(c => c.status === 'aceite');
  const hasRecusa = vagaConvocacoes.some(c => ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status));
  const isConcluido = ['encerrada', 'finalizada', 'admissao_efetivada'].includes(vaga?.status || vaga?.status_geral || '');
  
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
  const banco = getBancoByVaga(vaga.id);

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
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    
    const updateData: Partial<any> = {
      status: newStatus as StatusVaga,
      historico: [...vaga.historico, { 
        id: `h-${Date.now()}`, 
        data: today, 
        descricao: `Status alterado para ${STATUS_LABELS[newStatus as StatusVaga]}`, 
        usuario: currentUser?.nome_completo || 'Analista' 
      }],
    };

    if (newStatus === 'encerrada' || newStatus === 'finalizada') {
      updateData.data_encerramento = today;
    }

    if (createBanco) {
      const bancoId = `b-${Date.now()}`;
      const novoBanco = {
        id: bancoId,
        unidade: vaga.unidade,
        cargo: vaga.cargo,
        secao: vaga.secao,
        numero_edital: vaga.numero_edital || 'ED-' + (vaga.requisicao || vaga.id),
        data_abertura_edital: today,
        data_validade: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
        is_prorrogado: false,
        status: 'CADASTRO RESERVA' as const,
        observacoes: `Banco criado a partir da vaga ${vaga.requisicao || vaga.id}`,
        numero_processo: vaga.numero_processo,
        quantidade_banco: vaga.acompanhamento?.quantidade_banco || indicators.aprovados_finais || 0
      };
      
      addBanco(novoBanco);
      updateData.tem_banco_valido = true;
      updateData.banco_id = bancoId;

      // Section 8.4: Create task and alert for assistant
      const tarefaId = `t-${Date.now()}`;
      addTarefa({
        id: tarefaId,
        titulo: `Complementar dados do banco: ${vaga.cargo}`,
        descricao: `Complementar dados do banco gerado para a vaga ${vaga.requisicao}. Conferir quantidade e finalizar inclusão no cadastro reserva.`,
        status: 'pendente',
        prioridade: 'media',
        data_criacao: today,
        atribuido_a: 'Assistente',
        relacionado_a: { tipo: 'vaga', id: vaga.id }
      });

      addAlerta({
        id: `a-${Date.now()}`,
        titulo: 'Novo Banco Gerado',
        mensagem: `Foi gerado um banco para a vaga ${vaga.cargo} (${vaga.requisicao}). Uma tarefa foi atribuída para complementação dos dados.`,
        tipo: 'informativo',
        status: 'nao_lido',
        data_criacao: today,
        destinatario: 'Assistente',
        link: `/vagas/${vaga.id}`
      });

      toast.info('Banco de Talentos criado e tarefas atribuídas à assistência');
    }

    updateVaga(vaga.id, updateData);
    
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@sistema.com',
      perfil: currentUser?.perfil || 'Sistema',
      data: today,
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

  const handleQuickConvocacao = () => {
    const bancoFound = getBancoByVaga(vaga.id);
    if (bancoFound) {
      setMatchedBanco(bancoFound);
      setIsQuickConvocacaoOpen(true);
    } else {
      toast.error(`Banco não encontrado para a vaga ${vaga.cargo}, unidade ${vaga.unidade}`, {
        description: 'É necessário ter um edital vigente ou cadastro reserva para realizar convocações.',
        action: {
          label: 'Criar Edital',
          onClick: () => handlePublicarEdital()
        }
      });
    }
  };

  const confirmQuickConvocacao = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Register convocacao
    const novaConvocacao: Convocacao = {
      id: `c-${Date.now()}`,
      vaga_id: vaga.id,
      banco_relacionado: matchedBanco.id,
      data_convocacao: today,
      horario: '08:00',
      nome_candidato: `Pendente (Banco: ${matchedBanco.numero_edital})`,
      classificacao: 1,
      tipo_convocacao: 'Telefone/E-mail',
      cargo: vaga.cargo,
      unidade: vaga.unidade,
      requisicao: vaga.requisicao || vaga.id,
      status: 'pendente' as const,
      responsavel: currentUser?.nome_completo || 'Analista',
      observacoes: 'Convocação iniciada via Ação Rápida'
    };
    
    addConvocacao(novaConvocacao);

    // 2. Update vaga status
    const updateData = {
      status: 'convocacao' as StatusVaga,
      historico: [...vaga.historico, { 
        id: `h-${Date.now()}`, 
        data: today, 
        descricao: `Convocação iniciada via Ação Rápida. Banco vinculado: ${matchedBanco.numero_edital}`, 
        usuario: currentUser?.nome_completo || 'Analista' 
      }],
      tem_banco_valido: true,
      banco_id: matchedBanco.id
    };
    
    updateVaga(vaga.id, updateData);

    // 3. Add audit log
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@sistema.com',
      perfil: currentUser?.perfil || 'Sistema',
      data: today,
      hora: new Date().toLocaleTimeString(),
      acao: 'Realizar Convocação (Ação Rápida)',
      modulo: 'Vagas',
      registro_afetado: vaga.requisicao || vaga.id,
      valor_novo: 'convocacao'
    });

    toast.success('Convocação iniciada com sucesso!');
    setIsQuickConvocacaoOpen(false);
    
    // 4. Redirect to daily convocations tab
    setTimeout(() => {
      navigate('/convocacoes?tab=diaria');
    }, 1500);
  };

  const handlePublicarEdital = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const updateData = {
      status: 'PUBLICAR EDITAL' as StatusVaga,
      status_edital: 'Fila de Publicação' as any,
      historico: [...vaga.historico, { 
        id: `h-${Date.now()}`, 
        data: today, 
        descricao: 'Encaminhado para publicação de edital via Ação Rápida', 
        usuario: currentUser?.nome_completo || 'Analista' 
      }],
    };

    updateVaga(vaga.id, updateData);
    
    // Add to editais store if not exists
    if (!edital) {
      addEdital({
        id: `e-${Date.now()}`,
        vaga_id: vaga.id,
        numero_processo: vaga.numero_processo || '',
        numero_edital: vaga.numero_edital || '',
        data_abertura_edital: today,
        etapa_atual: 'inscricoes',
        total_inscritos: 0,
        aprovados_triagem: 0,
        convocados_entrevista: 0,
        aprovados_finais: 0,
        possui_banco_talentos: false,
        status_publicacao: 'pendente'
      });
    }

    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@sistema.com',
      perfil: currentUser?.perfil || 'Sistema',
      data: today,
      hora: new Date().toLocaleTimeString(),
      acao: 'Enviar para Fila de Editais (Ação Rápida)',
      modulo: 'Vagas',
      registro_afetado: vaga.requisicao || vaga.id,
      valor_novo: 'publicar_novo_edital'
    });

    toast.success('Vaga encaminhada para Fila de Editais');
    
    setTimeout(() => {
      navigate('/fila-editais');
    }, 1500);
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
            <p className="text-sm text-slate-500 font-medium">
              {vaga.requisicao || vaga.numero_requisicao} · {vaga.unidade}
              {vaga.trace_key && <span className="ml-2 text-[11px] text-slate-400 font-mono opacity-60">ID Rastro: {vaga.trace_key}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {isAtrasada && <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse font-bold px-3 py-1 uppercase text-[11px] tracking-wider"><AlertCircle className="h-3 w-3 mr-1" /> Etapa em Atraso</Badge>}
            {hasAceite && <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[11px] uppercase">Convocação Aceita</Badge>}
            {hasRecusa && <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[11px] uppercase">Convocação Recusada</Badge>}
            {vaga.tem_banco_valido && <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[11px] uppercase">Banco Gerado</Badge>}
            {vaga.status === 'publicar_novo_edital' && <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[11px] uppercase">Necessidade de Novo Edital</Badge>}
            {isConcluido && <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[11px] uppercase">Processo Concluído</Badge>}
            
            {vaga.status_edital && (
              <Badge className={`${STATUS_EDITAL_COLORS[vaga.status_edital as any] || 'bg-slate-100'} font-bold text-xs px-3 py-1`}>
                {vaga.status_edital}
              </Badge>
            )}
            <StatusBadge status={vaga.status || vaga.status_geral || 'aberta'} />
          </div>
          {canEdit && (
            <Button 
              variant="outline" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-2 font-bold"
              onClick={() => setIsEditVagaOpen(true)}
            >
              <Edit className="h-4 w-4" /> Editar Registro
            </Button>
          )}
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Abertura', value: formatDate(vaga.data_abertura), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Clock, label: 'Dias Aberto', value: `${calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: FileSpreadsheet, label: 'Origem', value: vaga.origem_importacao || 'Manual', color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Building2, label: 'Qtd. Vagas', value: vaga.numero_vagas || vaga.quantidade || 0, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
              <div className={`${item.bg} p-2 rounded-lg`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-bold text-slate-700">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          <h3 className="font-bold text-slate-800">Ações Operacionais Rápidas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={handleQuickConvocacao}
            className="h-auto py-4 px-6 justify-between border-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 bg-white text-primary group transition-all"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Realizar convocação</p>
                <p className="text-xs text-slate-500 font-medium">Usar banco de talentos vinculado para esta vaga</p>
              </div>
            </div>
            <ArrowRightCircle className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Button>

          <Button 
            onClick={handlePublicarEdital}
            className="h-auto py-4 px-6 justify-between border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 bg-white text-rose-600 group transition-all"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-2 rounded-lg group-hover:bg-rose-200 transition-colors">
                <Send className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Enviar para Fila de Editais</p>
                <p className="text-xs text-slate-500 font-medium">Encaminhar para fila de novos editais/publicações</p>
              </div>
            </div>
            <ArrowRightCircle className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="dados" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Dados da Vaga</TabsTrigger>
          <TabsTrigger value="edital" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Edital e Fila</TabsTrigger>
          <TabsTrigger value="acompanhamento" className="data-[state=active]:bg-white data-[state=active]:text-primary font-bold px-6">Acompanhamento</TabsTrigger>
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
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Unidade</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.unidade}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Seção</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.secao || 'Não informada'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Recebimento</label>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(vaga.data_recebimento!)}</p>

                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> Analista Resp.</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.analista_responsavel}</p>
                </div>
                {vaga.assistentes && vaga.assistentes.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> Assistentes</label>
                    <p className="text-sm font-semibold text-slate-700">{vaga.assistentes.join(', ')}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Banco Ativo?</label>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${banco ? 'text-green-600' : 'text-slate-500'}`}>
                      {banco ? `Sim (${banco.numero_edital})` : 'Não'}
                    </p>
                    {banco && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-200 text-green-700 bg-green-50">
                        {String(banco.status || 'SEM STATUS').toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Edital</label>
                  <p className="text-sm font-bold text-primary">{vaga.numero_edital || 'Pendente'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Processo</label>
                  <p className="text-sm font-bold text-primary">{vaga.numero_processo || 'Pendente'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Nº Requisição</label>
                  <p className="text-sm font-bold text-slate-700 font-mono">{vaga.requisicao || vaga.numero_requisicao}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Indicadores do Processo</h4>
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => isEditingIndicators ? handleSaveIndicators() : setIsEditingIndicators(true)}
                      className="h-7 px-2 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {isEditingIndicators ? 'Salvar Indicadores' : 'Editar Indicadores'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Inscritos</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.total_inscritos} onChange={(e) => setIndicators({ ...indicators, total_inscritos: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.total_inscritos || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Triagem</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.aprovados_triagem} onChange={(e) => setIndicators({ ...indicators, aprovados_triagem: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.aprovados_triagem || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Em Entrevista</label>
                    {isEditingIndicators ? (
                      <Input type="number" value={indicators.convocados_entrevista} onChange={(e) => setIndicators({ ...indicators, convocados_entrevista: +e.target.value })} className="h-8 bg-white" />
                    ) : (
                      <p className="text-xl font-bold text-slate-800">{vaga.convocados_entrevista || 0}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Aprovados</label>
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
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informações Complementares</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Origem Importação</label>
                    <p className="text-sm font-medium text-slate-600">{vaga.origem_importacao || 'Lançamento Manual'}</p>
                    {vaga.data_importacao && <p className="text-[11px] text-slate-400">Importado em: {new Date(vaga.data_importacao).toLocaleDateString()}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Lote de Importação</label>
                    <p className="text-sm font-mono text-slate-600">{vaga.lote_importacao || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Status Atual</label>
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
                          <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b mb-1">Fluxo Inicial</div>
                          {['aberta', 'em_triagem', 'entrevista'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b my-1">Processo Seletivo</div>
                          {['publicado_edital', 'em_edital', 'realizar_convocacao'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b my-1">Documentação e Admissão</div>
                          {['documentacao', 'documentacao_ok', 'documentacao_pendente', 'casos_ok', 'admissao', 'admissao_enviada', 'admissao_efetivada'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b my-1">Especiais / Outros</div>
                          {['movimentacao_interna', 'vaga_lideranca', 'aguardando_unidade'].map(k => (
                            <SelectItem key={k} value={k} className="focus:bg-slate-50">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(k as any)} border border-current opacity-60`} />
                              {STATUS_LABELS[k as StatusVaga]}
                            </SelectItem>
                          ))}
                          
                          <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b my-1">Finalização</div>
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
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Observações Internas</label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 min-h-[100px] text-sm text-slate-600 whitespace-pre-wrap">
                  {vaga.observacoes_internas || vaga.observacoes || 'Nenhuma observação registrada.'}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
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
        
        <TabsContent value="acompanhamento">
          <AcompanhamentoTab vaga={vaga} onEditVaga={() => setIsEditVagaOpen(true)} />
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
            <CardHeader className="pb-2 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Linha do Tempo</CardTitle>
              <div className="flex gap-2">
                <Badge variant={vaga.origem === 'manual' ? 'default' : 'outline'} >
                  {vaga.origem === 'manual' ? 'Origem Manual' : 'Origem Importada'}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  Criado em: {formatDate(vaga.data_criacao || vaga.data_abertura)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-100">
                {vaga.historico.slice().reverse().map((h, idx) => (
                  <div key={h.id} className="flex gap-4 items-start relative pl-8">
                    <div className={`absolute left-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-300'}`} />
                    <div className="flex-1 pb-4 border-b last:border-0 border-slate-50">
                      <p className="text-sm font-semibold text-slate-700">{h.descricao}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
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

      <Dialog open={isQuickConvocacaoOpen} onOpenChange={setIsQuickConvocacaoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserCheck className="h-5 w-5" />
              Confirmar Convocação Operacional
            </DialogTitle>
            <DialogDescription>
              O sistema identificou um banco de talentos compatível para esta vaga.
            </DialogDescription>
          </DialogHeader>
          
          {matchedBanco && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Banco Identificado</p>
                  <p className="font-bold text-slate-700">{matchedBanco.numero_edital}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[11px] uppercase">
                  {matchedBanco.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cargo do Banco</p>
                  <p className="text-xs font-semibold text-slate-600 truncate">{matchedBanco.cargo}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Validade</p>
                  <p className="text-xs font-semibold text-slate-600">{formatDate(matchedBanco.data_validade)}</p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unidade Origem</p>
                <p className="text-xs font-semibold text-slate-600">{matchedBanco.unidade}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 leading-relaxed">
                Ao confirmar, o status da vaga será alterado para <span className="font-bold">Convocações</span> e uma nova convocação pendente será registrada no sistema.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsQuickConvocacaoOpen(false)}>Cancelar</Button>
            <Button onClick={confirmQuickConvocacao} className="gap-2 bg-primary">
              <CheckCircle className="h-4 w-4" /> Iniciar Convocação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddVagaDialog 
        open={isEditVagaOpen} 
        onOpenChange={setIsEditVagaOpen} 
        vaga={vaga}
      />
    </div>
  );
}

// TODAS_AS_ETAPAS is now imported from @/types/vaga

const CRONOGRAMA_KEYS: Record<EtapaEdital, keyof VagaCronograma> = {
  validacao_edital: 'data_validacao_edital',
  inscricoes: 'data_inscricao',
  triagem: 'data_triagem',
  resultado_da_triagem: 'data_resultado_triagem',
  avaliacao_especifica_online: 'data_avaliacao_especifica_online',
  resultado_preliminar_avaliacao_especifica_online: 'data_resultado_preliminar_avaliacao_especifica',
  recurso_avaliacao_especifica_online: 'data_recurso_avaliacao_especifica',
  resultado_recurso_avaliacao_especifica_online: 'data_resultado_recurso_avaliacao_especifica',
  resultado_final_avaliacao_especifica_online: 'data_resultado_final_avaliacao_especifica',
  envio_certificados_titulos: 'data_envio_certificados_titulos',
  declaracao_experiencia: 'data_declaracao_experiencia',
  analise_curricular_preliminar: 'data_analise_curricular_preliminar',
  recurso_analise_curricular: 'data_recurso_analise_curricular',
  resultado_recurso_analise_curricular: 'data_resultado_recurso_analise_curricular',
  analise_curricular_final: 'data_analise_curricular_final',
  entrevistas: 'data_entrevistas',
  resultado_final: 'data_resultado_final',
  convocacao_do_edital: 'data_convocacao',
  encerramento: 'data_encerramento_processo',
  banco_gerado: 'data_encerramento_processo',
  sem_exito: 'data_encerramento_processo',
  aguardar_anuencia: 'data_encerramento_processo',
  publicar_novo_edital: 'data_encerramento_processo',
};

function AcompanhamentoTab({ vaga, onEditVaga }: { vaga: Vaga, onEditVaga: () => void }) {
  const { updateVaga } = useVagasStore();
  const [form, setForm] = useState<any>(vaga.acompanhamento || {
    etapa_atual: 'inscricoes',
    total_inscritos: 0,
    aprovados_triagem: 0,
    aprovados_avaliacao_especifica: 0,
    convocados_entrevista: 0,
    aprovados_finais: 0,
    gerou_banco: false,
    quantidade_banco: 0,
    situacao_etapa: 'pendente',
    observacoes_etapa: '',
    etapas_habilitadas: ['validacao_edital', 'inscricoes', 'triagem', 'resultado_da_triagem', 'entrevistas', 'resultado_final']
  });

  const [cronograma, setCronograma] = useState<any>(vaga.cronograma || {});

  const autoUpdateEtapa = useMemo(() => {
    if (!form.historico_etapas || form.historico_etapas.length === 0) return form.etapa_atual;
    
    const habilitadas = form.etapas_habilitadas || [];
    const sortedHabilitadas = TODAS_AS_ETAPAS.filter(e => habilitadas.includes(e));
    
    // Find the last completed stage in the sequence
    let lastCompletedIndex = -1;
    for (let i = 0; i < sortedHabilitadas.length; i++) {
      const etapa = sortedHabilitadas[i];
      const status = form.historico_etapas.find((h: any) => h.etapa === etapa);
      if (status?.concluida) {
        lastCompletedIndex = i;
      } else {
        break; // Sequence broken
      }
    }
    
    // The current stage is the one after the last completed one
    if (lastCompletedIndex + 1 < sortedHabilitadas.length) {
      return sortedHabilitadas[lastCompletedIndex + 1];
    }
    
    return sortedHabilitadas[sortedHabilitadas.length - 1];
  }, [form.historico_etapas, form.etapas_habilitadas]);

  useEffect(() => {
    if (autoUpdateEtapa !== form.etapa_atual) {
      setForm(prev => ({ ...prev, etapa_atual: autoUpdateEtapa }));
    }
  }, [autoUpdateEtapa]);

  const { currentUser } = useAdminStore();

  const toggleEtapa = (etapa: EtapaEdital) => {
    const habilitadas = form.etapas_habilitadas || [];
    if (habilitadas.includes(etapa)) {
      setForm({ ...form, etapas_habilitadas: habilitadas.filter(e => e !== etapa) });
    } else {
      setForm({ ...form, etapas_habilitadas: [...habilitadas, etapa] });
    }
  };

  const markStageAsCompleted = (etapa: EtapaEdital, dataReal: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();
    
    // Check if on time (before 2pm on the scheduled date)
    const scheduledDate = cronograma[CRONOGRAMA_KEYS[etapa]];
    let noPrazo = true;
    if (scheduledDate === today) {
      const currentHour = new Date().getHours();
      if (currentHour >= 14) {
        noPrazo = false;
      }
    } else if (scheduledDate && scheduledDate < today) {
       noPrazo = false;
    }

    const newHistory = [...(form.historico_etapas || [])];
    const existingIndex = newHistory.findIndex((h: any) => h.etapa === etapa);
    
    const entry = {
      etapa,
      concluida: true,
      data_conclusao: dataReal,
      usuario_conclusao: currentUser?.nome_completo || 'Analista',
      timestamp_conclusao: `${today} ${now}`,
      no_prazo: noPrazo
    };

    if (existingIndex >= 0) {
      newHistory[existingIndex] = entry;
    } else {
      newHistory.push(entry);
    }

    setForm({ ...form, historico_etapas: newHistory });
    toast.success(`${ETAPA_LABELS[etapa]} marcada como concluída!`);
  };

  const applyTemplate = (type: 'comum' | 'especifico') => {
    if (type === 'comum') {
      setForm({ ...form, etapas_habilitadas: ['validacao_edital', 'inscricoes', 'triagem', 'resultado_da_triagem', 'avaliacao_especifica_online', 'resultado_final_avaliacao_especifica_online', 'entrevistas', 'resultado_final'] });
    } else {
      setForm({ ...form, etapas_habilitadas: ['validacao_edital', 'inscricoes', 'triagem', 'envio_certificados_titulos', 'declaracao_experiencia', 'analise_curricular_preliminar', 'recurso_analise_curricular', 'analise_curricular_final', 'entrevistas', 'resultado_final'] });
    }
  };

  const save = () => {
    updateVaga(vaga.id, { 
      acompanhamento: form,
      cronograma: cronograma,
      total_inscritos: form.total_inscritos,
      aprovados_triagem: form.aprovados_triagem,
      aprovados_finais: form.aprovados_finais,
      convocados_entrevista: form.convocados_entrevista,
      // Update overall status to help with monitoring
      status_edital: form.etapa_atual === 'encerramento' ? 'Encerrada' : 'Em andamento'
    });
    toast.success('Acompanhamento operacional atualizado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Painel Operacional do Edital
                </CardTitle>
                <Badge className={`${getEtapaColor(form.etapa_atual)} font-bold px-3 py-1`}>
                  Etapa: {ETAPA_LABELS[form.etapa_atual as EtapaEdital] || form.etapa_atual}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Acompanhamento de Etapas</h4>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Marque a conclusão para atualizar o fluxo</div>
                </div>
                
                <div className="space-y-3">
                  {TODAS_AS_ETAPAS.filter(e => (form.etapas_habilitadas || []).includes(e)).map((e) => {
                    const status = (form.historico_etapas || []).find((h: any) => h.etapa === e);
                    const isCompleted = status?.concluida;
                    const isCurrent = form.etapa_atual === e;
                    const scheduledDate = cronograma[CRONOGRAMA_KEYS[e]];
                    
                    return (
                      <div 
                        key={e} 
                        className={`p-4 rounded-xl border transition-all ${
                          isCompleted ? 'bg-green-50/30 border-green-100' : 
                          isCurrent ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 
                          'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isCompleted ? 'bg-green-500 text-white' : 
                              isCurrent ? 'bg-primary text-white animate-pulse' : 
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {isCompleted ? <Check className="h-4 w-4" /> : TODAS_AS_ETAPAS.indexOf(e) + 1}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${isCompleted ? 'text-green-700' : isCurrent ? 'text-primary' : 'text-slate-700'}`}>
                                {ETAPA_LABELS[e]}
                              </p>
                              {scheduledDate && (
                                <p className="text-[11px] text-slate-400 font-medium uppercase">
                                  Previsto: {formatDate(scheduledDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <div className="text-right">
                                <p className="text-[11px] font-bold text-green-600 uppercase">Concluído em: {status.data_conclusao}</p>
                                <p className="text-[9px] text-slate-400">Por: {status.usuario_conclusao}</p>
                                {status.no_prazo === false && (
                                  <Badge className="bg-red-50 text-red-600 border-red-100 text-[8px] h-4 mt-0.5">ATRASO</Badge>
                                )}
                              </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                          "h-8 w-40 justify-start text-left font-semibold border-slate-200 hover:bg-slate-50 transition-all rounded-lg shadow-sm text-[11px]",
                                        )}
                                      >
                                        <Calendar className="mr-2 h-3 w-3 text-primary" />
                                        {document.getElementById(`date-${e}`) ? (document.getElementById(`date-${e}`) as HTMLInputElement).value : format(new Date(), "dd/MM/yyyy")}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                      <CalendarComponent
                                        mode="single"
                                        onSelect={(date) => {
                                          if (date) {
                                            const isoDate = date.toISOString().split('T')[0];
                                            const input = document.getElementById(`date-${e}`) as HTMLInputElement;
                                            if (input) input.value = isoDate;
                                            // Trigger a re-render if needed, but here we just use the ref/id
                                          }
                                        }}
                                        initialFocus
                                        locale={ptBR}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <input type="hidden" id={`date-${e}`} defaultValue={new Date().toISOString().split('T')[0]} />
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-[11px] font-bold uppercase bg-primary hover:bg-primary/90 rounded-lg shadow-sm"
                                    onClick={() => {
                                      const dateInput = document.getElementById(`date-${e}`) as HTMLInputElement;
                                      markStageAsCompleted(e, dateInput.value || new Date().toISOString().split('T')[0]);
                                    }}
                                  >
                                    Marcar Concluída
                                  </Button>
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Indicadores de Funil</h4>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Preenchimento operacional</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: 'Inscritos', key: 'total_inscritos', icon: Users, color: 'text-blue-600' },
                    { label: 'Triagem OK', key: 'aprovados_triagem', icon: SearchIcon, color: 'text-purple-600' },
                    { label: 'Avaliação OK', key: 'aprovados_avaliacao_especifica', icon: Zap, color: 'text-cyan-600' },
                    { label: 'Entrevista', key: 'convocados_entrevista', icon: UserCheck, color: 'text-amber-600' },
                    { label: 'Aprovados', key: 'aprovados_finais', icon: CheckCircle, color: 'text-green-600' },
                  ].map((item) => (
                    <div key={item.key} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                        <label className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</label>
                      </div>
                      <Input 
                        type="number" 
                        value={form[item.key] || 0} 
                        onChange={(e) => setForm({ ...form, [item.key]: +e.target.value })} 
                        className="h-8 bg-white border-slate-200 font-bold text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações Operacionais / Próximos Passos</label>
                <Textarea 
                  value={form.observacoes_etapa} 
                  onChange={(e) => setForm({ ...form, observacoes_etapa: e.target.value })} 
                  placeholder="Registre aqui detalhes sobre o andamento, problemas encontrados ou decisões tomadas nesta etapa..."
                  className="min-h-[100px] bg-white border-slate-200"
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">Geração de Banco de Talentos</p>
                  <p className="text-[11px] text-amber-700 font-medium italic">Marque se este edital resultou em um banco para cadastro reserva.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={form.gerou_banco} 
                    onChange={(e) => setForm({ ...form, gerou_banco: e.target.checked })}
                    className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  {form.gerou_banco && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-amber-700 uppercase">Qtd:</span>
                      <Input 
                        type="number" 
                        value={form.quantidade_banco} 
                        onChange={(e) => setForm({ ...form, quantidade_banco: +e.target.value })} 
                        className="h-8 w-16 bg-white border-amber-200 font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Configuração e Cronograma
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={() => applyTemplate('comum')} className="h-8 border-2">Template Comum</Button>
                <Button size="sm" variant="outline" onClick={() => applyTemplate('especifico')} className="h-8 border-2">Template Saúde/Títulos</Button>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, etapas_habilitadas: TODAS_AS_ETAPAS })} className="h-8 text-primary">Habilitar Todas</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {TODAS_AS_ETAPAS.map((etapa) => {
                  const isHabilitada = (form.etapas_habilitadas || []).includes(etapa);
                  const cronoKey = CRONOGRAMA_KEYS[etapa];
                  
                  return (
                    <div key={etapa} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isHabilitada ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isHabilitada} 
                          onChange={() => toggleEtapa(etapa)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className={`text-xs font-bold ${isHabilitada ? 'text-slate-700' : 'text-slate-400'}`}>
                          {ETAPA_LABELS[etapa]}
                        </span>
                      </div>
                      {isHabilitada && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-32 justify-start text-left font-semibold border-slate-200 hover:bg-slate-50 transition-all rounded-lg shadow-sm text-[11px]",
                              )}
                            >
                              <Calendar className="mr-2 h-3 w-3 text-primary" />
                              {cronograma[cronoKey] ? format(new Date(cronograma[cronoKey]), "dd/MM/yyyy") : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                              mode="single"
                              selected={cronograma[cronoKey] ? new Date(cronograma[cronoKey]) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setCronograma({ ...cronograma, [cronoKey]: date.toISOString().split('T')[0] });
                                }
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Resumo Visual</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
                {TODAS_AS_ETAPAS.filter(e => (form.etapas_habilitadas || []).includes(e)).map((e) => {
                  const status = (form.historico_etapas || []).find((h: any) => h.etapa === e);
                  const isCompleted = status?.concluida;
                  const isCurrent = form.etapa_atual === e;
                  const cronoKey = CRONOGRAMA_KEYS[e];
                  const date = cronograma[cronoKey];
                  
                  return (
                    <div key={e} className="relative">
                      <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                        isCurrent ? 'border-primary scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 
                        isCompleted ? 'border-green-500 bg-green-500' : 'border-slate-300'
                      }`} />
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>
                          {ETAPA_LABELS[e]}
                        </span>
                        {date && <span className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">Previsto: {formatDate(date)}</span>}
                        {isCompleted && status.data_conclusao && <span className="text-[9px] text-green-600 font-bold uppercase">Realizado: {formatDate(status.data_conclusao)}</span>}
                        {isCurrent && (
                          <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/10">
                            <p className="text-[9px] font-bold text-primary uppercase">Etapa em andamento</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Ações</h4>
            <div className="flex flex-col gap-3">
              <Button onClick={save} className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold h-12">
                Salvar Acompanhamento
              </Button>
              <Button 
                variant="outline" 
                type="button"
                onClick={onEditVaga}
                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50 font-bold h-12"
              >
                <Edit className="h-4 w-4 mr-2" /> Editar Registro
              </Button>
            </div>
            <p className="text-[11px] text-center text-slate-400 font-medium">As alterações serão registradas no histórico da vaga.</p>
          </div>
        </div>
      </div>
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
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">Total Inscritos</label>
            <Input type="number" value={form.total_inscritos} onChange={(e) => setForm({ ...form, total_inscritos: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">Aprovados Triagem</label>
            <Input type="number" value={form.aprovados_triagem} onChange={(e) => setForm({ ...form, aprovados_triagem: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">Entrevistados</label>
            <Input type="number" value={form.convocados_entrevista} onChange={(e) => setForm({ ...form, convocados_entrevista: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">Aprovados Finais</label>
            <Input type="number" value={form.aprovados_finais} onChange={(e) => setForm({ ...form, aprovados_finais: +e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold uppercase">Gerou Banco?</label>
            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                checked={form.gerou_banco} 
                onChange={(e) => setForm({ ...form, gerou_banco: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {form.gerou_banco && (
                <Input 
                  type="number" 
                  placeholder="Qtd." 
                  value={form.quantidade_banco} 
                  onChange={(e) => setForm({ ...form, quantidade_banco: +e.target.value })} 
                  className="h-8 w-20 bg-white" 
                />
              )}
            </div>
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
  const { updateValidacao, addValidacao, addMensagem, getVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [form, setForm] = useState(validacao || {
    id: `v-${Date.now()}`, vaga_id: vagaId,
    precisa_validacao: true,
    responsavel_validacao: '',
    tipo_validacao: '',
    observacao: '',
    etapa_finalizada: false,
    status_validacao: 'pendente',
  });

  const vaga = getVaga(vagaId);

  const save = () => {
    if (validacao) {
      updateValidacao(validacao.id, form);
    } else {
      addValidacao(form);
    }
    toast.success('Validação salva!');
  };

  const handleDecisao = (decisao: 'aprovado' | 'reprovado') => {
    const updatedForm = { ...form, status_validacao: decisao, etapa_finalizada: true };
    setForm(updatedForm);
    if (validacao) {
      updateValidacao(validacao.id, updatedForm);
    } else {
      addValidacao(updatedForm);
    }

    const vagaRef = vaga?.requisicao || vaga?.numero_processo || vagaId;
    const cargoRef = vaga?.cargo || 'não informado';
    const unidadeRef = vaga?.unidade || 'não informada';
    const usuario = currentUser?.nome_completo || 'Sistema';

    const mensagemTexto = decisao === 'aprovado'
      ? `✅ A validação da vaga ${vagaRef} (${cargoRef} - ${unidadeRef}) foi APROVADA por ${usuario}. A vaga pode prosseguir para as próximas etapas.`
      : `❌ A validação da vaga ${vagaRef} (${cargoRef} - ${unidadeRef}) foi REPROVADA por ${usuario}. Motivo: ${form.observacao || 'Não informado'}. Verifique as pendências antes de reenviar.`;

    addMensagem({
      id: `msg-val-${Date.now()}`,
      data: new Date().toISOString(),
      remetente: 'Aide',
      conteudo: mensagemTexto,
      lida: false,
    });

    toast.success(decisao === 'aprovado' 
      ? 'Validação aprovada! Notificação enviada à AGIE.' 
      : 'Validação reprovada! Notificação enviada à AGIE.');
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
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Requer aprovação de gestor</p>
            </div>
            {getIcon(form.precisa_validacao)}
          </div>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.etapa_finalizada ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}
            onClick={() => setForm({ ...form, etapa_finalizada: !form.etapa_finalizada })}
          >
            <div>
              <p className="text-sm font-bold text-slate-700">Etapa Finalizada?</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Conclusão do processo</p>
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

        {form.status_validacao !== 'pendente' && (
          <div className={`p-4 rounded-xl border ${form.status_validacao === 'aprovado' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm font-bold ${form.status_validacao === 'aprovado' ? 'text-green-700' : 'text-red-700'}`}>
              {form.status_validacao === 'aprovado' ? '✅ Validação Aprovada' : '❌ Validação Reprovada'}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center gap-3">
          <div className="flex gap-3">
            <Button 
              onClick={() => handleDecisao('aprovado')} 
              className="bg-green-600 hover:bg-green-700 text-white shadow-md px-6 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Aprovar
            </Button>
            <Button 
              onClick={() => handleDecisao('reprovado')} 
              variant="destructive"
              className="shadow-md px-6 gap-2"
            >
              <XCircle className="h-4 w-4" /> Reprovar
            </Button>
          </div>
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
          <Button 
            variant="outline" 
            className="mt-6 gap-2"
            onClick={() => window.location.href = `/banco-talentos?search=${vaga.cargo}`}
          >
            Consultar Outros Bancos
          </Button>
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
            {String(banco.status || 'SEM STATUS').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Data de Abertura</label>
            <p className="text-sm font-semibold text-slate-700">{formatDate(banco.data_abertura_edital)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Validade Original</label>
            <p className="text-sm font-semibold text-slate-700">{formatDate(banco.data_validade)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Prorrogado?</label>
            <p className="text-sm font-semibold text-slate-700">{banco.is_prorrogado ? 'Sim' : 'Não'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Candidatos no Banco</label>
            <p className="text-sm font-bold text-primary">{banco.quantidade_banco || 'Não informado'}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Observações do Banco</label>
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
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Histórico de Convocações</h3>
        <Button onClick={onNewConvocacao} size="sm" className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Nova Convocação
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader >
              <TableRow>
                <TableHead >Data/Hora</TableHead>
                <TableHead >Candidato</TableHead>
                <TableHead className="text-center">Class.</TableHead>
                <TableHead >Status</TableHead>
                <TableHead >E-doc</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocacoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{formatDate(c.data_convocacao)}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{c.horario}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{c.nome_candidato}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{c.tipo_convocacao}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-600">{c.classificacao}º</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] font-bold">
                      {String(c.status || 'SEM STATUS').toUpperCase()}
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
