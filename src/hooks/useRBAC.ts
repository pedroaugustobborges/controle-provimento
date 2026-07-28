import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserProfile, Permissions, User } from '../types/auth';
import { useAdminStore } from '@/store/adminStore';

export function useRBAC() {
  const currentUser = useAdminStore((s) => s.currentUser);

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['user_profile', currentUser?.id],
    queryFn: async (): Promise<User | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return currentUser;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !profile) {
          // Fallback to the latest store value (not a stale closure)
          return useAdminStore.getState().currentUser;
        }
        return profile as User;
      } catch (e) {
        return useAdminStore.getState().currentUser;
      }
    },
    initialData: currentUser,
    enabled: !!currentUser?.id,
  });

  // Prefer whichever object has a populated `perfil` field.
  // The query can return the minimal pre-populated user (id + email only,
  // no perfil) from Step 1 of fetchCurrentProfile, while `currentUser` in
  // the store may already have been updated to the full profile by Step 2.
  // Using `||` alone would short-circuit on the truthy-but-incomplete object.
  const userToUse = userData?.perfil
    ? userData
    : (currentUser?.perfil ? currentUser : (userData ?? currentUser));

  const hasRole = (role: UserProfile | UserProfile[]) => {
    if (!userToUse) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(userToUse.perfil as UserProfile);
  };

  const perfil = userToUse?.perfil?.toLowerCase() || '';

  const isAdmin = perfil === 'administrador' || perfil === 'admin';
  const isSupervisao = perfil === 'supervisão';
  const isManagement = ['gestão', 'gerência', 'coordenação'].includes(perfil);
  const isFullAccessProfile = isAdmin || isManagement || perfil === 'analista administrativo';

  const getPermissions = (module: string): Permissions => {
    if (isFullAccessProfile) {
      return { canRead: true, canCreate: true, canEdit: true, canValidate: true, canDelete: true, canAudit: true };
    }

    const perms: Permissions = {
      canRead: false, canCreate: false, canEdit: false,
      canValidate: false, canDelete: false, canAudit: isManagement,
    };

    if (!userToUse) return perms;

    if (userToUse.modulos_acesso?.includes(module)) {
      perms.canRead = true;
      const specificPerm = userToUse.permissoes_modulo?.[module];
      if (specificPerm === 'edit') {
        perms.canEdit = true;
        perms.canCreate = true;
        perms.canValidate = true;
      }
    } else if (!userToUse.modulos_acesso || userToUse.modulos_acesso.length === 0) {
      perms.canRead = true;
      const rawPerfil = userToUse?.perfil;

      switch (module) {
        case 'vagas':
          if (rawPerfil === 'Analista da unidade' || rawPerfil === 'Analista de RH') perms.canEdit = true;
          break;
        case 'editais':
        case 'publicacao':
          if (rawPerfil === 'Analista do edital' || rawPerfil === 'Analista de Edital') {
            perms.canCreate = true;
            perms.canEdit = true;
          }
          if (rawPerfil === 'Analista administrativo' || rawPerfil === 'Analista Administrativo') perms.canValidate = true;
          break;
        case 'banco':
          if (rawPerfil === 'Assistente' || rawPerfil === 'Assistente de RH') perms.canEdit = true;
          break;
        case 'convocacoes':
          if (rawPerfil === 'Analista de convocações' || rawPerfil === 'Analista das Convocações') {
            perms.canCreate = true;
            perms.canEdit = true;
          }
          break;
      }
    }

    return perms;
  };

  return {
    userData: userToUse,
    isLoading,
    error,
    hasRole,
    isAdmin,
    isSupervisao,
    isManagement,
    isFullAccessProfile,
    getPermissions,
  };
}
