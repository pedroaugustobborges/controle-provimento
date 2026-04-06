import { useState } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, ETAPA_LABELS } from '@/types/vaga';
import { calcDiasAberto, formatDate, getEtapaColor } from '@/lib/vagaUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['hsl(213,70%,45%)', 'hsl(38,92%,50%)', 'hsl(280,50%,55%)', 'hsl(199,89%,48%)', 'hsl(142,60%,42%)', 'hsl(0,0%,70%)', 'hsl(0,65%,55%)'];

export default function GestorPage() {
  const { vagas, editais } = useVagasStore();
  const [filterUnidade, setFilterUnidade] = useState('all');
  const unidades = [...new Set(vagas.map((v) => v.unidade))];

  const filtered = filterUnidade === 'all' ? vagas : vagas.filter((v) => v.unidade === filterUnidade);

  const statusData = Object.entries(STATUS_LABELS).map(([k, v], i) => ({
    name: v,
    value: filtered.filter((vg) => vg.status_geral === k).length,
  })).filter((d) => d.value > 0);

  const tipoData = Object.entries(TIPO_VAGA_LABELS).map(([k, v]) => ({
    name: v,
    value: filtered.filter((vg) => vg.tipo_vaga === k).length,
  })).filter((d) => d.value > 0);

  const vagasEncerradas = filtered.filter((v) => v.data_encerramento);
  const tempoMedio = vagasEncerradas.length > 0
    ? Math.round(vagasEncerradas.reduce((acc, v) => acc + calcDiasAberto(v.data_abertura, v.data_encerramento), 0) / vagasEncerradas.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Visão Gestor</h2>
        <Select value={filterUnidade} onValueChange={setFilterUnidade}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas Unidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Unidades</SelectItem>
            {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total de Vagas</p><p className="text-3xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Em Andamento</p><p className="text-3xl font-bold">{filtered.filter((v) => !['encerrada', 'finalizada', 'cancelada'].includes(v.status_geral)).length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Tempo Médio (dias)</p><p className="text-3xl font-bold">{tempoMedio}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Por Tipo de Vaga</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tipoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Vagas" fill="hsl(213,70%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Todas as Vagas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Requisição</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Abertura</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Dias</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Analista</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs">{v.numero_requisicao}</td>
                    <td className="p-3">{v.cargo}</td>
                    <td className="p-3 text-muted-foreground">{v.unidade}</td>
                    <td className="p-3"><StatusBadge status={v.status_geral} /></td>
                    <td className="p-3 text-xs">{formatDate(v.data_abertura)}</td>
                    <td className="p-3 text-xs">{calcDiasAberto(v.data_abertura, v.data_encerramento)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{v.analista_responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
