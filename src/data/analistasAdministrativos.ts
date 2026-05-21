import { normalizeUnitName, UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';

/**
 * Mapeamento de "Analista Administrativo responsável pela validação do edital"
 * por região. Usado para sugerir automaticamente quem será o validador
 * no momento em que o analista do edital envia a vaga para validação.
 *
 * Override manual continua possível pelo Select no diálogo de envio.
 */
export type AnalistaAdmSugestao = {
  nome: string;
  /** id do profile no banco (preencher quando o usuário existir) */
  id?: string;
};

export const ANALISTA_ADM_POR_REGIAO: Record<string, AnalistaAdmSugestao> = {
  // Goiás + Espírito Santo → Isaac
  'Goiás e Espírito Santo': { nome: 'Isaac' },
  // Demais regiões: configurar conforme necessário
  'Amazonas': { nome: '' },
  'Demais Unidades': { nome: '' },
};

/**
 * Dada uma unidade, retorna a sugestão de analista administrativo
 * responsável pela validação do edital.
 */
export function sugerirResponsavelValidacao(unidade: string | undefined | null): AnalistaAdmSugestao | null {
  if (!unidade) return null;
  const u = normalizeUnitName(unidade);
  for (const [regiao, units] of Object.entries(UNIDADES_POR_REGIAO)) {
    const norm = units.map(x => normalizeUnitName(x));
    if (norm.includes(u)) {
      return ANALISTA_ADM_POR_REGIAO[regiao] || null;
    }
  }
  return null;
}
