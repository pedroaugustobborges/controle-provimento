import { create } from 'zustand';
import { User, AuditLog, SupportConfig, BackupRecord } from '@/types/auth';
import { supabase } from '@/lib/supabase';

interface AdminState {
  users: User[];
  auditLogs: AuditLog[];
  supportConfigs: SupportConfig[];
  backups: BackupRecord[];
  currentUser: User | null;
  selectedRegion: string;
  selectedUnit: string;
  loading: boolean;

  // Data fetching
  fetchUsers: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchCurrentProfile: () => Promise<void>;

  // User actions
  addUser: (user: Partial<User> & { email: string; password: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedUnit: (unit: string) => void;

  // Audit actions
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;

  // Support actions (still local for now)
  addSupportConfig: (config: SupportConfig) => void;
  updateSupportConfig: (id: string, data: Partial<SupportConfig>) => void;

  // Backup actions
  generateBackup: () => void;
}

const GO_VIT_UNITS = [
  'HECAD', 'CRER', 'AGIR', 'HUGOL', 'HDS', 'POLICLÍNICA', 'JATAÍ', 'VITÓRIA (SÃO PEDRO/SUÁ)',
  'TEIA ANAPOLIS', 'TEIA CANEDO', 'TEIA APARECIDA', 'TEIA GOIÂNIA'
];
const FORA_UNITS = [
  'DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3'
];

const defaultSupportConfigs: SupportConfig[] = [
  {
    id: '1', regiao: 'Goiás e Vitória', responsavel: 'Ricardo Oliveira',
    email: 'suporte.go@sistema.com', teams_user: 'ricardo.oliveira.teams',
    mensagem: 'Atendimento das 08:00 às 18:00.', status: 'ativo', unidades: GO_VIT_UNITS
  },
  {
    id: '2', regiao: 'Unidades de Fora', responsavel: 'Fernanda Souza',
    email: 'suporte.es@sistema.com', teams_user: 'fernanda.souza.teams',
    mensagem: 'Suporte remoto especializado.', status: 'ativo', unidades: FORA_UNITS
  }
];

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  auditLogs: [],
  supportConfigs: defaultSupportConfigs,
  backups: [],
  currentUser: null,
  selectedRegion: 'all',
  selectedUnit: 'all',
  loading: false,

  fetchUsers: async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ users: (data || []) as User[] });
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    }
  },

  fetchAuditLogs: async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      set({ auditLogs: (data || []) as AuditLog[] });
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    }
  },

  fetchCurrentProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (profile) {
        set({ currentUser: profile as User });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  },

  addUser: async (userData) => {
    // Create auth user via Supabase Admin (uses service role in edge function)
    // For now, use signUp directly — the admin will need to create users
    const { email, password, ...profileData } = userData;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: password || 'TempPassword123!',
      options: {
        data: {
          nome_completo: profileData.nome_completo || '',
        },
      },
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha ao criar usuário');

    // Update profile with additional data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nome_completo: profileData.nome_completo || '',
        perfil: profileData.perfil || 'Analista de RH',
        cargo: profileData.cargo || '',
        status: 'ativo',
        visualiza_todas_unidades: profileData.visualiza_todas_unidades || false,
        unidades_vinculadas: profileData.unidades_vinculadas || [],
        pode_incluir_registros: profileData.pode_incluir_registros || false,
        pode_excluir_requisicoes: profileData.pode_excluir_requisicoes || false,
        pode_editar_configuracoes: profileData.pode_editar_configuracoes || false,
        pode_gerenciar_usuarios: profileData.pode_gerenciar_usuarios || false,
      })
      .eq('id', authData.user.id);

    if (profileError) console.error('Erro ao atualizar perfil:', profileError);

    // If admin, add role
    if (profileData.perfil === 'Administrador' || profileData.perfil === 'Admin') {
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'admin',
      });
    }

    await get().fetchUsers();
  },

  updateUser: async (id, data) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    await get().fetchUsers();
  },

  deleteUser: async (id) => {
    // Delete profile (auth user deletion requires admin API/edge function)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await get().fetchUsers();
  },

  toggleUserStatus: async (id) => {
    const user = get().users.find(u => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    await get().updateUser(id, { status: newStatus });
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedUnit: (unit) => set({ selectedUnit: unit }),

  addAuditLog: async (log) => {
    try {
      await supabase.from('audit_logs').insert({
        usuario_nome: log.usuario_nome,
        usuario_email: log.usuario_email || '',
        perfil: log.perfil || '',
        acao: log.acao,
        modulo: log.modulo,
        registro_afetado: log.registro_afetado,
        valor_anterior: log.valor_anterior,
        valor_novo: log.valor_novo,
        ip: log.ip || '',
      });
    } catch (err) {
      console.error('Erro ao salvar log de auditoria:', err);
    }
  },

  addSupportConfig: (config) => set((s) => ({ supportConfigs: [config, ...s.supportConfigs] })),
  updateSupportConfig: (id, data) => set((s) => ({
    supportConfigs: s.supportConfigs.map((c) => c.id === id ? { ...c, ...data } : c),
  })),

  generateBackup: () => set((s) => {
    const newBackup: BackupRecord = {
      id: Math.random().toString(36).substr(2, 9),
      data_hora: new Date().toLocaleString(),
      status: 'sucesso',
      quantidade_registros: s.users.length
    };
    return { backups: [newBackup, ...s.backups] };
  }),
}));
