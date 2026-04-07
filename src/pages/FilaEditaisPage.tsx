import React, { useState } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_EDITAL_COLORS, StatusEdital } from '@/types/vaga';
import { formatDate } from '@/lib/vagaUtils';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
import { toast } from 'sonner';

export default function FilaEditaisPage() {
  const { vagas, updateVaga } = useVagasStore();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const pendingVagas = vagas.filter(v => {
    // Show only vacancies that need process or notice number, or recently imported
    const isPending = !v.numero_processo || !v.numero_edital || v.status_edital !== 'Encerrada';
    
    const matchSearch = !search || 
      v.cargo.toLowerCase().includes(search.toLowerCase()) || 
      v.numero_requisicao.toLowerCase().includes(search.toLowerCase());
    
    const matchUnidade = filterUnidade === 'all' || v.unidade === filterUnidade;
    const matchStatus = filterStatus === 'all' || v.status_edital === filterStatus;

    return isPending && matchSearch && matchUnidade && matchStatus;
  });

  const unidades = Array.from(new Set(vagas.map(v => v.unidade)));
  const statusOptions: StatusEdital[] = [
    'Nova vaga', 'Aguardando processo', 'Aguardando edital', 
    'Aguardando processo e edital', 'Em andamento', 'Encerrada'
  ];

  const handleUpdateProcess = (vagaId: string) => {
    const num = prompt('Informe o Nº do Processo:');
    if (num) {
      updateVaga(vagaId, { 
        numero_processo: num,
        status_edital: 'Aguardando edital'
      });
      toast.success('Número do processo atualizado!');
    }
  };

  const handleUpdateEdital = (vagaId: string) => {
    const num = prompt('Informe o Nº do Edital:');
    if (num) {
      updateVaga(vagaId, { 
        numero_edital: num,
        status_edital: 'Em andamento'
      });
      toast.success('Número do edital atualizado!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fila de Editais</h1>
          <p className="text-slate-500 mt-1">Gerencie a atribuição de processos e números de editais para as vagas abertas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={() => setIsImportOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aguardando Processo</p>
                <p className="text-2xl font-bold text-slate-800">{vagas.filter(v => v.status_edital === 'Aguardando processo' || v.status_edital === 'Aguardando processo e edital').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Aguardando Edital</p>
                <p className="text-2xl font-bold text-slate-800">{vagas.filter(v => v.status_edital === 'Aguardando edital' || v.status_edital === 'Aguardando processo e edital').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Em Andamento</p>
                <p className="text-2xl font-bold text-slate-800">{vagas.filter(v => v.status_edital === 'Em andamento').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 p-2 rounded-lg"><ListFilter className="h-5 w-5 text-slate-600" /></div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total na Fila</p>
                <p className="text-2xl font-bold text-slate-800">{pendingVagas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-primary" />
              Pendências de Editais
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar cargo ou REQ..." 
                  className="pl-9 w-[250px] bg-white" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterUnidade} onValueChange={setFilterUnidade}>
                <SelectTrigger className="w-[180px] bg-white">
                  <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Unidades</SelectItem>
                  {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] bg-white">
                  <Tag className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status Edital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || filterUnidade !== 'all' || filterStatus !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterUnidade('all'); setFilterStatus('all'); }}>
                  <X className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 text-left">Unidade</th>
                  <th className="px-6 py-4 text-left">Data Abertura</th>
                  <th className="px-6 py-4 text-left">Nº Requisição</th>
                  <th className="px-6 py-4 text-left">Cargo</th>
                  <th className="px-6 py-4 text-left">Seção</th>
                  <th className="px-6 py-4 text-center">Nº Vagas</th>
                  <th className="px-6 py-4 text-left">Nº Processo</th>
                  <th className="px-6 py-4 text-left">Nº Edital</th>
                  <th className="px-6 py-4 text-left">Status Edital</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendingVagas.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{v.unidade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(v.data_abertura)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                      {v.numero_requisicao}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{v.cargo}</div>
                      {v.reabertura_suspeita && (
                        <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-bold">REABERTURA</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{v.secao || '—'}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{v.quantidade}</td>
                    <td className="px-6 py-4">
                      {v.numero_processo ? (
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{v.numero_processo}</code>
                      ) : (
                        <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 font-bold text-[10px]">PENDENTE</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {v.numero_edital ? (
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{v.numero_edital}</code>
                      ) : (
                        <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 font-bold text-[10px]">PENDENTE</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {v.status_edital ? (
                        <Badge className={`${STATUS_EDITAL_COLORS[v.status_edital]} font-bold text-[10px] whitespace-nowrap`}>
                          {v.status_edital}
                        </Badge>
                      ) : (
                        <StatusBadge status={v.status_geral} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Preencher Processo" onClick={() => handleUpdateProcess(v.id)}>
                          <Briefcase className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Preencher Edital" onClick={() => handleUpdateEdital(v.id)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Edit className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Users className="h-4 w-4" /> Abrir Detalhe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-green-600">
                              <Send className="h-4 w-4" /> Enviar para Validação
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingVagas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-500 font-medium">Nenhuma pendência encontrada na fila de editais.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ImportExcelDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
