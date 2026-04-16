import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, LabelList } from 'recharts';

const truncateLabel = (value: string, max = 22) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : value;
import { Users, Building2, Briefcase, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';

interface ConvocacaoData {
  status: string | null;
  unidade: string | null;
  cargo: string | null;
  unidade_convocacao: string | null;
  data_convocacao: string | null;
}

const SOFT_COLORS = [
  'hsl(221, 50%, 62%)',
  'hsl(152, 45%, 50%)',
  'hsl(0, 55%, 62%)',
  'hsl(30, 60%, 58%)',
  'hsl(270, 40%, 58%)',
  'hsl(199, 50%, 55%)',
  'hsl(340, 45%, 58%)',
  'hsl(180, 40%, 50%)',
];

const unidadesChartConfig: ChartConfig = {
  value: { label: 'Convocações', color: 'hsl(221, 50%, 62%)' },
};

const cargosChartConfig: ChartConfig = {
  value: { label: 'Convocações', color: 'hsl(152, 45%, 50%)' },
};

export default function ConvocacoesDashboardPage() {
  const [data, setData] = useState<ConvocacaoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows, error } = await supabase
        .from('banco_candidatos')
        .select('status, unidade, cargo, unidade_convocacao, data_convocacao')
        .not('status', 'is', null);

      if (!error && rows) {
        setData(rows as ConvocacaoData[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const total = data.length;
    const convocados = data.filter(d => d.status?.toUpperCase() === 'CONVOCADO').length;
    const cadastroReserva = data.filter(d => d.status?.toUpperCase() === 'CADASTRO RESERVA').length;
    const vencidos = data.filter(d => d.status?.toUpperCase() === 'VENCIDO').length;
    return { total, convocados, cadastroReserva, vencidos };
  }, [data]);

  const topUnidades = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
      const u = (d.unidade_convocacao || d.unidade || 'Não informada').toUpperCase().trim();
      counts[u] = (counts[u] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  const topCargos = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
      const c = (d.cargo || 'Não informado').toUpperCase().trim();
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  const historicoConvocacoes = useMemo(() => {
    const byDate: Record<string, { total: number; unidades: Record<string, number> }> = {};
    data
      .filter(d => d.status?.toUpperCase() === 'CONVOCADO' && d.data_convocacao)
      .forEach(d => {
        const date = (d.data_convocacao || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        const unidade = (d.unidade_convocacao || d.unidade || 'Não informada').toUpperCase().trim();
        if (!byDate[date]) byDate[date] = { total: 0, unidades: {} };
        byDate[date].total += 1;
        byDate[date].unidades[unidade] = (byDate[date].unidades[unidade] || 0) + 1;
      });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, info]) => {
        const [y, m, d] = date.split('-');
        return {
          date,
          label: `${d}/${m}`,
          total: info.total,
          unidades: Object.entries(info.unidades).sort(([, a], [, b]) => b - a),
        };
      });
  }, [data]);

  const historicoChartConfig: ChartConfig = {
    total: { label: 'Convocações', color: 'hsl(221, 50%, 62%)' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard de Convocações" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total de Registros" value={metrics.total} color="text-primary" bg="bg-primary/10" />
        <MetricCard icon={CheckCircle2} label="Convocados" value={metrics.convocados} color="text-emerald-500" bg="bg-emerald-500/10" />
        <MetricCard icon={Clock} label="Cadastro Reserva" value={metrics.cadastroReserva} color="text-blue-500" bg="bg-blue-500/10" />
        <MetricCard icon={XCircle} label="Vencidos" value={metrics.vencidos} color="text-destructive" bg="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top 5 Unidades com Mais Convocações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={unidadesChartConfig} className="h-[320px] w-full">
              <BarChart data={topUnidades} layout="vertical" margin={{ left: 16, right: 40, top: 8, bottom: 8 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => truncateLabel(v, 24)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 8, 8, 0]} barSize={28}>
                  <LabelList dataKey="value" position="right" className="fill-foreground" fontSize={11} fontWeight={600} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Top 5 Cargos Mais Convocados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cargosChartConfig} className="h-[320px] w-full">
              <BarChart data={topCargos} layout="vertical" margin={{ left: 16, right: 40, top: 8, bottom: 8 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={210} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => truncateLabel(v, 26)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 8, 8, 0]} barSize={28}>
                  <LabelList dataKey="value" position="right" className="fill-foreground" fontSize={11} fontWeight={600} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Histórico de Convocações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historicoConvocacoes.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                Sem convocações registradas ainda.
              </div>
            ) : (
              <ChartContainer config={historicoChartConfig} className="h-[320px] w-full">
                <LineChart data={historicoConvocacoes} margin={{ left: 8, right: 24, top: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <ChartTooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} content={<HistoricoTooltip />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(221, 50%, 62%)', strokeWidth: 0 }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="total" position="top" fontSize={11} fontWeight={600} className="fill-foreground" />
                  </Line>
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value.toLocaleString('pt-BR')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
