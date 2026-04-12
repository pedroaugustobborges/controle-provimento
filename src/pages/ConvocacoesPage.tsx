import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Filter, Download, LayoutGrid, List, 
  Calendar as CalendarIcon, MapPin, Building2, User, CheckCircle2, 
  AlertCircle, ArrowRight, Database, MoreVertical,
  History, Eye, Edit, Trash2, X, Clock
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConvocacaoDialog } from '@/components/ConvocacaoDialog';
import { DevolutivaDialog } from '@/components/DevolutivaDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, getCategoriaStatus, filterByRegionAndUnit, normalizeUnitName, UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { getBaseForUnidade, HORARIOS_FIXOS_CONVOCACAO, BASES_CONVOCACAO } from '@/lib/convocacaoUtils';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { vagas, convocacoes, bancos, getBancoByVaga } = useVagasStore();
  const { currentUser, selectedRegion, selectedUnit: globalUnit } = useAdminStore();
  const [view, setView] = useState<'kanban' | 'list' | 'pending' | 'diaria'>('diaria');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDevolutivaOpen, setIsDevolutivaOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<any>(null);
  const [selectedConvocacao, setSelectedConvocacao] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [registroParaExcluir, setRegistroParaExcluir] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUnidade, setSelectedUnidade] = useState<string>('all');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['kanban', 'list', 'pending', 'diaria'].includes(tab)) {
      setView(tab as any);
    }
    // Abrir dialog de convocação automaticamente quando vindo de Todas as Vagas
    const openParam = searchParams.get('open');
    const vagaIdParam = searchParams.get('vagaId');
    if (openParam === 'true' && vagaIdParam) {
      const vaga = useVagasStore.getState().vagas.find(v => v.id === vagaIdParam);
      if (vaga) {
        setSelectedVaga(vaga);
        setIsDialogOpen(true);
      }
      // Limpar os params da URL após abrir
      setSearchParams(prev => {
        prev.delete('open');
        prev.delete('vagaId');
        return prev;
      });
    }
  }, [searchParams]);

  const handleViewChange = (newView: string) => {
    setView(newView as any);
    setSearchParams({ tab: newView });
  };

  const handleDelete = () => {
    if (registroParaExcluir) {
      useVagasStore.getState().deleteConvocacao(registroParaExcluir);
      toast.success('Convocação removida com sucesso.');
      setIsDeleteDialogOpen(false);
      setRegistroParaExcluir(null);
    }
  };

  const unidades = useMemo(() => {
    // Usar as bases de convocação para agrupar unidades
    // Goiânia agrupa HECAD, HUGOL, CRER, HDS, AGIR, CONDOMÍNIO
    // Demais bases aparecem com nome próprio
    return Object.keys(BASES_CONVOCACAO).sort();
  }, []);

  // Unit filtering
  const filteredVagas = useMemo(() => {
    const base = filterByRegionAndUnit(vagas, selectedRegion, globalUnit);
    return base.filter(v => {
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(v.unidade)) {
        return false;
      }
      if (selectedUnidade !== 'all' && v.unidade !== selectedUnidade) {
        return false;
      }
      return true;
    });
  }, [vagas, currentUser, selectedUnidade, selectedRegion, globalUnit]);

  // Convocações pendentes de devolutiva (candidatos agendados sem resposta ainda)
  const pendingConvocacoes = useMemo(() => {
    const baseConvocacoes = filterByRegionAndUnit(convocacoes, selectedRegion, globalUnit);
    return baseConvocacoes.filter(c => {
      if (c.status !== 'pendente') return false;
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(c.unidade)) return false;
      if (selectedUnidade !== 'all' && c.unidade !== selectedUnidade) return false;
      return true;
    });
  }, [convocacoes, currentUser, selectedUnidade, selectedRegion, globalUnit]);

  const filteredConvocacoes = useMemo(() => {
    const baseConvocacoes = filterByRegionAndUnit(convocacoes, selectedRegion, globalUnit);

    return baseConvocacoes
      .filter(c => {
        if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(c.unidade)) {
          return false;
        }

        if (selectedUnidade !== 'all' && c.unidade !== selectedUnidade) {
          return false;
        }

        if (view === 'diaria') {
          return c.data_convocacao === format(selectedDate, 'yyyy-MM-dd');
        }

        if (dateRange.from) {
          const convDate = parseISO(c.data_convocacao);
          const range = {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to || dateRange.from)
          };
          if (!isWithinInterval(convDate, range)) {
            return false;
          }
        }

        if (search) {
          const s = search.toLowerCase();
          return c.nome_candidato.toLowerCase().includes(s) || 
                 c.cargo.toLowerCase().includes(s) || 
                 c.unidade.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => new Date(b.data_convocacao).getTime() - new Date(a.data_convocacao).getTime());
  }, [convocacoes, currentUser, search, selectedUnidade, dateRange, selectedRegion, globalUnit, view, selectedDate]);

  const handleNewConvocacao = (vaga?: any) => {
    setSelectedVaga(vaga || null);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Convocações"
        actions={
          <>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner mr-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-3 text-[11px] font-bold uppercase transition-all rounded-lg ${view === 'diaria' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
                onClick={() => handleViewChange('diaria')}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Diária
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-3 text-[11px] font-bold uppercase transition-all rounded-lg ${view === 'kanban' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
                onClick={() => handleViewChange('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Quadro
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-3 text-[11px] font-bold uppercase transition-all rounded-lg ${view === 'list' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
                onClick={() => handleViewChange('list')}
              >
                <List className="h-3.5 w-3.5 mr-1" /> Histórico
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-3 text-[11px] font-bold uppercase transition-all rounded-lg ${view === 'pending' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-slate-500'}`}
                onClick={() => handleViewChange('pending')}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> Pendentes
                {pendingConvocacoes.length > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 h-4 min-w-[16px] flex items-center justify-center text-[8px] font-bold rounded-full">
                    {pendingConvocacoes.length}
                  </Badge>
                )}
              </Button>
            </div>
            <Button onClick={() => handleNewConvocacao()} className="h-10 gap-2 text-xs font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all px-4">
              <Plus className="h-4 w-4" /> Nova Convocação
            </Button>
          </>
        }
      />


      <div className="flex flex-col md:flex-row items-center gap-3 bg-white/50 p-3 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por candidato, cargo..." 
            className="w-full pl-10 pr-4 h-10 text-sm rounded-lg bg-white border border-slate-200/80 focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all outline-none"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-visible">
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 text-xs font-bold text-slate-600">
              <Building2 className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Filtrar Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {view === 'diaria' ? (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setSelectedDate(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 1);
                  return d;
                })}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-8 px-3 gap-2 text-xs font-bold text-primary hover:bg-primary/5"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="center" sideOffset={8}>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setSelectedDate(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 1);
                  return d;
                })}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`h-10 px-4 gap-2 text-xs font-bold bg-white border-slate-200 hover:bg-slate-50 ${dateRange.from ? 'text-primary border-primary/30' : 'text-slate-600'}`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy")
                    )
                  ) : (
                    "Filtrar Período"
                  )}
                  {dateRange.from && (
                    <X 
                      className="ml-1 h-3 w-3 hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange({ from: undefined, to: undefined });
                      }} 
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="end" sideOffset={8}>
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to
                  }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

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
                  Convocações Pendentes de Devolutiva
                </CardTitle>
                <p className="text-xs text-slate-500 font-medium mt-1">Candidatos agendados que ainda não confirmaram presença ou deram retorno.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-center">Data Convocação</TableHead>
                  <TableHead className="text-center">Horário</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingConvocacoes.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="font-semibold text-slate-800">{c.nome_candidato}</TableCell>
                    <TableCell className="text-slate-600 font-medium">{c.cargo}</TableCell>
                    <TableCell className="text-slate-600 font-medium">{c.unidade}</TableCell>
                    <TableCell className="text-center text-xs text-slate-500">{formatDate(c.data_convocacao)}</TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-primary">{c.horario || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => { setSelectedConvocacao(c); setIsDevolutivaOpen(true); }}
                        className="h-8 gap-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 shadow-sm"
                      >
                        Dar Devolutiva <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingConvocacoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                      Nenhuma convocação pendente de devolutiva encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-2 h-full min-h-[500px]">
        {view === 'diaria' ? (
          <div className="space-y-8">
            {/* Logic for Daily View: Group by Base and Time */}
            {(() => {
              const dayStr = format(selectedDate, 'yyyy-MM-dd');
              const todayConvocacoes = filteredConvocacoes; // FilteredConvocacoes already includes date filter logic now
              
              if (todayConvocacoes.length === 0) {
                return (
                  <div className="py-20 text-center text-slate-400 font-medium italic bg-white rounded-xl border-2 border-dashed border-slate-100">
                    Nenhuma convocação agendada para o dia {formatDate(dayStr)}.
                  </div>
                );
              }

              // Group by Base
              const byBase: Record<string, any[]> = {};
              todayConvocacoes.forEach(c => {
                const base = getBaseForUnidade(c.unidade);
                if (!byBase[base]) byBase[base] = [];
                byBase[base].push(c);
              });

              return Object.entries(byBase).map(([base, baseConvs]) => (
                <div key={base} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-800">Base: {base}</h2>
                    <Badge variant="outline" className="ml-2 bg-slate-50">{baseConvs.length} Agendamentos</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {HORARIOS_FIXOS_CONVOCACAO.map(horario => {
                      const conv = baseConvs.find(c => c.horario === horario);
                      
                      return (
                        <Card 
                          key={`${base}-${horario}`} 
                          className={`border shadow-sm transition-all ${conv ? 'border-l-4 border-l-primary' : 'bg-slate-50/50 border-dashed opacity-60'}`}
                        >
                          <CardHeader className="py-3 bg-slate-50/50 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="font-bold text-slate-700">{horario}</span>
                            </div>
                            {conv && (
                              <Badge 
                                className={`text-[10px] font-bold uppercase ${
                                  conv.status === 'aceite' ? 'bg-green-100 text-green-700' : 
                                  conv.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {STATUS_CONVOCACAO_LABELS[conv.status] || conv.status}
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="py-4">
                            {conv ? (
                              <div className="space-y-4">
                                <div>
                                  <h3 className="text-base font-bold text-slate-800 line-clamp-1">{conv.nome_candidato}</h3>
                                  <p className="text-xs text-slate-500 font-medium">{conv.cargo}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Unidade</span>
                                    <p className="text-xs font-semibold text-slate-600 truncate">
                                      {conv.unidade_alternativa || conv.unidade}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Requisição</span>
                                    <p className="text-xs font-mono font-bold text-primary">{conv.requisicao}</p>
                                  </div>
                                </div>

                                <div className="pt-2 flex gap-2">
                                  <Button 
                                    className="flex-1 h-9 text-xs font-bold gap-2"
                                    onClick={() => {
                                      setSelectedConvocacao(conv);
                                      setIsDevolutivaOpen(true);
                                    }}
                                  >
                                    Dar Devolutiva <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-9 w-9"
                                    onClick={() => navigate(`/vagas/${conv.vaga_id}`)}
                                  >
                                    <Eye className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 text-center">
                                <span className="text-xs text-slate-400 font-medium italic">Horário Livre</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard convocacoes={filteredConvocacoes} />
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
                <TableHeader >
                  <TableRow>
                    <TableHead >Candidato</TableHead>
                    <TableHead >Vaga / Cargo</TableHead>
                    <TableHead className="text-center">Data/Hora</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead >Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConvocacoes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{c.nome_candidato}</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Classif: {c.classificacao}º</span>
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
                          <span className="text-[11px] text-slate-400">{c.horario || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[11px] font-bold bg-slate-50 border-slate-200">
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

      {selectedConvocacao && (
        <DevolutivaDialog 
          open={isDevolutivaOpen} 
          onOpenChange={setIsDevolutivaOpen} 
          convocacao={selectedConvocacao} 
        />
      )}

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
