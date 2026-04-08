export type UserProfile = 
  | 'Analista da unidade' 
  | 'Analista do edital' 
  | 'Analista administrativo' 
  | 'Assistente' 
  | 'Analista de convocações' 
  | 'Gestão' 
  | 'Gerência'
  | 'Administrador'
  | 'Analista' | 'Supervisão' | 'Coordenação' | 'Admin';

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
  nome_completo: string;
  email: string;
  perfil: UserProfile;
  cargo?: string;
  status: 'ativo' | 'inativo';
  visualiza_todas_unidades: boolean;
  unidades_vinculadas: string[];
  pode_incluir_registros: boolean;
  pode_excluir_requisicoes: boolean;
  pode_editar_configuracoes: boolean;
  pode_gerenciar_usuarios: boolean;
  ultimo_acesso?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  usuario_id?: string;
  usuario_nome: string;
  perfil?: string;
  data?: string;
  hora?: string;
  acao: string;
  modulo: string;
  registro_afetado: string;
  valor_anterior?: any;
  valor_novo?: any;
  created_at?: string;
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
