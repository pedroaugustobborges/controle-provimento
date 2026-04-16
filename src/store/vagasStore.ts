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
  deleteBanco: (id: string) => void;
  addConvocacao: (convocacao: Convocacao) => void;
  updateConvocacao: (id: string, data: Partial<Convocacao>) => void;
  deleteConvocacao: (id: string) => void;
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
      convocacoes: mockConvocacoes,
      bloqueios: [] as BloqueioHorario[],
      editais: mockEditais,
      validacoes: mockValidacoes,
      importHistory: [],
      importedFiles: [],
      notificacoes: [],
      tarefas: (() => {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
        return [
          { id: 't1', titulo: 'Validar edital #789', descricao: 'Revisar e aprovar o edital pendente de validação administrativa.', status: 'pendente' as const, prioridade: 'alta' as const, data_criacao: `${today}T08:00:00`, atribuido_a: 'Analista Administrativo', perfil_destinatario: 'analista administrativo' },
          { id: 't2', titulo: 'Realizar convocação pendente', descricao: 'Há 5 candidatos aguardando convocação para vagas abertas.', status: 'pendente' as const, prioridade: 'alta' as const, data_criacao: `${today}T09:00:00`, atribuido_a: 'Analista das Convocações', perfil_destinatario: 'analista de convocações' },
          { id: 't3', titulo: 'Publicar edital de Enfermeiro', descricao: 'Edital pronto para publicação no portal.', status: 'pendente' as const, prioridade: 'media' as const, data_criacao: `${yesterday}T14:00:00`, atribuido_a: 'Analista de Edital', perfil_destinatario: 'analista do edital' },
          { id: 't4', titulo: 'Revisar requisição de vaga', descricao: 'Nova requisição de vaga recebida da unidade HUGOL.', status: 'pendente' as const, prioridade: 'media' as const, data_criacao: `${yesterday}T10:00:00`, atribuido_a: 'Analista de RH', perfil_destinatario: 'analista da unidade' },
        ] as Tarefa[];
      })(),
      alertas: (() => {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
        return [
          { id: 'a1', titulo: 'Convocações pendentes', mensagem: 'Você tem 5 convocações pendentes para hoje.', tipo: 'atraso' as const, status: 'nao_lido' as const, data_criacao: `${today}T08:00:00`, destinatario: 'analista de convocações', link: '/convocacoes' },
          { id: 'a2', titulo: 'Validação de edital pendente', mensagem: 'O edital #789 está pendente de validação administrativa há 2 dias.', tipo: 'validacao' as const, status: 'nao_lido' as const, data_criacao: `${today}T09:30:00`, destinatario: 'analista administrativo', link: '/validacao' },
          { id: 'a3', titulo: 'Edital pronto para publicação', mensagem: 'O edital de Enfermeiro está pronto para ser publicado.', tipo: 'informativo' as const, status: 'nao_lido' as const, data_criacao: `${today}T10:00:00`, destinatario: 'analista do edital', link: '/editais' },
          { id: 'a4', titulo: 'Vaga crítica sem andamento', mensagem: 'A vaga de Médico Intensivista está há 5 dias sem movimentação.', tipo: 'critico' as const, status: 'nao_lido' as const, data_criacao: `${today}T07:00:00`, destinatario: 'analista da unidade', link: '/vagas' },
          { id: 'a5', titulo: 'Validação concluída', mensagem: 'A unidade aprovou o cargo para o próximo edital.', tipo: 'validacao' as const, status: 'lido' as const, data_criacao: `${yesterday}T15:00:00`, destinatario: 'analista administrativo', link: '/editais' },
          { id: 'a6', titulo: 'Aprovação de edital solicitada', mensagem: 'O Analista Administrativo solicita aprovação do edital #789 para publicação.', tipo: 'validacao' as const, status: 'nao_lido' as const, data_criacao: `${today}T11:00:00`, destinatario: 'supervisão', link: '/validacao' },
        ] as Alerta[];
      })(),
      historicoMensagens: (() => {
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
        const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
        return [
          { id: 'm1', data: `${twoDaysAgo}T10:00:00`, remetente: 'Agie', conteudo: 'Olá! Como posso ajudar você hoje?', lida: true, perfil_destinatario: undefined },
          { id: 'm2', data: `${twoDaysAgo}T10:05:00`, remetente: 'Sistema', conteudo: 'O edital #123 foi validado com sucesso.', lida: true, perfil_destinatario: 'analista administrativo' },
          { id: 'm3', data: `${yesterday}T09:00:00`, remetente: 'Agie', conteudo: 'Lembrete: Você tem 5 convocações pendentes para hoje.', lida: false, perfil_destinatario: 'analista de convocações' },
          { id: 'm4', data: `${yesterday}T10:00:00`, remetente: 'Sistema', conteudo: 'Edital de Enfermeiro aguardando publicação.', lida: false, perfil_destinatario: 'analista do edital' },
          { id: 'm5', data: `${yesterday}T11:30:00`, remetente: 'Sistema', conteudo: 'Nova requisição de vaga recebida da unidade HUGOL.', lida: false, perfil_destinatario: 'analista da unidade' },
          { id: 'm6', data: `${yesterday}T12:00:00`, remetente: 'Sistema', conteudo: 'Edital #789 aguarda sua aprovação para publicação.', lida: false, perfil_destinatario: 'supervisão' },
          { id: 'm7', data: `${yesterday}T13:00:00`, remetente: 'Agie', conteudo: 'Relatório semanal de vagas disponível para revisão.', lida: false, perfil_destinatario: 'gestão' },
        ] as MensagemHistorico[];
      })(),
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
          const mappedVagas = data.map(mapDbVaga);
          set({ 
            vagas: mappedVagas,
            isInitialLoad: false 
          });
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
          const mappedBancos = data.map(mapDbBanco);
          set({ 
            bancos: mappedBancos,
            isInitialLoad: false
          });
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
            get().fetchNotificacoes()
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
          const profilesById = new Map<string, { nome_completo: string; email: string }>();

          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, nome_completo, email')
              .in('id', userIds);

            if (profilesError) throw profilesError;

            (profiles || []).forEach(profile => {
              profilesById.set(profile.id, {
                nome_completo: profile.nome_completo,
                email: profile.email,
              });
            });
          }

          const mapped = data.map(item => {
            const profile = profilesById.get(item.usuario_id || '');

            return {
              id: item.id,
              usuario_id: item.usuario_id,
              usuario: profile?.nome_completo || item.usuario_id || 'Sistema',
              email_usuario: profile?.email,
              total_lidos: item.quantidade_processada || 0,
              total_novos: item.quantidade_inserida || 0,
              total_atualizados: item.quantidade_atualizada || 0,
              total_ignorados: item.quantidade_ignorada || 0,
              total_erros: item.quantidade_erro || 0,
              quantidade_confirmada: item.quantidade_confirmada || 0,
              status: item.status,
              tipo_importacao: item.tipo,
              arquivo: item.nome_arquivo || item.arquivo || `Importação ${item.id.slice(0, 8)}`,
              nome_arquivo: item.nome_arquivo || item.arquivo || `Importação ${item.id.slice(0, 8)}`,
              data_hora: item.created_at,
              observacoes: item.observacoes,
              referencia_arquivo: item.arquivo || item.nome_arquivo || item.id,
              planilha_aba: item.aba_planilha,
              linha_cabecalho: item.linha_cabecalho,
              modo_importacao: item.modo_importacao,
              origem_base: item.origem_base,
              tabela_destino: item.tabela_destino,
              mapeamento_aplicado: item.detalhes?.mapeamento,
            } as ImportHistory;
          });

          const filtered = mapped.filter((item, index) => {
            const dateStr = item.data_hora ? new Date(item.data_hora).toISOString().split('T')[0] : '';
            const key = `${item.arquivo}_${item.usuario_id}_${dateStr}`;
            return mapped.findIndex(m => {
              const mDateStr = m.data_hora ? new Date(m.data_hora).toISOString().split('T')[0] : '';
              return `${m.arquivo}_${m.usuario_id}_${mDateStr}` === key;
            }) === index;
          });

          set({
            importHistory: filtered,
            importedFiles: filtered.map(buildImportedFileFromHistory),
          });
        } catch (err) {
          console.error('Error fetching import history:', err);
          set({ importHistory: [], importedFiles: [] });
        }
      },
      fetchNotificacoes: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (error) throw error;
          set({ notificacoes: data || [] });
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
        
        if (!currentUser) {
          toast.error("Usuário não autenticado.");
          return false;
        }

        const currentVaga = get().vagas.find(v => v.id === id);
        if (!currentVaga) return false;

        const { data: updated, error } = await DatabaseService.saveWithConcurrency('vagas', {
          ...currentVaga,
          ...data,
          id,
          version: currentVaga.version || 0
        }, currentUser.id);

        if (error) {
          if (error.message.includes('concorrência')) {
            toast.error("Este registro foi atualizado por outro usuário enquanto você editava. Recarregue para ver a versão mais recente.", {
              duration: 5000,
            });
          } else {
            toast.error(error.message || "Erro ao atualizar vaga.");
          }
          return false;
        }

        if (updated) {
          get().updateVaga(id, mapDbVaga(updated));
          
          // Emit internal notification
          get().createNotificacao({
            titulo: "Vaga Atualizada",
            mensagem: `${currentUser.nome_completo} atualizou a vaga ${currentVaga.cargo} (${currentVaga.unidade})`,
            unidade: currentVaga.unidade,
            registro_id: id,
            tipo: 'info'
          });
          
          return true;
        }
        return false;
      },
      deleteVaga: (id) => set((s) => ({
        vagas: s.vagas.filter((v) => v.id !== id),
      })),
      addBanco: (banco) => set((s) => ({ bancos: [banco, ...s.bancos] })),
      addBancos: (newBancos) => set((s) => ({ bancos: [...newBancos, ...s.bancos] })),
      updateBanco: (id, data) => set((s) => ({
        bancos: s.bancos.map((b) => b.id === id ? { ...b, ...data } : b),
      })),
      deleteBanco: (id) => set((s) => ({
        bancos: s.bancos.filter((b) => b.id !== id),
      })),
      addConvocacao: (convocacao) => set((s) => ({ convocacoes: [convocacao, ...s.convocacoes] })),
      updateConvocacao: (id, data) => set((s) => ({
        convocacoes: s.convocacoes.map((c) => c.id === id ? { ...c, ...data } : c),
      })),
      deleteConvocacao: (id) => set((s) => ({
        convocacoes: s.convocacoes.filter((c) => c.id !== id),
      })),
      updateEdital: (id, data) => set((s) => ({
        editais: s.editais.map((e) => e.id === id ? { ...e, ...data } : e),
      })),
      updateValidacao: (id, data) => set((s) => ({
        validacoes: s.validacoes.map((v) => v.id === id ? { ...v, ...data } : v),
      })),
      addEdital: (edital) => set((s) => ({ editais: [...s.editais, edital] })),
      addValidacao: (validacao) => set((s) => ({ validacoes: [...s.validacoes, validacao] })),
      addImportHistory: (history) => set((s) => ({ importHistory: [history, ...s.importHistory] })),
      addImportedFile: (file) => set((s) => ({ importedFiles: [file, ...s.importedFiles] })),
      updateImportedFile: (id, data) => set((s) => ({
        importedFiles: s.importedFiles.map((f) => f.id === id ? { ...f, ...data } : f),
      })),
      deleteImportedFile: async (id) => {
        try {
          const { DatabaseService } = await import('@/services/databaseService');
          const { success, error } = await DatabaseService.deleteImportBatch(id);
          if (success) {
            set((s) => ({
              importedFiles: s.importedFiles.filter((f) => f.id !== id),
              importHistory: s.importHistory.filter((h) => h.id !== id),
            }));
          } else {
            throw error || new Error('Falha ao excluir o arquivo do banco de dados');
          }
        } catch (err) {
          console.error('Erro ao excluir arquivo:', err);
          throw err;
        }
      },
      addTarefa: (tarefa) => set((s) => ({ tarefas: [tarefa, ...s.tarefas] })),
      updateTarefa: (id, data) => set((s) => ({
        tarefas: s.tarefas.map((t) => t.id === id ? { ...t, ...data } : t),
      })),
      deleteTarefa: (id) => set((s) => ({
        tarefas: s.tarefas.filter((t) => t.id !== id),
      })),
      addAlerta: (alerta) => set((s) => ({ alertas: [alerta, ...s.alertas] })),
      addBloqueio: (bloqueio) => set((s) => ({ bloqueios: [bloqueio, ...s.bloqueios] })),
      removeBloqueio: (id) => set((s) => ({ bloqueios: s.bloqueios.filter(b => b.id !== id) })),
      deleteImportBatch: async (batchId) => {
        try {
          const { DatabaseService } = await import('@/services/databaseService');
          const { success, error } = await DatabaseService.deleteImportBatch(batchId);
          if (success) {
            set((s) => {
              const vagasToRemove = s.vagas.filter(v => v.import_batch_id === batchId).map(v => v.id);
              return {
                vagas: s.vagas.filter((v) => v.import_batch_id !== batchId),
                bancos: s.bancos.filter((b) => b.import_batch_id !== batchId),
                convocacoes: s.convocacoes.filter((c) => !vagasToRemove.includes(c.vaga_id)),
                importHistory: s.importHistory.filter((h) => h.id !== batchId),
                importedFiles: s.importedFiles.filter((f) => f.vaga_importacao_id !== batchId && f.id !== batchId),
              };
            });
          } else {
            throw error || new Error('Falha ao excluir o lote do banco de dados');
          }
        } catch (err) {
          console.error('Erro ao excluir lote:', err);
          throw err;
        }
      },
      updateAlerta: (id, data) => set((s) => ({
        alertas: s.alertas.map((a) => a.id === id ? { ...a, ...data } : a),
      })),
      addMensagem: (mensagem) => set((s) => ({ 
        historicoMensagens: [mensagem, ...s.historicoMensagens],
        temNovasMensagens: true 
      })),
      marcarMensagemLida: (id) => set((s) => {
        const newHistory = s.historicoMensagens.map((m) => m.id === id ? { ...m, lida: true } : m);
        const hasUnread = newHistory.some(m => !m.lida);
        return { historicoMensagens: newHistory, temNovasMensagens: hasUnread };
      }),
      marcarTodasLidas: () => set((s) => ({
        historicoMensagens: s.historicoMensagens.map((m) => ({ ...m, lida: true })),
        temNovasMensagens: false
      })),
      setTemNovasMensagens: (has) => set({ temNovasMensagens: has }),
      clearVagas: () => set({ vagas: [] }),
      clearBancos: () => set({ bancos: [] }),
      clearBancosPorRegiao: (regiao) => set((s) => ({
        bancos: s.bancos.filter((b) => b.regiao !== regiao)
      })),
      clearAllData: () => set({ 
        vagas: [], 
        bancos: [], 
        convocacoes: [], 
        editais: [], 
        validacoes: [], 
        importHistory: [], 
        importedFiles: [],
        tarefas: [],
        alertas: [],
        notificacoes: []
      }),
      getVaga: (id) => get().vagas.find((v) => v.id === id),
      getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
      getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
      getBancoByVaga: (vagaId) => {
        const state = get();
        const vaga = state.vagas.find(v => v.id === vagaId);
        if (!vaga) return undefined;
        if (vaga.banco_id) {
          const banco = state.bancos.find(b => b.id === vaga.banco_id);
          if (banco) return banco;
        }
        const vProc = (vaga.numero_processo || vaga.numero_requisicao || vaga.requisicao || '').trim();
        const vEdital = (vaga.numero_edital || '').trim();
        if (vProc || vEdital) {
          const matchedByNumber = state.bancos.find(b => {
             const bProc = (b.numero_processo || b.numero_processo_seletivo || '').trim();
             const bEdital = (b.numero_edital || '').trim();
             return (vProc && (bProc === vProc || bEdital === vProc)) ||
                    (vEdital && (bEdital === vEdital || bProc === vEdital));
          });
          if (matchedByNumber) return matchedByNumber;
        }
        const normalizedVagaCargo = normalizeCargo(vaga.cargo);
        const getCargoTokens = (cargo: string) => {
          if (!cargo) return [];
          return normalizeCargo(cargo)
            .split(' ')
            .filter(word => word.length > 2 && !['das', 'dos', 'com', 'para', 'pela', 'pelo', 'uma', 'uns', 'nas', 'nos', 'est', 'estadual', 'hospital'].includes(word))
            .map(word => {
              if (word === 'tec') return 'tecnico';
              if (word === 'aux') return 'auxiliar';
              if (word === 'esp') return 'especialista';
              if (word === 'enfer') return 'enfermeiro';
              if (word === 'psic') return 'psicologo';
              if (word === 'fisio') return 'fisioterapeuta';
              if (word === 'enf') return 'enfermeiro';
              if (word === 'adm') return 'administrativo';
              return word;
            });
        };
        const vagaTokens = getCargoTokens(vaga.cargo);
        const goianiaUnits = ['crer', 'hugol', 'hecad', 'hds', 'agir', 'teia anapolis', 'teia canedo', 'teia aparecida', 'teia goiania', 'teia cen', 'teia man', 'teia man 3', 'teia pin'];
        const upaUnits = ['vitoria', 'sao pedro', 'sua', 'suá', 'vitoria (sao pedro/sua)'];
        const found = state.bancos.find(b => {
          const normalizedBancoUnidade = normalizeCargo(b.unidade || '');
          const normalizedVagaUnidade = normalizeCargo(vaga.unidade || '');
          const normalizedBancoCargo = normalizeCargo(b.cargo || '');
          const normalizedVagaCargo = normalizeCargo(vaga.cargo || '');
          let unitMatch = false;
          if (normalizedBancoUnidade === normalizedVagaUnidade) {
            unitMatch = true;
          } else if (normalizedBancoUnidade === 'goiania' && (goianiaUnits.includes(normalizedVagaUnidade) || normalizedVagaUnidade.startsWith('teia'))) {
            unitMatch = true;
          } else if (normalizedBancoUnidade === 'upa' && upaUnits.includes(normalizedVagaUnidade)) {
            unitMatch = true;
          } else if (normalizedBancoUnidade.includes('jatai') && normalizedVagaUnidade.includes('jatai')) {
            unitMatch = true;
          } else if (normalizedBancoUnidade.includes('policlinica') && normalizedVagaUnidade.includes('policlinica')) {
            unitMatch = true;
          } else if (normalizedBancoUnidade.includes('corporativo') || normalizedBancoUnidade.includes('agir')) {
            unitMatch = true;
          }
          if (!unitMatch) return false;
          const hasStringMatch = normalizedBancoCargo === normalizedVagaCargo || 
                                normalizedBancoCargo.includes(normalizedVagaCargo) || 
                                normalizedVagaCargo.includes(normalizedBancoCargo);
          if (hasStringMatch) return true;
          const bancoTokens = getCargoTokens(b.cargo);
          const commonTokens = vagaTokens.filter(t => bancoTokens.some(bt => bt.includes(t) || t.includes(bt)));
          const hasTokenMatch = vagaTokens.length > 0 && (
            commonTokens.length >= Math.ceil(vagaTokens.length * 0.4) || 
            (vagaTokens.length === 1 && commonTokens.length === 1)
          );
          return hasTokenMatch;
        });
        return found;
      },
      getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
      getMatchingDiagnostic: () => {
        const state = get();
        const pendingVagas = state.vagas.filter(v => getCategoriaStatus(v) !== 'concluidas' && getCategoriaStatus(v) !== 'suspensa' && getCategoriaStatus(v) !== 'cancelada');
        return pendingVagas.map(v => {
          const matchedBanco = get().getBancoByVaga(v.id);
          if (matchedBanco) return null;
          const potentialBancos = state.bancos.filter(b => {
            const normV = (v.cargo || '').toLowerCase();
            const normB = (b.cargo || '').toLowerCase();
            return (b.unidade === v.unidade) || (normB && normV && (normB.includes(normV) || normV.includes(normB)));
          }).slice(0, 10);
          return {
            vagaId: v.id,
            vagaCargo: v.cargo,
            vagaUnidade: v.unidade,
            vagaReq: v.requisicao || v.numero_requisicao,
            potentialBancos: potentialBancos.map(b => ({ cargo: b.cargo, unidade: b.unidade, status: b.status }))
          };
        }).filter(Boolean) as any[];
      },
      fixWrongImportBatches: () => {
        const state = get();
        const wrongBatches = state.importHistory.filter(h => 
          h.tipo_importacao === 'banco' && 
          (h.arquivo || h.nome_arquivo || '').toLowerCase().includes('vagas')
        );
        if (wrongBatches.length > 0) {
          wrongBatches.forEach(batch => {
            get().deleteImportBatch(batch.id);
          });
        }
      },
      subscribeRealtime: () => {
        import('@/integrations/supabase/client').then(({ supabase }) => {
          const channel = supabase
            .channel('realtime-vagas-bancos')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'vagas' },
              (payload) => {
                const { eventType, new: newRow, old: oldRow } = payload;
                if (eventType === 'INSERT') {
                  const mapped = mapDbVaga(newRow);
                  set((s) => {
                    if (s.vagas.some((v) => v.id === mapped.id)) return s;
                    return { vagas: [mapped, ...s.vagas] };
                  });
                } else if (eventType === 'UPDATE') {
                  const mapped = mapDbVaga(newRow);
                  set((s) => ({
                    vagas: s.vagas.map((v) => v.id === mapped.id ? mapped : v),
                  }));
                } else if (eventType === 'DELETE') {
                  const deletedId = (oldRow as any)?.id;
                  if (deletedId) {
                    set((s) => ({ vagas: s.vagas.filter((v) => v.id !== deletedId) }));
                  }
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'banco_candidatos' },
              (payload) => {
                const { eventType, new: newRow, old: oldRow } = payload;
                if (eventType === 'INSERT') {
                  const mapped = mapDbBanco(newRow);
                  set((s) => {
                    if (s.bancos.some((b) => b.id === mapped.id)) return s;
                    return { bancos: [mapped, ...s.bancos] };
                  });
                } else if (eventType === 'UPDATE') {
                  const mapped = mapDbBanco(newRow);
                  set((s) => ({
                    bancos: s.bancos.map((b) => b.id === mapped.id ? mapped : b),
                  }));
                } else if (eventType === 'DELETE') {
                  const deletedId = (oldRow as any)?.id;
                  if (deletedId) {
                    set((s) => ({ bancos: s.bancos.filter((b) => b.id !== deletedId) }));
                  }
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notificacoes' },
              (payload) => {
                const { eventType, new: newRow } = payload;
                if (eventType === 'INSERT') {
                  set((s) => {
                    if (s.notificacoes.some(n => n.id === newRow.id)) return s;
      trackEditing: async (recordId) => {
        const channel = (window as any).__realtimeChannel;
        if (channel) {
          const { currentUser } = (await import('./adminStore')).useAdminStore.getState();
          if (currentUser) {
            await channel.track({
              userId: currentUser.id,
              userName: currentUser.nome_completo,
              editingRecordId: recordId,
              online_at: new Date().toISOString(),
            });
          }
        }
      },
      stopTrackingEditing: async () => {
        const channel = (window as any).__realtimeChannel;
        if (channel) {
          const { currentUser } = (await import('./adminStore')).useAdminStore.getState();
          if (currentUser) {
            await channel.track({
              userId: currentUser.id,
              userName: currentUser.nome_completo,
              editingRecordId: null,
              online_at: new Date().toISOString(),
            });
          }
        }
      },

                    const newAlert = {
                      id: newRow.id,
                      titulo: newRow.titulo,
                      mensagem: newRow.mensagem,
                      tipo: newRow.tipo || 'informativo',
                      status: 'nao_lido' as const,
                      data_criacao: newRow.created_at,
                      destinatario: newRow.usuario_id || 'todos',
                      link: newRow.registro_id ? `/vagas/${newRow.registro_id}` : undefined
                    };

                    toast.info(newRow.titulo, {
                      description: newRow.mensagem,
                    });

                    return {
                      notificacoes: [newRow, ...s.notificacoes].slice(0, 50),
                      alertas: [newAlert, ...s.alertas]
                    };
                  });
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'importacoes' },
              (payload) => {
                const { eventType } = payload;
                if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
                  get().fetchImportHistory();
                }
              }
            )
            .on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              const activeEditing: Record<string, any> = {};
              Object.values(state).flat().forEach((pres: any) => {
                if (pres.editingRecordId) {
                  activeEditing[pres.editingRecordId] = pres;
                }
              });
              set({ editingUsers: activeEditing });
            })
            .subscribe();

          (window as any).__realtimeChannel = channel;
        });
      },
      unsubscribeRealtime: () => {
        const channel = (window as any).__realtimeChannel;
        if (channel) {
          import('@/integrations/supabase/client').then(({ supabase }) => {
            supabase.removeChannel(channel);
          });
          delete (window as any).__realtimeChannel;
        }
      },
    }),
    {
      name: 'hospital-recruitment-store',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState?.historicoMensagens) {
          persistedState.historicoMensagens = persistedState.historicoMensagens.map((m: any) => ({
            ...m,
            remetente: m.remetente === 'AIDE' || m.remetente === 'Aide' ? 'Agie' : m.remetente,
          }));
        }
        if (version < 4) {
          delete persistedState.alertas;
          delete persistedState.historicoMensagens;
          delete persistedState.tarefas;
        }
        return persistedState;
      },
      storage: createJSONStorage(() => ({
        getItem: (name: string) => localStorage.getItem(name),
        setItem: (name: string, value: string) => {
          try {
            localStorage.setItem(name, value);
          } catch (e) {
            console.warn('LocalStorage quota exceeded, skipping persist.');
          }
        },
        removeItem: (name: string) => localStorage.removeItem(name),
      })),
      partialize: (state) => ({
        editais: state.editais,
        validacoes: state.validacoes,
        convocacoes: state.convocacoes,
        bloqueios: state.bloqueios,
        tarefas: state.tarefas,
        alertas: state.alertas,
        historicoMensagens: state.historicoMensagens,
        temNovasMensagens: state.temNovasMensagens,
      }),
    }
  )
);
