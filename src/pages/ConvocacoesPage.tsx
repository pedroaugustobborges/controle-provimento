import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Filter, Download, LayoutGrid, List, 
  Calendar, MapPin, Building2, User, CheckCircle2, 
  AlertCircle, ArrowRight, Database, MoreVertical,
  History, Eye, Edit, Trash2, X
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConvocacaoDialog } from '@/components/ConvocacaoDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/vagaUtils';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export default function ConvocacoesPage() {
  const navigate = useNavigate();
  const { vagas, convocacoes } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [view, setView] = useState<'kanban' | 'list' | 'pending'>('kanban');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [registroParaExcluir, setRegistroParaExcluir] = useState<string | null>(null);

  const handleDelete = () => {
    if (registroParaExcluir) {
      toast.success('Convocação removida com sucesso.');
      setIsDeleteDialogOpen(false);
      setRegistroParaExcluir(null);
    }
  };

  // Unit filtering
  const filteredVagas = useMemo(() => {
    return vagas.filter(v => {
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(v.unidade)) {
        return false;
      }
      return true;
    });
  }, [vagas, currentUser]);

  const pendingVagas = useMemo(() => {
    return filteredVagas.filter(v => v.status === 'realizar_convocacao');
  }, [filteredVagas]);

  const filteredConvocacoes = useMemo(() => {
    return convocacoes.filter(c => {
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(c.unidade)) {
        return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return c.nome_candidato.toLowerCase().includes(s) || 
               c.cargo.toLowerCase().includes(s) || 
               c.unidade.toLowerCase().includes(s);
      }
      return true;
    });
  }, [convocacoes, currentUser, search]);

  const handleNewConvocacao = (vaga?: any) => {
    setSelectedVaga(vaga || null);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Convocações</h1>
          <p className="text-muted-foreground text-sm font-medium">Controle centralizado do fluxo de admissão e históricos de convocações.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-3 text-xs font-bold gap-2 transition-all ${view === 'kanban' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Quadro
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-3 text-xs font-bold gap-2 transition-all ${view === 'list' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
              onClick={() => setView('list')}
            >
              <List className="h-3.5 w-3.5" /> Histórico
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-3 text-xs font-bold gap-2 transition-all ${view === 'pending' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
              onClick={() => setView('pending')}
            >
              <AlertCircle className="h-3.5 w-3.5" /> Pendentes
              {pendingVagas.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 h-4 min-w-[16px] flex items-center justify-center text-[9px] font-bold rounded-full">
                  {pendingVagas.length}
                </Badge>
              )}
            </Button>
          </div>
          <Button onClick={() => handleNewConvocacao()} className="h-9 gap-2 text-xs font-bold shadow-md shadow-primary/20 bg-primary">
            <Plus className="h-4 w-4" /> Nova Convocação
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 bg-white/50 p-3 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por candidato, cargo ou unidade..." 
            className="w-full pl-10 pr-4 h-10 text-sm rounded-lg bg-white border border-slate-200/80 focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-10 px-4 gap-2 text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <Filter className="h-3.5 w-3.5" /> Filtrar Período
          </Button>
          <Button variant="outline" className="h-10 px-4 gap-2 text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" /> Exportar Relatório
          </Button>
        </div>
      </div>

      {view === 'pending' && (
        <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="bg-slate-50/50 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Vagas Pendentes de Convocação
                </CardTitle>
                <p className="text-xs text-slate-500 font-medium mt-1">Vagas marcadas para convocação imediata via Banco ou Edital.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Requisição</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cargo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Unidade</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Banco?</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Data Abertura</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingVagas.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="font-mono text-[11px] font-bold text-primary">{v.requisicao || v.numero_requisicao}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{v.cargo}</TableCell>
                    <TableCell className="text-slate-600 font-medium">{v.unidade}</TableCell>
                    <TableCell className="text-center">
                      {v.tem_banco_valido ? (
                        <div className="flex items-center justify-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 mx-auto w-fit">
                          <Database className="h-3 w-3" />
                          <span className="text-[10px] font-bold">Válido</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 mx-auto w-fit">
                          <X className="h-3 w-3" />
                          <span className="text-[10px] font-bold">Sem Banco</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">{formatDate(v.data_abertura)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleNewConvocacao(v)}
                        className="h-8 gap-1.5 text-[10px] font-bold bg-green-600 hover:bg-green-700 shadow-sm"
                      >
                        Realizar Convocação <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingVagas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                      Nenhuma vaga pendente de convocação encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-2 h-full min-h-[500px]">
        {view === 'kanban' ? (
          <KanbanBoard />
        ) : view === 'list' ? (
          <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader className="bg-slate-50/50 border-b pb-3">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                Histórico de Convocações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Candidato</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vaga / Cargo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Data/Hora</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Unidade</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConvocacoes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{c.nome_candidato}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Classif: {c.classificacao}º</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary">{c.requisicao}</span>
                          <span className="text-[11px] text-slate-600 font-medium truncate max-w-[180px]">{c.cargo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">{formatDate(c.data_convocacao)}</span>
                          <span className="text-[10px] text-slate-400">{c.horario || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-200">
                          {STATUS_CONVOCACAO_LABELS[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium text-xs">{c.unidade}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4 text-blue-500" /> Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Edit className="h-4 w-4 text-amber-500" /> Validar/Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 text-destructive"
                              onClick={() => {
                                setRegistroParaExcluir(c.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredConvocacoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                        Nenhuma convocação registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <ConvocacaoDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        vaga={selectedVaga}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Remover convocação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegistroParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
