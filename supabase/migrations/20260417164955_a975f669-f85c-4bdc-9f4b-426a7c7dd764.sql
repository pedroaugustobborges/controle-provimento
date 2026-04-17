-- Adiciona coluna para cronogramas independentes por cargo no edital
ALTER TABLE public.editais
  ADD COLUMN IF NOT EXISTS cronogramas_por_cargo JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Adiciona FK opcional de vaga -> edital (1 edital agrupa N vagas)
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS edital_id UUID REFERENCES public.editais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vagas_edital_id ON public.vagas(edital_id);