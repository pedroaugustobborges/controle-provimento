import { create } from 'zustand';
import { Vaga, Edital, ValidacaoEdital } from '@/types/vaga';
import { mockVagas, mockEditais, mockValidacoes } from '@/data/mockData';

interface VagasState {
  vagas: Vaga[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  setVagas: (vagas: Vaga[]) => void;
  addVagas: (vagas: Vaga[]) => void;
  updateVaga: (id: string, data: Partial<Vaga>) => void;
  updateEdital: (id: string, data: Partial<Edital>) => void;
  updateValidacao: (id: string, data: Partial<ValidacaoEdital>) => void;
  addEdital: (edital: Edital) => void;
  addValidacao: (validacao: ValidacaoEdital) => void;
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
}

export const useVagasStore = create<VagasState>((set, get) => ({
  vagas: mockVagas,
  editais: mockEditais,
  validacoes: mockValidacoes,
  setVagas: (vagas) => set({ vagas }),
  addVagas: (newVagas) => set((s) => ({ vagas: [...s.vagas, ...newVagas] })),
  updateVaga: (id, data) => set((s) => ({
    vagas: s.vagas.map((v) => v.id === id ? { ...v, ...data } : v),
  })),
  updateEdital: (id, data) => set((s) => ({
    editais: s.editais.map((e) => e.id === id ? { ...e, ...data } : e),
  })),
  updateValidacao: (id, data) => set((s) => ({
    validacoes: s.validacoes.map((v) => v.id === id ? { ...v, ...data } : v),
  })),
  addEdital: (edital) => set((s) => ({ editais: [...s.editais, edital] })),
  addValidacao: (validacao) => set((s) => ({ validacoes: [...s.validacoes, validacao] })),
  getVaga: (id) => get().vagas.find((v) => v.id === id),
  getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
  getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
}));
