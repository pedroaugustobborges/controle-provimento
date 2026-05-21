-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_vagas_updated_at_status ON public.vagas (updated_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_banco_candidatos_updated_at_status ON public.banco_candidatos (updated_at DESC, status);

-- Also add index on unidade for filtering
CREATE INDEX IF NOT EXISTS idx_vagas_unidade ON public.vagas (unidade);
CREATE INDEX IF NOT EXISTS idx_banco_candidatos_unidade ON public.banco_candidatos (unidade);
