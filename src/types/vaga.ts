export type TipoVaga = 'substituicao' | 'aumento' | 'lideranca' | 'movimentacao_interna' | 'quadro' | 'banco_talentos' | 'edital';
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
  | 'realizar_convocacao'
  | 'aberta' | 'em_triagem' | 'entrevista' | 'finalizada' | 'encerrada';

export type StatusGeral = StatusVaga;
export type StatusConvocacao = 
  | 'aceite' 
  | 'recusa_plantao' 
  | 'recusa_unidade' 
  | 'recusa_horario' 
  | 'desistiu' 
  | 'faltou'
  | 'pendente';

export type StatusEdital = 'Nova vaga' | 'Aguardando processo' | 'Aguardando edital' | 'Aguardando processo e edital' | 'Em andamento' | 'Encerrada';
export type StatusPublicacao = 'pendente' | 'publicado' | 'encerrado';
export type StatusValidacao = 'pendente' | 'aprovado' | 'reprovado';
export type EtapaEdital = 'inscricoes' | 'triagem' | 'prova' | 'entrevista' | 'resultado' | 'encerrado';

export interface Vaga {
  id: string;
  data_abertura: string;
  data_recebimento?: string;
  unidade: string;
  requisicao: string;
  numero_requisicao?: string; // Compatibilidade
  cargo: string;
  secao: string;
  tipo_vaga: TipoVaga;
  numero_vagas: number;
  quantidade?: number; // Compatibilidade
  analista_responsavel: string;
  assistentes?: string[];
  observacoes_internas: string;
  observacoes?: string; // Compatibilidade
  status: StatusVaga;
  status_geral?: StatusGeral; // Compatibilidade
  tem_banco_valido: boolean;
  banco_id?: string;
  numero_processo?: string;
  numero_edital?: string;
  historico: HistoricoItem[];
  
  // Compatibilidade
  pcd?: boolean;
  estado?: string;
  selecao?: string;
  origem_importacao?: string;
  data_importacao?: string;
  lote_importacao?: string;
  reabertura_suspeita?: boolean;
  data_encerramento?: string;
  status_edital?: StatusEdital;
  total_inscritos?: number;
  aprovados_triagem?: number;
  aprovados_finais?: number;
  convocados_entrevista?: number;
}

export interface BancoTalentos {
  id: string;
  unidade: string;
  cargo: string;
  secao?: string;
  numero_edital: string;
  data_abertura_edital: string;
  data_validade: string;
  is_prorrogado: boolean;
  nova_data_validade?: string;
  data_convocacao?: string;
  unidade_convocacao?: string;
  observacoes: string;
  status: 'valido' | 'vencido' | 'prorrogado' | 'convocado' | 'nenhum';
  status_import?: string;
  numero_processo?: string;
  nome?: string;
  classificacao?: string | number;
  quantidade_banco?: string | number;
  numero_chamada?: string;
  numero_processo_seletivo?: string;
  numero_vaga_aproveitamento?: string;
  cargo_normalizado?: string;
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
  data_hora?: string;
  data?: string;
  usuario: string;
  email_usuario?: string;
  arquivo?: string;
  nome_arquivo?: string;
  tipo_importacao?: 'vagas' | 'banco' | 'convocacoes';
  planilha_aba?: string;
  linha_cabecalho?: number;
  total_lidos: number;
  total_novos: number;
  total_atualizados: number;
  total_ignorados: number;
  total_erros: number;
  repeticoes_tratadas?: number;
  status: 'concluido' | 'concluido_alertas' | 'erro' | 'em_processamento' | 'cancelado' | 'reprocessado';
  observacoes?: string;
  referencia_arquivo?: string;
  relatorio_erros?: string;
  mapeamento_aplicado?: any;
}

export interface ImportedFile {
  id: string;
  nome_original: string;
  nome_interno: string;
  tipo: string;
  tamanho: number;
  data_upload: string;
  usuario: string;
  email_usuario?: string;
  modulo_origem: string;
  status: 'enviado' | 'processando' | 'processado' | 'erro' | 'arquivado';
  vaga_importacao_id?: string;
  content?: string; // Armazenar o conteúdo base64 ou similar para reprocessamento
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

export const TIPO_VAGA_LABELS: Record<TipoVaga, string> = {
  substituicao: 'Substituição',
  aumento: 'Aumento',
  lideranca: 'Liderança',
  movimentacao_interna: 'Movimentação Interna',
  quadro: 'Quadro',
  banco_talentos: 'Banco de Talentos',
  edital: 'Edital',
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
  aberta: 'Aberta',
  em_triagem: 'Em Triagem',
  entrevista: 'Entrevista',
  finalizada: 'Finalizada',
  encerrada: 'Encerrada',
};

export const STATUS_LABELS = STATUS_VAGA_LABELS;

export const STATUS_CONVOCACAO_LABELS: Record<StatusConvocacao, string> = {
  aceite: 'Aceite',
  recusa_plantao: 'Recusa Plantão',
  recusa_unidade: 'Recusa Unidade',
  recusa_horario: 'Recusa Horário',
  desistiu: 'Desistiu',
  faltou: 'Faltou',
  pendente: 'Pendente',
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
