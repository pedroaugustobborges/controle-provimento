import { useParams, useNavigate } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate, getValidacaoColor, getEtapaColor } from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS, STATUS_LABELS, ETAPA_LABELS, StatusGeral, EtapaEdital } from '@/types/vaga';
import { ArrowLeft, Clock, User, MapPin, Hash, Calendar, CheckCircle2, XCircle, Minus } from 'lucide-react';
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
      status_geral: newStatus as StatusGeral,
      historico: [...vaga.historico, { id: `h-${Date.now()}`, data: new Date().toISOString().split('T')[0], descricao: `Status alterado para ${STATUS_LABELS[newStatus as StatusGeral]}`, usuario: 'Analista' }],
    });
    toast.success('Status atualizado');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{vaga.cargo}</h2>
          <p className="text-sm text-muted-foreground">{vaga.numero_requisicao} · {vaga.unidade}</p>
        </div>
        <StatusBadge status={vaga.status_geral} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: 'Abertura', value: formatDate(vaga.data_abertura) },
          { icon: Clock, label: 'Dias Aberto', value: `${calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias` },
          { icon: User, label: 'Analista', value: vaga.analista_responsavel },
          { icon: MapPin, label: 'Seção', value: vaga.secao },
        ].map((item) => (
          <Card key={item.label} className="bg-card">
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-sm font-medium">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="edital">Edital</TabsTrigger>
          <TabsTrigger value="validacao">Validação</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardContent className="pt-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Unidade</label>
                  <p className="text-sm font-medium">{vaga.unidade}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Seção</label>
                  <p className="text-sm font-medium">{vaga.secao}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estado</label>
                  <p className="text-sm font-medium">{vaga.estado}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tipo de Provimento</label>
                  <p className="text-sm font-medium">{TIPO_VAGA_LABELS[vaga.tipo_vaga]}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tipo de Seleção</label>
                  <p className="text-sm font-medium">{vaga.selecao}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">PCD</label>
                  <p className="text-sm font-medium">{vaga.pcd ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nº Edital</label>
                  <p className="text-sm font-medium">{vaga.numero_edital || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nº Processo</label>
                  <p className="text-sm font-medium">{vaga.numero_processo || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nº Requisição</label>
                  <p className="text-sm font-medium">{vaga.numero_requisicao}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Quantidade de Vagas</label>
                  <p className="text-sm font-medium">{vaga.quantidade}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Etapa Atual</label>
                  <p className="text-sm font-medium">{vaga.etapa_atual_vaga || 'Não iniciada'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status do Processo</label>
                  <Select value={vaga.status_geral} onValueChange={handleStatusChange}>
                    <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total de Inscritos</label>
                  <p className="text-sm font-medium">{vaga.total_inscritos || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Aprovados Triagem</label>
                  <p className="text-sm font-medium">{vaga.aprovados_triagem || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Aprovados Avaliação</label>
                  <p className="text-sm font-medium">{vaga.aprovados_avaliacao || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Convocados Entrevista</label>
                  <p className="text-sm font-medium">{vaga.convocados_entrevista || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Aprovados Finais</label>
                  <p className="text-sm font-medium">{vaga.aprovados_finais || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Candidatos em Banco</label>
                  <p className="text-sm font-medium">{vaga.banco || 0}</p>
                </div>
              </div>

              <div className="border-t pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data Abertura</label>
                  <p className="text-sm font-medium">{formatDate(vaga.data_abertura)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data Encerramento</label>
                  <p className="text-sm font-medium">{vaga.data_encerramento ? formatDate(vaga.data_encerramento) : '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tempo em Aberto</label>
                  <p className="text-sm font-medium">{calcDiasAberto(vaga.data_abertura, vaga.data_encerramento)} dias corridos</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Observações</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vaga.observacoes || 'Nenhuma observação registrada.'}</p>
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
          <Card>
            <CardContent className="pt-5">
              <div className="space-y-3">
                {vaga.historico.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm">{h.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(h.data)} · {h.usuario}</p>
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
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Nº Processo</label>
            <Input value={form.numero_processo} onChange={(e) => setForm({ ...form, numero_processo: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nº Edital</label>
            <Input value={form.numero_edital} onChange={(e) => setForm({ ...form, numero_edital: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Abertura Edital</label>
            <Input type="date" value={form.data_abertura_edital} onChange={(e) => setForm({ ...form, data_abertura_edital: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data Prova</label>
            <Input type="date" value={form.data_prova || ''} onChange={(e) => setForm({ ...form, data_prova: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data Entrevista</label>
            <Input type="date" value={form.data_entrevista || ''} onChange={(e) => setForm({ ...form, data_entrevista: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Etapa Atual</label>
            <Select value={form.etapa_atual} onValueChange={(v) => setForm({ ...form, etapa_atual: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ETAPA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Total Inscritos</label>
            <Input type="number" value={form.total_inscritos} onChange={(e) => setForm({ ...form, total_inscritos: +e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aprovados Triagem</label>
            <Input type="number" value={form.aprovados_triagem} onChange={(e) => setForm({ ...form, aprovados_triagem: +e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Convocados Entrevista</label>
            <Input type="number" value={form.convocados_entrevista} onChange={(e) => setForm({ ...form, convocados_entrevista: +e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aprovados Finais</label>
            <Input type="number" value={form.aprovados_finais} onChange={(e) => setForm({ ...form, aprovados_finais: +e.target.value })} className="mt-1" />
          </div>
        </div>
        <Button onClick={save}>Salvar Edital</Button>
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

  const items = [
    { key: 'precisa_validacao', label: 'Precisa validação?' },
    { key: 'etapa_finalizada', label: 'Etapa finalizada?' },
  ];

  const cycle = (current: boolean | null) => {
    if (current === null) return true;
    if (current === true) return false;
    return null;
  };

  const save = () => {
    if (validacao) {
      updateValidacao(validacao.id, form);
    } else {
      addValidacao(form);
    }
    toast.success('Validação salva!');
  };

  const getIcon = (val: boolean | null) => {
    if (val === true) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (val === false) return <XCircle className="h-5 w-5 text-destructive" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setForm({ ...form, [item.key]: !form[item.key as keyof typeof form] })}
            >
              <span className="text-sm">{item.label}</span>
              {getIcon(form[item.key as keyof typeof form] as boolean | null)}
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Responsável pela validação</label>
          <Input value={form.responsavel_validacao} onChange={(e) => setForm({ ...form, responsavel_validacao: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo de validação</label>
          <Input value={form.tipo_validacao} onChange={(e) => setForm({ ...form, tipo_validacao: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Observação</label>
          <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="mt-1" rows={3} />
        </div>
        <Button onClick={save}>Salvar Validação</Button>
      </CardContent>
    </Card>
  );
}
