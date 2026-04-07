import { create } from 'zustand';
import { Vaga, Edital, ValidacaoEdital, ImportHistory } from '@/types/vaga';
import { mockVagas, mockBancos, mockConvocacoes, mockEditais, mockValidacoes } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';

interface VagasState {
  vagas: Vaga[];
  bancos: BancoTalentos[];
  convocacoes: Convocacao[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  importHistory: ImportHistory[];
  setVagas: (vagas: Vaga[]) => void;
  addVagas: (vagas: Vaga[]) => void;
  updateVaga: (id: string, data: Partial<Vaga>) => void;
  deleteVaga: (id: string) => void;
  updateEdital: (id: string, data: Partial<Edital>) => void;
  updateValidacao: (id: string, data: Partial<ValidacaoEdital>) => void;
  addEdital: (edital: Edital) => void;
  addValidacao: (validacao: ValidacaoEdital) => void;
  addImportHistory: (history: ImportHistory) => void;
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
  getBancoByVaga: (vagaId: string) => BancoTalentos | undefined;
  getConvocacoesByVaga: (vagaId: string) => Convocacao[];
}


export const useVagasStore = create<VagasState>((set, get) => ({
  vagas: mockVagas,
  bancos: mockBancos,
  convocacoes: mockConvocacoes,
  editais: mockEditais,
  validacoes: mockValidacoes,
  importHistory: [],
  setVagas: (vagas) => set({ vagas }),
  addVagas: (newVagas) => set((s) => ({ vagas: [...s.vagas, ...newVagas] })),
  updateVaga: (id, data) => set((s) => ({
    vagas: s.vagas.map((v) => v.id === id ? { ...v, ...data } : v),
  })),
  deleteVaga: (id) => set((s) => ({
    vagas: s.vagas.filter((v) => v.id !== id),
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
  getVaga: (id) => get().vagas.find((v) => v.id === id),
  getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
  getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
  getBancoByVaga: (vagaId) => {
    const vaga = get().vagas.find(v => v.id === vagaId);
    if (!vaga?.banco_id) return undefined;
    return get().bancos.find(b => b.id === vaga.banco_id);
  },
  getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
}));

