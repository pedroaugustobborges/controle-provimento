export type UserProfile = 
  | 'Analista de RH'
  | 'Assistente de RH'
  | 'Analista Administrativo'
  | 'Analista de Edital'
  | 'Analista das Convocações'
  | 'Supervisão'
  | 'Coordenação'
  | 'Administrador'
  | 'Visualizador'
  // Legacy compatibility
  | 'Analista da unidade' 
  | 'Analista do edital' 
  | 'Analista administrativo' 
  | 'Assistente' 
  | 'Analista de convocações' 
  | 'Gestão' 
  | 'Gerência'
  | 'Usuário da Unidade'
  | 'Ponta'
  | 'Analista' | 'Admin';

export const PERFIS_ACESSO: { value: string; label: string }[] = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Analista de RH', label: 'Analista de RH' },
  { value: 'Assistente de RH', label: 'Assistente de RH' },
  { value: 'Analista Administrativo', label: 'Analista Administrativo' },
  { value: 'Analista de Edital', label: 'Analista de Edital' },
  { value: 'Analista das Convocações', label: 'Analista das Convocações' },
  { value: 'Supervisão', label: 'Supervisão' },
  { value: 'Coordenação', label: 'Coordenação' },
  { value: 'Visualizador', label: 'Visualizador' },
];

export const CARGOS_HIERARQUICOS: string[] = [
  'Analista de RH',
  'Assistente de RH',
  'Analista Administrativo',
  'Analista de Edital',
  'Analista das Convocações',
  'Supervisor(a)',
  'Coordenador(a)',
  'Gerente',
  'Diretor(a)',
  'Administrador do Sistema',
];

export const STATUS_USUARIO = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'suspenso', label: 'Suspenso', color: 'bg-amber-100 text-amber-700' },
  { value: 'inativo', label: 'Inativo', color: 'bg-slate-100 text-slate-500' },
] as const;

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
  status: 'ativo' | 'inativo' | 'suspenso';
  avatar_url?: string;
  visualiza_todas_unidades: boolean;
  unidades_vinculadas: string[];
  modulos_acesso?: string[];
  permissoes_modulo?: Record<string, 'read' | 'edit'>;
  pode_incluir_registros: boolean;
  pode_excluir_requisicoes: boolean;
  pode_editar_configuracoes: boolean;
  pode_gerenciar_usuarios: boolean;
  ultimo_acesso?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  usuario_id?: string;
  usuario_nome: string;
  usuario_email?: string;
  perfil?: string;
  data?: string;
  hora?: string;
  acao: string;
  modulo: string;
  registro_afetado: string;
  valor_anterior?: any;
  valor_novo?: any;
  created_at?: string;
  ip?: string;
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

export interface Feedback {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  tipo: 'sugestao' | 'problema' | 'melhoria';
  mensagem: string;
  status: 'pendente' | 'lido' | 'respondido';
  created_at: string;
  updated_at: string;
}
