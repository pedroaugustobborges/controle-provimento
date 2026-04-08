import { useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate, CATEGORIAS_STATUS, isVitoriaUnit, getCategoriaStatus, normalizeUnitName } from '@/lib/vagaUtils';
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
  RefreshCw
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
  const { vagas, validacoes, getBancoByVaga } = useVagasStore();
  const navigate = useNavigate();

  // Stats calculation
  const getStatusCount = (status: string) => vagas.filter((v) => (v.status || v.status_geral) === status).length;
  
  const totalVagas = vagas.length;
  
  const counts = useMemo(() => {
    const acc = {
      em_andamento: 0,
      aguardando_unidade: 0,
      sem_status: 0,
      lideranca: 0,
      movimentacao_interna: 0,
      encerradas: 0,
      outros: 0,
    };
    
    vagas.forEach(v => {
      const status = (v.status || v.status_geral) as string;
      const cat = getCategoriaStatus(status);
      acc[cat]++;
    });
    
    return acc;
  }, [vagas]);

  const emAndamento = counts.em_andamento;
  const aguardandoUnidade = counts.aguardando_unidade;
  const semStatusCount = counts.sem_status;
  const liderancaCount = counts.lideranca;
  const movimentacaoCount = counts.movimentacao_interna;
  const encerradas = counts.encerradas;
  const suspensasCanceladas = counts.outros;

  const emValidacao = validacoes.filter((v) => v.status_validacao === 'pendente').length;
  const comBancoValido = vagas.filter(v => getBancoByVaga(v.id)).length;


  const stats = [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Em Andamento', value: emAndamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aguardando Unidade', value: aguardandoUnidade, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Liderança', value: liderancaCount, icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Movimentação Int.', value: movimentacaoCount, icon: RefreshCw, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Suspensas/Canc.', value: suspensasCanceladas, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Sem Status', value: semStatusCount, icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50' },
    { label: 'Vagas com Banco', value: comBancoValido, icon: Database, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Encerradas', value: encerradas, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const alerts = vagas.filter((v) => {
    const status = v.status || v.status_geral;
    if (['encerrada', 'finalizada', 'cancelada', 'admissao_efetivada'].includes(status as string)) return false;
    const lastHist = v.historico[v.historico.length - 1];
    return !lastHist || calcDiasAberto(lastHist.data) > 10;
  });

  const chartData = useMemo(() => {
    // 1. Audit unique units and their counts from the store for transparency
    const rawUnits = vagas.map(v => v.unidade).filter(Boolean);
    const uniqueRawUnits = [...new Set(rawUnits)];
    const auditStats = uniqueRawUnits.map(u => ({
      original: u,
      count: vagas.filter(v => v.unidade === u).length
    }));
    console.log('AUDIT DASHBOARD: Unidades e contagens cruas do store:', auditStats);

    const normalizeUnitName = (name: string): string => {
      if (!name) return '';
      const upper = name.toUpperCase().trim();
      
      // Explicit AGIR units mapping for absolute precision
      if (upper.includes('HECAD')) return 'HECAD';
      if (upper.includes('HUGOL')) return 'HUGOL';
      if (upper.includes('CRER')) return 'CRER';
      if (upper.includes('HDS')) return 'HDS';
      if (upper.includes('POLICLINICA') || upper.includes('POLICLÍNICA')) return 'POLICLÍNICA';
      
      if (isVitoriaUnit(name)) return 'VITÓRIA';
      
      // Standard cleanup for other units while preserving the core name
      return upper
        .replace(/^(HOSPITAL|UNIDADE|HOSP)\s+/i, '')
        .replace(/^(ESTADUAL\s+)/i, '')
        .replace(/\s*\(.*\)/g, '')
        .trim();
    };

    const groupedMap = new Map<string, { total: number, abertas: number }>();
    
    vagas.forEach(v => {
      if (!v.unidade) return;
      
      const normalizedName = normalizeUnitName(v.unidade);
      // Skip Corporativo specifically if present as requested/maintained
      if (!normalizedName || normalizedName.includes('CORPORATIVO')) return;

      const current = groupedMap.get(normalizedName) || { total: 0, abertas: 0 };
      current.total += 1;
      
      const status = (v.status || v.status_geral || '').toLowerCase();
      if (status === 'aberta') {
        current.abertas += 1;
      }
      groupedMap.set(normalizedName, current);
    });

    // 2. Double-check validation against independent filter logic
    return Array.from(groupedMap.entries())
      .map(([name, data]) => {
        // Cross-check: find all vagas that normalize to this unit name
        const independentCount = vagas.filter(v => v.unidade && normalizeUnitName(v.unidade) === name).length;
        
        if (independentCount !== data.total) {
          console.warn(`[Double-Check] Divergência na unidade ${name}: Map=${data.total}, Independent=${independentCount}`);
        }

        return {
          name,
          total: independentCount, // Prioritize the independent count to guarantee accuracy
          abertas: data.abertas,
        };
      })
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-5">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Total</span>
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
                    dataKey="total" 
                    name="Processos Totais" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24} 
                    animationDuration={1500}
                  >
                    <LabelList 
                      dataKey="total" 
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
                          <Clock className="h-3 w-3" /> {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)}d
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate leading-snug">{v.cargo}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Building2 className="h-3 w-3 opacity-50" /> {isVitoriaUnit(v.unidade) ? 'VITÓRIA' : v.unidade.toUpperCase()}
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{isVitoriaUnit(v.unidade) ? 'VITÓRIA' : v.unidade.toUpperCase()}</span>
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
                          {v.historico.length > 0 ? formatDate(v.historico[v.historico.length - 1].data) : formatDate(v.data_abertura)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase mt-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Há {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)} dias</span>
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
    </div>
  );
}