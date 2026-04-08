import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile } from '@/types/vaga';
import { mockVagas, mockBancos, mockConvocacoes, mockEditais, mockValidacoes } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';

interface VagasState {
  vagas: Vaga[];
  bancos: BancoTalentos[];
  convocacoes: Convocacao[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  importHistory: ImportHistory[];
  importedFiles: ImportedFile[];
  
  setVagas: (vagas: Vaga[]) => void;
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
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
  getBancoByVaga: (vagaId: string) => BancoTalentos | undefined;
  getConvocacoesByVaga: (vagaId: string) => Convocacao[];
  getMatchingDiagnostic: () => any[];
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
      
      setVagas: (vagas) => set({ vagas }),
      addVagas: (newVagas) => set((s) => ({ vagas: [...s.vagas, ...newVagas] })),
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
        
        // Aggressive normalization helper
        const normalizeStr = (str: string) => {
          if (!str) return '';
          return str.toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9 ]/g, " ") // replace non-alphanumeric with spaces
            .replace(/\s+/g, " ") // collapse spaces
            .trim();
        };

        const goianiaUnits = [
          'CRER', 'HUGOL', 'HECAD', 'HDS', 'CORPORATIVO', 'POLICLINICA', 
          'CEALCON', 'HUGO', 'HEAPA', 'HEG', 'HDT', 'GOIANIA', 'AGIR',
          'HOSPITAL CENTRAL', 'CENTRAL', 'MATERNIDADE', 'HEMMNSL', 'HOSPITAL ESTADUAL',
          'CORA', 'HECON', 'HESLV', 'HETRIN', 'HEEL', 'HEJA', 'HERP', 'GOIAS', 'GO',
          'HGG', 'HOSPITAL GERAL'
        ].map(normalizeStr);
        
        const vitoriaUnits = [
          'SUA', 'SAO PEDRO', 'VITORIA', 'UPA', 'ES', 'ESPIRITO SANTO', 'SERRA', 'CARIACICA', 'VILA VELHA', 'VITORIA'
        ].map(normalizeStr);
        
        const getCargoTokens = (cargo: string) => {
          return normalizeStr(cargo)
            .split(' ')
            .filter(word => word.length > 2 && !['das', 'dos', 'com'].includes(word));
        };

        const normalizedVagaCargo = normalizeStr(vaga.cargo);
        const normalizedVagaUnidade = normalizeStr(vaga.unidade);
        const vagaTokens = getCargoTokens(vaga.cargo);

        // Fallback: match by cargo and unit scope
        const found = state.bancos.find(b => {
          // Status check - be more lenient if needed, but respect 'vencido'
          if (b.status === 'vencido') return false;
          
          const normalizedBancoCargo = normalizeStr(b.cargo);
          const bancoTokens = getCargoTokens(b.cargo);
          
          // Cargo matching logic:
          // 1. Exact or partial string match
          // 2. Token overlap (at least 2 tokens or all tokens if less than 2)
          const hasStringMatch = normalizedBancoCargo === normalizedVagaCargo || 
                                normalizedBancoCargo.includes(normalizedVagaCargo) || 
                                normalizedVagaCargo.includes(normalizedBancoCargo);
          
          const commonTokens = vagaTokens.filter(t => bancoTokens.includes(t));
          const hasTokenMatch = vagaTokens.length > 0 && (
            commonTokens.length >= Math.min(vagaTokens.length, 2) ||
            (vagaTokens.length === 1 && commonTokens.length === 1)
          );

          if (!hasStringMatch && !hasTokenMatch) return false;
          
          const normalizedBancoUnidade = normalizeStr(b.unidade);
          
          // 1. Exact match of unit
          if (normalizedBancoUnidade === normalizedVagaUnidade) return true;
          
          // 2. Regional scope: Goiânia/GO
          const isBancoGoiania = goianiaUnits.some(u => normalizedBancoUnidade.includes(u)) || 
                                 normalizedBancoUnidade === 'goiania' || 
                                 normalizedBancoUnidade === 'agir';
          const isVagaGoiania = goianiaUnits.some(u => normalizedVagaUnidade.includes(u));
          
          if (isBancoGoiania && isVagaGoiania) return true;
          
          // 3. Regional scope: Vitória/ES
          const isBancoVitoria = vitoriaUnits.some(u => normalizedBancoUnidade.includes(u)) || 
                                 normalizedBancoUnidade === 'vitoria' || 
                                 normalizedBancoUnidade === 'upa';
          const isVagaVitoria = vitoriaUnits.some(u => normalizedVagaUnidade.includes(u));
          
          if (isBancoVitoria && isVagaVitoria) return true;
          
          // 4. Partial match of unit
          return normalizedBancoUnidade.includes(normalizedVagaUnidade) || 
                 normalizedVagaUnidade.includes(normalizedBancoUnidade);
        });

        return found;
      },
      getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
      getMatchingDiagnostic: () => {
        const state = get();
        const pendingVagas = state.vagas.filter(v => !['encerrada', 'finalizada', 'admissao_efetivada'].includes(v.status || v.status_geral || ''));
        
        return pendingVagas.map(v => {
          const matchedBanco = get().getBancoByVaga(v.id);
          if (matchedBanco) return null;
          
          // If no match, collect potential candidates (same unit or similar cargo)
          const potentialBancos = state.bancos.filter(b => {
            const normV = (v.cargo || '').toLowerCase();
            const normB = (b.cargo || '').toLowerCase();
            return b.unidade === v.unidade || normB.includes(normV) || normV.includes(normB);
          }).slice(0, 3);
          
          return {
            vagaId: v.id,
            vagaCargo: v.cargo,
            vagaUnidade: v.unidade,
            potentialBancos: potentialBancos.map(b => ({
              cargo: b.cargo,
              unidade: b.unidade,
              status: b.status
            }))
          };
        }).filter(Boolean);
      },
    }),
    {
      name: 'hospital-recruitment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persistir dados essenciais e bancos de talentos
        vagas: state.vagas.length > 500 ? state.vagas.slice(0, 500) : state.vagas,
        bancos: state.bancos.length > 1000 ? state.bancos.slice(0, 1000) : state.bancos,
        editais: state.editais,
        validacoes: state.validacoes,
        importHistory: state.importHistory.map(h => ({
          ...h,
          relatorio_erros: undefined,
          mapeamento_aplicado: undefined
        })).slice(0, 20),
        importedFiles: state.importedFiles.map(f => ({
          ...f,
          content: undefined
        })).slice(0, 10),
      }),
    }
  )
);