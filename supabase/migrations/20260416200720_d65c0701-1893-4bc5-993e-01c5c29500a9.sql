
-- 1. Soft delete columns
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.banco_candidatos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vagas_deleted_at ON public.vagas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vagas_origem ON public.vagas(origem);
CREATE INDEX IF NOT EXISTS idx_banco_deleted_at ON public.banco_candidatos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_banco_origem ON public.banco_candidatos(origem);

-- 2. Convocacoes table (persistent storage)
CREATE TABLE IF NOT EXISTS public.convocacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID,
  banco_id UUID,
  edital_relacionado TEXT,
  requisicao TEXT,
  nome_candidato TEXT NOT NULL,
  cargo TEXT,
  unidade TEXT,
  unidade_alternativa TEXT,
  secao TEXT,
  classificacao INTEGER,
  data_convocacao DATE NOT NULL,
  horario TEXT NOT NULL,
  carga_horaria TEXT,
  horario_trabalho TEXT,
  edoc TEXT,
  tipo_convocacao TEXT DEFAULT 'Presencial',
  tipo_atendimento TEXT DEFAULT 'presencial',
  link_teams TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  devolutiva TEXT,
  data_devolutiva TIMESTAMPTZ,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_convocacoes_data ON public.convocacoes(data_convocacao);
CREATE INDEX IF NOT EXISTS idx_convocacoes_unidade ON public.convocacoes(unidade);
CREATE INDEX IF NOT EXISTS idx_convocacoes_vaga ON public.convocacoes(vaga_id);
CREATE INDEX IF NOT EXISTS idx_convocacoes_banco ON public.convocacoes(banco_id);
CREATE INDEX IF NOT EXISTS idx_convocacoes_deleted_at ON public.convocacoes(deleted_at) WHERE deleted_at IS NULL;

-- 3. Updated_at trigger
DROP TRIGGER IF EXISTS trg_convocacoes_updated_at ON public.convocacoes;
CREATE TRIGGER trg_convocacoes_updated_at
  BEFORE UPDATE ON public.convocacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS
ALTER TABLE public.convocacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view convocacoes" ON public.convocacoes;
CREATE POLICY "Authenticated users can view convocacoes"
  ON public.convocacoes FOR SELECT TO authenticated
  USING (can_view_recruitment_data(auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can insert convocacoes" ON public.convocacoes;
CREATE POLICY "Authenticated users can insert convocacoes"
  ON public.convocacoes FOR INSERT TO authenticated
  WITH CHECK (can_manage_recruitment_data(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update convocacoes" ON public.convocacoes;
CREATE POLICY "Authenticated users can update convocacoes"
  ON public.convocacoes FOR UPDATE TO authenticated
  USING (can_manage_recruitment_data(auth.uid()))
  WITH CHECK (can_manage_recruitment_data(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete convocacoes" ON public.convocacoes;
CREATE POLICY "Admins can delete convocacoes"
  ON public.convocacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Realtime
ALTER TABLE public.convocacoes REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='convocacoes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.convocacoes';
  END IF;
END $$;

-- 6. Version increment trigger on convocacoes
DROP TRIGGER IF EXISTS trg_convocacoes_version ON public.convocacoes;
CREATE TRIGGER trg_convocacoes_version
  BEFORE UPDATE ON public.convocacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_version_increment();
