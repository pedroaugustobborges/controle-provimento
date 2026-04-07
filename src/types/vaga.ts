export type TipoVaga = 'substituicao' | 'quadro' | 'lideranca' | 'movimentacao_interna' | 'banco_talentos' | 'edital';
export type StatusGeral = 'aberta' | 'em_edital' | 'em_triagem' | 'entrevista' | 'finalizada' | 'encerrada' | 'cancelada';
export type StatusPublicacao = 'pendente' | 'publicado' | 'encerrado';
export type StatusValidacao = 'pendente' | 'aprovado' | 'reprovado';
export type EtapaEdital = 'inscricoes' | 'triagem' | 'prova' | 'entrevista' | 'resultado' | 'encerrado';
export type StatusEdital = 'Nova vaga' | 'Aguardando processo' | 'Aguardando edital' | 'Aguardando processo e edital' | 'Em andamento' | 'Encerrada';

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
  dias_corridos?: number;
  dias_uteis?: number;
  observacoes: string;
  analista_responsavel: string;
  status_geral: StatusGeral;
  
  // Novos campos para importação e fluxo de editais
  status_edital?: StatusEdital;
  origem_importacao: string;
  data_importacao?: string;
  lote_importacao?: string;
  reabertura_suspeita?: boolean;
  
  // Campos adicionais do requisito 9
  precisa_validacao?: boolean;
  responsavel_validacao?: string;
  etapa_finalizada?: boolean;

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

export interface ImportHistory {
  id: string;
  data: string;
  usuario: string;
  nome_arquivo: string;
  total_lidos: number;
  total_novos: number;
  total_atualizados: number;
  total_ignorados: number;
  total_erros: number;
  repeticoes_tratadas: number;
  status: 'concluido' | 'erro' | 'em_processamento';
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

export const STATUS_EDITAL_COLORS: Record<StatusEdital, string> = {
  'Nova vaga': 'bg-blue-100 text-blue-700 border-blue-200',
  'Aguardando processo': 'bg-amber-100 text-amber-700 border-amber-200',
  'Aguardando edital': 'bg-orange-100 text-orange-700 border-orange-200',
  'Aguardando processo e edital': 'bg-red-100 text-red-700 border-red-200',
  'Em andamento': 'bg-green-100 text-green-700 border-green-200',
  'Encerrada': 'bg-gray-100 text-gray-700 border-gray-200',
};
