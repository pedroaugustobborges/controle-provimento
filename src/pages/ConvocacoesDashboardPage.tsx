import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, LabelList, Tooltip as RTooltip } from 'recharts';

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

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
      const s = (d.status || 'Não informado').toUpperCase().trim();
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({ name, value, fill: SOFT_COLORS[index % SOFT_COLORS.length] }));
  }, [data]);

  const dynamicPieConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = { value: { label: 'Quantidade' } };
    statusDistribution.forEach((item, index) => {
      config[item.name] = { label: item.name, color: SOFT_COLORS[index % SOFT_COLORS.length] };
    });
    return config;
  }, [statusDistribution]);

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
              <AlertCircle className="h-4 w-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dynamicPieConfig} className="h-[320px] w-full">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={50}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
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
