import { useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  calcDiasAberto, normalizeUnitName, 
  getCategoriaStatus, getValidVacancyBase, CATEGORIAS_STATUS
} from '@/lib/vagaUtils';
import { 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Activity,
  Users,
  Building2,
  ShieldCheck,
  CheckCircle,
  Star,
  XCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { 
    vagas: allVagas = [], 
    getBancoByVaga
  } = useVagasStore();

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
      vagas_interrompidas: 0,
      vagas_lideranca: 0,
      convocacao: 0,
      aguardando_unidade: 0,
      com_banco_valido: 0
    };
    
    vagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      
      if (acc[cat] !== undefined) {
        acc[cat]++;
      }

      if (getBancoByVaga(v.id)) {
        acc.com_banco_valido++;
      }
    });
    
    return acc;
  }, [vagas, getBancoByVaga]);

  const stats = useMemo(() => [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Fila de Editais', value: counts.fila_edital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em Andamento', value: counts.em_andamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Concluídas', value: counts.concluidas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Vagas de Liderança', value: counts.vagas_lideranca, icon: Star, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Convocações', value: counts.convocacao, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Vagas Interrompidas', value: counts.vagas_interrompidas, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Aguardando Unidade', value: counts.aguardando_unidade, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Com Banco Válido', value: counts.com_banco_valido, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ], [totalVagas, counts]);

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header Section */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden bg-white">
            <div className={`h-1 w-full absolute top-0 left-0 ${stat.bg.replace('/5', '')} opacity-40`}></div>
            <CardContent className="p-5">
              <div className={`p-2 rounded-lg ${stat.bg} w-fit mb-3 group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 leading-tight">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unit View - Modernized Bar Chart */}
      <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col">
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
        <CardContent className="pb-8">
          <div className="h-[450px] w-full mt-4 pr-6">
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
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}