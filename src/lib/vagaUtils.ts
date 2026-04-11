import { StatusVaga, StatusValidacao, EtapaEdital, StatusPublicacao, Vaga, VagaCronograma } from '@/types/vaga';

export const VITORIA_SUB_UNIDADES = [
  'sao pedro', 'suá', 'sua', 'bento ferreira', 'jardim da penha', 
  'maruípe', 'maruipe', 'vitoria', 'vitória', 'vix', 'espirito santo', 
  'es', 'serra', 'cariacica', 'vila velha', 'viana'
];

export const UNIDADES_POR_REGIAO: Record<string, string[]> = {
  'Goiânia': ['CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR', 'TEIA GOIÂNIA', 'TEIA ANÁPOLIS', 'TEIA APARECIDA', 'TEIA CANEDO', 'TEIA CEN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3', 'TEIA PIN'],
  'Vitória': ['SÃO PEDRO', 'SUÁ', 'UPA'],
  'Demais Unidades': ['CHS', 'HRD', 'HRC', 'HRCAC I', 'HRCAC II', 'HMSA', 'JATAÍ', 'DOURADOS', 'POLICLÍNICA']
};

const REGION_ALIASES: Record<string, string[]> = {
  'Goiânia': ['GOIÂNIA', 'GOIANIA', 'TEIA ANAPOLIS', 'TEIA ANÁPOLIS'],
  'Vitória': ['VITÓRIA', 'VITORIA', 'VIX', 'ES'],
  'Demais Unidades': ['OUTRAS UNIDADES'],
};

export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const REGION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(UNIDADES_POR_REGIAO).flatMap(([region, units]) =>
    [...units, ...(REGION_ALIASES[region] || [])].map((unit) => [
      removeAccents(String(unit).toUpperCase().trim().replace(/\s+/g, ' ')),
      region,
    ])
  )
);

export function getRegionForUnit(unitName: string): string {
  const normalizedUnit = removeAccents(String(unitName || '').toUpperCase().trim().replace(/\s+/g, ' '));

  if (!normalizedUnit) return 'Demais Unidades';

  const exactMatch = REGION_MAP[normalizedUnit];
  if (exactMatch) return exactMatch;

  const partialMatch = Object.entries(REGION_MAP).find(([key]) => (
    normalizedUnit.includes(key) || key.includes(normalizedUnit)
  ));

  return partialMatch?.[1] || 'Demais Unidades';
}

export function isVitoriaUnit(unidade: string): boolean {
  if (!unidade) return false;
  const normalized = removeAccents(unidade.toLowerCase().trim());
  
  const vitoriaTokens = VITORIA_SUB_UNIDADES.map(sub => removeAccents(sub.toLowerCase()));
  
  return vitoriaTokens.some(token => {
    const regex = new RegExp(`\\b${token}\\b`, 'i');
    return regex.test(normalized) || normalized === token;
  });
}

export const CATEGORIAS_STATUS = {
  concluidas: ['CONCLUÍDA', 'CONCLUÍDAS', 'CONCLUIDO', 'CONCLUIDA'],
  movimentacao_interna: ['MOVIMENTAÇÃO INTERNA', 'MOVIMENTACAO INTERNA', 'MOV INTERNA', 'MOV. INTERNA'],
  vagas_lideranca: ['VAGA DE LIDERANÇA', 'ESTRATÉGICAS', 'ESTRATEGICAS', 'LIDERANÇA', 'LIDERANCA'],
  em_andamento: ['EM ANDAMENTO', 'REALIZAR CONVOCAÇÃO', 'REALIZAR CONVOCACAO'],
  aguardando_unidade: ['AGUARDANDO UNIDADE'],
  fila_edital: ['FILA DE EDITAIS', 'EM EDITAL', 'PUBLICAR NOVO EDITAL'],
  suspensa: ['SUSPENSA'],
  cancelada: ['CANCELADA', 'CANCELADAS'],
  documentacao: ['DOCUMENTAÇÃO', 'DOCUMENTACAO', 'DOCUMENTAÇÃO OK E ASO PENDENTE', 'ASO PENDENTE'],
  em_admissao: ['ADMISSÃO', 'ADMISSAO', 'ADMISSÃO ENVIADA', 'ADMISSAO ENVIADA'],
  convocacoes: ['CONVOCAÇÕES', 'CONVOCACOES', 'CONVOCAÇÃO', 'CONVOCACAO'],
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

export function getCategoriaStatus(row: any, includeConvocacaoFields: boolean = false): keyof typeof CATEGORIAS_STATUS | 'sem_classificacao' {
  if (!row) return 'sem_classificacao';
  
  const status = typeof row === 'string' ? row : (row.status || row.status_geral);
  
  if (!status || status === '' || status === 'nan' || status === 'null' || status === 'undefined' || String(status).trim() === '') {
    return 'sem_classificacao';
  }
  
  const s = String(status).trim();
  const normStatus = removeAccents(s.toUpperCase());
  
  for (const [cat, values] of Object.entries(CATEGORIAS_STATUS)) {
    if (values.some(v => removeAccents(v.toUpperCase()) === normStatus)) {
      return cat as keyof typeof CATEGORIAS_STATUS;
    }
  }

  return 'sem_classificacao';
}

export function getStatusColor(status: string): string {
  if (!status) return 'bg-gray-100 text-gray-600';
  
  const s = String(status).trim();
  const normStatus = removeAccents(s.toUpperCase());
  
  if (CATEGORIAS_STATUS.concluidas.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-green-100 text-green-700 border-green-200';
  if (CATEGORIAS_STATUS.fila_edital.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (CATEGORIAS_STATUS.suspensa.some(v => removeAccents(v.toUpperCase()) === normStatus) || CATEGORIAS_STATUS.cancelada.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-red-100 text-red-700 border-red-200';
  if (CATEGORIAS_STATUS.vagas_lideranca.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (CATEGORIAS_STATUS.documentacao.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (CATEGORIAS_STATUS.aguardando_unidade.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (CATEGORIAS_STATUS.movimentacao_interna.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
  if (CATEGORIAS_STATUS.em_andamento.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (CATEGORIAS_STATUS.em_admissao.some(v => removeAccents(v.toUpperCase()) === normStatus)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  
  return 'bg-gray-100 text-gray-600';
}

export function getValidacaoColor(status: StatusValidacao): string {
  const map: Record<StatusValidacao, string> = {
    pendente: 'bg-amber-100 text-amber-800',
    aprovado: 'bg-green-100 text-green-800',
    reprovado: 'bg-red-100 text-red-800',
  };
  return map[status];
}

export function getEtapaColor(etapa: EtapaEdital | string): string {
  const map: Record<string, string> = {
    validacao_edital: 'bg-slate-100 text-slate-800',
    inscricoes: 'bg-blue-100 text-blue-800',
    triagem: 'bg-purple-100 text-purple-800',
    resultado_da_triagem: 'bg-purple-50 text-purple-700',
    avaliacao_especifica_online: 'bg-cyan-100 text-cyan-800',
    resultado_preliminar_avaliacao_especifica_online: 'bg-cyan-50 text-cyan-600',
    recurso_avaliacao_especifica_online: 'bg-orange-50 text-orange-600',
    resultado_recurso_avaliacao_especifica_online: 'bg-orange-100 text-orange-700',
    resultado_final_avaliacao_especifica_online: 'bg-cyan-100 text-cyan-900',
    envio_certificados_titulos: 'bg-indigo-100 text-indigo-800',
    declaracao_experiencia: 'bg-indigo-50 text-indigo-700',
    analise_curricular_preliminar: 'bg-violet-50 text-violet-700',
    recurso_analise_curricular: 'bg-amber-50 text-amber-600',
    resultado_recurso_analise_curricular: 'bg-amber-100 text-amber-700',
    analise_curricular_final: 'bg-violet-100 text-violet-800',
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

export function getAutoEtapa(vaga: Vaga): EtapaEdital {
  if (!vaga.cronograma || !vaga.acompanhamento?.etapas_habilitadas) {
    return (vaga.acompanhamento?.etapa_atual as EtapaEdital) || 'inscricoes';
  }

  const today = new Date().toISOString().split('T')[0];
  const habilitadas = vaga.acompanhamento.etapas_habilitadas;
  
  const cronoOrder: EtapaEdital[] = [
    'validacao_edital',
    'inscricoes',
    'triagem',
    'resultado_da_triagem',
    'avaliacao_especifica_online',
    'resultado_preliminar_avaliacao_especifica_online',
    'recurso_avaliacao_especifica_online',
    'resultado_recurso_avaliacao_especifica_online',
    'resultado_final_avaliacao_especifica_online',
    'envio_certificados_titulos',
    'declaracao_experiencia',
    'analise_curricular_preliminar',
    'recurso_analise_curricular',
    'resultado_recurso_analise_curricular',
    'analise_curricular_final',
    'entrevistas',
    'resultado_final',
    'convocacao_do_edital',
    'encerramento'
  ];

  const cronoKeys: Record<string, keyof VagaCronograma> = {
    validacao_edital: 'data_validacao_edital',
    inscricoes: 'data_inscricao',
    triagem: 'data_triagem',
    resultado_da_triagem: 'data_resultado_triagem',
    avaliacao_especifica_online: 'data_avaliacao_especifica_online',
    resultado_preliminar_avaliacao_especifica_online: 'data_resultado_preliminar_avaliacao_especifica',
    recurso_avaliacao_especifica_online: 'data_recurso_avaliacao_especifica',
    resultado_recurso_avaliacao_especifica_online: 'data_resultado_recurso_avaliacao_especifica',
    resultado_final_avaliacao_especifica_online: 'data_resultado_final_avaliacao_especifica',
    envio_certificados_titulos: 'data_envio_certificados_titulos',
    declaracao_experiencia: 'data_declaracao_experiencia',
    analise_curricular_preliminar: 'data_analise_curricular_preliminar',
    recurso_analise_curricular: 'data_recurso_analise_curricular',
    resultado_recurso_analise_curricular: 'data_resultado_recurso_analise_curricular',
    analise_curricular_final: 'data_analise_curricular_final',
    entrevistas: 'data_entrevistas',
    resultado_final: 'data_resultado_final',
    convocacao_do_edital: 'data_convocacao',
    encerramento: 'data_encerramento_processo',
  };

  let current: EtapaEdital = (vaga.acompanhamento?.etapa_atual as EtapaEdital) || 'inscricoes';
  
  for (const etapa of cronoOrder) {
    if (habilitadas.includes(etapa)) {
      const dateKey = cronoKeys[etapa];
      const date = (vaga.cronograma as any)[dateKey];
      if (date && date <= today) {
        current = etapa;
      }
    }
  }

  return current;
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
  
  let date: Date;
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }
  if (isNaN(date.getTime())) {
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
  
  const text = removeAccents(statusText.toLowerCase().trim().replace(/\s+/g, ' '));
  
  if (text === 'admissao efetivada') return 'CONCLUÍDAS' as StatusVaga;
  if (text === 'publicar novo edital' || text === 'publicar edital' || text.includes('fazer publicacao') || text.includes('fazer publicação') || text === 'aguardando edital' || text === 'aguardando processo e edital') return 'FILA DE EDITAIS' as StatusVaga;
  if (text === 'vaga de lideranca') return 'ESTRATÉGICAS' as StatusVaga;
  if (text === 'aguardando unidade' || text === 'aguardando') return 'AGUARDANDO UNIDADE' as StatusVaga;
  if (text === 'vaga suspensa' || text === 'suspensa') return 'SUSPENSA' as StatusVaga;
  if (text === 'vaga pausada' || text === 'pausada') return 'PAUSADA' as StatusVaga;
  if (text === 'cancelada' || text === 'cancelado') return 'CANCELADAS' as StatusVaga;
  if (text === 'realizar convocacao') return 'CONVOCAÇÕES' as StatusVaga;
  if (text === 'documentacao' || text === 'documentacao ok e aso pendente' || text === 'aso pendente') return 'DOCUMENTAÇÃO' as StatusVaga;
  if (text === 'admissao enviada' || text === 'em edital' || text === 'em processo seletivo' || text === 'em triagem' || text === 'entrevista' || text === 'movimentacao interna') return 'EM ANDAMENTO' as StatusVaga;
  if (text.includes('andamento') || text.includes('processo') || text.includes('edital')) return 'EM ANDAMENTO' as StatusVaga;

  return 'SEM STATUS' as StatusVaga;
}

export function normalizeUnitName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return removeAccents(name.toUpperCase().trim().replace(/\s+/g, ' '));
}

export function parseSpreadsheetDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date((value - 25569) * 86400 * 1000);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  return null;
}

export function getMonthNamePtBrUpper(dateValue?: string | null | Date | number): string {
  if (!dateValue) return "";
  const date = parseSpreadsheetDate(dateValue);
  if (!date || isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date).toUpperCase();
}

// Mapping: which banco unit serves which sidebar units
const BANCO_UNIT_MAPPING: Record<string, string[]> = {
  'GOIÂNIA': ['CRER', 'HUGOL', 'HECAD', 'HDS', 'AGIR', 'TEIA GOIÂNIA', 'TEIA ANÁPOLIS', 'TEIA APARECIDA', 'TEIA CANEDO', 'TEIA CEN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3', 'TEIA PIN', 'GOIÂNIA', 'GOIANIA'],
  'UPA': ['SÃO PEDRO', 'SUÁ', 'UPA', 'VITÓRIA', 'VITORIA'],
  'POLICLÍNICA': ['POLICLÍNICA', 'POLICLINICA'],
  'JATAÍ': ['JATAÍ', 'JATAI'],
  'DOURADOS': ['DOURADOS'],
  'HRC': ['HRC'],
};

function getBancoUnitsForSidebarUnit(sidebarUnit: string): string[] {
  const norm = normalizeUnitName(sidebarUnit);
  const matchingBancoUnits: string[] = [];

  for (const [bancoUnit, servedUnits] of Object.entries(BANCO_UNIT_MAPPING)) {
    if (servedUnits.some((u) => normalizeUnitName(u) === norm) || normalizeUnitName(bancoUnit) === norm) {
      matchingBancoUnits.push(normalizeUnitName(bancoUnit));
    }
  }

  if (matchingBancoUnits.length === 0) {
    matchingBancoUnits.push(norm);
  }

  return matchingBancoUnits;
}

function getScopedUnitNames(unitName: string): string[] {
  const normalizedUnit = normalizeUnitName(unitName);

  if (!normalizedUnit) return [];

  const allowedUnits = new Set<string>([normalizedUnit]);

  Object.entries(BANCO_UNIT_MAPPING).forEach(([bancoUnit, servedUnits]) => {
    const normalizedBancoUnit = normalizeUnitName(bancoUnit);
    const normalizedServedUnits = servedUnits.map(normalizeUnitName);

    if (normalizedBancoUnit === normalizedUnit) {
      allowedUnits.add(normalizedBancoUnit);
      normalizedServedUnits.forEach((servedUnit) => allowedUnits.add(servedUnit));
    }

    if (normalizedServedUnits.includes(normalizedUnit)) {
      allowedUnits.add(normalizedBancoUnit);
    }
  });

  return Array.from(allowedUnits);
}

export function filterByRegionAndUnit(records: any[], region: string, unit: string): any[] {
  if (!records || !Array.isArray(records)) return [];

  let filtered = records;

  // When "all" is selected, we don't apply any regional or unit filtering
  if (region === 'all' && unit === 'all') {
    return filtered;
  }

  if (region && region !== 'all') {
    filtered = filtered.filter((row) => {
      const rowUnit = normalizeUnitName(row.unidade);
      if (!rowUnit) return false;
      
      const rowRegion = getRegionForUnit(rowUnit);
      return rowRegion === region;
    });
  }

  if (unit && unit !== 'all') {
    const allowedUnits = new Set(getScopedUnitNames(unit));

    filtered = filtered.filter((row) => {
      const rowUnit = normalizeUnitName(row.unidade);
      if (!rowUnit) return false;
      return allowedUnits.has(rowUnit);
    });
  }

  return filtered;
}

export function getValidVacancyBase(records: any[], selectedUnit?: string, selectedMonth?: string): any[] {
  const normUnit = selectedUnit && selectedUnit !== 'all' && selectedUnit !== 'TODOS' ? normalizeUnitName(selectedUnit) : 'TODOS';
  const normMonth = selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'TODOS' ? selectedMonth.toUpperCase().trim() : 'TODOS';
  return records.filter((row) => {
    const hasCargo = String(row.cargo ?? "").trim() !== "";
    if (!hasCargo) return false;
    const rowUnit = normalizeUnitName(row.unidade);
    const passesUnit = normUnit === 'TODOS' || rowUnit === normUnit;
    if (!passesUnit) return false;
    if (normMonth === 'TODOS') return true;
    const aberturaMonth = getMonthNamePtBrUpper(row.data_abertura);
    return aberturaMonth === normMonth;
  });
}

export function countVacancies({ records, selectedUnit, selectedMonth }: { records: any[]; selectedUnit: string; selectedMonth?: string; }) {
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

export function checkVacancyParity(row: any, selectedUnit: string, selectedMonth: string): VacancyEligibilityResult {
  const normSelectedUnit = selectedUnit === 'all' || selectedUnit === 'TODOS' ? 'TODOS' : normalizeUnitName(selectedUnit);
  const normSelectedMonth = (selectedMonth === 'all' || selectedMonth === 'TODOS' || !selectedMonth) ? 'TODOS' : String(selectedMonth).toUpperCase();
  const hasCargo = String(row.cargo ?? "").trim() !== "";
  const rowUnitNorm = normalizeUnitName(row.unidade);
  const unitMatches = normSelectedUnit === 'TODOS' || rowUnitNorm === normSelectedUnit;
  const parsedMonth = getMonthNamePtBrUpper(row.data_abertura);
  const monthMatches = normSelectedMonth === 'TODOS' || parsedMonth === normSelectedMonth;
  const includedByExcelParity = hasCargo && unitMatches && monthMatches;
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
    const statusVal = row.status || row.status_geral || 'SEM STATUS';
    const status = String(statusVal).toUpperCase().trim();
    summary[status] = (summary[status] || 0) + 1;
  });
  return { total: validVacancies.length, byStatus: summary };
}
