-- Add missing columns to vagas table to persist edital workflow state
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS status_fluxo_edital text,
  ADD COLUMN IF NOT EXISTS observacoes_unidade text,
  ADD COLUMN IF NOT EXISTS observacoes_edital text,
  ADD COLUMN IF NOT EXISTS observacoes_validacao text,
  ADD COLUMN IF NOT EXISTS validado_por text,
  ADD COLUMN IF NOT EXISTS data_validacao timestamptz,
  ADD COLUMN IF NOT EXISTS arquivo_edital text,
  ADD COLUMN IF NOT EXISTS cargo_validado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carga_horaria_validada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS salario_validado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS historico jsonb DEFAULT '[]'::jsonb;

-- Make sure realtime captures full row for vagas (for UPDATE events)
ALTER TABLE public.vagas REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;

-- Ensure vagas and notificacoes are in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vagas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vagas;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  END IF;
END $$;