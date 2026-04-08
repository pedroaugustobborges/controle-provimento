import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type UserProfile = 
  | 'Assistente' 
  | 'Analista da Unidade' 
  | 'Analista do Edital' 
  | 'Analista das Convocações' 
  | 'Analista Administrativo' 
  | 'Supervisão / Coordenação / Gestão' 
  | 'Administrador';

export interface Permissions {
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canValidate: boolean;
  canDelete: boolean;
  canAudit: boolean;
}

export function useRBAC() {
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: roles, error } = await supabase
        .from('usuarios_perfis')
        .select(`
          perfil:perfis (nome)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return roles?.map(r => (r.perfil as any).nome) as UserProfile[];
    },
  });

  const hasRole = (role: UserProfile | UserProfile[]) => {
    if (!userRoles) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => userRoles.includes(r));
  };

  const isAdmin = hasRole('Administrador');
  const isSupervisor = hasRole('Supervisão / Coordenação / Gestão');

  const getPermissions = (module: string): Permissions => {
    // Basic implementation of permissions based on roles
    if (isAdmin) return { canRead: true, canCreate: true, canEdit: true, canValidate: true, canDelete: true, canAudit: true };
    if (isSupervisor) return { canRead: true, canCreate: true, canEdit: true, canValidate: true, canDelete: false, canAudit: true };

    const perms: Permissions = {
      canRead: true,
      canCreate: false,
      canEdit: false,
      canValidate: false,
      canDelete: false,
      canAudit: false,
    };

    if (module === 'vagas') {
      if (hasRole('Analista da Unidade')) perms.canEdit = true;
      if (hasRole('Analista do Edital')) perms.canRead = true;
    }

    if (module === 'editais') {
      if (hasRole('Analista do Edital')) perms.canCreate = perms.canEdit = true;
      if (hasRole('Analista Administrativo')) perms.canValidate = true;
    }

    if (module === 'banco') {
      if (hasRole('Assistente')) perms.canEdit = true;
      if (hasRole('Analista das Convocações')) perms.canRead = true;
    }

    if (module === 'convocacoes') {
      if (hasRole('Analista das Convocações')) perms.canCreate = perms.canEdit = true;
    }

    return perms;
  };

  return {
    userRoles,
    isLoading,
    hasRole,
    isAdmin,
    isSupervisor,
    getPermissions,
  };
}
