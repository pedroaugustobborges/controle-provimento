ALTER TABLE public.importacoes
  ADD COLUMN IF NOT EXISTS nome_arquivo text,
  ADD COLUMN IF NOT EXISTS modo_importacao text,
  ADD COLUMN IF NOT EXISTS origem_base text,
  ADD COLUMN IF NOT EXISTS quantidade_processada integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_atualizada integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_ignorada integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_erro integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_confirmada integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tabela_destino text,
  ADD COLUMN IF NOT EXISTS aba_planilha text,
  ADD COLUMN IF NOT EXISTS linha_cabecalho integer,
  ADD COLUMN IF NOT EXISTS detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.importacoes
SET
  nome_arquivo = COALESCE(NULLIF(nome_arquivo, ''), NULLIF(arquivo, ''), CONCAT('Importação ', LEFT(id::text, 8))),
  quantidade_processada = CASE
    WHEN COALESCE(quantidade_processada, 0) > 0 THEN quantidade_processada
    ELSE COALESCE(quantidade_inserida, 0) + COALESCE(quantidade_atualizada, 0) + COALESCE(quantidade_ignorada, 0) + COALESCE(quantidade_erro, 0)
  END,
  quantidade_confirmada = CASE
    WHEN COALESCE(quantidade_confirmada, 0) > 0 THEN quantidade_confirmada
    ELSE COALESCE(quantidade_inserida, 0)
  END,
  quantidade_erro = CASE
    WHEN COALESCE(quantidade_erro, 0) > 0 THEN quantidade_erro
    WHEN status = 'erro' THEN GREATEST(COALESCE(quantidade_erro, 0), 1)
    ELSE COALESCE(quantidade_erro, 0)
  END,
  tabela_destino = COALESCE(
    NULLIF(tabela_destino, ''),
    CASE
      WHEN tipo = 'vagas' THEN 'vagas'
      WHEN tipo = 'banco' THEN 'banco_candidatos'
      ELSE NULL
    END
  ),
  updated_at = now()
WHERE true;

CREATE INDEX IF NOT EXISTS idx_importacoes_created_at ON public.importacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_importacoes_tipo_status ON public.importacoes (tipo, status);

DROP TRIGGER IF EXISTS update_importacoes_updated_at ON public.importacoes;
CREATE TRIGGER update_importacoes_updated_at
BEFORE UPDATE ON public.importacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();