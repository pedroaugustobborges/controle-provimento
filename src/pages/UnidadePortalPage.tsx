import { useState, useMemo, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useVagasStore } from '@/store/vagasStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon, Download, LogOut, Building2,
  MessageSquare, CheckCircle2, AlertCircle, Clock, BarChart3,
  Search, FileText, Edit3, Briefcase, Activity, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logoAgir from '@/assets/logo-agir.png';
import { BASES_CONVOCACAO } from '@/lib/convocacaoUtils';
import { getCategoriaStatus, normStatus, calcDiasAberto } from '@/lib/vagaUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie
} from 'recharts';

// Flat list of all units across all bases
const TODAS_UNIDADES: string[] = (Object.values(BASES_CONVOCACAO) as string[][])
  .flat()
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const STATUS_COLOR: Record<string, string> = {
  aceite: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  recusa_plantao: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  recusa_unidade: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  recusa_horario: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  desistiu: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  faltou: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  pendente: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

export default function UnidadePortalPage() {
  const navigate = useNavigate();
  const { currentUser } = useAdminStore();
  const { convocacoes, vagas, updateConvocacao } = useVagasStore();
  const { signOut } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [obsDialog, setObsDialog] = useState<{ open: boolean; convId: string; current: string }>({
    open: false, convId: '', current: ''
  });
  const [obsText, setObsText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Access control
  const isAdmin = currentUser?.perfil === 'Administrador';
  const isSupervision = currentUser?.perfil === 'Supervisão';
  const hasAccess = isAdmin || isSupervision;

  // Determine accessible units
  const unidadesVinculadas: string[] = currentUser?.unidades_vinculadas || [];
  const podeVerTodas = isAdmin || currentUser?.visualiza_todas_unidades || (isSupervision && unidadesVinculadas.length === 0);

  const unidadesDisponiveis = useMemo(() => {
    if (podeVerTodas) return TODAS_UNIDADES;
    return unidadesVinculadas;
  }, [podeVerTodas, unidadesVinculadas]);

  const defaultUnit = unidadesVinculadas.length === 1 && !podeVerTodas
    ? unidadesVinculadas[0]
    : 'all';
  const [selectedUnidade, setSelectedUnidade] = useState<string>(defaultUnit);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      toast.error('Acesso restrito ao Portal da Unidade.');
      navigate('/');
    }
  }, [currentUser, hasAccess, navigate]);

  const unidadeLabel = selectedUnidade === 'all'
    ? (podeVerTodas ? 'Todas as Unidades' : 'Minhas Unidades')
    : selectedUnidade;

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Helper to check if a convocacao matches unit filter
  const matchesUnit = (unidade: string | undefined) => {
    const norm = unidade?.toLowerCase().trim() || '';
    if (selectedUnidade === 'all') {
      if (podeVerTodas) return true;
      return unidadesVinculadas.some(u => norm.includes(u.toLowerCase().trim()));
    }
    const normSelected = selectedUnidade.toLowerCase().trim();
    return norm.includes(normSelected) || normSelected.includes(norm);
  };

  // ====== CONVOCAÇÕES DO DIA ======
  const todayConvocacoes = useMemo(() => {
    return convocacoes.filter(c => {
      if (!c.data_convocacao || !c.horario) return false;
      if (c.data_convocacao !== dateStr) return false;
      return matchesUnit(c.unidade);
    }).sort((a, b) => a.horario.localeCompare(b.horario));
  }, [convocacoes, dateStr, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  // ====== ALL CONVOCAÇÕES (for unit filter) ======
  const allFilteredConvocacoes = useMemo(() => {
    return convocacoes.filter(c => matchesUnit(c.unidade));
  }, [convocacoes, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  // ====== VAGAS DA UNIDADE ======
  const filteredVagas = useMemo(() => {
    return vagas.filter(v => matchesUnit(v.unidade));
  }, [vagas, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  // ====== STATS ======
  const convStats = useMemo(() => ({
    total: todayConvocacoes.length,
    aceitos: todayConvocacoes.filter(c => c.status === 'aceite').length,
    pendentes: todayConvocacoes.filter(c => c.status === 'pendente').length,
    recusas: todayConvocacoes.filter(c =>
      ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status)
    ).length,
  }), [todayConvocacoes]);

  // ====== DASHBOARD STATS ======
  const dashStats = useMemo(() => {
    const counts = {
      totalVagas: filteredVagas.length,
      emAndamento: 0,
      concluidas: 0,
      filaEdital: 0,
      convocacoes: 0,
      suspensas: 0,
      aguardando: 0,
    };
    filteredVagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      if (cat === 'em_andamento') counts.emAndamento++;
      else if (cat === 'concluidas') counts.concluidas++;
      else if (cat === 'fila_edital') counts.filaEdital++;
      else if (cat === 'convocacoes') counts.convocacoes++;
      else if (cat === 'suspensa') counts.suspensas++;
      else if (cat === 'aguardando_unidade') counts.aguardando++;
    });
    return counts;
  }, [filteredVagas]);

  // ====== CHART: status distribution ======
  const statusChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      const label = {
        em_andamento: 'Em Andamento',
        concluidas: 'Concluídas',
        fila_edital: 'Fila Edital',
        convocacoes: 'Convocações',
        suspensa: 'Suspensas',
        cancelada: 'Canceladas',
        aguardando_unidade: 'Aguardando',
        documentacao: 'Documentação',
        em_admissao: 'Admissão',
        vagas_lideranca: 'Liderança',
        movimentacao_interna: 'Mov. Interna',
      }[cat] || cat;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  // ====== CHART: convocações por unidade ======
  const convByUnitData = useMemo(() => {
    const map: Record<string, { aceitos: number; pendentes: number; recusas: number }> = {};
    allFilteredConvocacoes.forEach(c => {
      const unit = c.unidade || 'Sem Unidade';
      if (!map[unit]) map[unit] = { aceitos: 0, pendentes: 0, recusas: 0 };
      if (c.status === 'aceite') map[unit].aceitos++;
      else if (c.status === 'pendente') map[unit].pendentes++;
      else map[unit].recusas++;
    });
    return Object.entries(map)
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => (b.aceitos + b.pendentes + b.recusas) - (a.aceitos + a.pendentes + a.recusas))
      .slice(0, 10);
  }, [allFilteredConvocacoes]);

  // ====== CONSULTA STATUS ======
  const vagasParaConsulta = useMemo(() => {
    let result = filteredVagas;
    if (statusFilter !== 'all') {
      result = result.filter(v => getCategoriaStatus(v) === statusFilter);
    }
    return result.slice(0, 200);
  }, [filteredVagas, statusFilter]);

  // ====== OBSERVAÇÕES RECENTES ======
  const convocacoesComObs = useMemo(() => {
    return allFilteredConvocacoes
      .filter(c => c.observacoes && c.observacoes.trim() !== '')
      .sort((a, b) => (b.data_convocacao || '').localeCompare(a.data_convocacao || ''))
      .slice(0, 50);
  }, [allFilteredConvocacoes]);

  const convocacoesSemObs = useMemo(() => {
    return allFilteredConvocacoes
      .filter(c => !c.observacoes || c.observacoes.trim() === '')
      .sort((a, b) => (b.data_convocacao || '').localeCompare(a.data_convocacao || ''))
      .slice(0, 30);
  }, [allFilteredConvocacoes]);

  // Map vaga_id → vaga status
  const vagaStatusMap = useMemo(() => {
    const map: Record<string, string> = {};
    vagas.forEach(v => { map[v.id] = v.status || ''; });
    return map;
  }, [vagas]);

  const handleOpenObs = (convId: string, current: string) => {
    setObsDialog({ open: true, convId, current });
    setObsText(current || '');
  };

  const handleSaveObs = async () => {
    if (!obsDialog.convId) return;
    try {
      await updateConvocacao(obsDialog.convId, { observacoes: obsText });
      toast.success('Observação salva com sucesso.');
      setObsDialog({ open: false, convId: '', current: '' });
      setObsText('');
    } catch {
      toast.error('Erro ao salvar observação. Tente novamente.');
    }
  };

  const handleExport = () => {
    const rows = [
      ['Data', 'Horário', 'Candidato', 'Cargo', 'Unidade', 'Status', 'Observação'],
      ...todayConvocacoes.map(c => [
        c.data_convocacao ? format(new Date(c.data_convocacao + 'T12:00:00'), 'dd/MM/yyyy') : '',
        c.horario || '',
        c.nome_candidato || '',
        c.cargo || '',
        c.unidade || '',
        STATUS_CONVOCACAO_LABELS[c.status as keyof typeof STATUS_CONVOCACAO_LABELS] || c.status,
        c.observacoes || '',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `convocacoes_${unidadeLabel.replace(/\s+/g, '_')}_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação gerada com sucesso.');
  };

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await supabase
          .from('user_sessions')
          .update({ logout_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .is('logout_at', null);
      }
      await signOut();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  if (!currentUser || !hasAccess) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col transition-all duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A192F] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-1.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all cursor-pointer">
            <img src={logoAgir} alt="AGIR Logo" className="h-9 w-9 object-contain" />
          </div>
          <div className="hidden xs:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Portal da Unidade</p>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">
              {unidadeLabel}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Unit selector in header */}
          {(podeVerTodas || unidadesVinculadas.length > 1) && (
            <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
              <SelectTrigger 
                aria-label="Selecionar Unidade"
                className="w-36 sm:w-48 bg-white/5 border-white/10 text-white text-xs sm:text-sm font-semibold hover:bg-white/10 focus:ring-white/20 transition-all rounded-lg"
              >
                <Building2 className="h-3.5 w-3.5 text-white/40 mr-1.5 shrink-0" />
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent align="end" className="w-56 sm:w-64">
                <SelectItem value="all" className="font-semibold">Todas as Unidades</SelectItem>
                {unidadesDisponiveis.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-white/90 leading-tight">{currentUser?.nome_completo}</span>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tighter">{currentUser?.perfil}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair do Portal"
              aria-label="Sair"
              className="text-white/60 hover:text-white hover:bg-rose-500/20 transition-all rounded-full h-9 w-9 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6 lg:py-8 space-y-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="sticky top-[68px] z-40 py-2 -mt-2 bg-slate-50/80 backdrop-blur-sm sm:static sm:bg-transparent">
            <TabsList className="bg-white/80 border border-slate-200 shadow-sm p-1.5 rounded-2xl h-auto flex flex-wrap sm:flex-nowrap gap-1">
              <TabsTrigger 
                value="dashboard" 
                className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden">Geral</span>
              </TabsTrigger>
              <TabsTrigger 
                value="status" 
                className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md"
              >
                <Search className="h-4 w-4" />
                <span className="hidden xs:inline">Status das Vagas</span>
                <span className="xs:hidden">Vagas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="convocacoes" 
                className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Convocações</span>
                <span className="xs:hidden">Agenda</span>
              </TabsTrigger>
              <TabsTrigger 
                value="observacoes" 
                className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md"
              >
                <Edit3 className="h-4 w-4" />
                <span className="hidden xs:inline">Observações</span>
                <span className="xs:hidden">Obs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== ABA 1: DASHBOARD ==================== */}
          <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {[
                { label: 'Total de Vagas', value: dashStats.totalVagas, icon: Briefcase, color: 'text-slate-700', bg: 'bg-slate-100/80', border: 'border-slate-200/60' },
                { label: 'Em Andamento', value: dashStats.emAndamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50/80', border: 'border-blue-100/60' },
                { label: 'Concluídas', value: dashStats.concluidas, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-100/60' },
                { label: 'Fila de Editais', value: dashStats.filaEdital, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-100/60' },
                { label: 'Convocações', value: dashStats.convocacoes, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50/80', border: 'border-purple-100/60' },
                { label: 'Suspensas', value: dashStats.suspensas, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-100/60' },
                { label: 'Aguardando', value: dashStats.aguardando, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50/80', border: 'border-yellow-100/60' },
                { label: 'Conv. Hoje', value: convStats.total, icon: CalendarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-100/60' },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <Card key={label} className={cn("border bg-white shadow-sm hover:shadow-md transition-all duration-300 group rounded-2xl overflow-hidden", border)}>
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className={cn('p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110 duration-300', bg)}>
                      <Icon className={cn('h-6 w-6', color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{label}</p>
                      <p className={cn("text-2xl sm:text-3xl font-black tracking-tight", color === 'text-slate-700' ? 'text-slate-900' : color)}>
                        {value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
              {/* Status distribution */}
              <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Distribuição de Status das Vagas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {statusChartData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <BarChart3 className="h-10 w-10 opacity-20" />
                      <p className="text-sm font-medium">Sem dados para exibir</p>
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20}>
                            <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 800, fill: '#1e293b' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Convocações por unidade */}
              <Card className="border-slate-200/60 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    Convocações por Unidade (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {convByUnitData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Users className="h-10 w-10 opacity-20" />
                      <p className="text-sm font-medium">Sem dados para exibir</p>
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={convByUnitData} margin={{ left: 10, right: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} 
                            angle={-30} 
                            textAnchor="end" 
                            height={60} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="aceitos" stackId="a" fill="#10b981" name="Aceitos" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="pendentes" stackId="a" fill="#6366f1" name="Pendentes" />
                          <Bar dataKey="recusas" stackId="a" fill="#f43f5e" name="Recusas" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Today summary */}
            <Card className="border-slate-200/60 shadow-md bg-white rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                    Resumo do Dia
                  </span>
                  <span className="text-xs font-semibold text-slate-400 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                    {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12">
                  {[
                    { label: 'Total', value: convStats.total, color: 'text-slate-900', bg: 'bg-slate-100', icon: Users },
                    { label: 'Aceitos', value: convStats.aceitos, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
                    { label: 'Pendentes', value: convStats.pendentes, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Clock },
                    { label: 'Recusas', value: convStats.recusas, color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle },
                  ].map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className="flex flex-col items-center gap-3 group">
                      <div className={cn('p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm', bg)}>
                        <Icon className={cn('h-6 w-6', color)} />
                      </div>
                      <div className="text-center">
                        <p className={cn('text-3xl sm:text-4xl font-black tracking-tighter leading-none', color)}>{value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ABA 2: CONSULTA DE STATUS ==================== */}
          <TabsContent value="status" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Status das Vagas</h2>
                <p className="text-sm font-medium text-slate-500">Acompanhamento em tempo real de todas as requisições</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 md:w-64 bg-white font-bold text-slate-700 h-11 rounded-xl shadow-sm border-slate-200 hover:border-slate-300 transition-all">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="all" className="font-bold">Todos os Status</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="fila_edital">Fila de Editais</SelectItem>
                    <SelectItem value="convocacoes">Convocações</SelectItem>
                    <SelectItem value="concluidas">Concluídas</SelectItem>
                    <SelectItem value="suspensa">Suspensas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                    <SelectItem value="aguardando_unidade">Aguardando Unidade</SelectItem>
                    <SelectItem value="documentacao">Documentação</SelectItem>
                    <SelectItem value="em_admissao">Admissão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-slate-200/60 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {vagasParaConsulta.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-base font-bold text-slate-900">Nenhuma vaga encontrada</p>
                    <p className="text-sm text-slate-400 mt-1">Tente ajustar seus filtros para encontrar o que procura.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 border-b border-slate-100">
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Cargo</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Unidade</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Data</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">SLA</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Etapa Atual</TableHead>
                          <TableHead className="py-5 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Analista</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vagasParaConsulta.map((v, idx) => {
                          const dias = calcDiasAberto(v.data_recebimento || v.data_abertura);
                          return (
                            <TableRow key={v.id} className={cn(
                              "hover:bg-blue-50/30 transition-colors border-b border-slate-50/60",
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                            )}>
                              <TableCell className="py-4 px-6 font-bold text-slate-900 text-sm whitespace-nowrap">{v.cargo || '—'}</TableCell>
                              <TableCell className="py-4 px-6 text-slate-500 text-sm font-medium">{v.unidade || '—'}</TableCell>
                              <TableCell className="py-4 px-6">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] font-black px-3 py-1 rounded-full border shadow-sm transition-all duration-300",
                                    v.status?.toLowerCase().includes('concluída') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    v.status?.toLowerCase().includes('cancelada') || v.status?.toLowerCase().includes('suspensa') ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'
                                  )}
                                >
                                  {v.status || 'Sem Status'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-slate-500 text-sm font-bold text-center">
                                {v.data_abertura ? format(new Date(v.data_abertura + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                              </TableCell>
                              <TableCell className="py-4 px-6 text-center">
                                <div className={cn(
                                  "inline-flex items-center justify-center h-8 w-12 rounded-lg font-black text-xs shadow-sm border",
                                  dias > 15 ? "bg-rose-50 text-rose-600 border-rose-100" : 
                                  dias > 10 ? "bg-amber-50 text-amber-600 border-amber-100" : 
                                  "bg-emerald-50 text-emerald-600 border-emerald-100"
                                )}>
                                  {dias}d
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-slate-600 text-sm font-semibold">
                                {v.acompanhamento?.etapa_atual || <span className="text-slate-300 italic">N/A</span>}
                              </TableCell>
                              <TableCell className="py-4 px-6 text-slate-500 text-sm font-medium">
                                {v.analista_responsavel || <span className="text-slate-300 italic">Pendente</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Listagem Limitada aos 200 registros mais recentes
              </p>
              <p className="text-xs font-black text-[#0A192F] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Mostrando {vagasParaConsulta.length} de {filteredVagas.length} vagas
              </p>
            </div>
          </TabsContent>

          {/* ==================== ABA 3: CONVOCAÇÕES DIÁRIAS ==================== */}
          <TabsContent value="convocacoes" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Agenda de Convocações</h2>
                <p className="text-sm font-medium text-slate-500">Controle e acompanhamento das entrevistas agendadas</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 md:flex-none h-11 px-4 gap-3 font-bold text-slate-700 bg-white rounded-xl shadow-sm border-slate-200 hover:border-slate-300 transition-all">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                      {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-100" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) { setSelectedDate(date); setCalendarOpen(false); }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  onClick={handleExport} 
                  variant="outline" 
                  className="flex-1 md:flex-none h-11 px-4 gap-3 font-bold bg-white rounded-xl shadow-sm border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <Download className="h-4 w-4 text-emerald-500" />
                  <span className="hidden xs:inline">Exportar Planilha</span>
                  <span className="xs:hidden">Exportar</span>
                </Button>
              </div>
            </div>

            {/* Day stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Hoje', value: convStats.total, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
                { label: 'Confirmados', value: convStats.aceitos, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Em Aberto', value: convStats.pendentes, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Cancelados', value: convStats.recusas, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border-slate-200/60 shadow-sm rounded-2xl hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className={cn('p-3 rounded-2xl shrink-0', bg)}>
                      <Icon className={cn('h-5 w-5', color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Convocações table */}
            <Card className="border-slate-200/60 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="py-5 px-6 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <span className="block text-sm font-black text-slate-900 leading-tight capitalize">
                        {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {todayConvocacoes.length} candidato{todayConvocacoes.length !== 1 ? 's' : ''} agendado{todayConvocacoes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {todayConvocacoes.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-base font-bold text-slate-900">Agenda vazia</p>
                    <p className="text-sm text-slate-400 mt-1">Não existem convocações agendadas para este dia.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/30 border-b border-slate-100">
                          <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-24">Horário</TableHead>
                          <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Candidato</TableHead>
                          <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Cargo</TableHead>
                          {selectedUnidade === 'all' && (
                            <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Unidade</TableHead>
                          )}
                          <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Status Conv.</TableHead>
                          <TableHead className="py-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Observação</TableHead>
                          <TableHead className="py-4 px-6 w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayConvocacoes.map((conv, idx) => (
                          <TableRow key={conv.id} className={cn(
                            "hover:bg-blue-50/30 transition-all border-b border-slate-50/60",
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                          )}>
                            <TableCell className="py-4 px-6">
                              <span className="inline-flex items-center justify-center bg-slate-900 text-white font-black text-xs h-8 w-14 rounded-lg shadow-sm">
                                {conv.horario}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="block font-bold text-slate-900 text-sm leading-tight">{conv.nome_candidato}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Candidato(a)</span>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-slate-600 text-sm font-semibold">{conv.cargo}</TableCell>
                            {selectedUnidade === 'all' && (
                              <TableCell className="py-4 px-6 text-slate-500 text-sm font-bold">{conv.unidade}</TableCell>
                            )}
                            <TableCell className="py-4 px-6">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-black px-3 py-1 rounded-full border shadow-sm',
                                  STATUS_COLOR[conv.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                                )}
                              >
                                {STATUS_CONVOCACAO_LABELS[conv.status as keyof typeof STATUS_CONVOCACAO_LABELS] || conv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <p className="text-sm text-slate-500 font-medium max-w-[200px] truncate" title={conv.observacoes}>
                                {conv.observacoes || <span className="italic text-slate-300">Sem notas</span>}
                              </p>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenObs(conv.id, conv.observacoes || '')}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-xl"
                                title="Inserir / editar observação"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ABA 4: OBSERVAÇÕES ==================== */}
          <TabsContent value="observacoes" className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Observações das Convocações</h2>
              <p className="text-sm text-slate-500">Insira ou visualize observações nas convocações agendadas</p>
            </div>

            {/* Convocações sem observação — para inserir */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-amber-500" />
                  Convocações Pendentes de Observação ({convocacoesSemObs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {convocacoesSemObs.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    Todas as convocações possuem observação.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Data</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Horário</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Candidato</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Cargo</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Unidade</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {convocacoesSemObs.map(c => (
                          <TableRow key={c.id} className="hover:bg-slate-50/60">
                            <TableCell className="text-sm text-slate-600">
                              {c.data_convocacao ? format(new Date(c.data_convocacao + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-700 text-sm">{c.horario || '—'}</TableCell>
                            <TableCell className="font-semibold text-slate-800">{c.nome_candidato || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{c.cargo || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{c.unidade || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLOR[c.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                                {STATUS_CONVOCACAO_LABELS[c.status as keyof typeof STATUS_CONVOCACAO_LABELS] || c.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenObs(c.id, '')}
                                className="h-8 gap-1 text-xs font-bold"
                              >
                                <Edit3 className="h-3 w-3" />
                                Inserir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Convocações com observação */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  Observações Registradas ({convocacoesComObs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {convocacoesComObs.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    Nenhuma observação registrada ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Data</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Candidato</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Cargo</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Unidade</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Observação</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {convocacoesComObs.map(c => (
                          <TableRow key={c.id} className="hover:bg-slate-50/60">
                            <TableCell className="text-sm text-slate-600">
                              {c.data_convocacao ? format(new Date(c.data_convocacao + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800">{c.nome_candidato || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{c.cargo || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{c.unidade || '—'}</TableCell>
                            <TableCell className="text-sm text-slate-700 max-w-[300px]">
                              <p className="line-clamp-2">{c.observacoes}</p>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenObs(c.id, c.observacoes || '')}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                                title="Editar observação"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Observation dialog */}
      <Dialog open={obsDialog.open} onOpenChange={(o) => !o && setObsDialog({ open: false, convId: '', current: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <MessageSquare className="h-5 w-5 text-primary" />
              Observação
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Digite a observação..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog({ open: false, convId: '', current: '' })}>
              Cancelar
            </Button>
            <Button onClick={handleSaveObs}>
              Salvar Observação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
