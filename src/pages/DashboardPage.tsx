import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  AlertTriangle,
  UserCheck,
  AlertCircle,
  ArrowLeftRight,
  ChevronRight,
  ChevronDown,
  RefreshCcw,
  Search,
  X,
  Check,
  Calendar,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from 'recharts';
import { Button } from '@/components/ui/button';

// ─── Module-level constants ──────────────────────────────────────────────────

const UNIT_MAPPING = [
  { bank: 'HRD', vacancies: ['DOURADOS'], display: 'DOURADOS' },
  { bank: 'HRC', vacancies: ['HRCAC I', 'HRCAC II'], display: 'HRCAC I / II' },
  { bank: 'CHS', vacancies: ['CHS'], display: 'CHS' },
  { bank: 'HMSA', vacancies: ['HMSA'], display: 'HMSA' },
  { bank: 'JATAÍ', vacancies: ['JATAÍ'], display: 'JATAÍ' },
  { bank: 'POLICLÍNICA', vacancies: ['POLICLÍNICA'], display: 'POLICLÍNICA' },
  { bank: 'GOIÂNIA', vacancies: ['CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR'], display: 'GOIÂNIA (HOSPITAIS)' },
  { bank: 'UPA', vacancies: ['SÃO PEDRO', 'SUÁ', 'UPA'], display: 'VITÓRIA' },
];

const UNIT_GROUPS = [
  {
    key: 'go_es',
    label: 'Goiás / Espírito Santo',
    color: 'text-emerald-600',
    dot: 'bg-emerald-500',
    units: ['CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR', 'TEIA GOIÂNIA', 'TEIA ANÁPOLIS', 'TEIA APARECIDA', 'TEIA CANEDO', 'JATAÍ', 'POLICLÍNICA', 'SUÁ', 'SÃO PEDRO', 'VITÓRIA'],
  },
  {
    key: 'outras',
    label: 'Demais Unidades',
    color: 'text-violet-600',
    dot: 'bg-violet-500',
    units: ['HRD', 'HRC', 'HRCAC I', 'HRCAC II', 'HMSA', 'DOURADOS', 'TEIA CEN', 'TEIA PIN', 'CHS', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3'],
  },
] as const;

const ALL_UNITS_FLAT = UNIT_GROUPS.flatMap((g) => g.units);

const DONUT_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#6b7280'];

const canonicalCache = new Map<string, string>();
const resolveCanonicalName = (unitName: string) => {
  if (!unitName) return '';
  if (canonicalCache.has(unitName)) return canonicalCache.get(unitName)!;

  const norm = normalizeUnitName(unitName);

  for (const map of UNIT_MAPPING) {
    if (normalizeUnitName(map.bank) === norm || map.vacancies.some(v => normalizeUnitName(v) === norm)) {
      canonicalCache.set(unitName, map.display);
      return map.display;
    }
  }

  canonicalCache.set(unitName, norm);
  return norm;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora mesmo';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// ─── Component ───────────────────────────────────────────────────────────────

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
  const { selectedRegion, selectedUnits, setSelectedUnits } = useAdminStore();

  const [chartMode, setChartMode] = useState<'unidade' | 'regiao'>('unidade');
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const [isUnitPickerOpen, setIsUnitPickerOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── New filter state ──────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterPCD, setFilterPCD] = useState(false);
  const [filterTeia, setFilterTeia] = useState(false);

  // ── Recent activities ─────────────────────────────────────────────────────
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .in('modulo', ['Vagas', 'Convocações'])
          .order('created_at', { ascending: false })
          .limit(8);
        setRecentActivities(data || []);
      } catch {
        setRecentActivities([]);
      } finally {
        setIsLoadingActivities(false);
      }
    };
    fetchActivities();
  }, []);

  // ── Clear all filters ─────────────────────────────────────────────────────
  const clearAllFilters = useCallback(() => {
    setSelectedUnits(['all']);
    setDateFrom('');
    setDateTo('');
    setFilterPCD(false);
    setFilterTeia(false);
  }, [setSelectedUnits]);

  // ── Core filtering ────────────────────────────────────────────────────────
  const filterDashboardRecords = useCallback(<T extends { unidade?: string | null }>(records: T[]) => {
    if (selectedUnits.length > 0 && !selectedUnits.includes('all')) {
      return records.filter(r => selectedUnits.some(u => normalizeUnitName(u) === normalizeUnitName(r.unidade || '')));
    }
    return records;
  }, [selectedUnits]);

  const filteredVagas = useMemo(() => {
    let base = filterDashboardRecords(allVagas);

    if (dateFrom) base = base.filter(v => (v.data_abertura || '') >= dateFrom);
    if (dateTo) base = base.filter(v => (v.data_abertura || '') <= dateTo);
    if (filterPCD) base = base.filter(v => {
      const p = (v as any).pcd;
      return p === true || p === 'sim' || p === 'S' || p === 1 || p === '1';
    });
    if (filterTeia) base = base.filter(v =>
      normalizeUnitName(v.unidade || '').includes('teia')
    );

    return getValidVacancyBase(base, 'TODOS', 'TODOS');
  }, [allVagas, filterDashboardRecords, dateFrom, dateTo, filterPCD, filterTeia]);

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

  // ── Stats (Liderança removed) ─────────────────────────────────────────────
  const stats = useMemo(() => [
    { label: 'Total de Vagas',  value: totalVagas,                  icon: Briefcase,     color: 'text-primary',    bg: 'bg-primary/5',    accent: 'bg-primary',    description: 'Base ativa' },
    { label: 'Concluídas',      value: counts.concluidas,            icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',     accent: 'bg-green-500',  description: 'Vagas concluídas' },
    { label: 'Em Andamento',    value: counts.em_andamento,          icon: Activity,      color: 'text-blue-600',   bg: 'bg-blue-50',      accent: 'bg-blue-500',   description: 'Processos ativos' },
    { label: 'Convocações',     value: counts.convocacoes,           icon: Users,         color: 'text-purple-600', bg: 'bg-purple-50',    accent: 'bg-purple-500', description: 'Em convocação' },
    { label: 'Aguardando',      value: counts.aguardando_unidade,    icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50',    accent: 'bg-yellow-500', description: 'Aguardando retorno' },
    { label: 'Documentação',    value: counts.documentacao,          icon: FileText,      color: 'text-orange-600', bg: 'bg-orange-50',    accent: 'bg-orange-500', description: 'Pendência documental' },
    { label: 'Fila de Editais', value: counts.fila_edital,           icon: FileText,      color: 'text-amber-600',  bg: 'bg-amber-50',     accent: 'bg-amber-500',  description: 'Aguardando publicação' },
    { label: 'Suspensa',        value: counts.suspensa,              icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',       accent: 'bg-red-500',    description: 'Vagas suspensas' },
    { label: 'Cancelada',       value: counts.cancelada,             icon: AlertCircle,   color: 'text-slate-600',  bg: 'bg-slate-50',     accent: 'bg-slate-500',  description: 'Vagas canceladas' },
    { label: 'Mov. Interna',    value: counts.movimentacao_interna,  icon: ArrowLeftRight,color: 'text-cyan-600',   bg: 'bg-cyan-50',      accent: 'bg-cyan-500',   description: 'Movimentações internas' },
    { label: 'Em Admissão',     value: counts.em_admissao,           icon: UserCheck,     color: 'text-emerald-600',bg: 'bg-emerald-50',   accent: 'bg-emerald-500',description: 'Fase final' },
    { label: 'Banco Disponível',value: totalBancosDisponiveis,       icon: ShieldCheck,   color: 'text-emerald-600',bg: 'bg-emerald-50',   accent: 'bg-emerald-500',description: 'Bancos ativos' },
  ], [totalVagas, counts, totalBancosDisponiveis, totalTarefasPendentes]);

  // ── Strategic scope by unit ───────────────────────────────────────────────
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
          regionMap.set(reg, { name: reg, total: 0, ativos: 0, vagas: 0, bancos: 0, bancosCR: 0, pendencias: 0 });
        });
      }

      strategicScopeByUnit.forEach((entry) => {
        const current = regionMap.get(entry.region) || { name: entry.region, total: 0, ativos: 0, vagas: 0, bancos: 0, bancosCR: 0, pendencias: 0 };
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
  }, [chartMode, strategicScopeByUnit, selectedRegion]);

  const vacancyAlerts = useMemo(() => {
    const STALE_THRESHOLD_DAYS = 10;
    const statusConcluidos = ['concluida', 'concluidas', 'cancelada', 'canceladas', 'suspensa', 'admissao efetivada'];

    return vagas
      .filter((vaga) => {
        const s = normStatus(vaga.status || '');
        if (statusConcluidos.includes(s)) return false;

        const lastActivityDate = vaga.updated_at || vaga.data_criacao || vaga.data_importacao || vaga.data_recebimento || vaga.data_abertura;
        const daysInactive = calcDiasAberto(lastActivityDate);

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

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!selectedUnits.includes('all')) count++;
    if (dateFrom || dateTo) count++;
    if (filterPCD) count++;
    if (filterTeia) count++;
    return count;
  }, [selectedUnits, dateFrom, dateTo, filterPCD, filterTeia]);

  // ── Monthly area chart data ───────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; key: string; abertas: number; concluidas: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months.push({ month: label, key, abertas: 0, concluidas: 0 });
    }

    allVagas.forEach(v => {
      if (v.data_abertura) {
        const key = (v.data_abertura as string).slice(0, 7);
        const entry = months.find(m => m.key === key);
        if (entry) entry.abertas++;
      }
      const dataConclusao = (v as any).data_conclusao as string | undefined;
      if (dataConclusao) {
        const key = dataConclusao.slice(0, 7);
        const entry = months.find(m => m.key === key);
        if (entry) entry.concluidas++;
      }
    });

    return months.map(({ month, abertas, concluidas }) => ({ month, abertas, concluidas }));
  }, [allVagas]);

  // ── Donut chart data (tipo_vaga) ──────────────────────────────────────────
  const tipoVagaData = useMemo(() => {
    const map = new Map<string, number>();

    filteredVagas.forEach(v => {
      const tipo = (v as any).tipo_vaga as string | undefined;
      const key = tipo?.trim() || 'Não informado';
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────────────────────────────

  if (isInitialLoad || (isLoadingVagas && allVagas.length === 0)) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-44" />
        </div>
        {/* Filter bar skeleton */}
        <Skeleton className="h-14 w-full rounded-2xl" />
        {/* Scorecards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-8 rounded-lg mb-3" />
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-7 w-12" />
            </Card>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-80">
              <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
              <CardContent><Skeleton className="h-52 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-72">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
          <Card className="h-72">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Visão Geral do Provimento
          </h1>
          <p className="text-slate-400 font-bold mt-0.5 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
            Monitoramento em Tempo Real
          </p>
        </div>
        <button
          onClick={() => fetchAll()}
          className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm"
          title="Atualizar dados"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${(isLoadingVagas || isLoadingBancos) ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">

        {/* Date range */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent outline-none text-[11px] font-semibold text-slate-600 w-28 cursor-pointer"
            title="Data inicial"
          />
          <span className="text-slate-300">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-transparent outline-none text-[11px] font-semibold text-slate-600 w-28 cursor-pointer"
            title="Data final"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-slate-400 hover:text-red-500 transition-colors ml-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Unit picker */}
        <Popover
          open={isUnitPickerOpen}
          onOpenChange={(open) => {
            setIsUnitPickerOpen(open);
            if (open) setTimeout(() => searchInputRef.current?.focus(), 80);
            else setUnitSearch('');
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={`
                group flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-xl border text-[11px] font-bold
                uppercase tracking-wider transition-all duration-200 shadow-sm select-none
                ${selectedUnits.includes('all')
                  ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow'
                  : 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 shadow-primary/10'}
              `}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[180px] truncate">
                {selectedUnits.includes('all')
                  ? 'Todas as Unidades'
                  : selectedUnits.length === 1
                    ? selectedUnits[0]
                    : `${selectedUnits.length} unidades`}
              </span>
              {!selectedUnits.includes('all') && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white px-1">
                  {selectedUnits.length}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isUnitPickerOpen ? 'rotate-180' : ''}`} />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-72 p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Buscar unidade..."
                className="flex-1 bg-transparent text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none"
              />
              {unitSearch && (
                <button onClick={() => setUnitSearch('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100">
              <button
                onClick={() => setSelectedUnits(['all'])}
                className={`flex-1 h-6 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedUnits.includes('all')
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedUnits([...ALL_UNITS_FLAT])}
                className={`flex-1 h-6 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  !selectedUnits.includes('all') && selectedUnits.length === ALL_UNITS_FLAT.length
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Selecionar Todas
              </button>
              {!selectedUnits.includes('all') && (
                <button
                  onClick={() => setSelectedUnits(['all'])}
                  className="h-6 w-6 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                  title="Limpar filtro"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Unit list */}
            <div className="overflow-y-auto max-h-[280px] py-1">
              {UNIT_GROUPS.map((group) => {
                const filteredUnits = unitSearch.trim()
                  ? group.units.filter((u) => u.toLowerCase().includes(unitSearch.toLowerCase()))
                  : group.units;
                if (filteredUnits.length === 0) return null;

                const groupSelected = filteredUnits.every((u) => selectedUnits.includes(u));

                return (
                  <div key={group.key}>
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${group.color}`}>
                          {group.label}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const allSelected = filteredUnits.every((u) => selectedUnits.includes(u));
                          if (allSelected) {
                            const newUnits = selectedUnits.filter((u) => !filteredUnits.includes(u as any));
                            setSelectedUnits(newUnits.length === 0 ? ['all'] : newUnits);
                          } else {
                            const base = selectedUnits.includes('all') ? [] : [...selectedUnits];
                            const merged = Array.from(new Set([...base, ...filteredUnits]));
                            setSelectedUnits(merged);
                          }
                        }}
                        className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          groupSelected ? 'text-slate-400 hover:text-red-500' : `${group.color} hover:opacity-70`
                        }`}
                      >
                        {groupSelected ? 'Desmarcar' : 'Selecionar grupo'}
                      </button>
                    </div>

                    {filteredUnits.map((unit) => {
                      const isSelected = !selectedUnits.includes('all') && selectedUnits.includes(unit);
                      return (
                        <button
                          key={unit}
                          onClick={() => {
                            let next: string[];
                            if (selectedUnits.includes('all')) {
                              next = [unit];
                            } else if (selectedUnits.includes(unit)) {
                              next = selectedUnits.filter((u) => u !== unit);
                              if (next.length === 0) next = ['all'];
                            } else {
                              next = [...selectedUnits, unit];
                            }
                            setSelectedUnits(next);
                          }}
                          className={`
                            w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors
                            ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all
                            ${isSelected ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}
                          `}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className={`text-xs font-bold tracking-wide ${isSelected ? 'text-primary' : 'text-slate-600'}`}>
                            {unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {unitSearch && UNIT_GROUPS.every((g) => g.units.filter((u) => u.toLowerCase().includes(unitSearch.toLowerCase())).length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Nenhuma unidade encontrada para "{unitSearch}"
                </div>
              )}
            </div>

            {/* Footer summary */}
            {!selectedUnits.includes('all') && (
              <div className="border-t border-slate-100 px-3 py-2 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {selectedUnits.length} de {ALL_UNITS_FLAT.length} selecionadas
                </span>
                <button
                  onClick={() => setSelectedUnits(['all'])}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Limpar
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* PCD toggle */}
        <button
          onClick={() => setFilterPCD(!filterPCD)}
          className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
            filterPCD
              ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-200'
              : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          PCD
        </button>

        {/* Rede TEIA toggle */}
        <button
          onClick={() => setFilterTeia(!filterTeia)}
          className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
            filterTeia
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-200'
              : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Rede Teia
        </button>

        {/* Active filter badge + clear all */}
        {activeFilterCount > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-wider">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white">
                {activeFilterCount}
              </span>
              Filtro{activeFilterCount > 1 ? 's' : ''} Ativo{activeFilterCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={clearAllFilters}
              className="h-7 px-2.5 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-400 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-wider"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Selected unit chips */}
      {!selectedUnits.includes('all') && selectedUnits.length <= 5 && (
        <div className="flex flex-wrap gap-1.5 -mt-3">
          {selectedUnits.map((unit) => (
            <span
              key={unit}
              className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full bg-primary/8 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wide"
            >
              {unit}
              <button
                onClick={() => {
                  const next = selectedUnits.filter((u) => u !== unit);
                  setSelectedUnits(next.length === 0 ? ['all'] : next);
                }}
                className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <X className="h-2 w-2" />
              </button>
            </span>
          ))}
        </div>
      )}
      {!selectedUnits.includes('all') && selectedUnits.length > 5 && (
        <p className="text-[10px] font-bold text-primary/70 pl-1 -mt-3">
          {selectedUnits.length} unidades filtradas —{' '}
          <button onClick={() => setSelectedUnits(['all'])} className="underline hover:text-red-500 transition-colors">
            limpar filtro
          </button>
        </p>
      )}

      {/* ── Scorecards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stats.map((stat) => {
          const showSkeleton = isLoadingVagas && allVagas.length === 0;

          return (
            <Card
              key={stat.label}
              className="group relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default"
            >
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${stat.accent} opacity-80`} />
              <CardContent className="p-4 pt-5">
                <div className={`p-2 rounded-lg ${stat.bg} w-fit mb-3 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white shadow-sm`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 leading-tight whitespace-nowrap">
                  {stat.label}
                </p>
                {showSkeleton ? (
                  <Skeleton className="h-7 w-12 my-0.5" />
                ) : (
                  <p
                    key={stat.value}
                    className="text-2xl font-black text-slate-900 tracking-tighter animate-in zoom-in-50 duration-300"
                  >
                    {stat.value}
                  </p>
                )}
                <p className="text-[9px] font-semibold text-slate-400 italic leading-none whitespace-nowrap mt-0.5">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── 3-column chart grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart — Visão Estratégica */}
        <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-50 bg-slate-50/50">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Visão por {chartMode === 'regiao' ? 'Região' : 'Unidade'}
              </CardTitle>
              <CardDescription className="text-[10px] font-medium text-slate-400 ml-9 mt-0.5">
                Vagas e bancos consolidados
              </CardDescription>
            </div>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setChartMode('unidade')}
                className={`text-[9px] font-bold px-2.5 py-1.5 transition-all uppercase tracking-wider ${
                  chartMode === 'unidade' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-400 hover:bg-slate-50'
                }`}
              >
                Unidade
              </button>
              <button
                onClick={() => setChartMode('regiao')}
                className={`text-[9px] font-bold px-2.5 py-1.5 transition-all uppercase tracking-wider ${
                  chartMode === 'regiao' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-400 hover:bg-slate-50'
                }`}
              >
                Região
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 relative">
            {(isLoadingVagas || isLoadingBancos) && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-b-xl">
                <RefreshCcw className="h-6 w-6 text-primary/40 animate-spin" />
              </div>
            )}
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 gap-2">
                <TrendingUp className="h-8 w-8 text-slate-200" />
                <p className="text-xs text-slate-400 font-medium">Nenhum dado para o filtro atual</p>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 48, left: 4, bottom: 0 }}
                    barGap={3}
                  >
                    <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc', radius: 4 }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                      itemStyle={{ padding: '2px 0' }}
                      formatter={(value, name) => [
                        `${value} registros`,
                        name === 'vagas' ? 'Vagas' : 'Banco (CR)',
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    />
                    <Bar dataKey="vagas" name="Vagas" radius={[0, 3, 3, 0]} barSize={10}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-vagas-${index}`} fill={index < 3 ? '#1e3a5f' : '#93c5fd'} />
                      ))}
                      <LabelList
                        dataKey="vagas"
                        position="right"
                        style={{ fill: '#64748b', fontSize: '9px', fontWeight: 'bold' }}
                        offset={6}
                        formatter={(val: number) => val > 0 ? val : ''}
                      />
                    </Bar>
                    <Bar dataKey="bancosDisponiveis" name="Banco (CR)" fill="#10b981" radius={[0, 3, 3, 0]} barSize={10}>
                      <LabelList
                        dataKey="bancosDisponiveis"
                        position="right"
                        style={{ fill: '#10b981', fontSize: '9px', fontWeight: 'bold' }}
                        offset={6}
                        formatter={(val: number) => val > 0 ? val : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly area chart */}
        <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              Evolução Mensal
            </CardTitle>
            <CardDescription className="text-[10px] font-medium text-slate-400 ml-9 mt-0.5">
              Vagas abertas vs. concluídas (12 meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {monthlyData.every(m => m.abertas === 0 && m.concluidas === 0) ? (
              <div className="flex flex-col items-center justify-center h-60 gap-2">
                <TrendingUp className="h-8 w-8 text-slate-200" />
                <p className="text-xs text-slate-400 font-medium">Sem dados de abertura registrados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAbertas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }}
                    interval={1}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="abertas"
                    name="Abertas"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#gradAbertas)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="concluidas"
                    name="Concluídas"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradConcluidas)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut chart — tipo_vaga */}
        <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-violet-500" />
              </div>
              Tipo de Vaga
            </CardTitle>
            <CardDescription className="text-[10px] font-medium text-slate-400 ml-9 mt-0.5">
              Distribuição por tipo no filtro ativo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
            {tipoVagaData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 gap-2">
                <Briefcase className="h-8 w-8 text-slate-200" />
                <p className="text-xs text-slate-400 font-medium">Nenhum dado disponível</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={tipoVagaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {tipoVagaData.map((_, index) => (
                        <Cell key={`cell-donut-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                      formatter={(value, name) => [`${value} vagas`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="w-full space-y-1.5 mt-2">
                  {tipoVagaData.slice(0, 5).map((item, index) => {
                    const pct = totalVagas > 0 ? Math.round((item.value / totalVagas) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
                        />
                        <span className="text-[10px] font-semibold text-slate-600 flex-1 truncate">{item.name}</span>
                        <span className="text-[10px] font-black text-slate-400">{pct}%</span>
                        <span className="text-[10px] font-bold text-slate-300">({item.value})</span>
                      </div>
                    );
                  })}
                  {tipoVagaData.length > 5 && (
                    <p className="text-[9px] text-slate-400 font-medium text-center pt-1">
                      +{tipoVagaData.length - 5} outros tipos
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Stale vacancies panel (max 6) */}
        <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Vagas sem Movimentação</CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sem status ou paradas há mais de 10 dias</p>
                </div>
              </div>
              {alerts.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200">
                  {alerts.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {alerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors group">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${alert.type === 'vaga' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate leading-snug group-hover:text-primary transition-colors">
                        {alert.title}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight truncate">
                        {alert.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono font-bold text-slate-300">#{alert.reference}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                        alert.type === 'vaga'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {alert.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Tudo sob controle</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[180px]">Nenhuma pendência crítica no recorte selecionado.</p>
              </div>
            )}
          </CardContent>
          <div className="p-3 bg-slate-50/50 border-t border-slate-100">
            <Button
              variant="ghost"
              className="w-full text-[11px] font-bold text-primary hover:bg-primary/5 uppercase tracking-[0.12em] transition-all"
              onClick={() => setIsStaleModalOpen(true)}
            >
              Ver todas as vagas paradas <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Atividades Recentes */}
        <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Atividades Recentes</CardTitle>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Últimas ações registradas no sistema</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {isLoadingActivities ? (
              <div className="divide-y divide-slate-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <Skeleton className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="relative divide-y divide-slate-50">
                {recentActivities.map((activity, idx) => {
                  const desc = activity.descricao || activity.description || activity.acao || activity.action || 'Ação registrada';
                  const user = activity.usuario || activity.user_name || activity.user_email || '';
                  const time = activity.created_at ? formatRelativeTime(activity.created_at) : '';
                  const tipo = activity.tipo || activity.type || '';

                  return (
                    <div key={activity.id || idx} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors group">
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                        {idx < recentActivities.length - 1 && (
                          <div className="w-px h-full min-h-4 bg-slate-100 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">{desc}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {tipo && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded">
                              {tipo}
                            </span>
                          )}
                          {user && (
                            <span className="text-[10px] font-medium text-slate-400 truncate">{user}</span>
                          )}
                          {time && (
                            <span className="text-[10px] font-medium text-slate-300 ml-auto shrink-0">{time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-slate-300" />
                </div>
                <h4 className="text-sm font-bold text-slate-600">Nenhuma atividade registrada</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">As ações do sistema aparecerão aqui conforme forem realizadas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Stale vacancy full dialog (unchanged) ────────────────────────── */}
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
                  Vagas sem status ou com mais de 10 dias sem movimentação de status/etapa.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-center">Requisição</TableHead>
                  <TableHead className="text-left">Unidade</TableHead>
                  <TableHead className="text-left">Cargo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Dias Parado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingVagas && allVagas.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell className="py-4 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell className="py-4 px-6 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : vacancyAlerts.length > 0 ? (
                  vacancyAlerts.map((vaga) => (
                    <TableRow key={vaga.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell className="py-4 px-6 text-center font-mono text-[11px] font-bold text-slate-400 group-hover:text-primary transition-colors">
                        #{vaga.displayId}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-left">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-slate-300" />
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{normalizeUnitName(vaga.unidade)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-left">
                        <span className="text-xs font-bold text-slate-700">{vaga.cargo || 'Não informado'}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-center">
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
