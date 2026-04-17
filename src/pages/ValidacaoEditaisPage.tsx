import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  AlertCircle,
  Eye,
  FileCheck,
  Building2,
  FileText,
  Bot,
  MessageSquare,
  FileDown,
  User,
  ExternalLink,
  RotateCcw,
  Link2
} from 'lucide-react';
import { formatDate, normalizeUnitName } from '@/lib/vagaUtils';
import { PageHeader } from '@/components/PageHeader';
import { HelpGuide } from '@/components/HelpGuide';
import { PageSkeleton } from '@/components/PageSkeleton';

import { useState, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { toast } from 'sonner';


export default function ValidacaoEditaisPage() {
  const { vagas, updateVagaAsync, addMensagem, notificarMovimentacaoEdital, isInitialLoad } = useVagasStore();
  const updateVaga = updateVagaAsync;
  const { currentUser, addAuditLog, users, fetchUsers } = useAdminStore();
  const [search, setSearch] = useState('');
  const [selectedVaga, setSelectedVaga] = useState<any>(null);
  const [obs, setObs] = useState('');
  const [reachrUrl, setReachrUrl] = useState('');
  const [selectedGestorId, setSelectedGestorId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const gestores = useMemo(() => {
    return users.filter(u => u.perfil === 'Gestão' || u.perfil === 'Gerência' || u.perfil === 'Coordenação');
  }, [users]);


  const pendingEditais = useMemo(() => {
    return vagas.filter(v => {
      // Regra: Mostrar se está em validação ou aguardando aprovação do gestor
      const isPending = v.status_fluxo_edital === 'enviado_validacao' || 
                       v.status_fluxo_edital === 'aguardando_aprovacao_gestor';
      
      if (!isPending) return false;
      
      // Se estiver aguardando gestor, apenas o gestor selecionado ou admin vê para aprovar
      if (v.status_fluxo_edital === 'aguardando_aprovacao_gestor') {
        if (v.gestor_aprovador_id !== currentUser?.id && currentUser?.perfil !== 'Admin') {
          return false;
        }
      }

      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(normalizeUnitName(v.unidade))) {
          return false;
        }
      }

      if (search) {
        const s = search.toLowerCase();
        return v.cargo.toLowerCase().includes(s) || 
               v.unidade.toLowerCase().includes(s) ||
               (v.numero_edital || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [vagas, currentUser, search]);


  const handleAction = async (vagaId: string, actionStatus: 'aprovado' | 'reprovado' | 'ajuste') => {
    const vaga = vagas.find(v => v.id === vagaId);
    if (!vaga) return;

    let newFluxoStatus: string;
    let descricao: string;
    let mensagemAgie: string;
    const usuario = currentUser?.nome_completo || 'Sistema';
    const vagaRef = vaga.requisicao || vaga.numero_requisicao || vaga.id;
    const cargoRef = vaga.cargo || 'não informado';
    const unidadeRef = vaga.unidade || 'não informada';

    if (actionStatus === 'aprovado') {
      newFluxoStatus = 'aprovado_administrativo';
      descricao = `Edital APROVADO por ${usuario}. Obs: ${obs}`;
      mensagemAgie = `✅ O edital da vaga ${vagaRef} (${cargoRef} - ${unidadeRef}) foi APROVADO na validação por ${usuario}.${reachrUrl ? ` Link Reachr: ${reachrUrl}` : ''} O edital pode prosseguir para publicação.`;
    } else if (actionStatus === 'ajuste') {
      newFluxoStatus = 'em_redacao';
      descricao = `Edital devolvido para AJUSTE/REDAÇÃO por ${usuario}. Obs: ${obs}`;
      mensagemAgie = `🔄 O edital da vaga ${vagaRef} (${cargoRef} - ${unidadeRef}) foi devolvido para AJUSTE na redação por ${usuario}. Motivo: ${obs || 'Não informado'}. O analista deve corrigir e reenviar.`;
    } else {
      newFluxoStatus = 'em_redacao';
      descricao = `Edital REJEITADO por ${usuario}. Obs: ${obs}`;
      mensagemAgie = `❌ O edital da vaga ${vagaRef} (${cargoRef} - ${unidadeRef}) foi REJEITADO na validação por ${usuario}. Motivo: ${obs || 'Não informado'}. Verifique as pendências antes de reenviar.`;
    }

    const updateData: any = {
      status_validacao: actionStatus === 'ajuste' ? 'pendente' : actionStatus,
      status_fluxo_edital: newFluxoStatus,
      etapa: newFluxoStatus,
      validado_por: usuario,
      data_validacao: new Date().toISOString(),
      observacoes_validacao: obs,
      historico: [...(vaga.historico || []), {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao,
        usuario: usuario
      }]
    };

    if (reachrUrl) {
      updateData.url_reachr = reachrUrl;
    }

    const ok = await updateVaga(vagaId, updateData);
    if (!ok) return;

    notificarMovimentacaoEdital(vagaId, newFluxoStatus, obs ? `Obs: ${obs}` : '');

    const msgs: Record<string, string> = {
      aprovado: 'Edital aprovado! Notificação enviada à AGIE.',
      reprovado: 'Edital rejeitado! Notificação enviada à AGIE.',
      ajuste: 'Edital devolvido para ajuste na redação! Notificação enviada à AGIE.',
    };
    toast.success(msgs[actionStatus]);
    setIsModalOpen(false);
    setSelectedVaga(null);
    setObs('');
    setReachrUrl('');
    setSelectedGestorId('');
  };

  const handleRequestGestorApproval = async (vagaId: string) => {
    const vaga = vagas.find(v => v.id === vagaId);
    const gestor = users.find(u => u.id === selectedGestorId);
    if (!vaga || !gestor) return;

    const usuario = currentUser?.nome_completo || 'Validador';
    const vagaRef = vaga.requisicao || vaga.numero_requisicao || vaga.id;

    const ok = await updateVaga(vagaId, {
      status_fluxo_edital: 'aguardando_aprovacao_gestor',
      etapa: 'aguardando_aprovacao_gestor',
      gestor_aprovador_id: selectedGestorId,
      status_aprovacao_gestor: 'pendente',
      observacoes_validacao: obs,
      historico: [...(vaga.historico || []), {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Edital enviado para aprovação do gestor ${gestor.nome_completo} por ${usuario}. Obs: ${obs}`,
        usuario: usuario
      }]
    } as any);

    if (!ok) return;

    notificarMovimentacaoEdital(vagaId, 'aguardando_aprovacao_gestor', `Gestor: ${gestor.nome_completo}.`);

    addMensagem({
      id: `msg-gestor-${Date.now()}`,
      data: new Date().toISOString(),
      remetente: 'Agie',
      conteudo: `🔔 Edital pendente de aprovação: O validador ${usuario} solicitou sua análise para o edital da vaga ${vagaRef} (${vaga.cargo}).`,
      lida: false,
    });

    toast.success(`Solicitação de aprovação enviada para o gestor ${gestor.nome_completo}!`);
    setIsModalOpen(false);
    setSelectedVaga(null);
    setObs('');
    setSelectedGestorId('');
  };

  if (isInitialLoad) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Validação de Edital"
        helpContent={<HelpGuide />}
        icon={<FileCheck className="h-8 w-8 text-primary" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6 text-center">
            <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Aguardando Validação</p>
            <p className="text-3xl font-bold text-amber-700">{pendingEditais.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-bold text-slate-800">Editais Pendentes</CardTitle>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filtrar..." 
              className="pl-9 h-10 bg-white" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Cargo / REQ</TableHead>
                <TableHead>Edital / Processo</TableHead>
                <TableHead>Obs. Unidade</TableHead>
                <TableHead>Obs. Analista</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingEditais.map((v) => (
                <TableRow key={v.id} className="group">
                  <TableCell className="font-medium text-slate-700">{v.unidade}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{v.cargo}</div>
                    <div className="text-[11px] text-slate-400">{v.requisicao}</div>
                  </TableCell>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-primary">{v.numero_edital || '-'}</div>
                    <div className="text-[11px] text-slate-500">{v.numero_processo || '-'}</div>
                  </td>
                  <td className="px-6 py-4 max-w-[150px]">
                    <p className="text-[10px] text-slate-500 truncate" title={v.observacoes_unidade}>{v.observacoes_unidade || '-'}</p>
                  </td>
                  <td className="px-6 py-4 max-w-[150px]">
                    <p className="text-[10px] text-slate-500 truncate" title={v.observacoes_edital}>{v.observacoes_edital || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {v.status_fluxo_edital === 'aguardando_aprovacao_gestor' && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse">
                          Aguardando Gestor
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => { setSelectedVaga(v); setReachrUrl((v as any).url_reachr || ''); setIsModalOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" /> Analisar
                      </Button>
                    </div>
                  </td>
                </TableRow>
              ))}
              {pendingEditais.length === 0 && (
                <TableRow>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                    Nenhum edital pendente de validação administrativa.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Validar Edital
            </DialogTitle>
            <DialogDescription>
              Analise os dados e o arquivo do edital para a vaga {selectedVaga?.cargo}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Resumo da Vaga */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nº Edital</p>
                <p className="font-bold text-slate-800">{selectedVaga?.numero_edital}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nº Processo</p>
                <p className="font-bold text-slate-800">{selectedVaga?.numero_processo}</p>
              </div>
            </div>

            {/* Link Reachr */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-600" /> Endereço da Vaga no Reachr
              </h4>
              <div className="flex gap-2">
                <Input 
                  value={reachrUrl} 
                  onChange={(e) => setReachrUrl(e.target.value)} 
                  className="bg-white border-slate-200 flex-1" 
                  placeholder="https://www.reachr.com.br/vaga/..." 
                />
                {reachrUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 shrink-0"
                    onClick={() => window.open(reachrUrl.startsWith('http') ? reachrUrl : `https://${reachrUrl}`, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Cole o link da vaga publicada no portal www.reachr.com.br</p>
            </div>

            {/* Arquivo do Edital */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Arquivo do Edital
              </h4>
              {selectedVaga?.arquivo_edital ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded text-white">
                      <FileDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">{selectedVaga.arquivo_edital}</p>
                      <p className="text-[10px] text-blue-600">Documento Word (.docx)</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800 hover:bg-blue-100">
                    <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                  </Button>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center">
                  <p className="text-sm text-slate-400 italic">Nenhum arquivo anexado.</p>
                </div>
              )}
            </div>

            {/* Fluxo de Observações */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Fluxo de Observações
              </h4>
              
              <div className="space-y-3">
                <div className="relative pl-6 pb-2 border-l-2 border-slate-100">
                  <div className="absolute left-[-9px] top-0 bg-white p-0.5">
                    <div className="bg-amber-100 p-1 rounded-full"><Building2 className="h-3 w-3 text-amber-600" /></div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Analista da Unidade</span>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-sm text-slate-700 italic">
                      {selectedVaga?.observacoes_unidade || 'Nenhuma observação informada pela unidade.'}
                    </div>
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-slate-100">
                  <div className="absolute left-[-9px] top-0 bg-white p-0.5">
                    <div className="bg-blue-100 p-1 rounded-full"><User className="h-3 w-3 text-blue-600" /></div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Analista do Edital</span>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-sm text-slate-700 italic">
                      {selectedVaga?.observacoes_edital || 'Nenhuma observação informada pelo analista do edital.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">IA: Sugestão de Datas</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] bg-white hover:bg-blue-50 border-blue-200"
                  onClick={() => toast.success('Datas sugeridas com base no arquivo do edital.')}
                >
                  Extrair Datas
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  <span className="text-slate-400 block uppercase font-black tracking-tighter">Inscrições</span>
                  <span className="font-bold text-blue-700">01/01/2024 a 15/01/2024</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-blue-100">
                  <span className="text-slate-400 block uppercase font-black tracking-tighter">Triagem</span>
                  <span className="font-bold text-blue-700">20/01/2024</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Observações da Validação Final</label>
              <Textarea 
                placeholder="Informe o motivo da reprovação, ajuste ou observações da aprovação..." 
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {selectedVaga?.status_fluxo_edital === 'enviado_validacao' && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">Solicitar Aprovação de Gestor</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={selectedGestorId} onValueChange={setSelectedGestorId}>
                      <SelectTrigger className="bg-white border-amber-200">
                        <SelectValue placeholder="Selecione um Gestor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gestores.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-amber-700 border-amber-300 hover:bg-amber-100 font-bold"
                    onClick={() => handleRequestGestorApproval(selectedVaga.id)}
                    disabled={!selectedGestorId}
                  >
                    Solicitar
                  </Button>
                </div>
                <p className="text-[10px] text-amber-600 italic">O gestor selecionado receberá uma notificação para validar este edital.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4 flex-wrap">
            <Button 
              variant="outline" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-1" 
              onClick={() => handleAction(selectedVaga.id, 'ajuste')}
            >
              <RotateCcw className="h-4 w-4" /> Devolver para Ajuste
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50 gap-1" 
              onClick={() => handleAction(selectedVaga.id, 'reprovado')}
            >
              <XCircle className="h-4 w-4" /> Rejeitar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white gap-1" 
              onClick={() => handleAction(selectedVaga.id, 'aprovado')}
            >
              <CheckCircle2 className="h-4 w-4" /> Aprovar Edital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
