export type TipoVaga = 'substituicao' | 'aumento' | 'lideranca' | 'movimentacao_interna';
export type StatusVaga = 
  | 'movimentacao_interna' 
  | 'vaga_lideranca' 
  | 'publicado_edital' 
  | 'em_edital' 
  | 'documentacao' 
  | 'documentacao_ok' 
  | 'documentacao_pendente' 
  | 'casos_ok' 
  | 'admissao' 
  | 'admissao_enviada' 
  | 'admissao_efetivada' 
  | 'suspensa' 
  | 'cancelada' 
  | 'aguardando_unidade' 
  | 'realizar_convocacao';

export type StatusConvocacao = 
  | 'aceite' 
  | 'recusa_plantao' 
  | 'recusa_unidade' 
  | 'recusa_horario' 
  | 'desistiu' 
  | 'faltou'
  | 'pendente';

export interface Vaga {
  id: string;
  data_abertura: string;
  data_recebimento: string;
  unidade: string;
  requisicao: string;
  cargo: string;
  secao: string;
  tipo_vaga: TipoVaga;
  numero_vagas: number;
  analista_responsavel: string;
  observacoes_internas: string;
  status: StatusVaga;
  tem_banco_valido: boolean;
  banco_id?: string;
  numero_processo?: string;
  numero_edital?: string;
  historico: HistoricoItem[];
}

export interface BancoTalentos {
  id: string;
  unidade: string;
  cargo: string;
  secao: string;
  numero_edital: string;
  data_abertura_edital: string;
  data_validade: string;
  is_prorrogado: boolean;
  nova_data_validade?: string;
  observacoes: string;
  status: 'valido' | 'vencido' | 'prorrogado' | 'nenhum';
}

export interface Convocacao {
  id: string;
  vaga_id: string;
  data_convocacao: string;
  horario: string;
  nome_candidato: string;
  classificacao: number;
  tipo_convocacao: string;
  cargo: string;
  unidade: string;
  requisicao: string;
  edital_relacionado?: string;
  banco_relacionado?: string;
  observacoes: string;
  status: StatusConvocacao;
  edoc?: string;
  resultado_final?: string;
  validado_por?: string;
  data_validacao?: string;
}

export interface HistoricoItem {
  id: string;
  data: string;
  descricao: string;
  usuario: string;
}

export interface ImportHistory {
  id: string;
  data_hora: string;
  usuario: string;
  arquivo: string;
  tipo_importacao: 'vagas' | 'banco' | 'convocacoes';
  total_lidos: number;
  total_novos: number;
  total_atualizados: number;
  total_ignorados: number;
  total_erros: number;
  status: 'concluido' | 'erro' | 'em_processamento';
}

export const TIPO_VAGA_LABELS: Record<TipoVaga, string> = {
  substituicao: 'Substituição',
  aumento: 'Aumento',
  lideranca: 'Liderança',
  movimentacao_interna: 'Movimentação Interna',
};

export const STATUS_VAGA_LABELS: Record<StatusVaga, string> = {
  movimentacao_interna: 'Movimentação Interna',
  vaga_lideranca: 'Vaga de Liderança',
  publicado_edital: 'Publicado no Edital',
  em_edital: 'Em Edital',
  documentacao: 'Documentação',
  documentacao_ok: 'Documentação OK',
  documentacao_pendente: 'Documentação Pendente',
  casos_ok: 'Casos OK',
  admissao: 'Admissão',
  admissao_enviada: 'Admissão Enviada',
  admissao_efetivada: 'Admissão Efetivada',
  suspensa: 'Suspensa',
  cancelada: 'Cancelada',
  aguardando_unidade: 'Aguardando Unidade',
  realizar_convocacao: 'Realizar Convocação',
};

export const STATUS_CONVOCACAO_LABELS: Record<StatusConvocacao, string> = {
  aceite: 'Aceite',
  recusa_plantao: 'Recusa Plantão',
  recusa_unidade: 'Recusa Unidade',
  recusa_horario: 'Recusa Horário',
  desistiu: 'Desistiu',
  faltou: 'Faltou',
  pendente: 'Pendente',
};
