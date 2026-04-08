import { StatusVaga, StatusValidacao, EtapaEdital, StatusPublicacao } from '@/types/vaga';

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
    .replace(/[-–—]/g, " ") // replace all types of hyphens/dashes with space
    .replace(/[^a-z0-9 ]/g, " ") // remove other special chars
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

export function normalizeStatus(statusText: string): StatusVaga {
  if (!statusText) return 'aberta';
  
  const text = statusText.toLowerCase().trim();
  
  if (text.includes('aberta') || text.includes('novo')) return 'aberta';
  if (text.includes('edital') || text.includes('publicado')) return 'em_edital';
  if (text.includes('convoc')) return 'realizar_convocacao';
  if (text.includes('admissao') || text.includes('admitido')) return 'admissao';
  if (text.includes('document')) return 'documentacao';
  if (text.includes('cancel')) return 'cancelada';
  if (text.includes('susp')) return 'suspensa';
  if (text.includes('finaliz') || text.includes('concluid') || text.includes('encerrad')) return 'finalizada';
  if (text.includes('triagem')) return 'em_triagem';
  if (text.includes('entrev')) return 'entrevista';
  if (text.includes('lideranca')) return 'vaga_lideranca';
  if (text.includes('movimentacao') || text.includes('interna')) return 'movimentacao_interna';
  if (text.includes('unidade')) return 'aguardando_unidade';
  
  return 'aberta';
}
