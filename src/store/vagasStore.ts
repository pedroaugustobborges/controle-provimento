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
        const vaga = get().vagas.find(v => v.id === vagaId);
        if (!vaga) return undefined;
        
        // Try by ID first
        if (vaga.banco_id) {
          const banco = get().bancos.find(b => b.id === vaga.banco_id);
          if (banco) return banco;
        }
        
        // Fallback: match by cargo and unit
        return get().bancos.find(b => 
          b.cargo.toLowerCase() === vaga.cargo.toLowerCase() && 
          b.unidade === vaga.unidade &&
          b.status !== 'vencido'
        );
      },
      getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
    }),
    {
      name: 'hospital-recruitment-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
