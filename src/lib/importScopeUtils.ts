export type BancoImportType = 'geral' | 'por_unidades';
export type BancoImportScope = 'todas' | 'goias_es' | 'demais_unidades';
export type BancoImportMode = 'substituir' | 'adicionar';

export interface ImportExecutionOptions {
  bancoTipo?: BancoImportType;
  bancoEscopo?: BancoImportScope;
  bancoModo?: BancoImportMode;
}

type MinimalMapping = {
  excel: string;
  system: string;
};

const LEGACY_SYSTEM_KEY_MAP: Record<string, string> = {
  abertura: 'data_abertura',
  recebimento: 'data_recebimento',
  requisicao: 'numero_processo_seletivo',
  numero_requisicao: 'numero_processo_seletivo',
  processo_seletivo: 'numero_processo_seletivo',
};

const GOIAS_UNITS = [
  'CRER',
  'AGIR',
  'HUGOL',
  'HECAD',
  'HDS',
  'POLICLÍNICA',
  'JATAÍ',
  'TEIA APARECIDA',
  'TEIA GOIÂNIA',
  'TEIA CANEDO',
];

const ESPIRITO_SANTO_TOKENS = ['SÃO PEDRO', 'SAO PEDRO', 'SUÁ', 'SUA'];

function normalizeText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function normalizeSystemKey(value: string) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const GOIAS_UNITS_NORMALIZED = new Set(GOIAS_UNITS.map(normalizeText));

export function normalizeImportSystemKey(systemKey: string) {
  const normalizedKey = normalizeSystemKey(systemKey);
  return LEGACY_SYSTEM_KEY_MAP[normalizedKey] || normalizedKey;
}

export function normalizeImportedUnit(unidade: string) {
  return normalizeText(unidade);
}

export function classifyBancoScopeByUnit(unidade: string): 'goias_es' | 'demais_unidades' {
  const normalizedUnit = normalizeImportedUnit(unidade);

  if (!normalizedUnit) return 'demais_unidades';
  if (GOIAS_UNITS_NORMALIZED.has(normalizedUnit)) return 'goias_es';
  if (ESPIRITO_SANTO_TOKENS.some(token => normalizedUnit.includes(normalizeText(token)))) return 'goias_es';

  return 'demais_unidades';
}

export function getBancoScopeLabel(scope?: BancoImportScope) {
  if (scope === 'todas') return 'Todas as regiões';
  if (scope === 'goias_es') return 'Goiás e Espírito Santo';
  if (scope === 'demais_unidades') return 'Demais unidades';
  return 'Não informado';
}

export function buildBancoImportObservation(options?: ImportExecutionOptions) {
  if (!options) return '';

  const details: string[] = [];
  const tipo = options.bancoTipo || 'por_unidades';
  const modo = options.bancoModo || 'substituir';

  if (tipo === 'geral') {
    details.push(`Banco geral - ${getBancoScopeLabel(options.bancoEscopo)}`);
  } else {
    details.push('Banco por unidades da planilha');
  }

  details.push(modo === 'substituir' ? 'Modo: substituição' : 'Modo: adição');

  return details.join(' | ');
}

export function extractNormalizedUnitsFromRows(rows: any[][], headers: string[], mappings: MinimalMapping[]) {
  const unitMapping = mappings.find(mapping => normalizeImportSystemKey(mapping.system) === 'unidade');
  if (!unitMapping) return new Set<string>();

  const unitColumnIndex = headers.indexOf(String(unitMapping.excel || '').toUpperCase());
  if (unitColumnIndex === -1) return new Set<string>();

  const units = new Set<string>();

  rows.forEach(row => {
    const unitValue = normalizeImportedUnit(String(row?.[unitColumnIndex] || ''));
    if (unitValue) units.add(unitValue);
  });

  return units;
}

export function shouldReplaceBancoRecord(
  unidade: string,
  options: ImportExecutionOptions,
  unitsFromSheet: Set<string>
) {
  const modo = options.bancoModo || 'substituir';
  if (modo !== 'substituir') return false;

  const tipo = options.bancoTipo || 'por_unidades';
  const normalizedUnit = normalizeImportedUnit(unidade);

  if (!normalizedUnit) return false;

  if (tipo === 'geral') {
    if (!options.bancoEscopo) return false;
    if (options.bancoEscopo === 'todas') return true;
    return classifyBancoScopeByUnit(normalizedUnit) === options.bancoEscopo;
  }

  return unitsFromSheet.has(normalizedUnit);
}