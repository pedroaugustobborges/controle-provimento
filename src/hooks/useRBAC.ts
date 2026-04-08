import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserProfile, Permissions } from '../types/auth';

export function useRBAC() {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    },
  });

  const hasRole = (role: UserProfile | UserProfile[]) => {
    if (!userData) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(userData.perfil as UserProfile);
  };

  const isAdmin = userData?.perfil === 'Administrador';
  const isManagement = userData?.perfil === 'Gestão' || userData?.perfil === 'Gerência';

  const getPermissions = (module: string): Permissions => {
    if (isAdmin) return { canRead: true, canCreate: true, canEdit: true, canValidate: true, canDelete: true, canAudit: true };
    
    const perms: Permissions = {
      canRead: true,
      canCreate: false,
      canEdit: false,
      canValidate: false,
      canDelete: false,
      canAudit: isManagement,
    };

    const perfil = userData?.perfil as UserProfile;

    switch (module) {
      case 'vagas':
        if (perfil === 'Analista da unidade') perms.canEdit = true;
        if (perfil === 'Analista do edital') perms.canRead = true;
        break;
      case 'editais':
        if (perfil === 'Analista do edital') perms.canCreate = perms.canEdit = true;
        if (perfil === 'Analista administrativo') perms.canValidate = true;
        break;
      case 'banco':
        if (perfil === 'Assistente') perms.canEdit = true;
        if (perfil === 'Analista de convocações') perms.canRead = true;
        break;
      case 'convocacoes':
        if (perfil === 'Analista de convocações') perms.canCreate = perms.canEdit = true;
        break;
    }

    return perms;
  };

  return {
    userData,
    isLoading,
    hasRole,
    isAdmin,
    isManagement,
    getPermissions,
  };
}
