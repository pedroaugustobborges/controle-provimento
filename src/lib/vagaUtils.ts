import { Vaga, StatusVaga, TipoVaga, EtapaEdital, ETAPA_LABELS } from '@/types/vaga';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

export function calcDiasAberto(data: string | undefined): number {
  if (!data) return 0;
  const d = parseISO(data);
  if (!isValid(d)) return 0;
  return differenceInDays(new Date(), d);
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '-';
}

export function normalizeUnitName(name: string): string {
  if (!name) return '';
  return name.trim().toUpperCase()
    .replace('HOSPITAL DE URGÊNCIAS DE GOIÂNIA', 'HUGO')
    .replace('HOSPITAL ESTADUAL DE URGÊNCIAS DE GOIÂNIA', 'HUGO')
    .replace('HOSPITAL ESTADUAL DE DOENÇAS TROPICAIS', 'HDT')
    .replace('HOSPITAL ESTADUAL DA CRIANÇA E DO ADOLESCENTE', 'HECAD')
    .replace('HOSPITAL ESTADUAL DE DERMATOLOGIA SANITÁRIA', 'HDS')
    .replace('CENTRO DE REABILITAÇÃO E READAPTAÇÃO DR. HENRIQUE SANTILLO', 'CRER')
    .replace('HOSPITAL ESTADUAL DE APARECIDA DE GOIÂNIA', 'HEAPA');
}

export function normalizeCargo(cargo: string): string {
  if (!cargo) return '';
  return cargo.trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, '');
}

export function getCategoriaStatus(vaga: Vaga): string {
  const status = (vaga.status || '').toUpperCase();
  if (status === 'CONCLUÍDAS' || status === 'CONCLUÍDA') return 'concluidas';
  if (status === 'FILA DE EDITAIS') return 'fila_edital';
  if (status === 'CONVOCAÇÕES') return 'convocacao';
  if (status === 'DOCUMENTAÇÃO') return 'documentacao';
  if (status === 'AGUARDANDO UNIDADE') return 'aguardando_unidade';
  if (status === 'CANCELADAS' || status === 'SUSPENSA') return 'vagas_interrompidas';
  if (vaga.tipo_vaga === 'lideranca') return 'vagas_lideranca';
  return 'em_andamento';
}

export function getValidVacancyBase(vagas: Vaga[], unidade: string, mes: string): Vaga[] {
  return vagas.filter(v => {
    const matchUnidade = unidade === 'TODOS' || normalizeUnitName(v.unidade) === normalizeUnitName(unidade);
    const matchMes = mes === 'TODOS' || (v.data_abertura && getMonthNamePtBrUpper(v.data_abertura) === mes);
    return matchUnidade && matchMes;
  });
}

export function getMonthNamePtBrUpper(dateStr: string): string {
  const d = parseISO(dateStr);
  if (!isValid(d)) return '';
  const months = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  return months[d.getMonth()];
}

export function checkVacancyParity(vaga: Vaga, unidade: string, mes: string) {
  const matchUnidade = unidade === 'TODOS' || normalizeUnitName(vaga.unidade) === normalizeUnitName(unidade);
  const matchMes = mes === 'TODOS' || (vaga.data_abertura && getMonthNamePtBrUpper(vaga.data_abertura) === mes);
  
  return {
    ...vaga,
    parsedMonth: vaga.data_abertura ? getMonthNamePtBrUpper(vaga.data_abertura) : '',
    includedByExcelParity: matchUnidade && matchMes,
    includedByApp: matchUnidade && matchMes,
    rejectionReason: matchUnidade && matchMes ? null : 'Filtro de unidade ou mês não coincidente'
  };
}

export function getEtapaColor(etapa: EtapaEdital | string): string {
  const map: Record<string, string> = {
    validacao_edital: 'bg-slate-100 text-slate-800',
    inscricoes: 'bg-blue-100 text-blue-800',
    triagem: 'bg-purple-100 text-purple-800',
    resultado_da_triagem: 'bg-purple-200 text-purple-900',
    avaliacao_especifica_online: 'bg-amber-100 text-amber-800',
    resultado_preliminar_avaliacao_especifica_online: 'bg-amber-200 text-amber-900',
    recurso_avaliacao_especifica_online: 'bg-orange-100 text-orange-800',
    resultado_recurso_avaliacao_especifica_online: 'bg-orange-200 text-orange-900',
    resultado_final_avaliacao_especifica_online: 'bg-orange-300 text-orange-950',
    envio_certificados_titulos: 'bg-teal-100 text-teal-800',
    declaracao_experiencia: 'bg-teal-200 text-teal-900',
    analise_curricular_preliminar: 'bg-cyan-100 text-cyan-800',
    recurso_analise_curricular: 'bg-cyan-200 text-cyan-900',
    resultado_recurso_analise_curricular: 'bg-cyan-300 text-cyan-950',
    analise_curricular_final: 'bg-cyan-400 text-cyan-950',
    entrevistas: 'bg-pink-100 text-pink-800',
    resultado_final: 'bg-green-100 text-green-800',
    convocacao_do_edital: 'bg-emerald-100 text-emerald-800',
    encerramento: 'bg-gray-200 text-gray-800',
    banco_gerado: 'bg-green-500 text-white',
    sem_exito: 'bg-red-100 text-red-800',
    aguardar_anuencia: 'bg-yellow-100 text-yellow-800',
    publicar_novo_edital: 'bg-red-200 text-red-900'
  };
  return map[etapa] || 'bg-slate-100 text-slate-600';
}

export function getAutoEtapa(vaga: Vaga): EtapaEdital {
  if (vaga.acompanhamento?.etapa_atual) return vaga.acompanhamento.etapa_atual as EtapaEdital;
  return 'validacao_edital';
}

export function countVacancies(vagas: Vaga[]): number {
  return vagas.reduce((acc, v) => acc + (v.numero_vagas || v.quantidade || 0), 0);
}

export function getStatusSummary(vagas: Vaga[]) {
  return vagas.reduce((acc, v) => {
    const status = v.status || 'SEM STATUS';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function isVitoriaUnit(unidade: string): boolean {
  const u = normalizeUnitName(unidade);
  return ['UPA VITORIA', 'UPA SAO PEDRO', 'UPA SUA'].includes(u);
}
