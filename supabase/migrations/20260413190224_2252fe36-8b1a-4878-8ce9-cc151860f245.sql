-- Update user_sessions admin policy to use has_role for consistency
DROP POLICY IF EXISTS "Admins can view all user sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all user sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow audit_logs to be read by users with Administrador profile (not just admin role)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Admin')
    )
  );