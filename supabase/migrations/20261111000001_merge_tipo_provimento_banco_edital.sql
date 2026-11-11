-- Merge Q1+Q2 of TIPO DE PROVIMENTO into a single question.
--
-- Previously:
--   Q1 tipo_provimento_banco  = "Sim" → use banco de talentos
--   Q2 tipo_provimento_edital = "Sim" → publish new edital (only shown when Q1 = "Não")
--
-- Now both are covered by a single question stored in tipo_provimento_banco:
--   "Gostaria que fizéssemos o aproveitamento de candidato(a)s do banco de
--    talentos ou uma publicação de novo edital?"
--   Sim / Não
--
-- Migration rule:
--   If the old answer was banco=Não + edital=Sim → the merged answer is Sim
--   (they said yes to edital, which is now part of the merged question).
--   All tipo_provimento_edital values are then cleared (no longer a question).

UPDATE public.vagas
SET
  tipo_provimento_banco  = 'Sim',
  tipo_provimento_edital = NULL
WHERE tipo_provimento_banco  = 'Não'
  AND tipo_provimento_edital = 'Sim';

-- Clear the edital field for all remaining rows (question no longer exists).
UPDATE public.vagas
SET tipo_provimento_edital = NULL
WHERE tipo_provimento_edital IS NOT NULL;
