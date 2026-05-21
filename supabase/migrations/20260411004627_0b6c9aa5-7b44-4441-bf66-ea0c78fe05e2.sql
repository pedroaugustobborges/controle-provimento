-- Adicionar colunas complementares à tabela de vagas
ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS secao TEXT,
ADD COLUMN IF NOT EXISTS data_convocacao_planilha TEXT,
ADD COLUMN IF NOT EXISTS horario_convocacao_planilha TEXT,
ADD COLUMN IF NOT EXISTS candidato_convocado_planilha TEXT,
ADD COLUMN IF NOT EXISTS classificacao_convocacao_planilha TEXT,
ADD COLUMN IF NOT EXISTS forma_convocacao_planilha TEXT,
ADD COLUMN IF NOT EXISTS status_oitiva_convocacao_planilha TEXT,
ADD COLUMN IF NOT EXISTS admissao_enviada_acompanhamento TEXT,
ADD COLUMN IF NOT EXISTS admissao_efetivada_acompanhamento TEXT,
ADD COLUMN IF NOT EXISTS detalhes_acompanhamento TEXT;

-- Adicionar comentários explicativos para os novos campos
COMMENT ON COLUMN public.vagas.secao IS 'Seção ou setor da vaga conforme planilha';
COMMENT ON COLUMN public.vagas.data_convocacao_planilha IS 'Data da convocação registrada na planilha';
COMMENT ON COLUMN public.vagas.horario_convocacao_planilha IS 'Horário da convocação registrado na planilha';
COMMENT ON COLUMN public.vagas.candidato_convocado_planilha IS 'Nome do candidato convocado registrado na planilha';
COMMENT ON COLUMN public.vagas.classificacao_convocacao_planilha IS 'Classificação do convocado na planilha';
COMMENT ON COLUMN public.vagas.forma_convocacao_planilha IS 'Forma/meio de convocação na planilha';
COMMENT ON COLUMN public.vagas.status_oitiva_convocacao_planilha IS 'Status da oitiva da convocação na planilha';
COMMENT ON COLUMN public.vagas.admissao_enviada_acompanhamento IS 'Data de envio da admissão para acompanhamento';
COMMENT ON COLUMN public.vagas.admissao_efetivada_acompanhamento IS 'Data de efetivação da admissão para acompanhamento';
COMMENT ON COLUMN public.vagas.detalhes_acompanhamento IS 'Detalhes complementares do acompanhamento da vaga';
