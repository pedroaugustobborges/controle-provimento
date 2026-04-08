export interface Usuario {
  id: string;
  email: string;
  nome: string;
  created_at: string;
}

export interface Perfil {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Permissao {
  id: string;
  nome: string;
  chave: string;
}

export interface Unidade {
  id: string;
  nome: string;
  codigo?: string;
  created_at: string;
}

export interface Vaga {
  id: string;
  unidade_id: string;
  requisicao: string;
  cargo: string;
  tipo: string;
  quantidade_vagas: number;
  data_abertura: string;
  data_recebimento?: string;
  status_atual: string;
  etapa_atual?: string;
  processo_concluido: boolean;
  dias_corridos: number;
  dias_uteis: number;
  data_conclusao?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  version: number;
}

export interface Edital {
  id: string;
  vaga_id: string;
  numero_edital: string;
  numero_processo?: string;
  status_edital: string;
  arquivo_principal_id?: string;
  publicado_em?: string;
  validado_em?: string;
  validado_por?: string;
  observacoes?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  version: number;
}

export interface EditalEtapa {
  id: string;
  edital_id: string;
  nome_etapa: string;
  data_prevista?: string;
  data_realizada?: string;
  status_etapa: string;
  quantidade_inscritos?: number;
  quantidade_aprovados_triagem?: number;
  quantidade_aprovados_avaliacao_online?: number;
  quantidade_convocados_entrevista?: number;
  quantidade_aprovados_finais?: number;
  gerou_banco: boolean;
  quantidade_banco?: number;
  observacoes?: string;
  updated_at: string;
  updated_by: string;
  version: number;
}

export interface BancoCandidato {
  id: string;
  vaga_id?: string;
  referencia_edital?: string;
  unidade_id: string;
  cargo: string;
  nome_candidato: string;
  status_banco: string;
  data_inclusao: string;
  data_convocacao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
  version: number;
}

export interface Convocacao {
  id: string;
  vaga_id: string;
  candidato_id: string;
  unidade_id: string;
  cargo: string;
  data_convocacao: string;
  status_convocacao: string;
  devolutiva?: string;
  responsavel_id: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
  version: number;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  modulo_origem: string;
  referencia_id: string;
  responsavel_id: string;
  prazo: string;
  status: string;
  prioridade: string;
  criado_por: string;
  criado_em: string;
}

export interface Alerta {
  id: string;
  titulo: string;
  mensagem: string;
  lido: boolean;
  user_id: string;
  created_at: string;
}

export interface AuditoriaLog {
  id: string;
  modulo: string;
  registro_id: string;
  acao: string;
  usuario_id: string;
  data_hora: string;
  valor_anterior?: any;
  valor_novo?: any;
  contexto_adicional?: any;
}
