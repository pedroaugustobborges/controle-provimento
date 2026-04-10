import { User, AuditLog, SupportConfig, BackupRecord } from '@/types/auth';

export const mockUsers: User[] = [
  {
    id: '1',
    nome_completo: 'Admin Master',
    email: 'admin@sistema.com',
    perfil: 'Admin',
    cargo: 'Gerente de TI',
    status: 'ativo',
    visualiza_todas_unidades: true,
    unidades_vinculadas: [
      'CRER', 'AGIR', 'HUGOL', 'HECAD', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'TEIA APARECIDA', 'TEIA GOIÂNIA', 'TEIA CANEDO',
      'SÃO PEDRO', 'SUÁ', 'BENTO FERREIRA', 'SERRA',
      'Hospital Central (GO)', 'Hospital das Clínicas'
    ],
    pode_incluir_registros: true,
    pode_excluir_requisicoes: true,
    pode_editar_configuracoes: true,
    pode_gerenciar_usuarios: true,
    ultimo_acesso: '2025-05-15 10:30'
  },
  {
    id: '2',
    nome_completo: 'Maria Silva',
    email: 'maria.silva@hospital.com',
    perfil: 'Analista',
    cargo: 'Analista de RH',
    status: 'ativo',
    visualiza_todas_unidades: false,
    unidades_vinculadas: ['HUGOL', 'HECAD', 'SÃO PEDRO'],
    pode_incluir_registros: true,
    pode_excluir_requisicoes: false,
    pode_editar_configuracoes: false,
    pode_gerenciar_usuarios: false,
    ultimo_acesso: '2025-05-15 09:15'
  },
  {
    id: '3',
    nome_completo: 'João Assistente',
    email: 'joao.assistente@hospital.com',
    perfil: 'Assistente',
    cargo: 'Assistente Administrativo',
    status: 'ativo',
    visualiza_todas_unidades: false,
    unidades_vinculadas: ['CRER'],
    pode_incluir_registros: false,
    pode_excluir_requisicoes: false,
    pode_editar_configuracoes: false,
    pode_gerenciar_usuarios: false,
    ultimo_acesso: '2025-05-14 16:45'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    usuario_nome: 'Admin Master',
    usuario_email: 'admin@sistema.com',
    perfil: 'Admin',
    data: '2025-05-15',
    hora: '10:30',
    acao: 'Login',
    modulo: 'Autenticação',
    registro_afetado: 'Sessão',
    ip: '192.168.1.1'
  },
  {
    id: '2',
    usuario_nome: 'Maria Silva',
    usuario_email: 'maria.silva@hospital.com',
    perfil: 'Analista',
    data: '2025-05-15',
    hora: '09:45',
    acao: 'Alteração de Status',
    modulo: 'Vagas',
    registro_afetado: 'REQ-2025-001',
    valor_anterior: 'aberta',
    valor_novo: 'em_edital'
  }
];

export const mockSupportConfigs: SupportConfig[] = [
  {
    id: '1',
    regiao: 'Goiás (GO)',
    responsavel: 'Ricardo Oliveira',
    email: 'suporte.go@sistema.com',
    teams_user: 'ricardo.oliveira.teams',
    mensagem: 'Atendimento das 08:00 às 18:00.',
    status: 'ativo',
    unidades: ['CRER', 'AGIR', 'HUGOL', 'HECAD', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'TEIA APARECIDA', 'TEIA GOIÂNIA', 'TEIA CANEDO']
  },
  {
    id: '2',
    regiao: 'Espírito Santo (ES)',
    responsavel: 'Fernanda Souza',
    email: 'suporte.es@sistema.com',
    teams_user: 'fernanda.souza.teams',
    mensagem: 'Suporte remoto especializado.',
    status: 'ativo',
    unidades: ['SÃO PEDRO', 'SUÁ', 'BENTO FERREIRA', 'SERRA']
  }
];

export const mockBackups: BackupRecord[] = [
  {
    id: '1',
    data_hora: '2025-05-15 11:00',
    status: 'sucesso',
    quantidade_registros: 1250
  },
  {
    id: '2',
    data_hora: '2025-05-15 10:30',
    status: 'sucesso',
    quantidade_registros: 1248
  }
];
