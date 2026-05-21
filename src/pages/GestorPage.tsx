import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, ETAPA_LABELS } from '@/types/vaga';
import { calcDiasAberto, formatDate, getEtapaColor, isVitoriaUnit } from '@/lib/vagaUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, History, FileSpreadsheet, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';


const PIE_COLORS = ['hsl(213,70%,45%)', 'hsl(38,92%,50%)', 'hsl(280,50%,55%)', 'hsl(199,89%,48%)', 'hsl(142,60%,42%)', 'hsl(0,0%,70%)', 'hsl(0,65%,55%)'];

export default function GestorPage() {
  const { vagas, editais, importHistory } = useVagasStore();
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  
  const allUnidades = [...new Set(vagas.map((v) => v.unidade))].filter(Boolean).sort();
  const unidades = allUnidades;

  const filtered = filterUnidade === 'all' 
    ? vagas 
    : vagas.filter((v) => v.unidade === filterUnidade);

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
      <PageHeader 
        title="Administração e Gestão"
        actions={
          <>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner mr-2">
              <button 
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Indicadores
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Histórico
              </button>
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[200px] bg-white border-slate-200 h-10 rounded-xl font-bold text-xs"><SelectValue placeholder="Todas Unidades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />


      {activeTab === 'stats' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm"><CardContent className="pt-6"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Vagas</p><p className="text-3xl font-bold text-slate-800">{filtered.length}</p></CardContent></Card>
            <Card className="border-slate-200 shadow-sm"><CardContent className="pt-6"><p className="text-xs font-bold text-primary uppercase tracking-wider">Em Andamento</p><p className="text-3xl font-bold text-slate-800">{filtered.filter((v) => !['encerrada', 'finalizada', 'cancelada'].includes(v.status_geral)).length}</p></CardContent></Card>
            <Card className="border-slate-200 shadow-sm"><CardContent className="pt-6"><p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Tempo Médio (dias)</p><p className="text-3xl font-bold text-slate-800">{tempoMedio}</p></CardContent></Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 bg-slate-50/50 border-b"><CardTitle className="text-slate-500">Por Unidade</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-2">
                {unidades.map(u => (
                  <div key={u} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{u}</span>
                    <Badge variant="secondary" className="font-bold">
                      {vagas.filter(v => v.unidade === u).length}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 bg-slate-50/50 border-b"><CardTitle className="text-slate-500">Por Analista</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-2">
                {[...new Set(vagas.map(v => v.analista_responsavel))].map(a => (
                  <div key={a} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{a}</span>
                    <Badge variant="secondary" className="font-bold bg-blue-50 text-blue-700">{vagas.filter(v => v.analista_responsavel === a).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 bg-slate-50/50 border-b"><CardTitle className="text-slate-500">Por Assistente</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-2">
                {[...new Set(vagas.flatMap(v => v.assistentes || []))].map(a => (
                  <div key={a} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{a}</span>
                    <Badge variant="secondary" className="font-bold bg-purple-50 text-purple-700">{vagas.filter(v => (v.assistentes || []).includes(a)).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 border-b bg-slate-50/50"><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Distribuição por Status</CardTitle></CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false} stroke="none">
                      {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 border-b bg-slate-50/50"><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Distribuição por Tipo</CardTitle></CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tipoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,94%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" name="Vagas" fill="hsl(213,70%,45%)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b bg-slate-50/50"><CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Listagem Consolidada</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisição</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Analista</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs text-primary font-bold">{v.numero_requisicao}</TableCell>
                        <TableCell className="font-semibold text-slate-700">{v.cargo}</TableCell>
                        <TableCell className="text-slate-500">{v.unidade}</TableCell>
                        <TableCell><StatusBadge status={v.status_geral} /></TableCell>
                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">{formatDate(v.data_abertura)}</TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[11px]">
                            {calcDiasAberto(v.data_abertura, v.data_encerramento)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">{v.analista_responsavel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg font-bold">Histórico de Importações</CardTitle>
                <CardDescription>Registro de todas as cargas de dados realizadas via Excel.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Novos</TableHead>
                    <TableHead>Repetições</TableHead>
                    <TableHead>Erros</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.length > 0 ? importHistory.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">{new Date(h.data).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600">{h.usuario}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]">{h.nome_arquivo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold">{h.total_lidos}</TableCell>
                      <TableCell className="text-center text-green-600 font-bold">{h.total_novos}</TableCell>
                      <TableCell className="text-center text-amber-600 font-bold">{h.repeticoes_tratadas}</TableCell>
                      <TableCell className="text-center text-red-600 font-bold">{h.total_erros}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 text-[11px] font-bold uppercase tracking-wider`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                          <History className="h-10 w-10" />
                          <p className="font-medium">Nenhuma importação realizada até o momento.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
