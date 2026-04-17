import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useVagasStore } from '@/store/vagasStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_CONVOCACAO_LABELS, type StatusConvocacao } from '@/types/vaga';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  Search, FileText, Edit3, Briefcase, Activity, Users, Save, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logoAgir from '@/assets/logo-agir.png';
import { draftStore } from '@/lib/draftStore';
import { retryQueue } from '@/lib/retryQueue';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { DraftRecoveryBanner } from '@/components/DraftRecoveryBanner';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaveStatus } from '@/hooks/useAutoSave';
import { BASES_CONVOCACAO } from '@/lib/convocacaoUtils';
import { getCategoriaStatus } from '@/lib/vagaUtils';
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

const CHART_STATUS_COLORS: Record<string, string> = {
  'Em Andamento': '#3b82f6', // blue-500
  'Concluídas': '#10b981',   // emerald-500
  'Fila Edital': '#f59e0b',  // amber-500
  'Convocações': '#6366f1',  // indigo-500
  'Suspensas': '#64748b',    // slate-500
  'Canceladas': '#ef4444',   // red-500
  'Aguardando': '#8b5cf6',   // violet-500
  'Documentação': '#06b6d4', // cyan-500
  'Admissão': '#ec4899',     // pink-500
  'Liderança': '#f97316',    // orange-500
  'Mov. Interna': '#14b8a6', // teal-500
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A192F] text-white p-3 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <p className="text-xs font-bold flex items-center gap-1.5">
                <span className="text-white/60">{entry.name}:</span>
                <span className="text-white">{entry.value}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function UnidadePortalPage() {
  const navigate = useNavigate();
  const { currentUser, fetchCurrentProfile } = useAdminStore();
  const { convocacoes, vagas, updateConvocacao, fetchVagas, fetchBancos } = useVagasStore();
  const { signOut } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate stores when opened in a new tab (outside AppLayout)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([fetchCurrentProfile(), fetchVagas(), fetchBancos()]);
        if (mounted) setHydrated(true);
      } catch (err) {
        console.error('[UnidadePortal] Erro ao carregar dados:', err);
        if (mounted) setHydrated(true); // still mark as hydrated so UI can show error/empty state
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchCurrentProfile, fetchVagas, fetchBancos]);

  // Update browser tab title and favicon
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Portal Unidade';
    const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const prevIconHref = iconLink?.getAttribute('href') || null;
    if (iconLink) {
      // Use a distinct emoji-based SVG favicon for the Portal tab
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%230A192F'/><text x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='38' font-family='Arial,sans-serif' font-weight='bold' fill='white'>U</text></svg>`;
      iconLink.setAttribute('href', `data:image/svg+xml;utf8,${svg}`);
    }
    return () => {
      document.title = prevTitle;
      if (iconLink && prevIconHref) iconLink.setAttribute('href', prevIconHref);
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [obsDialog, setObsDialog] = useState<{ open: boolean; convId: string; current: string }>({
    open: false, convId: '', current: ''
  });
  const [obsText, setObsText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [obsEdits, setObsEdits] = useState<Record<string, {
    status: string; horario_plantao: string; aceito: boolean; observacao: string; unidade_destino: string;
  }>>({});
  const [savingObs, setSavingObs] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [pendingRetryCount, setPendingRetryCount] = useState(0);
  const [recoverableDrafts, setRecoverableDrafts] = useState<Array<{ recordId: string; data: any }>>([]);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [obsFilterUnidade, setObsFilterUnidade] = useState('all');
  const [obsFilterDate, setObsFilterDate] = useState<Date | undefined>(undefined);
  const [obsCalendarOpen, setObsCalendarOpen] = useState(false);

  const isAdmin = currentUser?.perfil === 'Administrador';
  const isSupervision = currentUser?.perfil === 'Supervisão';
  const isCoordination = currentUser?.perfil === 'Coordenação';
  const isGestao = ['Gestão', 'Gerência', 'Gestor', 'Gerente'].includes(currentUser?.perfil || '') || 
                  ['Gestor(a)', 'Gerente'].includes(currentUser?.cargo || '');
  const isAnalistaAdministrativo = currentUser?.cargo === 'Analista Administrativo';
  
  // Requirement 3: Full access profiles
  const podeVerTodas = isAdmin || 
    currentUser?.visualiza_todas_unidades === true || 
    isSupervision || 
    isCoordination || 
    isGestao || 
    isAnalistaAdministrativo;

  // Requirement 1 & 2: Analysts and Unit Users (ponta)
  const isAnalista = currentUser?.perfil?.toLowerCase().includes('analista') || 
                    currentUser?.cargo?.toLowerCase().includes('analista');
  const isUnidadeUser = currentUser?.perfil === 'Usuário da Unidade' || 
                       currentUser?.cargo === 'Usuário da Unidade' ||
                       currentUser?.perfil === 'Ponta';

  const hasAccess = podeVerTodas || currentUser?.acesso_portal_unidade === true;

  const unidadesVinculadas: string[] = currentUser?.unidades_vinculadas || [];

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

  const top5CargosData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVagas.forEach(v => {
      const cargo = v.cargo || 'Sem Cargo';
      map[cargo] = (map[cargo] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredVagas]);

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

  const getObsEdit = (c: any) => obsEdits[c.id] || {
    status: c.status || 'pendente',
    horario_plantao: c.horario_trabalho || c.carga_horaria || '',
    aceito: c.devolutiva === 'aceitou',
    observacao: c.observacoes || '',
    unidade_destino: c.unidade_alternativa || '',
  };

  // Keep latest edits/convocacoes in refs so callbacks always read fresh data
  const editsRef = useRef(obsEdits);
  editsRef.current = obsEdits;
  const convocacoesRef = useRef(convocacoes);
  convocacoesRef.current = convocacoes;

  // Trava 4 — performs the actual save. Used by both manual save and retry queue.
  const performSave = useCallback(async (payload: { id: string; data: any }) => {
    await updateConvocacao(payload.id, payload.data);
  }, [updateConvocacao]);

  // Register the retry queue handler exactly once
  useEffect(() => {
    retryQueue.registerHandler('updateConvocacao', performSave);
    retryQueue.installNetworkListeners();
    const unsub = retryQueue.subscribe((items) => setPendingRetryCount(items.length));
    return unsub;
  }, [performSave]);

  // Trava 2 — Hydrate recoverable drafts on mount (after currentUser available)
  useEffect(() => {
    if (!currentUser?.id) return;
    const drafts = draftStore.listAllForUser(currentUser.id);
    const recoverable: Array<{ recordId: string; data: any }> = [];
    drafts.forEach(({ recordId, entry }) => {
      const conv = convocacoesRef.current.find((c) => c.id === recordId);
      // If server doesn't have it or local draft is newer than server, recover.
      if (!conv) {
        recoverable.push({ recordId, data: entry.data });
        return;
      }
      const serverTs = new Date((conv as any).updated_at || 0).getTime();
      if (entry.timestamp > serverTs) {
        recoverable.push({ recordId, data: entry.data });
      } else {
        // Server is newer — drop stale draft
        draftStore.clear(currentUser.id, recordId);
      }
    });
    setRecoverableDrafts(recoverable);
  }, [currentUser?.id, convocacoes.length]);

  const handleRecoverDrafts = () => {
    const next = { ...editsRef.current };
    recoverableDrafts.forEach(({ recordId, data }) => {
      next[recordId] = data;
    });
    setObsEdits(next);
    setRecoverableDrafts([]);
    toast.success('Alterações recuperadas. Clique em Salvar para confirmar.');
  };

  const handleDiscardDrafts = () => {
    if (!currentUser?.id) return;
    recoverableDrafts.forEach(({ recordId }) => draftStore.clear(currentUser.id, recordId));
    setRecoverableDrafts([]);
    toast.message('Rascunhos descartados.');
  };

  // Trava 1 + 2 — Auto-save com debounce + persistência local imediata
  const scheduleAutoSave = useCallback((convId: string, c: any) => {
    if (debounceTimers.current[convId]) clearTimeout(debounceTimers.current[convId]);
    debounceTimers.current[convId] = setTimeout(async () => {
      const edit = editsRef.current[convId];
      if (!edit) return;
      setSaveStatus((s) => ({ ...s, [convId]: 'saving' }));
      try {
        await performSave({
          id: convId,
          data: {
            status: edit.status as StatusConvocacao,
            horario_trabalho: edit.horario_plantao,
            devolutiva: edit.aceito ? 'aceitou' : 'recusou',
            observacoes: edit.observacao,
            unidade_alternativa: edit.unidade_destino,
          },
        });
        // Clear local draft after server confirms
        if (currentUser?.id) draftStore.clear(currentUser.id, convId);
        setSaveStatus((s) => ({ ...s, [convId]: 'saved' }));
        setTimeout(() => {
          setSaveStatus((s) => (s[convId] === 'saved' ? { ...s, [convId]: 'idle' } : s));
        }, 1500);
      } catch (err: any) {
        console.error('[autosave] failed, queueing for retry:', err);
        // Trava 5 — Enqueue for retry on network failure
        retryQueue.enqueue({
          action: 'updateConvocacao',
          recordId: convId,
          payload: {
            id: convId,
            data: {
              status: edit.status as StatusConvocacao,
              horario_trabalho: edit.horario_plantao,
              devolutiva: edit.aceito ? 'aceitou' : 'recusou',
              observacoes: edit.observacao,
              unidade_alternativa: edit.unidade_destino,
            },
          },
        });
        setSaveStatus((s) => ({ ...s, [convId]: 'error' }));
      }
    }, 1000);
  }, [performSave, currentUser?.id]);

  const setObsField = (id: string, c: any, field: string, value: any) => {
    const current = getObsEdit(c);
    const next = { ...current, [field]: value };
    setObsEdits(prev => ({ ...prev, [id]: next }));
    setSaveStatus((s) => ({ ...s, [id]: 'dirty' }));
    // Trava 2 — snapshot in localStorage IMMEDIATELY on every keystroke
    if (currentUser?.id) {
      draftStore.save(currentUser.id, id, next, (c as any).updated_at || null);
    }
    scheduleAutoSave(id, c);
  };

  // Trava 3 — Block tab close while there are dirty rows or queued items
  const hasUnsavedChanges = Object.keys(obsEdits).length > 0 || pendingRetryCount > 0;
  useBeforeUnload(hasUnsavedChanges);

  const handleSaveObsRow = async (c: any) => {
    const edit = getObsEdit(c);
    // Cancel any pending debounce — manual save takes precedence
    if (debounceTimers.current[c.id]) clearTimeout(debounceTimers.current[c.id]);
    setSavingObs(prev => ({ ...prev, [c.id]: true }));
    setSaveStatus((s) => ({ ...s, [c.id]: 'saving' }));
    try {
      await performSave({
        id: c.id,
        data: {
          status: edit.status as StatusConvocacao,
          horario_trabalho: edit.horario_plantao,
          devolutiva: edit.aceito ? 'aceitou' : 'recusou',
          observacoes: edit.observacao,
          unidade_alternativa: edit.unidade_destino,
        },
      });
      if (currentUser?.id) draftStore.clear(currentUser.id, c.id);
      toast.success('Devolutiva salva com sucesso.');
      setObsEdits(prev => { const n = { ...prev }; delete n[c.id]; return n; });
      setSaveStatus((s) => ({ ...s, [c.id]: 'saved' }));
    } catch (err: any) {
      // Trava 5 — Queue for retry instead of losing data
      retryQueue.enqueue({
        action: 'updateConvocacao',
        recordId: c.id,
        payload: {
          id: c.id,
          data: {
            status: edit.status as StatusConvocacao,
            horario_trabalho: edit.horario_plantao,
            devolutiva: edit.aceito ? 'aceitou' : 'recusou',
            observacoes: edit.observacao,
            unidade_alternativa: edit.unidade_destino,
          },
        },
      });
      toast.error('Sem conexão — alteração guardada e será reenviada automaticamente.');
      setSaveStatus((s) => ({ ...s, [c.id]: 'error' }));
    } finally {
      setSavingObs(prev => ({ ...prev, [c.id]: false }));
    }
  };

  if (bootstrapping || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-[#0A192F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-semibold">Carregando Portal da Unidade...</p>
        </div>
      </div>
    );
  }
  if (!hasAccess) return null;

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
                {unidadesDisponiveis.filter(Boolean).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-white/90 leading-tight">{currentUser?.nome_completo}</span>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tighter">{currentUser?.perfil}</span>
            </div>
            {pendingRetryCount > 0 && (
              <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-amber-500/20 border border-amber-300/30">
                <SaveStatusIndicator status="idle" pendingCount={pendingRetryCount} className="text-amber-100" />
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair do Portal" aria-label="Sair" className="text-white/60 hover:text-white hover:bg-rose-500/20 transition-all rounded-full h-9 w-9 shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <DraftRecoveryBanner
        count={recoverableDrafts.length}
        onRecover={handleRecoverDrafts}
        onDiscard={handleDiscardDrafts}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6 lg:py-8 space-y-6">

        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="sticky top-[68px] z-40 py-2 -mt-2 bg-slate-50/80 backdrop-blur-sm sm:static sm:bg-transparent">
            <TabsList className="bg-white/80 border border-slate-200 shadow-sm p-1.5 rounded-2xl h-auto flex flex-wrap sm:flex-nowrap gap-1">
              {[{v:'dashboard',i:BarChart3,l:'Dashboard',lm:'Dash'},{v:'status',i:Search,l:'Status das Vagas',lm:'Status'},{v:'convocacoes',i:CalendarIcon,l:'Convocações Diárias',lm:'Conv.'},{v:'observacoes',i:Edit3,l:'Observações',lm:'Obs'}].map(t => (
                <TabsTrigger key={t.v} value={t.v} className="flex-1 sm:flex-none gap-2 py-2 data-[state=active]:bg-[#0A192F] data-[state=active]:text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-none data-[state=active]:shadow-md">
                  <t.i className="h-4 w-4" />
                  <span className="sm:hidden">{t.lm}</span>
                  <span className="hidden sm:inline">{t.l}</span>
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
                    <div className="flex-1">
                      {hydrated ? (
                        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                      ) : (
                        <Skeleton className="h-7 w-12" />
                      )}
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
                  <div className="h-[320px] w-full">
                    {statusChartData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-3xl animate-pulse">
                        <BarChart3 className="h-10 w-10 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Nenhum dado para exibir</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={statusChartData} 
                          layout="vertical" 
                          margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={110} 
                            tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }} 
                            content={<CustomChartTooltip />} 
                          />
                          <Bar 
                            dataKey="value" 
                            name="Quantidade"
                            radius={[0, 8, 8, 0]} 
                            barSize={18}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          >
                            {statusChartData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_STATUS_COLORS[entry.name as string] || '#3b82f6'} 
                              />
                            ))}
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              style={{fontSize: 11, fontWeight: 900, fill: '#1e293b'}} 
                              offset={12}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700">Top 5 Cargos com Mais Vagas</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[320px] w-full">
                    {top5CargosData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-3xl animate-pulse">
                        <Briefcase className="h-10 w-10 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Nenhum dado para exibir</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={top5CargosData} 
                          layout="vertical" 
                          margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={130} 
                            tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }} 
                            content={<CustomChartTooltip />} 
                          />
                          <Bar 
                            dataKey="value" 
                            name="Vagas"
                            radius={[0, 8, 8, 0]} 
                            barSize={22}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          >
                            {top5CargosData.map((_: any, index: number) => (
                              <Cell 
                                key={`cargo-${index}`} 
                                fill={['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4'][index] || '#3b82f6'} 
                              />
                            ))}
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              style={{fontSize: 12, fontWeight: 900, fill: '#1e293b'}} 
                              offset={12}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
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
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nº Processo</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[150px]">Unidade</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[180px]">Cargo</TableHead>
                      <TableHead className="whitespace-nowrap">Etapa</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vagasParaConsulta.map(v => (
                      <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-sm whitespace-nowrap">{v.numero_requisicao || v.numero_processo || v.numero_edital || '—'}</TableCell>
                        <TableCell className="text-slate-600 text-xs font-semibold">{v.unidade || '—'}</TableCell>
                        <TableCell className="font-bold text-slate-900 text-sm">{v.cargo || '—'}</TableCell>
                        <TableCell className="text-slate-600 text-xs font-semibold whitespace-nowrap">{(v as any).etapa || v.acompanhamento?.etapa_atual || v.status || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                            {v.status || 'Sem Status'}
                          </Badge>
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
                     <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
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
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-slate-400" />
                    Devolutiva das Convocações
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={obsFilterUnidade} onValueChange={setObsFilterUnidade}>
                      <SelectTrigger className="w-44 h-9 text-xs font-semibold rounded-lg border-slate-200">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
                        <SelectValue placeholder="Filtrar unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-semibold text-xs">Todas as Unidades</SelectItem>
                        {unidadesDisponiveis.filter(Boolean).map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Popover open={obsCalendarOpen} onOpenChange={setObsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 rounded-lg font-semibold gap-1.5 text-xs border-slate-200">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {obsFilterDate ? format(obsFilterDate, 'dd/MM/yyyy') : 'Todas as datas'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 rounded-2xl overflow-hidden border-none shadow-2xl w-auto" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={obsFilterDate}
                          onSelect={(d) => { setObsFilterDate(d); setObsCalendarOpen(false); }}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                        {obsFilterDate && (
                          <div className="p-2 border-t">
                            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setObsFilterDate(undefined); setObsCalendarOpen(false); }}>Limpar filtro</Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                       <TableRow>
                        <TableHead className="min-w-[200px] w-[220px]">Candidato</TableHead>
                        <TableHead className="min-w-[140px]">Unidade</TableHead>
                        <TableHead className="min-w-[140px]">Status</TableHead>
                        <TableHead className="min-w-[140px]">Unidade Destino</TableHead>
                        <TableHead className="min-w-[130px]">Horário/Plantão</TableHead>
                        <TableHead className="w-[100px]">Aceito</TableHead>
                        <TableHead className="min-w-[220px]">Observação</TableHead>
                        <TableHead className="w-[100px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let filtered = allFilteredConvocacoes;
                        if (obsFilterUnidade !== 'all') {
                          const normU = obsFilterUnidade.toLowerCase().trim();
                          filtered = filtered.filter(c => (c.unidade || '').toLowerCase().trim().includes(normU));
                        }
                        if (obsFilterDate) {
                          const dateFilterStr = format(obsFilterDate, 'yyyy-MM-dd');
                          filtered = filtered.filter(c => c.data_convocacao === dateFilterStr);
                        }
                        const sliced = filtered.slice(0, 100);
                        if (sliced.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                  <Edit3 className="h-8 w-8 opacity-20" />
                                  <p className="text-xs font-bold">Nenhuma convocação encontrada</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return sliced.map(c => {
                          const edit = getObsEdit(c);
                          const isSaving = savingObs[c.id] || false;
                          const originalState = {
                            status: c.status || 'pendente',
                            horario_plantao: c.horario_trabalho || c.carga_horaria || '',
                            aceito: c.devolutiva === 'aceitou',
                            observacao: c.observacoes || '',
                            unidade_destino: c.unidade_alternativa || '',
                          };
                          const hasChanges = !!obsEdits[c.id] && (
                            edit.status !== originalState.status ||
                            edit.horario_plantao !== originalState.horario_plantao ||
                            edit.aceito !== originalState.aceito ||
                            edit.observacao !== originalState.observacao ||
                            edit.unidade_destino !== originalState.unidade_destino
                          );
                          return (
                            <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-3 px-4 font-bold text-slate-900 text-sm align-middle whitespace-normal break-words leading-snug">
                                {c.nome_candidato || '—'}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-slate-600 text-xs font-semibold align-middle whitespace-normal break-words">{c.unidade || '—'}</TableCell>
                              <TableCell className="py-3 px-4">
                                <Select value={edit.status} onValueChange={(v) => setObsField(c.id, c, 'status', v)}>
                                  <SelectTrigger className="h-9 text-xs font-semibold rounded-lg border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[
                                      { value: 'aceite', label: 'Aceite' },
                                      { value: 'recusa_plantao', label: 'Recusa por Plantão' },
                                      { value: 'recusa_unidade', label: 'Recusa por Unidade' },
                                      { value: 'recusa_horario', label: 'Recusa por Horário' },
                                      { value: 'desistiu', label: 'Desistiu' },
                                      { value: 'faltou', label: 'Faltou' },
                                      { value: 'pendente', label: 'Pendente' },
                                    ].map(opt => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Input
                                  value={edit.unidade_destino || ''}
                                  onChange={(e) => setObsField(c.id, c, 'unidade_destino', e.target.value)}
                                  placeholder="Unidade Destino"
                                  className="h-9 text-xs rounded-lg border-slate-200"
                                />
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Input
                                  value={edit.horario_plantao}
                                  onChange={(e) => setObsField(c.id, c, 'horario_plantao', e.target.value)}
                                  placeholder="Ex: 07h-19h"
                                  className="h-9 text-xs rounded-lg border-slate-200"
                                />
                              </TableCell>
                              <TableCell className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch
                                    checked={edit.aceito}
                                    onCheckedChange={(v) => setObsField(c.id, c, 'aceito', v)}
                                    aria-label="Aceito"
                                  />
                                  <span className={cn("text-[10px] font-black uppercase", edit.aceito ? "text-emerald-600" : "text-slate-400")}>
                                    {edit.aceito ? 'Sim' : 'Não'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Input
                                  value={edit.observacao}
                                  onChange={(e) => setObsField(c.id, c, 'observacao', e.target.value)}
                                  placeholder="Observação adicional..."
                                  className="h-9 text-xs rounded-lg border-slate-200"
                                />
                              </TableCell>
                              <TableCell className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveObsRow(c)}
                                    disabled={isSaving || !hasChanges}
                                    className={cn(
                                      "rounded-lg font-bold text-xs gap-1.5 h-9 px-3 transition-all",
                                      hasChanges
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}
                                  >
                                    {isSaving ? (
                                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                    ) : (
                                      <Save className="h-3.5 w-3.5" />
                                    )}
                                    Salvar
                                  </Button>
                                  <SaveStatusIndicator status={saveStatus[c.id] || 'idle'} />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
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
