-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id),
    remetente_id UUID REFERENCES auth.users(id),
    remetente_nome TEXT,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'info',
    unidade TEXT,
    regiao TEXT,
    registro_id TEXT,
    lida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Notifications can be seen by the target user OR by anyone if usuario_id is NULL 
-- (respecting unit/region filter in the application logic)
CREATE POLICY "Users can see their own notifications"
ON public.notificacoes FOR SELECT
USING (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Anyone authenticated can create notifications"
ON public.notificacoes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own notifications"
ON public.notificacoes FOR UPDATE
USING (auth.uid() = usuario_id);

-- Create auditoria_logs table if not exists
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo TEXT,
    registro_id TEXT,
    acao TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    valor_anterior JSONB,
    valor_novo JSONB,
    contexto_adicional JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on auditoria_logs
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to see audit logs
CREATE POLICY "Admins can view audit logs"
ON public.auditoria_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.perfil = 'Administrador' OR profiles.perfil = 'Analista Administrativo')
));

-- Allow insertion of audit logs by anyone authenticated
CREATE POLICY "Anyone authenticated can insert audit logs"
ON public.auditoria_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime Publication
-- Note: We check if the publication exists first, or just add the tables.
-- Supabase usually has 'supabase_realtime' publication by default.
BEGIN;
  -- If publication exists, we add tables. If not, we create it.
  -- This is a standard Supabase setup.
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- Add tables to the publication
  -- Use dynamic SQL to avoid errors if they are already in the publication
  DO $$
  DECLARE
    t_name TEXT;
    target_tables TEXT[] := ARRAY['vagas', 'banco_candidatos', 'notificacoes', 'profiles'];
  BEGIN
    FOREACH t_name IN ARRAY target_tables LOOP
      BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(t_name);
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Table is already in the publication
      END;
    END LOOP;
  END $$;
COMMIT;