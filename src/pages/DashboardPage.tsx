import { useMemo, useEffect } from 'react';
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
  XCircle,
  AlertTriangle,
  Database,
  AlertCircle,
  Bell,
  RefreshCw,
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
import { PageHeader } from '@/components/PageHeader';

export default function DashboardPage() {
  const { 
    vagas: allVagas = [], 
    getBancoByVaga,
    bancos = [],
    validacoes = [],
    convocacoes = [],
    tarefas = [],
    fetchVagas,
    fetchBancos
  } = useVagasStore();
  const { selectedRegion, selectedUnit } = useAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (allVagas.length === 0 || (allVagas.length > 0 && allVagas[0].id.startsWith('mock-'))) {
      fetchVagas();
    }
    if (bancos.length === 0 || (bancos.length > 0 && bancos[0].id.startsWith('mock-'))) {
      fetchBancos();
    }
  }, [allVagas.length, bancos.length, fetchVagas, fetchBancos]);

  // Canonical base for dashboard - using the same parity rule as Excel + Region/Unit filters
  const vagas = useMemo(() => {
    const base = filterByRegionAndUnit(allVagas, selectedRegion, selectedUnit);
    return getValidVacancyBase(base, 'TODOS', 'TODOS');
  }, [allVagas, selectedRegion, selectedUnit]);

  // Filter bancos by region/unit as well
  const filteredBancos = useMemo(() => {
    return filterByRegionAndUnit(bancos, selectedRegion, selectedUnit);
  }, [bancos, selectedRegion, selectedUnit]);

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
      cancelada: 0,
      dispensa: 0,
      atrasadas: 0,
    };
    
    vagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      if (acc[cat] !== undefined) {
        acc[cat]++;
      }
      
      const status = (v.status || '').toLowerCase();
      if (status.includes('movimentacao interna') || status === 'movimentacao_interna') acc.movimentacao_interna++;
      if (status === 'cancelada' || status === 'cancelado') acc.cancelada++;
      if (status === 'dispensa') acc.dispensa++;
      
      // Check if delayed (> 10 days since last history or opening)
      const lastHist = v.historico?.[v.historico.length - 1];
      const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
      if (calcDiasAberto(baseDate) > 10 && !['CONCLUÍDAS', 'CANCELADAS', 'SUSPENSA'].includes(v.status)) {
        acc.atrasadas++;
      }
    });
    
    return acc;
  }, [vagas]);

  // REGRA DE AGRUPAMENTO DO BANCO (Item 3 e 4)
  const groupedBancos = useMemo(() => {
    const groups: Record<string, {
      id: string;
      status: string;
      isProrrogado: boolean;
      qtdBanco: number;
      candidatesCount: number;
    }> = {};

    bancos.forEach(b => {
      const cargoNorm = b.cargo_normalizado || normalizeCargo(b.cargo);
      const key = b.numero_processo_seletivo 
        ? `PS-${b.numero_processo_seletivo}`
        : `${b.numero_edital}-${b.unidade}-${cargoNorm}`;

      if (!groups[key]) {
        // Quantidade do banco daquela vaga/grupo
        let qtd = 0;
        const rawQtd = b.quantidade_banco;
        if (typeof rawQtd === 'number') {
          qtd = rawQtd;
        } else if (rawQtd) {
          qtd = parseInt(String(rawQtd).replace(/[^\d]/g, '')) || 0;
        }

        groups[key] = {
          id: b.id,
          status: b.status,
          isProrrogado: b.is_prorrogado,
          qtdBanco: qtd,
          candidatesCount: 0
        };
      }
      groups[key].candidatesCount++;
    });

    return Object.values(groups);
  }, [bancos]);

  // Card Cadastro Reserva (Item 1) - Soma da quantidade de banco dos grupos CR (não prorrogados)
  const totalCR = useMemo(() => {
    return groupedBancos
      .filter(g => (g.status === 'CADASTRO RESERVA' || g.status === 'valido') && !g.isProrrogado)
      .reduce((sum, g) => sum + g.qtdBanco, 0);
  }, [groupedBancos]);

  // Card Prorrogados - Soma da quantidade de banco dos grupos prorrogados
  const totalProrrogados = useMemo(() => {
    return groupedBancos
      .filter(g => g.isProrrogado || g.status === 'prorrogado')
      .reduce((sum, g) => sum + g.qtdBanco, 0);
  }, [groupedBancos]);

  // Card Com Banco Válido (Item 4) - Soma da quantidade de banco dos grupos com validade vigente
  const totalComBancoValido = useMemo(() => {
    return groupedBancos
      .filter(g => g.status !== 'VENCIDO' && g.status !== 'CONVOCADO')
      .reduce((sum, g) => sum + g.qtdBanco, 0);
  }, [groupedBancos]);

  const totalConvocados = useMemo(() => 
    bancos.filter(b => b.status === 'CONVOCADO').length
  , [bancos]);

  const totalVencidos = useMemo(() => 
    bancos.filter(b => b.status === 'VENCIDO').length
  , [bancos]);

  const totalBancoTotal = useMemo(() => 
    groupedBancos.reduce((sum, g) => sum + g.qtdBanco, 0)
  , [groupedBancos]);

  const totalTarefasPendentes = tarefas.filter(t => t.status === 'pendente').length;

  const stats = useMemo(() => [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Fila de Editais', value: counts.fila_edital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em Andamento', value: counts.em_andamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Concluídas', value: counts.concluidas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Mov. Interna', value: counts.movimentacao_interna, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Liderança', value: counts.vagas_lideranca, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Cadastro Reserva', value: totalCR, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Capacidade de vagas' },
    { label: 'Convocados', value: totalConvocados, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Número de pessoas' },
    { label: 'Vencidos', value: totalVencidos, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', description: 'Número de pessoas' },
    { label: 'Prorrogados', value: totalProrrogados, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Capacidade de vagas' },
    { label: 'Capacidade Vigente', value: totalComBancoValido, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Válidos + Prorrogados' },
    { label: 'Banco Total', value: totalBancoTotal, icon: Database, color: 'text-slate-600', bg: 'bg-slate-50', description: 'Soma total de bancos' },
    { label: 'Canceladas', value: counts.cancelada, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Dispensa', value: counts.dispensa, icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Etapas em Atraso', value: counts.atrasadas, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Tarefas Pendentes', value: totalTarefasPendentes, icon: Bell, color: 'text-red-600', bg: 'bg-red-50' },
  ], [totalVagas, counts, totalCR, totalConvocados, totalVencidos, totalComBancoValido, totalProrrogados, totalTarefasPendentes]);

  const chartData = useMemo(() => {
    const groupedMap = new Map<string, { total: number, abertas: number }>();
    
    vagas.forEach(v => {
      if (!v.unidade) return;
      
      const normalizedName = normalizeUnitName(v.unidade);
      if (!normalizedName) return;

      const current = groupedMap.get(normalizedName) || { total: 0, abertas: 0 };
      const categoria = getCategoriaStatus(v);
      
      current.total += 1;
      
      // Vaga aberta é aquela que NÃO está encerrada ou interrompida
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
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [vagas]);

  const alerts = useMemo(() => vagas.filter((v) => {
    const status = v.status;
    if (['CONCLUÍDAS', 'CANCELADAS', 'SUSPENSA'].includes(status)) return false;
    
    const lastHist = v.historico?.[v.historico.length - 1];
    const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
    return calcDiasAberto(baseDate) > 10;
  }), [vagas]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <PageHeader 
        title="Visão Geral de Provimento"
        subtitle="Monitoramento estratégico em tempo real dos processos seletivos e fluxo de contratações AGIR."
        badge="Painel Operacional"
        withBackground={true}
        actions={
          <>
            <Button variant="outline" className="text-xs font-bold h-10 px-5 border-slate-200 hover:bg-slate-50 text-slate-600 transition-all rounded-xl shadow-sm">
              Relatórios Detalhados
            </Button>
            <Button className="text-xs font-bold h-10 px-5 bg-primary hover:bg-primary/90 text-white transition-all rounded-xl shadow-lg shadow-primary/20">
              Novo Processo Seletivo
            </Button>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden bg-white">
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
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 mb-6 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
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
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Abertas</span>
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
                  />
                  <Bar 
                    dataKey="abertas" 
                    fill="var(--primary)" 
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

        {/* Operational Alerts */}
        <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-800">Alertas Ativos</CardTitle>
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
