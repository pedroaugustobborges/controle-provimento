export type TipoVaga = 'substituicao' | 'quadro' | 'lideranca' | 'movimentacao_interna' | 'banco_talentos' | 'edital';
export type StatusGeral = 'aberta' | 'em_edital' | 'em_triagem' | 'entrevista' | 'finalizada' | 'encerrada' | 'cancelada';
export type StatusPublicacao = 'pendente' | 'publicado' | 'encerrado';
export type StatusValidacao = 'pendente' | 'aprovado' | 'reprovado';
export type EtapaEdital = 'inscricoes' | 'triagem' | 'prova' | 'entrevista' | 'resultado' | 'encerrado';

export interface Vaga {
  id: string;
  unidade: string;
  data_abertura: string;
  numero_edital?: string;
  pcd: boolean;
  estado: string;
  numero_processo?: string;
  numero_requisicao: string;
  tipo_vaga: TipoVaga;
  selecao: string;
  cargo: string;
  secao: string;
  quantidade: number;
  etapa_atual_vaga?: string;
  total_inscritos?: number;
  aprovados_triagem?: number;
  aprovados_avaliacao?: number;
  convocados_entrevista?: number;
  aprovados_finais?: number;
  banco?: number;
  data_encerramento?: string;
  observacoes: string;
  analista_responsavel: string;
  status_geral: StatusGeral;
  origem_importacao: string;
  historico: HistoricoItem[];
}

export interface Edital {
  id: string;
  vaga_id: string;
  numero_processo: string;
  numero_edital: string;
  data_abertura_edital: string;
  data_prova?: string;
  data_entrevista?: string;
  data_encerramento_edital?: string;
  etapa_atual: EtapaEdital;
  total_inscritos: number;
  aprovados_triagem: number;
  convocados_entrevista: number;
  aprovados_finais: number;
  possui_banco_talentos: boolean;
  status_publicacao: StatusPublicacao;
}

export interface ValidacaoEdital {
  id: string;
  vaga_id: string;
  precisa_validacao: boolean;
  responsavel_validacao: string;
  tipo_validacao: string;
  observacao: string;
  etapa_finalizada: boolean;
  status_validacao: StatusValidacao;
}

export interface HistoricoItem {
  id: string;
  data: string;
  descricao: string;
  usuario: string;
}

export const TIPO_VAGA_LABELS: Record<TipoVaga, string> = {
  substituicao: 'Substituição',
  quadro: 'Quadro',
  lideranca: 'Liderança',
  movimentacao_interna: 'Movimentação Interna',
  banco_talentos: 'Banco de Talentos',
  edital: 'Edital',
};

export const STATUS_LABELS: Record<StatusGeral, string> = {
  aberta: 'Aberta',
  em_edital: 'Em Edital',
  em_triagem: 'Em Triagem',
  entrevista: 'Entrevista',
  finalizada: 'Finalizada',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

export const ETAPA_LABELS: Record<EtapaEdital, string> = {
  inscricoes: 'Inscrições',
  triagem: 'Triagem',
  prova: 'Prova',
  entrevista: 'Entrevista',
  resultado: 'Resultado',
  encerrado: 'Encerrado',
};
