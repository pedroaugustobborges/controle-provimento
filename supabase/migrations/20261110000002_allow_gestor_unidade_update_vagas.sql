-- Allow 'Gestor de Unidade' profile to update vagas (required for APROVAÇÃO DA UNIDADE).
-- Also backfills the user_roles table for existing Gestor de Unidade users who may have
-- been created before the role-mapping fallback was in place.

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
          'Analista', 'Analista de RH', 'Assistente', 'Gestão', 'Gestor',
          'Gestor de Unidade'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role::text IN ('admin', 'analista', 'assistente', 'gestor')
        )
      )
  );
$$;

-- Backfill: give every existing 'Gestor de Unidade' the 'gestor' role so the
-- user_roles branch of the function also covers them going forward.
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'gestor'
FROM public.profiles p
WHERE p.perfil = 'Gestor de Unidade'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'gestor'
  );
