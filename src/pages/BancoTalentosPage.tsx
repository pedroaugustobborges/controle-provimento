import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Filter, Calendar, Info, Clock, CheckCircle2, AlertTriangle, FileSpreadsheet, History, Download, Trash2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BancoTalentosForm } from '@/components/BancoTalentosForm';
import { ImportBancoTalentosDialog } from '@/components/ImportBancoTalentosDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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

export default function BancoTalentosPage() {
  const { bancos, importHistory, importedFiles, deleteBanco } = useVagasStore();
  const { currentUser } = useAdminStore();
  const [search, setSearch] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return bancos.filter(b => {
      // Unit access restriction
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return false;
      }
      
      const matchSearch = b.cargo.toLowerCase().includes(search.toLowerCase()) || 
        b.unidade.toLowerCase().includes(search.toLowerCase()) ||
        b.numero_edital.toLowerCase().includes(search.toLowerCase());
        
      const matchUnidade = unidadeFilter === 'todas' || b.unidade === unidadeFilter;
      const matchStatus = statusFilter === 'todos' || b.status === statusFilter;
        
      return matchSearch && matchUnidade && matchStatus;
    });
  }, [bancos, currentUser, search, unidadeFilter, statusFilter]);

  const historyBT = useMemo(() => {
    return importHistory.filter(h => h.tipo_importacao === 'banco');
  }, [importHistory]);

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
            onClick={() => setIsImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Importar Excel
          </Button>
          <Button 
            className="gap-2 bg-primary shadow-md shadow-primary/20"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-4 w-4" /> Novo Banco
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cadastrar Novo Banco de Talentos</DialogTitle>
          </DialogHeader>
          <BancoTalentosForm 
            onSuccess={() => setIsFormOpen(false)} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <ImportBancoTalentosDialog 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ... Stats cards stay the same ... */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bancos Válidos</p>
                <p className="text-2xl font-bold text-slate-900">{filtered.filter(b => b.status === 'valido' || b.status === 'prorrogado').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prorrogados</p>
                <p className="text-2xl font-bold text-slate-900">{filtered.filter(b => b.status === 'prorrogado').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2.5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vencidos</p>
                <p className="text-2xl font-bold text-slate-900">{filtered.filter(b => b.status === 'vencido').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2.5 rounded-lg">
                <Calendar className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Visível</p>
                <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <Filter className="h-4 w-4" /> Bancos de Talentos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico de Importações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por cargo, unidade ou edital..." 
                    className="pl-9 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Unidades</SelectItem>
                      <SelectItem value="HGG">HGG</SelectItem>
                      <SelectItem value="HUGO">HUGO</SelectItem>
                      <SelectItem value="HEAPA">HEAPA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="valido">Válidos</SelectItem>
                      <SelectItem value="vencido">Vencidos</SelectItem>
                      <SelectItem value="prorrogado">Prorrogados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
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
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{b.secao}</div>
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
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="font-bold text-xs text-primary hover:bg-primary/5 h-8">Detalhes</Button>
                          {currentUser?.perfil === 'Admin' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este banco de talentos?')) {
                                  deleteBanco(b.id);
                                  toast.success('Banco de talentos excluído com sucesso.');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">
                        Nenhum banco de talentos encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Data/Hora</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Arquivo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Registros</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Usuário</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyBT.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{h.data_hora ? formatDate(h.data_hora.split('T')[0]) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium">{h.arquivo || h.nome_arquivo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center font-bold">{h.total_novos}</TableCell>
                    <TableCell className="text-xs text-slate-500">{h.usuario}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Concluído</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {historyBT.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">
                      Nenhuma importação realizada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
