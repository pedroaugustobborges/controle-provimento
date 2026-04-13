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
import { getCategoriaStatus, calcDiasAberto } from '@/lib/vagaUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, Legend
} from 'recharts';

// Flat list of all units across all bases
const TODAS_UNIDADES: string[] = (Object.values(BASES_CONVOCACAO) as string[][])
  .flat()
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const STATUS_COLOR: Record<string, string> = {
  aceite: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  recusa_plantao: 'bg-rose-50 text-rose-700 border-rose-100',
  recusa_unidade: 'bg-rose-50 text-rose-700 border-rose-100',
  recusa_horario: 'bg-amber-50 text-amber-700 border-amber-100',
  desistiu: 'bg-slate-50 text-slate-600 border-slate-100',
  faltou: 'bg-red-50 text-red-700 border-red-100',
  pendente: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

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

  const isAdmin = currentUser?.perfil === 'Administrador';
  const isSupervision = currentUser?.perfil === 'Supervisão';
  const hasAccess = isAdmin || isSupervision;

  const unidadesVinculadas: string[] = currentUser?.unidades_vinculadas || [];
  const podeVerTodas = isAdmin || currentUser?.visualiza_todas_unidades || (isSupervision && unidadesVinculadas.length === 0);

  const unidadesDisponiveis = useMemo(() => {
    if (podeVerTodas) return TODAS_UNIDADES;
    return unidadesVinculadas;
  }, [podeVerTodas, unidadesVinculadas]);

  const defaultUnit = unidadesVinculadas.length === 1 && !podeVerTodas ? unidadesVinculadas[0] : 'all';
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

  const matchesUnit = (unidade: string | undefined) => {
    const norm = unidade?.toLowerCase().trim() || '';
    if (selectedUnidade === 'all') {
      if (podeVerTodas) return true;
      return unidadesVinculadas.some(u => norm.includes(u.toLowerCase().trim()));
    }
    const normSelected = selectedUnidade.toLowerCase().trim();
    return norm.includes(normSelected) || normSelected.includes(norm);
  };

  const todayConvocacoes = useMemo(() => {
    return convocacoes.filter(c => {
      if (!c.data_convocacao || !c.horario) return false;
      if (c.data_convocacao !== dateStr) return false;
      return matchesUnit(c.unidade);
    }).sort((a, b) => a.horario.localeCompare(b.horario));
  }, [convocacoes, dateStr, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  const allFilteredConvocacoes = useMemo(() => {
    return convocacoes.filter(c => matchesUnit(c.unidade));
  }, [convocacoes, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  const filteredVagas = useMemo(() => {
    return vagas.filter(v => matchesUnit(v.unidade));
  }, [vagas, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  const convStats = useMemo(() => ({
    total: todayConvocacoes.length,
    aceitos: todayConvocacoes.filter(c => c.status === 'aceite').length,
    pendentes: todayConvocacoes.filter(c => c.status === 'pendente').length,
    recusas: todayConvocacoes.filter(c =>
      ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status)
    ).length,
  }), [todayConvocacoes]);

  const dashStats = useMemo(() => {
    const counts = { totalVagas: filteredVagas.length, emAndamento: 0, concluidas: 0, filaEdital: 0, convocacoes: 0, suspensas: 0, aguardando: 0 };
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

  const statusChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVagas.forEach(v => {
      const cat = getCategoriaStatus(v);
      const label = {
        em_andamento: 'Em Andamento', concluidas: 'Concluídas', fila_edital: 'Fila Edital', convocacoes: 'Convocações',
        suspensa: 'Suspensas', cancelada: 'Canceladas', aguardando_unidade: 'Aguardando', documentacao: 'Documentação',
        em_admissao: 'Admissão', vagas_lideranca: 'Liderança', movimentacao_interna: 'Mov. Interna',
      }[cat] || cat;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

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

  const vagasParaConsulta = useMemo(() => {
    let result = filteredVagas;
    if (statusFilter !== 'all') {
      result = result.filter(v => getCategoriaStatus(v) === statusFilter);
    }
    return result.slice(0, 200);
  }, [filteredVagas, statusFilter]);

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
      toast.error('Erro ao salvar observação.');
    }
  };

  const handleExport = () => {
    const rows = [['Data', 'Horário', 'Candidato', 'Cargo', 'Unidade', 'Status', 'Observação'], ...todayConvocacoes.map(c => [
      c.data_convocacao ? format(new Date(c.data_convocacao + 'T12:00:00'), 'dd/MM/yyyy') : '', c.horario || '', c.nome_candidato || '', c.cargo || '', c.unidade || '', STATUS_CONVOCACAO_LABELS[c.status as keyof typeof STATUS_CONVOCACAO_LABELS] || c.status, c.observacoes || '',
    ])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `convocacoes_${unidadeLabel.replace(/\s+/g, '_')}_${dateStr}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação gerada.');
  };

  const handleLogout = async () => {
    try {
      if (currentUser) await supabase.from('user_sessions').update({ logout_at: new Date().toISOString() }).eq('user_id', currentUser.id).is('logout_at', null);
      await signOut(); navigate('/login');
    } catch { navigate('/login'); }
  };

  if (!currentUser || !hasAccess) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col transition-all duration-300">
      <header className="sticky top-0 z-50 bg-[#0A192F] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-1.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all cursor-pointer">
            <img src={logoAgir} alt="AGIR Logo" className="h-9 w-9 object-contain" />
          </div>
          <div className="hidden xs:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Portal da Unidade</p>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">{unidadeLabel}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {(podeVerTodas || unidadesVinculadas.length > 1) && (
            <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
              <SelectTrigger aria-label="Selecionar Unidade" className="w-36 sm:w-48 bg-white/5 border-white/10 text-white text-xs sm:text-sm font-semibold hover:bg-white/10 focus:ring-white/20 transition-all rounded-lg">
                <Building2 className="h-3.5 w-3.5 text-white/40 mr-1.5 shrink-0" />
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent align="end" className="w-56 sm:w-64">
                <SelectItem value="all" className="font-semibold">Todas as Unidades</SelectItem>
                {unidadesDisponiveis.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-white/90 leading-tight">{currentUser?.nome_completo}</span>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tighter">{currentUser?.perfil}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair do Portal" aria-label="Sair" className="text-white/60 hover:text-white hover:bg-rose-500/20 transition-all rounded-full h-9 w-9 shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6 lg:py-8 space-y-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="sticky top-[68px] z-40 py-2 -mt-2 bg-slate-50/80 backdrop-blur-sm sm:static sm:bg-transparent">
            <TabsList className="bg-white/80 border border-slate-200 shadow-sm p-1.5 rounded-2xl h-auto flex flex-wrap sm:flex-nowrap gap-1">
              {[{v:'dashboard',i:BarChart3,l:'Dashboard'},{v:'status',i:Search,l:'Status'},{v:'convocacoes',i:CalendarIcon,l:'Agenda'},{v:'observacoes',i:Edit3,l:'Obs'}].map(t => (
                <TabsTrigger key={t.v} value={t.v} className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md">
                  <t.i className="h-4 w-4" />
                  <span className="hidden xs:inline">{t.l}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Vagas', value: dashStats.totalVagas, icon: Briefcase, color: 'text-slate-900', bg: 'bg-slate-100' },
                { label: 'Em Andamento', value: dashStats.emAndamento, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Concluídas', value: dashStats.concluidas, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Conv. Hoje', value: convStats.total, icon: CalendarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border-slate-200/60 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn('p-3 rounded-2xl', bg)}><Icon className={cn('h-5 w-5', color)} /></div>
                    <div>
                      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700">Distribuição de Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                          <LabelList dataKey="value" position="right" style={{fontSize: 11, fontWeight: 800}} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700">Convocações por Unidade</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={convByUnitData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 8}} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="aceitos" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pendentes" stackId="a" fill="#6366f1" />
                        <Bar dataKey="recusas" stackId="a" fill="#f43f5e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status" className="animate-in fade-in duration-500">
            <Card className="rounded-2xl border-slate-200/60 shadow-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Cargo</TableHead>
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Status</TableHead>
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Data</TableHead>
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vagasParaConsulta.map(v => (
                      <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-4 px-6 font-bold text-slate-900 text-sm">{v.cargo || '—'}</TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge variant="outline" className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-50 text-blue-700 border-blue-100">
                            {v.status || 'Sem Status'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-slate-500 text-xs font-bold">
                          {v.data_abertura ? format(new Date(v.data_abertura + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className={cn("inline-flex h-8 w-12 items-center justify-center rounded-lg font-black text-xs", calcDiasAberto(v.data_recebimento || v.data_abertura) > 10 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                            {calcDiasAberto(v.data_recebimento || v.data_abertura)}d
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="convocacoes" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-end gap-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-xl font-bold gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
                  <CalendarComponent mode="single" selected={selectedDate} onSelect={(d) => { if(d){setSelectedDate(d); setCalendarOpen(false);} }} locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={handleExport} className="rounded-xl font-bold gap-2"><Download className="h-4 w-4" />Exportar</Button>
            </div>
            <Card className="rounded-2xl border-slate-200/60 shadow-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Hora</TableHead>
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Candidato</TableHead>
                      <TableHead className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-slate-500">Status</TableHead>
                      <TableHead className="py-5 px-6 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayConvocacoes.map(c => (
                      <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-4 px-6 font-black text-slate-900 text-sm">{c.horario}</TableCell>
                        <TableCell className="py-4 px-6 font-bold text-slate-800 text-sm">{c.nome_candidato}</TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge className={cn("text-[10px] font-black rounded-full", STATUS_COLOR[c.status] || 'bg-slate-100 text-slate-600')}>
                            {STATUS_CONVOCACAO_LABELS[c.status as keyof typeof STATUS_CONVOCACAO_LABELS] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenObs(c.id, c.observacoes || '')}><MessageSquare className="h-4 w-4 text-slate-400" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="observacoes" className="space-y-6 animate-in fade-in duration-500">
            <Card className="rounded-2xl border-slate-200/60 shadow-xl overflow-hidden bg-white">
              <CardHeader className="bg-amber-50/30 border-b border-amber-100"><CardTitle className="text-sm font-bold text-amber-800">Pendentes</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {convocacoesSemObs.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="py-4 px-6 font-bold text-sm text-slate-900">{c.nome_candidato}</TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenObs(c.id, '')} className="text-amber-600 font-bold gap-2"><Edit3 className="h-4 w-4" />Inserir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={obsDialog.open} onOpenChange={(o) => !o && setObsDialog({ open: false, convId: '', current: '' })}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-3xl overflow-hidden shadow-2xl border-none">
          <DialogHeader className="px-6 pt-6 pb-4 bg-[#0A192F] text-white">
            <DialogTitle className="text-xl font-black">Inserir Observação</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <Textarea value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Digite a observação..." className="min-h-[160px] rounded-2xl" />
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setObsDialog({ open: false, convId: '', current: '' })}>Cancelar</Button>
            <Button onClick={handleSaveObs} className="bg-[#0A192F] text-white font-bold rounded-xl px-8">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
