CREATE OR REPLACE FUNCTION public.can_view_recruitment_data(_user_id uuid)
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
  );
$$;

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
        OR COALESCE(p.perfil, '') IN ('Admin', 'Administrador', 'Analista', 'Analista de RH', 'Assistente', 'Gestão', 'Gestor')
        OR public.has_role(_user_id, 'admin'::public.app_role)
        OR public.has_role(_user_id, 'analista'::public.app_role)
        OR public.has_role(_user_id, 'assistente'::public.app_role)
        OR public.has_role(_user_id, 'gestor'::public.app_role)
      )
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can view vagas" ON public.vagas;
DROP POLICY IF EXISTS "Authenticated users can insert vagas" ON public.vagas;
DROP POLICY IF EXISTS "Authenticated users can update vagas" ON public.vagas;

CREATE POLICY "Authenticated users can view vagas"
ON public.vagas
FOR SELECT
TO authenticated
USING (public.can_view_recruitment_data(auth.uid()));

CREATE POLICY "Authenticated users can insert vagas"
ON public.vagas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(created_by, ''), auth.uid()::text) = auth.uid()::text
  AND COALESCE(NULLIF(updated_by, ''), auth.uid()::text) = auth.uid()::text
);

CREATE POLICY "Authenticated users can update vagas"
ON public.vagas
FOR UPDATE
TO authenticated
USING (public.can_manage_recruitment_data(auth.uid()))
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(updated_by, ''), auth.uid()::text) = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can view banco" ON public.banco_candidatos;
DROP POLICY IF EXISTS "Authenticated users can insert banco" ON public.banco_candidatos;
DROP POLICY IF EXISTS "Authenticated users can update banco" ON public.banco_candidatos;

CREATE POLICY "Authenticated users can view banco"
ON public.banco_candidatos
FOR SELECT
TO authenticated
USING (public.can_view_recruitment_data(auth.uid()));

CREATE POLICY "Authenticated users can insert banco"
ON public.banco_candidatos
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(created_by, ''), auth.uid()::text) = auth.uid()::text
  AND COALESCE(NULLIF(updated_by, ''), auth.uid()::text) = auth.uid()::text
);

CREATE POLICY "Authenticated users can update banco"
ON public.banco_candidatos
FOR UPDATE
TO authenticated
USING (public.can_manage_recruitment_data(auth.uid()))
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(updated_by, ''), auth.uid()::text) = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can manage importacoes" ON public.importacoes;

CREATE POLICY "Authenticated users can view importacoes"
ON public.importacoes
FOR SELECT
TO authenticated
USING (public.can_view_recruitment_data(auth.uid()));

CREATE POLICY "Authenticated users can insert importacoes"
ON public.importacoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(usuario_id, ''), auth.uid()::text) = auth.uid()::text
);

CREATE POLICY "Authenticated users can update own importacoes"
ON public.importacoes
FOR UPDATE
TO authenticated
USING (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(usuario_id, ''), auth.uid()::text) = auth.uid()::text
)
WITH CHECK (
  public.can_manage_recruitment_data(auth.uid())
  AND COALESCE(NULLIF(usuario_id, ''), auth.uid()::text) = auth.uid()::text
);

CREATE POLICY "Admins can delete importacoes"
ON public.importacoes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));