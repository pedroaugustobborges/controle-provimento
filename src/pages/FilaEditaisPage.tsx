import React, { useState, useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X,
  FileUp
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_EDITAL_COLORS, StatusEdital } from '@/types/vaga';
import { formatDate, normalizeUnitName, calcDiasAberto } from '@/lib/vagaUtils';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function FilaEditaisPage() {
  const navigate = useNavigate();
  const { vagas, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const pendingVagas = useMemo(() => {
    return vagas.filter(v => {
      const vUnitNormalized = normalizeUnitName(v.unidade);
      
      // Unit access restriction
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(vUnitNormalized)) {
          return false;
        }
      }

      // Regra 4.1: Grupo: fila de edital / início de processo
      const status = (v.status || v.status_geral || 'sem_status').toLowerCase();
      const isFilaEdital = status === 'sem_status' || status === 'publicar_novo_edital';
      
      if (!isFilaEdital) return false;

      const searchTerm = search.toLowerCase();
      const matchSearch = !search || 
        v.cargo.toLowerCase().includes(searchTerm) || 
        (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm);
      
      const matchUnidade = filterUnidade === 'all' || vUnitNormalized === filterUnidade;
      const matchStatus = filterStatus === 'all' || v.status_edital === filterStatus;

      return matchSearch && matchUnidade && matchStatus;
    });
  }, [vagas, currentUser, search, filterUnidade, filterStatus]);

  const unidades = useMemo(() => Array.from(new Set(vagas.map(v => normalizeUnitName(v.unidade)))).filter(Boolean).sort(), [vagas]);
  const statusOptions: StatusEdital[] = [
    'Nova vaga', 'Aguardando processo', 'Aguardando edital', 
    'Aguardando processo e edital', 'Em andamento', 'Encerrada'
  ];

  const handleSendToValidation = (vagaId: string) => {
    const vaga = vagas.find(v => v.id === vagaId);
    if (!vaga?.numero_edital || !vaga?.numero_processo) {
      toast.error('Informe o número do edital e do processo antes de enviar para validação.');
      return;
    }

    updateVaga(vagaId, { 
      status_validacao: 'pendente',
      historico: [...vaga.historico, {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: 'Edital enviado para validação administrativa',
        usuario: currentUser?.nome_completo || 'Analista'
      }]
    });
    toast.success('Edital enviado para validação administrativa!');
  };

  const hasFilters = search !== '' || filterUnidade !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fila de Editais</h1>
          <p className="text-slate-500 mt-1">Vagas aguardando redação e publicação de novo edital.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={() => setIsImportOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total na Fila</p>
                <p className="text-2xl font-bold text-slate-800">{pendingVagas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aguardando Redação</p>
                <p className="text-2xl font-bold text-slate-800">{pendingVagas.filter(v => !v.numero_edital).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Vagas para Publicação
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
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterUnidade('all'); setFilterStatus('all'); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Vagas</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead className="text-center">Dias Aberto</TableHead>
                  <TableHead>Status Atual</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingVagas.map((v) => (
                  <TableRow key={v.id} className="group">
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {v.requisicao || v.numero_requisicao}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{v.unidade}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{v.cargo}</TableCell>
                    <TableCell className="text-[11px] font-bold uppercase text-slate-500">{v.tipo_vaga}</TableCell>
                    <TableCell className="text-center font-bold text-slate-700">{v.numero_vagas || v.quantidade}</TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap">
                      {formatDate(v.data_recebimento!)}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700">
                      {calcDiasAberto(v.data_recebimento || v.data_abertura)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {v.analista_responsavel}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Redigir" onClick={() => navigate(`/vagas/${v.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Enviar para Validação" onClick={() => handleSendToValidation(v.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingVagas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-500 font-medium">Nenhuma pendência encontrada na fila de editais.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ImportExcelDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
