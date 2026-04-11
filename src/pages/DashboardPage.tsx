import { useMemo, useEffect, useState } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  calcDiasAberto, normalizeUnitName, 
  getCategoriaStatus, getValidVacancyBase, normalizeCargo,
  filterByRegionAndUnit
} from '@/lib/vagaUtils';
import { 
  Briefcase, 
  FileText, 
  Clock, 
  Activity,
  Users,
  Building2,
  ShieldCheck,
  CheckCircle,
  Star,
  AlertTriangle,
  UserCheck,
  AlertCircle,
  Bell,
  ArrowLeftRight,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Region mapping for chart grouping
const REGION_MAP: Record<string, string> = {
  'HECAD': 'Goiás e Vitória',
  'CRER': 'Goiás e Vitória',
  'AGIR': 'Goiás e Vitória',
  'HUGOL': 'Goiás e Vitória',
  'HDS': 'Goiás e Vitória',
  'POLICLÍNICA': 'Goiás e Vitória',
  'JATAÍ': 'Goiás e Vitória',
  'TEIA ANAPOLIS': 'Goiás e Vitória',
  'TEIA CANEDO': 'Goiás e Vitória',
  'TEIA APARECIDA': 'Goiás e Vitória',
  'TEIA GOIÂNIA': 'Goiás e Vitória',
  'VITÓRIA (SÃO PEDRO/SUÁ)': 'Goiás e Vitória',
  'SÃO PEDRO': 'Goiás e Vitória',
  'SUÁ': 'Goiás e Vitória',
  'DOURADOS': 'Outras unidades',
  'CHS': 'Outras unidades',
  'HMSA': 'Outras unidades',
  'HRCAC': 'Outras unidades',
  'TEIA CEN': 'Outras unidades',
  'TEIA PIN': 'Outras unidades',
  'TEIA MAN': 'Outras unidades',
  'TEIA MAN 2': 'Outras unidades',
  'TEIA MAN 3': 'Outras unidades',
};

function getRegionForUnit(unitName: string): string {
  const upper = normalizeUnitName(unitName);
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (upper.includes(normalizeUnitName(key)) || normalizeUnitName(key).includes(upper)) return region;
  }
  return 'Outras unidades';
}

export default function DashboardPage() {
  const { 
    vagas: allVagas = [], 
    bancos = [],
    editais = [],
    convocacoes = [],
    tarefas = [],
    fetchVagas,
    fetchBancos
  } = useVagasStore();
  const { selectedRegion, selectedUnits } = useAdminStore();
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'unidade' | 'regiao'>('unidade');

  useEffect(() => {
    fetchVagas();
    fetchBancos();
  }, [fetchVagas, fetchBancos]);

  const filterDashboardRecords = <T extends { unidade?: string | null }>(records: T[]) => {
    const regionFiltered = filterByRegionAndUnit(records, selectedRegion, 'all');

    if (selectedRegion === 'all') {
      return regionFiltered;
    }

    const activeUnits = selectedUnits.filter((unit) => unit && unit !== 'all');

    if (activeUnits.length === 0) {
      return regionFiltered;
    }

    const matchedRecords = new Set<T>();

    activeUnits.forEach((unit) => {
      filterByRegionAndUnit(regionFiltered, 'all', unit).forEach((record) => {
        matchedRecords.add(record);
      });
    });

    return regionFiltered.filter((record) => matchedRecords.has(record));
  };

  const vagas = useMemo(() => {
    const base = filterDashboardRecords(allVagas);
    return getValidVacancyBase(base, 'TODOS', 'TODOS');
  }, [allVagas, selectedRegion, selectedUnits]);

  const filteredBancos = useMemo(() => {
    return filterDashboardRecords(bancos);
  }, [bancos, selectedRegion, selectedUnits]);

  const visibleVagaIds = useMemo(() => new Set(vagas.map((vaga) => vaga.id)), [vagas]);

  const filteredEditais = useMemo(() => (
    editais.filter((edital) => visibleVagaIds.has(edital.vaga_id))
  ), [editais, visibleVagaIds]);

  const filteredConvocacoes = useMemo(() => (
    convocacoes.filter((convocacao) => visibleVagaIds.has(convocacao.vaga_id))
  ), [convocacoes, visibleVagaIds]);

  const visibleBancoIds = useMemo(() => new Set(filteredBancos.map((banco) => banco.id)), [filteredBancos]);
  const visibleEditalIds = useMemo(() => new Set(filteredEditais.map((edital) => edital.id)), [filteredEditais]);
  const visibleConvocacaoIds = useMemo(() => new Set(filteredConvocacoes.map((convocacao) => convocacao.id)), [filteredConvocacoes]);

  const totalVagas = useMemo(() => vagas.length, [vagas]);

  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      concluidas: 0,
      vagas_interrompidas: 0,
      vagas_lideranca: 0,
      convocacao: 0,
      aguardando_unidade: 0,
      documentacao: 0,
      movimentacao_interna: 0,
      atrasadas: 0,
    };
    
    vagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      if (acc[cat] !== undefined) {
        acc[cat]++;
      }
      
      const status = (v.status || '').toLowerCase();
      if (status.includes('movimentacao interna') || status.includes('movimentação interna') || 
          status === 'movimentacao_interna' || status === 'mov. interna' || status === 'mov interna' ||
          status.includes('transferencia') || status.includes('transferência') ||
          status.includes('remanejamento')) {
        acc.movimentacao_interna++;
      }
      
      const lastHist = v.historico?.[v.historico.length - 1];
      const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
      if (calcDiasAberto(baseDate) > 10 && !['CONCLUÍDAS', 'CANCELADAS', 'SUSPENSA'].includes(v.status)) {
        acc.atrasadas++;
      }
    });
    
    return acc;
  }, [vagas]);

  const totalCR = useMemo(() => {
    return filteredBancos.filter(b => 
      (b.status === 'CADASTRO RESERVA' || b.status === 'valido') && !b.is_prorrogado
    ).length;
  }, [filteredBancos]);

  const totalProrrogados = useMemo(() => {
    return filteredBancos.filter(b => b.is_prorrogado || b.status === 'prorrogado').length;
  }, [filteredBancos]);

  const totalCadastroReservaDisponiveis = useMemo(() => {
    return filteredBancos.filter(b => b.status !== 'VENCIDO' && b.status !== 'CONVOCADO').length;
  }, [filteredBancos]);

  const totalConvocados = useMemo(() => 
    filteredBancos.filter(b => b.status === 'CONVOCADO').length
  , [filteredBancos]);

  const totalVencidos = useMemo(() => 
    filteredBancos.filter(b => b.status === 'VENCIDO').length
  , [filteredBancos]);

  const totalBancoTotal = useMemo(() => filteredBancos.length, [filteredBancos]);

  const totalTarefasPendentes = useMemo(() => {
    const shouldIncludeUnscopedTasks = selectedRegion === 'all';

    return tarefas.filter((tarefa) => {
      if (tarefa.status !== 'pendente') return false;

      if (!tarefa.relacionado_a) {
        return shouldIncludeUnscopedTasks;
      }

      switch (tarefa.relacionado_a.tipo) {
        case 'vaga':
          return visibleVagaIds.has(tarefa.relacionado_a.id);
        case 'banco':
          return visibleBancoIds.has(tarefa.relacionado_a.id);
        case 'convocacao':
          return visibleConvocacaoIds.has(tarefa.relacionado_a.id);
        case 'edital':
          return visibleEditalIds.has(tarefa.relacionado_a.id);
        default:
          return shouldIncludeUnscopedTasks;
      }
    }).length;
  }, [tarefas, selectedRegion, visibleVagaIds, visibleBancoIds, visibleConvocacaoIds, visibleEditalIds]);

  const stats = useMemo(() => [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5', description: 'Base ativa' },
    { label: 'Fila de Editais', value: counts.fila_edital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Editais aguardando publicação' },
    { label: 'Em Andamento', value: counts.em_andamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Processos seletivos ativos' },
    { label: 'Concluídas', value: counts.concluidas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', description: 'Vagas concluídas' },
    { label: 'Mov. Interna', value: counts.movimentacao_interna, icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50', description: 'Transferências e remanejamentos' },
    { label: 'Liderança', value: counts.vagas_lideranca, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Vagas estratégicas' },
    { label: 'Cadastro Reserva', value: totalCR, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Bancos ativos disponíveis' },
    { label: 'Convocados', value: totalConvocados, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Total de convocações realizadas' },
    { label: 'Bancos Vencidos', value: totalVencidos, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', description: 'Bancos com validade expirada' },
    { label: 'Bancos Prorrogados', value: totalProrrogados, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Bancos com prazo estendido' },
    { label: 'CR Disponível', value: totalCadastroReservaDisponiveis, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Bancos válidos para convocação' },
    { label: 'Total Banco de Talentos', value: totalBancoTotal, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50', description: 'Todos os bancos cadastrados' },
    { label: 'Vagas em Atraso', value: counts.atrasadas, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', description: 'Sem movimentação há 10+ dias' },
    { label: 'Tarefas Pendentes', value: totalTarefasPendentes, icon: Bell, color: 'text-red-600', bg: 'bg-red-50', description: 'Tarefas aguardando ação' },
  ], [totalVagas, counts, totalCR, totalConvocados, totalVencidos, totalCadastroReservaDisponiveis, totalProrrogados, totalBancoTotal, totalTarefasPendentes]);

  const chartData = useMemo(() => {
    if (chartMode === 'regiao') {
      const regionMap = new Map<string, { total: number, abertas: number }>();
      vagas.forEach(v => {
        if (!v.unidade) return;
        const region = getRegionForUnit(v.unidade);
        const current = regionMap.get(region) || { total: 0, abertas: 0 };
        const categoria = getCategoriaStatus(v);
        current.total += 1;
        if (categoria !== 'concluidas' && categoria !== 'vagas_interrompidas') {
          current.abertas += 1;
        }
        regionMap.set(region, current);
      });
      return Array.from(regionMap.entries())
        .map(([name, data]) => ({ name, total: data.total, abertas: data.abertas }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total);
    }

    const groupedMap = new Map<string, { total: number, abertas: number }>();
    vagas.forEach(v => {
      if (!v.unidade) return;
      const normalizedName = normalizeUnitName(v.unidade);
      if (!normalizedName) return;
      const current = groupedMap.get(normalizedName) || { total: 0, abertas: 0 };
      const categoria = getCategoriaStatus(v);
      current.total += 1;
      if (categoria !== 'concluidas' && categoria !== 'vagas_interrompidas') {
        current.abertas += 1;
      }
      groupedMap.set(normalizedName, current);
    });
    return Array.from(groupedMap.entries())
      .map(([name, data]) => ({ 
        name, 
        total: data.total, 
        abertas: data.abertas,
        region: getRegionForUnit(name) 
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [vagas, chartMode]);

  const alerts = useMemo(() => vagas.filter((v) => {
    const status = v.status;
    if (['CONCLUÍDAS', 'CANCELADAS', 'SUSPENSA'].includes(status)) return false;
    const lastHist = v.historico?.[v.historico.length - 1];
    const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
    return calcDiasAberto(baseDate) > 10;
  }), [vagas]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Visão Geral do Provimento</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group overflow-hidden bg-white relative">
            <div className={`h-1 w-full absolute top-0 left-0 ${stat.bg.replace('/5', '')} opacity-40`}></div>
            <CardContent className="p-5">
              <div className={`p-2 rounded-lg ${stat.bg} w-fit mb-3 group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 leading-tight">{stat.label}</p>
              <div className="flex flex-col gap-0.5">
                <p className="text-2xl font-bold text-slate-900 tracking-tighter">{stat.value}</p>
                {stat.description && (
                  <p className="text-[9px] font-bold text-slate-400 italic leading-none">{stat.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unit View */}
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 mb-6 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Visão Estratégica {chartMode === 'regiao' ? 'por Região' : 'por Unidade'}
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 ml-10.5">Distribuição geográfica de processos e demandas ativas.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setChartMode('unidade')}
                  className={`text-[10px] font-bold px-3 py-1.5 transition-all uppercase tracking-wider ${
                    chartMode === 'unidade' 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Por Unidade
                </button>
                <button
                  onClick={() => setChartMode('regiao')}
                  className={`text-[10px] font-bold px-3 py-1.5 transition-all uppercase tracking-wider ${
                    chartMode === 'regiao' 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Por Região
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
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
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      if (chartMode === 'unidade' && data.region) {
                        return [`${value} vagas`, `${name} (${data.region})`];
                      }
                      return [`${value} vagas`, name];
                    }}
                  />
                  <Bar 
                    dataKey="abertas" 
                    fill="#1e3a5f" 
                    radius={[0, 4, 4, 0]} 
                    barSize={18}
                  >
                    <LabelList 
                      dataKey="abertas" 
                      position="right" 
                      style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                      offset={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vagas em Atraso */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Vagas em Atraso</CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mais de 10 dias sem movimentação</p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border border-amber-200 shadow-sm">
                {alerts.length} Pendências
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {alerts.slice(0, 5).map((v) => (
                  <div key={v.id} className="p-5 hover:bg-slate-50/50 transition-all cursor-pointer group flex items-start gap-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-300 group-hover:text-primary/40 transition-colors uppercase">#{v.requisicao || v.numero_requisicao}</span>
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 uppercase bg-white border border-amber-100 px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" /> {calcDiasAberto(v.historico?.[v.historico.length - 1]?.data || v.data_recebimento || v.data_abertura)}d
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
            <Button variant="ghost" className="w-full text-[11px] font-bold text-primary hover:bg-primary/5 uppercase tracking-[0.15em] transition-all">
              Gestão de Gargalos <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
