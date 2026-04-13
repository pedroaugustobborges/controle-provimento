import { useState, useMemo } from 'react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon, Download, LogOut, Building2,
  MessageSquare, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logoAgir from '@/assets/logo-agir.png';
import { BASES_CONVOCACAO } from '@/lib/convocacaoUtils';

// Flat list of all units across all bases
const TODAS_UNIDADES: string[] = (Object.values(BASES_CONVOCACAO) as string[][])
  .flat()
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const STATUS_COLOR: Record<string, string> = {
  aceite: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  recusa_plantao: 'bg-red-100 text-red-700 border-red-200',
  recusa_unidade: 'bg-red-100 text-red-700 border-red-200',
  recusa_horario: 'bg-orange-100 text-orange-700 border-orange-200',
  desistiu: 'bg-slate-100 text-slate-600 border-slate-200',
  faltou: 'bg-rose-100 text-rose-700 border-rose-200',
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
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

  // Access control
  const isAdmin = currentUser?.perfil === 'Administrador';
  const isSupervision = currentUser?.perfil === 'Supervisão';
  const hasAccess = isAdmin || isSupervision;

  // Determine accessible units
  const unidadesVinculadas: string[] = currentUser?.unidades_vinculadas || [];
  const podeVerTodas = isAdmin || currentUser?.visualiza_todas_unidades || (isSupervision && unidadesVinculadas.length === 0);

  // Unit options for the selector
  const unidadesDisponiveis = useMemo(() => {
    if (podeVerTodas) return TODAS_UNIDADES;
    return unidadesVinculadas;
  }, [podeVerTodas, unidadesVinculadas]);

  // Selected unit state — default to first linked unit or 'all'
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

  const todayConvocacoes = useMemo(() => {
    return convocacoes.filter(c => {
      if (!c.data_convocacao || !c.horario) return false;
      if (c.data_convocacao !== dateStr) return false;

      const normConvUnidade = c.unidade?.toLowerCase().trim() || '';

      if (selectedUnidade === 'all') {
        if (podeVerTodas) return true;
        return unidadesVinculadas.some(u => normConvUnidade.includes(u.toLowerCase().trim()));
      }
      
      const normSelected = selectedUnidade.toLowerCase().trim();
      return normConvUnidade.includes(normSelected) || normSelected.includes(normConvUnidade);
    }).sort((a, b) => a.horario.localeCompare(b.horario));
  }, [convocacoes, dateStr, selectedUnidade, podeVerTodas, unidadesVinculadas]);

  const stats = useMemo(() => ({
    total: todayConvocacoes.length,
    aceitos: todayConvocacoes.filter(c => c.status === 'aceite').length,
    pendentes: todayConvocacoes.filter(c => c.status === 'pendente').length,
    recusas: todayConvocacoes.filter(c =>
      ['recusa_plantao', 'recusa_unidade', 'recusa_horario', 'desistiu', 'faltou'].includes(c.status)
    ).length,
  }), [todayConvocacoes]);

  // Map vaga_id → vaga status for quick lookup
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0A192F] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <img src={logoAgir} alt="AGIR" className="h-10 w-10 rounded-lg object-contain bg-white/5 p-1" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Portal da Unidade</p>
            <h1 className="text-lg font-extrabold tracking-tight leading-tight">
              {unidadeLabel}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 hidden sm:block">{currentUser?.nome_completo}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Title + filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Convocações do Dia</h2>
            <p className="text-sm text-slate-500 mt-0.5">Visualize e gerencie as convocações da sua unidade</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Unit selector — show when user can see multiple units */}
            {(podeVerTodas || unidadesVinculadas.length > 1) && (
              <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
                <SelectTrigger className="w-48 bg-white border-slate-200 font-semibold text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-400 mr-1.5" />
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {unidadesDisponiveis.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 font-semibold text-slate-700 bg-white">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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

            <Button onClick={handleExport} variant="outline" className="gap-2 font-semibold bg-white">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'Aceitos', value: stats.aceitos, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Recusas', value: stats.recusas, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl', bg)}>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{value}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span>
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({todayConvocacoes.length} registro{todayConvocacoes.length !== 1 ? 's' : ''})
                </span>
              </span>
              {selectedUnidade !== 'all' && (
                <Badge variant="outline" className="text-xs font-semibold border-slate-200 text-slate-600">
                  <Building2 className="h-3 w-3 mr-1" />
                  {selectedUnidade}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {todayConvocacoes.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Nenhuma convocação para esta data.</p>
                {selectedUnidade === 'all' && podeVerTodas && (
                  <p className="text-xs text-slate-400 mt-1">Selecione uma unidade ou verifique a data.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500 w-24">Horário</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Candidato</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Cargo</TableHead>
                      {selectedUnidade === 'all' && (
                        <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Unidade</TableHead>
                      )}
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status Conv.</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status Vaga</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">Observação</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayConvocacoes.map((conv) => (
                      <TableRow key={conv.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="font-mono font-bold text-slate-700 text-sm">{conv.horario}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{conv.nome_candidato}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{conv.cargo}</TableCell>
                        {selectedUnidade === 'all' && (
                          <TableCell className="text-slate-600 text-sm font-medium">{conv.unidade}</TableCell>
                        )}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                              STATUS_COLOR[conv.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                            )}
                          >
                            {STATUS_CONVOCACAO_LABELS[conv.status as keyof typeof STATUS_CONVOCACAO_LABELS] || conv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vagaStatusMap[conv.vaga_id] ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap"
                            >
                              {vagaStatusMap[conv.vaga_id]}
                            </Badge>
                          ) : (
                            <span className="text-slate-300 text-xs italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-[200px] truncate" title={conv.observacoes}>
                          {conv.observacoes || <span className="italic text-slate-300">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenObs(conv.id, conv.observacoes || '')}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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