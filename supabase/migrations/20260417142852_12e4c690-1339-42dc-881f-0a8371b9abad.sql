-- Tabela de Modo de Manutenção
CREATE TABLE public.system_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  message text,
  expected_return_at timestamptz,
  activated_by uuid,
  activated_at timestamptz,
  deactivated_by uuid,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view maintenance"
  ON public.system_maintenance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert maintenance"
  ON public.system_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update maintenance"
  ON public.system_maintenance FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.system_maintenance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_maintenance;

-- Tabela de Atualizações do Sistema
CREATE TABLE public.system_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text,
  message text NOT NULL,
  action_type text NOT NULL DEFAULT 'reload' CHECK (action_type IN ('reload','relogin')),
  is_mandatory boolean NOT NULL DEFAULT false,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view updates"
  ON public.system_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert updates"
  ON public.system_updates FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete updates"
  ON public.system_updates FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.system_updates REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_updates;