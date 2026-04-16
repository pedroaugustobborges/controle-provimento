import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, Building2, Briefcase, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ConvocacaoData {
  status: string | null;
  unidade: string | null;
  cargo: string | null;
  unidade_convocacao: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  'CONVOCADO': 'hsl(var(--primary))',
  'CADASTRO RESERVA': 'hsl(142, 76%, 36%)',
  'VENCIDO': 'hsl(0, 84%, 60%)',
  'DESISTIU': 'hsl(25, 95%, 53%)',
  'FALTOU': 'hsl(280, 67%, 51%)',
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(280, 67%, 51%)', 'hsl(199, 89%, 48%)'];

export default function ConvocacoesDashboardPage() {
  const [data, setData] = useState<ConvocacaoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows, error } = await supabase
        .from('banco_candidatos')
        .select('status, unidade, cargo, unidade_convocacao')
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
      .map(([name, value]) => ({ name, value }));
  }, [data]);

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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total de Registros" value={metrics.total} color="text-primary" />
        <MetricCard icon={CheckCircle2} label="Convocados" value={metrics.convocados} color="text-green-600" />
        <MetricCard icon={Clock} label="Cadastro Reserva" value={metrics.cadastroReserva} color="text-blue-600" />
        <MetricCard icon={XCircle} label="Vencidos" value={metrics.vencidos} color="text-red-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top 5 Unidades com Mais Convocações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUnidades} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Cargos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Top 5 Cargos Mais Convocados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCargos} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={statusDistribution} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    dataKey="value" 
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
