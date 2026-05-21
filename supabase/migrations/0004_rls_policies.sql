-- ============================================================
-- Migration: RLS Policies
-- Allows authenticated users to read all data.
-- Only admins and analysts can insert/update/delete.
-- ============================================================

-- ── Helper: is the current user admin or analista? ─────────
-- (reuses the functions already created in 0001)

-- ── DATA TABLES (vagas, banco_candidatos, convocacoes, etc.)
-- Read: any authenticated user
-- Write: admin or analista

DO $$
DECLARE
  t text;
  data_tables text[] := ARRAY[
    'vagas', 'banco_candidatos', 'convocacoes', 'editais',
    'validacoes_editais', 'importacoes', 'bloqueios_horario',
    'alertas', 'tarefas', 'notificacoes', 'feriados_locais'
  ];
BEGIN
  FOREACH t IN ARRAY data_tables LOOP
    EXECUTE format('
      CREATE POLICY "authenticated_read_%1$s"
        ON public.%1$s FOR SELECT
        TO authenticated
        USING (true);
    ', t);

    EXECUTE format('
      CREATE POLICY "manager_write_%1$s"
        ON public.%1$s FOR INSERT
        TO authenticated
        WITH CHECK (can_manage_recruitment_data(auth.uid()));
    ', t);

    EXECUTE format('
      CREATE POLICY "manager_update_%1$s"
        ON public.%1$s FOR UPDATE
        TO authenticated
        USING (can_manage_recruitment_data(auth.uid()));
    ', t);

    EXECUTE format('
      CREATE POLICY "manager_delete_%1$s"
        ON public.%1$s FOR DELETE
        TO authenticated
        USING (can_manage_recruitment_data(auth.uid()));
    ', t);
  END LOOP;
END $$;

-- ── PROFILES ───────────────────────────────────────────────
-- Users can read all profiles, edit only their own.
-- Admins can do everything.

CREATE POLICY "authenticated_read_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "own_or_admin_update_profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR can_manage_recruitment_data(auth.uid()));

CREATE POLICY "admin_insert_profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_recruitment_data(auth.uid()));

CREATE POLICY "admin_delete_profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (can_manage_recruitment_data(auth.uid()));

-- ── USER_ROLES ─────────────────────────────────────────────
CREATE POLICY "authenticated_read_user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_write_user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (can_manage_recruitment_data(auth.uid()))
  WITH CHECK (can_manage_recruitment_data(auth.uid()));

-- ── USER_SESSIONS ──────────────────────────────────────────
CREATE POLICY "own_sessions"
  ON public.user_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_read_sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (can_manage_recruitment_data(auth.uid()));

-- ── AUDIT LOGS ─────────────────────────────────────────────
CREATE POLICY "authenticated_read_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_read_auditoria_logs"
  ON public.auditoria_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_auditoria_logs"
  ON public.auditoria_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── FEEDBACK ───────────────────────────────────────────────
CREATE POLICY "own_feedbacks"
  ON public.feedbacks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_read_feedbacks"
  ON public.feedbacks FOR SELECT
  TO authenticated
  USING (can_manage_recruitment_data(auth.uid()));

-- ── SYSTEM TABLES (read-only for users, write for admins) ──
DO $$
DECLARE
  t text;
  sys_tables text[] := ARRAY[
    'system_maintenance', 'system_updates', 'support_configs'
  ];
BEGIN
  FOREACH t IN ARRAY sys_tables LOOP
    EXECUTE format('
      CREATE POLICY "authenticated_read_%1$s"
        ON public.%1$s FOR SELECT
        TO authenticated
        USING (true);
    ', t);

    EXECUTE format('
      CREATE POLICY "admin_write_%1$s"
        ON public.%1$s FOR ALL
        TO authenticated
        USING (can_manage_recruitment_data(auth.uid()))
        WITH CHECK (can_manage_recruitment_data(auth.uid()));
    ', t);
  END LOOP;
END $$;
