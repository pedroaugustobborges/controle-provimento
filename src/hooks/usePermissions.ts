import { useAdminStore } from '@/store/adminStore';
import { UserProfile } from '@/types/auth';

const FULL_ACCESS_PROFILES: UserProfile[] = ['Admin', 'Administrador', 'Gerência', 'Gestão'];

export function usePermissions() {
  const { currentUser } = useAdminStore();

  const hasFullAccess = currentUser ? FULL_ACCESS_PROFILES.includes(currentUser.perfil) : false;
  const perfil = currentUser?.perfil;

  return {
    canImport: () => hasFullAccess || perfil === 'Analista administrativo' || (currentUser?.pode_incluir_registros ?? false),
    canManageUsers: () => hasFullAccess || (currentUser?.pode_gerenciar_usuarios ?? false),
    canDeleteRecords: () => hasFullAccess || (currentUser?.pode_excluir_requisicoes ?? false),
    canEditSettings: () => hasFullAccess || (currentUser?.pode_editar_configuracoes ?? false),
    canAccessAdmin: () => hasFullAccess || perfil === 'Analista administrativo' || (currentUser?.pode_gerenciar_usuarios ?? false) || (currentUser?.pode_editar_configuracoes ?? false),
    canIncludeRecords: () => hasFullAccess || perfil === 'Analista administrativo' || perfil === 'Analista do edital' || (currentUser?.pode_incluir_registros ?? false),
    canUpdateVagaStatus: () => hasFullAccess || perfil === 'Analista da unidade' || perfil === 'Analista administrativo',
    canManageConvocacoes: () => hasFullAccess || perfil === 'Analista de convocações' || perfil === 'Analista administrativo',
    canManageEditais: () => hasFullAccess || perfil === 'Analista do edital' || perfil === 'Analista administrativo',
    isAssistant: () => perfil === 'Assistente',
    isUnitAnalyst: () => perfil === 'Analista da unidade',
    isEditalAnalyst: () => perfil === 'Analista do edital',
    isAdminAnalyst: () => perfil === 'Analista administrativo',
    isConvAnalyst: () => perfil === 'Analista de convocações',
    isManagement: () => perfil === 'Gestão' || perfil === 'Gerência',
    currentUser,
    hasFullAccess,
  };
}
