import { Convocacao } from '@/types/vaga';
import { normalizeCargo } from './vagaUtils';

// Base sharing rules based on requirements
export const BASES_CONVOCACAO: Record<string, string[]> = {
  'Goiânia': ['HECAD', 'HUGOL', 'CRER', 'HDS', 'AGIR', 'CONDOMÍNIO'],
  'Vitória': ['VITÓRIA', 'SUÁ', 'SÃO PEDRO'],
  'Jataí': ['POLICLÍNICA JATAÍ', 'JATAÍ'],
  'São Luís': ['SÃO LUÍS'],
  'Formosa': ['POLICLÍNICA FORMOSA', 'FORMOSA'],
  'Goianésia': ['POLICLÍNICA GOIANÉSIA', 'GOIANÉSIA'],
  'Posse': ['POLICLÍNICA POSSE', 'POSSE'],
  'Quirinópolis': ['POLICLÍNICA QUIRINÓPOLIS', 'QUIRINÓPOLIS'],
  'São Luís de Montes Belos': ['POLICLÍNICA SÃO LUÍS', 'SÃO LUÍS DE MONTES BELOS']
};

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
  '09:00',
  '09:30',
  '10:30',
  '11:00',
  '12:30'
];

export function getHorariosDisponiveis(
  data: string, 
  unidade: string, 
  convocacoes: Convocacao[]
): string[] {
  if (!data) return [];
  
  const base = getBaseForUnidade(unidade);
  
  // Filter convocations for the same day and base
  const convocacoesNaBase = convocacoes.filter(c => {
    return c.data_convocacao === data && getBaseForUnidade(c.unidade) === base;
  });
  
  const horariosOcupados = convocacoesNaBase.map(c => c.horario);
  
  return HORARIOS_FIXOS_CONVOCACAO.filter(h => !horariosOcupados.includes(h));
}
