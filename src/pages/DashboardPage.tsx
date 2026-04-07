import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate } from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS } from '@/types/vaga';
import { 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
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
  CheckCircle
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
} from 'recharts';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { vagas, validacoes } = useVagasStore();
  const navigate = useNavigate();

  // Stats calculation
  const getStatusCount = (status: string) => vagas.filter((v) => (v.status || v.status_geral) === status).length;
  
  const abertas = getStatusCount('aberta');
  const emAndamento = vagas.filter((v) => ['em_triagem', 'entrevista', 'documentacao', 'realizar_convocacao'].includes((v.status || v.status_geral) as string)).length;
  const emEdital = getStatusCount('em_edital') + getStatusCount('publicado_edital');
  const emValidacao = validacoes.filter((v) => v.status_validacao === 'pendente').length;
  const encerradas = vagas.filter((v) => ['encerrada', 'finalizada', 'admissao_efetivada'].includes((v.status || v.status_geral) as string)).length;

  const convocacoesHoje = 12; // Mock data for now

  const stats = [
    { label: 'Vagas Abertas', value: abertas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Em Andamento', value: emAndamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Em Edital', value: emEdital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em Validação', value: emValidacao, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Encerradas', value: encerradas, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Convocações do Dia', value: convocacoesHoje, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  const alerts = vagas.filter((v) => {
    const status = v.status || v.status_geral;
    if (['encerrada', 'finalizada', 'cancelada', 'admissao_efetivada'].includes(status as string)) return false;
    const lastHist = v.historico[v.historico.length - 1];
    return !lastHist || calcDiasAberto(lastHist.data) > 10;
  });

  const unidades = [...new Set(vagas.map((v) => v.unidade))];
  const chartData = unidades.map((u) => ({
    name: u.replace('Hospital ', '').replace('Unidade ', ''),
    total: vagas.filter((v) => v.unidade === u).length,
    abertas: vagas.filter((v) => v.unidade === u && (v.status === 'aberta' || v.status_geral === 'aberta')).length,
  })).sort((a, b) => b.total - a.total);


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral de Provimento</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Acompanhamento estratégico e operacional de processos seletivos, editais e fluxo de contratações AGIR.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs font-semibold h-9 border-slate-200 shadow-sm">
            Exportar Relatório
          </Button>
          <Button className="text-xs font-semibold h-9 shadow-sm">
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-5">
              <div className={`p-2 rounded-lg ${stat.bg} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold mt-1 text-slate-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unit View */}
        <Card className="lg:col-span-2 border-slate-200/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 mb-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Visão por Unidade
              </CardTitle>
              <CardDescription className="text-xs">Distribuição de processos ativos por complexo hospitalar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total" name="Total de Processos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.7)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Operational Alerts */}
        <Card className="border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas Operacionais
              </CardTitle>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {alerts.length} Pendências
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="divide-y divide-slate-100">
              {alerts.slice(0, 5).map((v) => (
                <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{v.numero_requisicao}</span>
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 uppercase">
                      <Clock className="h-3 w-3" /> {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)} dias
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{v.cargo}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> {v.unidade}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-3 bg-slate-50/50 border-t border-slate-100">
            <Button variant="ghost" className="w-full text-[11px] font-bold text-primary hover:bg-primary/5 uppercase tracking-wider">
              Ver todos os alertas <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activities Section */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Atividades Recentes</CardTitle>
            <CardDescription className="text-xs">Últimas movimentações nos processos seletivos e editais.</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar..." 
                className="pl-8 h-9 text-xs border border-slate-200 rounded-lg w-40 bg-white focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                  <th className="px-6 py-3.5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Requisição</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Cargo e Unidade</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Última Atualização</th>
                  <th className="px-6 py-3.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vagas.slice(0, 5).map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/50 cursor-pointer transition-all duration-150"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="px-6 py-4 font-mono text-[11px] font-bold text-primary">{v.numero_requisicao}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">{v.cargo}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{v.unidade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-tighter">
                        {TIPO_VAGA_LABELS[v.tipo_vaga]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={v.status_geral} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-600">
                          {v.historico.length > 0 ? formatDate(v.historico[v.historico.length - 1].data) : formatDate(v.data_abertura)}
                        </span>
                        <span className="text-[10px] text-slate-400">Há {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)} dias</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/vagas')} 
              className="text-xs text-primary font-bold hover:bg-primary/5 uppercase tracking-widest"
            >
              Ver todos os processos <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
