import { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, StatusGeral, TipoVaga, STATUS_EDITAL_COLORS, Vaga, ETAPA_LABELS, EtapaEdital } from '@/types/vaga';
import { 
  calcDiasAberto, formatDate, CATEGORIAS_STATUS, isVitoriaUnit, 
  normalizeUnitName, countVacancies, getStatusSummary, getCategoriaStatus,
  getMonthNamePtBrUpper, getValidVacancyBase, checkVacancyParity, getEtapaColor, getAutoEtapa 
} from '@/lib/vagaUtils';
import { Calendar, Bug, ChevronDown, ChevronUp, Info, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Upload, Plus, FileText, X, Building2, 
  Filter, FileSpreadsheet, ListFilter, MoreVertical, Trash2, Edit, History, AlertCircle,
  Database, CheckCircle2, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
import { AddVagaDialog } from '@/components/AddVagaDialog';
import { VagaHistoryDialog } from '@/components/VagaHistoryDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function VagasPage() {
  const { vagas, deleteVaga, updateVaga, getBancoByVaga, getMatchingDiagnostic } = useVagasStore();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'list';
  const { currentUser, addAuditLog } = useAdminStore();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterAssistente, setFilterAssistente] = useState('all');
  const [filterLideranca, setFilterLideranca] = useState('all');
  const [filterVagasNovas, setFilterVagasNovas] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddVagaOpen, setIsAddVagaOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVagaForHistory, setSelectedVagaForHistory] = useState<Vaga | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [vagaParaExcluir, setVagaParaExcluir] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canDelete = currentUser?.perfil === 'Admin' || currentUser?.pode_excluir_requisicoes;
  const canInclude = currentUser?.perfil === 'Admin' || currentUser?.pode_incluir_registros;

  const handleDelete = () => {
    if (vagaParaExcluir && canDelete) {
      const vaga = vagas.find(v => v.id === vagaParaExcluir);
      if (vaga) {
        deleteVaga(vagaParaExcluir);
        addAuditLog({
          usuario_nome: currentUser?.nome_completo || 'Sistema',
          usuario_email: currentUser?.email || 'sistema@sistema.com',
          perfil: currentUser?.perfil || 'Sistema',
          data: new Date().toISOString().split('T')[0],
          hora: new Date().toLocaleTimeString(),
          acao: 'Excluir Requisição',
          modulo: 'Vagas',
          registro_afetado: vaga.requisicao || vaga.numero_requisicao || vaga.id,
        });
        toast.success('Requisição excluída com sucesso.');
      }
      setIsDeleteDialogOpen(false);
      setVagaParaExcluir(null);
    }
  };

  const allUnidades = useMemo(() => [...new Set(vagas.map((v) => normalizeUnitName(v.unidade)))].filter(Boolean).sort(), [vagas]);
  
  // Restriction by unit - normalization for consistent comparison
  const visibleUnidades = useMemo(() => {
    const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
    return currentUser?.visualiza_todas_unidades 
      ? allUnidades 
      : userUnidades;
  }, [currentUser, allUnidades]);

  const unidades = useMemo(() => {
    return allUnidades.filter(u => visibleUnidades.includes(u)).sort();
  }, [allUnidades, visibleUnidades]);

  const analistas = useMemo(() => [...new Set(vagas.map((v) => v.analista_responsavel))].filter(Boolean).sort(), [vagas]);
  const assistentes = useMemo(() => [...new Set(vagas.flatMap((v) => v.assistentes || []))].filter(Boolean).sort(), [vagas]);

  // 1. Canonical base for all metrics - exactly matching Excel parity
  const canonicalBase = useMemo(() => {
    return getValidVacancyBase(vagas, filterUnidade, filterMes);
  }, [vagas, filterUnidade, filterMes]);

  // 2. Table filter for UI (Search, Status, etc. applied ON TOP of canonical base)
  const filtered = useMemo(() => {
    const now = new Date().getTime();
    return canonicalBase.filter((v) => {
      const searchTerm = search.toLowerCase();
      const matchSearch = !search || 
        (v.cargo || '').toLowerCase().includes(searchTerm) ||
        (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm) ||
        (v.unidade || '').toLowerCase().includes(searchTerm) ||
        (v.analista_responsavel || '').toLowerCase().includes(searchTerm);

      const matchStatus = filterStatus === 'all' || 
        v.status === filterStatus || 
        v.status_geral === filterStatus ||
        (filterStatus === 'CONVOCAÇÕES' && getCategoriaStatus(v) === 'convocacao') ||
        (filterStatus === 'DOCUMENTAÇÃO' && getCategoriaStatus(v) === 'documentacao') ||
        (filterStatus === 'FILA DE EDITAIS' && getCategoriaStatus(v) === 'fila_edital') ||
        (filterStatus === 'EM ANDAMENTO' && getCategoriaStatus(v) === 'em_andamento') ||
        (filterStatus === 'CONCLUÍDAS' && getCategoriaStatus(v) === 'concluidas') ||
        (filterStatus === 'ESTRATÉGICAS' && getCategoriaStatus(v) === 'vagas_lideranca') ||
        (filterStatus === 'CANCELADAS' && getCategoriaStatus(v) === 'vagas_interrompidas') ||
        (filterStatus === 'AGUARDANDO UNIDADE' && getCategoriaStatus(v) === 'aguardando_unidade');
      const matchTipo = filterTipo === 'all' || v.tipo_vaga === filterTipo;
      const matchAnalista = filterAnalista === 'all' || v.analista_responsavel === filterAnalista;
      const matchAssistente = filterAssistente === 'all' || (v.assistentes || []).includes(filterAssistente);
      const matchLideranca = filterLideranca === 'all' || (filterLideranca === 'yes' ? v.tipo_vaga === 'lideranca' : v.tipo_vaga !== 'lideranca');
      
      const isNew = v.origem === 'manual' && v.data_criacao && (now - new Date(v.data_criacao).getTime()) < 24 * 60 * 60 * 1000;
      const matchVagasNovas = !filterVagasNovas || isNew;
      
      return matchSearch && matchStatus && matchTipo && matchAnalista && matchAssistente && matchLideranca && matchVagasNovas;
    });
  }, [canonicalBase, search, filterStatus, filterTipo, filterAnalista, filterAssistente, filterLideranca, filterVagasNovas]);

  // 3. Vacancy summary - strictly using the same canonical base and unified logic as Dashboard
  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      concluidas: 0,
      vagas_interrompidas: 0,
      vagas_lideranca: 0,
      convocacao: 0,
      aguardando_unidade: 0,
      documentacao: 0,
      com_banco_valido: 0
    };
    
    canonicalBase.forEach(v => {
      const cat = getCategoriaStatus(v);
      
      if (acc[cat] !== undefined) {
        acc[cat]++;
      } else {
        // Fallback para qualquer status não mapeado explicitamente
        acc.em_andamento++;
      }

      if (getBancoByVaga(v.id)) {
        acc.com_banco_valido++;
      }
    });
    
    return acc;
  }, [canonicalBase, getBancoByVaga]);

  const countFilaEdital = counts.fila_edital;
  const countEmAndamento = counts.em_andamento;
  const countConcluidas = counts.concluidas;
  const countVagasInterrompidas = counts.vagas_interrompidas;
  const countVagasLideranca = counts.vagas_lideranca;
  const countConvocacao = counts.convocacao;
  const countAguardandoUnidade = counts.aguardando_unidade;
  const countDocumentacao = counts.documentacao;
  const countComBanco = counts.com_banco_valido;


  // 4. Parity Debug Audit - forensic row-level check
  const parityAudit = useMemo(() => {
    const selUnit = filterUnidade === 'all' ? 'TODOS' : filterUnidade;
    const selMonth = filterMes === 'all' ? 'TODOS' : filterMes;

    // Check every row in the dataset
    const analyzed = vagas.map(v => checkVacancyParity(v, selUnit, selMonth));
    
    // Rows counted by Excel Parity rule
    const excelCounted = analyzed.filter(r => r.includedByExcelParity);
    
    // Rows actually counted by the card metric (finalCount)
    // In our current implementation, this should exactly match excelCounted
    // If not, we found a logic divergence between the parity check and the production function
    const appCounted = canonicalBase; // This is what the UI card uses
    
    // Rows in table (can have extra UI filters like search, status)
    const tableCounted = filtered;

    // Identify divergences
    const excludedByAppButIncludedByExcel = excelCounted.filter(e => !appCounted.find(a => a.id === e.id));
    const includedByAppButExcludedByExcel = appCounted.filter(a => !excelCounted.find(e => e.id === a.id));

    return {
      selUnit,
      selMonth,
      excelCount: excelCounted.length,
      appCount: appCounted.length,
      tableCount: tableCounted.length,
      difference: appCounted.length - excelCounted.length,
      mismatches: [
        ...excludedByAppButIncludedByExcel.map(r => ({ ...r, mismatchType: 'EXCLUDED_BY_APP' as const })),
        ...includedByAppButExcludedByExcel.map(r => {
          const check = checkVacancyParity(r, selUnit, selMonth);
          return { ...check, mismatchType: 'INCLUDED_BY_APP' as const };
        })
      ]
    };
  }, [vagas, canonicalBase, filtered, filterUnidade, filterMes]);



  const clearFilters = () => {
    setSearch('');
    setFilterUnidade('all');
    setFilterMes('all');
    setFilterStatus('all');
    setFilterTipo('all');
    setFilterAnalista('all');
    setFilterAssistente('all');
    setFilterLideranca('all');
    setFilterVagasNovas(false);
  };

  const hasFilters = search || filterUnidade !== 'all' || filterMes !== 'all' || filterStatus !== 'all' || filterTipo !== 'all' || filterAnalista !== 'all' || filterAssistente !== 'all' || filterLideranca !== 'all' || filterVagasNovas;


  return (
    <div className="space-y-4">
      {currentTab === 'acompanhamento' ? (
        <AcompanhamentoEditalList />
      ) : (
        <>
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Controle de Provimento</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento centralizado de vagas, editais e convocações.</p>
        </div>
        <div className="flex gap-2">
          {permissions.canViewAudit() && (
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-[10px] h-8 gap-1 font-bold ${isDebugOpen ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}
              onClick={() => setIsDebugOpen(!isDebugOpen)}
            >
              <Bug className="h-3 w-3" /> Audit
            </Button>
          )}
          {permissions.canViewDiagnostics() && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] text-slate-500 hover:text-primary h-8 gap-1 font-bold"
              onClick={() => {
                const diag = getMatchingDiagnostic();
                console.log('Matching Diagnostic:', diag);
                toast.info(`${diag.length} vagas sem banco encontradas. Veja o console para detalhes.`);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diag, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "diagnostico_matching.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
              }}
            >
              <Database className="h-3 w-3" /> Diagnóstico
            </Button>
          )}
          {permissions.canImport() && (
            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold shadow-sm" onClick={() => setIsImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Importar Excel
            </Button>
          )}
          <Button className="gap-2 shadow-md shadow-primary/20 bg-primary" onClick={() => setIsAddVagaOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Vaga
          </Button>
        </div>
      </div>

      {isDebugOpen && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm mb-4">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                <Bug className="h-3 w-3" /> Diagnóstico de Paridade Excel (Audit)
              </CardTitle>
              <CardDescription className="text-[10px] text-amber-600 font-medium">
                Comparação entre dados importados e regras de negócio de contagem.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsDebugOpen(false)} className="h-6 w-6 p-0 text-amber-700">
              <X className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-[10px] text-amber-700 font-bold uppercase">Escopo Selecionado</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[9px] bg-white border-amber-200 text-amber-800">Unidade: {parityAudit.selUnit}</Badge>
                  <Badge variant="outline" className="text-[9px] bg-white border-amber-200 text-amber-800">Mês: {parityAudit.selMonth}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-amber-700 font-bold uppercase">Contagem de Paridade</p>
                <div className="text-[11px] font-mono text-amber-900 leading-tight">
                  <p>Excel Parity Count: <span className="font-bold">{parityAudit.excelCount}</span></p>
                  <p>App Card Count: <span className="font-bold">{parityAudit.appCount}</span></p>
                  <p>Diferença: <span className={`font-bold ${parityAudit.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>{parityAudit.difference}</span></p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-amber-700 font-bold uppercase">Status de Dados</p>
                <div className="text-[11px] font-mono text-amber-900 leading-tight">
                  <p>Linhas na Tabela: {parityAudit.tableCount}</p>
                  <p>Total de Vagas (Card): {parityAudit.appCount}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 border-t border-amber-200 pt-3">
              <p className="text-[10px] text-amber-700 font-bold uppercase mb-2">Relatório de Divergência (Row-level)</p>
              {parityAudit.mismatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="text-[9px]">
                    <TableHeader>
                      <TableRow className="h-8 hover:bg-transparent border-amber-200">
                        <TableHead className="h-8 text-amber-800 font-bold">Record ID</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Linha</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Unidade</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Data</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Cargo</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Mês Extr.</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold text-center">Excel?</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold text-center">App?</TableHead>
                        <TableHead className="h-8 text-amber-800 font-bold">Motivo Divergência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parityAudit.mismatches.slice(0, 10).map((m, i) => (
                        <TableRow key={i} className="h-8 hover:bg-amber-100/50 border-amber-100">
                          <TableCell className="h-8 font-mono">{m.id.substring(0, 8)}...</TableCell>
                          <TableCell className="h-8 font-bold">{m.source_row_index || '—'}</TableCell>
                          <TableCell className="h-8">{m.unidade}</TableCell>
                          <TableCell className="h-8">{m.data_abertura}</TableCell>
                          <TableCell className="h-8 truncate max-w-[120px]">{m.cargo}</TableCell>
                          <TableCell className="h-8 font-bold text-blue-700">{m.parsedMonth}</TableCell>
                          <TableCell className="h-8 text-center">{m.includedByExcelParity ? <CheckCircle2 className="h-3 w-3 text-green-600 inline" /> : <X className="h-3 w-3 text-red-600 inline" />}</TableCell>
                          <TableCell className="h-8 text-center">{m.includedByApp ? <CheckCircle2 className="h-3 w-3 text-green-600 inline" /> : <X className="h-3 w-3 text-red-600 inline" />}</TableCell>
                          <TableCell className="h-8 text-red-700 font-medium">{m.rejectionReason || 'Diferença de filtro extra UI'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parityAudit.mismatches.length > 10 && (
                    <p className="text-[8px] text-amber-600 mt-1 italic">Mostrando 10 de {parityAudit.mismatches.length} divergências.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded border border-green-100">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-[10px] font-bold">Paridade 100% confirmada entre regra Excel e App para os filtros atuais.</p>
                </div>
              )}
            </div>

            {(parityAudit.appCount !== parityAudit.tableCount) && (
              <Alert className="bg-amber-100 border-amber-300 py-2 mt-4">
                <Info className="h-3 w-3 text-amber-700" />
                <AlertTitle className="text-[10px] font-bold text-amber-800 uppercase">Informação: Filtros de Visualização Ativos</AlertTitle>
                <AlertDescription className="text-[10px] text-amber-700">
                  A tabela ({parityAudit.tableCount}) exibe menos linhas que o total calculado ({parityAudit.appCount}) 
                  porque filtros de pesquisa ou status estão aplicados. O Total de Vagas ignora estes filtros de busca.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-3">
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-primary">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Vagas</p>
            <p className="text-2xl font-bold text-slate-800">{parityAudit.appCount}</p>
            <p className="text-[10px] text-slate-400">Regra Excel (Cargo + Mes)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fila de Editais</p>
            <p className="text-2xl font-bold text-amber-600">{countFilaEdital}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-600">{countEmAndamento}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-green-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">{countConcluidas}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vagas de Liderança</p>
            <p className="text-2xl font-bold text-indigo-600">{countVagasLideranca}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Convocações</p>
            <p className="text-2xl font-bold text-violet-600">{countConvocacao}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vagas Interrompidas</p>
            <p className="text-2xl font-bold text-rose-600">{countVagasInterrompidas}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentação</p>
            <p className="text-2xl font-bold text-orange-600">{countDocumentacao}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-yellow-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Unidade</p>
            <p className="text-2xl font-bold text-yellow-600">{countAguardandoUnidade}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Com Banco Válido</p>
            <p className="text-2xl font-bold text-emerald-600">{countComBanco}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cargo, requisição ou unidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
              </div>
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger className="w-[160px] bg-white text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <SelectValue placeholder="Mês Abertura" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Meses</SelectItem>
                {['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] bg-white text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px] bg-white text-xs"><SelectValue placeholder="Tipo de Vaga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {Object.entries(TIPO_VAGA_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button 
              variant={filterVagasNovas ? "default" : "outline"} 
              size="sm" 
              className={`h-9 text-[11px] font-bold gap-2 ${filterVagasNovas ? 'bg-blue-600' : 'border-slate-200 text-slate-600 bg-white'}`}
              onClick={() => setFilterVagasNovas(!filterVagasNovas)}
            >
              <Sparkles className={`h-3.5 w-3.5 ${filterVagasNovas ? 'text-white' : 'text-blue-500'}`} />
              Vagas Novas (24h)
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-800"><X className="h-4 w-4 mr-1" /> Limpar Filtros</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/80 whitespace-nowrap">
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Abertura</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Recebimento</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Requisição</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Cargo</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Tipo</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Unidade</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Seção</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Vaga(s)</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 hover:bg-slate-50/50 transition-colors whitespace-nowrap group cursor-pointer"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium">
                      {v.data_abertura ? formatDate(v.data_abertura) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium">
                      {v.data_recebimento ? formatDate(v.data_recebimento) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-mono text-[11px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block w-fit">
                          {v.requisicao || v.numero_requisicao || '-'}
                        </div>
                        {v.source_row_index && (
                          <span className="text-[9px] text-slate-400 ml-1">Linha {v.source_row_index}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="font-semibold text-slate-800 truncate max-w-[200px] flex items-center gap-2" title={v.cargo}>
                          {v.cargo}
                          {v.origem === 'manual' && v.data_criacao && (new Date().getTime() - new Date(v.data_criacao).getTime()) < 24 * 60 * 60 * 1000 && (
                            <Badge variant="outline" className="h-4 text-[8px] px-1 bg-blue-50 text-blue-600 border-blue-200 animate-pulse font-black uppercase">
                              <Sparkles className="h-2 w-2 mr-0.5" /> Nova Vaga
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium">
                      {TIPO_VAGA_LABELS[v.tipo_vaga] || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium truncate max-w-[150px]">{v.unidade}</td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium truncate max-w-[120px]" title={v.secao}>{v.secao || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status || v.status_geral} />
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {v.numero_vagas || v.quantidade || 0}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400">Ações da Vaga</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/vagas/${v.id}`)} className="gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/vagas/${v.id}`)} className="gap-2">
                            <Edit className="h-4 w-4 text-amber-500" /> Editar Registro
                          </DropdownMenuItem>
                          {getBancoByVaga(v.id) && (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/banco-talentos?search=${v.cargo}`)} className="gap-2 text-primary">
                                <Database className="h-4 w-4" /> Ver Banco de Talentos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/convocacoes/nova?vagaId=${v.id}`)} className="gap-2 font-bold text-green-600">
                                <CheckCircle2 className="h-4 w-4" /> Ir para Convocação
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => {
                              setSelectedVagaForHistory(v);
                              setIsHistoryOpen(true);
                            }}
                          >
                            <History className="h-4 w-4 text-slate-500" /> Histórico Completo
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive gap-2"
                                onClick={() => {
                                  setVagaParaExcluir(v.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir Requisição
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-20 text-center text-muted-foreground font-medium">Nenhuma vaga encontrada para os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 flex justify-between items-center">
            <span>Exibindo {filtered.length} de {vagas.length} registros</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Banco Válido</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Sem Banco</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImportExcelDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      <AddVagaDialog open={isAddVagaOpen} onOpenChange={setIsAddVagaOpen} />
      <VagaHistoryDialog vaga={selectedVagaForHistory} open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir requisição?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do sistema e esta ação será auditada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVagaParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
}

function AcompanhamentoEditalList() {
  const { vagas, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  const navigate = useNavigate();

  const handleUpdateEtapa = (vagaId: string, etapa: string) => {
    const vaga = vagas.find(v => v.id === vagaId);
    if (vaga) {
      const updatedAcompanhamento = {
        ...(vaga.acompanhamento || { etapa_atual: '' }),
        etapa_atual: etapa
      };
      updateVaga(vagaId, { acompanhamento: updatedAcompanhamento });
      toast.success('Etapa atualizada com sucesso');
    }
  };

  const handleUpdateSituacao = (vagaId: string, situacao: any) => {
    const vaga = vagas.find(v => v.id === vagaId);
    if (vaga) {
      const updatedAcompanhamento = {
        ...(vaga.acompanhamento || { etapa_atual: '' }),
        situacao_etapa: situacao
      };
      updateVaga(vagaId, { acompanhamento: updatedAcompanhamento });
      toast.success('Situação atualizada com sucesso');
    }
  };

  const editaisEmAndamento = useMemo(() => {
    return vagas.filter(v => {
      const isAndamento = getCategoriaStatus(v) === 'em_andamento';
      if (!isAndamento) return false;

      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(normalizeUnitName(v.unidade))) {
          return false;
        }
      }
      return true;
    });
  }, [vagas, currentUser]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Acompanhamento do Edital</h1>
          <p className="text-slate-500 mt-1">Acompanhamento operacional das etapas dos editais publicados.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 text-left">Unidade</th>
                  <th className="px-6 py-4 text-left">Cargo</th>
                  <th className="px-6 py-4 text-left">Nº Edital</th>
                  <th className="px-6 py-4 text-left">Etapa Atual</th>
                  <th className="px-6 py-4 text-center">Situação</th>
                  <th className="px-6 py-4 text-center">Inscritos</th>
                  <th className="px-6 py-4 text-center">Triagem</th>
                  <th className="px-6 py-4 text-center">Avaliação</th>
                  <th className="px-6 py-4 text-center">Entrevista</th>
                  <th className="px-6 py-4 text-center">Final</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {editaisEmAndamento.map((v) => {
                  const autoEtapa = getAutoEtapa(v);
                  const displayEtapa = v.acompanhamento?.etapa_atual || autoEtapa;
                  const isSync = v.acompanhamento?.etapa_atual === autoEtapa;

                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">{v.unidade}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{v.cargo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{v.requisicao || v.numero_requisicao}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary whitespace-nowrap">{v.numero_edital || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={`${getEtapaColor(displayEtapa as EtapaEdital)} font-bold text-[10px] uppercase py-0.5 px-2 w-fit`}>
                            {ETAPA_LABELS[displayEtapa as EtapaEdital] || displayEtapa}
                          </Badge>
                          {!isSync && (
                            <span className="text-[9px] text-amber-600 font-bold animate-pulse uppercase">Sugerido: {ETAPA_LABELS[autoEtapa as EtapaEdital]}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-7 px-2 text-[10px] font-bold uppercase border-2 ${
                              v.acompanhamento?.situacao_etapa === 'atrasada' ? 'bg-red-50 text-red-700 border-red-100' :
                              v.acompanhamento?.situacao_etapa === 'concluido' ? 'bg-green-50 text-green-700 border-green-100' :
                              v.acompanhamento?.situacao_etapa === 'em_andamento' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {v.acompanhamento?.situacao_etapa?.replace('_', ' ') || 'PENDENTE'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="min-w-[120px]">
                            <DropdownMenuItem onClick={() => handleUpdateSituacao(v.id, 'pendente')} className="text-[11px] font-bold text-amber-600">PENDENTE</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateSituacao(v.id, 'em_andamento')} className="text-[11px] font-bold text-blue-600">EM ANDAMENTO</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateSituacao(v.id, 'concluido')} className="text-[11px] font-bold text-green-600">CONCLUÍDO</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateSituacao(v.id, 'atrasada')} className="text-[11px] font-bold text-red-600">ATRASADO</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{v.total_inscritos || v.acompanhamento?.total_inscritos || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{v.aprovados_triagem || v.acompanhamento?.aprovados_triagem || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{v.acompanhamento?.aprovados_avaliacao_especifica || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">{v.convocados_entrevista || v.acompanhamento?.convocados_entrevista || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{v.aprovados_finais || v.acompanhamento?.aprovados_finais || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="ghost" className="h-8 text-primary font-bold hover:bg-primary/5 px-2 flex items-center gap-1.5" onClick={() => navigate(`/vagas/${v.id}?tab=acompanhamento`)}>
                          Atualizar <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {editaisEmAndamento.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                      Nenhum edital em andamento visível para suas unidades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}