import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, LabelList } from 'recharts';
import { Users, Building2, Briefcase, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { filterByRegionAndUnit } from '@/lib/vagaUtils';

const truncateLabel = (value: string, max = 22) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : value;

const unidadesChartConfig: ChartConfig = {
  value: { label: 'Convocações', color: 'hsl(221, 50%, 62%)' },
};

const cargosChartConfig: ChartConfig = {
  value: { label: 'Convocações', color: 'hsl(152, 45%, 50%)' },
};

const historicoChartConfig: ChartConfig = {
  total: { label: 'Convocações', color: 'hsl(221, 50%, 62%)' },
};

export default function ConvocacoesDashboardPage() {
  const { convocacoes } = useVagasStore();
  const { currentUser, selectedRegion, selectedUnit: globalUnit } = useAdminStore();

  // Mesma fonte e mesmos filtros de permissão usados em ConvocacoesPage
  const visibleConvocacoes = useMemo(() => {
    const base = filterByRegionAndUnit(convocacoes, selectedRegion, globalUnit);
    return base.filter(c => {
      if (!c.data_convocacao) return false;
      if (
        currentUser &&
        !currentUser.visualiza_todas_unidades &&
        !currentUser.unidades_vinculadas.includes(c.unidade)
      ) {
        return false;
      }
      return true;
    });
  }, [convocacoes, currentUser, selectedRegion, globalUnit]);

  const metrics = useMemo(() => {
    const total = visibleConvocacoes.length;
    const aceites = visibleConvocacoes.filter(c => c.status === 'aceite').length;
    const pendentes = visibleConvocacoes.filter(c => c.status === 'pendente').length;
    const recusas = visibleConvocacoes.filter(c =>
      ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status)
    ).length;
    return { total, aceites, pendentes, recusas };
  }, [visibleConvocacoes]);

  const topUnidades = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleConvocacoes.forEach(c => {
      const u = (c.unidade || 'Não informada').toUpperCase().trim();
      counts[u] = (counts[u] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [visibleConvocacoes]);

  const topCargos = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleConvocacoes.forEach(c => {
      const cargo = (c.cargo || 'Não informado').toUpperCase().trim();
      counts[cargo] = (counts[cargo] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [visibleConvocacoes]);

  const historicoConvocacoes = useMemo(() => {
    const byDate: Record<string, { total: number; unidades: Record<string, number> }> = {};
    visibleConvocacoes.forEach(c => {
      const date = (c.data_convocacao || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const unidade = (c.unidade || 'Não informada').toUpperCase().trim();
      if (!byDate[date]) byDate[date] = { total: 0, unidades: {} };
      byDate[date].total += 1;
      byDate[date].unidades[unidade] = (byDate[date].unidades[unidade] || 0) + 1;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, info]) => {
        const [, m, d] = date.split('-');
        return {
          date,
          label: `${d}/${m}`,
          total: info.total,
          unidades: Object.entries(info.unidades).sort(([, a], [, b]) => b - a),
        };
      });
  }, [visibleConvocacoes]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard de Convocações" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total de Convocações" value={metrics.total} color="text-primary" bg="bg-primary/10" />
        <MetricCard icon={CheckCircle2} label="Aceites" value={metrics.aceites} color="text-emerald-500" bg="bg-emerald-500/10" />
        <MetricCard icon={Clock} label="Pendentes" value={metrics.pendentes} color="text-blue-500" bg="bg-blue-500/10" />
        <MetricCard icon={XCircle} label="Recusas / Faltas" value={metrics.recusas} color="text-destructive" bg="bg-destructive/10" />
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

function HistoricoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as { label: string; total: number; unidades: [string, number][] };
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-lg text-xs min-w-[200px]">
      <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-border/40">
        <span className="font-semibold">Dia {item.label}</span>
        <span className="font-bold text-primary">{item.total} convocação{item.total !== 1 ? 'ões' : ''}</span>
      </div>
      <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
        {item.unidades.map(([unidade, qtd]) => (
          <div key={unidade} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground truncate">{unidade}</span>
            <span className="font-medium tabular-nums">{qtd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
