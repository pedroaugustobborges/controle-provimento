import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile, Tarefa, Alerta, MensagemHistorico } from '@/types/vaga';
import { mockConvocacoes, mockEditais, mockValidacoes, mockTarefas, mockAlertas } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo, getCategoriaStatus } from '@/lib/vagaUtils';

const PAGE_SIZE = 500;

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

const fetchAllRows = async (tableName: 'vagas' | 'banco_candidatos' | 'importacoes') => {
  const { supabase } = await import('@/integrations/supabase/client');
  const rows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
};

interface VagasState {
  vagas: Vaga[];
  bancos: BancoTalentos[];
  convocacoes: Convocacao[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  importHistory: ImportHistory[];
  importedFiles: ImportedFile[];
  tarefas: Tarefa[];
  alertas: Alerta[];
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
  addVagas: (vagas: Vaga[]) => void;
  updateVaga: (id: string, data: Partial<Vaga>) => void;
  deleteVaga: (id: string) => void;
  addBanco: (banco: BancoTalentos) => void;
  addBancos: (bancos: BancoTalentos[]) => void;
  updateBanco: (id: string, data: Partial<BancoTalentos>) => void;
  deleteBanco: (id: string) => void;
  addConvocacao: (convocacao: Convocacao) => void;
  updateConvocacao: (id: string, data: Partial<Convocacao>) => void;
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
}

export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      vagas: [],
      bancos: [],
      convocacoes: mockConvocacoes,
      editais: mockEditais,
      validacoes: mockValidacoes,
      importHistory: [],
      importedFiles: [],
      tarefas: mockTarefas || [],
      alertas: mockAlertas || [],
      historicoMensagens: [
        { id: '1', data: '2024-05-20T10:00:00', remetente: 'Aide', conteudo: 'Olá! Como posso ajudar você hoje?', lida: true },
        { id: '2', data: '2024-05-20T10:05:00', remetente: 'Sistema', conteudo: 'O edital #123 foi validado com sucesso.', lida: true },
        { id: '3', data: '2024-05-21T09:00:00', remetente: 'Aide', conteudo: 'Lembrete: Você tem 5 convocações pendentes para hoje.', lida: false },
      ],
      temNovasMensagens: false,
      isLoading: false,
      isInitialLoad: true,
      isLoadingVagas: false,
      isLoadingBancos: false,
      lastUpdated: undefined,

      setVagas: (vagas) => set({ vagas }),
      fetchVagas: async () => {
        if (get().isLoadingVagas) return;
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
      fetchBancos: async () => {
        if (get().isLoadingBancos) return;
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
            get().fetchImportHistory()
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

          // Deduplication Logic: Same file, same user, same date
          const duplicatesToRemove: string[] = [];
          const seen = new Map<string, string>(); // key -> id

          const filtered = mapped.filter(item => {
            const dateStr = item.data_hora ? new Date(item.data_hora).toISOString().split('T')[0] : '';
            const key = `${item.arquivo}_${item.usuario_id}_${dateStr}`;
            
            if (seen.has(key)) {
              // We have a duplicate. Keep the most recent one (data is already sorted by created_at desc)
              // But since we are processing in order of appearance (most recent first), 
              // we keep the first one and discard others.
              duplicatesToRemove.push(item.id);
              return false;
            }
            
            seen.set(key, item.id);
            return true;
          });

          // Automatically remove duplicates from DB in the background
          if (duplicatesToRemove.length > 0) {
            console.log(`[DEDUPLICAÇÃO] Removendo ${duplicatesToRemove.length} registros duplicados automaticamente.`);
            const { DatabaseService } = await import('@/services/databaseService');
            Promise.all(duplicatesToRemove.map(id => DatabaseService.deleteImportBatch(id)))
              .catch(err => console.error('Error auto-removing duplicates:', err));
          }

          set({
            importHistory: filtered,
            importedFiles: filtered.map(buildImportedFileFromHistory),
          });
        } catch (err) {
          console.error('Error fetching import history:', err);
          set({ importHistory: [], importedFiles: [] });
        }
      },
      addVagas: (newVagas) => set((s) => ({ vagas: [...newVagas, ...s.vagas] })),
      updateVaga: (id, data) => set((s) => ({
        vagas: s.vagas.map((v) => v.id === id ? { ...v, ...data } : v),
      })),
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
      deleteImportBatch: async (batchId) => {
        try {
          const { DatabaseService } = await import('@/services/databaseService');
          const { success, error } = await DatabaseService.deleteImportBatch(batchId);
          
          if (success) {
            set((s) => {
              // Find if we are deleting vagas or bancos to handle dependencies
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
        alertas: []
      }),
      getVaga: (id) => get().vagas.find((v) => v.id === id),
      getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
      getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
      getBancoByVaga: (vagaId) => {
        const state = get();
        const vaga = state.vagas.find(v => v.id === vagaId);
        
        if (!vaga) return undefined;
        
        // 1. Try by ID first (Explicit link)
        if (vaga.banco_id) {
          const banco = state.bancos.find(b => b.id === vaga.banco_id);
          if (banco) {
            return banco;
          }
        }

        // 2. Try by process number or edital number (Exact match)
        if (vaga.numero_processo || vaga.numero_edital) {
          const matchedByNumber = state.bancos.find(b => 
            (vaga.numero_processo && (b.numero_processo === vaga.numero_processo || b.numero_processo_seletivo === vaga.numero_processo)) ||
            (vaga.numero_edital && b.numero_edital === vaga.numero_edital)
          );
          if (matchedByNumber) {
            return matchedByNumber;
          }
        }
        
        // Fallback: match by cargo and unit scope - relaxed matching
        const normalizedVagaCargo = normalizeCargo(vaga.cargo);
        const normalizedVagaUnidade = normalizeCargo(vaga.unidade);
        
        const getCargoTokens = (cargo: string) => {
          if (!cargo) return [];
          return normalizeCargo(cargo)
            .split(' ')
            .filter(word => word.length > 2 && !['das', 'dos', 'com', 'para', 'pela', 'pelo', 'uma', 'uns', 'nas', 'nos', 'est', 'estadual', 'hospital'].includes(word))
            .map(word => {
              // Common abbreviations
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

        // Specific units for matching as requested
        const goianiaUnits = ['crer', 'hugol', 'hecad', 'hds', 'agir', 'teia anapolis', 'teia canedo', 'teia aparecida', 'teia goiania'];
        const upaUnits = ['vitoria', 'sao pedro', 'sua', 'suá', 'vitoria (sao pedro/sua)'];

        const found = state.bancos.find(b => {
          const normalizedBancoUnidade = normalizeCargo(b.unidade || '');
          const normalizedVagaUnidade = normalizeCargo(vaga.unidade || '');
          const normalizedBancoCargo = normalizeCargo(b.cargo || '');
          const normalizedVagaCargo = normalizeCargo(vaga.cargo || '');

          // --- Unit Matching conforme Item 8 ---
          let unitMatch = false;

          if (normalizedBancoUnidade === normalizedVagaUnidade) {
            unitMatch = true;
          } else if (normalizedBancoUnidade === 'goiania' && goianiaUnits.includes(normalizedVagaUnidade)) {
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

          // --- Cargo Matching ---
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
            potentialBancos: potentialBancos.map(b => ({
              cargo: b.cargo,
              unidade: b.unidade,
              status: b.status
            }))
          };
        }).filter(Boolean);
      },
      fixWrongImportBatches: () => {
        const state = get();
        // Identify batches that are BANCO but should be VAGAS based on filename
        const wrongBatches = state.importHistory.filter(h => 
          h.tipo_importacao === 'banco' && 
          (h.arquivo || h.nome_arquivo || '').toLowerCase().includes('vagas')
        );

        if (wrongBatches.length > 0) {
          console.log(`[FIX] Encontrados ${wrongBatches.length} lotes de importação incorretos.`);
          
          wrongBatches.forEach(batch => {
            console.log(`- Removendo lote ${batch.id} (${batch.arquivo}) do tipo BANCO...`);
            // We can't automatically convert because the data structure is incompatible,
            // so we delete them to allow a clean re-import with the new logic.
            get().deleteImportBatch(batch.id);
          });
        }
      },
    }),
    {
      name: 'hospital-recruitment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        vagas: state.vagas,
        bancos: state.bancos,
        editais: state.editais,
        validacoes: state.validacoes,
        convocacoes: state.convocacoes,
        tarefas: state.tarefas,
        alertas: state.alertas,
        historicoMensagens: state.historicoMensagens,
        temNovasMensagens: state.temNovasMensagens,
        importHistory: state.importHistory,
        importedFiles: state.importedFiles,
      }),
    }
  )
);