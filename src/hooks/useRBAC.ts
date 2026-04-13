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

        if (error || !profile) return currentUser;
        return profile as User;
      } catch (e) {
        return currentUser;
      }
    },
    initialData: currentUser,
    enabled: !!currentUser?.id,
  });

  const userToUse = userData || currentUser;

  const hasRole = (role: UserProfile | UserProfile[]) => {
    if (!userToUse) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(userToUse.perfil as UserProfile);
  };

  const isAdmin = userToUse?.perfil?.toLowerCase() === 'administrador' || userToUse?.perfil?.toLowerCase() === 'admin';
  const isSupervisao = userToUse?.perfil?.toLowerCase() === 'supervisão';
  const isManagement = ['gestão', 'gerência', 'coordenação'].includes(userToUse?.perfil?.toLowerCase() || '');
  const isFullAccessProfile = isAdmin || isManagement || userToUse?.perfil?.toLowerCase() === 'analista administrativo';

  const getPermissions = (module: string): Permissions => {
    if (isFullAccessProfile) {
      return { canRead: true, canCreate: true, canEdit: true, canValidate: true, canDelete: true, canAudit: true };
    }
    
    const perms: Permissions = {
      canRead: false, canCreate: false, canEdit: false,
      canValidate: false, canDelete: false, canAudit: isManagement,
    };

    if (!userToUse) return perms;

    // Check if user has explicit module access
    if (userToUse.modulos_acesso?.includes(module)) {
      perms.canRead = true;
      const specificPerm = userToUse.permissoes_modulo?.[module];
      if (specificPerm === 'edit') {
        perms.canEdit = true;
        perms.canCreate = true;
        perms.canValidate = true;
      }
    } else if (!userToUse.modulos_acesso || userToUse.modulos_acesso.length === 0) {
      // Fallback for legacy users without modulos_acesso defined
      perms.canRead = true;
      const perfil = userToUse?.perfil;

      switch (module) {
        case 'vagas':
          if (perfil === 'Analista da unidade' || perfil === 'Analista de RH') perms.canEdit = true;
          break;
        case 'editais':
        case 'publicacao':
          if (perfil === 'Analista do edital' || perfil === 'Analista de Edital') {
            perms.canCreate = true;
            perms.canEdit = true;
          }
          if (perfil === 'Analista administrativo' || perfil === 'Analista Administrativo') perms.canValidate = true;
          break;
        case 'banco':
          if (perfil === 'Assistente' || perfil === 'Assistente de RH') perms.canEdit = true;
          break;
        case 'convocacoes':
          if (perfil === 'Analista de convocações' || perfil === 'Analista das Convocações') {
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
