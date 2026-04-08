import { useAdminStore } from '@/store/adminStore';
import { UserProfile } from '@/types/auth';

const FULL_ACCESS_PROFILES: UserProfile[] = ['Admin', 'Gerência'];

export function usePermissions() {
  const { currentUser } = useAdminStore();

  const hasFullAccess = currentUser ? FULL_ACCESS_PROFILES.includes(currentUser.perfil) : false;

  return {
    canImport: () => hasFullAccess || (currentUser?.pode_incluir_registros ?? false),
    canManageUsers: () => hasFullAccess || (currentUser?.pode_gerenciar_usuarios ?? false),
    canDeleteRecords: () => hasFullAccess || (currentUser?.pode_excluir_requisicoes ?? false),
    canEditSettings: () => hasFullAccess || (currentUser?.pode_editar_configuracoes ?? false),
    canAccessAdmin: () => hasFullAccess || (currentUser?.pode_gerenciar_usuarios ?? false) || (currentUser?.pode_editar_configuracoes ?? false),
    canIncludeRecords: () => hasFullAccess || (currentUser?.pode_incluir_registros ?? false),
    currentUser,
    hasFullAccess,
  };
}
