import { create } from 'zustand';
import { User, AuditLog, SupportConfig, BackupRecord, Feedback } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

interface AdminState {
  users: User[];
  auditLogs: AuditLog[];
  supportConfigs: SupportConfig[];
  backups: BackupRecord[];
  feedbacks: Feedback[];
  currentUser: User | null;
  selectedRegion: string;
  selectedUnit: string;
  selectedUnits: string[];
  loading: boolean;

  // Data fetching
  fetchUsers: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchFeedbacks: () => Promise<void>;
  fetchCurrentProfile: () => Promise<void>;

  // User actions via edge function
  addUser: (user: Partial<User> & { email: string; password: string; sendWelcomeEmail?: boolean }) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUserStatus: (id: string, status: 'ativo' | 'suspenso' | 'inativo') => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  sendWelcomeEmail: (userId: string, password: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedUnit: (unit: string) => void;
  setSelectedUnits: (units: string[]) => void;

  // Feedback actions
  updateFeedbackStatus: (id: string, status: 'pendente' | 'lido' | 'respondido') => Promise<void>;

  // Audit actions
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;

  // Support actions (still local for now)
  addSupportConfig: (config: SupportConfig) => void;
  updateSupportConfig: (id: string, data: Partial<SupportConfig>) => void;

  // Backup actions
  generateBackup: () => void;

  // Legacy compat
  toggleUserStatus: (id: string) => Promise<void>;
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
    id: '2', regiao: 'OUTRAS UNIDADES', responsavel: 'Fernanda Souza',
    email: 'suporte.es@sistema.com', teams_user: 'fernanda.souza.teams',
    mensagem: 'Suporte remoto especializado.', status: 'ativo', unidades: FORA_UNITS
  }
];

function generateTempPassword(): string {
  const nums = Math.floor(1000 + Math.random() * 9000);
  return `agirprovimento${nums}`;
}

export { generateTempPassword };

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  auditLogs: [],
  supportConfigs: defaultSupportConfigs,
  backups: [],
  feedbacks: [],
  currentUser: null,
  selectedRegion: 'all',
  selectedUnit: 'all',
  selectedUnits: ['all'],
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

  fetchFeedbacks: async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ feedbacks: (data || []) as Feedback[] });
    } catch (err) {
      console.error('Erro ao buscar feedbacks:', err);
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
      if (profile) set({ currentUser: profile as User });
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  },

  addUser: async (userData) => {
    const { email, password, sendWelcomeEmail, ...profileData } = userData;

    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: {
        action: 'create_user',
        email,
        password,
        nome_completo: profileData.nome_completo || '',
        perfil: profileData.perfil || 'Analista de RH',
        cargo: profileData.cargo || '',
        status: profileData.status || 'ativo',
        visualiza_todas_unidades: profileData.visualiza_todas_unidades || false,
        unidades_vinculadas: profileData.unidades_vinculadas || [],
        modulos_acesso: profileData.modulos_acesso || [],
        permissoes_modulo: profileData.permissoes_modulo || {},
        avatar_url: profileData.avatar_url || null,
        pode_incluir_registros: profileData.pode_incluir_registros || false,
        pode_excluir_requisicoes: profileData.pode_excluir_requisicoes || false,
        pode_editar_configuracoes: profileData.pode_editar_configuracoes || false,
        pode_gerenciar_usuarios: profileData.pode_gerenciar_usuarios || false,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Send welcome email if requested
    if (sendWelcomeEmail && data?.user_id) {
      try {
        await get().sendWelcomeEmail(data.user_id, password);
      } catch (e) {
        console.error('Erro ao enviar e-mail de boas-vindas:', e);
      }
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
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'delete_user', user_id: id },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await get().fetchUsers();
  },

  updateUserStatus: async (id, status) => {
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'update_status', user_id: id, new_status: status },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await get().fetchUsers();
  },

  toggleUserStatus: async (id) => {
    const user = get().users.find(u => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    await get().updateUserStatus(id, newStatus);
  },

  resetUserPassword: async (userId, newPassword) => {
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'reset_password', user_id: userId, new_password: newPassword },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  },

  sendWelcomeEmail: async (userId, password) => {
    const user = get().users.find(u => u.id === userId);
    if (!user) {
      // Refetch and try again
      await get().fetchUsers();
      const u = get().users.find(u => u.id === userId);
      if (!u) throw new Error('Usuário não encontrado');
    }
    const targetUser = get().users.find(u => u.id === userId)!;
    
    const siteUrl = window.location.origin;
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: {
        action: 'send_welcome_email',
        user_email: targetUser.email,
        user_name: targetUser.nome_completo,
        password,
        site_url: siteUrl,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  },

  updateFeedbackStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await get().fetchFeedbacks();
    } catch (err) {
      console.error('Erro ao atualizar status do feedback:', err);
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedRegion: (region) => set({ selectedRegion: region, selectedUnits: ['all'], selectedUnit: 'all' }),
  setSelectedUnit: (unit) => set({ selectedUnit: unit }),
  setSelectedUnits: (units) => set({ selectedUnits: units }),

  addAuditLog: async (log) => {
    try {
      const newLog = {
        usuario_id: get().currentUser?.id,
        usuario_nome: log.usuario_nome,
        usuario_email: log.usuario_email || '',
        perfil: log.perfil || '',
        acao: log.acao,
        modulo: log.modulo,
        registro_afetado: log.registro_afetado,
        valor_anterior: log.valor_anterior,
        valor_novo: log.valor_novo,
        ip: log.ip || '',
      };
      
      const { data, error } = await supabase.from('audit_logs').insert(newLog).select().single();
      
      if (error) throw error;
      
      // Update local state to show the log immediately
      if (data) {
        set((s) => ({ auditLogs: [data as AuditLog, ...s.auditLogs].slice(0, 100) }));
      }
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
