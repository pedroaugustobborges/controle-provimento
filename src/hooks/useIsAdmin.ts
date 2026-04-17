import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se o usuário atual é admin via tabela user_roles (role = 'admin').
 * Considera também perfil "Administrador" em profiles como fallback.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      // 1) Tenta via user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        if (!cancelled) setIsAdmin(true);
        return;
      }

      // 2) Fallback: profiles.perfil = Administrador / Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('perfil')
        .eq('id', userId)
        .maybeSingle();

      const perfilAdmin = profile?.perfil === 'Administrador' || profile?.perfil === 'Admin';
      if (!cancelled) setIsAdmin(!!perfilAdmin);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
