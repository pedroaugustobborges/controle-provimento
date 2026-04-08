import { useState, useRef, useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, StatusGeral, TipoVaga, STATUS_EDITAL_COLORS } from '@/types/vaga';
import { 
  calcDiasAberto, formatDate, CATEGORIAS_STATUS, isVitoriaUnit, 
  normalizeUnitName, countVacancies, getStatusSummary, 
  getMonthNamePtBrUpper, getValidVacancyBase 
} from '@/lib/vagaUtils';
import { Calendar, Bug, ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Upload, Plus, FileText, X, Building2, 
  Filter, FileSpreadsheet, ListFilter, MoreVertical, Trash2, Edit, History, AlertCircle,
  Database, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
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

export default function VagasPage() {
  const { vagas, deleteVaga, updateVaga, getBancoByVaga, getMatchingDiagnostic } = useVagasStore();
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

  const [isImportOpen, setIsImportOpen] = useState(false);
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

  const filtered = useMemo(() => vagas.filter((v) => {
    // Audit for transparency
    const vUnitNormalized = normalizeUnitName(v.unidade);
    
    // Unit access restriction - using normalized names for consistency
    if (!currentUser?.visualiza_todas_unidades) {
      const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
      if (!userUnidades.includes(vUnitNormalized)) {
        return false;
      }
    }

    const searchTerm = search.toLowerCase();
    const matchSearch = !search || 
      (v.cargo || '').toLowerCase().includes(searchTerm) ||
      (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm) ||
      (v.unidade || '').toLowerCase().includes(searchTerm) ||
      (v.analista_responsavel || '').toLowerCase().includes(searchTerm);

    const matchUnidade = filterUnidade === 'all' || normalizeUnitName(v.unidade) === filterUnidade;

    // Rule: if cargo is blank, it shouldn't be counted in Total de Vagas, but let's keep it visible in the table 
    // unless the user specifically wants the table to match the vacancy count logic.
    // The user said: "visible table row count" shouldn't determine the metric, but 
    // "Implement the platform count so it behaves exactly like the spreadsheet: unit-scoped, cargo-based, month-filtered by abertura"
    // To maintain parity, the table should show what's being counted.
    const hasCargoValue = String(v.cargo ?? "").trim() !== "";
    if (!hasCargoValue) return false;

    const matchMes = filterMes === 'all' || getMonthNamePtBrUpper(v.data_abertura) === filterMes.toUpperCase();

    const matchStatus = filterStatus === 'all' || v.status === filterStatus || v.status_geral === filterStatus;
    const matchTipo = filterTipo === 'all' || v.tipo_vaga === filterTipo;
    const matchAnalista = filterAnalista === 'all' || v.analista_responsavel === filterAnalista;
    const matchAssistente = filterAssistente === 'all' || (v.assistentes || []).includes(filterAssistente);
    const matchLideranca = filterLideranca === 'all' || (filterLideranca === 'yes' ? v.tipo_vaga === 'lideranca' : v.tipo_vaga !== 'lideranca');
    
    return matchSearch && matchUnidade && matchMes && matchStatus && matchTipo && matchAnalista && matchAssistente && matchLideranca;
  }), [vagas, currentUser, search, filterUnidade, filterMes, filterStatus, filterTipo, filterAnalista, filterAssistente, filterLideranca]);


  const vacancyStats = useMemo(() => {
    const selectedUnit = filterUnidade === 'all' ? 'TODOS' : filterUnidade;
    const selectedMonth = filterMes === 'all' ? 'TODOS' : filterMes;
    
    return getStatusSummary(vagas, selectedUnit, selectedMonth);
  }, [vagas, filterUnidade, filterMes]);

  const totalVagas = vacancyStats.total;
  
  // Status summary groupings mapped to dashboard cards
  // Note: These must follow the "independent from status" rule for the base total
  const countEmAndamento = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => CATEGORIAS_STATUS.em_andamento.includes(status.toLowerCase()))
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countAguardandoUnidade = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => CATEGORIAS_STATUS.aguardando_unidade.includes(status.toLowerCase()))
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countSemStatus = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => !status || status === '' || status === 'SEM_STATUS' || status === 'NULL' || status === 'NAN')
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countEncerradas = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => CATEGORIAS_STATUS.encerradas.includes(status.toLowerCase()))
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countLideranca = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => CATEGORIAS_STATUS.lideranca.includes(status.toLowerCase()))
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countMovimentacao = useMemo(() => {
    return Object.entries(vacancyStats.byStatus)
      .filter(([status]) => CATEGORIAS_STATUS.movimentacao_interna.includes(status.toLowerCase()))
      .reduce((acc, [_, count]) => acc + count, 0);
  }, [vacancyStats.byStatus]);

  const countComBanco = useMemo(() => {
    // For this one, we filter from the base of valid vacancies
    const selectedUnit = filterUnidade === 'all' ? 'TODOS' : filterUnidade;
    const selectedMonth = filterMes === 'all' ? 'TODOS' : filterMes;
    
    const validBase = vagas.filter(row => {
      const normalize = (val?: string | null) => String(val ?? "").trim().toUpperCase();
      const rowUnit = normalize(row.unidade);
      const normalizedUnit = normalize(selectedUnit);
      const sameUnit = normalizedUnit === "TODOS" || normalizedUnit === "" || rowUnit === normalizedUnit;
      const hasCargoValue = String(row.cargo ?? "").trim() !== "";
      
      if (!sameUnit || !hasCargoValue) return false;
      
      if (selectedMonth !== 'TODOS' && selectedMonth !== 'all' && selectedMonth !== '') {
        const aberturaMonth = (row as any).data_abertura ? 
          new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date((row as any).data_abertura)).toUpperCase() : "";
        if (aberturaMonth !== selectedMonth.toUpperCase()) return false;
      }
      return true;
    });

    return validBase.filter(v => getBancoByVaga(v.id)).length;
  }, [vagas, filterUnidade, filterMes, getBancoByVaga]);



  const clearFilters = () => {
    setSearch('');
    setFilterUnidade('all');
    setFilterMes('all');
    setFilterStatus('all');
    setFilterTipo('all');
    setFilterAnalista('all');
    setFilterAssistente('all');
    setFilterLideranca('all');
  };

  const hasFilters = search || filterUnidade !== 'all' || filterMes !== 'all' || filterStatus !== 'all' || filterTipo !== 'all' || filterAnalista !== 'all' || filterAssistente !== 'all' || filterLideranca !== 'all';


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Controle de Provimento</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento centralizado de vagas, editais e convocações.</p>
        </div>
        <div className="flex gap-2">
          {permissions.canImport() && (
            <>
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
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold shadow-sm" onClick={() => setIsImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" /> Importar Excel
              </Button>
            </>
          )}
          <Button className="gap-2 shadow-md shadow-primary/20 bg-primary">
            <Plus className="h-4 w-4" /> Nova Vaga
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-primary">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Vagas</p>
            <p className="text-2xl font-bold text-slate-800">{totalVagas}</p>
            <p className="text-[10px] text-slate-400">Regra de Negócio (Cargo + Mes)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-600">{countEmAndamento}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Unidade</p>
            <p className="text-2xl font-bold text-amber-600">{countAguardandoUnidade}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem Status</p>
            <p className="text-2xl font-bold text-slate-600">{countSemStatus}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Liderança</p>
            <p className="text-2xl font-bold text-indigo-600">{countLideranca}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Movimentação Int.</p>
            <p className="text-2xl font-bold text-cyan-600">{countMovimentacao}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Com Banco Válido</p>
            <p className="text-2xl font-bold text-green-600">{countComBanco}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encerradas</p>
            <p className="text-2xl font-bold text-emerald-600">{countEncerradas}</p>
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
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]" title={v.cargo}>{v.cargo}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium">
                      {TIPO_VAGA_LABELS[v.tipo_vaga] || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium truncate max-w-[150px]">{v.unidade}</td>
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
                          <DropdownMenuItem className="gap-2">
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
    </div>
  );
}