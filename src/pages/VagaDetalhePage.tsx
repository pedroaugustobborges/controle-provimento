import { useParams, useNavigate } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate, getValidacaoColor, getEtapaColor } from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS, STATUS_VAGA_LABELS, ETAPA_LABELS, StatusVaga, EtapaEdital, STATUS_EDITAL_COLORS, STATUS_LABELS } from '@/types/vaga';
import { ArrowLeft, Clock, User, MapPin, Hash, Calendar, CheckCircle2, XCircle, Minus, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVaga, getEditalByVaga, getValidacaoByVaga, updateVaga, updateEdital, updateValidacao, addEdital, addValidacao } = useVagasStore();

  const vaga = getVaga(id!);
  if (!vaga) return <div className="p-8 text-center text-muted-foreground">Vaga não encontrada.</div>;

  const edital = getEditalByVaga(vaga.id);
  const validacao = getValidacaoByVaga(vaga.id);

  const handleStatusChange = (newStatus: string) => {
    updateVaga(vaga.id, {
      status: newStatus as StatusVaga,
      historico: [...vaga.historico, { id: `h-${Date.now()}`, data: new Date().toISOString().split('T')[0], descricao: `Status alterado para ${STATUS_LABELS[newStatus as StatusVaga]}`, usuario: 'Analista' }],

    });
    toast.success('Status atualizado');
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

        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Abertura', value: formatDate(vaga.data_abertura), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Clock, label: 'Dias Aberto', value: `${calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: User, label: 'Responsável', value: vaga.analista_responsavel || 'Sistema', color: 'text-purple-600', bg: 'bg-purple-50' },
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
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Hash className="h-3 w-3" /> Tipo de Provimento</label>
                  <p className="text-sm font-semibold text-slate-700">{TIPO_VAGA_LABELS[vaga.tipo_vaga]}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><User className="h-3 w-3" /> Analista Resp.</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.analista_responsavel}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Info className="h-3 w-3" /> Banco Válido?</label>
                  <p className="text-sm font-semibold text-slate-700">{vaga.tem_banco_valido ? 'Sim' : 'Não'}</p>
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

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Vagas</label>
                  <p className="text-xl font-bold text-slate-800">{vaga.quantidade}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Inscritos</label>
                  <p className="text-xl font-bold text-slate-800">{vaga.total_inscritos || 0}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Triagem</label>
                  <p className="text-xl font-bold text-slate-800">{vaga.aprovados_triagem || 0}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aprovados</label>
                  <p className="text-xl font-bold text-green-600">{vaga.aprovados_finais || 0}</p>
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
                      <Select value={vaga.status_geral} onValueChange={handleStatusChange}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Observações Internas</label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 min-h-[100px] text-sm text-slate-600 whitespace-pre-wrap">
                  {vaga.observacoes || 'Nenhuma observação registrada.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edital">
          <EditalTab vagaId={vaga.id} edital={edital} />
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

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
