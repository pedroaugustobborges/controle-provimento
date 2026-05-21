ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS url_reachr TEXT,
ADD COLUMN IF NOT EXISTS gestor_aprovador_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS status_aprovacao_gestor TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS observacoes_gestor TEXT,
ADD COLUMN IF NOT EXISTS distribuicao_vagas JSONB,
ADD COLUMN IF NOT EXISTS unidade_trabalho TEXT,
ADD COLUMN IF NOT EXISTS unidades_banco_talentos TEXT[];

COMMENT ON COLUMN public.vagas.url_reachr IS 'Link da vaga na plataforma Reachr';
COMMENT ON COLUMN public.vagas.gestor_aprovador_id IS 'ID do gestor que deve aprovar o edital';
COMMENT ON COLUMN public.vagas.status_aprovacao_gestor IS 'Status da aprovação do gestor: pendente, aprovado, devolvido';
COMMENT ON COLUMN public.vagas.observacoes_gestor IS 'Observações feitas pelo gestor durante a aprovação';
COMMENT ON COLUMN public.vagas.distribuicao_vagas IS 'Distribuição individual das vagas por unidade';
COMMENT ON COLUMN public.vagas.unidade_trabalho IS 'Unidade responsável por trabalhar a vaga no momento';
COMMENT ON COLUMN public.vagas.unidades_banco_talentos IS 'Unidades que podem convocar a partir do banco de talentos gerado';