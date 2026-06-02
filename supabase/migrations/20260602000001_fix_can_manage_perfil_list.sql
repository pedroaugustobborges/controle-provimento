-- Fix: add "Administrador do Sistema" to can_manage_recruitment_data perfil list.
-- The previous list only included 'Administrador', causing users with the
-- "Administrador do Sistema" perfil to be blocked from INSERT/UPDATE by RLS.

CREATE OR REPLACE FUNCTION public.can_manage_recruitment_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND COALESCE(p.status, 'ativo') = 'ativo'
      AND (
        COALESCE(p.pode_incluir_registros, false)
        OR COALESCE(p.pode_editar_configuracoes, false)
        OR COALESCE(p.pode_gerenciar_usuarios, false)
        OR COALESCE(p.visualiza_todas_unidades, false)
        OR LOWER(COALESCE(p.perfil, '')) LIKE '%administrador%'
        OR LOWER(COALESCE(p.perfil, '')) LIKE '%admin%'
        OR COALESCE(p.perfil, '') IN (
          'Analista', 'Analista de RH', 'Assistente', 'Gestão', 'Gestor'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role::text IN ('admin', 'analista', 'assistente', 'gestor')
        )
      )
  );
$$;
