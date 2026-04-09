import { useRBAC } from './useRBAC';

export function usePermissions() {
  const { userData, isAdmin, isManagement, getPermissions } = useRBAC();

  const perfil = userData?.perfil;

  return {
    canImport: () => isAdmin || perfil === 'Analista administrativo' || (userData?.pode_incluir_registros ?? false),
    canViewAudit: () => isAdmin,
    canViewDiagnostics: () => isAdmin,
    canManageUsers: () => isAdmin || (userData?.pode_gerenciar_usuarios ?? false),
    canDeleteRecords: () => isAdmin || (userData?.pode_excluir_requisicoes ?? false),
    canEditSettings: () => isAdmin || (userData?.pode_editar_configuracoes ?? false),
    canAccessAdmin: () => isAdmin || perfil === 'Analista administrativo' || (userData?.pode_gerenciar_usuarios ?? false) || (userData?.pode_editar_configuracoes ?? false),
    canIncludeRecords: () => isAdmin || perfil === 'Analista administrativo' || perfil === 'Analista do edital' || (userData?.pode_incluir_registros ?? false),
    canUpdateVagaStatus: () => isAdmin || perfil === 'Analista da unidade' || perfil === 'Analista administrativo',
    canManageConvocacoes: () => isAdmin || perfil === 'Analista de convocações' || perfil === 'Analista administrativo',
    canManageEditais: () => isAdmin || perfil === 'Analista do edital' || perfil === 'Analista administrativo',
    isAssistant: () => perfil === 'Assistente',
    isUnitAnalyst: () => perfil === 'Analista da unidade',
    isEditalAnalyst: () => perfil === 'Analista do edital',
    isAdminAnalyst: () => perfil === 'Analista administrativo',
    isConvAnalyst: () => perfil === 'Analista de convocações',
    isManagement: () => isManagement,
    currentUser: userData,
    hasFullAccess: isAdmin,
  };
}
