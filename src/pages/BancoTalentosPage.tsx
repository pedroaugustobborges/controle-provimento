import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Filter, Calendar, Info, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { useState } from 'react';

export default function BancoTalentosPage() {
  const { bancos } = useVagasStore();
  const [search, setSearch] = useState('');

  const filtered = bancos.filter(b => 
    b.cargo.toLowerCase().includes(search.toLowerCase()) || 
    b.unidade.toLowerCase().includes(search.toLowerCase()) ||
    b.numero_edital.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valido': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Válido</Badge>;
      case 'vencido': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200">Vencido</Badge>;
      case 'prorrogado': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200">Prorrogado</Badge>;
      default: return <Badge variant="outline">Indeterminado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Banco de Talentos</h1>
          <p className="text-slate-500 mt-1">Gestão de validade e disponibilidade de candidatos aprovados.</p>
        </div>
        <Button className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Novo Banco
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bancos Válidos</p>
                <p className="text-2xl font-bold text-slate-900">{bancos.filter(b => b.status === 'valido' || b.status === 'prorrogado').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prorrogados</p>
                <p className="text-2xl font-bold text-slate-900">{bancos.filter(b => b.status === 'prorrogado').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vencidos</p>
                <p className="text-2xl font-bold text-slate-900">{bancos.filter(b => b.status === 'vencido').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
                <p className="text-2xl font-bold text-slate-900">{bancos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por cargo, unidade ou edital..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase">Edital</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Cargo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Unidade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Validade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-bold text-primary text-xs">{b.numero_edital}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{b.cargo}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">{b.secao}</div>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">{b.unidade}</TableCell>
                  <TableCell>{getStatusBadge(b.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{formatDate(b.nova_data_validade || b.data_validade)}</span>
                      {b.is_prorrogado && <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Prorrogado</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Ver Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">
                    Nenhum banco de talentos encontrado.
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
