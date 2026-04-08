import { StatusVaga, StatusValidacao, EtapaEdital, StatusPublicacao } from '@/types/vaga';

export const VITORIA_SUB_UNIDADES = [
  'sao pedro', 'suá', 'sua', 'bento ferreira', 'jardim da penha', 
  'maruípe', 'maruipe', 'vitoria', 'vitória', 'vix', 'espirito santo', 
  'es', 'serra', 'cariacica', 'vila velha', 'viana'
];

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isVitoriaUnit(unidade: string): boolean {
  if (!unidade) return false;
  const normalized = removeAccents(unidade.toLowerCase().trim());
  const words = normalized.split(/[\s,.-]+/);
  
  // Se for Vitória, já é Vitória
  if (words.some(w => w === 'vitoria' || w === 'vix')) return true;
  
  // Tokens que representam a Grande Vitória
  const vitoriaTokens = VITORIA_SUB_UNIDADES.map(sub => removeAccents(sub.toLowerCase()));
  
  return vitoriaTokens.some(token => {
    if (token.length <= 3) {
      // Para tokens curtos (como 'es', 'sua'), exige correspondência de palavra inteira
      return words.includes(token);
    }
    // Para nomes maiores (como 'jardim da penha'), pode ser sub-string
    return normalized.includes(token);
  });
}


export const CATEGORIAS_STATUS = {
  em_andamento: [
    'em_edital', 'publicado_edital', 'em_triagem', 'entrevista', 
    'documentacao', 'documentacao_ok', 'documentacao_pendente', 
    'casos_ok', 'admissao', 'admissao_enviada', 'realizar_convocacao',
    'aberta', 'em_andamento', 'nova_vaga'
  ],
  aguardando_unidade: ['aguardando_unidade', 'aguardando_processo', 'aguardando_edital', 'aguardando_processo_e_edital'],
  encerradas: ['admissao_efetivada', 'finalizada', 'encerrada', 'concluida'],
  lideranca: ['vaga_lideranca'],
  movimentacao_interna: ['movimentacao_interna'],
  sem_status: ['sem_status', '', null, undefined, 'nan'],
  outros: ['suspensa', 'cancelada']
};

export function getCategoriaStatus(status: string): keyof typeof CATEGORIAS_STATUS {
  if (!status || status === '' || status === 'sem_status' || status === 'nan' || status === 'null' || status === 'undefined') return 'sem_status';
  
  const s = status.toLowerCase();
  if (CATEGORIAS_STATUS.em_andamento.includes(s)) return 'em_andamento';
  if (CATEGORIAS_STATUS.aguardando_unidade.includes(s)) return 'aguardando_unidade';
  if (CATEGORIAS_STATUS.encerradas.includes(s)) return 'encerradas';
  if (CATEGORIAS_STATUS.lideranca.includes(s)) return 'lideranca';
  if (CATEGORIAS_STATUS.movimentacao_interna.includes(s)) return 'movimentacao_interna';
  if (CATEGORIAS_STATUS.outros.includes(s)) return 'outros';
  
  return 'outros';
}


export function getStatusColor(status: StatusVaga): string {
  const map: Record<StatusVaga, string> = {
    movimentacao_interna: 'bg-blue-100 text-blue-800',
    vaga_lideranca: 'bg-indigo-100 text-indigo-800',
    publicado_edital: 'bg-green-100 text-green-800',
    em_edital: 'bg-amber-100 text-amber-800',
    documentacao: 'bg-orange-100 text-orange-800',
    documentacao_ok: 'bg-emerald-100 text-emerald-800',
    documentacao_pendente: 'bg-rose-100 text-rose-800',
    casos_ok: 'bg-teal-100 text-teal-800',
    admissao: 'bg-sky-100 text-sky-800',
    admissao_enviada: 'bg-cyan-100 text-cyan-800',
    admissao_efetivada: 'bg-green-100 text-green-800',
    suspensa: 'bg-slate-100 text-slate-800',
    cancelada: 'bg-red-100 text-red-800',
    aguardando_unidade: 'bg-yellow-100 text-yellow-800',
    realizar_convocacao: 'bg-violet-100 text-violet-800',
    aberta: 'bg-blue-100 text-blue-800',
    em_triagem: 'bg-purple-100 text-purple-800',
    entrevista: 'bg-indigo-100 text-indigo-800',
    finalizada: 'bg-green-100 text-green-800',
    encerrada: 'bg-gray-100 text-gray-600',
    sem_status: 'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

export function getValidacaoColor(status: StatusValidacao): string {
  const map: Record<StatusValidacao, string> = {
    pendente: 'bg-amber-100 text-amber-800',
    aprovado: 'bg-green-100 text-green-800',
    reprovado: 'bg-red-100 text-red-800',
  };
  return map[status];
}

export function getEtapaColor(etapa: EtapaEdital): string {
  const map: Record<EtapaEdital, string> = {
    inscricoes: 'bg-blue-100 text-blue-800',
    triagem: 'bg-purple-100 text-purple-800',
    prova: 'bg-indigo-100 text-indigo-800',
    entrevista: 'bg-amber-100 text-amber-800',
    resultado: 'bg-green-100 text-green-800',
    encerrado: 'bg-gray-100 text-gray-600',
  };
  return map[etapa];
}

export function getPublicacaoColor(status: StatusPublicacao): string {
  const map: Record<StatusPublicacao, string> = {
    pendente: 'bg-amber-100 text-amber-800',
    publicado: 'bg-green-100 text-green-800',
    encerrado: 'bg-gray-100 text-gray-600',
  };
  return map[status];
}

export function calcDiasAberto(dataAbertura: string, dataEncerramento?: string): number {
  if (!dataAbertura) return 0;
  const start = new Date(dataAbertura);
  const end = (dataEncerramento && dataEncerramento !== '') ? new Date(dataEncerramento) : new Date();
  
  if (isNaN(start.getTime())) return 0;
  
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function formatDate(date: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function normalizeCargo(cargo: string): string {
  if (!cargo) return '';
  return cargo
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[-–—/\\._,]/g, " ") // replace more separators with space
    .replace(/[^a-z0-9 ]/g, " ") // remove other special chars
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

export function normalizeStatus(statusText: string): StatusVaga {
  if (!statusText || statusText === '' || statusText === 'null' || statusText === 'undefined' || statusText === 'nan') return '' as StatusVaga;
  
  const text = statusText.toLowerCase().trim();
  
  if (text.includes('publicado') && text.includes('edital')) return 'publicado_edital';
  if (text.includes('em edital')) return 'em_edital';
  if (text.includes('triagem')) return 'em_triagem';
  if (text.includes('entrev')) return 'entrevista';
  if (text.includes('document') && text.includes('ok')) return 'documentacao_ok';
  if (text.includes('document') && text.includes('pendente')) return 'documentacao_pendente';
  if (text.includes('document')) return 'documentacao';
  if (text.includes('casos ok')) return 'casos_ok';
  if (text.includes('admissao enviada')) return 'admissao_enviada';
  if (text.includes('admissao efetivada')) return 'admissao_efetivada';
  if (text.includes('admissao')) return 'admissao';
  if (text.includes('convoc')) return 'realizar_convocacao';
  if (text.includes('unidade') || text.includes('aguardando')) return 'aguardando_unidade';
  if (text.includes('lideranca')) return 'vaga_lideranca';
  if (text.includes('movimentacao') || text.includes('interna')) return 'movimentacao_interna';
  if (text.includes('susp')) return 'suspensa';
  if (text.includes('cancel')) return 'cancelada';
  if (text.includes('finaliz') || text.includes('concluid') || text.includes('encerrad')) return 'encerrada';
  if (text.includes('aberta') || text.includes('novo') || text.includes('nova')) return 'aberta';
  
  // Se não bater com nada conhecido, retorna o próprio texto se ele for um status válido, ou vazio
  return text as StatusVaga;
}

export function normalizeUnitName(name: string): string {
  if (!name) return '';
  const upper = name.toUpperCase().trim();
  
  // Mapping for common variants and typos to ensure parity with Excel logic
  if (upper === 'HECAD' || upper === 'HOSPITAL HECAD' || upper === 'HOSPITAL ESTADUAL HECAD') return 'HECAD';
  if (upper === 'HUGOL' || upper === 'HOSPITAL HUGOL' || upper === 'HOSPITAL ESTADUAL HUGOL') return 'HUGOL';
  if (upper === 'CRER' || upper === 'HOSPITAL CRER' || upper === 'HOSPITAL ESTADUAL CRER') return 'CRER';
  if (upper === 'HDS' || upper === 'HOSPITAL HDS' || upper === 'HOSPITAL ESTADUAL HDS') return 'HDS';
  if (upper.includes('CEALCON')) return 'CEALCON';
  if (upper.includes('CORA')) return 'CORA';
  if (upper.includes('POLICLINICA') || upper.includes('POLICLÍNICA') || upper.includes('POLI')) return 'POLICLÍNICA';
  if (upper.includes('TEIA') && upper.includes('GOI')) return 'TEIA GOIÂNIA';
  if (upper.includes('TEIA') && upper.includes('APARECIDA')) return 'TEIA APARECIDA';
  if (upper.includes('TEIA') && upper.includes('CANEDO')) return 'TEIA CANEDO';
  if (upper.includes('JATAI') || upper.includes('JATAÍ')) return 'JATAÍ';
  if (upper.includes('HRCAC')) return 'HRCAC'; // Handles HRCAC1, HRCAC2 etc
  
  if (isVitoriaUnit(name)) return 'VITÓRIA';
  
  // Standard cleanup for other units
  return upper
    .replace(/^(HOSPITAL|UNIDADE|HOSP|ESTADUAL)\s+/gi, '')
    .replace(/^DE\s+/gi, '')
    .replace(/\s*\(.*\)/g, '')
    .trim();
}

export function parseSpreadsheetDate(value: any): Date | null {
  if (!value) return null;
  
  // If it's already a Date
  if (value instanceof Date) return value;
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel base date is 1899-12-30
    return new Date((value - 25569) * 86400 * 1000);
  }
  
  if (typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Try dd/mm/yyyy
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Try ISO or other formats
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  
  return null;
}

export function getMonthNamePtBrUpper(dateValue?: string | null | Date | number): string {
  if (!dateValue) return "";

  const date = parseSpreadsheetDate(dateValue);
  if (!date || isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", { month: "long" })
    .format(date)
    .toUpperCase();
}

export function countVacancies({
  records,
  selectedUnit,
  selectedMonth,
}: {
  records: any[];
  selectedUnit: string;
  selectedMonth?: string;
}) {
  const normalize = (val?: string | null) => String(val ?? "").trim().toUpperCase();
  const hasValue = (val?: any) => String(val ?? "").trim() !== "";

  const normalizedUnit = normalize(selectedUnit);
  const normalizedMonth = normalize(selectedMonth);

  return records.filter((row) => {
    const rowUnit = normalize(row.unidade);
    const sameUnit = normalizedUnit === "TODOS" || normalizedUnit === "" || rowUnit === normalizedUnit;
    const hasCargoValue = hasValue(row.cargo);

    if (!sameUnit || !hasCargoValue) {
      return false;
    }

    if (normalizedMonth === "" || normalizedMonth === "TODOS") {
      return true;
    }

    const aberturaMonth = getMonthNamePtBrUpper(row.data_abertura);
    return aberturaMonth === normalizedMonth;
  }).length;
}

export function getStatusSummary(records: any[], selectedUnit: string, selectedMonth?: string) {
  const normalize = (val?: string | null) => String(val ?? "").trim().toUpperCase();
  const hasValue = (val?: any) => String(val ?? "").trim() !== "";

  const normalizedUnit = normalize(selectedUnit);
  const normalizedMonth = normalize(selectedMonth);

  // 1. Get valid vacancy base (same logic as countVacancies but returning the rows)
  const validVacancies = records.filter((row) => {
    const rowUnit = normalize(row.unidade);
    const sameUnit = normalizedUnit === "TODOS" || normalizedUnit === "" || rowUnit === normalizedUnit;
    const hasCargoValue = hasValue(row.cargo);

    if (!sameUnit || !hasCargoValue) {
      return false;
    }

    if (normalizedMonth === "" || normalizedMonth === "TODOS") {
      return true;
    }

    const aberturaMonth = getMonthNamePtBrUpper(row.data_abertura);
    return aberturaMonth === normalizedMonth;
  });

  // 2. Group by status
  const summary: Record<string, number> = {};
  validVacancies.forEach(row => {
    const status = (row.status || row.status_geral || 'SEM_STATUS').toUpperCase().trim();
    summary[status] = (summary[status] || 0) + 1;
  });

  return {
    total: validVacancies.length,
    byStatus: summary
  };
}
