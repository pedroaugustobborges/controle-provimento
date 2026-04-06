import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { calcDiasAberto, formatDate } from '@/lib/vagaUtils';
import { TIPO_VAGA_LABELS } from '@/types/vaga';
import { Briefcase, FileText, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const COLORS = ['hsl(213,70%,45%)', 'hsl(38,92%,50%)', 'hsl(142,60%,42%)'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Vagas Abertas', value: abertas, icon: Briefcase, color: 'text-primary' },
          { label: 'Em Edital', value: emEdital, icon: FileText, color: 'text-warning' },
          { label: 'Encerradas', value: encerradas, icon: CheckCircle2, color: 'text-success' },
          { label: 'Pendentes Validação', value: pendentesValidacao, icon: AlertTriangle, color: 'text-warning' },
          { label: 'Tempo Médio (dias)', value: tempoMedio, icon: Clock, color: 'text-muted-foreground' },
        ].map((card) => (
          <Card key={card.label} className="bg-card">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Vagas por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="hsl(213,70%,45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="abertas" name="Abertas" fill="hsl(199,89%,48%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="edital" name="Em Edital" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Sem Atualização (+15 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {semAtualizacao.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma vaga com alerta no momento.</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {semAtualizacao.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{v.cargo}</p>
                      <p className="text-xs text-muted-foreground">{v.numero_requisicao} · {v.unidade}</p>
                    </div>
                    <span className="text-xs text-destructive font-medium">
                      {calcDiasAberto(v.historico[v.historico.length - 1]?.data || v.data_abertura)}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vagas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Requisição</th>
                  <th className="pb-2 font-medium text-muted-foreground">Cargo</th>
                  <th className="pb-2 font-medium text-muted-foreground">Unidade</th>
                  <th className="pb-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Dias</th>
                </tr>
              </thead>
              <tbody>
                {vagas.slice(0, 6).map((v) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="py-2.5 font-mono text-xs">{v.numero_requisicao}</td>
                    <td className="py-2.5">{v.cargo}</td>
                    <td className="py-2.5 text-muted-foreground">{v.unidade}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{TIPO_VAGA_LABELS[v.tipo_vaga]}</td>
                    <td className="py-2.5"><StatusBadge status={v.status_geral} /></td>
                    <td className="py-2.5 text-xs">{calcDiasAberto(v.data_abertura, v.data_encerramento)}</td>
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
