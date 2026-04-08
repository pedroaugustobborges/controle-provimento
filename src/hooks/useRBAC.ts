import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserProfile, Permissions, User } from '../types/auth';
import { useAdminStore } from '@/store/adminStore';

export function useRBAC() {
  const mockUser = useAdminStore((s) => s.currentUser);
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async (): Promise<User | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return mockUser; // Return mock for local dev/testing if not logged in

        const { data: profile, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !profile) {
          return mockUser; // Fallback to mock
        }
        return profile as User;
      } catch (e) {
        return mockUser; // Fallback to mock on any error
      }
    },
    initialData: mockUser // Start with mock
  });

  const hasRole = (role: UserProfile | UserProfile[]) => {
    const userToUse = userData || mockUser;
    if (!userToUse) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(userToUse.perfil as UserProfile);
  };

  const userToUse = userData || mockUser;
  const isAdmin = userToUse?.perfil === 'Administrador' || userToUse?.perfil === 'Admin';
  const isManagement = userToUse?.perfil === 'Gestão' || userToUse?.perfil === 'Gerência' || userToUse?.perfil === 'Supervisão' || userToUse?.perfil === 'Coordenação';

  const getPermissions = (module: string): Permissions => {
    if (isAdmin) {
      return { 
        canRead: true, 
        canCreate: true, 
        canEdit: true, 
        canValidate: true, 
        canDelete: true, 
        canAudit: true 
      };
    }
    
    const perms: Permissions = {
      canRead: true,
      canCreate: false,
      canEdit: false,
      canValidate: false,
      canDelete: false,
      canAudit: isManagement,
    };

    const perfil = userToUse?.perfil;

    switch (module) {
      case 'vagas':
        if (perfil === 'Analista da unidade') perms.canEdit = true;
        if (perfil === 'Analista do edital') perms.canRead = true;
        break;
      case 'editais':
        if (perfil === 'Analista do edital') {
          perms.canCreate = true;
          perms.canEdit = true;
        }
        if (perfil === 'Analista administrativo') perms.canValidate = true;
        break;
      case 'banco':
        if (perfil === 'Assistente') perms.canEdit = true;
        if (perfil === 'Analista de convocações') perms.canRead = true;
        break;
      case 'convocacoes':
        if (perfil === 'Analista de convocações') {
          perms.canCreate = true;
          perms.canEdit = true;
        }
        break;
    }

    return perms;
  };

  return {
    userData,
    isLoading,
    error,
    hasRole,
    isAdmin,
    isManagement,
    getPermissions,
  };
}
