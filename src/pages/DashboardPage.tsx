import { useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  calcDiasAberto, formatDate, CATEGORIAS_STATUS, isVitoriaUnit, 
  getCategoriaStatus, normalizeUnitName, countVacancies, 
  getStatusSummary, getValidVacancyBase 
} from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS } from '@/types/vaga';
import { 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Users,
  Calendar,
  MoreVertical,
  Activity,
  Bell,
  Building2,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Database,
  Star,
  RefreshCw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { 
    vagas: allVagas = [], 
    validacoes = [], 
    getBancoByVaga, 
    convocacoes = [], 
    bancos = [], 
    tarefas = [], 
    alertas: storeAlertas = [] 
  } = useVagasStore();
  const navigate = useNavigate();

  // Filtrar dados mockados: consideramos "reais" apenas dados com origem de importação ou lote
  // Isso atende à solicitação de usar exclusivamente dados reais inseridos/importados
  // Canonical base for dashboard - using the same parity rule as Excel
  const vagas = useMemo(() => {
    return getValidVacancyBase(allVagas, 'TODOS', 'TODOS');
  }, [allVagas]);

  const totalVagas = useMemo(() => vagas.length, [vagas]);

  
  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      concluidas: 0,
      excecoes: 0,
      estrategicas: 0,
      convocacao: 0,
      movimentacao_interna: 0,
      vaga_lideranca: 0,
      cancelada: 0,
      dispensa: 0,
      aguardar_anuencia: 0,
      atrasadas: 0,
    };
    
    vagas.forEach(v => {
      const status = (v.status || v.status_geral) as string;
      const cat = getCategoriaStatus(status);
      if (acc[cat] !== undefined) {
        acc[cat]++;
      }
      
      if (status === 'movimentacao_interna') acc.movimentacao_interna++;
      if (status === 'vaga_lideranca') acc.vaga_lideranca++;
      if (status === 'cancelada') acc.cancelada++;
      if (status === 'dispensa') acc.dispensa++;
      if (status === 'aguardar_anuencia') acc.aguardar_anuencia++;
      
      // Check if delayed
      const lastHist = v.historico?.[v.historico.length - 1];
      const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
      if (calcDiasAberto(baseDate) > 10 && !['encerrada', 'finalizada', 'cancelada', 'admissao_efetivada'].includes(status)) {
        acc.atrasadas++;
      }
    });
    
    return acc;
  }, [vagas]);

  const {
    fila_edital: filaEdital,
    em_andamento: emAndamento,
    concluidas,
    excecoes,
    estrategicas,
    convocacao,
    movimentacao_interna: totalMovInterna,
    vaga_lideranca: totalLideranca,
    cancelada: totalCanceladas,
    dispensa: totalDispensa,
    aguardar_anuencia: totalAnuencia,
    atrasadas: totalAtrasadas
  } = counts;

  const emValidacao = validacoes.filter((v) => v.status_validacao === 'pendente').length;
  // Aqui também somamos a quantidade de vagas representadas
  const comBancoValido = useMemo(() => 
    vagas.filter(v => getBancoByVaga(v.id)).length
  , [vagas, getBancoByVaga]);


  const totalCR = useMemo(() => 
    bancos.filter(b => b.status === 'CADASTRO RESERVA' || b.status === 'valido').length
  , [bancos]);

  const totalVencidos = useMemo(() => 
    bancos.filter(b => b.status === 'VENCIDO' || (b as any).status === 'vencido').length
  , [bancos]);

  const totalConvocados = useMemo(() => {
    return bancos.filter(b => b.status === 'CONVOCADO' || (b as any).status === 'convocado').length;
  }, [bancos]);

  const totalTarefasPendentes = tarefas.filter(t => t.status === 'pendente').length;
  const totalConvRealizadas = convocacoes.length;

  const stats = useMemo(() => [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Fila de Editais', value: filaEdital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em Andamento', value: emAndamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Concluídas', value: concluidas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Estratégicas', value: estrategicas, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Convocações', value: convocacao, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Exceções', value: excecoes, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Com Banco Válido', value: comBancoValido, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Mov. Interna', value: totalMovInterna, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Liderança', value: totalLideranca, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Etapas em Atraso', value: totalAtrasadas, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Canceladas', value: totalCanceladas, icon: X, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Dispensa', value: totalDispensa, icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Aguardar Anuência', value: totalAnuencia, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Edital Pend. Valid.', value: emValidacao, icon: ShieldCheck, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Tarefas Pendentes', value: totalTarefasPendentes, icon: Bell, color: 'text-red-600', bg: 'bg-red-50' },
  ], [totalVagas, filaEdital, emAndamento, concluidas, estrategicas, convocacao, excecoes, comBancoValido, totalMovInterna, totalLideranca, totalAtrasadas, totalCanceladas, totalDispensa, totalAnuencia, emValidacao, totalTarefasPendentes]);

  const alerts = useMemo(() => vagas.filter((v) => {
    const status = v.status || v.status_geral;
    // Vagas encerradas ou com admissão efetivada não geram alerta de atraso
    if (['encerrada', 'finalizada', 'cancelada', 'admissao_efetivada'].includes(status as string)) return false;
    
    // Cálculo de dias aberto usa data de recebimento se não houver histórico recente
    const lastHist = v.historico?.[v.historico.length - 1];
    const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
    return calcDiasAberto(baseDate) > 10;
  }), [vagas]);

  const chartData = useMemo(() => {
    const groupedMap = new Map<string, { total: number, abertas: number }>();
    
    vagas.forEach(v => {
      if (!v.unidade) return;
      
      const normalizedName = normalizeUnitName(v.unidade);
      if (!normalizedName) return;

      const current = groupedMap.get(normalizedName) || { total: 0, abertas: 0 };
      const qtd = 1; // 1 registro = 1 vaga
      
      const status = (v.status || v.status_geral || '').toLowerCase();
      const categoria = getCategoriaStatus(status);
      
      // Contagem de totais deve respeitar se a vaga não está duplicada (já tratado acima no memo vagas)
      current.total += qtd;
      
      // Vaga aberta é aquela que NÃO está encerrada ou exceção
      if (categoria !== 'concluidas' && categoria !== 'excecoes') {
        current.abertas += qtd;
      }
      
      groupedMap.set(normalizedName, current);
    });

    return Array.from(groupedMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        abertas: data.abertas,
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [vagas]);


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header Section with Glass Effect or Strong Visual Separation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel Operacional</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Visão Geral de Provimento</h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm font-medium">
            Monitoramento em tempo real dos processos seletivos e fluxo de contratações AGIR.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs font-bold h-10 px-5 border-slate-200 hover:bg-slate-50 text-slate-600 transition-all rounded-xl shadow-sm">
            Relatórios Detalhados
          </Button>
          <Button className="text-xs font-bold h-10 px-5 bg-primary hover:bg-primary/90 text-white transition-all rounded-xl shadow-lg shadow-primary/20">
            Novo Processo Seletivo
          </Button>
        </div>
      </div>

      {/* Stats Grid - More Dynamic Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-5">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden bg-white">
            <div className={`h-1 w-full absolute top-0 left-0 ${stat.bg.replace('/5', '')} opacity-40`}></div>
            <CardContent className="p-6">
              <div className={`p-2.5 rounded-xl ${stat.bg} w-fit mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 leading-tight">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                <div className="h-1.5 w-1.5 rounded-full bg-slate-100 group-hover:bg-primary/20 transition-colors"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de Conferência Objetiva (Solicitação do Usuário) */}
      <Card className="border-none shadow-sm bg-white overflow-hidden mt-8">
        <CardHeader className="pb-4 border-b border-slate-50 bg-blue-50/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-slate-800">Conferência de Status (Dados Reais)</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400">Validação objetiva de como cada registro original está sendo classificado.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-wider">Status Original Importado</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-wider text-center">Quantidade</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-wider">Grupo/Card de Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {useMemo(() => {
                const distribution = new Map<string, { count: number, group: string }>();
                
                  vagas.forEach(v => {
                    const status = (v.status || v.status_geral || 'SEM STATUS') as string;
                    const groupKey = getCategoriaStatus(status);
                    
                    // Improved matching for labels
                    const groupLabelMap: Record<string, string> = {
                      fila_edital: 'Fila de Editais',
                      em_andamento: 'Em Andamento',
                      concluidas: 'Concluídas',
                      excecoes: 'Exceções',
                      estrategicas: 'Estratégicas',
                      convocacao: 'Convocações'
                    };
                    const groupLabel = groupLabelMap[groupKey] || groupKey;
                    
                    const current = distribution.get(status) || { count: 0, group: groupLabel };
                    current.count++;
                    distribution.set(status, current);
                  });
                
                return Array.from(distribution.entries())
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([status, data]) => (
                    <tr key={status} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-700 font-bold">{status.toUpperCase().replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-black text-xs">
                          {data.count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${
                            data.group.includes('Fila') ? 'bg-amber-400' : 
                            data.group.includes('Concluídas') ? 'bg-green-500' : 
                            data.group.includes('Exceções') ? 'bg-red-500' : 
                            'bg-blue-400'
                          }`}></div>
                          <span className="text-slate-500 font-bold uppercase text-[10px] tracking-tight">{data.group}</span>
                        </div>
                      </td>
                    </tr>
                  ));
              }, [vagas, stats])}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Unit View - Modernized Bar Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 mb-6 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Visão Estratégica por Unidade
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 ml-10.5">Distribuição geográfica de processos e demandas ativas.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Abertas</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pb-8">
            <div className="h-[400px] w-full mt-4 pr-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  layout="vertical" 
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={180}
                    tick={{ 
                      fontSize: 10, 
                      fontWeight: 700, 
                      fill: '#64748b',
                    }} 
                    interval={0}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', radius: 4 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                    <Bar 
                    dataKey="abertas" 
                    name="Processos em Aberto" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24} 
                    animationDuration={1500}
                  >
                    <LabelList 
                      dataKey="abertas" 
                      position="right" 
                      style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                      offset={10}
                    />
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.8)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Operational Alerts - Modernized with better states */}
        <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <CardTitle className="text-lg font-black text-slate-800">Alertas Ativos</CardTitle>
              </div>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-200 shadow-sm animate-pulse">
                {alerts.length} Pendências
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {alerts.slice(0, 5).map((v) => (
                  <div key={v.id} className="p-5 hover:bg-slate-50/80 transition-all cursor-pointer group flex items-start gap-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-mono font-black text-slate-300 group-hover:text-primary/40 transition-colors uppercase">#{v.requisicao || v.numero_requisicao}</span>
                        <span className="text-[10px] font-black text-amber-600 flex items-center gap-1 uppercase bg-white border border-amber-100 px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" /> {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_recebimento || v.data_abertura)}d
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate leading-snug">{v.cargo}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Building2 className="h-3 w-3 opacity-50" /> {normalizeUnitName(v.unidade)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Tudo sob controle</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Nenhum processo em atraso crítico no momento.</p>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <Button variant="ghost" className="w-full text-[10px] font-black text-primary hover:bg-primary/5 uppercase tracking-[0.15em] transition-all">
              Gestão de Gargalos <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activities Section - Table Refinement */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 bg-slate-50/30">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg font-black text-slate-800">Atividades Recentes</CardTitle>
            </div>
            <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-6">Últimas movimentações nos processos AGIR</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar processos..." 
                className="pl-9 h-10 text-[11px] font-bold border border-slate-100 rounded-xl w-48 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 text-left border-b border-slate-100/50">
                  <th className="px-6 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Requisição</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Cargo e Unidade</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Tipo</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Status Operacional</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Atualização</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vagas.slice(0, 5).map((v) => (
                  <tr
                    key={v.id}
                    className="group hover:bg-slate-50/80 cursor-pointer transition-all duration-200"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                        <span className="font-mono text-[11px] font-black text-primary leading-none uppercase">{v.requisicao || v.numero_requisicao}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-700 text-sm leading-tight tracking-tight group-hover:text-primary transition-colors">{v.cargo}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{isVitoriaUnit(v.unidade) ? 'VITÓRIA' : (v.unidade || '').toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-black border border-slate-200 uppercase tracking-widest shadow-sm">
                        {TIPO_VAGA_LABELS[v.tipo_vaga]}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={v.status || v.status_geral || 'aberta'} />
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-600">
                          {v.historico && v.historico.length > 0 ? formatDate(v.historico[v.historico.length - 1].data) : formatDate(v.data_abertura)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase mt-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Há {calcDiasAberto(v.historico?.[v.historico.length - 1]?.data || v.data_abertura)} dias</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-primary hover:bg-white hover:shadow-sm rounded-lg transition-all">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 bg-slate-50/30 border-t border-slate-100 flex justify-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/vagas')} 
              className="text-[10px] text-primary font-black hover:bg-primary/5 uppercase tracking-[0.2em] transition-all"
            >
              Histórico Completo de Processos <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Technical Audit Section */}
      <Card className="border-none shadow-md bg-slate-900 text-white overflow-hidden mt-8">
        <CardHeader className="border-b border-white/10 bg-white/5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Auditoria de Dados e Cálculos</CardTitle>
                <CardDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verificação em tempo real da base operacional</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Sincronizado com o Lote Atual</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-2 border-primary pl-3">Total de Vagas</h4>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:bg-white/[0.08] transition-colors">
                <p className="text-4xl font-black text-white tracking-tighter">{totalVagas}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">
                  Calculado via <code className="text-emerald-400">vagas.length</code>. 
                  Reflete o total de registros válidos (com cargo) no lote atual.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-3">Distribuição Operacional</h4>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2.5">
                {Object.entries(counts).filter(([_, v]) => v > 0).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-white/5 pb-1.5 last:border-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{k.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-black text-white bg-white/10 px-2 py-0.5 rounded-md">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Banco de Talentos</h4>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-2xl font-black text-white">{comBancoValido}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Com Banco Válido</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-500">{totalVagas - comBancoValido}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Sem Cobertura</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                  <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${(comBancoValido / (totalVagas || 1)) * 100}%` }}></div>
                </div>
                <p className="text-[9px] text-slate-500 mt-4 leading-tight italic">
                  * Match por cargo e unidade entre Processos e Banco Geral.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-3">Rastreabilidade</h4>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Database className="h-4 w-4 text-indigo-400" />
                  </div>
                  <p className="text-xs font-black text-white truncate max-w-[150px]">
                    {vagas[0]?.origem_importacao || 'Nenhum lote'}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Modo de Substituição Total Ativo. Os números refletem 100% da verdade do último arquivo importado.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}