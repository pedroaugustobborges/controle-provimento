-- Add workflow tracking fields to vagas table
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS tratativa  TEXT,
  ADD COLUMN IF NOT EXISTS etapa      TEXT DEFAULT 'Divulgação de Vaga',
  ADD COLUMN IF NOT EXISTS status_processo TEXT DEFAULT 'Solicitada';

-- Comment on each column for documentation
COMMENT ON COLUMN public.vagas.tratativa        IS 'Tipo de tratativa: Aproveitamento de Banco de Talentos | Publicação de Edital | Movimentação Interna | Vaga de Liderança';
COMMENT ON COLUMN public.vagas.etapa            IS 'Etapa atual do processo: Divulgação de Vaga | Triagem | Avaliação Específica | ... | Admissão Efetivada';
COMMENT ON COLUMN public.vagas.status_processo  IS 'Status do processo: Solicitada | Em Andamento | Cancelada | Suspensa | Concluída';
