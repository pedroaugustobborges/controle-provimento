export type TipoVaga = 'substituicao' | 'aumento' | 'lideranca' | 'movimentacao_interna' | 'quadro' | 'banco_talentos' | 'edital';
export type StatusVaga = 
  | 'CONCLUÍDAS'
  | 'EM ANDAMENTO'
  | 'MOV. INTERNA'
  | 'DOCUMENTAÇÃO'
  | 'CONVOCAÇÕES'
  | 'FILA DE EDITAIS'
  | 'SUSPENSA'
  | 'PAUSADA'
  | 'AGUARDANDO UNIDADE'
  | 'ESTRATÉGICAS'
  | 'CANCELADAS'
  | 'SEM STATUS'
  | 'sem_status' 
  | 'publicar_novo_edital' 
  | 'em_edital' 
  | 'em_documentacao' 
  | 'documentacao_ok_azul_pendente' 
  | 'documentacao_pendente_azul_ok' 
  | 'em_admissao' 
  | 'admissao_enviada' 
  | 'admissao_efetivada' 
  | 'dispensa' 
  | 'cancelada' 
  | 'aguardar_anuencia' 
  | 'aguardar_unidade' 
  | 'movimentacao_interna' 
  | 'vaga_lideranca' 
  | 'realizar_convocacao' 
  | 'aberta' 
  | 'em_triagem' 
  | 'entrevista' 
  | 'finalizada' 
  | 'encerrada';

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
export type EtapaEdital = 
  | 'inscricoes' 
  | 'triagem' 
  | 'resultado_da_triagem'
  | 'avaliacao_curricular'
  | 'avaliacao_especifica_online'
  | 'resultado_da_avaliacao_especifica_online'
  | 'entrevistas' 
  | 'resultado_final' 
  | 'convocacao_do_edital'
  | 'encerramento'
  | 'banco_gerado'
  | 'sem_exito'
  | 'aguardar_anuencia'
  | 'publicar_novo_edital';


export interface VagaCronograma {
  data_inscricao?: string;
  data_triagem?: string;
  data_avaliacao_curricular?: string;
  data_avaliacao_especifica_online?: string;
  data_resultado_avaliacao_especifica_online?: string;
  data_entrevistas?: string;
  data_resultado_final?: string;
  data_convocacao?: string;
  data_encerramento_processo?: string;
}

export interface VagaAcompanhamento {
  etapa_atual: string;
  total_inscritos?: number;
  aprovados_triagem?: number;
  aprovados_avaliacao_especifica?: number;
  convocados_entrevista?: number;
  aprovados_finais?: number;
  gerou_banco?: boolean;
  quantidade_banco?: number;
  observacoes_etapa?: string;
  data_real_etapa?: string;
  situacao_etapa?: 'pendente' | 'em_andamento' | 'concluido' | 'atrasada';
}

export interface Vaga {
  id: string;
  data_abertura: string;
  data_recebimento?: string;
  data_criacao: string; // ISO string for precise 24h check
  unidade: string;
  requisicao: string;
  numero_requisicao?: string; 
  cargo: string;
  secao: string;
  tipo_vaga: TipoVaga;
  numero_vagas: number;
  quantidade?: number; 
  analista_responsavel: string;
  assistentes?: string[];
  observacoes_internas: string;
  observacoes?: string; 
  status: StatusVaga;
  status_geral?: StatusGeral; 
  tem_banco_valido: boolean;
  banco_id?: string;
  numero_processo?: string;
  numero_edital?: string;
  arquivo_edital?: string; // URL ou nome do arquivo
  validado_por?: string;
  data_validacao?: string;
  observacoes_validacao?: string;
  status_validacao?: StatusValidacao;
  historico: HistoricoItem[];
  origem: 'manual' | 'importada';
  
  // Acompanhamento do Edital
  cronograma?: VagaCronograma;
  acompanhamento?: VagaAcompanhamento;

  // Compatibilidade e Extras
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
  trace_key?: string;
  vaga?: string; 
  source_row_index?: number;
  import_batch_id?: string;
  raw_row_hash?: string;
  source_sheet?: string;
  
  // Campos complementares de convocação (Item 7)
  data_convocacao_planilha?: string;
  horario_convocacao_planilha?: string;
  candidato_convocado_planilha?: string;
  classificacao_convocacao_planilha?: string;
  forma_convocacao_planilha?: string;
  status_oitiva_convocacao_planilha?: string;

  // Colunas auxiliares de acompanhamento (Item 2)
  admissao_enviada_acompanhamento?: string;
  admissao_efetivada_acompanhamento?: string;
  detalhes_acompanhamento?: string;
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
  status: 'CADASTRO RESERVA' | 'CONVOCADO' | 'VENCIDO' | 'valido' | 'prorrogado' | 'nenhum';
  status_import?: string;
  numero_processo?: string;
  nome?: string;
  classificacao?: string | number;
  quantidade_banco?: string | number;
  numero_chamada?: string;
  numero_processo_seletivo?: string;
  numero_vaga_aproveitamento?: string;
  cargo_normalizado?: string;
  import_batch_id?: string;
  data_importacao?: string;
  origem_importacao?: string;
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
  devolutiva?: string;
  responsavel: string;
  status: StatusConvocacao;
  edoc?: string;
  resultado_final?: string;
  validado_por?: string;
  data_validacao?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  status: 'pendente' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta';
  data_criacao: string;
  data_vencimento?: string;
  atribuido_a: string; // ID ou nome do usuário/perfil
  relacionado_a?: {
    tipo: 'vaga' | 'edital' | 'banco' | 'convocacao';
    id: string;
  };
}

export interface Alerta {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'atraso' | 'validacao' | 'informativo' | 'critico';
  status: 'lido' | 'nao_lido' | 'resolvido';
  data_criacao: string;
  destinatario: string; // Perfil ou ID
  link?: string;
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
  aba_utilizada?: string;
  linha_cabecalho?: number;
  colunas_reconhecidas?: string;
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
  'CONCLUÍDAS': 'Concluídas',
  'EM ANDAMENTO': 'Em Andamento',
  'MOV. INTERNA': 'Mov. Interna',
  'DOCUMENTAÇÃO': 'Documentação',
  'CONVOCAÇÕES': 'Convocações',
  'FILA DE EDITAIS': 'Fila de Editais',
  'SUSPENSA': 'Suspensa',
  'PAUSADA': 'Pausada',
  'AGUARDANDO UNIDADE': 'Aguardando Unidade',
  'ESTRATÉGICAS': 'Estratégicas',
  'CANCELADAS': 'Canceladas',
  'SEM STATUS': 'Sem Status',
  sem_status: 'Sem Status',
  publicar_novo_edital: 'Publicar Novo Edital',
  em_edital: 'Em Edital',
  em_documentacao: 'Em Documentação',
  documentacao_ok_azul_pendente: 'Doc. OK e Azul Pendente',
  documentacao_pendente_azul_ok: 'Doc. Pendente e Azul OK',
  em_admissao: 'Em Admissão',
  admissao_enviada: 'Admissão Enviada',
  admissao_efetivada: 'Admissão Efetivada',
  dispensa: 'Dispensa',
  cancelada: 'Cancelada',
  aguardar_anuencia: 'Aguardar Anuência',
  aguardar_unidade: 'Aguardar Unidade',
  movimentacao_interna: 'Movimentação Interna',
  vaga_lideranca: 'Vaga de Liderança',
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
  resultado_da_triagem: 'Resultado da Triagem',
  avaliacao_curricular: 'Avaliação Curricular',
  avaliacao_especifica_online: 'Avaliação Específica Online',
  resultado_da_avaliacao_especifica_online: 'Res. Aval. Específica Online',
  entrevistas: 'Entrevistas',
  resultado_final: 'Resultado Final',
  convocacao_do_edital: 'Convocação do Edital',
  encerramento: 'Encerramento',
  banco_gerado: 'Banco Gerado',
  sem_exito: 'Sem Êxito',
  aguardar_anuencia: 'Aguardar Anuência',
  publicar_novo_edital: 'Publicar Novo Edital',
};


export const STATUS_EDITAL_COLORS: Record<StatusEdital, string> = {
  'Nova vaga': 'bg-blue-100 text-blue-700 border-blue-200',
  'Aguardando processo': 'bg-amber-100 text-amber-700 border-amber-200',
  'Aguardando edital': 'bg-orange-100 text-orange-700 border-orange-200',
  'Aguardando processo e edital': 'bg-red-100 text-red-700 border-red-200',
  'Em andamento': 'bg-green-100 text-green-700 border-green-200',
  'Encerrada': 'bg-gray-100 text-gray-700 border-gray-200',
};
