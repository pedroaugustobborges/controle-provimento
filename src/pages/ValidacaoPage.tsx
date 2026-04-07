import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { useState } from 'react';

export default function ValidacaoPage() {
  const { convocacoes } = useVagasStore();
  const [search, setSearch] = useState('');

  const pendentes = convocacoes.filter(c => c.status === 'pendente');
  const validadas = convocacoes.filter(c => c.status !== 'pendente');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Validar Convocações</h1>
          <p className="text-slate-500 mt-1">Conferência e validação final do fluxo de convocações (GO-ES).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-white">
            <Lock className="h-4 w-4" /> Bloquear Horários
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Aguardando Validação</p>
                <p className="text-3xl font-bold text-amber-700">{pendentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Validadas (Hoje)</p>
                <p className="text-3xl font-bold text-green-700">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Próximos Agendamentos</p>
                <p className="text-3xl font-bold text-blue-700">14</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-bold text-slate-800">Fila de Conferência</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Filtrar por nome ou unidade..." className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Candidato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Unidade / Cargo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Requisição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{formatDate(c.data_convocacao)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{c.horario}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{c.nome_candidato}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Class: {c.classificacao}º</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">{c.unidade}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{c.cargo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary font-bold">{c.requisicao}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                      {STATUS_CONVOCACAO_LABELS[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-xs font-bold text-primary border-primary/20 hover:bg-primary/5">
                        Validar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendentes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">
                    Tudo pronto! Nenhuma convocação pendente de validação.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
