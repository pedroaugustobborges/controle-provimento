import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile, Tarefa, Alerta, MensagemHistorico } from '@/types/vaga';
import { mockVagas, mockBancos, mockConvocacoes, mockEditais, mockValidacoes, mockTarefas, mockAlertas } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo, getCategoriaStatus } from '@/lib/vagaUtils';

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
  
  setVagas: (vagas: Vaga[]) => void;
  fetchVagas: () => Promise<void>;
  fetchBancos: () => Promise<void>;
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
  deleteImportedFile: (id: string) => void;
  addTarefa: (tarefa: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  addAlerta: (alerta: Alerta) => void;
  updateAlerta: (id: string, data: Partial<Alerta>) => void;
  addMensagem: (mensagem: MensagemHistorico) => void;
  marcarMensagemLida: (id: string) => void;
  setTemNovasMensagens: (has: boolean) => void;
  deleteImportBatch: (batchId: string) => void;
  clearVagas: () => void;
  clearBancos: () => void;
  clearBancosPorRegiao: (regiao: 'GO_ES' | 'OUTRAS_UNIDADES') => void;
  clearAllData: () => void;
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
  getBancoByVaga: (vagaId: string) => BancoTalentos | undefined;
  getConvocacoesByVaga: (vagaId: string) => Convocacao[];
  getMatchingDiagnostic: () => { 
    vagaId: string; 
    vagaCargo: string; 
    vagaUnidade: string; 
    vagaReq: string; 
    potentialBancos: { cargo: string; unidade: string; status: string }[] 
  }[];
  fixWrongImportBatches: () => void;
}

export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      vagas: mockVagas,
      bancos: mockBancos,
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
      temNovasMensagens: true,
      
      setVagas: (vagas) => set({ vagas }),
      fetchVagas: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await supabase.from('vagas').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          if (data) set({ vagas: data as Vaga[] });
        } catch (err) {
          console.error('Error fetching vagas:', err);
        }
      },
      fetchBancos: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await supabase.from('banco_candidatos').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          if (data) set({ bancos: data as BancoTalentos[] });
        } catch (err) {
          console.error('Error fetching bancos:', err);
        }
      },
      fetchImportHistory: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await supabase
            .from('importacoes')
            .select('*')
            .order('data_hora', { ascending: false });
          if (error) throw error;
          if (data) {
            const mapped = data.map(item => ({
              id: item.id,
              usuario: item.usuario_id,
              total_lidos: item.quantidade_apagada + item.quantidade_inserida,
              total_novos: item.quantidade_inserida,
              total_atualizados: 0,
              total_erros: item.status === 'erro' ? 1 : 0,
              status: item.status,
              tipo_importacao: item.tipo,
              arquivo: item.arquivo || `Importação ${item.id.slice(0,8)}`,
              data_hora: item.data_hora || item.created_at,
              observacoes: item.observacoes
            }));
            set({ importHistory: mapped as any[] });
          }
        } catch (err) {
          console.error('Error fetching import history:', err);
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
      deleteImportedFile: (id) => set((s) => ({
        importedFiles: s.importedFiles.filter((f) => f.id !== id),
      })),
      addTarefa: (tarefa) => set((s) => ({ tarefas: [tarefa, ...s.tarefas] })),
      updateTarefa: (id, data) => set((s) => ({
        tarefas: s.tarefas.map((t) => t.id === id ? { ...t, ...data } : t),
      })),
      deleteTarefa: (id) => set((s) => ({
        tarefas: s.tarefas.filter((t) => t.id !== id),
      })),
      addAlerta: (alerta) => set((s) => ({ alertas: [alerta, ...s.alertas] })),
      deleteImportBatch: (batchId) => set((s) => {
        const vagasToRemove = s.vagas.filter(v => v.import_batch_id === batchId).map(v => v.id);
        
        return {
          vagas: s.vagas.filter((v) => v.import_batch_id !== batchId),
          bancos: s.bancos.filter((b) => b.import_batch_id !== batchId),
          convocacoes: s.convocacoes.filter((c) => !vagasToRemove.includes(c.vaga_id)),
          importHistory: s.importHistory.filter((h) => h.id !== batchId),
          importedFiles: s.importedFiles.filter((f) => f.vaga_importacao_id !== batchId && f.id !== batchId),
        };
      }),
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
        
        if (vaga.banco_id) {
          const banco = state.bancos.find(b => b.id === vaga.banco_id);
          if (banco) {
            return banco;
          }
        }

        if (vaga.numero_processo || vaga.numero_edital) {
          const matchedByNumber = state.bancos.find(b => 
            (vaga.numero_processo && (b.numero_processo === vaga.numero_processo || b.numero_processo_seletivo === vaga.numero_processo)) ||
            (vaga.numero_edital && b.numero_edital === vaga.numero_edital)
          );
          if (matchedByNumber) {
            return matchedByNumber;
          }
        }
        
        const normalizedVagaCargo = normalizeCargo(vaga.cargo);
        const normalizedVagaUnidade = normalizeCargo(vaga.unidade);
        
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
        const goianiaUnits = ['crer', 'hugol', 'hecad', 'hds', 'agir', 'teia anapolis', 'teia canedo', 'teia aparecida', 'teia goiania'];
        const upaUnits = ['vitoria', 'sao pedro', 'sua', 'suá', 'vitoria (sao pedro/sua)'];

        const found = state.bancos.find(b => {
          const normalizedBancoUnidade = normalizeCargo(b.unidade || '');
          const normalizedVagaUnidade = normalizeCargo(vaga.unidade || '');
          const normalizedBancoCargo = normalizeCargo(b.cargo || '');
          const normalizedVagaCargo = normalizeCargo(vaga.cargo || '');

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
        const pendingVagas = state.vagas.filter(v => getCategoriaStatus(v) !== 'concluidas' && getCategoriaStatus(v) !== 'vagas_interrompidas');
        
        return pendingVagas.map(v => {
          const matchedBanco = get().getBancoByVaga(v.id);
          if (matchedBanco) return null;
          
          const potentialBancos = state.bancos.filter(b => {
            const normV = (v.cargo || '').toLowerCase();
            const normB = (b.cargo || '').toLowerCase();
            return b.unidade === v.unidade || (normB && normV && (normB.includes(normV) || normV.includes(normB)));
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
        }).filter(Boolean) as any[];
      },
      fixWrongImportBatches: () => {
        const state = get();
        const wrongBatches = state.importHistory.filter(h => 
          h.tipo_importacao === 'banco' && 
          (h.arquivo || h.nome_arquivo || '').toLowerCase().includes('vagas')
        );

        if (wrongBatches.length > 0) {
          console.log(`[FIX] Encontrados ${wrongBatches.length} lotes de importação incorretos.`);
          
          wrongBatches.forEach(batch => {
            console.log(`- Removendo lote ${batch.id} (${batch.arquivo}) do tipo BANCO...`);
            get().deleteImportBatch(batch.id);
          });
        }
      },
    }),
    {
      name: 'hospital-recruitment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        vagas: [], 
        bancos: [],
        editais: state.editais,
        validacoes: state.validacoes,
        convocacoes: state.convocacoes,
        tarefas: state.tarefas,
        alertas: state.alertas,
        historicoMensagens: state.historicoMensagens,
        temNovasMensagens: state.temNovasMensagens,
        importHistory: state.importHistory.map(h => ({
          ...h,
          relatorio_erros: undefined,
          mapeamento_aplicado: undefined
        })).slice(0, 50),
        importedFiles: state.importedFiles.map(f => ({
          ...f,
          content: undefined
        })).slice(0, 20),
      }),
    }
  )
);
