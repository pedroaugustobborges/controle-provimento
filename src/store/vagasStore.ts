import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile, Tarefa, Alerta, MensagemHistorico, BloqueioHorario } from '@/types/vaga';
import { mockConvocacoes, mockEditais, mockValidacoes, mockTarefas, mockAlertas } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo, getCategoriaStatus } from '@/lib/vagaUtils';
import { toast } from 'sonner';

const PAGE_SIZE = 1000;

const splitAssistentes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/[;,|]/)
    .map(item => item.trim())
    .filter(Boolean);
};

const mapDbVaga = (row: any): Vaga => ({
  ...row,
  data_abertura: row.data_abertura || '',
  data_recebimento: row.data_recebimento || '',
  data_criacao: row.created_at || row.data_importacao || new Date().toISOString(),
  created_at: row.created_at || row.data_importacao || new Date().toISOString(),
  requisicao: row.requisicao || row.numero_requisicao || row.numero_processo_seletivo || '',
  numero_requisicao: row.numero_requisicao || row.numero_processo_seletivo || row.requisicao || '',
  numero_processo: row.numero_processo || row.numero_processo_seletivo || '',
  secao: row.secao || '',
  assistentes: splitAssistentes(row.assistentes),
  observacoes: row.observacoes || row.observacao || '',
  observacoes_internas: row.observacoes_internas || row.observacao || '',
  historico: Array.isArray(row.historico) ? row.historico : [],
  tem_banco_valido: Boolean(row.tem_banco_valido),
  origem: row.origem === 'manual' ? 'manual' : 'importada',
  categoria_status: getCategoriaStatus(row),
});

const mapDbBanco = (row: any): BancoTalentos => ({
  ...row,
  observacoes: row.observacoes || row.observacao || '',
  numero_processo: row.numero_processo || row.numero_processo_seletivo || '',
  data_abertura_edital: row.data_abertura_edital || '',
  data_validade: row.data_validade || '',
  status: row.status || 'nenhum',
});

const buildImportedFileFromHistory = (history: ImportHistory): ImportedFile => ({
  id: history.id,
  nome_original: history.nome_arquivo || history.arquivo || `Importação ${history.id.slice(0, 8)}`,
  nome_interno: history.referencia_arquivo || history.id,
  tipo: history.tipo_importacao || 'importacao',
  tamanho: 0,
  data_upload: history.data_hora || history.data || '',
  usuario: history.usuario,
  email_usuario: history.email_usuario,
  modulo_origem: history.tipo_importacao === 'banco' ? 'Banco de Talentos' : 'Vagas',
  status: history.status === 'erro'
    ? 'erro'
    : history.status === 'em_processamento'
      ? 'processando'
      : 'processado',
  vaga_importacao_id: history.referencia_arquivo || history.id,
});

const fetchAllRows = async (tableName: 'vagas' | 'banco_candidatos' | 'importacoes', columns: string = '*') => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  
  if (!count || count === 0) return [];

  const CHUNK_SIZE = 1000;
  if (count <= CHUNK_SIZE) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .order('created_at', { ascending: false })
      .range(0, CHUNK_SIZE - 1);
    
    if (error) throw error;
    return data || [];
  }

  const numChunks = Math.ceil(count / CHUNK_SIZE);
  const promises = [];

  for (let i = 0; i < numChunks; i++) {
    const from = i * CHUNK_SIZE;
    const to = from + CHUNK_SIZE - 1;
    promises.push(
      supabase
        .from(tableName)
        .select(columns)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
  }

  const results = await Promise.all(promises);
  const allRows: any[] = [];
  
  for (const { data, error } of results) {
    if (error) throw error;
    if (data) allRows.push(...data);
  }

  return allRows;
};

interface VagasState {
  vagas: Vaga[];
  bancos: BancoTalentos[];
  convocacoes: Convocacao[];
  bloqueios: BloqueioHorario[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  importHistory: ImportHistory[];
  importedFiles: ImportedFile[];
  tarefas: Tarefa[];
  alertas: Alerta[];
  notificacoes: any[];
  editingUsers: Record<string, any>;
  historicoMensagens: MensagemHistorico[];
  temNovasMensagens: boolean;
  isLoading: boolean;
  isInitialLoad: boolean;
  isLoadingVagas: boolean;
  isLoadingBancos: boolean;
  lastUpdated?: number;

  setVagas: (vagas: Vaga[]) => void;
  fetchVagas: (incremental?: boolean) => Promise<void>;
  fetchBancos: (incremental?: boolean) => Promise<void>;
  fetchAll: () => Promise<void>;
  fetchImportHistory: () => Promise<void>;
  fetchNotificacoes: () => Promise<void>;
  createNotificacao: (notif: { titulo: string; mensagem: string; tipo?: string; unidade?: string; registro_id?: string; regiao?: string }) => Promise<void>;
  addVagas: (vagas: Vaga[]) => void;
  updateVaga: (id: string, data: Partial<Vaga>) => void;
  updateVagaAsync: (id: string, data: Partial<Vaga>) => Promise<boolean>;
  deleteVaga: (id: string) => void;
  addBanco: (banco: BancoTalentos) => void;
  addBancos: (bancos: BancoTalentos[]) => void;
  updateBanco: (id: string, data: Partial<BancoTalentos>) => void;
  updateBancoAsync: (id: string, data: Partial<BancoTalentos>) => Promise<boolean>;
  deleteBanco: (id: string) => void;
  addConvocacao: (convocacao: Convocacao) => Promise<void>;
  updateConvocacao: (id: string, data: Partial<Convocacao>) => Promise<void>;
  deleteConvocacao: (id: string) => Promise<void>;
  fetchConvocacoes: () => Promise<void>;
  updateEdital: (id: string, data: Partial<Edital>) => void;
  updateValidacao: (id: string, data: Partial<ValidacaoEdital>) => void;
  addEdital: (edital: Edital) => void;
  addValidacao: (validacao: ValidacaoEdital) => void;
  addImportHistory: (history: ImportHistory) => void;
  addImportedFile: (file: ImportedFile) => void;
  updateImportedFile: (id: string, data: Partial<ImportedFile>) => void;
  deleteImportedFile: (id: string) => Promise<void>;
  addTarefa: (tarefa: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  addAlerta: (alerta: Alerta) => void;
  addBloqueio: (bloqueio: BloqueioHorario) => void;
  removeBloqueio: (id: string) => void;
  updateAlerta: (id: string, data: Partial<Alerta>) => void;
  addMensagem: (mensagem: MensagemHistorico) => void;
  marcarMensagemLida: (id: string) => void;
  setTemNovasMensagens: (has: boolean) => void;
  deleteImportBatch: (batchId: string) => Promise<void>;
  clearVagas: () => void;
  clearBancos: () => void;
  clearBancosPorRegiao: (regiao: 'GO_ES' | 'OUTRAS_UNIDADES') => void;
  clearAllData: () => void;
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
  getBancoByVaga: (vagaId: string) => BancoTalentos | undefined;
  getConvocacoesByVaga: (vagaId: string) => Convocacao[];
  getMatchingDiagnostic: () => { vagaId: string; vagaCargo: string; vagaUnidade: string; vagaReq: string; potentialBancos: any[] }[];
  marcarTodasLidas: () => void;
  fixWrongImportBatches: () => void;
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
  trackEditing: (recordId: string) => Promise<void>;
  stopTrackingEditing: () => Promise<void>;
}

export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      vagas: [],
      bancos: [],
      convocacoes: [],
      bloqueios: [] as BloqueioHorario[],
      editais: mockEditais,
      validacoes: mockValidacoes,
      importHistory: [],
      importedFiles: [],
      notificacoes: [],
      editingUsers: {},
      tarefas: [],
      alertas: [],
      historicoMensagens: [],
      temNovasMensagens: false,
      isLoading: false,
      isInitialLoad: true,
      isLoadingVagas: false,
      isLoadingBancos: false,
      lastUpdated: undefined,

      setVagas: (vagas) => set({ vagas }),
      fetchVagas: async (incremental = false) => {
        if (get().isLoadingVagas) return;
        if (!incremental && get().vagas.length > 0 && !get().isInitialLoad) return;
        set({ isLoadingVagas: true });
        try {
          const data = await fetchAllRows('vagas');
          set({ vagas: data.map(mapDbVaga), isInitialLoad: false });
        } catch (err) {
          console.error('Error fetching vagas:', err);
        } finally {
          set({ isLoadingVagas: false });
        }
      },
      fetchBancos: async (incremental = false) => {
        if (get().isLoadingBancos) return;
        if (!incremental && get().bancos.length > 0 && !get().isInitialLoad) return;
        set({ isLoadingBancos: true });
        try {
          const data = await fetchAllRows('banco_candidatos');
          set({ bancos: data.map(mapDbBanco), isInitialLoad: false });
        } catch (err) {
          console.error('Error fetching bancos:', err);
        } finally {
          set({ isLoadingBancos: false });
        }
      },
      fetchAll: async () => {
        set({ isLoading: true });
        try {
          await Promise.all([
            get().fetchVagas(),
            get().fetchBancos(),
            get().fetchImportHistory(),
            get().fetchNotificacoes(),
            get().fetchConvocacoes(),
          ]);
        } finally {
          set({ isLoading: false, isInitialLoad: false });
        }
      },
      fetchImportHistory: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const data = await fetchAllRows('importacoes');
          const userIds = [...new Set(data.map(item => item.usuario_id).filter(Boolean))];
          const profilesById = new Map<string, any>();

          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, nome_completo, email').in('id', userIds);
            (profiles || []).forEach(p => profilesById.set(p.id, p));
          }

          const mapped = data.map(item => {
            const p = profilesById.get(item.usuario_id || '');
            return {
              id: item.id,
              usuario: p?.nome_completo || item.usuario_id || 'Sistema',
              email_usuario: p?.email,
              total_lidos: item.quantidade_processada || 0,
              total_novos: item.quantidade_inserida || 0,
              total_atualizados: item.quantidade_atualizada || 0,
              total_ignorados: item.quantidade_ignorada || 0,
              total_erros: item.quantidade_erro || 0,
              status: item.status,
              tipo_importacao: item.tipo,
              arquivo: item.nome_arquivo || item.arquivo || `Importação ${item.id.slice(0, 8)}`,
              data_hora: item.created_at,
              referencia_arquivo: item.arquivo || item.nome_arquivo || item.id,
            } as ImportHistory;
          });

          set({ importHistory: mapped, importedFiles: mapped.map(buildImportedFileFromHistory) });
        } catch (err) {
          console.error('Error fetching import history:', err);
        }
      },
      fetchNotificacoes: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(50);
          if (!error) set({ notificacoes: data || [] });
        } catch (err) {
          console.error('Error fetching notifications:', err);
        }
      },
      createNotificacao: async (notif) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          await supabase.from('notificacoes').insert({
            ...notif,
            remetente_id: currentUser?.id,
            remetente_nome: currentUser?.nome_completo,
            created_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error creating notification:', err);
        }
      },
      addVagas: (newVagas) => set((s) => ({ vagas: [...newVagas, ...s.vagas] })),
      updateVaga: (id, data) => set((s) => ({
        vagas: s.vagas.map((v) => v.id === id ? { ...v, ...data } : v),
      })),
      updateVagaAsync: async (id, data) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (!currentUser) return false;

        const currentVaga = get().vagas.find(v => v.id === id);
        if (!currentVaga) return false;

        // Optimistic local update so UI feels instant
        get().updateVaga(id, data);

        const { data: updated, error } = await DatabaseService.saveWithConcurrency('vagas', {
          ...currentVaga,
          ...data,
          id,
          version: currentVaga.version || 0
        }, currentUser.id);

        if (error) {
          console.error('[updateVagaAsync] Error:', error);
          toast.error(error.message || "Erro ao atualizar vaga.");
          return false;
        }

        if (updated) {
          // Merge: preserve any local-only fields (cronograma, historico, etc.) not present in DB row
          get().updateVaga(id, { ...mapDbVaga(updated), ...data });
          get().createNotificacao({
            titulo: "Vaga Atualizada",
            mensagem: `${currentUser.nome_completo} atualizou a vaga ${currentVaga.cargo}`,
            unidade: currentVaga.unidade,
            registro_id: id
          });
          return true;
        }
        return false;
      },
      deleteVaga: (id) => set((s) => ({ vagas: s.vagas.filter((v) => v.id !== id) })),
      addBanco: (banco) => set((s) => ({ bancos: [banco, ...s.bancos] })),
      addBancos: (newBancos) => set((s) => ({ bancos: [...newBancos, ...s.bancos] })),
      updateBanco: (id, data) => set((s) => ({ bancos: s.bancos.map((b) => b.id === id ? { ...b, ...data } : b) })),
      updateBancoAsync: async (id, data) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (!currentUser) return false;

        const currentBanco = get().bancos.find(b => b.id === id);
        if (!currentBanco) return false;

        // Optimistic local update for snappy UX
        get().updateBanco(id, data);

        const { data: updated, error } = await DatabaseService.saveWithConcurrency('banco_candidatos', {
          ...currentBanco,
          ...data,
          id,
          version: (currentBanco as any).version || 0
        }, currentUser.id);

        if (error) {
          console.error('[updateBancoAsync] Error:', error);
          toast.error(error.message || 'Erro ao atualizar registro do banco.');
          return false;
        }

        if (updated) {
          get().updateBanco(id, mapDbBanco(updated));
          return true;
        }
        return false;
      },
      deleteBanco: (id) => set((s) => ({ bancos: s.bancos.filter((b) => b.id !== id) })),
      addConvocacao: async (convocacao) => {
        // Optimistic update
        set((s) => ({ convocacoes: [convocacao, ...s.convocacoes] }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          const { id, vaga_id, banco_id, ...rest } = convocacao as any;
          const payload: any = {
            ...rest,
            vaga_id: vaga_id && /^[0-9a-f-]{36}$/i.test(vaga_id) ? vaga_id : null,
            banco_id: banco_id && /^[0-9a-f-]{36}$/i.test(banco_id) ? banco_id : null,
            created_by: currentUser?.id || null,
            updated_by: currentUser?.id || null,
          };
          // Drop undefined / non-DB fields
          delete payload.requisicao;
          delete payload.edital_relacionado;
          const { data, error } = await supabase.from('convocacoes' as any).insert(payload).select().single();
          if (error) {
            console.error('addConvocacao persist error:', error);
            toast.error('Falha ao salvar convocação no servidor. Verifique sua conexão.');
            // Rollback optimistic
            set((s) => ({ convocacoes: s.convocacoes.filter(c => c.id !== id) }));
            return;
          }
          // Replace temp id with DB id
          set((s) => ({ convocacoes: s.convocacoes.map(c => c.id === id ? { ...c, ...(data as any) } as Convocacao : c) }));
        } catch (e) {
          console.error('addConvocacao exception:', e);
          toast.error('Erro ao salvar convocação.');
        }
      },
      updateConvocacao: async (id, data) => {
        set((s) => ({ convocacoes: s.convocacoes.map((c) => c.id === id ? { ...c, ...data } : c) }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          const payload: any = { ...data, updated_by: currentUser?.id || null };
          delete payload.id;
          delete payload.requisicao;
          delete payload.edital_relacionado;
          delete payload.vaga_id;
          delete payload.banco_id;
          delete payload.created_at;
          delete payload.created_by;
          delete payload.version;
          const { error } = await supabase.from('convocacoes' as any).update(payload).eq('id', id);
          if (error) {
            console.error('updateConvocacao error:', error);
            toast.error('Falha ao atualizar convocação no servidor.');
          }
        } catch (e) {
          console.error('updateConvocacao exception:', e);
        }
      },
      deleteConvocacao: async (id) => {
        set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== id) }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          // Soft delete
          const { error } = await supabase.from('convocacoes' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
          if (error) console.error('deleteConvocacao error:', error);
        } catch (e) {
          console.error('deleteConvocacao exception:', e);
        }
      },
      fetchConvocacoes: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.from('convocacoes' as any).select('*').is('deleted_at', null).order('data_convocacao', { ascending: false }).limit(2000);
          if (error) { console.error('fetchConvocacoes error:', error); return; }
          if (data && Array.isArray(data)) {
            set({ convocacoes: data as any });
          }
        } catch (e) {
          console.error('fetchConvocacoes exception:', e);
        }
      },
      updateEdital: (id, data) => set((s) => ({ editais: s.editais.map((e) => e.id === id ? { ...e, ...data } : e) })),
      updateValidacao: (id, data) => set((s) => ({ validacoes: s.validacoes.map((v) => v.id === id ? { ...v, ...data } : v) })),
      addEdital: (edital) => set((s) => ({ editais: [...s.editais, edital] })),
      addValidacao: (validacao) => set((s) => ({ validacoes: [...s.validacoes, validacao] })),
      addImportHistory: (history) => set((s) => ({ importHistory: [history, ...s.importHistory] })),
      addImportedFile: (file) => set((s) => ({ importedFiles: [file, ...s.importedFiles] })),
      updateImportedFile: (id, data) => set((s) => ({ importedFiles: s.importedFiles.map((f) => f.id === id ? { ...f, ...data } : f) })),
      deleteImportedFile: async (id) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { success } = await DatabaseService.deleteImportBatch(id);
        if (success) set((s) => ({ importedFiles: s.importedFiles.filter((f) => f.id !== id), importHistory: s.importHistory.filter((h) => h.id !== id) }));
      },
      addTarefa: (tarefa) => set((s) => ({ tarefas: [tarefa, ...s.tarefas] })),
      updateTarefa: (id, data) => set((s) => ({ tarefas: s.tarefas.map((t) => t.id === id ? { ...t, ...data } : t) })),
      deleteTarefa: (id) => set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),
      addAlerta: (alerta) => set((s) => ({ alertas: [alerta, ...s.alertas] })),
      addBloqueio: (bloqueio) => set((s) => ({ bloqueios: [bloqueio, ...s.bloqueios] })),
      removeBloqueio: (id) => set((s) => ({ bloqueios: s.bloqueios.filter(b => b.id !== id) })),
      updateAlerta: (id, data) => set((s) => ({ alertas: s.alertas.map((a) => a.id === id ? { ...a, ...data } : a) })),
      addMensagem: (mensagem) => set((s) => ({ historicoMensagens: [mensagem, ...s.historicoMensagens], temNovasMensagens: true })),
      marcarMensagemLida: (id) => set((s) => {
        const newHistory = s.historicoMensagens.map((m) => m.id === id ? { ...m, lida: true } : m);
        return { historicoMensagens: newHistory, temNovasMensagens: newHistory.some(m => !m.lida) };
      }),
      marcarTodasLidas: () => set((s) => ({ historicoMensagens: s.historicoMensagens.map((m) => ({ ...m, lida: true })), temNovasMensagens: false })),
      setTemNovasMensagens: (has) => set({ temNovasMensagens: has }),
      deleteImportBatch: async (batchId) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { success } = await DatabaseService.deleteImportBatch(batchId);
        if (success) set((s) => ({ 
          vagas: s.vagas.filter((v) => v.import_batch_id !== batchId),
          bancos: s.bancos.filter((b) => b.import_batch_id !== batchId),
          importHistory: s.importHistory.filter((h) => h.id !== batchId)
        }));
      },
      clearVagas: () => set({ vagas: [] }),
      clearBancos: () => set({ bancos: [] }),
      clearBancosPorRegiao: (regiao) => set((s) => ({ bancos: s.bancos.filter((b) => b.regiao !== regiao) })),
      clearAllData: () => set({ vagas: [], bancos: [], editais: [], validacoes: [], importHistory: [], importedFiles: [], tarefas: [], alertas: [], notificacoes: [] }),
      getVaga: (id) => get().vagas.find((v) => v.id === id),
      getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
      getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
      getBancoByVaga: (vagaId) => {
        const state = get();
        const v = state.vagas.find(x => x.id === vagaId);
        if (!v) return undefined;
        return state.bancos.find(b => (b.numero_processo && b.numero_processo === (v.numero_processo || v.requisicao)) || (b.cargo === v.cargo && b.unidade === v.unidade));
      },
      getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
      getMatchingDiagnostic: () => [],
      fixWrongImportBatches: () => {},
      subscribeRealtime: () => {
        // Avoid duplicate subscriptions
        if ((window as any).__realtimeChannel) {
          const currentChannel = (window as any).__realtimeChannel;
          if (currentChannel.state === 'joined') {
            console.log('[Realtime] Subscription already active and joined.');
            return;
          }
          console.log('[Realtime] Channel exists but state is:', currentChannel.state, '- Re-subscribing...');
          get().unsubscribeRealtime();
        }

        import('@/integrations/supabase/client').then(({ supabase }) => {
          const channelName = `realtime-vagas-bancos-${Math.random().toString(36).slice(2, 8)}`;
          console.log(`[Realtime] Initiating subscription on channel: ${channelName}`);
          
          const channel = supabase
            .channel(channelName)
            // Vagas
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Vagas Change:', eventType, newRow?.id || oldRow?.id);
              
              if (eventType === 'INSERT') {
                set((s) => s.vagas.some(v => v.id === newRow.id) ? s : ({ 
                  vagas: [mapDbVaga(newRow), ...s.vagas] 
                }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({
                  vagas: s.vagas.map((v) => {
                    if (v.id !== newRow.id) return v;
                    if ((v.version || 0) > (newRow.version || 0)) return v;
                    return mapDbVaga(newRow);
                  })
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ vagas: s.vagas.filter((v) => v.id !== oldRow.id) }));
              }
            })
            // Banco de Candidatos
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banco_candidatos' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Banco Change:', eventType, newRow?.id || oldRow?.id);

              if (eventType === 'INSERT') {
                set((s) => s.bancos.some(b => b.id === newRow.id) ? s : ({ 
                  bancos: [mapDbBanco(newRow), ...s.bancos] 
                }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({
                  bancos: s.bancos.map((b) => {
                    if (b.id !== newRow.id) return b;
                    if (((b as any).version || 0) > (newRow.version || 0)) return b;
                    return mapDbBanco(newRow);
                  })
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ bancos: s.bancos.filter((b) => b.id !== oldRow.id) }));
              }
            })
            // Convocações
            .on('postgres_changes', { event: '*', schema: 'public', table: 'convocacoes' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Convocacoes Change:', eventType, newRow?.id || oldRow?.id);

              if (eventType === 'INSERT') {
                if (newRow.deleted_at) return;
                set((s) => s.convocacoes.some(c => c.id === newRow.id) ? s : ({ 
                  convocacoes: [newRow as any, ...s.convocacoes] 
                }));
              } else if (eventType === 'UPDATE') {
                if (newRow.deleted_at) {
                  set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== newRow.id) }));
                  return;
                }
                set((s) => ({ 
                  convocacoes: s.convocacoes.map((c) => c.id === newRow.id ? { ...c, ...newRow } as any : c) 
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== oldRow.id) }));
              }
            })
            // Notificações
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
              const newRow = payload.new as any;
              console.log('[Realtime] New Notification:', newRow.titulo);
              toast.info(newRow.titulo, { description: newRow.mensagem });
              set((s) => ({ notificacoes: [newRow, ...s.notificacoes].slice(0, 50) }));
            })
            // Importações
            .on('postgres_changes', { event: '*', schema: 'public', table: 'importacoes' }, (payload) => {
              const { eventType } = payload;
              console.log('[Realtime] Importacoes Change detected, refetching history...');
              get().fetchImportHistory();
            })
            // Presence
            .on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              const editing: Record<string, any> = {};
              Object.values(state).flat().forEach((p: any) => { 
                if (p.editingRecordId) editing[p.editingRecordId] = p; 
              });
              set({ editingUsers: editing });
            })
            .subscribe((status, err) => {
              console.log(`[Realtime] Channel status: ${status}`);
              if (err) console.error(`[Realtime] Subscription error:`, err);
              
              if (status === 'CHANNEL_ERROR') {
                console.error('[Realtime] Channel error detected, attempting to reconnect in 5s...');
                setTimeout(() => {
                  get().unsubscribeRealtime();
                  get().subscribeRealtime();
                }, 5000);
              }
            });

          (window as any).__realtimeChannel = channel;
        });
      },
      unsubscribeRealtime: () => {
        const channel = (window as any).__realtimeChannel;
        if (channel) {
          console.log('[Realtime] Unsubscribing from channel...');
          import('@/integrations/supabase/client').then(({ supabase }) => {
            supabase.removeChannel(channel);
            delete (window as any).__realtimeChannel;
          });
        }
      },
      trackEditing: async (recordId) => {
        const channel = (window as any).__realtimeChannel;
        if (!channel) return;
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (currentUser) await channel.track({ userId: currentUser.id, userName: currentUser.nome_completo, editingRecordId: recordId });
      },
      stopTrackingEditing: async () => {
        const channel = (window as any).__realtimeChannel;
        if (!channel) return;
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (currentUser) await channel.track({ userId: currentUser.id, userName: currentUser.nome_completo, editingRecordId: null });
      }
    }),
    {
      name: 'hospital-recruitment-store',
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ editais: state.editais, validacoes: state.validacoes, bloqueios: state.bloqueios, tarefas: state.tarefas, alertas: state.alertas, historicoMensagens: state.historicoMensagens, temNovasMensagens: state.temNovasMensagens }),
    }
  )
);
