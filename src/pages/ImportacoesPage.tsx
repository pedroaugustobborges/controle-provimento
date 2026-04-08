import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileSpreadsheet, 
  Upload, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database,
  ArrowRight,
  ChevronRight,
  Search,
  Download,
  FileText,
  RefreshCw,
  MoreVertical,
  Trash2,
  ExternalLink,
  Info,
  Layers,
  FileCheck,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';

export default function ImportacoesPage() {
  const { importHistory, importedFiles, deleteImportedFile, clearAllData } = useVagasStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [reprocessFile, setReprocessFile] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [fileParaExcluir, setFileParaExcluir] = useState<string | null>(null);
  const permissions = usePermissions();

  if (!permissions.canImport()) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Você não possui permissão para acessar o módulo de importações. 
          Solicite acesso ao administrador do sistema.
        </p>
      </div>
    );
  }

  const handleDeleteFile = () => {
    if (fileParaExcluir) {
      deleteImportedFile(fileParaExcluir);
      toast.success('Arquivo removido com sucesso');
      setIsDeleteDialogOpen(false);
      setFileParaExcluir(null);
    }
  };
  const handleClearAllData = () => {
    clearAllData();
    toast.success('Todos os dados foram removidos com sucesso');
    setIsClearAllDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Concluído</Badge>;
      case 'concluido_alertas': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold border-amber-200">Concluído c/ Alertas</Badge>;
      case 'erro': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200">Erro</Badge>;
      case 'em_processamento': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200">Processando</Badge>;
      case 'reprocessado': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold border-purple-200">Reprocessado</Badge>;
      default: return <Badge variant="outline">Indeterminado</Badge>;
    }
  };

  const getFileStatusBadge = (status: string) => {
    switch (status) {
      case 'processado': return <Badge className="bg-green-50 text-green-600 hover:bg-green-100 font-medium border-green-100">Processado</Badge>;
      case 'enviado': return <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium border-blue-100">Enviado</Badge>;
      case 'erro': return <Badge className="bg-red-50 text-red-600 hover:bg-red-100 font-medium border-red-100">Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReprocess = (file: any) => {
    setReprocessFile(file);
    setIsImportOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Importações</h1>
          <p className="text-slate-500 mt-1">Gerencie a migração inicial e a entrada de dados em massa.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => setIsClearAllDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Limpar Todos os Dados
          </Button>
          <Button className="gap-2 bg-primary" onClick={() => { setReprocessFile(null); setIsImportOpen(true); }}>
            <Upload className="h-4 w-4" /> Nova Importação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos Enviados</p>
                <p className="text-2xl font-bold text-slate-800">{importedFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concluídas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {importHistory.filter(h => h.status === 'concluido').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2.5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Com Erro</p>
                <p className="text-2xl font-bold text-slate-800">
                  {importHistory.filter(h => h.status === 'erro').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último Upload</p>
                <p className="text-sm font-bold text-slate-800 truncate max-w-[120px]">
                  {importedFiles[0]?.nome_original || 'Nenhum'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="h-4 w-4" /> Histórico de Importações
          </TabsTrigger>
          <TabsTrigger value="arquivos" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layers className="h-4 w-4" /> Arquivos Importados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historico">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-lg font-bold text-slate-800">Log de Processamento</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 bg-white">
                  <Search className="h-4 w-4" /> Buscar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Lote / Arquivo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Tipo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Registros</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Data/Hora</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.map((h) => (
                    <TableRow key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{h.arquivo || h.nome_arquivo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{h.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50">
                          {h.tipo_importacao || 'vagas'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-green-600">{h.total_novos}</span>
                            <span className="text-[8px] text-slate-400 uppercase font-bold">Novos</span>
                          </div>
                          <div className="w-px h-6 bg-slate-100" />
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-blue-600">{h.total_atualizados}</span>
                            <span className="text-[8px] text-slate-400 uppercase font-bold">Att.</span>
                          </div>
                          <div className="w-px h-6 bg-slate-100" />
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-red-500">{h.total_erros}</span>
                            <span className="text-[8px] text-slate-400 uppercase font-bold">Erro</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(h.status)}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {formatDate(h.data_hora || h.data || '')}
                        <p className="text-[9px] text-slate-400">{h.usuario}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" title="Ver Detalhes">
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" title="Baixar Relatório">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {importHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                        Nenhuma importação registrada no sistema.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arquivos">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-lg font-bold text-slate-800">Repositório de Arquivos</CardTitle>
              </div>
              <Button variant="outline" size="sm" className="gap-2 bg-white">
                <Search className="h-4 w-4" /> Filtrar Arquivos
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Nome do Arquivo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Data de Upload</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Usuário</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Tamanho</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedFiles.map((f) => (
                    <TableRow key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 p-2 rounded-lg">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{f.nome_original}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">{f.modulo_origem}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {formatDate(f.data_upload)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">{f.usuario}</span>
                          <span className="text-[9px] text-slate-400">{f.email_usuario}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {(f.tamanho / 1024).toFixed(1)} KB
                      </TableCell>
                      <TableCell>{getFileStatusBadge(f.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleReprocess(f)} className="gap-2">
                              <RefreshCw className="h-4 w-4 text-blue-600" /> Reprocessar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Download className="h-4 w-4" /> Baixar Original
                            </DropdownMenuItem>
                            {f.vaga_importacao_id && (
                              <DropdownMenuItem className="gap-2">
                                <ExternalLink className="h-4 w-4" /> Ver Importação
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                setFileParaExcluir(f.id);
                                setIsDeleteDialogOpen(true);
                              }} 
                              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" /> Excluir Arquivo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {importedFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                        Nenhum arquivo enviado ao sistema.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportExcelDialog 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        reprocessFile={reprocessFile}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir arquivo importado?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O arquivo será removido permanentemente do repositório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Limpar Todos os Dados?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação <strong>excluirá permanentemente</strong> todos os registros de vagas, banco de talentos, convocações, editais e histórico de importações.
              </p>
              <p className="font-bold text-slate-900">
                Esta operação é irreversível e removerá todos os dados acumulados indevidamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 text-white hover:bg-red-700">
              Confirmar Limpeza Total
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
