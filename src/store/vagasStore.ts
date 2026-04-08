import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile } from '@/types/vaga';
import { mockVagas, mockBancos, mockConvocacoes, mockEditais, mockValidacoes } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo } from '@/lib/vagaUtils';

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

        // Define regional units for matching - expanded
        const goianiaUnits = [
          'crer', 'hugol', 'hecad', 'hds', 'corporativo', 'policlinica', 
          'cealcon', 'hugo', 'heapa', 'heg', 'hdt', 'goiania', 'agir',
          'hospital central', 'central', 'maternidade', 'hemmnsl', 'hospital estadual',
          'cora', 'hecon', 'heslv', 'hetrin', 'heel', 'heja', 'herp', 'hgg', 'hevana', 'hemo', 'hemonucleo', 'ipasgo',
          'cmmnsl', 'ceal', 'huapa', 'hurre', 'sede', 'go'
        ];
        
        const vitoriaUnits = [
          'sua', 'sao pedro', 'vitoria', 'upa', 'es', 'espirito santo', 'serra', 'cariacica', 'vila velha',
          'asas', 'hospital estadual', 'dr jayme', 'hesvv', 'cre', 'vix'
        ];

        const found = state.bancos.find(b => {
          const normalizedBancoCargo = normalizeCargo(b.cargo);
          const bancoTokens = getCargoTokens(b.cargo);
          
          const hasStringMatch = normalizedBancoCargo === normalizedVagaCargo || 
                                normalizedBancoCargo.includes(normalizedVagaCargo) || 
                                normalizedVagaCargo.includes(normalizedBancoCargo);
          
          const commonTokens = vagaTokens.filter(t => bancoTokens.some(bt => bt.includes(t) || t.includes(bt)));
          const hasTokenMatch = vagaTokens.length > 0 && (
            commonTokens.length >= Math.ceil(vagaTokens.length * 0.4) || // Reduced threshold
            (vagaTokens.length === 1 && commonTokens.length === 1)
          );

          if (!hasStringMatch && !hasTokenMatch) return false;
          
          const normalizedBancoUnidade = normalizeCargo(b.unidade || '');
          
          if (normalizedBancoUnidade === normalizedVagaUnidade) return true;
          
          // Relaxed unit matching
          if (normalizedBancoUnidade.includes('corporativo') || normalizedBancoUnidade.includes('agir')) return true;

          const bancoUnitTokens = normalizedBancoUnidade.split(' ');
          const vagaUnitTokens = normalizedVagaUnidade.split(' ');
          const hasPartialUnitMatch = vagaUnitTokens.some(vt => vt.length > 2 && bancoUnitTokens.includes(vt)) ||
                                     bancoUnitTokens.some(bt => bt.length > 2 && vagaUnitTokens.includes(bt));
          
          if (hasPartialUnitMatch) return true;
          
          const isBancoGoiania = goianiaUnits.some(u => normalizedBancoUnidade.includes(u));
          const isVagaGoiania = goianiaUnits.some(u => normalizedVagaUnidade.includes(u));
          
          if (isBancoGoiania && isVagaGoiania) return true;
          
          const isBancoVitoria = vitoriaUnits.some(u => normalizedBancoUnidade.includes(u));
          const isVagaVitoria = vitoriaUnits.some(u => normalizedVagaUnidade.includes(u));
          
          if (isBancoVitoria && isVagaVitoria) return true;
          
          return false;
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
    }),
    {
      name: 'hospital-recruitment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persistir dados essenciais e bancos de talentos - aumentado limite para evitar perda de dados
        vagas: state.vagas.length > 2000 ? state.vagas.slice(0, 2000) : state.vagas,
        bancos: state.bancos.length > 5000 ? state.bancos.slice(0, 5000) : state.bancos,
        editais: state.editais,
        validacoes: state.validacoes,
        convocacoes: state.convocacoes,
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