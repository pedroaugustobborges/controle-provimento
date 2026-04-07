import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Download
} from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
import { useState } from 'react';

export default function ImportacoesPage() {
  const { importHistory } = useVagasStore();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Concluído</Badge>;
      case 'erro': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200">Erro</Badge>;
      case 'em_processamento': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200">Processando</Badge>;
      default: return <Badge variant="outline">Indeterminado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Importações</h1>
          <p className="text-slate-500 mt-1">Gerencie a migração inicial e a entrada de dados em massa.</p>
        </div>
        <Button className="gap-2 bg-primary" onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4" /> Nova Importação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/20 bg-primary/5 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => setIsImportOpen(true)}>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-lg">Planilha de Vagas</h3>
                <p className="text-sm text-slate-500">Importar novas requisições aprovadas.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-lg">Banco de Talentos</h3>
                <p className="text-sm text-slate-500">Importar listas de editais e candidatos.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <History className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-lg">Convocações</h3>
                <p className="text-sm text-slate-500">Importar histórico de convocações diárias.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg font-bold text-slate-800">Histórico de Importações</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
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
                <TableHead className="text-[10px] font-bold uppercase text-right">Relatório</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importHistory.map((h) => (
                <TableRow key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{h.arquivo || h.nome_arquivo}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{h.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {h.tipo_importacao || 'vagas'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">{h.total_novos} novos</span>
                      <span className="text-[10px] text-slate-400">/</span>
                      <span className="text-xs font-bold text-blue-600">{h.total_atualizados} att.</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(h.status)}</TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {formatDate(h.data_hora || h.data || '')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                      <Download className="h-4 w-4" />
                    </Button>
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

      <ImportExcelDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
