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
  
  // Directly compare against the known Vitória sub-units
  const vitoriaTokens = VITORIA_SUB_UNIDADES.map(sub => removeAccents(sub.toLowerCase()));
  
  // Check for exact matches in the normalized string or as whole words
  return vitoriaTokens.some(token => {
    const regex = new RegExp(`\\b${token}\\b`, 'i');
    return regex.test(normalized) || normalized === token;
  });
}


export const CATEGORIAS_STATUS = {
  fila_edital: ['publicar_novo_edital', 'publicar_edital', 'publicar edital', 'publicar novo edital'],
  em_andamento: [
    'em_edital', 'em edital', 
    'em_processo_seletivo', 'em processo seletivo',
    'admissao_enviada', 'admissao enviada',
    'em_admissao', 'em admissao',
    'em_triagem', 'em triagem',
    'entrevista',
    'EM ANDAMENTO'
  ],
  concluidas: ['admissao_efetivada', 'admissao efetivada', 'finalizada', 'encerrada', 'CONCLUÍDAS'],
  vagas_interrompidas: ['cancelada', 'pausada', 'suspensa', 'CANCELADAS', 'SUSPENSA', 'PAUSADA', 'vaga_suspensa', 'vaga_pausada', 'cancelado'],
  vagas_lideranca: ['vaga_lideranca', 'vaga de lideranca', 'ESTRATÉGICAS'],
  convocacao: ['realizar_convocacao', 'realizar convocacao', 'CONVOCAÇÕES'],
  documentacao: [
    'documentacao', 'documentacao ok e aso pendente', 'aso pendente', 
    'documentacao ok', 'documentacao pendente', 'documentação', 
    'documentação ok e aso pendente', 'aso pendente', 'documentação ok', 
    'documentação pendente', 'DOCUMENTAÇÃO'
  ],
  aguardando_unidade: ['aguardar_unidade', 'aguardar_anuencia', 'AGUARDANDO UNIDADE', 'aguardando', 'aguardando unidade']
};

export function isConvocacaoByFields(row: any): boolean {
  if (!row) return false;
  return !!(
    (row.data_convocacao_planilha && String(row.data_convocacao_planilha).trim() !== '') ||
    (row.horario_convocacao_planilha && String(row.horario_convocacao_planilha).trim() !== '') ||
    (row.candidato_convocado_planilha && String(row.candidato_convocado_planilha).trim() !== '') ||
    (row.classificacao_convocacao_planilha && String(row.classificacao_convocacao_planilha).trim() !== '') ||
    (row.forma_convocacao_planilha && String(row.forma_convocacao_planilha).trim() !== '') ||
    (row.status_oitiva_convocacao_planilha && String(row.status_oitiva_convocacao_planilha).trim() !== '')
  );
}

export function getCategoriaStatus(row: any): keyof typeof CATEGORIAS_STATUS {
  if (!row) return 'em_andamento';
  
  const status = typeof row === 'string' ? row : (row.status || row.status_geral);
  
  if (!status || status === '' || status === 'nan' || status === 'null' || status === 'undefined' || String(status).trim() === '') {
    if (typeof row !== 'string' && isConvocacaoByFields(row)) return 'convocacao';
    return 'em_andamento';
  }
  
  const s = String(status).trim();
  const sLow = s.toLowerCase();
  
  const findCategory = (statusVal: string): keyof typeof CATEGORIAS_STATUS | null => {
    if (CATEGORIAS_STATUS.fila_edital.includes(statusVal)) return 'fila_edital';
    if (CATEGORIAS_STATUS.concluidas.includes(statusVal)) return 'concluidas';
    if (CATEGORIAS_STATUS.vagas_interrompidas.includes(statusVal)) return 'vagas_interrompidas';
    if (CATEGORIAS_STATUS.vagas_lideranca.includes(statusVal)) return 'vagas_lideranca';
    if (CATEGORIAS_STATUS.convocacao.includes(statusVal)) return 'convocacao';
    if (CATEGORIAS_STATUS.documentacao.includes(statusVal)) return 'documentacao';
    if (CATEGORIAS_STATUS.aguardando_unidade.includes(statusVal)) return 'aguardando_unidade';
    if (CATEGORIAS_STATUS.em_andamento.includes(statusVal)) return 'em_andamento';
    return null;
  };

  const cat = findCategory(s) || findCategory(sLow);
  
  if (cat !== 'convocacao' && typeof row !== 'string' && isConvocacaoByFields(row)) {
    return 'convocacao';
  }

  return cat || 'em_andamento';
}



export function getStatusColor(status: string): string {
  if (!status) return 'bg-gray-100 text-gray-600';
  
  const s = String(status).trim().toLowerCase();
  
  // Categorized colors
  if (CATEGORIAS_STATUS.concluidas.includes(s)) return 'bg-green-100 text-green-700 border-green-200';
  if (CATEGORIAS_STATUS.fila_edital.includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (CATEGORIAS_STATUS.vagas_interrompidas.includes(s) || s.includes('cancelada') || s.includes('cancelado')) return 'bg-red-100 text-red-700 border-red-200';
  if (CATEGORIAS_STATUS.vagas_lideranca.includes(s)) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (CATEGORIAS_STATUS.convocacao.includes(s)) return 'bg-violet-100 text-violet-700 border-violet-200';
  if (CATEGORIAS_STATUS.documentacao.includes(s) || s.includes('documentacao') || s.includes('documentação')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (CATEGORIAS_STATUS.aguardando_unidade.includes(s)) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  
  // Default color for Em Andamento and others
  return 'bg-blue-100 text-blue-700 border-blue-200';
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
    resultado_da_triagem: 'bg-purple-50 text-purple-700',
    avaliacao_curricular: 'bg-indigo-50 text-indigo-700',
    avaliacao_especifica_online: 'bg-cyan-100 text-cyan-800',
    resultado_da_avaliacao_especifica_online: 'bg-cyan-50 text-cyan-700',
    entrevistas: 'bg-amber-100 text-amber-800',
    resultado_final: 'bg-green-100 text-green-800',
    convocacao_do_edital: 'bg-emerald-100 text-emerald-800',
    encerramento: 'bg-gray-100 text-gray-600',
    banco_gerado: 'bg-teal-100 text-teal-800',
    sem_exito: 'bg-red-100 text-red-800',
    aguardar_anuencia: 'bg-yellow-100 text-yellow-800',
    publicar_novo_edital: 'bg-rose-100 text-rose-800',
  };
  return map[etapa] || 'bg-gray-100 text-gray-600';
}


export function getPublicacaoColor(status: StatusPublicacao): string {
  const map: Record<StatusPublicacao, string> = {
    pendente: 'bg-amber-100 text-amber-800',
    publicado: 'bg-green-100 text-green-800',
    encerrado: 'bg-gray-100 text-gray-600',
  };
  return map[status];
}

export function calcDiasAberto(dataRecebimento: string, dataConclusao?: string): number {
  if (!dataRecebimento) return 0;
  const start = new Date(dataRecebimento);
  const end = (dataConclusao && dataConclusao !== '') ? new Date(dataConclusao) : new Date();
  
  if (isNaN(start.getTime())) return 0;
  
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function calcDiasUteis(dataRecebimento: string, dataConclusao?: string): number {
  if (!dataRecebimento) return 0;
  const start = new Date(dataRecebimento);
  const end = (dataConclusao && dataConclusao !== '') ? new Date(dataConclusao) : new Date();
  
  if (isNaN(start.getTime())) return 0;
  
  let count = 0;
  const curDate = new Date(start.getTime());
  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}


export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '' || dateStr === '—') return '—';
  
  // Try to parse ISO date first
  // Se a string estiver no formato YYYY-MM-DD, parse manualmente para evitar deslocamento de fuso horário
  let date: Date;
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }
  if (isNaN(date.getTime())) {
    // If it's not a valid date, just return the string or a placeholder
    // This prevents "Invalid Date" from appearing in the UI
    return dateStr.length > 20 ? dateStr.substring(0, 20) + '...' : dateStr;
  }
  
  return date.toLocaleDateString('pt-BR');
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
  if (!statusText || statusText === '' || statusText === 'null' || statusText === 'undefined' || statusText === 'nan' || statusText === '0') {
    return 'SEM STATUS' as StatusVaga;
  }
  
  // Normalização rigorosa conforme item 3: ignorar acentos, caixa alta/baixa e espaços duplicados
  const text = removeAccents(statusText.toLowerCase().trim().replace(/\s+/g, ' '));
  
  // Mapeamento EXATO conforme item 4:
  if (text === 'admissao efetivada') return 'CONCLUÍDAS' as StatusVaga;
  
  if (text === 'admissao enviada' || 
      text === 'em edital' || 
      text === 'em processo seletivo') {
    return 'EM ANDAMENTO' as StatusVaga;
  }
  
  if (text === 'movimentacao interna') return 'MOV. INTERNA' as StatusVaga;
  
  if (text === 'vaga de lideranca') return 'ESTRATÉGICAS' as StatusVaga;
  
  if (text === 'documentacao' || 
      text === 'documentacao ok e aso pendente' || 
      text === 'aso pendente') {
    return 'DOCUMENTAÇÃO' as StatusVaga;
  }
  
  if (text === 'realizar convocacao') return 'CONVOCAÇÕES' as StatusVaga;
  
  if (text === 'publicar novo edital' || 
      text === 'publicar edital') {
    return 'FILA DE EDITAIS' as StatusVaga;
  }
  
  if (text === 'vaga suspensa' || text === 'suspensa') return 'SUSPENSA' as StatusVaga;
  
  if (text === 'vaga pausada' || text === 'pausada') return 'PAUSADA' as StatusVaga;
  
  if (text === 'aguardando unidade' || text === 'aguardando') return 'AGUARDANDO UNIDADE' as StatusVaga;
  
  if (text === 'cancelada' || text === 'cancelado') return 'CANCELADAS' as StatusVaga;
  
  // Fallback para manter compatibilidade com status parciais se necessário, 
  // mas priorizando o mapeamento exato acima.
  if (text.includes('finaliz') || text.includes('concluid') || text.includes('encerrad')) return 'CONCLUÍDAS' as StatusVaga;
  
  return 'SEM STATUS' as StatusVaga;
}



export function normalizeUnitName(name: string): string {
  if (!name) return '';
  
  // New conservative normalization for Excel parity
  // Focus on exact match after trimming and uppercasing
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' '); // collapse multiple spaces
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

/**
  * Canonical filter to ensure parity between metrics, dashboards and tables.
  * Implements the spreadsheet rule: 
  * - Must have cargo (Column E in the new Excel layout)
  * - Unit filter
  * - Month filter on data_abertura
  */
export function getValidVacancyBase(
  records: any[],
  selectedUnit?: string,
  selectedMonth?: string
): any[] {
  const normUnit = selectedUnit && selectedUnit !== 'all' && selectedUnit !== 'TODOS' 
    ? normalizeUnitName(selectedUnit) 
    : 'TODOS';
    
  const normMonth = selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'TODOS' 
    ? selectedMonth.toUpperCase().trim() 
    : 'TODOS';

  return records.filter((row) => {
    // 1. Mandatory Cargo
    const hasCargo = String(row.cargo ?? "").trim() !== "";
    if (!hasCargo) return false;

    // 2. Unit Filter (Sheet name or unidade field)
    const rowUnit = normalizeUnitName(row.unidade);
    const passesUnit = normUnit === 'TODOS' || rowUnit === normUnit;
    if (!passesUnit) return false;

    // 3. Month Filter (Column B)
    if (normMonth === 'TODOS') return true;
    
    const aberturaMonth = getMonthNamePtBrUpper(row.data_abertura);
    return aberturaMonth === normMonth;
  });
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
  return getValidVacancyBase(records, selectedUnit, selectedMonth).length;
}

export type VacancyEligibilityResult = {
  id: string;
  source_row_index?: number;
  unidade: string;
  cargo: string;
  data_abertura: string;
  status: string;
  includedByExcelParity: boolean;
  includedByApp: boolean;
  hasCargo: boolean;
  unitMatches: boolean;
  monthMatches: boolean;
  parsedMonth: string;
  rejectionReason?: string;
};

export function checkVacancyParity(
  row: any,
  selectedUnit: string,
  selectedMonth: string
): VacancyEligibilityResult {
  const normSelectedUnit = selectedUnit === 'all' || selectedUnit === 'TODOS' ? 'TODOS' : normalizeUnitName(selectedUnit);
  const normSelectedMonth = selectedMonth === 'all' || selectedMonth === 'TODOS' ? 'TODOS' : selectedMonth.toUpperCase();
  
  const hasCargo = String(row.cargo ?? "").trim() !== "";
  const rowUnitNorm = normalizeUnitName(row.unidade);
  const unitMatches = normSelectedUnit === 'TODOS' || rowUnitNorm === normSelectedUnit;
  
  const parsedMonth = getMonthNamePtBrUpper(row.data_abertura);
  const monthMatches = normSelectedMonth === 'TODOS' || parsedMonth === normSelectedMonth;
  
  const includedByExcelParity = hasCargo && unitMatches && monthMatches;
  
  // For now, includedByApp is the same as Excel Parity, 
  // but this is where we'd find if the App has extra filters
  const includedByApp = includedByExcelParity; 

  let rejectionReason = "";
  if (!hasCargo) rejectionReason = "Cargo vazio (Coluna F)";
  else if (!unitMatches) rejectionReason = `Unidade não coincide (${rowUnitNorm} vs ${normSelectedUnit})`;
  else if (!monthMatches) rejectionReason = `Mês não coincide (${parsedMonth} vs ${normSelectedMonth})`;

  return {
    id: row.id,
    source_row_index: row.source_row_index,
    unidade: row.unidade,
    cargo: row.cargo,
    data_abertura: row.data_abertura,
    status: row.status || row.status_geral || '',
    includedByExcelParity,
    includedByApp,
    hasCargo,
    unitMatches,
    monthMatches,
    parsedMonth,
    rejectionReason: includedByExcelParity ? undefined : rejectionReason
  };
}

export function getStatusSummary(records: any[], selectedUnit: string, selectedMonth?: string) {
  const validVacancies = getValidVacancyBase(records, selectedUnit, selectedMonth);

  const summary: Record<string, number> = {};
  validVacancies.forEach(row => {
    const status = (row.status || row.status_geral || 'SEM STATUS').toUpperCase().trim();
    summary[status] = (summary[status] || 0) + 1;
  });

  return {
    total: validVacancies.length,
    byStatus: summary
  };
}
