import { create } from 'zustand';
import { User, AuditLog, SupportConfig, BackupRecord } from '@/types/auth';
import { mockUsers, mockAuditLogs, mockSupportConfigs, mockBackups } from '@/data/adminMockData';

interface AdminState {
  users: User[];
  auditLogs: AuditLog[];
  supportConfigs: SupportConfig[];
  backups: BackupRecord[];
  currentUser: User | null;
  selectedRegion: string;
  selectedUnit: string;
  
  // User actions
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedUnit: (unit: string) => void;
  
  // Audit actions
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  
  // Support actions
  addSupportConfig: (config: SupportConfig) => void;
  updateSupportConfig: (id: string, data: Partial<SupportConfig>) => void;
  
  // Backup actions
  generateBackup: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: mockUsers,
  auditLogs: mockAuditLogs,
  supportConfigs: mockSupportConfigs,
  backups: mockBackups,
  currentUser: mockUsers[0], // Simulando admin logado
  
  addUser: (user) => set((s) => ({ users: [user, ...s.users] })),
  updateUser: (id, data) => set((s) => ({
    users: s.users.map((u) => u.id === id ? { ...u, ...data } : u),
  })),
  deleteUser: (id) => set((s) => ({
    users: s.users.filter((u) => u.id !== id),
  })),
  setCurrentUser: (user) => set({ currentUser: user }),
  
  addAuditLog: (log) => set((s) => {
    const newLog: AuditLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9)
    };
    return { auditLogs: [newLog, ...s.auditLogs] };
  }),
  
  addSupportConfig: (config) => set((s) => ({ supportConfigs: [config, ...s.supportConfigs] })),
  updateSupportConfig: (id, data) => set((s) => ({
    supportConfigs: s.supportConfigs.map((c) => c.id === id ? { ...c, ...data } : c),
  })),
  
  generateBackup: () => set((s) => {
    const newBackup: BackupRecord = {
      id: Math.random().toString(36).substr(2, 9),
      data_hora: new Date().toLocaleString(),
      status: 'sucesso',
      quantidade_registros: 1250 // Mock value
    };
    return { backups: [newBackup, ...s.backups] };
  }),
}));
