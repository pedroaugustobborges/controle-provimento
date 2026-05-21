import { useRBAC } from './useRBAC';

export function usePermissions() {
  const { userData, isAdmin, isManagement, isFullAccessProfile, getPermissions } = useRBAC();

  const perfil = userData?.perfil?.toLowerCase() || '';
  const canAdmin = isAdmin || perfil === 'analista administrativo';

  return {
    canImport: () => canAdmin,
    canViewAudit: () => canAdmin,
    canViewDiagnostics: () => canAdmin,
    canManageUsers: () => isAdmin || (userData?.pode_gerenciar_usuarios ?? false),
    canDeleteRecords: () => isFullAccessProfile || (userData?.pode_excluir_requisicoes ?? false),
    canDirectEdit: () => isFullAccessProfile,
    canRequestUpdate: () => !isFullAccessProfile,
    canEditSettings: () => isAdmin || (userData?.pode_editar_configuracoes ?? false),
    canAccessAdmin: () => canAdmin || (userData?.pode_gerenciar_usuarios ?? false) || (userData?.pode_editar_configuracoes ?? false),
    canIncludeRecords: () => canAdmin || perfil === 'analista do edital' || (userData?.pode_incluir_registros ?? false),
    canUpdateVagaStatus: () => canAdmin || perfil === 'analista da unidade',
    canManageConvocacoes: () => canAdmin || perfil === 'analista de convocações',
    canManageEditais: () => canAdmin || perfil === 'analista do edital',
    isAssistant: () => perfil === 'assistente',
    isUnitAnalyst: () => perfil === 'analista da unidade',
    isEditalAnalyst: () => perfil === 'analista do edital',
    isAdminAnalyst: () => perfil === 'analista administrativo',
    isConvAnalyst: () => perfil === 'analista de convocações',
    isManagement: () => isManagement,
    currentUser: userData,
    hasFullAccess: isAdmin,
    getPermissions,
  };
}
