import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  calcDiasAberto,
  normalizeUnitName,
  getCategoriaStatus,
  getValidVacancyBase,
  filterByRegionAndUnit,
  getRegionForUnit,
  normStatus,
} from '@/lib/vagaUtils';
import {
  Briefcase,
  FileText,
  Clock,
  Activity,
  Users,
  Building2,
  ShieldCheck,
  CheckCircle,
  Star,
  AlertTriangle,
  UserCheck,
  AlertCircle,
  ArrowLeftRight,
  ChevronRight,
  ChevronDown,
  Filter,
  RefreshCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';

const UNIT_MAPPING = [
  { bank: 'HRD', vacancies: ['DOURADOS'], display: 'DOURADOS' },
  { bank: 'HRC', vacancies: ['HRCAC I', 'HRCAC II'], display: 'HRCAC I / II' },
  { bank: 'CHS', vacancies: ['CHS'], display: 'CHS' },
  { bank: 'HMSA', vacancies: ['HMSA'], display: 'HMSA' },
  { bank: 'JATAÍ', vacancies: ['JATAÍ'], display: 'JATAÍ' },
  { bank: 'POLICLÍNICA', vacancies: ['POLICLÍNICA'], display: 'POLICLÍNICA' },
  { bank: 'GOIÂNIA', vacancies: ['CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR'], display: 'GOIÂNIA (HOSPITAIS)' },
  { bank: 'UPA', vacancies: ['SÃO PEDRO', 'SUÁ', 'UPA'], display: 'VITÓRIA (UPA/PA)' },
];

const resolveCanonicalName = (unitName: string) => {
  if (!unitName) return '';
  const norm = normalizeUnitName(unitName);
  
  for (const map of UNIT_MAPPING) {
    if (normalizeUnitName(map.bank) === norm || map.vacancies.some(v => normalizeUnitName(v) === norm)) {
      return map.display;
    }
  }
  
  return norm;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    vagas: allVagas = [],
    bancos = [],
    editais = [],
    convocacoes = [],
    tarefas = [],
    fetchAll,
    isLoadingVagas,
    isLoadingBancos,
    isInitialLoad,
  } = useVagasStore();
  const { selectedRegion, selectedUnits, setSelectedRegion, setSelectedUnits } = useAdminStore();
  const [chartMode, setChartMode] = useState<'unidade' | 'regiao'>('unidade');
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filterDashboardRecords = useCallback(<T extends { unidade?: string | null }>(records: T[]) => {
    const base = filterByRegionAndUnit(records, selectedRegion, 'all');
    if (selectedUnits.length > 0 && !selectedUnits.includes('all')) {
      return base.filter(r => selectedUnits.some(u => normalizeUnitName(u) === normalizeUnitName(r.unidade || '')));
    }
    return base;
  }, [selectedRegion, selectedUnits]);

  const filteredVagas = useMemo(() => {
    const base = filterDashboardRecords(allVagas);
    return getValidVacancyBase(base, 'TODOS', 'TODOS');
  }, [allVagas, filterDashboardRecords]);

  const filteredBancos = useMemo(() => {
    return filterDashboardRecords(bancos);
  }, [bancos, filterDashboardRecords]);

  const vagas = filteredVagas;

  const visibleVagaIds = useMemo(() => new Set(vagas.map((vaga) => vaga.id)), [vagas]);

  const filteredEditais = useMemo(() => (
    editais.filter((edital) => visibleVagaIds.has(edital.vaga_id))
  ), [editais, visibleVagaIds]);

  const filteredConvocacoes = useMemo(() => (
    convocacoes.filter((convocacao) => visibleVagaIds.has(convocacao.vaga_id))
  ), [convocacoes, visibleVagaIds]);

  const visibleBancoIds = useMemo(() => new Set(filteredBancos.map((banco) => banco.id)), [filteredBancos]);
  const visibleEditalIds = useMemo(() => new Set(filteredEditais.map((edital) => edital.id)), [filteredEditais]);
  const visibleConvocacaoIds = useMemo(() => new Set(filteredConvocacoes.map((convocacao) => convocacao.id)), [filteredConvocacoes]);

  const totalVagas = useMemo(() => vagas.length, [vagas]);

  const counts = useMemo(() => {
    const acc = {
      fila_edital: 0,
      em_andamento: 0,
      convocacoes: 0,
      concluidas: 0,
      vagas_lideranca: 0,
      aguardando_unidade: 0,
      documentacao: 0,
      movimentacao_interna: 0,
      suspensa: 0,
      cancelada: 0,
      em_admissao: 0,
      atrasadas: 0,
      sem_classificacao: 0,
    };

    const statusConcluidos = ['concluida', 'concluidas', 'cancelada', 'canceladas', 'suspensa'];

    vagas.forEach((v) => {
      const cat = getCategoriaStatus(v);
      if (acc.hasOwnProperty(cat)) {
        acc[cat as keyof typeof acc]++;
      } else {
        acc.sem_classificacao++;
      }

      // Adicional: Atrazadas (mais de 10 dias sem atualização no histórico ou desde abertura)
      const lastHist = v.historico && v.historico.length > 0 ? v.historico[v.historico.length - 1] : null;
      const baseDate = lastHist?.data || v.data_recebimento || v.data_abertura;
      
      const normalizedStatus = normStatus(v.status || '');
      if (!statusConcluidos.includes(normalizedStatus)) {
        if (calcDiasAberto(baseDate) > 10) {
          acc.atrasadas++;
        }
      }
    });

    return acc;
  }, [vagas]);

  const totalBancosDisponiveis = useMemo(() => {
    return filteredBancos.filter((b) => {
      const s = normStatus(b.status || '');
      return s !== 'vencido' && s !== 'convocado';
    }).length;
  }, [filteredBancos]);


  const totalTarefasPendentes = useMemo(() => {
    const shouldIncludeUnscopedTasks = selectedRegion === 'all';

    return tarefas.filter((tarefa) => {
      if (tarefa.status !== 'pendente') return false;

      if (!tarefa.relacionado_a) {
        return shouldIncludeUnscopedTasks;
      }

      switch (tarefa.relacionado_a.tipo) {
        case 'vaga':
          return visibleVagaIds.has(tarefa.relacionado_a.id);
        case 'banco':
          return visibleBancoIds.has(tarefa.relacionado_a.id);
        case 'convocacao':
          return visibleConvocacaoIds.has(tarefa.relacionado_a.id);
        case 'edital':
          return visibleEditalIds.has(tarefa.relacionado_a.id);
        default:
          return shouldIncludeUnscopedTasks;
      }
    }).length;
  }, [tarefas, selectedRegion, visibleVagaIds, visibleBancoIds, visibleConvocacaoIds, visibleEditalIds]);

  const stats = useMemo(() => [
    { label: 'Total de Vagas', value: totalVagas, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/5', description: 'Base ativa' },
    { label: 'Concluídas', value: counts.concluidas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', description: 'Vagas concluídas' },
    { label: 'Em Andamento', value: counts.em_andamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Processos ativos' },
    { label: 'Convocações', value: counts.convocacoes, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Em convocação' },
    { label: 'Aguardando', value: counts.aguardando_unidade, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', description: 'Aguardando retorno' },
    { label: 'Documentação', value: counts.documentacao, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', description: 'Pendência documental' },
    { label: 'Fila de Editais', value: counts.fila_edital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Editais aguardando publicação' },
    { label: 'Suspensa', value: counts.suspensa, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', description: 'Vagas suspensas' },
    { label: 'Cancelada', value: counts.cancelada, icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', description: 'Vagas canceladas' },
    { label: 'Liderança', value: counts.vagas_lideranca, icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-50', description: 'Vagas estratégicas' },
    { label: 'Mov. Interna', value: counts.movimentacao_interna, icon: ArrowLeftRight, color: 'text-cyan-600', bg: 'bg-cyan-50', description: 'Movimentações internas' },
    { label: 'Em Admissão', value: counts.em_admissao, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Fase final' },
    { label: 'Banco Disponível', value: totalBancosDisponiveis, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Bancos ativos' },
  ], [totalVagas, counts, totalBancosDisponiveis, totalTarefasPendentes]);

  const strategicScopeByUnit = useMemo(() => {
    const unitMap = new Map<string, any>();

    const getEntry = (unitName: string) => {
      const canonicalName = resolveCanonicalName(unitName);
      if (!canonicalName) return null;

      if (!unitMap.has(canonicalName)) {
        unitMap.set(canonicalName, {
          name: canonicalName,
          region: getRegionForUnit(canonicalName),
          vagas: 0,
          vagasAbertas: 0,
          bancos: 0,
          bancosCR: 0,
          bancosDisponiveis: 0,
          pendencias: 0,
        });
      }
      return unitMap.get(canonicalName);
    };

    const statusConcluidos = ['concluida', 'concluidas', 'cancelada', 'canceladas', 'suspensa'];

    vagas.forEach((vaga) => {
      const entry = getEntry(vaga.unidade);
      if (entry) {
        entry.vagas++;
        const cat = getCategoriaStatus(vaga);
        if (cat !== 'concluidas' && cat !== 'suspensa' && cat !== 'cancelada') {
          entry.vagasAbertas++;
        }

        const lastHist = vaga.historico && vaga.historico.length > 0 ? vaga.historico[vaga.historico.length - 1] : null;
        const baseDate = lastHist?.data || vaga.data_recebimento || vaga.data_abertura;
        const normalizedS = normStatus(vaga.status || '');
        if (!statusConcluidos.includes(normalizedS)) {
          if (calcDiasAberto(baseDate) > 10) {
            entry.pendencias++;
          }
        }
      }
    });

    filteredBancos.forEach((banco) => {
      const entry = getEntry(banco.unidade);
      if (entry) {
        entry.bancos++;
        const s = normStatus(banco.status || '');
        if (s === 'cadastro reserva') entry.bancosCR++;
        if (s !== 'vencido' && s !== 'convocado') entry.bancosDisponiveis++;
        
        if (s === 'vencido' || s === 'prorrogado' || banco.is_prorrogado) {
          entry.pendencias++;
        }
      }
    });

    return Array.from(unitMap.values())
      .map(entry => ({
        ...entry,
        total: entry.vagas + entry.bancos,
        ativos: entry.vagasAbertas + entry.bancosDisponiveis
      }))
      .filter(entry => entry.total > 0 || entry.pendencias > 0)
      .sort((a, b) => b.total - a.total);
  }, [vagas, filteredBancos]);

  const chartData = useMemo(() => {
    if (chartMode === 'regiao') {
      const regionMap = new Map<string, {
        name: string;
        total: number;
        ativos: number;
        vagas: number;
        bancos: number;
        bancosCR: number;
        pendencias: number;
      }>();

      if (selectedRegion === 'all') {
        ['Goiânia', 'Vitória', 'Demais Unidades'].forEach(reg => {
          regionMap.set(reg, {
            name: reg,
            total: 0,
            ativos: 0,
            vagas: 0,
            bancos: 0,
            bancosCR: 0,
            pendencias: 0,
          });
        });
      }

      strategicScopeByUnit.forEach((entry) => {
        const current = regionMap.get(entry.region) || {
          name: entry.region,
          total: 0,
          ativos: 0,
          vagas: 0,
          bancos: 0,
          bancosCR: 0,
          pendencias: 0,
        };

        current.total += entry.total;
        current.ativos += entry.ativos;
        current.vagas += entry.vagas;
        current.bancos += entry.bancos;
        current.bancosCR += entry.bancosCR;
        current.pendencias += entry.pendencias;
        regionMap.set(entry.region, current);
      });

      return Array.from(regionMap.values())
        .filter((item) => item.total > 0 || item.pendencias > 0)
        .sort((a, b) => b.total - a.total);
    }

    return strategicScopeByUnit;
  }, [chartMode, strategicScopeByUnit]);

  const vacancyAlerts = useMemo(() => {
    const STALE_THRESHOLD_DAYS = 10;
    const statusConcluidos = ['concluida', 'concluidas', 'cancelada', 'canceladas', 'suspensa', 'admissao efetivada'];

    return vagas
      .filter((vaga) => {
        const s = normStatus(vaga.status || '');
        // Exclude concluded/cancelled/suspended vagas
        if (statusConcluidos.includes(s)) return false;

        // Use updated_at as the primary inactivity indicator, fallback to other dates
        const lastActivityDate = vaga.updated_at || vaga.data_criacao || vaga.data_importacao || vaga.data_recebimento || vaga.data_abertura;
        const daysInactive = calcDiasAberto(lastActivityDate);

        // Show vagas without status OR vagas inactive for more than threshold
        if (s === '' || s === 'sem status') return true;
        return daysInactive >= STALE_THRESHOLD_DAYS;
      })
      .map((vaga) => {
        const lastActivityDate = vaga.updated_at || vaga.data_criacao || vaga.data_importacao || vaga.data_recebimento || vaga.data_abertura;
        const daysOpen = calcDiasAberto(lastActivityDate);

        return {
          ...vaga,
          daysOpen,
          displayId: vaga.requisicao || vaga.numero_requisicao || 'SEM REQ',
        };
      })
      .sort((a, b) => b.daysOpen - a.daysOpen);
  }, [vagas]);

  const alerts = useMemo(() => {
    const vacancyDisplayAlerts = vacancyAlerts.map((vaga) => ({
      id: `vaga-${vaga.id}`,
      type: 'vaga' as const,
      reference: vaga.displayId,
      title: vaga.cargo || 'Vaga sem cargo informado',
      unit: normalizeUnitName(vaga.unidade),
      badge: `${vaga.daysOpen}d`,
      description: 'Vaga sem status desde a inclusão no sistema',
      sortValue: 2000 + vaga.daysOpen,
    }));

    const bancoAlerts = filteredBancos
      .filter((banco) => {
        const s = normStatus(banco.status || '');
        return s === 'vencido' || s === 'prorrogado' || banco.is_prorrogado;
      })
      .map((banco) => {
        const s = normStatus(banco.status || '');
        const isExpired = s === 'vencido';

        return {
          id: `banco-${banco.id}`,
          type: 'banco' as const,
          reference: banco.numero_edital || banco.numero_processo || 'BANCO',
          title: banco.cargo || banco.nome || 'Banco de talentos',
          unit: normalizeUnitName(banco.unidade),
          badge: isExpired ? 'Vencido' : 'Prorrogado',
          description: isExpired ? 'Banco com validade expirada' : 'Banco com prazo prorrogado',
          sortValue: isExpired ? 1000 : 500,
        };
      });

    return [...vacancyDisplayAlerts, ...bancoAlerts].sort((a, b) => (
      b.sortValue - a.sortValue || a.unit.localeCompare(b.unit)
    ));
  }, [vacancyAlerts, filteredBancos]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Visão Geral do Provimento
            </h1>
            <p className="text-slate-400 font-bold mt-0.5 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary animate-pulse" /> Monitoramento em Tempo Real
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Região</span>
            </div>
            
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedUnits(['all']); }}>
              <SelectTrigger className="h-9 w-[180px] rounded-lg border-slate-200 bg-white text-[11px] font-black uppercase tracking-wider text-slate-600 shadow-sm hover:border-primary/30 transition-colors">
                <SelectValue placeholder="Todas as Regiões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold uppercase">Todas as Regiões</SelectItem>
                <SelectItem value="Goiânia" className="text-xs font-bold uppercase">Goiânia</SelectItem>
                <SelectItem value="Vitória" className="text-xs font-bold uppercase">Vitória</SelectItem>
                <SelectItem value="Demais Unidades" className="text-xs font-bold uppercase">Demais Unidades</SelectItem>
              </SelectContent>
            </Select>

            {selectedRegion !== 'all' && (
              <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            )}

            {selectedRegion !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                  selectedUnits.includes('all')
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                onClick={() => setSelectedUnits(['all'])}
              >
                Todas as Unidades
              </Button>
            )}
          </div>

          {selectedRegion !== 'all' && UNIDADES_POR_REGIAO[selectedRegion] && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {UNIDADES_POR_REGIAO[selectedRegion].map((u) => {
                const isSelected = selectedUnits.includes(u);
                return (
                  <button
                    key={u}
                    onClick={() => {
                      let newUnits = [...selectedUnits];
                      if (newUnits.includes('all')) {
                        newUnits = [u];
                      } else if (newUnits.includes(u)) {
                        newUnits = newUnits.filter((x) => x !== u);
                        if (newUnits.length === 0) newUnits = ['all'];
                      } else {
                        newUnits.push(u);
                      }
                      setSelectedUnits(newUnits);
                    }}
                    className={`shrink-0 h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border-2 ${
                      isSelected
                        ? 'bg-primary/5 text-primary border-primary shadow-sm'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => {
          const isVagasStat = !stat.label.includes('CR');
          const isBancosStat = stat.label.includes('CR');
          const showSkeleton = (isVagasStat && isLoadingVagas && allVagas.length === 0) || 
                              (isBancosStat && isLoadingBancos && bancos.length === 0);

          return (
            <Card key={idx} className="border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group overflow-hidden bg-white relative">
              <div className={`h-1 w-full absolute top-0 left-0 ${stat.bg.replace('/5', '')} opacity-40`}></div>
              <CardContent className="p-5">
                <div className={`p-2 rounded-lg ${stat.bg} w-fit mb-3 group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 leading-tight">{stat.label}</p>
                <div className="flex flex-col gap-0.5">
                  {showSkeleton ? (
                    <Skeleton className="h-8 w-16 my-0.5" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 tracking-tighter">{stat.value}</p>
                  )}
                  {stat.description && (
                    <p className="text-[9px] font-bold text-slate-400 italic leading-none">{stat.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 mb-6 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Visão Estratégica {chartMode === 'regiao' ? 'por Grupo Regional' : 'por Unidade'}
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400 ml-10.5">Distribuição consolidada de vagas e bancos conforme os filtros ativos.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setChartMode('unidade')}
                  className={`text-[10px] font-bold px-3 py-1.5 transition-all uppercase tracking-wider ${
                    chartMode === 'unidade'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Por Unidade
                </button>
                <button
                  onClick={() => setChartMode('regiao')}
                  className={`text-[10px] font-bold px-3 py-1.5 transition-all uppercase tracking-wider ${
                    chartMode === 'regiao'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Por Região
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="h-[400px] w-full mt-4 pr-6 relative">
              {(isLoadingVagas || isLoadingBancos) && (
                <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="h-8 w-8 text-primary animate-spin opacity-40" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Otimizando dados...</span>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={180}
                    tick={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: '#64748b',
                    }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', radius: 4 }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [`${value} registros`, name === 'vagas' ? 'Vagas' : 'Banco (CR)'];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Bar
                    dataKey="vagas"
                    name="Vagas"
                    fill="#1e3a5f"
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  >
                    <LabelList
                      dataKey="vagas"
                      position="right"
                      style={{ fill: '#64748b', fontSize: '10px', fontWeight: 'bold' }}
                      offset={10}
                      formatter={(val: number) => val > 0 ? val : ''}
                    />
                  </Bar>
                  <Bar
                    dataKey="bancosCR"
                    name="Banco (Cadastro Reserva)"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  >
                    <LabelList
                      dataKey="bancosCR"
                      position="right"
                      style={{ fill: '#10b981', fontSize: '10px', fontWeight: 'bold' }}
                      offset={10}
                      formatter={(val: number) => val > 0 ? val : ''}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b border-slate-50 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Vagas sem Movimentação</CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vagas sem status desde a inclusão no sistema</p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border border-amber-200 shadow-sm">
                {alerts.length} Alertas
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="p-5 hover:bg-slate-50/50 transition-all cursor-pointer group flex items-start gap-4">
                    <div className={`h-1.5 w-1.5 rounded-full mt-2 shrink-0 group-hover:scale-150 transition-transform ${alert.type === 'vaga' ? 'bg-amber-400' : 'bg-red-400'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-300 group-hover:text-primary/40 transition-colors uppercase truncate">#{alert.reference}</span>
                        <span className={`text-[11px] font-bold flex items-center gap-1 uppercase bg-white border px-2 py-0.5 rounded-md shrink-0 ${alert.type === 'vaga' ? 'text-amber-600 border-amber-100' : 'text-red-600 border-red-100'}`}>
                          {alert.type === 'vaga' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} {alert.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate leading-snug">{alert.title}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Building2 className="h-3 w-3 opacity-50" /> {alert.unit}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Tudo sob controle</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Nenhuma pendência crítica no recorte selecionado.</p>
              </div>
            )}
          </CardContent>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <Button 
              variant="ghost" 
              className="w-full text-[11px] font-bold text-primary hover:bg-primary/5 uppercase tracking-[0.15em] transition-all"
              onClick={() => setIsStaleModalOpen(true)}
            >
              Vagas sem Movimentação <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={isStaleModalOpen} onOpenChange={setIsStaleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Vagas sem Movimentação</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                  Vagas incluídas no sistema que ainda não receberam nenhuma ação dos analistas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4 px-6">Requisição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4 px-6">Unidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4 px-6">Cargo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4 px-6">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4 px-6 text-center">Dias Parado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacancyAlerts.length > 0 ? (
                  vacancyAlerts.map((vaga) => (
                    <TableRow key={vaga.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell className="py-4 px-6 font-mono text-[11px] font-bold text-slate-400 group-hover:text-primary transition-colors">
                        #{vaga.displayId}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-slate-300" />
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{normalizeUnitName(vaga.unidade)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-700">{vaga.cargo || 'Não informado'}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter bg-white border-slate-200 text-slate-500">
                          {vaga.status || 'Sem status'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-center">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-md ${
                          vaga.daysOpen > 20 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {vaga.daysOpen} dias
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Nenhuma vaga parada</p>
                        <p className="text-xs text-slate-400">Todas as vagas já possuem status definido.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 border-t bg-slate-50/30 flex justify-end">
            <Button variant="outline" onClick={() => setIsStaleModalOpen(false)} className="text-xs font-bold uppercase tracking-wider">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
