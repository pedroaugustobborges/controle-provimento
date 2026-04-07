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
  Bell
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { vagas, validacoes } = useVagasStore();
  const navigate = useNavigate();

  const abertas = vagas.filter((v) => v.status_geral === 'aberta').length;
  const emEdital = vagas.filter((v) => v.status_geral === 'em_edital').length;
  const encerradas = vagas.filter((v) => ['encerrada', 'finalizada'].includes(v.status_geral)).length;
  const pendentesValidacao = validacoes.filter((v) => v.status_validacao === 'pendente').length;

  const vagasEncerradas = vagas.filter((v) => v.data_encerramento);
  const tempoMedio = vagasEncerradas.length > 0
    ? Math.round(vagasEncerradas.reduce((acc, v) => acc + calcDiasAberto(v.data_abertura, v.data_encerramento), 0) / vagasEncerradas.length)
    : 0;

  const semAtualizacao = vagas.filter((v) => {
    if (['encerrada', 'finalizada', 'cancelada'].includes(v.status_geral)) return false;
    const lastHist = v.historico[v.historico.length - 1];
    if (!lastHist) return true;
    return calcDiasAberto(lastHist.data) > 15;
  });

  const unidades = [...new Set(vagas.map((v) => v.unidade))];
  const chartData = unidades.map((u) => ({
    name: u.replace('Hospital ', '').replace('Unidade ', ''),
    total: vagas.filter((v) => v.unidade === u).length,
    abertas: vagas.filter((v) => v.unidade === u && v.status_geral === 'aberta').length,
    edital: vagas.filter((v) => v.unidade === u && v.status_geral === 'em_edital').length,
  }));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Painel Analítico</h1>
        <p className="text-muted-foreground">Monitoramento em tempo real dos processos de recrutamento e seleção.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Processos Ativos', value: abertas + emEdital, trend: '+4%', isUp: true, icon: Activity, color: 'text-primary' },
          { label: 'Em Edital', value: emEdital, trend: '-2%', isUp: false, icon: FileText, color: 'text-warning' },
          { label: 'Pendentes Validação', value: pendentesValidacao, trend: '+12%', isUp: true, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Tempo Médio (dias)', value: tempoMedio, trend: '-15%', isUp: false, icon: Clock, color: 'text-success' },
        ].map((stat, idx) => (
          <Card key={idx} className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-opacity-10 ${stat.color.replace('text-', 'bg-')} transition-transform group-hover:scale-110`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${stat.isUp ? 'text-success' : 'text-destructive'}`}>
                  {stat.trend} {stat.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Distribuição por Unidade
              </CardTitle>
              <CardDescription>Volume de vagas abertas e em edital por hospital.</CardDescription>
            </div>
            <Button variant="outline" size="sm">Ver Relatório Completo</Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="abertas" name="Abertas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="edital" name="Em Edital" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-destructive" /> Alertas Críticos
              </CardTitle>
              <CardDescription>Vagas sem atualização há mais de 15 dias.</CardDescription>
            </div>
            <div className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {semAtualizacao.length} Alertas
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {semAtualizacao.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="bg-success/10 p-4 rounded-full mb-3 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="font-medium text-sm">Operação Regular</p>
                <p className="text-xs text-muted-foreground mt-1">Todos os processos estão sendo atualizados conforme o esperado.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-[400px] overflow-auto">
                {semAtualizacao.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{v.numero_requisicao}</span>
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1 uppercase tracking-tighter">
                        <Clock className="h-3 w-3" />
                        {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)} dias parado
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{v.cargo}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3" /> {v.unidade}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {semAtualizacao.length > 0 && (
              <div className="p-3 border-t bg-muted/20">
                <Button variant="ghost" className="w-full text-xs h-8 text-primary font-medium hover:bg-primary/5">
                  Ver todos os alertas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Processos Recentes</CardTitle>
              <CardDescription>Acompanhamento dos últimos movimentos de recrutamento.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filtrar processos..." 
                  className="pl-8 h-9 text-xs border rounded-lg w-48 bg-background focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Requisição</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cargo / Unidade</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Tipo</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Progresso</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {vagas.slice(0, 6).map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-muted/20 cursor-pointer transition-all duration-150"
                      onClick={() => navigate(`/vagas/${v.id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-medium text-primary">{v.numero_requisicao}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground/90">{v.cargo}</span>
                          <span className="text-[11px] text-muted-foreground">{v.unidade}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-[10px] font-bold uppercase">
                          {TIPO_VAGA_LABELS[v.tipo_vaga]}
                        </span>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={v.status_geral} /></td>
                      <td className="px-6 py-4">
                         <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: v.status_geral === 'aberta' ? '25%' : v.status_geral === 'em_edital' ? '60%' : '100%' }}></div>
                         </div>
                         <span className="text-[10px] text-muted-foreground mt-1 block">
                            {calcDiasAberto(v.data_abertura, v.data_encerramento)} dias em aberto
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t flex justify-center">
               <Button variant="link" onClick={() => navigate('/vagas')} className="text-xs text-primary font-bold">
                  VER TODOS OS PROCESSOS <ArrowUpRight className="ml-1 h-3 w-3" />
               </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Users className="h-24 w-24" />
            </div>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-1">Convocações</h3>
              <p className="text-primary-foreground/80 text-xs mb-6">Acesse o novo módulo de gestão de candidatos aprovados.</p>
              <Button 
                variant="secondary" 
                className="w-full text-xs font-bold"
                onClick={() => navigate('/convocacoes')}
              >
                ACESSAR MÓDULO
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="space-y-1 p-3">
                  {[
                    { date: 'Hoje', title: 'Publicação Edital #2024-05', type: 'Edital' },
                    { date: 'Amanhã', title: 'Integração Novos Colaboradores', type: 'Convocação' },
                    { date: '25/05', title: 'Limite Envio Documentos', type: 'Validação' },
                  ].map((event, i) => (
                    <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                       <div className="flex flex-col items-center justify-center min-w-[40px] px-1 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold">
                          {event.date}
                       </div>
                       <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-semibold truncate leading-tight">{event.title}</span>
                          <span className="text-[10px] text-muted-foreground">{event.type}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}