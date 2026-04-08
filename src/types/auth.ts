export type UserProfile = 
  | 'Analista da unidade' 
  | 'Analista do edital' 
  | 'Analista administrativo' 
  | 'Assistente' 
  | 'Analista de convocações' 
  | 'Gestão' 
  | 'Gerência'
  | 'Administrador';

export interface Permissions {
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canValidate: boolean;
  canDelete: boolean;
  canAudit: boolean;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  unidade_id?: string;
  status: 'ativo' | 'inativo';
  pode_incluir_registros: boolean;
  pode_excluir_requisicoes: boolean;
  pode_editar_configuracoes: boolean;
  pode_gerenciar_usuarios: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  acao: string;
  modulo: string;
  registro_id?: string;
  valor_anterior?: any;
  valor_novo?: any;
  created_at: string;
}

export interface SupportConfig {
  id: string;
  regiao: string;
  responsavel: string;
  email: string;
  teams_user: string;
  mensagem: string;
  status: 'ativo' | 'inativo';
  unidades: string[];
}

export interface BackupRecord {
  id: string;
  data_hora: string;
  status: 'sucesso' | 'erro';
  quantidade_registros: number;
}
