import { Convocacao } from '@/types/vaga';
import { normalizeCargo } from './vagaUtils';

// Base sharing rules based on requirements
export const BASES_CONVOCACAO: Record<string, string[]> = {
  'Goiânia': ['HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS', 'TEIA ANÁPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'],
  'Goiás': ['POLICLÍNICA', 'JATAÍ'],
  'Vitória': ['VITÓRIA', 'SÃO PEDRO', 'SUÁ'],
  'Fora': ['DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3']
};

// Grouping for daily convocações view split
export const UNIDADES_GOIANIA = [
  'HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS',
  'TEIA ANÁPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'
];

export const UNIDADES_OUTRAS = [
  'POLICLÍNICA', 'JATAÍ',
  'VITÓRIA', 'SÃO PEDRO', 'SUÁ',
  'DOURADOS', 'CHS', 'HMSA', 'HRCAC',
  'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3'
];

export const UNIDADES_VITORIA = ['SÃO PEDRO', 'SUÁ', 'UPA'];

export const UNIDADES_OUTRAS_AGRUPADAS = [
  'POLICLÍNICA', 'JATAÍ',
  'VITÓRIA', 'SÃO PEDRO', 'SUÁ', 'UPA',
  'DOURADOS', 'CHS', 'HMSA', 'HRCAC',
  'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3'
];

export function getRegiaoForUnidade(unidade: string): 'goiania' | 'outras' | null {
  const normUnidade = unidade?.toUpperCase().trim() || '';
  if (UNIDADES_GOIANIA.some(u => normUnidade.includes(u.toUpperCase()) || u.toUpperCase().includes(normUnidade))) {
    return 'goiania';
  }
  if (UNIDADES_OUTRAS.some(u => normUnidade.includes(u.toUpperCase()) || u.toUpperCase().includes(normUnidade))) {
    return 'outras';
  }
  return null;
}

export function getBaseForUnidade(unidade: string): string {
  const normUnidade = normalizeCargo(unidade);
  
  for (const [base, unidades] of Object.entries(BASES_CONVOCACAO)) {
    if (unidades.some(u => normalizeCargo(u) === normUnidade || normUnidade.includes(normalizeCargo(u)))) {
      return base;
    }
  }
  
  return unidade; // Fallback to unit itself if no base found
}

// Fixed slots as per requirement
export const HORARIOS_FIXOS_CONVOCACAO = [
  '08:30',
  '09:30',
  '10:30',
  '11:30',
  '14:30'
];

export function getHorariosDisponiveis(
  data: string, 
  unidade: string, 
  convocacoes: Convocacao[]
): string[] {
  if (!data) return [];
  
  const base = getBaseForUnidade(unidade);
  
  // Regra especial para Goiânia: limite de 5 por horário somando todas as unidades da base
  if (base === 'Goiânia') {
    const convocacoesNaBase = convocacoes.filter(c => {
      return c.data_convocacao === data && getBaseForUnidade(c.unidade) === 'Goiânia';
    });
    
    // Contar quantas convocações existem para cada horário fixo
    const contagemPorHorario: Record<string, number> = {};
    convocacoesNaBase.forEach(c => {
      contagemPorHorario[c.horario] = (contagemPorHorario[c.horario] || 0) + 1;
    });
    
    // Retorna apenas horários com menos de 5 agendamentos
    return HORARIOS_FIXOS_CONVOCACAO.filter(h => (contagemPorHorario[h] || 0) < 5);
  }
  
  // Para outras bases, o comportamento padrão era filtrar horários já ocupados na mesma unidade
  // Mas o requisito agora é que outras bases usem horário livre (campo de texto)
  // Retornamos a lista vazia para indicar que não há grade fixa no componente
  return [];
}
