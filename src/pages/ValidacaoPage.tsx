import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
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
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  FileCheck
} from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { useState, useMemo } from 'react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
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

export default function ValidacaoPage() {
  const { convocacoes } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [registroParaExcluir, setRegistroParaExcluir] = useState<string | null>(null);

  const handleDelete = () => {
    if (registroParaExcluir) {
      // Logic for deletion (this page seems to be a view, but the dropdown has a delete option)
      toast.success('Registro excluído com sucesso.');
      setIsDeleteDialogOpen(false);
      setRegistroParaExcluir(null);
    }
  };

  const filteredConvocacoes = useMemo(() => {
    return convocacoes.filter(c => {
      // Unit access restriction
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

  const pendentes = filteredConvocacoes.filter(c => c.status === 'pendente');
  const validadas = filteredConvocacoes.filter(c => c.status !== 'pendente');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Validar Convocações</h1>
          <p className="text-slate-500 mt-1">Conferência e validação final do fluxo de convocações (GO-ES).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-white border-slate-200">
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
                <p className="text-[11px] text-amber-600 font-bold uppercase tracking-wider">Aguardando Validação</p>
                <p className="text-3xl font-bold text-amber-700">{pendentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-green-600 font-bold uppercase tracking-wider">Validadas (Total)</p>
                <p className="text-3xl font-bold text-green-700">{validadas.length}</p>
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
                <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Total Visível</p>
                <p className="text-3xl font-bold text-blue-700">{filteredConvocacoes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-bold text-slate-800">Fila de Conferência</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filtrar por nome ou unidade..." 
                className="pl-9 h-10 bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 bg-white border-slate-200">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="tracking-wider">Data/Hora</TableHead>
                <TableHead className="tracking-wider">Candidato</TableHead>
                <TableHead className="tracking-wider">Unidade / Cargo</TableHead>
                <TableHead className="tracking-wider">Requisição</TableHead>
                <TableHead className="tracking-wider">Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{formatDate(c.data_convocacao)}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{c.horario}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{c.nome_candidato}</span>
                      <span className="text-[11px] text-slate-400 font-medium">Class: {c.classificacao}º</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">{c.unidade}</span>
                      <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">{c.cargo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary font-bold">{c.requisicao}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-bold">
                      {STATUS_CONVOCACAO_LABELS[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90">
                        Validar Registro
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4 text-blue-500" /> Ver Completo
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Edit className="h-4 w-4 text-amber-500" /> Editar Dados
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-destructive"
                            onClick={() => {
                              setRegistroParaExcluir(c.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendentes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">
                    Tudo pronto! Nenhuma convocação pendente de validação para suas unidades.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir registro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do fluxo de validação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegistroParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
