import { StatusGeral, StatusValidacao, EtapaEdital, StatusPublicacao } from '@/types/vaga';

export function getStatusColor(status: StatusGeral): string {
  const map: Record<StatusGeral, string> = {
    aberta: 'bg-blue-100 text-blue-800',
    em_edital: 'bg-amber-100 text-amber-800',
    em_triagem: 'bg-purple-100 text-purple-800',
    entrevista: 'bg-indigo-100 text-indigo-800',
    finalizada: 'bg-green-100 text-green-800',
    encerrada: 'bg-gray-100 text-gray-600',
    cancelada: 'bg-red-100 text-red-800',
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
  const start = new Date(dataAbertura);
  const end = dataEncerramento ? new Date(dataEncerramento) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(date: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}
